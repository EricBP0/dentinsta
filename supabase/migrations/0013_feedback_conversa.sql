-- =============================================================================
-- Feedback vira conversa: aluno e equipe trocam mensagens no mesmo feedback,
-- o que já serve de canal de suporte.
--
-- A mensagem inicial continua em feedbacks.mensagem; as seguintes ficam em
-- feedback_mensagens. Status:
--   aberto     = última mensagem é do aluno (aguardando a equipe)
--   respondido = última mensagem é da equipe (aguardando o aluno)
--   arquivado  = conversa encerrada pela equipe (o aluno não responde mais;
--                se a equipe escrever de novo, a conversa reabre)
-- resposta_vista = false quando há mensagem da equipe que o aluno não viu.
-- =============================================================================

create table feedback_mensagens (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references feedbacks (id) on delete cascade,
  autor_id uuid references perfis (id) on delete set null,
  da_equipe boolean not null,
  texto text not null check (length(trim(texto)) between 1 and 4000),
  criado_em timestamptz not null default now()
);
create index on feedback_mensagens (feedback_id, criado_em);

alter table feedbacks add column atualizado_em timestamptz not null default now();
update feedbacks set atualizado_em = coalesce(respondido_em, criado_em);
create index on feedbacks (usuario_id, atualizado_em desc);
create index on feedbacks (status, atualizado_em desc);

-- A resposta única de antes vira a primeira mensagem da equipe.
insert into feedback_mensagens (feedback_id, autor_id, da_equipe, texto, criado_em)
select id, respondido_por, true, resposta, coalesce(respondido_em, now())
from feedbacks where resposta is not null;
comment on column feedbacks.resposta is 'Obsoleto: as respostas ficam em feedback_mensagens (0013).';

alter table feedback_mensagens enable row level security;
create policy feedback_mensagens_ler on feedback_mensagens for select
  using (
    (select eh_equipe())
    or exists (select 1 from feedbacks f where f.id = feedback_id and f.usuario_id = (select auth.uid()))
  );
-- Gravação só pela função abaixo (confere dono, status e limite).
revoke insert, update, delete on feedback_mensagens from authenticated, anon;

-- Envia uma mensagem na conversa. Aluno: só nos próprios feedbacks, não
-- encerrados, até 30 mensagens por hora. Equipe: em qualquer feedback.
create function enviar_mensagem_feedback(p_feedback_id uuid, p_texto text) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_feedback feedbacks;
  v_equipe boolean := eh_equipe();
  v_texto text := trim(coalesce(p_texto, ''));
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'nao_autenticado' using errcode = 'P0001';
  end if;
  if length(v_texto) < 1 or length(v_texto) > 4000 then
    raise exception 'mensagem_invalida' using errcode = 'P0001';
  end if;

  select * into v_feedback from feedbacks where id = p_feedback_id for update;
  if not found or (not v_equipe and v_feedback.usuario_id <> auth.uid()) then
    raise exception 'feedback_nao_encontrado' using errcode = 'P0001';
  end if;

  if not v_equipe then
    if v_feedback.status = 'arquivado' then
      raise exception 'conversa_encerrada' using errcode = 'P0001';
    end if;
    if (select count(*) from feedback_mensagens m join feedbacks f on f.id = m.feedback_id
        where f.usuario_id = auth.uid() and not m.da_equipe
          and m.criado_em > now() - interval '1 hour') >= 30 then
      raise exception 'limite_mensagens' using errcode = 'P0001';
    end if;
  end if;

  insert into feedback_mensagens (feedback_id, autor_id, da_equipe, texto)
  values (p_feedback_id, auth.uid(), v_equipe, v_texto)
  returning id into v_id;

  if v_equipe then
    update feedbacks
    set status = 'respondido',
        respondido_por = auth.uid(), respondido_em = now(),
        resposta_vista = false, atualizado_em = now()
    where id = p_feedback_id;
  else
    update feedbacks set status = 'aberto', atualizado_em = now() where id = p_feedback_id;
  end if;
  return v_id;
end $$;
revoke execute on function enviar_mensagem_feedback(uuid, text) from public, anon;
grant execute on function enviar_mensagem_feedback(uuid, text) to authenticated;

-- O aluno marca como vistas as mensagens da equipe de uma conversa.
create function marcar_conversa_vista(p_feedback_id uuid) returns boolean
language sql volatile security definer set search_path = public as $$
  with vista as (
    update feedbacks set resposta_vista = true
    where id = p_feedback_id and usuario_id = auth.uid() and not resposta_vista
    returning 1
  )
  select exists (select 1 from vista);
$$;
revoke execute on function marcar_conversa_vista(uuid) from public, anon;
grant execute on function marcar_conversa_vista(uuid) to authenticated;
