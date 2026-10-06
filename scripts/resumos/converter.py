"""Converte os PDFs de resumo da OdontoLab em conteúdo estruturado para o site.

Os PDFs saem todos do mesmo gerador (Helvetica, mesmas cores e caixas), então
dá para reconhecer cada elemento pelo estilo: capa interna = módulo, número
branco em caixa escura = seção, texto teal de 11pt = subtítulo, caixa clara com
barra laranja = destaque, linha escura + linhas zebradas = tabela, etc.

Uso:
    pip install pymupdf pillow
    python3 scripts/resumos/converter.py <pasta-dos-pdfs> [slug ...]

Saída em .resumos/<slug>/ (fora do git):
    resumo.json   módulos -> seções -> blocos (formato em src/lib/resumos/tipos.ts)
    img/*.webp    figuras extraídas, referenciadas pelos blocos "img"
"""

import json
import re
import sys
from io import BytesIO
from pathlib import Path

import pymupdf
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
SAIDA = RAIZ / ".resumos"

# Cores do gerador (inteiros RGB do PyMuPDF / tuplas 0-1 dos desenhos).
BRANCO = 0xFFFFFF
TEAL = 0x14A3B5
TEAL_ESCURO = 0x0B7C8C
CINZA = 0x6B7A88
AZUL_TITULO = 0x0F2A43
FUNDO_ESCURO = (0.06, 0.16, 0.26)
FUNDO_CLARO = (0.91, 0.96, 0.97)
FUNDO_TEAL = (0.08, 0.64, 0.71)
LARANJA = (0.95, 0.65, 0.25)

SUBTITULOS_GENERICOS = {"conteúdo completo", "aula", "resumo geral"}
TOPO, RODAPE = 40, 795  # cabeçalho e rodapé repetidos em toda página
LARGURA_MAX_IMG = 1400
LIMITE_QUEBRA = 440  # x final a partir do qual a linha "encheu" (texto vai até ~544)


def cor(t):
    return tuple(round(c, 2) for c in t) if t else None


# --------------------------------------------------------------------------- texto


def run(span):
    """Trecho de texto com estilo: {x, b?, i?, d?} (d = destaque teal)."""
    fonte = span["font"]
    r = {"x": span["text"]}
    if "Bold" in fonte:
        r["b"] = 1
    if "Oblique" in fonte or "Italic" in fonte:
        r["i"] = 1
    if span["color"] in (TEAL, TEAL_ESCURO):
        r["d"] = 1
    if fonte == "ZapfDingbats":
        r = {"x": "•"}
    return r


def juntar_runs(runs):
    """Junta trechos vizinhos com o mesmo estilo e limpa espaços."""
    saida = []
    for r in runs:
        if not r["x"]:
            continue
        if saida and {k: v for k, v in saida[-1].items() if k != "x"} == {k: v for k, v in r.items() if k != "x"}:
            saida[-1]["x"] += r["x"]
        else:
            saida.append(dict(r))
    for r in saida:
        r["x"] = re.sub(r"\s+", " ", re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", r["x"]))
    if saida:
        saida[0]["x"] = saida[0]["x"].lstrip()
        saida[-1]["x"] = saida[-1]["x"].rstrip()
    return [r for r in saida if r["x"]]


def texto_puro(runs):
    return "".join(r["x"] for r in runs)


class Linha:
    def __init__(self, line):
        spans = [s for s in line["spans"] if s["text"].strip()]
        self.spans = spans
        self.x0 = min(s["bbox"][0] for s in spans)
        self.y0 = min(s["bbox"][1] for s in spans)
        self.y1 = max(s["bbox"][3] for s in spans)
        self.x1 = max(s["bbox"][2] for s in spans)
        self.tamanho = max(round(s["size"], 1) for s in spans)
        self.texto = "".join(s["text"] for s in line["spans"]).strip()
        primeiro = spans[0]
        self.cor = primeiro["color"]
        self.negrito = "Bold" in primeiro["font"]
        self.runs = [run(s) for s in line["spans"]]

    def dentro(self, r, folga=2):
        return r.x0 - folga <= self.x0 <= r.x1 + folga and r.y0 - folga <= self.y0 <= r.y1 + folga


# --------------------------------------------------------------------------- página


def classificar_desenhos(pagina):
    """Separa as caixas de destaque, os cabeçalhos de tabela e as linhas de tabela."""
    caixas, cab_tabela, linhas_tabela, faixas_teal, barras_laranja = [], [], [], [], []
    for d in pagina.get_drawings():
        r = d["rect"]
        if r.y1 < TOPO or r.y0 > RODAPE:
            continue
        fill, stroke = cor(d.get("fill")), cor(d.get("color"))
        if stroke == LARANJA and r.width < 2:
            barras_laranja.append(r)
        elif fill == FUNDO_ESCURO and r.width > 200:
            cab_tabela.append(r)
        elif fill == FUNDO_TEAL and r.width > 200:
            faixas_teal.append(r)
        elif fill in (FUNDO_CLARO, (1.0, 1.0, 1.0)) and r.width > 200:
            linhas_tabela.append((r, fill))
    # Caixa de destaque = fundo claro com barra laranja à esquerda.
    for r, fill in list(linhas_tabela):
        if fill == FUNDO_CLARO and any(abs(b.x0 - r.x0) < 2 and abs(b.y0 - r.y0) < 2 for b in barras_laranja):
            titulo = next((f for f in faixas_teal if abs(f.y1 - r.y0) < 2), None)
            caixas.append({"rect": r, "faixa": titulo})
            linhas_tabela.remove((r, fill))
    return caixas, cab_tabela, [r for r, _ in linhas_tabela]


def montar_tabelas(cabecalhos, linhas_tabela):
    """Cada cabeçalho escuro + as linhas encostadas logo abaixo formam uma tabela."""
    tabelas = []
    for cab in cabecalhos:
        linhas = [cab]
        candidatas = sorted(linhas_tabela, key=lambda r: r.y0)
        for r in candidatas:
            if abs(r.y0 - linhas[-1].y1) < 2 and abs(r.x0 - cab.x0) < 2:
                linhas.append(r)
        tabelas.append({"rect": pymupdf.Rect(cab.x0, cab.y0, cab.x1, linhas[-1].y1), "linhas": linhas})
    return tabelas


def extrair_tabela(tabela, linhas_texto):
    dentro = [l for l in linhas_texto if l.dentro(tabela["rect"])]
    # Colunas: inícios de x que aparecem no cabeçalho ou em 2+ linhas.
    xs = sorted(l.x0 for l in dentro)
    colunas = []
    for x in xs:
        if not colunas or x - colunas[-1][-1] > 6:
            colunas.append([x])
        else:
            colunas[-1].append(x)
    inicios = [min(c) for c in colunas if len(c) >= 2 or any(abs(l.x0 - min(c)) < 6 and l.y0 < tabela["linhas"][0].y1 for l in dentro)]
    if not inicios:
        return None
    inicios[0] = min(inicios[0], tabela["rect"].x0 + 1)

    def coluna(x):
        return max(i for i, ini in enumerate(inicios) if x >= ini - 6) if x >= inicios[0] - 6 else 0

    corpo = []
    for faixa in tabela["linhas"]:
        celulas = [[] for _ in inicios]
        for l in sorted(dentro, key=lambda l: (l.y0, l.x0)):
            if faixa.y0 - 1 <= l.y0 < faixa.y1 - 1:
                alvo = celulas[coluna(l.x0)]
                if alvo:
                    alvo.append({"x": " "})
                alvo.extend(l.runs)
        corpo.append([juntar_runs(c) for c in celulas])
    corpo = [linha for linha in corpo if any(linha)]
    if not corpo:
        return None
    return {"t": "tabela", "linhas": corpo, "cabecalho": True}


def salvar_imagem(doc, xref, pasta, cache):
    if xref in cache:
        return cache[xref]
    try:
        bruto = doc.extract_image(xref)
        img = Image.open(BytesIO(bruto["image"]))
        # Máscara de transparência (smask) vem separada no PDF.
        if bruto.get("smask"):
            mascara = Image.open(BytesIO(doc.extract_image(bruto["smask"])["image"])).convert("L")
            if mascara.size == img.size:
                img = img.convert("RGB")
                img.putalpha(mascara)
        if img.mode == "CMYK":
            img = img.convert("RGB")
        elif img.mode not in ("RGB", "RGBA", "L"):
            img = img.convert("RGBA")
    except Exception as erro:  # noqa: BLE001 - imagem quebrada não deve parar o lote
        print(f"   ! imagem {xref} ignorada: {erro}", file=sys.stderr)
        cache[xref] = None
        return None
    if img.width > LARGURA_MAX_IMG:
        img = img.resize((LARGURA_MAX_IMG, round(img.height * LARGURA_MAX_IMG / img.width)), Image.LANCZOS)
    nome = f"{len([v for v in cache.values() if v]) + 1:04d}.webp"
    img.save(pasta / nome, "WEBP", quality=82, method=6)
    cache[xref] = {"src": f"img/{nome}", "w": img.width, "h": img.height}
    return cache[xref]


def elementos_da_pagina(doc, pagina, pasta, cache_img):
    """Lista ordenada (por y) de elementos crus da página."""
    caixas, cab_tabela, linhas_tabela = classificar_desenhos(pagina)
    tabelas = montar_tabelas(cab_tabela, linhas_tabela)

    linhas = []
    for b in pagina.get_text("dict")["blocks"]:
        if b["type"] != 0:
            continue
        for line in b["lines"]:
            if not any(s["text"].strip() for s in line["spans"]):
                continue
            l = Linha(line)
            if l.y0 < TOPO or l.y0 > RODAPE:
                continue
            linhas.append(l)

    elementos = []
    usadas = set()
    for tb in tabelas:
        bloco = extrair_tabela(tb, linhas)
        for l in linhas:
            if l.dentro(tb["rect"]):
                usadas.add(id(l))
        if bloco:
            elementos.append((tb["rect"].y0, "bloco", bloco))

    for info in pagina.get_image_info(xrefs=True):
        x0, y0, x1, y1 = info["bbox"]
        if y1 < TOPO or y0 > RODAPE or (x1 - x0) < 30 or (y1 - y0) < 30 or not info["xref"]:
            continue
        img = salvar_imagem(doc, info["xref"], pasta, cache_img)
        if img:
            elementos.append((y0, "img", dict(img)))

    for l in linhas:
        if id(l) in usadas:
            continue
        caixa = next((c for c in caixas if l.dentro(c["rect"]) or (c["faixa"] and l.dentro(c["faixa"]))), None)
        elementos.append((l.y0, "linha", (l, caixa)))

    elementos.sort(key=lambda e: e[0])
    return elementos


# --------------------------------------------------------------------------- documento


def tipo_pagina(pagina):
    tamanhos = set()
    textos = []
    for b in pagina.get_text("dict")["blocks"]:
        for line in b.get("lines", []):
            for s in line["spans"]:
                if s["text"].strip():
                    tamanhos.add(round(s["size"], 1))
                    textos.append(s["text"].strip())
    if 44.0 in tamanhos:
        return "capa"
    if "SUMÁRIO" in textos:
        return "sumario"
    if 24.0 in tamanhos and any("Cansado de estudar" in t for t in textos):
        return "propaganda"
    return "conteudo"


def ler_capa(pagina):
    titulo, sub = [], []
    for b in pagina.get_text("dict")["blocks"]:
        for line in b.get("lines", []):
            for s in line["spans"]:
                if s["size"] == 44.0:
                    titulo.append(s["text"].strip())
                elif s["color"] == 0xBFE9EE:
                    sub.append(s["text"].strip())
    return " ".join(titulo), " ".join(sub)


def quebrou(linha):
    """A linha foi até perto da margem direita, então a próxima é continuação."""
    return linha.x1 > LIMITE_QUEBRA


class Montador:
    """Transforma a sequência de elementos crus em módulos/seções/blocos."""

    def __init__(self):
        self.modulos = []
        self.paragrafo = None  # bloco "p" aberto (para juntar linhas)
        self.caixa_atual = None  # (rect, bloco caixa)
        self.ultima_linha = None

    # -- estrutura
    def novo_modulo(self, titulo, pagina):
        self.modulos.append({"titulo": titulo, "pagina": pagina, "secoes": []})
        self.fechar()

    def nova_secao(self, numero, rotulo="", titulo=""):
        if not self.modulos:
            self.novo_modulo("Resumo", 1)
        self.modulos[-1]["secoes"].append({"numero": numero, "rotulo": rotulo, "titulo": titulo, "blocos": []})
        self.fechar()

    def secao(self):
        if not self.modulos or not self.modulos[-1]["secoes"]:
            self.nova_secao("", "", "Introdução")
        return self.modulos[-1]["secoes"][-1]

    def destino(self):
        """Lista onde os blocos entram: dentro da caixa aberta ou direto na seção."""
        return self.caixa_atual[1]["blocos"] if self.caixa_atual else self.secao()["blocos"]

    def fechar(self):
        self.paragrafo = None
        self.caixa_atual = None
        self.ultima_linha = None

    # -- blocos
    def bloco(self, b):
        destino = self.destino()
        self.paragrafo = None
        self.ultima_linha = None
        destino.append(b)

    def entrar_caixa(self, caixa, linha):
        if caixa is None:
            if self.caixa_atual:
                self.caixa_atual = None
                self.paragrafo = None
            return
        rect = caixa["rect"]
        if self.caixa_atual and self.caixa_atual[0] is rect:
            return
        # Caixa que continua da página anterior: mesma faixa de título ou nenhuma.
        titulo = None
        if caixa["faixa"] and linha.dentro(caixa["faixa"]):
            titulo = linha.texto
        bloco = {"t": "caixa", "titulo": titulo or "", "blocos": []}
        if rect.y0 < TOPO + 30:
            bloco["continua"] = True
        self.secao()["blocos"].append(bloco)
        self.caixa_atual = (rect, bloco)
        self.paragrafo = None
        self.ultima_linha = None

    def linha(self, l, caixa):
        # Título da faixa teal (ex.: PONTOS-CHAVE) já entra como título da caixa.
        if caixa and caixa["faixa"] and l.dentro(caixa["faixa"]) and not l.dentro(caixa["rect"]):
            self.entrar_caixa(caixa, l)
            if not self.caixa_atual[1]["titulo"]:
                self.caixa_atual[1]["titulo"] = l.texto
            return
        self.entrar_caixa(caixa, l)

        if l.tamanho == 11.0 and l.negrito and l.cor == TEAL:
            # Subtítulo (pode quebrar em duas linhas).
            ultimo = self.destino()[-1] if self.destino() else None
            if ultimo and ultimo["t"] == "sub" and self.ultima_linha and l.y0 - self.ultima_linha.y1 < 6 and quebrou(self.ultima_linha):
                ultimo["x"] += " " + l.texto
            else:
                self.bloco({"t": "sub", "x": l.texto})
            self.ultima_linha = l
            return
        if l.tamanho == 8.4 and l.cor == CINZA:
            # Legenda da figura anterior.
            alvo = self.destino()
            if alvo and alvo[-1]["t"] == "img":
                alvo[-1]["legenda"] = (alvo[-1].get("legenda", "") + " " + l.texto).strip()
                return
            self.bloco({"t": "p", "r": [{"x": l.texto, "i": 1}]})
            return

        comeca_item = bool(l.runs) and (l.runs[0].get("d") and l.runs[0].get("b") or l.texto.startswith(("•", "■", "-", "→")))
        continua = (
            self.paragrafo is not None
            and self.ultima_linha is not None
            and not comeca_item
            and quebrou(self.ultima_linha)
            and (
                # Mesma página: espaço entre linhas pequeno.
                (0 <= l.y0 - self.ultima_linha.y1 < l.tamanho * 0.75)
                # Virada de página: frase sem pontuação final continua.
                or (l.y0 < self.ultima_linha.y0 and not re.search(r"[.:;!?)]$", texto_puro(self.paragrafo["r"])))
            )
        )
        if continua:
            self.paragrafo["r"].append({"x": " "})
            self.paragrafo["r"].extend(l.runs)
            self.paragrafo["r"] = juntar_runs(self.paragrafo["r"])
        else:
            destino = self.destino()  # pode abrir uma seção (e zerar o estado) antes
            self.paragrafo = {"t": "p", "r": juntar_runs(l.runs)}
            destino.append(self.paragrafo)
        self.ultima_linha = l


def limpar_blocos(blocos):
    saida = []
    for b in blocos:
        # Fragmentos soltos (números de página do material original, letras de
        # figuras vetoriais) não são conteúdo.
        if b["t"] == "p" and len(texto_puro(b["r"]).strip()) <= 2:
            continue
        if b["t"] == "caixa":
            b["blocos"] = limpar_blocos(b["blocos"])
            if not b["blocos"]:
                continue
            if saida and saida[-1]["t"] == "caixa" and not b["titulo"] and b.get("continua"):
                saida[-1]["blocos"].extend(b["blocos"])
                continue
        b.pop("continua", None)
        saida.append(b)
    return saida


def converter(caminho_pdf, slug):
    pasta = SAIDA / slug
    (pasta / "img").mkdir(parents=True, exist_ok=True)
    for antigo in (pasta / "img").glob("*.webp"):
        antigo.unlink()

    doc = pymupdf.open(caminho_pdf)
    m = Montador()
    cache_img = {}
    titulo_geral = None
    rotulo_pendente = ""

    for pagina in doc:
        numero_pagina = pagina.number + 1
        tipo = tipo_pagina(pagina)
        if tipo == "capa":
            titulo, sub = ler_capa(pagina)
            if titulo_geral is None:
                titulo_geral = titulo
            # Capa com o mesmo título do PDF: o nome do módulo está no subtítulo
            # (a não ser que o subtítulo seja genérico, como "Conteúdo completo").
            nome = sub if (titulo == titulo_geral and sub and sub.lower() not in SUBTITULOS_GENERICOS) else titulo
            m.novo_modulo(nome, numero_pagina)
            continue
        if tipo in ("sumario", "propaganda"):
            m.fechar()
            continue

        elementos = elementos_da_pagina(doc, pagina, pasta / "img", cache_img)
        i = 0
        while i < len(elementos):
            y, tipo_el, dado = elementos[i]
            if tipo_el == "img":
                m.entrar_caixa(None, None)
                m.bloco({"t": "img", **dado})
            elif tipo_el == "bloco":
                m.entrar_caixa(None, None)
                m.bloco(dado)
            else:
                l, caixa = dado
                if l.texto == "ANOTAÇÕES":
                    pass
                elif l.tamanho == 8.0 and l.cor == TEAL and l.negrito:
                    # Rótulo da seção (fica um pouco acima do número).
                    rotulo_pendente = l.texto
                elif l.tamanho == 22.0 and l.cor == BRANCO and l.texto.isdigit():
                    # Cabeçalho de seção: número + rótulo (8pt) + título (17pt).
                    rotulo, titulo = rotulo_pendente, []
                    rotulo_pendente = ""
                    j = i + 1
                    while j < len(elementos) and elementos[j][1] == "linha" and elementos[j][0] - y < 40:
                        lj = elementos[j][2][0]
                        if lj.tamanho == 8.0 and lj.cor == TEAL:
                            rotulo = lj.texto
                        elif lj.tamanho == 17.0:
                            titulo.append(lj.texto)
                        else:
                            break
                        j += 1
                    m.nova_secao(l.texto, rotulo.capitalize(), " ".join(titulo))
                    i = j
                    continue
                elif l.tamanho == 17.0 and l.cor == AZUL_TITULO:
                    # Título de seção sem número (continuação de linha).
                    s = m.secao()
                    s["titulo"] = (s["titulo"] + " " + l.texto).strip()
                else:
                    m.linha(l, caixa)
            i += 1

    # Limpeza: junta caixas quebradas entre páginas e tira o que ficou vazio.
    for mod in m.modulos:
        for s in mod["secoes"]:
            s["blocos"] = limpar_blocos(s["blocos"])
        mod["secoes"] = [s for s in mod["secoes"] if s["blocos"]]
    modulos = [mod for mod in m.modulos if mod["secoes"]]
    for k, mod in enumerate(modulos):
        prox = modulos[k + 1]["pagina"] if k + 1 < len(modulos) else len(doc) + 1
        mod["pagina_final"] = prox - 1

    resumo = {
        "slug": slug,
        "arquivo": Path(caminho_pdf).name,
        "titulo": titulo_geral or slug,
        "paginas": len(doc),
        "modulos": modulos,
    }
    (pasta / "resumo.json").write_text(json.dumps(resumo, ensure_ascii=False, separators=(",", ":")))
    return resumo


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    pasta_pdfs = Path(sys.argv[1])
    filtro = set(sys.argv[2:])
    disciplinas = json.loads((RAIZ / "scripts/resumos/disciplinas.json").read_text())
    for d in disciplinas:
        if filtro and d["slug"] not in filtro:
            continue
        r = converter(pasta_pdfs / d["arquivo"], d["slug"])
        secoes = sum(len(mod["secoes"]) for mod in r["modulos"])
        imgs = len(list((SAIDA / d["slug"] / "img").glob("*.webp")))
        print(f"{d['slug']:40} {len(r['modulos']):3} módulos {secoes:4} seções {imgs:4} figuras")


if __name__ == "__main__":
    main()
