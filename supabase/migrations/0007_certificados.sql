-- =============================================================================
-- Emissão e validação de certificados (docs/PLANEJAMENTO.md, seção 3).
-- O certificado guarda uma "foto" do nome do aluno, da disciplina e da carga
-- horária no momento da emissão: mudanças posteriores não alteram o documento.
-- =============================================================================

alter table certificados
  add column nome_aluno text,
  add column disciplina_nome text;

-- Emite o certificado se o aluno concluiu 100% dos itens obrigatórios que ele
-- enxerga na disciplina (itens bloqueados pela janela de 12 meses não contam).
-- Idempotente: se já existe, devolve o mesmo.
create function emitir_certificado(p_disciplina_id uuid) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_usuario uuid := auth.uid();
  v_existente uuid;
  v_nome text;
  v_total integer;
  v_concluidos integer;
  v_id uuid;
begin
  if v_usuario is null then
    raise exception 'login necessário';
  end if;

  select id into v_existente from certificados
  where usuario_id = v_usuario and disciplina_id = p_disciplina_id;
  if found then
    return v_existente;
  end if;

  select trim(nome) into v_nome from perfis where id = v_usuario;
  if coalesce(v_nome, '') = '' then
    raise exception 'informe seu nome completo';
  end if;

  select count(*), count(*) filter (where p.concluido)
  into v_total, v_concluidos
  from itens i
  join modulos m on m.id = i.modulo_id
  left join progresso_item p on p.item_id = i.id and p.usuario_id = v_usuario
  where m.disciplina_id = p_disciplina_id
    and i.obrigatorio
    and item_publicado(i)
    and pode_acessar_item(i.id);

  if v_total = 0 or v_concluidos < v_total then
    raise exception 'disciplina não concluída';
  end if;

  insert into certificados (usuario_id, disciplina_id, carga_horaria_h, nome_aluno, disciplina_nome)
  select v_usuario, d.id, d.carga_horaria_h, v_nome, d.nome
  from disciplinas d where d.id = p_disciplina_id
  returning id into v_id;
  return v_id;
end $$;

-- Validação pública pelo código impresso no certificado (sem login).
create function validar_certificado(p_codigo text)
returns table (nome_aluno text, disciplina_nome text, carga_horaria_h integer, emitido_em timestamptz)
language sql stable security definer set search_path = public as $$
  select c.nome_aluno, c.disciplina_nome, c.carga_horaria_h, c.emitido_em
  from certificados c
  where c.codigo_validacao = upper(trim(p_codigo));
$$;

grant execute on function validar_certificado(text) to anon, authenticated;
revoke insert, update, delete on certificados from authenticated, anon;
