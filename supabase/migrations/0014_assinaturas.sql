-- =============================================================================
-- Assinaturas: sai a compra única com "12 meses de novidades", entram planos
-- mensais/anuais por módulo.
--
-- Módulos: disciplinas (vídeos, resumos, mapas, provas e certificados),
-- simulados (com correção por IA), flashcards, chat (Chat IA) e consultorio.
-- Planos: essencial (disciplinas + avulsos escolhidos), completo (tudo) e
-- duplo (tudo, para o titular e um convidado).
--
-- Quem tem acesso: o titular (e o convidado, no duplo) enquanto
-- ativa_ate >= now(). ativa_ate = fim do período pago + 3 dias de tolerância.
-- Só o servidor (webhook do Asaas, com a chave secreta) e o admin mudam isso.
-- =============================================================================

create table assinaturas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfis (id) on delete cascade,
  plano text not null check (plano in ('essencial', 'completo', 'duplo')),
  modulos text[] not null
    check (modulos <@ array['disciplinas', 'simulados', 'flashcards', 'chat', 'consultorio']::text[]
           and 'disciplinas' = any (modulos)),
  ciclo text not null check (ciclo in ('mensal', 'anual')),
  valor_centavos integer not null check (valor_centavos >= 0),
  -- pendente: checkout aberto; ativa: renova sozinha; cancelada: não renova,
  -- vale até ativa_ate; encerrada: expirou, foi estornada ou abandonada.
  status text not null default 'pendente' check (status in ('pendente', 'ativa', 'cancelada', 'encerrada')),
  origem text not null default 'asaas' check (origem in ('asaas', 'manual')),
  periodo_ate timestamptz,
  ativa_ate timestamptz,
  -- Redução de plano: entra no lugar do atual na próxima cobrança.
  plano_proximo text check (plano_proximo in ('essencial', 'completo', 'duplo')),
  modulos_proximos text[],
  -- Asaas
  checkout_id text unique,
  gateway_assinatura_id text unique,
  gateway_cliente_id text,
  -- Duplo: o segundo usuário (pode ainda não ter conta; liga pelo e-mail).
  convidado_email text,
  convidado_id uuid references perfis (id) on delete set null,
  convidado_trocado_em timestamptz,
  cancelada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on assinaturas (usuario_id, ativa_ate desc);
create index on assinaturas (convidado_id) where convidado_id is not null;
create index on assinaturas (lower(convidado_email)) where convidado_email is not null;
create index on assinaturas (status, ativa_ate);

-- Cada pagamento continua em compras (histórico e vendas no backoffice).
alter table compras
  add column assinatura_id uuid references assinaturas (id) on delete set null,
  add column gateway_pagamento_id text unique,
  add column plano text,
  add column ciclo text;
create index on compras (assinatura_id);

alter table assinaturas enable row level security;
create policy assinaturas_ler on assinaturas for select
  using (usuario_id = (select auth.uid()) or convidado_id = (select auth.uid()) or (select eh_admin()));
revoke insert, update, delete on assinaturas from authenticated, anon;

-- -----------------------------------------------------------------------------
-- Quem pode usar o quê
-- -----------------------------------------------------------------------------

-- Módulos do usuário logado (a equipe usa tudo para testar).
create function meus_modulos() returns text[]
language sql stable security definer set search_path = public as $$
  select case
    when eh_equipe() then array['disciplinas', 'simulados', 'flashcards', 'chat', 'consultorio']
    else coalesce((
      select array_agg(distinct m)
      from assinaturas a, unnest(a.modulos) m
      where (a.usuario_id = auth.uid() or (a.plano = 'duplo' and a.convidado_id = auth.uid()))
        and a.status in ('ativa', 'cancelada')
        and a.ativa_ate >= now()
    ), '{}')
  end;
$$;

create function tem_modulo(p_modulo text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_modulo = any (meus_modulos());
$$;

-- Módulo que libera cada tipo de item.
create function modulo_do_item(p_tipo tipo_item) returns text
language sql immutable as $$
  select case when p_tipo = 'flashcards' then 'flashcards' else 'disciplinas' end;
$$;

-- O aluno pode abrir o conteúdo deste item? (publicado + plano com o módulo)
create or replace function pode_acessar_item(p_item_id uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_item itens;
begin
  if eh_equipe() then
    return true;
  end if;
  select * into v_item from itens where id = p_item_id;
  if not found or not item_publicado(v_item) then
    return false;
  end if;
  return modulo_do_item(v_item.tipo) = any (meus_modulos());
end $$;

-- Versão em conjunto de pode_acessar_item() para o RLS dos flashcards.
create or replace function itens_liberados() returns setof uuid
language sql stable security definer set search_path = public as $$
  with m as (select meus_modulos() as modulos)
  select i.id
  from itens i
  join modulos mo on mo.id = i.modulo_id
  join disciplinas d on d.id = mo.disciplina_id
  cross join m
  where i.status = 'publicado' and mo.status = 'publicado' and d.status = 'publicada'
    and coalesce(i.publicar_em, '-infinity') <= now()
    and coalesce(mo.publicar_em, '-infinity') <= now()
    and coalesce(d.publicar_em, '-infinity') <= now()
    and modulo_do_item(i.tipo) = any (m.modulos);
$$;

-- Simulados: precisa do módulo (a correção por IA vem junto).
create or replace function gerar_simulado(
  p_disciplina_id uuid,
  p_quantidade integer,
  p_tipo tipo_questao default null,
  p_dificuldade smallint default null,
  p_temas text[] default null
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_usuario uuid := auth.uid();
  v_simulado uuid;
  v_inseridas integer;
begin
  if v_usuario is null then
    raise exception 'login necessário';
  end if;
  if p_quantidade not between 1 and 50 then
    raise exception 'quantidade deve ser entre 1 e 50';
  end if;
  if not tem_modulo('simulados') then
    raise exception 'sem acesso';
  end if;
  if not eh_equipe() and not exists (
    select 1 from disciplinas where id = p_disciplina_id and status = 'publicada'
  ) then
    raise exception 'disciplina indisponível';
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

-- -----------------------------------------------------------------------------
-- Pagamentos (só o servidor chama, com a chave secreta)
-- -----------------------------------------------------------------------------

-- Pagamento confirmado: registra em compras e estende o período. Idempotente
-- pela chave do pagamento (id do pagamento no Asaas, ou do checkout no anual).
create function confirmar_pagamento_assinatura(
  p_assinatura_id uuid,
  p_chave_pagamento text,
  p_valor_centavos integer,
  p_parcelas integer default 1,
  p_gateway_assinatura_id text default null,
  p_gateway_cliente_id text default null
) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare
  v_a assinaturas;
  v_primeiro boolean;
  v_base timestamptz;
  v_fim timestamptz;
begin
  select * into v_a from assinaturas where id = p_assinatura_id for update;
  if not found then
    return false;
  end if;
  if exists (select 1 from compras where gateway_pagamento_id = p_chave_pagamento) then
    return false;
  end if;
  v_primeiro := not exists (select 1 from compras where assinatura_id = v_a.id and status = 'pago');

  insert into compras (usuario_id, assinatura_id, gateway_pagamento_id, tipo, modalidade, parcelas,
                       valor_total_centavos, status, pago_em, gateway_cliente_id, checkout_id, plano, ciclo)
  values (v_a.usuario_id, v_a.id, p_chave_pagamento,
          case when v_primeiro then 'compra'::tipo_compra else 'renovacao'::tipo_compra end,
          case when coalesce(p_parcelas, 1) > 1 then 'parcelado'::modalidade_pagamento else 'a_vista'::modalidade_pagamento end,
          greatest(coalesce(p_parcelas, 1), 1), p_valor_centavos, 'pago', now(),
          coalesce(p_gateway_cliente_id, v_a.gateway_cliente_id),
          case when v_primeiro then v_a.checkout_id end, v_a.plano, v_a.ciclo);

  -- Renovação em dia (ou até 15 dias de atraso) continua do fim do período
  -- pago; depois disso, recomeça de hoje.
  v_base := case when v_a.periodo_ate is null or v_a.periodo_ate < now() - interval '15 days'
                 then now() else v_a.periodo_ate end;
  v_fim := v_base + case when v_a.ciclo = 'anual' then interval '12 months' else interval '1 month' end;

  update assinaturas
  set status = case when status = 'cancelada' then 'cancelada' else 'ativa' end,
      periodo_ate = v_fim,
      ativa_ate = v_fim + interval '3 days',
      -- Redução pedida antes: vale a partir desta cobrança.
      plano = case when not v_primeiro and plano_proximo is not null then plano_proximo else plano end,
      modulos = case when not v_primeiro and modulos_proximos is not null then modulos_proximos else modulos end,
      plano_proximo = case when not v_primeiro then null else plano_proximo end,
      modulos_proximos = case when not v_primeiro then null else modulos_proximos end,
      gateway_assinatura_id = coalesce(gateway_assinatura_id, p_gateway_assinatura_id),
      gateway_cliente_id = coalesce(p_gateway_cliente_id, gateway_cliente_id),
      atualizado_em = now()
  where id = v_a.id;
  return true;
end $$;

-- Estorno ou chargeback: corta o acesso na hora e encerra a assinatura.
create function estornar_assinatura(p_assinatura_id uuid, p_chave_pagamento text, p_status status_compra)
returns boolean
language plpgsql volatile security definer set search_path = public as $$
begin
  if p_status not in ('reembolsado', 'contestado') then
    raise exception 'status inválido para estorno';
  end if;
  update compras set status = p_status, atualizado_em = now()
  where assinatura_id = p_assinatura_id and status = 'pago'
    and (p_chave_pagamento is null or gateway_pagamento_id = p_chave_pagamento);
  update assinaturas
  set status = 'encerrada', ativa_ate = least(coalesce(ativa_ate, now()), now()), atualizado_em = now()
  where id = p_assinatura_id and status <> 'encerrada';
  return found;
end $$;

revoke execute on function confirmar_pagamento_assinatura(uuid, text, integer, integer, text, text) from public, anon, authenticated;
revoke execute on function estornar_assinatura(uuid, text, status_compra) from public, anon, authenticated;
grant execute on function confirmar_pagamento_assinatura(uuid, text, integer, integer, text, text) to service_role;
grant execute on function estornar_assinatura(uuid, text, status_compra) to service_role;

-- -----------------------------------------------------------------------------
-- Admin: liberação manual (cortesia, parceria, suporte) e revogação
-- -----------------------------------------------------------------------------
drop function if exists conceder_acesso_manual(uuid, integer);
drop function if exists revogar_acesso(uuid);

create function conceder_assinatura_manual(p_usuario_id uuid, p_plano text, p_meses integer) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_id uuid;
  v_fim timestamptz;
begin
  if not eh_admin() then
    raise exception 'apenas administradores';
  end if;
  if p_meses not between 1 and 36 then
    raise exception 'meses deve ser entre 1 e 36';
  end if;
  if p_plano not in ('essencial', 'completo', 'duplo') then
    raise exception 'plano inválido';
  end if;
  -- Estende a cortesia que já existe do mesmo plano, se houver.
  select id, greatest(periodo_ate, now()) + make_interval(months => p_meses) into v_id, v_fim
  from assinaturas
  where usuario_id = p_usuario_id and origem = 'manual' and plano = p_plano and status <> 'encerrada'
  order by ativa_ate desc limit 1;
  if v_id is not null then
    update assinaturas set periodo_ate = v_fim, ativa_ate = v_fim, status = 'cancelada', atualizado_em = now()
    where id = v_id;
    return v_id;
  end if;
  v_fim := now() + make_interval(months => p_meses);
  insert into assinaturas (usuario_id, plano, modulos, ciclo, valor_centavos, status, origem, periodo_ate, ativa_ate)
  values (p_usuario_id, p_plano,
          case when p_plano = 'essencial' then array['disciplinas']
               else array['disciplinas', 'simulados', 'flashcards', 'chat', 'consultorio'] end,
          'mensal', 0, 'cancelada', 'manual', v_fim, v_fim)
  returning id into v_id;
  return v_id;
end $$;

-- Tira o acesso do usuário na hora (como titular). Não mexe no Asaas: cancele
-- a cobrança lá também se for assinatura paga.
create function revogar_acesso(p_usuario_id uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not eh_admin() then
    raise exception 'apenas administradores';
  end if;
  update assinaturas set status = 'encerrada', ativa_ate = now(), atualizado_em = now()
  where usuario_id = p_usuario_id and status <> 'encerrada';
end $$;

-- -----------------------------------------------------------------------------
-- Duplo: convidado ligado pelo e-mail (agora ou quando ele criar a conta)
-- -----------------------------------------------------------------------------
create function ligar_convite_ao_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update assinaturas set convidado_id = new.id, atualizado_em = now()
  where convidado_id is null and lower(convidado_email) = lower(new.email) and usuario_id <> new.id;
  return new;
end $$;

create trigger ligar_convite after insert on perfis
  for each row execute function ligar_convite_ao_perfil();

-- O titular do Duplo define (ou tira, com e-mail vazio) o convidado. Enquanto o
-- convidado não entrou (e-mail errado, por exemplo), trocar é livre; depois que
-- ele já usa a conta, trocar ou tirar só uma vez a cada 30 dias.
create function definir_convidado(p_email text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_a assinaturas;
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
begin
  select * into v_a from assinaturas
  where usuario_id = auth.uid() and plano = 'duplo' and status in ('ativa', 'cancelada') and ativa_ate >= now()
  order by ativa_ate desc limit 1 for update;
  if not found then
    raise exception 'sem_plano_duplo' using errcode = 'P0001';
  end if;
  if v_email is not null and (v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200) then
    raise exception 'email_invalido' using errcode = 'P0001';
  end if;
  if v_email = (select lower(email) from perfis where id = auth.uid()) then
    raise exception 'convidado_e_titular' using errcode = 'P0001';
  end if;
  if v_email is not distinct from lower(v_a.convidado_email) then
    return;
  end if;
  if v_a.convidado_id is not null and v_a.convidado_trocado_em > now() - interval '30 days' then
    raise exception 'troca_recente' using errcode = 'P0001';
  end if;
  update assinaturas
  set convidado_email = v_email,
      convidado_id = (select id from perfis where lower(email) = v_email limit 1),
      convidado_trocado_em = now(),
      atualizado_em = now()
  where id = v_a.id;
end $$;
revoke execute on function definir_convidado(text) from public, anon;
grant execute on function definir_convidado(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Modelo antigo: quem tinha acesso vira Completo até a mesma data.
-- -----------------------------------------------------------------------------
insert into assinaturas (usuario_id, plano, modulos, ciclo, valor_centavos, status, origem, periodo_ate, ativa_ate, criado_em)
select a.usuario_id, 'completo', array['disciplinas', 'simulados', 'flashcards', 'chat', 'consultorio'],
       'anual', coalesce(c.valor_total_centavos, 0), 'cancelada',
       case when a.origem in ('compra', 'renovacao') then 'asaas' else 'manual' end,
       greatest(a.novidades_ate, a.ia_ate), greatest(a.novidades_ate, a.ia_ate), a.compra_em
from acessos a
left join compras c on c.id = a.compra_id;

drop function if exists confirmar_compra(uuid, text);
drop function if exists estornar_compra(uuid, status_compra);
drop table acessos;
drop type if exists origem_acesso;
