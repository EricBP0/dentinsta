-- =============================================================================
-- Afiliados: cada um tem um link (/r/codigo) e um cupom de desconto. O cliente
-- que compra por eles fica ligado ao afiliado para sempre, e cada pagamento
-- confirmado gera uma comissão (% configurável por afiliado).
--
-- Comissão: nasce no pagamento confirmado e fica em carência por 30 dias
-- (liberada_em). Estorno ou chargeback cancelam a comissão. Depois da carência,
-- o afiliado pede saque; o backoffice confere (automático + relatório impresso)
-- e paga por Pix pelo Asaas.
-- =============================================================================

create table afiliados (
  id uuid primary key default gen_random_uuid(),
  -- Conta de login da área do afiliado (/parceiro).
  usuario_id uuid unique references perfis (id) on delete set null,
  nome text not null check (length(trim(nome)) between 2 and 120),
  email text not null unique check (email = lower(email)),
  telefone text check (telefone is null or telefone ~ '^[0-9]{10,11}$'),
  -- CPF ou CNPJ (só dígitos): confere autoindicação e vai no Pix.
  documento text check (documento is null or documento ~ '^([0-9]{11}|[0-9]{14})$'),
  -- Link: odontolab.online/r/<codigo>
  codigo text not null unique check (codigo ~ '^[a-z0-9-]{3,30}$'),
  -- Cupom digitado no pagamento (maiúsculas).
  cupom text unique check (cupom is null or cupom ~ '^[A-Z0-9]{3,20}$'),
  comissao_pct numeric(5, 2) not null default 20 check (comissao_pct between 0 and 100),
  -- Desconto do cupom, só na primeira cobrança.
  desconto_pct numeric(5, 2) not null default 10 check (desconto_pct between 0 and 90),
  ativo boolean not null default true,
  chave_pix text check (chave_pix is null or length(chave_pix) <= 140),
  tipo_chave_pix text check (tipo_chave_pix is null or tipo_chave_pix in ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP')),
  chave_pix_alterada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table afiliado_cliques (
  id bigint generated always as identity primary key,
  afiliado_id uuid not null references afiliados (id) on delete cascade,
  criado_em timestamptz not null default now()
);
create index on afiliado_cliques (afiliado_id, criado_em desc);

-- Cliente ligado ao afiliado na primeira compra (vale para todas as seguintes).
alter table perfis
  add column afiliado_id uuid references afiliados (id) on delete set null,
  add column afiliado_em timestamptz;
create index on perfis (afiliado_id);

-- Afiliado e cupom usados ao abrir o pagamento.
alter table assinaturas
  add column afiliado_id uuid references afiliados (id) on delete set null,
  add column cupom text,
  -- Desconto da 1ª cobrança (valor_centavos continua sendo o preço cheio).
  add column desconto_centavos integer not null default 0 check (desconto_centavos >= 0),
  -- Mensal com cupom: quando a cobrança voltou ao preço cheio no Asaas.
  add column valor_restaurado_em timestamptz;

create table saques (
  id uuid primary key default gen_random_uuid(),
  afiliado_id uuid not null references afiliados (id) on delete restrict,
  valor_centavos integer not null check (valor_centavos > 0),
  -- solicitado → aprovado (transferindo) → pago | falhou ; ou recusado
  status text not null default 'solicitado'
    check (status in ('solicitado', 'transferindo', 'pago', 'falhou', 'recusado')),
  chave_pix text not null,
  tipo_chave_pix text not null,
  -- Resultado da conferência automática no momento da análise.
  conferencia jsonb,
  analisado_por uuid references perfis (id) on delete set null,
  analisado_em timestamptz,
  motivo text,
  transferencia_id text unique,
  pago_em timestamptz,
  criado_em timestamptz not null default now()
);
create index on saques (status, criado_em desc);
create index on saques (afiliado_id, criado_em desc);
-- Um saque em aberto por afiliado.
create unique index saques_um_aberto on saques (afiliado_id) where status in ('solicitado', 'transferindo');

create table comissoes (
  id uuid primary key default gen_random_uuid(),
  afiliado_id uuid not null references afiliados (id) on delete restrict,
  compra_id uuid not null unique references compras (id) on delete cascade,
  cliente_id uuid not null references perfis (id) on delete cascade,
  valor_base_centavos integer not null,
  comissao_pct numeric(5, 2) not null,
  valor_centavos integer not null check (valor_centavos >= 0),
  -- pendente (carência ou disponível, ver liberada_em) → em_saque → paga ; ou cancelada
  status text not null default 'pendente' check (status in ('pendente', 'em_saque', 'paga', 'cancelada')),
  liberada_em timestamptz not null,
  saque_id uuid references saques (id) on delete set null,
  motivo text,
  -- Estornada depois de já paga ao afiliado (descontar manualmente).
  estornada_apos_pagamento boolean not null default false,
  criado_em timestamptz not null default now()
);
create index on comissoes (afiliado_id, status, liberada_em);
create index on comissoes (saque_id);

-- -----------------------------------------------------------------------------
-- RLS: o afiliado lê o que é dele; o admin lê tudo; gravação só pelo servidor.
-- -----------------------------------------------------------------------------
create function meu_afiliado_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from afiliados where usuario_id = auth.uid() and ativo;
$$;

alter table afiliados enable row level security;
alter table afiliado_cliques enable row level security;
alter table comissoes enable row level security;
alter table saques enable row level security;
create policy afiliados_ler on afiliados for select
  using (usuario_id = (select auth.uid()) or (select eh_admin()));
create policy afiliado_cliques_ler on afiliado_cliques for select
  using (afiliado_id = (select meu_afiliado_id()) or (select eh_admin()));
create policy comissoes_ler on comissoes for select
  using (afiliado_id = (select meu_afiliado_id()) or (select eh_admin()));
create policy saques_ler on saques for select
  using (afiliado_id = (select meu_afiliado_id()) or (select eh_admin()));
revoke insert, update, delete on afiliados, afiliado_cliques, comissoes, saques from authenticated, anon;

-- -----------------------------------------------------------------------------
-- Pagamento confirmado: igual à 0014 + vínculo do cliente e comissão.
-- -----------------------------------------------------------------------------
create or replace function confirmar_pagamento_assinatura(
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
  v_compra uuid;
  v_afiliado afiliados;
begin
  select * into v_a from assinaturas where id = p_assinatura_id for update;
  if not found then
    return false;
  end if;
  if exists (select 1 from compras where gateway_pagamento_id = p_chave_pagamento) then
    return false;
  end if;
  v_primeiro := not exists (select 1 from compras where assinatura_id = v_a.id and status = 'pago');
  -- Redução pedida antes entra nesta cobrança (e é o plano que este pagamento paga).
  if not v_primeiro and v_a.plano_proximo is not null then
    v_a.plano := v_a.plano_proximo;
    v_a.modulos := coalesce(v_a.modulos_proximos, v_a.modulos);
  end if;

  insert into compras (usuario_id, assinatura_id, gateway_pagamento_id, tipo, modalidade, parcelas,
                       valor_total_centavos, status, pago_em, gateway_cliente_id, checkout_id, plano, ciclo)
  values (v_a.usuario_id, v_a.id, p_chave_pagamento,
          case when v_primeiro then 'compra'::tipo_compra else 'renovacao'::tipo_compra end,
          case when coalesce(p_parcelas, 1) > 1 then 'parcelado'::modalidade_pagamento else 'a_vista'::modalidade_pagamento end,
          greatest(coalesce(p_parcelas, 1), 1), p_valor_centavos, 'pago', now(),
          coalesce(p_gateway_cliente_id, v_a.gateway_cliente_id),
          case when v_primeiro then v_a.checkout_id end, v_a.plano, v_a.ciclo)
  returning id into v_compra;

  -- Renovação em dia (ou até 15 dias de atraso) continua do fim do período
  -- pago; depois disso, recomeça de hoje.
  v_base := case when v_a.periodo_ate is null or v_a.periodo_ate < now() - interval '15 days'
                 then now() else v_a.periodo_ate end;
  v_fim := v_base + case when v_a.ciclo = 'anual' then interval '12 months' else interval '1 month' end;

  update assinaturas
  set status = case when status = 'cancelada' then 'cancelada' else 'ativa' end,
      periodo_ate = v_fim,
      ativa_ate = v_fim + interval '3 days',
      plano = v_a.plano,
      modulos = v_a.modulos,
      plano_proximo = case when not v_primeiro then null else plano_proximo end,
      modulos_proximos = case when not v_primeiro then null else modulos_proximos end,
      gateway_assinatura_id = coalesce(gateway_assinatura_id, p_gateway_assinatura_id),
      gateway_cliente_id = coalesce(p_gateway_cliente_id, gateway_cliente_id),
      atualizado_em = now()
  where id = v_a.id;

  -- Afiliado: o cliente fica com o primeiro afiliado que trouxe ele.
  update perfis set afiliado_id = v_a.afiliado_id, afiliado_em = now()
  where id = v_a.usuario_id and afiliado_id is null and v_a.afiliado_id is not null;
  select af.* into v_afiliado
  from perfis p join afiliados af on af.id = p.afiliado_id
  where p.id = v_a.usuario_id;
  -- Sem comissão para a própria conta do afiliado (autoindicação).
  if found and v_afiliado.ativo and v_afiliado.usuario_id is distinct from v_a.usuario_id then
    insert into comissoes (afiliado_id, compra_id, cliente_id, valor_base_centavos, comissao_pct, valor_centavos, liberada_em)
    values (v_afiliado.id, v_compra, v_a.usuario_id, p_valor_centavos, v_afiliado.comissao_pct,
            round(p_valor_centavos * v_afiliado.comissao_pct / 100), now() + interval '30 days');
  end if;
  return true;
end $$;

-- Estorno ou chargeback: igual à 0014 + cancela a comissão (ou marca, se já paga).
create or replace function estornar_assinatura(p_assinatura_id uuid, p_chave_pagamento text, p_status status_compra)
returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare
  v_compras uuid[];
begin
  if p_status not in ('reembolsado', 'contestado') then
    raise exception 'status inválido para estorno';
  end if;
  with afetadas as (
    update compras set status = p_status, atualizado_em = now()
    where assinatura_id = p_assinatura_id and status = 'pago'
      and (p_chave_pagamento is null or gateway_pagamento_id = p_chave_pagamento)
    returning id
  )
  select array_agg(id) into v_compras from afetadas;

  if v_compras is not null then
    update comissoes
    set status = 'cancelada', motivo = 'Pagamento ' || p_status::text
    where compra_id = any (v_compras) and status in ('pendente', 'em_saque');
    update comissoes
    set estornada_apos_pagamento = true, motivo = 'Pagamento ' || p_status::text || ' depois de a comissão ser paga'
    where compra_id = any (v_compras) and status = 'paga';
  end if;

  update assinaturas
  set status = 'encerrada', ativa_ate = least(coalesce(ativa_ate, now()), now()), atualizado_em = now()
  where id = p_assinatura_id and status <> 'encerrada';
  return found;
end $$;

-- -----------------------------------------------------------------------------
-- Saques (chamadas só pelo servidor, com o cliente admin)
-- -----------------------------------------------------------------------------

-- O afiliado pede o saque de tudo o que já passou da carência.
create function solicitar_saque(p_afiliado_id uuid, p_minimo_centavos integer) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_af afiliados;
  v_total integer;
  v_id uuid;
begin
  select * into v_af from afiliados where id = p_afiliado_id and ativo for update;
  if not found then
    raise exception 'afiliado_inativo' using errcode = 'P0001';
  end if;
  if v_af.chave_pix is null or v_af.tipo_chave_pix is null then
    raise exception 'sem_chave_pix' using errcode = 'P0001';
  end if;
  if exists (select 1 from saques where afiliado_id = p_afiliado_id and status in ('solicitado', 'transferindo')) then
    raise exception 'saque_em_aberto' using errcode = 'P0001';
  end if;
  select coalesce(sum(valor_centavos), 0) into v_total
  from comissoes where afiliado_id = p_afiliado_id and status = 'pendente' and liberada_em <= now();
  if v_total < greatest(p_minimo_centavos, 1) then
    raise exception 'abaixo_do_minimo' using errcode = 'P0001';
  end if;

  insert into saques (afiliado_id, valor_centavos, chave_pix, tipo_chave_pix)
  values (p_afiliado_id, v_total, v_af.chave_pix, v_af.tipo_chave_pix)
  returning id into v_id;
  update comissoes set status = 'em_saque', saque_id = v_id
  where afiliado_id = p_afiliado_id and status = 'pendente' and liberada_em <= now();
  return v_id;
end $$;

-- Análise do backoffice. Aprovadas seguem para o Pix; canceladas (bloqueios da
-- conferência) saem de vez com o motivo; as demais voltam a ficar disponíveis.
-- Sem nenhuma aprovada, o saque é recusado. Devolve o valor a transferir.
create function analisar_saque(
  p_saque_id uuid,
  p_aprovadas uuid[],
  p_canceladas jsonb,  -- {"<comissao_id>": "motivo"}
  p_conferencia jsonb,
  p_admin uuid,
  p_motivo text default null
) returns integer
language plpgsql volatile security definer set search_path = public as $$
declare
  v_s saques;
  v_total integer;
begin
  select * into v_s from saques where id = p_saque_id for update;
  if not found or v_s.status <> 'solicitado' then
    raise exception 'saque_ja_analisado' using errcode = 'P0001';
  end if;

  update comissoes c
  set status = 'cancelada', saque_id = null, motivo = p_canceladas ->> c.id::text
  where c.saque_id = p_saque_id and c.status = 'em_saque' and p_canceladas ? c.id::text;
  update comissoes
  set status = 'pendente', saque_id = null
  where saque_id = p_saque_id and status = 'em_saque' and not (id = any (coalesce(p_aprovadas, '{}')));

  select coalesce(sum(valor_centavos), 0) into v_total
  from comissoes where saque_id = p_saque_id and status = 'em_saque';

  update saques
  set status = case when v_total > 0 then 'transferindo' else 'recusado' end,
      valor_centavos = case when v_total > 0 then v_total else valor_centavos end,
      conferencia = p_conferencia, analisado_por = p_admin, analisado_em = now(), motivo = p_motivo
  where id = p_saque_id;
  return v_total;
end $$;

-- Pix feito (webhook do Asaas ou "marcar como pago"): comissões pagas.
create function concluir_saque(p_saque_id uuid, p_transferencia_id text default null) returns boolean
language plpgsql volatile security definer set search_path = public as $$
begin
  update saques set status = 'pago', pago_em = now(), transferencia_id = coalesce(p_transferencia_id, transferencia_id)
  where id = p_saque_id and status = 'transferindo';
  if not found then
    return false;
  end if;
  update comissoes set status = 'paga' where saque_id = p_saque_id and status = 'em_saque';
  return true;
end $$;

-- Pix falhou: as comissões voltam a ficar disponíveis para um novo pedido.
create function falhar_saque(p_saque_id uuid, p_motivo text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
begin
  update saques set status = 'falhou', motivo = p_motivo
  where id = p_saque_id and status = 'transferindo';
  if not found then
    return false;
  end if;
  update comissoes set status = 'pendente', saque_id = null where saque_id = p_saque_id and status = 'em_saque';
  return true;
end $$;

revoke execute on function solicitar_saque(uuid, integer) from public, anon, authenticated;
revoke execute on function analisar_saque(uuid, uuid[], jsonb, jsonb, uuid, text) from public, anon, authenticated;
revoke execute on function concluir_saque(uuid, text) from public, anon, authenticated;
revoke execute on function falhar_saque(uuid, text) from public, anon, authenticated;
grant execute on function solicitar_saque(uuid, integer) to service_role;
grant execute on function analisar_saque(uuid, uuid[], jsonb, jsonb, uuid, text) to service_role;
grant execute on function concluir_saque(uuid, text) to service_role;
grant execute on function falhar_saque(uuid, text) to service_role;
