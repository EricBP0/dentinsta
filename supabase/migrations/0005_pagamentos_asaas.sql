-- =============================================================================
-- Pagamentos pelo Asaas (Checkout hospedado + webhooks).
-- O acesso só é liberado/estendido pelas funções abaixo, chamadas pelo servidor
-- (webhook) com a chave secreta — o aluno nunca libera o próprio acesso.
-- =============================================================================

alter type status_compra add value if not exists 'cancelado';
alter type status_compra add value if not exists 'expirado';

create type tipo_compra as enum ('compra', 'renovacao');
create type modalidade_pagamento as enum ('a_vista', 'parcelado');

alter table compras rename column stripe_checkout_id to checkout_id;
alter table compras drop column stripe_payment_intent_id;
alter table compras
  add column tipo tipo_compra not null default 'compra',
  add column modalidade modalidade_pagamento not null default 'a_vista',
  add column gateway text not null default 'asaas',
  -- Cliente no Asaas (usado para localizar a compra em estornos e chargebacks).
  add column gateway_cliente_id text,
  add column pago_em timestamptz,
  add column atualizado_em timestamptz not null default now();
create index on compras (usuario_id, criado_em desc);
create index on compras (gateway_cliente_id);

-- Registro dos webhooks recebidos (auditoria e idempotência).
create table webhook_eventos (
  id text primary key,
  gateway text not null,
  evento text not null,
  payload jsonb not null,
  recebido_em timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Funções de acesso (só o servidor chama)
-- -----------------------------------------------------------------------------

-- Pagamento confirmado: marca a compra como paga e libera/estende 12 meses de
-- novidades e IA. Idempotente: uma compra já paga não estende duas vezes.
create function confirmar_compra(p_compra_id uuid, p_gateway_cliente_id text default null)
returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare
  v_compra compras;
begin
  select * into v_compra from compras where id = p_compra_id for update;
  if not found or v_compra.status = 'pago' then
    return false;
  end if;

  update compras
  set status = 'pago', pago_em = now(), atualizado_em = now(),
      gateway_cliente_id = coalesce(p_gateway_cliente_id, gateway_cliente_id)
  where id = p_compra_id;

  -- Primeira compra cria o acesso; renovação (ou nova compra) estende a janela
  -- a partir do fim atual ou de hoje, o que for mais tarde.
  insert into acessos (usuario_id, compra_em, novidades_ate, ia_ate, origem, compra_id)
  values (v_compra.usuario_id, now(), now() + interval '12 months', now() + interval '12 months',
          case when v_compra.tipo = 'renovacao' then 'renovacao'::origem_acesso else 'compra'::origem_acesso end,
          v_compra.id)
  on conflict (usuario_id) do update
  set novidades_ate = greatest(acessos.novidades_ate, now()) + interval '12 months',
      ia_ate = greatest(acessos.ia_ate, now()) + interval '12 months',
      origem = excluded.origem,
      compra_id = excluded.compra_id,
      atualizado_em = now();
  return true;
end $$;

-- Estorno ou chargeback: desfaz os 12 meses dessa compra. Se não sobrar nenhuma
-- compra paga, o acesso é removido.
create function estornar_compra(p_compra_id uuid, p_status status_compra) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare
  v_compra compras;
begin
  if p_status not in ('reembolsado', 'contestado') then
    raise exception 'status inválido para estorno';
  end if;
  select * into v_compra from compras where id = p_compra_id for update;
  if not found or v_compra.status <> 'pago' then
    return false;
  end if;

  update compras set status = p_status, atualizado_em = now() where id = p_compra_id;

  if not exists (select 1 from compras where usuario_id = v_compra.usuario_id and status = 'pago') then
    delete from acessos where usuario_id = v_compra.usuario_id and origem in ('compra', 'renovacao');
  else
    update acessos
    set novidades_ate = novidades_ate - interval '12 months',
        ia_ate = ia_ate - interval '12 months',
        atualizado_em = now()
    where usuario_id = v_compra.usuario_id;
  end if;
  return true;
end $$;

-- Liberação manual pelo admin (cortesia, parceria, suporte).
create function conceder_acesso_manual(p_usuario_id uuid, p_meses integer) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not eh_admin() then
    raise exception 'apenas administradores';
  end if;
  if p_meses not between 1 and 36 then
    raise exception 'meses deve ser entre 1 e 36';
  end if;
  insert into acessos (usuario_id, compra_em, novidades_ate, ia_ate, origem)
  values (p_usuario_id, now(), now() + make_interval(months => p_meses),
          now() + make_interval(months => p_meses), 'cortesia')
  on conflict (usuario_id) do update
  set novidades_ate = greatest(acessos.novidades_ate, now()) + make_interval(months => p_meses),
      ia_ate = greatest(acessos.ia_ate, now()) + make_interval(months => p_meses),
      atualizado_em = now();
end $$;

create function revogar_acesso(p_usuario_id uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not eh_admin() then
    raise exception 'apenas administradores';
  end if;
  delete from acessos where usuario_id = p_usuario_id;
end $$;

revoke execute on function confirmar_compra(uuid, text) from public, anon, authenticated;
revoke execute on function estornar_compra(uuid, status_compra) from public, anon, authenticated;
grant execute on function confirmar_compra(uuid, text) to service_role;
grant execute on function estornar_compra(uuid, status_compra) to service_role;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
-- Compras: o aluno lê as suas (já existe compras_ler). Criação e atualização só
-- pelo servidor. Vendas no backoffice: só admin (professor não vê faturamento).
drop policy compras_ler on compras;
create policy compras_ler on compras for select
  using (usuario_id = auth.uid() or eh_admin());
revoke insert, update, delete on compras from authenticated, anon;

alter table webhook_eventos enable row level security;
revoke all on webhook_eventos from authenticated, anon;
