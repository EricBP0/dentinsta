# dentinsta

Plataforma de estudos para graduação em Odontologia. Planejamento completo em
[`docs/PLANEJAMENTO.md`](docs/PLANEJAMENTO.md).

**Stack:** Next.js 16 (App Router) · Supabase (Postgres, Auth, RLS) · Tailwind CSS 4 · Vitest

## O que já existe

- **Landing page** com preço (12x R$ 32,90 ou R$ 297,90 à vista).
- **Login e cadastro** (Supabase Auth, e-mail e senha).
- **Backoffice** (`/admin`, só `professor` e `admin`):
  - disciplinas dinâmicas: rascunho → em breve → publicada → arquivada, com agendamento;
  - módulos e itens (vídeo, resumo, mapa mental, flashcards, prova) com ordem,
    publicação e marcação de **obrigatório**.
- **Área do aluno** (`/aluno`):
  - catálogo com cards "Em breve" e cadeado **"Renove para liberar"**;
  - disciplina com progresso "X de Y itens obrigatórios";
  - visualização de vídeo, resumo e mapa mental, e "marcar como concluído".
- **Regras de acesso** (janela de 12 meses de novidades e IA; acesso vitalício ao
  que já foi publicado) aplicadas **no banco** (RLS + `conteudo_item()`) e na interface.

Ainda não existe: pagamento Stripe, questões e simulados com IA, flashcards,
emissão do PDF do certificado e dashboard. Essas são as próximas etapas do roadmap.

## Configuração

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode `supabase/migrations/0001_base.sql`
   (ou `supabase db push` com a CLI).
3. Copie `.env.example` para `.env.local` e preencha com a URL e a chave
   *publishable* (ou *anon*) do projeto (**Project Settings → API**).
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
| `npm test` | Testes unitários (regras de acesso, certificado, datas) |

## Estrutura

```
supabase/migrations/     Esquema do banco, RLS e funções de acesso
src/proxy.ts             Renova a sessão e protege /aluno e /admin
src/lib/acesso.ts        Janela de 12 meses (espelha pode_acessar_item() no SQL)
src/lib/certificado.ts   Regra "100% dos itens obrigatórios"
src/lib/catalogo.ts      Monta o catálogo do aluno com cadeados e progresso
src/app/admin/           Backoffice
src/app/aluno/           Área do aluno
```
