# dentinsta

Plataforma de estudos para graduação em Odontologia. Planejamento completo em
[`docs/PLANEJAMENTO.md`](docs/PLANEJAMENTO.md).

**Stack:** Next.js 16 (App Router) · Supabase (Postgres, Auth, RLS) · API da Anthropic (Claude) · Tailwind CSS 4 · Vitest

## O que já existe

- **Landing page** com preço (12x R$ 32,90 ou R$ 297,90 à vista).
- **Login e cadastro** (Supabase Auth, e-mail e senha).
- **Backoffice** (`/admin`, só `professor` e `admin`):
  - disciplinas dinâmicas: rascunho → em breve → publicada → arquivada, com agendamento;
  - módulos e itens (vídeo, resumo, mapa mental, flashcards, prova) com ordem,
    publicação e marcação de **obrigatório**;
  - **banco de questões** (objetivas e discursivas com gabarito, explicação e
    rubrica), com cadastro manual e **importação por planilha CSV**
    ([modelo](public/modelo-questoes.csv));
  - **geração de questões por IA**: o professor envia o material (PDF, Word,
    texto, fotos das páginas ou texto colado), escolhe quantas objetivas e
    discursivas quer, e a IA cria questões com gabarito, explicação, rubrica e a
    **fonte** no material. Roda em lote (metade do custo) e as questões entram como
    **rascunho** para revisão. Provas antigas podem ser enviadas só como
    referência de assuntos e estilo — a IA não copia as questões;
  - **flashcards**: em cada item do tipo flashcards, o professor monta o deck
    adicionando cards, importando planilha (frente;verso) ou **gerando com IA** a
    partir do material (cards da IA entram como rascunho);
  - **contestações**: o professor revisa correções da IA e pode corrigir a nota.
- **Área do aluno** (`/aluno`):
  - catálogo com cards "Em breve" e cadeado **"Renove para liberar"**;
  - disciplina com progresso "X de Y itens obrigatórios";
  - visualização de vídeo, resumo e mapa mental, e "marcar como concluído";
  - **simulados** montados do banco, sem IA: filtros de tema, dificuldade e tipo,
    priorizando questões não respondidas e as que o aluno errou;
  - **correção**: objetivas na hora (no banco); discursivas pela IA com nota por
    critério da rubrica, comentários e "faltou citar", em segundo plano;
  - cota de **60 correções por IA/mês**, botão "Discorda da correção?";
  - **flashcards com repetição espaçada** (SM-2): o aluno avalia cada card
    (errei, difícil, bom, fácil) e ele volta no dia certo. "Revisão do dia" junta
    todos os decks; o deck conta como concluído para o certificado quando todos os
    cards foram vistos pelo menos uma vez.
- **Regras de acesso** (janela de 12 meses de novidades e IA; acesso vitalício ao
  que já foi publicado) aplicadas **no banco** (RLS + `conteudo_item()`) e na interface.

Segurança do banco de questões: o aluno nunca lê gabarito, explicação ou rubrica
antes de enviar o simulado, e não consegue gravar a própria nota — objetivas são
corrigidas por função do banco e discursivas pelo servidor com a chave secreta.

Ainda não existe: pagamento Stripe, emissão do PDF do certificado e dashboard.

## Configuração

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode os arquivos de `supabase/migrations/` em ordem
   (`0001_base.sql`, `0002_questoes_simulados.sql`, `0003_geracao_questoes.sql`,
   `0004_flashcards.sql`),
   ou `supabase db push` com a CLI. A 0003 cria o bucket privado `materiais` no Storage.
3. Copie `.env.example` para `.env.local` e preencha:
   - URL e chave *publishable* do Supabase (**Project Settings → API Keys**);
   - chave *secret* do Supabase (só no servidor — grava as notas da IA);
   - `ANTHROPIC_API_KEY` ([console.anthropic.com](https://console.anthropic.com)).
   `IA_MODELO`, `IA_EFFORT`, `IA_COTA_MENSAL`, `IA_MODELO_GERACAO` e
   `IA_EFFORT_GERACAO` são opcionais.
4. Instale e rode:

   ```bash
   npm install
   npm run dev
   ```

5. Crie sua conta em `http://localhost:3000/entrar` e promova-a a admin no SQL Editor:

   ```sql
   update perfis set papel = 'admin' where email = 'seu@email.com';
   ```

   Para o professor use `papel = 'professor'` (gerencia conteúdo).

6. Enquanto o Stripe não está integrado, libere o acesso de um aluno de teste manualmente:

   ```sql
   insert into acessos (usuario_id, compra_em, novidades_ate, ia_ate, origem)
   select id, now(), now() + interval '12 months', now() + interval '12 months', 'manual'
   from perfis where email = 'aluno@teste.com';
   ```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Checagem de tipos |
| `npm test` | Testes unitários (acesso, certificado, datas, correção, CSV) |

## Correção por IA: calibrar antes de lançar

O modelo e o esforço da correção são configuráveis (`IA_MODELO`, `IA_EFFORT`;
padrão `claude-opus-5-5` com esforço `low`). Antes do lançamento, corrija ~50
respostas reais com o professor, rode as mesmas com a IA e compare as notas
(docs/PLANEJAMENTO.md, seção 6.3). Ajuste rubricas e configuração até as notas
ficarem próximas. O consumo de tokens de cada correção fica na tabela `uso_ia`.

## Estrutura

```
supabase/migrations/     Esquema do banco, RLS e funções de acesso
src/proxy.ts             Renova a sessão e protege /aluno e /admin
src/lib/acesso.ts        Janela de 12 meses (espelha pode_acessar_item() no SQL)
src/lib/certificado.ts   Regra "100% dos itens obrigatórios"
src/lib/catalogo.ts      Monta o catálogo do aluno com cadeados e progresso
src/lib/ia/              Correção por IA: prompt, rubrica → nota, cota, chamada à API
src/lib/ia/geracao/      Geração de questões: leitura do material, prompt, lote e importação
src/lib/questoes/        Validação de questões e importação CSV
src/lib/flashcards/      Repetição espaçada, importação de cards e sessão de estudo
src/app/admin/           Backoffice
src/app/aluno/           Área do aluno
```
