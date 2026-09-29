-- =============================================================================
-- Base da plataforma: perfis, conteúdo dinâmico, acesso, progresso, certificados.
-- Regras de negócio: docs/PLANEJAMENTO.md
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type papel as enum ('aluno', 'professor', 'admin');
create type status_disciplina as enum ('rascunho', 'em_breve', 'publicada', 'arquivada');
create type status_publicacao as enum ('rascunho', 'publicado');
create type tipo_item as enum ('video', 'resumo', 'mapa_mental', 'flashcards', 'prova');
create type origem_acesso as enum ('compra', 'renovacao', 'manual', 'cortesia');
create type metodo_pagamento as enum ('cartao', 'pix', 'boleto');
create type status_compra as enum ('pendente', 'pago', 'reembolsado', 'contestado');

-- -----------------------------------------------------------------------------
-- Perfis (1:1 com auth.users)
-- -----------------------------------------------------------------------------
create table perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  email text not null,
  universidade text,
  periodo smallint check (periodo between 1 and 12),
  papel papel not null default 'aluno',
  criado_em timestamptz not null default now()
);

-- Cria o perfil automaticamente no cadastro.
create function criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfis (id, email, nome)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'nome', ''));
  return new;
end $$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function criar_perfil();

create function eh_equipe() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from perfis where id = auth.uid() and papel in ('professor', 'admin')
  );
$$;

create function eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and papel = 'admin');
$$;

-- -----------------------------------------------------------------------------
-- Conteúdo dinâmico: disciplina -> módulo -> item
-- -----------------------------------------------------------------------------
create table disciplinas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nome text not null,
  descricao text not null default '',
  capa_url text,
  periodo_sugerido smallint check (periodo_sugerido between 1 and 12),
  carga_horaria_h integer not null default 0 check (carga_horaria_h >= 0),
  status status_disciplina not null default 'rascunho',
  publicar_em timestamptz,
  primeira_publicacao_em timestamptz,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table modulos (
  id uuid primary key default gen_random_uuid(),
  disciplina_id uuid not null references disciplinas (id) on delete cascade,
  titulo text not null,
  ordem integer not null default 0,
  status status_publicacao not null default 'rascunho',
  publicar_em timestamptz,
  primeira_publicacao_em timestamptz,
  criado_em timestamptz not null default now()
);
create index on modulos (disciplina_id, ordem);

create table itens (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references modulos (id) on delete cascade,
  tipo tipo_item not null,
  titulo text not null,
  ordem integer not null default 0,
  obrigatorio boolean not null default false,
  status status_publicacao not null default 'rascunho',
  publicar_em timestamptz,
  primeira_publicacao_em timestamptz,
  -- Conteúdo do item (video_id, resumo, url do mapa...). Alunos NÃO leem esta
  -- coluna diretamente: usam conteudo_item(), que confere o acesso.
  config jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on itens (modulo_id, ordem);

-- Registra a data da PRIMEIRA publicação (não muda em edições nem ao
-- despublicar/republicar). É a base da janela de 12 meses de novidades.
create function marcar_primeira_publicacao() returns trigger
language plpgsql as $$
begin
  if new.primeira_publicacao_em is null
     and new.status::text in ('publicado', 'publicada') then
    new.primeira_publicacao_em := greatest(now(), coalesce(new.publicar_em, now()));
  end if;
  if tg_table_name <> 'modulos' then
    new.atualizado_em := now();
  end if;
  return new;
end $$;

create trigger primeira_publicacao before insert or update on disciplinas
  for each row execute function marcar_primeira_publicacao();
create trigger primeira_publicacao before insert or update on modulos
  for each row execute function marcar_primeira_publicacao();
create trigger primeira_publicacao before insert or update on itens
  for each row execute function marcar_primeira_publicacao();

-- -----------------------------------------------------------------------------
-- Compras e acesso
-- -----------------------------------------------------------------------------
create table compras (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfis (id) on delete cascade,
  stripe_checkout_id text unique,
  stripe_payment_intent_id text,
  metodo metodo_pagamento,
  parcelas smallint not null default 1,
  valor_total_centavos integer not null,
  status status_compra not null default 'pendente',
  criado_em timestamptz not null default now()
);

-- Um registro por aluno. Renovação estende novidades_ate / ia_ate.
create table acessos (
  usuario_id uuid primary key references perfis (id) on delete cascade,
  compra_em timestamptz not null,
  novidades_ate timestamptz not null,
  ia_ate timestamptz not null,
  origem origem_acesso not null,
  compra_id uuid references compras (id),
  atualizado_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Progresso e certificados
-- -----------------------------------------------------------------------------
create table progresso_item (
  usuario_id uuid not null references perfis (id) on delete cascade,
  item_id uuid not null references itens (id) on delete cascade,
  percentual smallint not null default 0 check (percentual between 0 and 100),
  concluido boolean not null default false,
  concluido_em timestamptz,
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, item_id)
);

create table certificados (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfis (id) on delete cascade,
  disciplina_id uuid not null references disciplinas (id),
  codigo_validacao text not null unique default upper(encode(gen_random_bytes(6), 'hex')),
  carga_horaria_h integer not null,
  emitido_em timestamptz not null default now(),
  pdf_url text,
  unique (usuario_id, disciplina_id)
);

-- -----------------------------------------------------------------------------
-- Regras de visibilidade (espelham src/lib/acesso.ts — manter as duas iguais)
-- -----------------------------------------------------------------------------

-- Data em que o item passou a existir para o aluno: a mais tardia entre as
-- primeiras publicações do item, do módulo e da disciplina.
create function data_efetiva_publicacao(i itens) returns timestamptz
language sql stable set search_path = public as $$
  select greatest(i.primeira_publicacao_em, m.primeira_publicacao_em, d.primeira_publicacao_em)
  from modulos m join disciplinas d on d.id = m.disciplina_id
  where m.id = i.modulo_id;
$$;

create function item_publicado(i itens) returns boolean
language sql stable set search_path = public as $$
  select i.status = 'publicado' and m.status = 'publicado' and d.status = 'publicada'
     and coalesce(i.publicar_em, '-infinity') <= now()
     and coalesce(m.publicar_em, '-infinity') <= now()
     and coalesce(d.publicar_em, '-infinity') <= now()
  from modulos m join disciplinas d on d.id = m.disciplina_id
  where m.id = i.modulo_id;
$$;

-- O aluno pode abrir o conteúdo deste item?
create function pode_acessar_item(p_item_id uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_item itens;
  v_acesso acessos;
begin
  if eh_equipe() then
    return true;
  end if;
  select * into v_item from itens where id = p_item_id;
  if not found or not item_publicado(v_item) then
    return false;
  end if;
  select * into v_acesso from acessos where usuario_id = auth.uid();
  if not found then
    return false;
  end if;
  return data_efetiva_publicacao(v_item) <= v_acesso.novidades_ate;
end $$;

-- Conteúdo do item, somente se liberado para o aluno.
create function conteudo_item(p_item_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not pode_acessar_item(p_item_id) then
    return null;
  end if;
  return (select config from itens where id = p_item_id);
end $$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table perfis enable row level security;
alter table disciplinas enable row level security;
alter table modulos enable row level security;
alter table itens enable row level security;
alter table compras enable row level security;
alter table acessos enable row level security;
alter table progresso_item enable row level security;
alter table certificados enable row level security;

-- Perfis: o próprio usuário lê e edita seus dados (exceto papel); equipe lê todos.
create policy perfis_ler on perfis for select
  using (id = auth.uid() or eh_equipe());
create policy perfis_editar on perfis for update
  using (id = auth.uid() or eh_admin());
revoke update on perfis from authenticated;
grant update (nome, universidade, periodo) on perfis to authenticated;

-- Conteúdo: equipe gerencia tudo; aluno vê a vitrine publicada.
create policy disciplinas_equipe on disciplinas for all
  using (eh_equipe()) with check (eh_equipe());
create policy disciplinas_alunos on disciplinas for select
  using (status in ('em_breve', 'publicada') and coalesce(publicar_em, '-infinity') <= now());

create policy modulos_equipe on modulos for all
  using (eh_equipe()) with check (eh_equipe());
create policy modulos_alunos on modulos for select
  using (
    status = 'publicado' and coalesce(publicar_em, '-infinity') <= now()
    and exists (select 1 from disciplinas d where d.id = disciplina_id and d.status = 'publicada')
  );

create policy itens_equipe on itens for all
  using (eh_equipe()) with check (eh_equipe());
create policy itens_alunos on itens for select
  using (item_publicado(itens));
-- Alunos enxergam a lista de itens (com cadeado), mas não a coluna config.
revoke select on itens from authenticated, anon;
grant select (id, modulo_id, tipo, titulo, ordem, obrigatorio, status, publicar_em,
              primeira_publicacao_em, criado_em, atualizado_em)
  on itens to authenticated;
grant insert, update, delete on itens to authenticated;
-- A equipe lê config através de conteudo_item() (retorna tudo para a equipe).

create policy compras_ler on compras for select
  using (usuario_id = auth.uid() or eh_equipe());

create policy acessos_ler on acessos for select
  using (usuario_id = auth.uid() or eh_equipe());
create policy acessos_admin on acessos for all
  using (eh_admin()) with check (eh_admin());

create policy progresso_proprio on progresso_item for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid() and pode_acessar_item(item_id));
create policy progresso_equipe on progresso_item for select
  using (eh_equipe());

create policy certificados_ler on certificados for select
  using (usuario_id = auth.uid() or eh_equipe());
