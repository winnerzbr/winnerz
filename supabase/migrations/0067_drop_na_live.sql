-- =================================================================================================================
-- 0067 · Etapa 7, E7.2: drop na live
--
-- "Soltar drop" no Studio cria um código de live (album_codes, source 'drop') que vale por alguns minutos. O overlay
-- do OBS do canal (de quem é da administração) mostra o código com a contagem; o site mostra "Drop no ar" para quem
-- está com ele aberto, sem o código (ele só aparece na tela da live). Soltar um drop novo encerra o anterior.
-- Pode rodar mais de uma vez. Precisa da 0066.
-- =================================================================================================================

create index if not exists album_codes_drop_live on public.album_codes (ends_at) where source = 'drop' and active;

-- O drop no ar agora (sem o código), para o aviso do site.
create or replace function public.album_drop_now() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', c.id, 'title', coalesce(c.title, 'Drop na live'), 'endsAt', c.ends_at, 'kind', c.kind, 'packKind', c.pack_kind,
    'left', case when c.max_uses is null then null else greatest(0, c.max_uses - c.uses) end,
    'mine', exists (select 1 from album_code_uses u where u.code_id = c.id and u.user_id = auth.uid()))
  from album_codes c
  where c.source = 'drop' and c.active and c.starts_at <= now() and c.ends_at > now() and (c.max_uses is null or c.uses < c.max_uses)
  order by c.starts_at desc limit 1;
$$;

-- Studio: solta um drop. p: {title, minutes (1 a 60), maxUses?, kind, packKind, qty?, stickerId?, note}
create or replace function public.studio_drop_start(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare mins integer := greatest(1, least(60, coalesce(nullif(p ->> 'minutes', '')::integer, 5))); kind text := coalesce(p ->> 'kind', 'pacote');
        st uuid := nullif(p ->> 'stickerId', '')::uuid; note text := btrim(coalesce(p ->> 'note', ''));
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if kind = 'figurinha' and (st is null or not exists (select 1 from album_stickers where id = st and active)) then raise exception 'code_sticker'; end if;
  if char_length(note) < 3 then raise exception 'pack_reason'; end if;
  update album_codes set ends_at = now() where source = 'drop' and active and (ends_at is null or ends_at > now());
  insert into album_codes (code, source, title, kind, pack_kind, qty, sticker_id, max_uses, starts_at, ends_at, note, created_by)
  values (public.album_code_new(), 'drop', coalesce(nullif(left(btrim(coalesce(p ->> 'title', '')), 80), ''), 'Drop na live'), kind,
          case when p ->> 'packKind' = 'prisma' then 'prisma' else 'onix' end, greatest(1, least(5, coalesce(nullif(p ->> 'qty', '')::integer, 1))),
          case when kind = 'figurinha' then st end, nullif(p ->> 'maxUses', '')::integer, now(), now() + make_interval(mins => mins), left(note, 200), auth.uid());
  return public.studio_codes();
end; $$;

create or replace function public.studio_drop_stop() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update album_codes set ends_at = now() where source = 'drop' and active and ends_at > now();
  return public.studio_codes();
end; $$;

revoke all on function public.album_drop_now() from public, anon;
revoke all on function public.studio_drop_start(jsonb) from public, anon;
revoke all on function public.studio_drop_stop() from public, anon;
grant execute on function public.album_drop_now() to authenticated;
grant execute on function public.studio_drop_start(jsonb) to authenticated;
grant execute on function public.studio_drop_stop() to authenticated;
