-- =============================================================================
-- Resumos: PDFs e figuras dos resumos de estudo.
--
-- Bucket privado: só a equipe envia e lê direto. O aluno recebe links
-- assinados e temporários gerados no servidor, e só depois de
-- conteudo_item() confirmar que o item está liberado para ele.
-- 50 MB por arquivo (limite do plano gratuito do Supabase).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumos', 'resumos', false, 52428800,
  array['application/pdf', 'image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;

create policy resumos_equipe_ler on storage.objects for select
  using (bucket_id = 'resumos' and public.eh_equipe());
create policy resumos_equipe_enviar on storage.objects for insert
  with check (bucket_id = 'resumos' and public.eh_equipe());
create policy resumos_equipe_atualizar on storage.objects for update
  using (bucket_id = 'resumos' and public.eh_equipe());
create policy resumos_equipe_excluir on storage.objects for delete
  using (bucket_id = 'resumos' and public.eh_equipe());
