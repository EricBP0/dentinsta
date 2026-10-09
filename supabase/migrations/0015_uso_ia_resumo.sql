-- =============================================================================
-- Resumo do uso de IA por modelo, para comparar provedores no backoffice
-- (Backoffice → IA). Só admin.
-- =============================================================================

create index if not exists uso_ia_criado_em_idx on uso_ia (criado_em);

create function resumo_uso_ia(p_dias integer default 30)
returns table (
  modelo text,
  tipo text,
  chamadas bigint,
  tokens_entrada bigint,
  tokens_saida bigint,
  tokens_cache bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not eh_admin() then
    raise exception 'apenas administradores';
  end if;
  return query
    select u.modelo, u.tipo, count(*), sum(u.tokens_entrada)::bigint, sum(u.tokens_saida)::bigint, sum(u.tokens_cache)::bigint
    from uso_ia u
    -- Reserva de pergunta do chat que ainda não recebeu resposta fica de fora.
    where u.criado_em >= now() - make_interval(days => least(greatest(p_dias, 1), 365)) and u.modelo <> ''
    group by u.modelo, u.tipo
    order by count(*) desc;
end $$;

revoke execute on function resumo_uso_ia(integer) from public, anon;
grant execute on function resumo_uso_ia(integer) to authenticated;
