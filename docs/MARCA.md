# OdontoLab — guia de marca

> **OdontoLab — o laboratório de estudos da graduação em Odontologia.**

## Conceito

"Lab" é onde se testa, erra, corrige e aprende de novo, que é exatamente o
ciclo da plataforma: estudar, fazer simulado, receber a correção e reforçar o
que faltou. O símbolo junta as duas ideias num desenho só: um **dente que também
é um frasco de laboratório**.

- **Dente branco**: a Odontologia, com traço limpo e clínico.
- **Líquido menta** dentro do dente: o conhecimento que vai enchendo.
- **Bolhas coral** saindo do frasco: o experimento em andamento e a energia de
  quem está estudando. É o único ponto quente da marca.
- **Quadrado teal arredondado**: a base, o "ambiente" do laboratório. Funciona
  como ícone de app.

## Arquivos

| Arquivo | Uso |
|---|---|
| `public/marca/odontolab-logo.svg` | Logo horizontal para fundos claros |
| `public/marca/odontolab-logo-branco.svg` | Logo horizontal para fundos escuros |
| `public/marca/odontolab-simbolo.svg` | Só o símbolo (avatar, redes, ícone) |
| `public/marca/odontolab-simbolo-512.png` | Símbolo em PNG (perfil do Instagram, WhatsApp) |
| `src/app/icon.svg` | Favicon (sem a bolha pequena, que some em 16px) |
| `src/app/apple-icon.tsx` | Ícone da tela inicial do iPhone |
| `src/app/opengraph-image.tsx` | Imagem de compartilhamento de links |
| `src/components/marca/logo.tsx` | `<Logo />` e `<Simbolo />` para usar no código |

No código, use sempre o componente: `<Logo />` (tamanhos `sm`, `md`, `lg`) e
`<Logo claro />` sobre fundo escuro.

## Uso do logo

- **Área de respiro**: deixe em volta do logo pelo menos a altura da bolha
  maior (~1/4 da altura do símbolo).
- **Tamanho mínimo**: símbolo com 16px (favicon) e logo horizontal com 96px
  de largura.
- **Fundo claro**: "Odonto" em tinta, "Lab" em teal. **Fundo escuro**: "Odonto"
  em branco, "Lab" em menta.
- **Não faça**: esticar, girar, trocar as cores do símbolo, colocar sombra ou
  contorno, escrever "Odontolab", "ODONTOLAB" ou "Odonto Lab". O nome é
  sempre **OdontoLab**, com L maiúsculo e sem espaço.

## Cores

| Nome | Hex | Token Tailwind | Uso |
|---|---|---|---|
| Teal (primária) | `#0F766E` | `primary`, `teal-700` | Botões, links, "Lab", destaques |
| Teal claro | `#14B8A6` | `teal-500` | Gradiente do símbolo, gráficos |
| Tinta | `#0B1F24` | `tinta` | Títulos, textos fortes, fundo do backoffice e seções escuras |
| Menta | `#99F6E4` | `menta` | Líquido do símbolo, detalhes sobre fundo escuro |
| Menta forte | `#5EEAD4` | `teal-300` | "Lab" sobre fundo escuro |
| Coral | `#FF7A59` | `coral` | Acento: chamadas, sublinhado do título, selo "Backoffice". Use pouco. |
| Coral claro | `#FFB199` | `coral-claro` | Bolha menor, hover do coral |

Proporção: muito branco, teal como cor de ação, tinta para peso e **coral só
como tempero** (um ou dois pontos por tela). Texto sobre coral é sempre tinta,
nunca branco.

Os tokens ficam em `src/app/globals.css`.

## Tipografia

- **Sora Bold/SemiBold**: títulos (`h1`–`h3` já usam `font-heading`) e o nome
  da marca.
- **Geist**: textos, botões e formulários.

As duas são livres (SIL Open Font License, em `assets/fontes/OFL.txt`).

## Onde a marca aparece

- **Landing**: logo no cabeçalho e no rodapé, título com sublinhado coral,
  card de destaque em teal → tinta com ícone coral, chamada final em tinta com
  botão coral.
- **Área do aluno**: cabeçalho branco com o logo e menu em pílulas.
- **Backoffice**: cabeçalho em tinta com logo claro e selo coral "Backoffice",
  assim fica claro em qual área você está.
- **Entrar, cadastro e senha**: logo grande sobre fundo branco com manchas
  suaves de menta e coral (`.fundo-marca`).
- **Certificado (PDF)**: símbolo e nome no topo, faixa teal com detalhe coral.
- **Checkout do Asaas**: símbolo como imagem do produto.

## Voz

- Fala com o estudante como um **professor próximo**: direto, sem jargão de
  marketing, sem prometer aprovação garantida.
- Frases curtas e verbos de ação: "Estude", "Treine", "Revise", "Veja o que
  faltou".
- Termos da faculdade de verdade: disciplina, período, prova, rubrica, caso
  clínico.
- Nada de "revolucionário", "melhor do Brasil" ou excesso de emojis.
