# OdontoLab — guia de marca (identidade visual v1)

> **Cada post é um experimento: um tema, uma figura e um resumo de bolso.**

## Conceito

"Lab" é onde se testa, erra, corrige e aprende de novo, que é o ciclo da
plataforma: estudar, fazer simulado, receber a correção e reforçar o que faltou.
A identidade é editorial e tipográfica, como um caderno de laboratório: grade
quadriculada, rótulos em mono ("LAB 01 · FIG. 01 · 02/06"), cartões com borda
escura e um único destaque em lima.

- **O selo do tema** abre toda capa, como um elemento da tabela periódica
  (número, sigla e nome). As capas das disciplinas seguem esse desenho.
- **A marca fica só no rodapé**, pequena, em todos os slides. No site ela fica
  no cabeçalho, também discreta.
- **Lima é destaque**: uma palavra, um selo, um botão. Nunca texto longo.

## Arquivos

| Arquivo | Uso |
|---|---|
| `public/marca/odontolab-logo.svg` | Logo horizontal para fundos claros (LAB violeta) |
| `public/marca/odontolab-logo-branco.svg` | Logo para fundos escuros ou violeta (LAB lima) |
| `public/marca/odontolab-selo.svg` | Selo "oL" (ícone, avatar) |
| `public/marca/odontolab-simbolo-512.png` | Selo em PNG (e-mails, WhatsApp) |
| `public/marca/odontolab-perfil.svg` / `-1024.png` | Foto de perfil: selo lima sobre círculo Tinta |
| `src/app/icon.svg` | Favicon (selo com borda Tinta, para não sumir em abas claras) |
| `src/app/apple-icon.tsx` | Ícone da tela inicial do iPhone |
| `src/app/opengraph-image.tsx` | Imagem de compartilhamento de links |
| `src/components/marca/logo.tsx` | `<Logo />` e `<Simbolo />` para usar no código |
| `public/capas/*.png` | Capas das disciplinas (`scripts/resumos/capas.mjs`) |

Os SVGs têm o texto em contornos (não dependem de fonte instalada) e saem de
`scripts/marca/gerar.py`; os PNGs, de `scripts/marca/png.mjs`.

No código, use sempre o componente: `<Logo />` (tamanhos `sm`, `md`, `lg`) e
`<Logo claro />` sobre fundo escuro ou violeta.

## Uso do logo

- **Composição**: "odonto" em Bricolage Grotesque 800, minúsculo, + selo "LAB"
  em JetBrains Mono, caixa alta e espaçado.
- **Fundo claro**: "odonto" em Tinta, selo Violeta com "LAB" branco.
  **Fundo escuro ou violeta**: "odonto" branco, selo Lima com "LAB" Tinta.
- **Não faça**: esticar, girar, trocar as cores do selo, escrever "Odontolab",
  "ODONTOLAB" ou "Odonto Lab" no texto corrido. O nome é sempre **OdontoLab**;
  o logotipo é que se escreve "odonto LAB".

## Cores

| Nome | Hex | Token Tailwind | Uso |
|---|---|---|---|
| Violeta | `#5B3DF0` | `primary`, `violeta`, `violeta-700` | Cor principal: botões, links, capas, fundos de destaque |
| Lima | `#C8F250` | `secondary`, `lima` | Destaque: um selo, uma palavra, um botão por tela |
| Tinta | `#12121C` | `tinta`, `foreground` | Texto, bordas dos cartões, seções escuras |
| Papel | `#F2F4F7` | `papel`, `background` | Fundo das páginas |

A escala `violeta-50` … `violeta-950` serve para fundos suaves e bordas
(`violeta-700` é o Violeta da marca). Os tokens ficam em `src/app/globals.css`.

**Contraste**: Violeta sobre branco ou Papel passa no AA para texto (6,2:1).
Lima só funciona com texto **Tinta** por cima (14:1); branco sobre lima não
(1,3:1).

## Tipografia

| Fonte | Uso | Token |
|---|---|---|
| **Bricolage Grotesque 800** | Títulos que param o dedo (`h1`–`h3`, logotipo) | `font-heading` |
| **Instrument Sans** | Texto direto, para ler no celular sem esforço | `font-sans` |
| **JetBrains Mono** | Rótulos e números ("LAB 01 · FIG. 01 · 02/06") | `font-mono`, classe `.rotulo` |

Todas livres (SIL Open Font License, em `assets/fontes/OFL.txt`). O site carrega
pelo `next/font`; os TTFs em `assets/fontes/` são para o PDF do certificado e a
imagem de compartilhamento.

## Elementos

- **Grade quadriculada**: `.grade-violeta` (sobre violeta) e `.fundo-marca`
  (sobre papel).
- **Rótulo**: `.rotulo` (mono, caixa alta, espaçado).
- **Cartões**: fundo branco, `border-2 border-tinta`, cantos arredondados; o
  cartão principal pode ter sombra sólida (`shadow-[8px_8px_0_0_var(--color-tinta)]`).
- **Botões em pílula**: `rounded-full`; `variant="destaque"` é o botão Lima.

## Onde a marca aparece

- **Landing**: topo violeta quadriculado com título em branco e lima, cartões
  com borda Tinta, passos com selo de tabela periódica, chamada final em Lima
  ("Resumo de bolso").
- **Área do aluno**: fundo Papel, cabeçalho branco com o logo; capas das
  disciplinas no catálogo; resumos com sumário, seções numeradas e caixas de
  destaque.
- **Backoffice**: cabeçalho em Tinta com logo claro e selo lima "Backoffice".
- **Entrar, cadastro e senha**: logo grande e formulário em cartão sobre a grade
  (`.fundo-marca`).
- **Certificado (PDF)**: logotipo, "Certificado" em Bricolage, faixa violeta com
  traço lima.
- **E-mails**: selo + logotipo, cartão com borda Tinta, botão violeta em pílula.
- **Checkout do Asaas**: o selo como imagem do produto.

## Voz

- Fala com o estudante como um **professor próximo**: direto, sem jargão de
  marketing, sem prometer aprovação garantida.
- Frases curtas e verbos de ação: "Estude", "Treine", "Revise", "Salve",
  "Veja o que faltou".
- Termos da faculdade de verdade: disciplina, período, prova, rubrica, caso
  clínico.
- Emojis com moderação (os carrosséis usam um ou dois por legenda).
