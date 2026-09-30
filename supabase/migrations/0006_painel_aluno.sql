-- =============================================================================
-- Painel do aluno: tempo de estudo por dia e desempenho por tema.
-- =============================================================================

-- Tempo de estudo agregado por dia (horário de Brasília). O navegador envia
-- pequenos incrementos enquanto o aluno está ativo numa página de estudo.
create table tempo_estudo (
  usuario_id uuid not null references perfis (id) on delete cascade,
  dia date not null,
  segundos integer not null default 0 check (segundos >= 0),
  primary key (usuario_id, dia)
);

create function registrar_tempo(p_segundos integer) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return;
  end if;
  insert into tempo_estudo (usuario_id, dia, segundos)
  -- No máximo 2 minutos por envio (o navegador envia a cada minuto).
  values (auth.uid(), (now() at time zone 'America/Sao_Paulo')::date, least(greatest(p_segundos, 0), 120))
  on conflict (usuario_id, dia) do update
  -- Teto de 16h por dia, para uma aba esquecida aberta não distorcer o painel.
  set segundos = least(tempo_estudo.segundos + excluded.segundos, 16 * 3600);
end $$;

-- Aproveitamento do aluno por tema (só respostas já corrigidas, sem gabarito).
create function desempenho_por_tema(p_dias integer default 90)
returns table (disciplina text, tema text, respondidas bigint, media numeric)
language sql stable security definer set search_path = public as $$
  select d.nome, q.tema, count(*), round(avg(r.nota), 1)
  from respostas r
  join questoes q on q.id = r.questao_id
  join disciplinas d on d.id = q.disciplina_id
  where r.usuario_id = auth.uid()
    and r.status_correcao = 'corrigida'
    and q.tema <> ''
    and r.criado_em >= now() - make_interval(days => least(greatest(p_dias, 1), 365))
  group by d.nome, q.tema;
$$;

alter table tempo_estudo enable row level security;
create policy tempo_proprio on tempo_estudo for select using (usuario_id = auth.uid() or eh_equipe());
revoke insert, update, delete on tempo_estudo from authenticated, anon;
