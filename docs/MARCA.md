# OdontoLab — guia de marca

> **Cada post é um experimento: um tema, uma figura e um resumo de bolso.**

## Conceito

"Lab" é onde se testa, erra, corrige e aprende de novo, que é o ciclo da
plataforma: estudar, fazer simulado, receber a correção e reforçar o que faltou.

- **Ícone**: o dente como frasco de laboratório, **meio cheio, com duas bolhas**.
  O líquido é o conhecimento que vai enchendo; as bolhas, o experimento em
  andamento.
- **Linguagem visual**: editorial, como um caderno de laboratório. Grade
  quadriculada, rótulos em mono ("LAB 16 · RADIOLOGIA · FIG. 16"), cartões com
  borda Preto e um único destaque em Verde-limão.
- **Selo do tema**: abre toda capa como um elemento da tabela periódica (número,
  sigla e nome, ex.: 16 · Rx · Radiologia). As capas das disciplinas usam esse
  desenho.
- **Verde-limão é destaque**: uma palavra, um selo, um botão. Nunca texto longo.

## Arquivos

| Arquivo | Uso |
|---|---|
| `public/marca/odontolab-logo.svg` | Logotipo para fundos claros (ícone violeta, "Lab" violeta) |
| `public/marca/odontolab-logo-branco.svg` | Logotipo para fundos violeta ou escuros (ícone lima, "Lab" verde-limão) |
| `public/marca/odontolab-icone.svg` / `-icone-512.png` | Ícone em Verde-limão (fundos violeta ou escuros) |
| `public/marca/odontolab-icone-violeta.svg` | Ícone em Violeta (fundos claros) |
| `public/marca/odontolab-simbolo-512.png` | Ícone violeta em PNG (e-mails; o nome ficou por compatibilidade) |
| `public/marca/odontolab-perfil.svg` / `-1080.png` | Foto de perfil: ícone lima sobre o violeta quadriculado |
| `src/app/icon.svg` | Favicon (ícone violeta) |
| `src/app/apple-icon.tsx` | Ícone da tela inicial do iPhone |
| `src/app/opengraph-image.tsx` | Imagem de compartilhamento de links |
| `src/components/marca/logo.tsx` | `<Logo />` e `<Simbolo />` para usar no código |
| `public/capas/*.png` | Capas das disciplinas (`scripts/resumos/capas.mjs`) |

Os SVGs saem de `scripts/marca/gerar.py` (o texto vira contorno, sem depender de
fonte instalada) e os PNGs de `scripts/marca/png.mjs`. O desenho do dente é o
mesmo em `gerar.py` e em `logo.tsx`: se mudar um, mude o outro.

No código, use sempre o componente: `<Logo />` (tamanhos `sm`, `md`, `lg`) e
`<Logo claro />` sobre fundo violeta ou escuro.

## Uso do logo

- **Composição**: ícone + "OdontoLab" em Plus Jakarta Sans ExtraBold, com "Lab"
  em cor de destaque.
- **Fundo claro**: ícone violeta, "Odonto" Preto, "Lab" Violeta.
  **Fundo violeta ou escuro**: ícone lima, "Odonto" branco, "Lab" Verde-limão.
- **Assinatura dos carrosséis**: no rodapé dos posts e das capas, a marca
  aparece pequena como "odonto" + etiqueta "LAB" em mono. É um elemento, não
  substitui o logotipo.
- **Não faça**: esticar, girar, trocar as cores do ícone, separar "Odonto" e
  "Lab" com espaço. O nome é sempre **OdontoLab**.

## Cores

| Nome | Hex | Token Tailwind | Uso |
|---|---|---|---|
| Violeta | `#5A3FE0` | `primary`, `violeta`, `violeta-700` | Cor principal: botões, links, capas, fundos de destaque |
| Verde-limão | `#C8F250` | `secondary`, `lima` | Destaque: um selo, uma palavra, um botão por tela |
| Preto | `#12101F` | `tinta`, `foreground` | Texto, bordas dos cartões, contorno do dente, etiquetas "LAB" |
| Papel | `#F6F5EE` | `papel`, `background` | Fundo das páginas |
| Lilás | `#CFC6FF` | `lilas`, `violeta-200` | Fundos suaves, bordas leves, gráficos |

No código o Preto se chama `tinta`. A escala `violeta-50` … `violeta-950` serve
para fundos e bordas (`violeta-700` é o Violeta da marca). Os tokens ficam em
`src/app/globals.css`.

**Contraste**: Violeta sobre branco ou Papel passa no AA para texto. Verde-limão
só funciona com texto **Preto** por cima; branco sobre verde-limão não.

## Tipografia

| Fonte | Uso | Token |
|---|---|---|
| **Plus Jakarta Sans ExtraBold** | Títulos ("Claro ou escuro? Leia o raio X.") e logotipo | `font-heading` + `font-extrabold` |
| **Plus Jakarta Sans Medium** | Texto | `font-sans` |
| **JetBrains Mono Bold** | Rótulos ("LAB 16 · RADIOLOGIA · FIG. 16") | `font-mono`, classe `.rotulo` |

Todas livres (SIL Open Font License, em `assets/fontes/OFL.txt`). O site carrega
pelo `next/font`; os TTFs em `assets/fontes/` são para o PDF do certificado e a
imagem de compartilhamento.

## Elementos

- **Selo de tabela periódica**: quadrado verde-limão, número no topo, sigla grande
  e nome em mono embaixo.
- **Etiqueta "LAB 16"**: fundo Preto, texto Verde-limão em mono.
- **Grade quadriculada**: `.grade-violeta` (sobre violeta) e `.fundo-marca`
  (sobre papel).
- **Rótulo**: `.rotulo` (mono, caixa alta, espaçado). "ARRASTE →" nos carrosséis.
- **Cartões**: fundo branco, `border-2 border-tinta`, cantos arredondados; o
  cartão principal pode ter sombra sólida (`shadow-[8px_8px_0_0_var(--color-tinta)]`).
- **Botões em pílula**: `rounded-full`; `variant="destaque"` é o botão Verde-limão.

## Onde a marca aparece

- **Landing**: topo violeta quadriculado com título em branco e verde-limão,
  cartões com borda Preto, passos com selo de tabela periódica, chamada final em
  Verde-limão ("Resumo de bolso").
- **Área do aluno**: fundo Papel, cabeçalho branco com o logotipo; capas das
  disciplinas no catálogo; resumos com sumário, seções numeradas e caixas de
  destaque.
- **Backoffice**: cabeçalho em Preto com o logotipo claro e etiqueta
  "Backoffice" em verde-limão.
- **Entrar, cadastro e senha**: logotipo grande e formulário em cartão sobre a
  grade (`.fundo-marca`).
- **Certificado (PDF)**: logotipo, "Certificado" em Plus Jakarta ExtraBold, faixa
  violeta com traço verde-limão.
- **E-mails**: ícone + "OdontoLab", cartão com borda Preto, botão violeta em
  pílula.
- **Checkout do Asaas**: o ícone violeta como imagem do produto.

## Voz

- Fala com o estudante como um **professor próximo**: direto, sem jargão de
  marketing, sem prometer aprovação garantida.
- Frases curtas e verbos de ação: "Estude", "Treine", "Revise", "Salve",
  "Veja o que faltou".
- Termos da faculdade de verdade: disciplina, período, prova, rubrica, caso
  clínico.
- Emojis com moderação (os carrosséis usam um ou dois por legenda).
