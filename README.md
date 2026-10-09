# OdontoLab

Plataforma de estudos para graduação em Odontologia. Planejamento completo em
[`docs/PLANEJAMENTO.md`](docs/PLANEJAMENTO.md). Para colocar no ar, siga o
[roteiro de publicação](docs/PUBLICACAO.md).

**Stack:** Next.js 16 (App Router) · Supabase (Postgres, Auth, RLS) · API da Anthropic (Claude) · Tailwind CSS 4 · shadcn/ui (Radix) · Motion · Vitest

## O que já existe

- **Landing page** com hero animado (prévia da correção por IA e flashcard),
  recursos, como funciona, preço e dúvidas frequentes.
- **Design system**: shadcn/ui (`src/components/ui`) com as cores da marca em
  `src/app/globals.css`, e animações com Motion (`src/components/movimento.tsx`),
  que respeitam a opção "reduzir movimento" do sistema. Componentes do
  [21st.dev](https://21st.dev) podem ser adicionados com o CLI do shadcn.
- **Assinaturas pelo Asaas** (`/assinar`): planos Essencial (Disciplinas + módulos
  avulsos), Completo e Duplo (duas pessoas), com upsell para o Completo. Mensal é
  recorrente no cartão; anual é pagamento único (Pix, cartão 1x ou até 12x). Cada
  pagamento confirmado estende o acesso; estorno e chargeback cortam. Preços em
  `src/lib/planos.ts`; o aluno gerencia em **Minha assinatura**.
- **Login e cadastro** (Supabase Auth, e-mail e senha), com confirmação de e-mail
  (`/auth/confirmar`) e "esqueci minha senha" (`/redefinir-senha`).
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
  - **contestações**: o professor revisa correções da IA e pode corrigir a nota;
  - **vendas** (só admin): pagamentos, vendas do mês, busca de alunos, liberação
    manual de acesso (cortesia) e revogação.
- **Área do aluno** (`/aluno`):
  - **painel**: "continue de onde parou", flashcards do dia, média nos
    simulados (7 dias, com variação), tempo de estudo, sequência de dias,
    disciplinas concluídas, gráfico de notas (30 dias) e de tempo por dia (14
    dias), temas para reforçar e progresso rumo aos certificados. O tempo conta
    só enquanto o aluno está ativo numa página de estudo;
  - catálogo (`/aluno/disciplinas`) com cards "Em breve" e cadeado **"Renove para liberar"**;
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
    cards foram vistos pelo menos uma vez;
  - animações: cards do catálogo entrando em sequência, barras de progresso,
    flashcard que vira em 3D, nota do simulado contando e comemoração (nota a
    partir de 7, fim da sessão de flashcards e pagamento confirmado).
  - **certificados** (`/aluno/certificados`): ao concluir 100% dos itens
    obrigatórios, o aluno confirma o nome completo e emite o certificado em PDF
    (A4, com código e QR de validação). O banco confere a conclusão e guarda o
    nome, a disciplina e a carga horária da emissão.
- **Validação pública** (`/certificado/CODIGO`): qualquer pessoa confere se um
  certificado é autêntico, sem login.
- **Regras de acesso** (janela de 12 meses de novidades e IA; acesso vitalício ao
  que já foi publicado) aplicadas **no banco** (RLS + `conteudo_item()`) e na interface.

Segurança do banco de questões: o aluno nunca lê gabarito, explicação ou rubrica
antes de enviar o simulado, e não consegue gravar a própria nota — objetivas são
corrigidas por função do banco e discursivas pelo servidor com a chave secreta.

## Configuração

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode os arquivos de `supabase/migrations/` em ordem
   (`0001_base.sql`, `0002_questoes_simulados.sql`, `0003_geracao_questoes.sql`,
   `0004_flashcards.sql`, `0005_pagamentos_asaas.sql`, `0006_painel_aluno.sql`,
   `0007_certificados.sql`),
   ou `supabase db push` com a CLI. A 0003 cria o bucket privado `materiais` no Storage.
3. Copie `.env.example` para `.env.local` e preencha:
   - URL e chave *publishable* do Supabase (**Project Settings → API Keys**);
   - chave *secret* do Supabase (só no servidor — grava as notas da IA);
   - IA: `GEMINI_API_KEY` ([aistudio.google.com](https://aistudio.google.com), conta paga)
     e `ANTHROPIC_API_KEY` ([console.anthropic.com](https://console.anthropic.com)), de reserva.
   - Asaas: `ASAAS_API_KEY`, `ASAAS_AMBIENTE` (`sandbox` para testar,
     `producao` para cobrar), `ASAAS_WEBHOOK_TOKEN` e `NEXT_PUBLIC_SITE_URL`.
   `IA_CORRECAO`, `IA_CHAT`, `IA_GERACAO` (modelos de cada uso, em ordem),
   `IA_EFFORT`, `IA_COTA_MENSAL` e `IA_EFFORT_GERACAO` são opcionais. No certificado, `CERTIFICADO_RESPONSAVEL`
   e `CERTIFICADO_RESPONSAVEL_CARGO` definem quem assina (ex.: nome e CRO do
   professor responsável).
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

6. **Asaas**: crie a conta (use o [sandbox](https://sandbox.asaas.com) para
   testar), gere a chave de API e cadastre o webhook em **Integrações → Webhooks**:
   - URL: `https://odontolab.online/api/asaas/webhook`
   - Token de autenticação: o mesmo valor de `ASAAS_WEBHOOK_TOKEN`
   - Eventos: `CHECKOUT_PAID`, `CHECKOUT_CANCELED`, `CHECKOUT_EXPIRED`,
     `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_REFUNDED`,
     `PAYMENT_CHARGEBACK_REQUESTED`, `SUBSCRIPTION_DELETED`,
     `SUBSCRIPTION_INACTIVATED`

   Para emitir nota fiscal automaticamente, configure a NFS-e no painel do Asaas.
   Em desenvolvimento, dá para liberar acesso de teste em **Backoffice → Vendas**.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Checagem de tipos |
| `npm test` | Testes unitários (acesso, certificado, datas, correção, CSV) |

## Correção por IA: calibrar antes de lançar

Cada uso da IA (correção, chat, geração) tem uma lista de modelos em ordem
(`IA_CORRECAO`, `IA_CHAT`, `IA_GERACAO`; padrão
`gemini:gemini-3.6-flash,anthropic:claude-opus-5-5`): se o primeiro falhar ou
recusar, o próximo assume. Os provedores ficam em `src/lib/ia/provedores/`
(Gemini e Anthropic; outro provedor é mais um arquivo ali). Antes de trocar o
modelo da correção, corrija ~50 respostas reais com o professor, rode as mesmas
com a IA e compare as notas (docs/PLANEJAMENTO.md, seção 6.3). O uso e o custo
estimado por modelo aparecem em **Backoffice → IA** (tabela `uso_ia`).

## Estrutura

```
supabase/migrations/     Esquema do banco, RLS e funções de acesso
src/proxy.ts             Renova a sessão e protege /aluno e /admin
src/lib/acesso.ts        Janela de 12 meses (espelha pode_acessar_item() no SQL)
src/lib/certificado/     Regra "100% dos itens obrigatórios", texto e PDF do certificado
src/lib/catalogo.ts      Monta o catálogo do aluno com cadeados e progresso
src/lib/ia/              Correção por IA: prompt, rubrica → nota, cota, chamada à API
src/lib/ia/geracao/      Geração de questões: leitura do material, prompt, lote e importação
src/lib/questoes/        Validação de questões e importação CSV
src/lib/flashcards/      Repetição espaçada, importação de cards e sessão de estudo
src/app/admin/           Backoffice
src/app/aluno/           Área do aluno
```
