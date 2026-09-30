-- =============================================================================
-- Banco de questões, simulados, respostas, contestações e uso de IA.
-- Regras: docs/PLANEJAMENTO.md, seção 6.
--
-- Segurança: o aluno nunca lê gabarito, explicação ou rubrica diretamente. Ele só
-- vê as questões dos próprios simulados (sem essas colunas) e o gabarito aparece
-- depois do envio, por resultado_simulado(). Notas são gravadas só por funções do
-- banco (objetivas) ou pelo servidor com a chave secreta (correção por IA).
-- =============================================================================

create type tipo_questao as enum ('objetiva', 'discursiva');
create type status_questao as enum ('rascunho', 'aprovada');
create type origem_questao as enum ('professor', 'ia');
create type status_simulado as enum ('em_andamento', 'finalizado');
create type status_correcao as enum ('pendente', 'corrigida', 'sem_cota', 'erro');
create type corretor as enum ('auto', 'ia', 'professor');
create type status_contestacao as enum ('aberta', 'aceita', 'recusada');

-- -----------------------------------------------------------------------------
-- Questões
-- -----------------------------------------------------------------------------
create table questoes (
  id uuid primary key default gen_random_uuid(),
  disciplina_id uuid not null references disciplinas (id) on delete cascade,
  tema text not null default '',
  tipo tipo_questao not null,
  enunciado text not null,
  -- Objetiva: [{"letra": "A", "texto": "..."}, ...]
  alternativas jsonb not null default '[]'::jsonb,
  -- Objetiva: a letra correta. Discursiva: a resposta esperada (gabarito comentado).
  gabarito text not null default '',
  explicacao text not null default '',
  -- Discursiva: [{"criterio": "Cita o hipoclorito", "pontos": 2}, ...]
  rubrica jsonb not null default '[]'::jsonb,
  dificuldade smallint not null default 2 check (dificuldade between 1 and 3),
  -- Referência de estilo (ex.: "USP", "UFMG"). Só referência — nunca copiar enunciados.
  estilo text not null default '',
  origem origem_questao not null default 'professor',
  status status_questao not null default 'rascunho',
  -- Primeira aprovação: questões novas também respeitam a janela de 12 meses.
  aprovada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (tipo = 'discursiva' or jsonb_array_length(alternativas) >= 2)
);
create index on questoes (disciplina_id, status, tipo);

create function marcar_aprovacao_questao() returns trigger
language plpgsql as $$
begin
  if new.aprovada_em is null and new.status = 'aprovada' then
    new.aprovada_em := now();
  end if;
  new.atualizado_em := now();
  return new;
end $$;

create trigger aprovacao before insert or update on questoes
  for each row execute function marcar_aprovacao_questao();

-- -----------------------------------------------------------------------------
-- Simulados e respostas
-- -----------------------------------------------------------------------------
create table simulados (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfis (id) on delete cascade,
  disciplina_id uuid not null references disciplinas (id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  status status_simulado not null default 'em_andamento',
  -- Média de 0 a 10; null enquanto houver discursiva sem correção.
  nota numeric(4, 2),
  criado_em timestamptz not null default now(),
  finalizado_em timestamptz
);
create index on simulados (usuario_id, criado_em desc);

create table simulado_questoes (
  simulado_id uuid not null references simulados (id) on delete cascade,
  questao_id uuid not null references questoes (id) on delete cascade,
  ordem smallint not null,
  primary key (simulado_id, questao_id)
);

create table respostas (
  id uuid primary key default gen_random_uuid(),
  simulado_id uuid not null references simulados (id) on delete cascade,
  questao_id uuid not null references questoes (id) on delete cascade,
  usuario_id uuid not null references perfis (id) on delete cascade,
  resposta text not null default '',
  correta boolean,
  nota numeric(4, 2) check (nota between 0 and 10),
  -- Correção da IA: {"criterios": [...], "comentario_geral": "...", "faltou": [...]}
  feedback jsonb,
  corrigido_por corretor,
  status_correcao status_correcao not null default 'pendente',
  criado_em timestamptz not null default now(),
  corrigido_em timestamptz,
  unique (simulado_id, questao_id)
);
create index on respostas (usuario_id, questao_id);
create index on respostas (status_correcao) where status_correcao = 'pendente';

create table contestacoes (
  id uuid primary key default gen_random_uuid(),
  resposta_id uuid not null unique references respostas (id) on delete cascade,
  usuario_id uuid not null references perfis (id) on delete cascade,
  motivo text not null check (length(motivo) between 5 and 2000),
  status status_contestacao not null default 'aberta',
  resposta_equipe text,
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz
);

create table uso_ia (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references perfis (id) on delete set null,
  tipo text not null,
  modelo text not null,
  tokens_entrada integer not null default 0,
  tokens_saida integer not null default 0,
  tokens_cache integer not null default 0,
  resposta_id uuid references respostas (id) on delete set null,
  criado_em timestamptz not null default now()
);
create index on uso_ia (usuario_id, criado_em);

-- -----------------------------------------------------------------------------
-- Funções
-- -----------------------------------------------------------------------------

-- Monta um simulado a partir do banco, sem IA: prioriza questões que o aluno
-- ainda não respondeu, depois as que ele errou, e sorteia o resto.
create function gerar_simulado(
  p_disciplina_id uuid,
  p_quantidade integer,
  p_tipo tipo_questao default null,
  p_dificuldade smallint default null,
  p_temas text[] default null
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_usuario uuid := auth.uid();
  v_acesso acessos;
  v_ia_ativa boolean;
  v_simulado uuid;
  v_inseridas integer;
begin
  if v_usuario is null then
    raise exception 'login necessário';
  end if;
  if p_quantidade not between 1 and 50 then
    raise exception 'quantidade deve ser entre 1 e 50';
  end if;
  select * into v_acesso from acessos where usuario_id = v_usuario;
  if not found and not eh_equipe() then
    raise exception 'sem acesso';
  end if;

  -- Disciplina publicada e dentro da janela de novidades do aluno.
  if not eh_equipe() and not exists (
    select 1 from disciplinas
    where id = p_disciplina_id and status = 'publicada'
      and primeira_publicacao_em <= v_acesso.novidades_ate
  ) then
    raise exception 'disciplina indisponível';
  end if;

  -- Depois da janela de 12 meses, só objetivas (discursivas dependem da IA).
  v_ia_ativa := eh_equipe() or v_acesso.ia_ate >= now();
  if not v_ia_ativa then
    if p_tipo = 'discursiva' then
      raise exception 'renove para usar a IA';
    end if;
    p_tipo := 'objetiva';
  end if;

  insert into simulados (usuario_id, disciplina_id, config)
  values (
    v_usuario, p_disciplina_id,
    jsonb_build_object('quantidade', p_quantidade, 'tipo', p_tipo,
                       'dificuldade', p_dificuldade, 'temas', p_temas)
  )
  returning id into v_simulado;

  insert into simulado_questoes (simulado_id, questao_id, ordem)
  select v_simulado, id, posicao
  from (
    select q.id, row_number() over (
      order by
        exists (select 1 from respostas r where r.usuario_id = v_usuario and r.questao_id = q.id),
        exists (select 1 from respostas r where r.usuario_id = v_usuario and r.questao_id = q.id
                and r.status_correcao = 'corrigida' and r.nota < 6) desc,
        random()
    ) as posicao
    from questoes q
    where q.disciplina_id = p_disciplina_id
      and q.status = 'aprovada'
      and (eh_equipe() or q.aprovada_em <= v_acesso.novidades_ate)
      and (p_tipo is null or q.tipo = p_tipo)
      and (p_dificuldade is null or q.dificuldade = p_dificuldade)
      and (p_temas is null or cardinality(p_temas) = 0 or q.tema = any (p_temas))
  ) selecionadas
  where posicao <= p_quantidade;

  get diagnostics v_inseridas = row_count;
  if v_inseridas = 0 then
    raise exception 'nenhuma questão encontrada com esses filtros';
  end if;
  return v_simulado;
end $$;

-- Recalcula a nota do simulado: média das respostas corrigidas, quando nenhuma
-- está pendente. Respostas sem cota ou com erro na IA ficam fora da média.
create function atualizar_nota_simulado(p_simulado_id uuid) returns void
language sql volatile security definer set search_path = public as $$
  update simulados s
  set nota = case
    when exists (select 1 from respostas r where r.simulado_id = s.id and r.status_correcao = 'pendente')
      then null
    else (select round(avg(r.nota), 2) from respostas r
          where r.simulado_id = s.id and r.status_correcao = 'corrigida')
  end
  where s.id = p_simulado_id;
$$;

-- Recebe as respostas ({"<questao_id>": "A" | "texto"}), corrige as objetivas e
-- deixa as discursivas pendentes para a IA.
create function enviar_simulado(p_simulado_id uuid, p_respostas jsonb) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_simulado simulados;
begin
  select * into v_simulado from simulados where id = p_simulado_id for update;
  if not found or v_simulado.usuario_id <> auth.uid() then
    raise exception 'simulado não encontrado';
  end if;
  if v_simulado.status <> 'em_andamento' then
    raise exception 'simulado já enviado';
  end if;

  insert into respostas (simulado_id, questao_id, usuario_id, resposta, correta, nota,
                         corrigido_por, status_correcao, corrigido_em)
  select
    p_simulado_id, q.id, auth.uid(), r.resposta,
    case when q.tipo = 'objetiva' then upper(r.resposta) = upper(q.gabarito) end,
    case
      when q.tipo = 'objetiva' then case when upper(r.resposta) = upper(q.gabarito) then 10 else 0 end
      when r.resposta = '' then 0
    end,
    case when q.tipo = 'objetiva' or r.resposta = '' then 'auto'::corretor end,
    case when q.tipo = 'objetiva' or r.resposta = '' then 'corrigida'::status_correcao
         else 'pendente'::status_correcao end,
    case when q.tipo = 'objetiva' or r.resposta = '' then now() end
  from simulado_questoes sq
  join questoes q on q.id = sq.questao_id
  cross join lateral (
    select left(trim(coalesce(p_respostas ->> q.id::text, '')), 3000) as resposta
  ) r
  where sq.simulado_id = p_simulado_id;

  update simulados set status = 'finalizado', finalizado_em = now() where id = p_simulado_id;
  perform atualizar_nota_simulado(p_simulado_id);
end $$;

-- Resultado com gabarito, só depois do envio.
create function resultado_simulado(p_simulado_id uuid)
returns table (
  questao_id uuid,
  ordem smallint,
  tipo tipo_questao,
  tema text,
  enunciado text,
  alternativas jsonb,
  gabarito text,
  explicacao text,
  resposta_id uuid,
  resposta text,
  correta boolean,
  nota numeric,
  feedback jsonb,
  corrigido_por corretor,
  status_correcao status_correcao,
  contestacao status_contestacao,
  resposta_equipe text
)
language sql stable security definer set search_path = public as $$
  select q.id, sq.ordem, q.tipo, q.tema, q.enunciado, q.alternativas, q.gabarito,
         q.explicacao, r.id, r.resposta, r.correta, r.nota, r.feedback, r.corrigido_por,
         r.status_correcao, c.status, c.resposta_equipe
  from simulados s
  join simulado_questoes sq on sq.simulado_id = s.id
  join questoes q on q.id = sq.questao_id
  left join respostas r on r.simulado_id = s.id and r.questao_id = q.id
  left join contestacoes c on c.resposta_id = r.id
  where s.id = p_simulado_id
    and s.status = 'finalizado'
    and (s.usuario_id = auth.uid() or eh_equipe())
  order by sq.ordem;
$$;

-- Aluno contesta uma correção feita pela IA.
create function contestar_correcao(p_resposta_id uuid, p_motivo text) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not exists (select 1 from respostas where id = p_resposta_id
                 and usuario_id = auth.uid() and corrigido_por = 'ia') then
    raise exception 'resposta não encontrada';
  end if;
  insert into contestacoes (resposta_id, usuario_id, motivo)
  values (p_resposta_id, auth.uid(), trim(p_motivo));
end $$;

-- Questão completa (com gabarito e rubrica) para o backoffice.
create function questao_completa(p_questao_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(q) from questoes q where q.id = p_questao_id and eh_equipe();
$$;

-- Temas disponíveis de uma disciplina (para os filtros do simulado).
create function temas_da_disciplina(p_disciplina_id uuid) returns table (tema text, quantidade bigint)
language sql stable security definer set search_path = public as $$
  select tema, count(*) from questoes
  where disciplina_id = p_disciplina_id and status = 'aprovada' and tema <> ''
  group by tema order by tema;
$$;

revoke execute on function atualizar_nota_simulado(uuid) from public, anon, authenticated;
grant execute on function atualizar_nota_simulado(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- RLS e permissões
-- -----------------------------------------------------------------------------
alter table questoes enable row level security;
alter table simulados enable row level security;
alter table simulado_questoes enable row level security;
alter table respostas enable row level security;
alter table contestacoes enable row level security;
alter table uso_ia enable row level security;

-- Questões: equipe gerencia; aluno lê só as dos próprios simulados, sem gabarito.
create policy questoes_equipe on questoes for all
  using (eh_equipe()) with check (eh_equipe());
create policy questoes_alunos on questoes for select
  using (exists (
    select 1 from simulado_questoes sq join simulados s on s.id = sq.simulado_id
    where sq.questao_id = questoes.id and s.usuario_id = auth.uid()
  ));
revoke select on questoes from authenticated, anon;
grant select (id, disciplina_id, tema, tipo, enunciado, alternativas, dificuldade, estilo,
              origem, status, criado_em, atualizado_em)
  on questoes to authenticated;

-- Simulados: aluno lê os seus; criação e envio só pelas funções.
create policy simulados_ler on simulados for select
  using (usuario_id = auth.uid() or eh_equipe());
revoke insert, update, delete on simulados from authenticated, anon;

create policy simulado_questoes_ler on simulado_questoes for select
  using (exists (select 1 from simulados s where s.id = simulado_id
                 and (s.usuario_id = auth.uid() or eh_equipe())));
revoke insert, update, delete on simulado_questoes from authenticated, anon;

-- Respostas: leitura direta só depois do envio (via resultado_simulado) e pela equipe.
create policy respostas_equipe on respostas for select using (eh_equipe());
create policy respostas_equipe_editar on respostas for update
  using (eh_equipe()) with check (eh_equipe());
revoke insert, delete on respostas from authenticated, anon;
revoke update on respostas from anon;

-- Contestações: aluno abre para respostas corrigidas pela IA; equipe responde.
create policy contestacoes_ler on contestacoes for select
  using (usuario_id = auth.uid() or eh_equipe());
revoke insert, delete on contestacoes from authenticated, anon;
create policy contestacoes_responder on contestacoes for update
  using (eh_equipe()) with check (eh_equipe());
revoke update on contestacoes from authenticated;
grant update (status, resposta_equipe, resolvido_em) on contestacoes to authenticated;

-- Uso de IA: aluno vê o próprio consumo (cota); gravação só pelo servidor.
create policy uso_ia_ler on uso_ia for select
  using (usuario_id = auth.uid() or eh_equipe());
revoke insert, update, delete on uso_ia from authenticated, anon;
