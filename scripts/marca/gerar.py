"""Gera os arquivos da marca OdontoLab (docs/MARCA.md) com o texto em contornos.

Os SVGs não dependem de fonte instalada: as letras viram caminhos a partir das
fontes da marca em assets/fontes (Bricolage Grotesque 800 e JetBrains Mono 700).

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

VIOLETA = "#5B3DF0"
LIMA = "#C8F250"
TINTA = "#12121C"
PAPEL = "#F2F4F7"
BRANCO = "#FFFFFF"

BRICOLAGE = TTFont(FONTES / "BricolageGrotesque-ExtraBold.ttf")
MONO = TTFont(FONTES / "JetBrainsMono-Bold.ttf")


def texto(fonte, conteudo, tamanho, x, y, espaco=0.0):
    """Caminho SVG do texto com a linha de base em y. Devolve (path, largura)."""
    cmap = fonte.getBestCmap()
    glifos = fonte.getGlyphSet()
    escala = tamanho / fonte["head"].unitsPerEm
    caneta = SVGPathPen(glifos)
    cursor = x
    for i, letra in enumerate(conteudo):
        nome = cmap[ord(letra)]
        glifo = glifos[nome]
        glifo.draw(TransformPen(caneta, (escala, 0, 0, -escala, cursor, y)))
        cursor += glifo.width * escala
        if i < len(conteudo) - 1:
            cursor += espaco * tamanho
    return caneta.getCommands(), cursor - x


def caixa_texto(fonte, conteudo, tamanho, espaco=0.0):
    """Altura das maiúsculas/minúsculas para centralizar na vertical."""
    os2 = fonte["OS/2"]
    escala = tamanho / fonte["head"].unitsPerEm
    _, largura = texto(fonte, conteudo, tamanho, 0, 0, espaco)
    return largura, os2.sCapHeight * escala, os2.sxHeight * escala


def svg(largura, altura, corpo, titulo):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {largura:.0f} {altura:.0f}" '
        f'width="{largura:.0f}" height="{altura:.0f}" role="img" aria-label="{titulo}">\n'
        f"  <title>{titulo}</title>\n{corpo}</svg>\n"
    )


def selo(tamanho=512, fundo=LIMA, cor=TINTA, raio=0.22, borda=False):
    """Selo "oL": quadrado arredondado com as iniciais (ícone do app, favicon)."""
    letras = 0.62 * tamanho
    largura, cap, _ = caixa_texto(BRICOLAGE, "oL", letras, -0.04)
    x = (tamanho - largura) / 2
    y = (tamanho + cap) / 2
    caminho, _ = texto(BRICOLAGE, "oL", letras, x, y, -0.04)
    contorno = f' stroke="{TINTA}" stroke-width="{tamanho * 0.03:.1f}"' if borda else ""
    inset = tamanho * 0.015 if borda else 0
    return (
        f'  <rect x="{inset:.1f}" y="{inset:.1f}" width="{tamanho - 2 * inset:.1f}" height="{tamanho - 2 * inset:.1f}" '
        f'rx="{tamanho * raio:.1f}" fill="{fundo}"{contorno}/>\n'
        f'  <path d="{caminho}" fill="{cor}"/>\n'
    )


def perfil(tamanho=1024):
    """Foto de perfil: o selo em lima sobre um círculo Tinta."""
    interno = tamanho * 0.56
    deslocamento = (tamanho - interno) / 2
    corpo = selo(interno)
    return (
        f'  <circle cx="{tamanho / 2}" cy="{tamanho / 2}" r="{tamanho / 2}" fill="{TINTA}"/>\n'
        f'  <g transform="translate({deslocamento:.1f} {deslocamento:.1f})">\n{corpo}  </g>\n'
    )


def logo(claro=False):
    """Logotipo horizontal: "odonto" + selo "LAB" em mono.

    Fundo claro: odonto Tinta + LAB branco sobre Violeta.
    Fundo escuro/violeta (claro=True): odonto branco + LAB Tinta sobre Lima.
    """
    altura_x = 100  # tamanho de "odonto"
    nome, largura_nome = texto(BRICOLAGE, "odonto", altura_x, 0, 0, -0.03)
    _, cap_nome, xh = caixa_texto(BRICOLAGE, "odonto", altura_x, -0.03)

    rotulo = 0.42 * altura_x
    largura_lab, cap_lab, _ = caixa_texto(MONO, "LAB", rotulo, 0.06)
    pad_x, pad_y = 0.16 * altura_x, 0.13 * altura_x
    alt_selo = cap_lab + 2 * pad_y
    larg_selo = largura_lab + 2 * pad_x
    gap = 0.14 * altura_x

    margem = 4
    base = margem + cap_nome * 1.02  # linha de base de "odonto" (ascendente do "d")
    nome, _ = texto(BRICOLAGE, "odonto", altura_x, margem, base, -0.03)
    # O selo fica centralizado na altura-x de "odonto".
    centro = base - xh / 2
    sx = margem + largura_nome + gap
    sy = centro - alt_selo / 2
    lab, _ = texto(MONO, "LAB", rotulo, sx + pad_x, sy + pad_y + cap_lab, 0.06)

    cor_nome, cor_selo, cor_lab = (BRANCO, LIMA, TINTA) if claro else (TINTA, VIOLETA, BRANCO)
    largura = sx + larg_selo + margem
    altura = base + altura_x * 0.08 + margem
    corpo = (
        f'  <path d="{nome}" fill="{cor_nome}"/>\n'
        f'  <rect x="{sx:.1f}" y="{sy:.1f}" width="{larg_selo:.1f}" height="{alt_selo:.1f}" rx="{alt_selo * 0.2:.1f}" fill="{cor_selo}"/>\n'
        f'  <path d="{lab}" fill="{cor_lab}"/>\n'
    )
    return largura, altura, corpo


def main():
    pasta = RAIZ / "public/marca"
    pasta.mkdir(parents=True, exist_ok=True)
    for antigo in ("odontolab-simbolo.svg",):
        (pasta / antigo).unlink(missing_ok=True)

    (pasta / "odontolab-selo.svg").write_text(svg(512, 512, selo(512), "OdontoLab"))
    (pasta / "odontolab-perfil.svg").write_text(svg(1024, 1024, perfil(1024), "OdontoLab"))
    largura, altura, corpo = logo()
    (pasta / "odontolab-logo.svg").write_text(svg(largura, altura, corpo, "OdontoLab"))
    largura, altura, corpo = logo(claro=True)
    (pasta / "odontolab-logo-branco.svg").write_text(svg(largura, altura, corpo, "OdontoLab"))

    # Favicon: selo com borda Tinta para não sumir em abas claras.
    (RAIZ / "src/app/icon.svg").write_text(svg(64, 64, selo(64, borda=True), "OdontoLab"))
    print("SVGs gerados em public/marca/ e src/app/icon.svg")


if __name__ == "__main__":
    main()
