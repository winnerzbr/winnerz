-- WinnerZ — 0018: foto do perfil (avatar)
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez. Precisa da 0016.
--
-- 1) Um bucket só para avatares (público para leitura: a foto aparece no perfil e no topo do site).
--    Cada pessoa só envia, troca e apaga dentro da própria pasta: avatares/<id da pessoa>/...
-- 2) profiles.avatar guarda o caminho da foto. my_profile e o perfil público (v4) passam a devolver.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

drop policy if exists "avatares: enviar o seu" on storage.objects;
create policy "avatares: enviar o seu" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "avatares: trocar o seu" on storage.objects;
create policy "avatares: trocar o seu" on storage.objects for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "avatares: apagar o seu" on storage.objects;
create policy "avatares: apagar o seu" on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "avatares: ver o seu" on storage.objects;
create policy "avatares: ver o seu" on storage.objects for select to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid()::text));

alter table public.profiles add column if not exists avatar text;

create or replace function public.my_profile() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('handle', handle, 'bio', bio, 'visibility', visibility, 'shareKey', share_key, 'links', links, 'stage', stage, 'avatar', avatar)
  from profiles where id = auth.uid();
$$;

-- Grava (ou tira, com null) a foto. Só aceita caminho dentro da própria pasta.
create or replace function public.set_my_avatar(p_path text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if p_path is not null and (p_path not like auth.uid()::text || '/%' or length(p_path) > 200) then raise exception 'avatar_path'; end if;
  update profiles set avatar = p_path where id = auth.uid();
  return public.my_profile();
end; $$;

create or replace function public.public_profile_v4(p_handle text, p_key text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles%rowtype; out jsonb;
begin
  out := public.public_profile_v3(p_handle, p_key);
  if out is null then return null; end if;
  select * into p from profiles where handle is not null and lower(handle) = lower(p_handle);
  out := out || jsonb_build_object('stage', public.public_stage(p), 'avatar', p.avatar);
  if public.can_see_journey(p, p_key) then
    if out ? 'jornada' then
      out := jsonb_set(out, '{jornada,paused}', coalesce((select jsonb_agg(x order by x ->> 'at' desc) from (
        select jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover, 'progress', h.progress, 'ordinal', h.ordinal, 'at', h.started_at) x
        from histories h join journeys j on j.id = h.journey_id join games g on g.id = j.game_id
        where h.user_id = p.id and h.state = 'pausada' order by h.started_at desc limit 6) t), '[]'::jsonb));
    end if;
    out := out || jsonb_build_object('mural', coalesce((select jsonb_agg(x order by x ->> 'at' desc) from (
      select jsonb_build_object('title', e.title, 'imagePath', e.image_path, 'at', e.at, 'game', g.title, 'slug', g.slug) x
      from timeline_events e join journeys j on j.id = e.journey_id join games g on g.id = j.game_id
      where e.user_id = p.id and j.shared and e.kind = 'momento' and e.image_path like p.id::text || '/%'
      order by e.at desc limit 9) t), '[]'::jsonb));
  end if;
  return out;
end; $$;

revoke all on function public.set_my_avatar(text) from public, anon;
grant execute on function public.set_my_avatar(text) to authenticated;
grant execute on function public.public_profile_v4(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
