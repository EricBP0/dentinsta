-- =============================================================================
-- Geração de questões por IA a partir de material enviado pelo professor
-- (PDF, Word, texto, imagens). Roda em lote (Batch API, 50% mais barato) e as
-- questões entram no banco como RASCUNHO para revisão.
-- =============================================================================

create type status_geracao as enum ('processando', 'importando', 'concluida', 'erro');
create type tipo_material as enum ('conteudo', 'prova');

create table geracoes_questoes (
  id uuid primary key default gen_random_uuid(),
  disciplina_id uuid not null references disciplinas (id) on delete cascade,
  criado_por uuid references perfis (id) on delete set null,
  -- [{"caminho": "geracoes/<id>/apostila.pdf", "nome": "apostila.pdf", "tipo": "application/pdf", "tamanho": 123}]
  arquivos jsonb not null default '[]'::jsonb,
  texto text not null default '',
  -- conteudo: livro, apostila, aula. prova: prova antiga, usada só como referência de estilo.
  tipo_material tipo_material not null default 'conteudo',
  -- {"objetivas": 10, "discursivas": 2, "dificuldade": 2, "tema": "...", "instrucoes": "..."}
  config jsonb not null default '{}'::jsonb,
  status status_geracao not null default 'processando',
  batch_id text,
  modelo text,
  erro text,
  -- Comentário da IA sobre o material (ex.: "material insuficiente para 20 questões").
  observacoes text,
  questoes_geradas integer not null default 0,
  questoes_descartadas integer not null default 0,
  criado_em timestamptz not null default now(),
  concluido_em timestamptz
);
create index on geracoes_questoes (criado_em desc);

alter table questoes
  add column geracao_id uuid references geracoes_questoes (id) on delete set null,
  -- De onde a questão saiu no material (ex.: "Apostila, p. 12 — Hipoclorito").
  add column fonte text not null default '';
grant select (geracao_id, fonte) on questoes to authenticated;

alter table geracoes_questoes enable row level security;
create policy geracoes_equipe on geracoes_questoes for all
  using (eh_equipe()) with check (eh_equipe());

-- -----------------------------------------------------------------------------
-- Storage: bucket privado para os materiais (só a equipe envia e lê).
-- 50 MB por arquivo (limite do plano gratuito do Supabase).
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'materiais', 'materiais', false, 52428800,
  array[
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do nothing;

create policy materiais_equipe_ler on storage.objects for select
  using (bucket_id = 'materiais' and public.eh_equipe());
create policy materiais_equipe_enviar on storage.objects for insert
  with check (bucket_id = 'materiais' and public.eh_equipe());
create policy materiais_equipe_excluir on storage.objects for delete
  using (bucket_id = 'materiais' and public.eh_equipe());
