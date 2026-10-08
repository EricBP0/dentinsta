-- =============================================================================
-- Chat de dúvidas com IA e ClinicaON (gestão de clínica para o aluno).
--
-- Chat: só para quem está com a IA ativa (ou equipe), até 10 perguntas por dia
-- (horário de Brasília). Cada pergunta reserva uma linha em uso_ia (tipo "chat")
-- pela função reservar_pergunta_chat(), que conta e grava sob um lock por
-- usuário: dois envios ao mesmo tempo não passam do limite.
--
-- ClinicaON: pacientes, consultas, lançamentos financeiros e provas. Cada aluno
-- só enxerga e mexe no que é dele (RLS por usuario_id).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Chat
-- -----------------------------------------------------------------------------
create table chat_conversas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfis (id) on delete cascade,
  titulo text not null default 'Nova conversa',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on chat_conversas (usuario_id, atualizado_em desc);

create table chat_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references chat_conversas (id) on delete cascade,
  papel text not null check (papel in ('user', 'assistant')),
  conteudo text not null check (length(conteudo) between 1 and 20000),
  criado_em timestamptz not null default now()
);
create index on chat_mensagens (conversa_id, criado_em);

alter table chat_conversas enable row level security;
alter table chat_mensagens enable row level security;

-- O aluno lê e apaga as próprias conversas; quem grava é o servidor (chave secreta),
-- depois de conferir o acesso e a cota.
create policy chat_conversas_ler on chat_conversas for select using (usuario_id = auth.uid());
create policy chat_conversas_apagar on chat_conversas for delete using (usuario_id = auth.uid());
create policy chat_mensagens_ler on chat_mensagens for select
  using (exists (select 1 from chat_conversas c where c.id = conversa_id and c.usuario_id = auth.uid()));
revoke insert, update on chat_conversas from authenticated, anon;
revoke insert, update, delete on chat_mensagens from authenticated, anon;

-- Início do dia de hoje em Brasília (UTC-3), em UTC.
create function inicio_do_dia_brasilia() returns timestamptz
language sql stable as $$
  select (date_trunc('day', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo';
$$;

-- Reserva uma pergunta do dia para o usuário logado. Devolve o id da linha em
-- uso_ia (o servidor completa modelo e tokens depois) ou null se a cota acabou.
create function reservar_pergunta_chat(p_limite integer)
returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_usuario uuid := auth.uid();
  v_id uuid;
begin
  if v_usuario is null then
    raise exception 'não autenticado';
  end if;
  perform pg_advisory_xact_lock(hashtext('chat:' || v_usuario::text));
  if (select count(*) from uso_ia
      where usuario_id = v_usuario and tipo = 'chat' and criado_em >= inicio_do_dia_brasilia()) >= p_limite then
    return null;
  end if;
  insert into uso_ia (usuario_id, tipo, modelo) values (v_usuario, 'chat', '') returning id into v_id;
  return v_id;
end $$;
revoke execute on function reservar_pergunta_chat(integer) from public, anon;
grant execute on function reservar_pergunta_chat(integer) to authenticated;

-- -----------------------------------------------------------------------------
-- ClinicaON
-- -----------------------------------------------------------------------------
create table clinica_pacientes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references perfis (id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 200),
  telefone text not null default '',
  email text not null default '',
  nascimento date,
  observacoes text not null default '' check (length(observacoes) <= 4000),
  criado_em timestamptz not null default now()
);
create index on clinica_pacientes (usuario_id, nome);

create table clinica_consultas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references perfis (id) on delete cascade,
  paciente_id uuid references clinica_pacientes (id) on delete set null,
  tipo text not null check (tipo in ('avaliacao', 'retorno', 'cirurgia', 'reuniao', 'compromisso', 'especial')),
  inicio timestamptz not null,
  duracao_min integer not null default 60 check (duracao_min between 5 and 720),
  status text not null default 'agendada' check (status in ('agendada', 'finalizada', 'faltou', 'cancelada')),
  valor_centavos bigint not null default 0 check (valor_centavos >= 0),
  observacoes text not null default '' check (length(observacoes) <= 4000),
  criado_em timestamptz not null default now()
);
create index on clinica_consultas (usuario_id, inicio);

-- Faturamentos e custos lançados à mão.
create table clinica_lancamentos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references perfis (id) on delete cascade,
  tipo text not null check (tipo in ('faturamento', 'custo')),
  descricao text not null check (length(trim(descricao)) between 1 and 200),
  valor_centavos bigint not null check (valor_centavos > 0 and valor_centavos < 100000000000),
  data date not null,
  criado_em timestamptz not null default now()
);
create index on clinica_lancamentos (usuario_id, data);

-- Provas do aluno: de uma disciplina da plataforma ou de uma matéria pessoal.
create table clinica_provas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references perfis (id) on delete cascade,
  disciplina_id uuid references disciplinas (id) on delete set null,
  materia text not null check (length(trim(materia)) between 1 and 200),
  data date not null,
  horario time,
  observacoes text not null default '' check (length(observacoes) <= 2000),
  criado_em timestamptz not null default now()
);
create index on clinica_provas (usuario_id, data);

alter table clinica_pacientes enable row level security;
alter table clinica_consultas enable row level security;
alter table clinica_lancamentos enable row level security;
alter table clinica_provas enable row level security;

create policy proprios on clinica_pacientes for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy proprios on clinica_consultas for all
  using (usuario_id = auth.uid())
  with check (
    usuario_id = auth.uid()
    and (paciente_id is null or exists (select 1 from clinica_pacientes p where p.id = paciente_id and p.usuario_id = auth.uid()))
  );
create policy proprios on clinica_lancamentos for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy proprios on clinica_provas for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
