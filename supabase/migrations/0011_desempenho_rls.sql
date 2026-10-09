-- =============================================================================
-- Desempenho do RLS.
--
-- As políticas chamavam funções (auth.uid(), eh_equipe(), item_publicado(),
-- pode_acessar_item()) para CADA linha lida. Com milhares de flashcards e
-- itens, uma tela do aluno levava segundos só no banco (flashcards_para_estudar
-- passava de 6 s num banco de teste com 12 mil cards).
--
-- Duas mudanças, sem alterar quem enxerga o quê:
-- 1. `(select f())` em vez de `f()`: o Postgres calcula o valor uma vez por
--    consulta (InitPlan) em vez de uma vez por linha.
-- 2. As regras de publicação e de acesso viram listas de ids calculadas uma
--    vez (modulos_publicados, itens_liberados) em vez de funções por linha.
-- =============================================================================

-- Módulos que o aluno enxerga: publicados, dentro de disciplina publicada.
-- Mesma regra de item_publicado() para módulo e disciplina.
create function modulos_publicados() returns setof uuid
language sql stable security definer set search_path = public as $$
  select m.id
  from modulos m join disciplinas d on d.id = m.disciplina_id
  where m.status = 'publicado' and d.status = 'publicada'
    and coalesce(m.publicar_em, '-infinity') <= now()
    and coalesce(d.publicar_em, '-infinity') <= now();
$$;

-- Itens que o aluno logado pode abrir: a versão em conjunto de
-- pode_acessar_item() (sem o caso da equipe, coberto pelas políticas *_equipe).
create function itens_liberados() returns setof uuid
language sql stable security definer set search_path = public as $$
  select i.id
  from itens i
  join modulos m on m.id = i.modulo_id
  join disciplinas d on d.id = m.disciplina_id
  join acessos a on a.usuario_id = auth.uid()
  where i.status = 'publicado' and m.status = 'publicado' and d.status = 'publicada'
    and coalesce(i.publicar_em, '-infinity') <= now()
    and coalesce(m.publicar_em, '-infinity') <= now()
    and coalesce(d.publicar_em, '-infinity') <= now()
    and greatest(i.primeira_publicacao_em, m.primeira_publicacao_em, d.primeira_publicacao_em) <= a.novidades_ate;
$$;

-- Usado em joins da política de questões e na correção.
create index if not exists simulado_questoes_questao_id_idx on simulado_questoes (questao_id);

-- -----------------------------------------------------------------------------
-- Conteúdo
-- -----------------------------------------------------------------------------
drop policy disciplinas_equipe on disciplinas;
create policy disciplinas_equipe on disciplinas for all
  using ((select eh_equipe())) with check ((select eh_equipe()));

drop policy modulos_equipe on modulos;
create policy modulos_equipe on modulos for all
  using ((select eh_equipe())) with check ((select eh_equipe()));
drop policy modulos_alunos on modulos;
create policy modulos_alunos on modulos for select
  using (id in (select modulos_publicados()));

drop policy itens_equipe on itens;
create policy itens_equipe on itens for all
  using ((select eh_equipe())) with check ((select eh_equipe()));
drop policy itens_alunos on itens;
create policy itens_alunos on itens for select
  using (
    status = 'publicado' and coalesce(publicar_em, '-infinity') <= now()
    and modulo_id in (select modulos_publicados())
  );

drop policy flashcards_equipe on flashcards;
create policy flashcards_equipe on flashcards for all
  using ((select eh_equipe())) with check ((select eh_equipe()));
drop policy flashcards_alunos on flashcards;
create policy flashcards_alunos on flashcards for select
  using (status = 'publicado' and item_id in (select itens_liberados()));

-- -----------------------------------------------------------------------------
-- Dados do usuário
-- -----------------------------------------------------------------------------
drop policy perfis_ler on perfis;
create policy perfis_ler on perfis for select
  using (id = (select auth.uid()) or (select eh_equipe()));
drop policy perfis_editar on perfis;
create policy perfis_editar on perfis for update
  using (id = (select auth.uid()) or (select eh_admin()));

drop policy compras_ler on compras;
create policy compras_ler on compras for select
  using (usuario_id = (select auth.uid()) or (select eh_admin()));

drop policy acessos_ler on acessos;
create policy acessos_ler on acessos for select
  using (usuario_id = (select auth.uid()) or (select eh_equipe()));
drop policy acessos_admin on acessos;
create policy acessos_admin on acessos for all
  using ((select eh_admin())) with check ((select eh_admin()));

drop policy progresso_proprio on progresso_item;
create policy progresso_proprio on progresso_item for all
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()) and pode_acessar_item(item_id));
drop policy progresso_equipe on progresso_item;
create policy progresso_equipe on progresso_item for select
  using ((select eh_equipe()));

drop policy certificados_ler on certificados;
create policy certificados_ler on certificados for select
  using (usuario_id = (select auth.uid()) or (select eh_equipe()));

drop policy revisoes_proprias on flashcard_revisoes;
create policy revisoes_proprias on flashcard_revisoes for all
  using (usuario_id = (select auth.uid()))
  with check (
    usuario_id = (select auth.uid())
    and exists (select 1 from flashcards f where f.id = flashcard_id)
  );
drop policy revisoes_equipe on flashcard_revisoes;
create policy revisoes_equipe on flashcard_revisoes for select using ((select eh_equipe()));

drop policy tempo_proprio on tempo_estudo;
create policy tempo_proprio on tempo_estudo for select
  using (usuario_id = (select auth.uid()) or (select eh_equipe()));

-- -----------------------------------------------------------------------------
-- Questões e simulados
-- -----------------------------------------------------------------------------
drop policy questoes_equipe on questoes;
create policy questoes_equipe on questoes for all
  using ((select eh_equipe())) with check ((select eh_equipe()));
drop policy questoes_alunos on questoes;
create policy questoes_alunos on questoes for select
  using (id in (
    select sq.questao_id from simulado_questoes sq join simulados s on s.id = sq.simulado_id
    where s.usuario_id = (select auth.uid())
  ));

drop policy simulados_ler on simulados;
create policy simulados_ler on simulados for select
  using (usuario_id = (select auth.uid()) or (select eh_equipe()));

drop policy simulado_questoes_ler on simulado_questoes;
create policy simulado_questoes_ler on simulado_questoes for select
  using (exists (select 1 from simulados s where s.id = simulado_id
                 and (s.usuario_id = (select auth.uid()) or (select eh_equipe()))));

drop policy respostas_equipe on respostas;
create policy respostas_equipe on respostas for select using ((select eh_equipe()));
drop policy respostas_equipe_editar on respostas;
create policy respostas_equipe_editar on respostas for update
  using ((select eh_equipe())) with check ((select eh_equipe()));

drop policy contestacoes_ler on contestacoes;
create policy contestacoes_ler on contestacoes for select
  using (usuario_id = (select auth.uid()) or (select eh_equipe()));
drop policy contestacoes_responder on contestacoes;
create policy contestacoes_responder on contestacoes for update
  using ((select eh_equipe())) with check ((select eh_equipe()));

drop policy uso_ia_ler on uso_ia;
create policy uso_ia_ler on uso_ia for select
  using (usuario_id = (select auth.uid()) or (select eh_equipe()));

drop policy geracoes_equipe on geracoes_questoes;
create policy geracoes_equipe on geracoes_questoes for all
  using ((select eh_equipe())) with check ((select eh_equipe()));

-- -----------------------------------------------------------------------------
-- Chat e Consultório
-- -----------------------------------------------------------------------------
drop policy chat_conversas_ler on chat_conversas;
create policy chat_conversas_ler on chat_conversas for select using (usuario_id = (select auth.uid()));
drop policy chat_conversas_apagar on chat_conversas;
create policy chat_conversas_apagar on chat_conversas for delete using (usuario_id = (select auth.uid()));
drop policy chat_mensagens_ler on chat_mensagens;
create policy chat_mensagens_ler on chat_mensagens for select
  using (exists (select 1 from chat_conversas c
                 where c.id = conversa_id and c.usuario_id = (select auth.uid())));

drop policy proprios on clinica_pacientes;
create policy proprios on clinica_pacientes for all
  using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
drop policy proprios on clinica_consultas;
create policy proprios on clinica_consultas for all
  using (usuario_id = (select auth.uid()))
  with check (
    usuario_id = (select auth.uid())
    and (paciente_id is null or exists (
      select 1 from clinica_pacientes p where p.id = paciente_id and p.usuario_id = (select auth.uid())
    ))
  );
drop policy proprios on clinica_lancamentos;
create policy proprios on clinica_lancamentos for all
  using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
drop policy proprios on clinica_provas;
create policy proprios on clinica_provas for all
  using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
