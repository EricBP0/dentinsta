-- =============================================================================
-- Feedback: o aluno manda sugestões, problemas e elogios; a equipe lê e responde
-- pelo backoffice. O aluno vê a resposta na própria área (com aviso no menu).
-- =============================================================================

create table feedbacks (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references perfis (id) on delete cascade,
  categoria text not null default 'sugestao'
    check (categoria in ('sugestao', 'problema', 'conteudo', 'elogio', 'outro')),
  mensagem text not null check (length(trim(mensagem)) between 10 and 4000),
  status text not null default 'aberto' check (status in ('aberto', 'respondido', 'arquivado')),
  resposta text check (resposta is null or length(trim(resposta)) between 1 and 4000),
  respondido_por uuid references perfis (id) on delete set null,
  respondido_em timestamptz,
  -- false quando a equipe responde; o aluno marca como visto ao abrir a página.
  resposta_vista boolean not null default true,
  criado_em timestamptz not null default now()
);
create index on feedbacks (usuario_id, criado_em desc);
create index on feedbacks (status, criado_em desc);

-- Até 5 feedbacks por hora por aluno (evita envio repetido por engano ou spam).
create function limitar_feedbacks() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from feedbacks
      where usuario_id = new.usuario_id and criado_em > now() - interval '1 hour') >= 5 then
    raise exception 'limite_feedbacks' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger limitar_feedbacks before insert on feedbacks
  for each row execute function limitar_feedbacks();

alter table feedbacks enable row level security;

-- Aluno: lê e cria os próprios (só categoria e mensagem; o resto é padrão).
create policy feedbacks_ler on feedbacks for select
  using (usuario_id = (select auth.uid()) or (select eh_equipe()));
create policy feedbacks_criar on feedbacks for insert
  with check (usuario_id = (select auth.uid()));
-- Equipe: responde e arquiva.
create policy feedbacks_responder on feedbacks for update
  using ((select eh_equipe())) with check ((select eh_equipe()));

revoke insert, update, delete on feedbacks from authenticated, anon;
grant insert (categoria, mensagem) on feedbacks to authenticated;
grant update (status, resposta, respondido_por, respondido_em, resposta_vista) on feedbacks to authenticated;

-- O aluno marca as respostas como vistas (não pode mexer em mais nada da linha).
create function marcar_respostas_vistas() returns integer
language sql volatile security definer set search_path = public as $$
  with vistos as (
    update feedbacks set resposta_vista = true
    where usuario_id = auth.uid() and not resposta_vista
    returning 1
  )
  select count(*)::integer from vistos;
$$;
revoke execute on function marcar_respostas_vistas() from public, anon;
grant execute on function marcar_respostas_vistas() to authenticated;
