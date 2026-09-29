-- =============================================================================
-- Flashcards com repetição espaçada.
-- Cada deck é um item do tipo "flashcards" dentro de um módulo; o acesso segue a
-- mesma regra do item (pode_acessar_item). O deck conta como concluído (para o
-- certificado) quando o aluno revisou todos os cards publicados pelo menos 1 vez.
-- =============================================================================

create type status_flashcard as enum ('rascunho', 'publicado');

create table flashcards (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references itens (id) on delete cascade,
  frente text not null check (length(trim(frente)) between 1 and 2000),
  verso text not null check (length(trim(verso)) between 1 and 4000),
  imagem_url text,
  ordem integer not null default 0,
  origem origem_questao not null default 'professor',
  -- Cards manuais já entram publicados; os gerados por IA entram como rascunho.
  status status_flashcard not null default 'publicado',
  geracao_id uuid references geracoes_questoes (id) on delete set null,
  fonte text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on flashcards (item_id, status, ordem);

create function tocar_atualizado_em() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

create trigger atualizado_em before update on flashcards
  for each row execute function tocar_atualizado_em();

-- Estado da repetição espaçada (SM-2) de cada card para cada aluno.
create table flashcard_revisoes (
  usuario_id uuid not null references perfis (id) on delete cascade,
  flashcard_id uuid not null references flashcards (id) on delete cascade,
  facilidade numeric(4, 2) not null default 2.5,
  intervalo_dias integer not null default 0,
  repeticoes integer not null default 0,
  lapsos integer not null default 0,
  proxima_revisao timestamptz not null,
  ultima_revisao timestamptz not null default now(),
  primeira_revisao timestamptz not null default now(),
  primary key (usuario_id, flashcard_id)
);
create index on flashcard_revisoes (usuario_id, proxima_revisao);

-- A mesma tabela de gerações por IA passa a gerar flashcards para um deck.
alter table geracoes_questoes
  add column alvo text not null default 'questoes' check (alvo in ('questoes', 'flashcards')),
  add column item_id uuid references itens (id) on delete cascade,
  add check (alvo = 'questoes' or item_id is not null);

-- -----------------------------------------------------------------------------
-- Funções (security invoker: o RLS decide quais cards o aluno enxerga)
-- -----------------------------------------------------------------------------

-- Cards para estudar agora: primeiro os vencidos, depois os novos (até p_limite_novos).
create function flashcards_para_estudar(p_item_id uuid default null, p_limite_novos integer default 20)
returns table (
  id uuid,
  item_id uuid,
  frente text,
  verso text,
  imagem_url text,
  novo boolean,
  proxima_revisao timestamptz
)
language sql stable set search_path = public as $$
  (
    select f.id, f.item_id, f.frente, f.verso, f.imagem_url, false, r.proxima_revisao
    from flashcards f
    join flashcard_revisoes r on r.flashcard_id = f.id and r.usuario_id = auth.uid()
    where f.status = 'publicado'
      and (p_item_id is null or f.item_id = p_item_id)
      and r.proxima_revisao <= now()
    order by r.proxima_revisao
    limit 200
  )
  union all
  (
    select f.id, f.item_id, f.frente, f.verso, f.imagem_url, true, null::timestamptz
    from flashcards f
    join itens i on i.id = f.item_id
    where f.status = 'publicado'
      and (p_item_id is null or f.item_id = p_item_id)
      and not exists (select 1 from flashcard_revisoes r
                      where r.flashcard_id = f.id and r.usuario_id = auth.uid())
    order by i.ordem, f.ordem, f.criado_em
    limit greatest(p_limite_novos, 0)
  );
$$;

-- Resumo por deck: total de cards, quantos o aluno já viu e quantos vencem agora.
create function resumo_flashcards(p_item_id uuid default null)
returns table (item_id uuid, total bigint, vistos bigint, vencidos bigint)
language sql stable set search_path = public as $$
  select f.item_id,
         count(*),
         count(r.flashcard_id),
         count(r.flashcard_id) filter (where r.proxima_revisao <= now())
  from flashcards f
  left join flashcard_revisoes r on r.flashcard_id = f.id and r.usuario_id = auth.uid()
  where f.status = 'publicado'
    and (p_item_id is null or f.item_id = p_item_id)
  group by f.item_id;
$$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table flashcards enable row level security;
alter table flashcard_revisoes enable row level security;

create policy flashcards_equipe on flashcards for all
  using (eh_equipe()) with check (eh_equipe());
create policy flashcards_alunos on flashcards for select
  using (status = 'publicado' and pode_acessar_item(item_id));

create policy revisoes_proprias on flashcard_revisoes for all
  using (usuario_id = auth.uid())
  with check (
    usuario_id = auth.uid()
    and exists (select 1 from flashcards f where f.id = flashcard_id)
  );
create policy revisoes_equipe on flashcard_revisoes for select using (eh_equipe());
