-- =============================================================================
-- Consultório: novos tipos de atendimento.
-- As tabelas continuam com o prefixo clinica_ (nome interno, o aluno não vê).
-- =============================================================================

alter table clinica_consultas drop constraint if exists clinica_consultas_tipo_check;

update clinica_consultas set tipo = case tipo
  when 'avaliacao' then 'consulta'
  when 'cirurgia' then 'procedimento'
  when 'especial' then 'procedimento'
  when 'reuniao' then 'pessoal'
  when 'compromisso' then 'pessoal'
  else tipo
end;

alter table clinica_consultas
  add constraint clinica_consultas_tipo_check
  check (tipo in ('consulta', 'retorno', 'procedimento', 'urgencia', 'clinica_escola', 'pessoal'));
