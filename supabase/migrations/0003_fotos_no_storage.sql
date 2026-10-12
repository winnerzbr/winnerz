-- WinnerZ 0003: fotos das sessões no Storage do Supabase, fora do banco.
-- O banco guarda só o caminho do arquivo (image_path). Pode rodar mais de uma vez.

alter table public.timeline_events add column if not exists image_path text;

-- Pasta privada: cada pessoa só enxerga as próprias fotos (privacidade por padrão).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('momentos', 'momentos', false, 3145728, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Cada foto fica em momentos/<id da pessoa>/<id do momento>.jpg
drop policy if exists "momentos: ver as suas" on storage.objects;
create policy "momentos: ver as suas" on storage.objects for select to authenticated
  using (bucket_id = 'momentos' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "momentos: enviar as suas" on storage.objects;
create policy "momentos: enviar as suas" on storage.objects for insert to authenticated
  with check (bucket_id = 'momentos' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "momentos: trocar as suas" on storage.objects;
create policy "momentos: trocar as suas" on storage.objects for update to authenticated
  using (bucket_id = 'momentos' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'momentos' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "momentos: apagar as suas" on storage.objects;
create policy "momentos: apagar as suas" on storage.objects for delete to authenticated
  using (bucket_id = 'momentos' and (storage.foldername(name))[1] = (select auth.uid()::text));

notify pgrst, 'reload schema';
