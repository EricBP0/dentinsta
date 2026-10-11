-- =============================================================================
-- Cadastro sem atrito: o aluno paga sem criar senha nem confirmar e-mail antes.
--
-- Na hora de pagar, o site pede nome, e-mail e WhatsApp, cria a conta (sem
-- senha) e já entra com ela no navegador. Depois do primeiro pagamento, um
-- e-mail pede para criar a senha (para entrar de outros aparelhos).
--
-- "Quero conhecer" guarda nome, e-mail e WhatsApp como lead antes dos planos.
-- =============================================================================

alter table perfis
  add column telefone text check (telefone is null or telefone ~ '^[0-9]{10,11}$'),
  -- Conta criada no pagamento: ainda não criou a senha.
  add column senha_pendente boolean not null default false,
  -- Quando o e-mail "crie sua senha" foi enviado (só uma vez por conta).
  add column convite_senha_em timestamptz;

create table leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) between 1 and 120),
  email text not null check (email = lower(email) and length(email) <= 254),
  telefone text not null check (telefone ~ '^[0-9]{10,11}$'),
  origem text not null default 'conhecer',
  -- Preenchido quando a pessoa vai pagar (a conta é criada nessa hora).
  usuario_id uuid references perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (email)
);
create index on leads (criado_em desc);

alter table leads enable row level security;
create policy leads_admin on leads for select using ((select eh_admin()));
-- Gravação só pelo servidor (service role).
revoke insert, update, delete on leads from authenticated, anon;
