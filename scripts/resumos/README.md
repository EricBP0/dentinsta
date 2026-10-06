# Importação dos resumos em PDF

Transforma os PDFs de resumo (gerados no modelo da OdontoLab) em disciplinas da
plataforma: **um PDF = uma disciplina**, **cada capa interna do PDF = um módulo**,
e cada módulo ganha um item **resumo** (obrigatório) com:

- o texto do módulo convertido para o site (seções, subtítulos, caixas de
  destaque, tabelas e figuras), que lê bem no celular;
- o link para o PDF completo, aberto na página onde o módulo começa.

PDF e figuras ficam no bucket **privado** `resumos` (migração `0008_resumos.sql`).
O aluno só recebe links temporários, gerados no servidor depois de
`conteudo_item()` confirmar o acesso.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `disciplinas.json` | Lista dos PDFs: slug, nome, sigla e área de cada disciplina (a ordem é a do catálogo) |
| `converter.py` | Lê os PDFs e gera `.resumos/<slug>/resumo.json` + `img/*.webp` (fora do git) |
| `capas.mjs` | Gera as capas em `public/capas/<slug>.png` |
| `importar.mjs` | Sobe tudo para o Supabase |

## Passo a passo

```bash
# 0. Migração do bucket (uma vez): rode supabase/migrations/0008_resumos.sql no SQL Editor.

# 1. Converter (Python 3 + PyMuPDF + Pillow)
pip install pymupdf pillow
python3 scripts/resumos/converter.py <pasta-dos-pdfs>

# 2. Capas (Playwright com Chromium). Use depois do passo 1 para mostrar módulos/páginas.
node scripts/resumos/capas.mjs

# 3. Importar (precisa de SUPABASE_URL e SUPABASE_SECRET_KEY no ambiente)
node scripts/resumos/importar.mjs <pasta-dos-pdfs>
```

Todos aceitam slugs no fim para rodar só algumas disciplinas
(ex.: `... cirurgia sus`).

## Depois de importar

- As disciplinas **novas** entram como **rascunho**. Revise no `/admin` e
  publique quando estiver tudo certo. Módulos e itens já entram publicados, então
  aparecem assim que a disciplina for publicada.
- Rodar de novo é seguro: a disciplina é achada pelo slug e o módulo pela ordem.
  O conteúdo importado é atualizado. Status, título do item e o que a equipe
  editou no admin ficam como estão.
- Figuras e PDF que já estão no bucket não são enviados de novo. Para forçar,
  use `--forcar-midia`.
- Carga horária e período sugerido ficam em branco: preencha no admin (a carga
  horária vai no certificado).
