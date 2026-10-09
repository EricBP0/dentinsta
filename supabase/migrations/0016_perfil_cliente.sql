-- =============================================================================
-- Formulário de mapeamento ("Personalize sua OdontoLab"), respondido depois da
-- compra em duas etapas, e a amostra de 50 flashcards que é o prêmio da etapa 2.
--
-- As respostas ficam em perfis_cliente.respostas (chave = número da pergunta,
-- "p1".."p26"). Perfil, etiquetas e nota do anual são calculados no servidor
-- (src/lib/perfil-cliente.ts) a cada etapa salva. Só o servidor grava; o aluno
-- lê a própria linha e o admin lê todas.
-- =============================================================================

create table perfis_cliente (
  usuario_id uuid primary key references perfis (id) on delete cascade,
  respostas jsonb not null default '{}'::jsonb,
  perfil text,
  etiquetas text[] not null default '{}',
  nota_anual smallint not null default 0 check (nota_anual between 0 and 10),
  aceita_contato boolean not null default false,
  etapa1_em timestamptz,
  etapa2_em timestamptz,
  -- "Pular por agora" no primeiro acesso: o painel para de redirecionar.
  pulado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on perfis_cliente (perfil);
create index on perfis_cliente (atualizado_em desc);

alter table perfis_cliente enable row level security;
create policy perfis_cliente_ler on perfis_cliente for select
  using (usuario_id = (select auth.uid()) or (select eh_admin()));
revoke insert, update, delete on perfis_cliente from authenticated, anon;

-- -----------------------------------------------------------------------------
-- Amostra de flashcards: cards liberados para quem não tem o módulo Flashcards.
-- Vale enquanto a pessoa tiver alguma assinatura ativa.
-- -----------------------------------------------------------------------------
create table flashcards_amostra (
  usuario_id uuid not null references perfis (id) on delete cascade,
  flashcard_id uuid not null references flashcards (id) on delete cascade,
  liberado_em timestamptz not null default now(),
  primary key (usuario_id, flashcard_id)
);

alter table flashcards_amostra enable row level security;
create policy flashcards_amostra_ler on flashcards_amostra for select
  using (usuario_id = (select auth.uid()) or (select eh_admin()));
revoke insert, update, delete on flashcards_amostra from authenticated, anon;

-- Cards da amostra do usuário logado (só com assinatura ativa e card publicado).
create function flashcards_da_amostra() returns setof uuid
language sql stable security definer set search_path = public as $$
  select a.flashcard_id
  from flashcards_amostra a
  join flashcards f on f.id = a.flashcard_id
  join itens i on i.id = f.item_id
  where a.usuario_id = auth.uid()
    and f.status = 'publicado'
    and item_publicado(i)
    and exists (select 1 where meus_modulos() <> '{}');
$$;

drop policy flashcards_alunos on flashcards;
create policy flashcards_alunos on flashcards for select
  using (
    status = 'publicado'
    and (item_id in (select itens_liberados()) or id in (select flashcards_da_amostra()))
  );

-- Libera a amostra uma vez por pessoa: primeiro os cards das disciplinas que ela
-- marcou no formulário, depois os das demais, na ordem do catálogo.
-- Chamada só pelo servidor (service role) ao salvar a etapa 2.
create function liberar_amostra_flashcards(p_usuario uuid, p_disciplinas uuid[], p_quantidade integer default 50)
returns integer
language plpgsql volatile security definer set search_path = public as $$
declare
  v_total integer;
begin
  if exists (select 1 from flashcards_amostra where usuario_id = p_usuario) then
    return 0;
  end if;
  insert into flashcards_amostra (usuario_id, flashcard_id)
  select p_usuario, c.id
  from (
    select f.id
    from flashcards f
    join itens i on i.id = f.item_id
    join modulos mo on mo.id = i.modulo_id
    join disciplinas d on d.id = mo.disciplina_id
    where f.status = 'publicado' and i.tipo = 'flashcards' and item_publicado(i)
    order by (d.id = any (coalesce(p_disciplinas, '{}'))) desc, d.ordem, mo.ordem, i.ordem, f.ordem, f.criado_em
    limit greatest(p_quantidade, 0)
  ) c;
  get diagnostics v_total = row_count;
  return v_total;
end $$;
revoke execute on function liberar_amostra_flashcards(uuid, uuid[], integer) from public, anon, authenticated;
grant execute on function liberar_amostra_flashcards(uuid, uuid[], integer) to service_role;
