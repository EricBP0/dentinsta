"""Gera os arquivos da marca OdontoLab (docs/MARCA.md).

O ícone é o dente como frasco de laboratório: meio cheio, com duas bolhas.
Duas versões, como no guia da marca:
  - lima: fundo Verde-limão, líquido Violeta, bolhas Violeta e Preto (fundos violeta/escuros)
  - violeta: fundo Violeta, líquido Verde-limão, bolhas Verde-limão e branco (fundos claros)

O logotipo é o ícone + "OdontoLab" em Plus Jakarta Sans ExtraBold, com o texto em
contornos (não depende de fonte instalada).

Uso:
    pip install fonttools
    python3 scripts/marca/gerar.py
    node scripts/marca/png.mjs        # PNGs a partir dos SVGs
"""

from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

RAIZ = Path(__file__).resolve().parents[2]
FONTES = RAIZ / "assets/fontes"

VIOLETA = "#5A3FE0"
LIMA = "#C8F250"
PRETO = "#12101F"
PAPEL = "#F6F5EE"
BRANCO = "#FFFFFF"

JAKARTA = TTFont(FONTES / "PlusJakartaSans-ExtraBold.ttf")

# Dente desenhado numa caixa 100×100 (linha central do contorno).
DENTE = (
    "M50 22.6C46.5 21.4 43 20.2 39.5 20.2C31.5 20.2 26.6 27.5 26.6 36.5C26.6 43.5 28.4 49.5 30.6 54.5"
    "C32.6 59.5 33 67 34.3 75C35.2 81 36.2 85.7 39 85.7C41.6 85.7 42.2 82 42.8 77.5"
    "C43.6 70.5 45 63.8 50 63.8C55 63.8 56.4 70.5 57.2 77.5C57.8 82 58.4 85.7 61 85.7"
    "C63.8 85.7 64.8 81 65.7 75C67 67 67.4 59.5 69.4 54.5C71.6 49.5 73.4 43.5 73.4 36.5"
    "C73.4 27.5 68.5 20.2 60.5 20.2C57 20.2 53.5 21.4 50 22.6Z"
)
# Superfície do líquido: mais baixa à esquerda, sobe em onda para a direita.
LIQUIDO = "M18 56C26 57.6 33 58.4 40 56.8C46.5 55.2 52 50.6 59 50.6C65 50.6 70 52.2 82 55.4V96H18Z"

VERSOES = {
    "lima": {"fundo": LIMA, "liquido": VIOLETA, "bolha": VIOLETA, "bolinha": PRETO},
    "violeta": {"fundo": VIOLETA, "liquido": LIMA, "bolha": LIMA, "bolinha": BRANCO},
}


def icone(versao="lima", x=0.0, y=0.0, lado=100.0, ident="ol"):
    """Ícone completo (quadrado arredondado + dente + bolhas) como grupo SVG."""
    c = VERSOES[versao]
    escala = lado / 100
    clip = f"{ident}-{versao}-dente"
    return (
        f'  <g transform="translate({x:.2f} {y:.2f}) scale({escala:.4f})">\n'
        f'    <defs><clipPath id="{clip}"><path d="{DENTE}"/></clipPath></defs>\n'
        f'    <rect width="100" height="100" rx="23" fill="{c["fundo"]}"/>\n'
        f'    <path d="{DENTE}" fill="{BRANCO}"/>\n'
        f'    <path d="{LIQUIDO}" fill="{c["liquido"]}" clip-path="url(#{clip})"/>\n'
        f'    <path d="{DENTE}" fill="none" stroke="{PRETO}" stroke-width="2.9" stroke-linejoin="round"/>\n'
        f'    <circle cx="78.8" cy="19.9" r="4.4" fill="{c["bolha"]}"/>\n'
        f'    <circle cx="85.7" cy="10.5" r="2.8" fill="{c["bolinha"]}"/>\n'
        f"  </g>\n"
    )


def texto(fonte, conteudo, tamanho, x, y, espaco=0.0):
    """Caminho SVG do texto com a linha de base em y. Devolve (path, largura)."""
    cmap = fonte.getBestCmap()
    glifos = fonte.getGlyphSet()
    escala = tamanho / fonte["head"].unitsPerEm
    caneta = SVGPathPen(glifos)
    cursor = x
    for i, letra in enumerate(conteudo):
        glifo = glifos[cmap[ord(letra)]]
        glifo.draw(TransformPen(caneta, (escala, 0, 0, -escala, cursor, y)))
        cursor += glifo.width * escala
        if i < len(conteudo) - 1:
            cursor += espaco * tamanho
    return caneta.getCommands(), cursor - x


def svg(largura, altura, corpo, titulo="OdontoLab"):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {largura:.0f} {altura:.0f}" '
        f'width="{largura:.0f}" height="{altura:.0f}" role="img" aria-label="{titulo}">\n'
        f"  <title>{titulo}</title>\n{corpo}</svg>\n"
    )


def logo(escuro=False):
    """Ícone + "OdontoLab".

    Fundo claro: ícone violeta, "Odonto" Preto e "Lab" Violeta.
    Fundo violeta ou escuro (escuro=True): ícone lima, "Odonto" branco e "Lab" Verde-limão.
    """
    lado = 100
    cap = JAKARTA["OS/2"].sCapHeight / JAKARTA["head"].unitsPerEm
    tamanho = 0.38 * lado / cap  # altura das maiúsculas = 38% do ícone
    espaco = -0.02
    gap = 0.17 * lado
    base = lado / 2 + 0.38 * lado / 2  # maiúsculas centralizadas no ícone
    odonto, largura_odonto = texto(JAKARTA, "Odonto", tamanho, lado + gap, base, espaco)
    lab, largura_lab = texto(JAKARTA, "Lab", tamanho, lado + gap + largura_odonto + espaco * tamanho, base, espaco)
    cor_odonto, cor_lab = (BRANCO, LIMA) if escuro else (PRETO, VIOLETA)
    corpo = icone("lima" if escuro else "violeta", ident="logo") + (
        f'  <path d="{odonto}" fill="{cor_odonto}"/>\n  <path d="{lab}" fill="{cor_lab}"/>\n'
    )
    largura = lado + gap + largura_odonto + espaco * tamanho + largura_lab + 2
    return largura, lado, corpo


def grade(lado, passo):
    """Fundo violeta quadriculado (perfil do Instagram, como no guia)."""
    linhas = "".join(
        f'<path d="M{p} 0V{lado}M0 {p}H{lado}" stroke="#FFFFFF" stroke-opacity=".09" stroke-width="2"/>'
        for p in range(passo, lado, passo)
    )
    return f'  <rect width="{lado}" height="{lado}" fill="{VIOLETA}"/>\n  {linhas}\n'


def main():
    pasta = RAIZ / "public/marca"
    pasta.mkdir(parents=True, exist_ok=True)
    for antigo in ("odontolab-selo.svg", "odontolab-simbolo.svg"):
        (pasta / antigo).unlink(missing_ok=True)

    (pasta / "odontolab-icone.svg").write_text(svg(100, 100, icone("lima")))
    (pasta / "odontolab-icone-violeta.svg").write_text(svg(100, 100, icone("violeta")))
    (pasta / "odontolab-perfil.svg").write_text(svg(1080, 1080, grade(1080, 72) + icone("lima", 270, 270, 540)))
    largura, altura, corpo = logo()
    (pasta / "odontolab-logo.svg").write_text(svg(largura, altura, corpo))
    largura, altura, corpo = logo(escuro=True)
    (pasta / "odontolab-logo-branco.svg").write_text(svg(largura, altura, corpo))

    # Favicon: a versão violeta se destaca nas abas claras e escuras.
    (RAIZ / "src/app/icon.svg").write_text(svg(100, 100, icone("violeta")))
    print("SVGs gerados em public/marca/ e src/app/icon.svg")


if __name__ == "__main__":
    main()
