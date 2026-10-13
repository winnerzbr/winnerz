-- WinnerZ — 0013: a Jornada em público (vitrine do canal)
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez. Precisa da 0011 e da 0012.
--
-- 1) Cada Jornada pode ser mostrada no perfil, uma a uma ("Mostrar no meu perfil"). Só aparece para quem
--    já pode ver o pilar Jornada (todo mundo, ou quem tem o link).
-- 2) Numa Jornada mostrada, a linha do tempo aparece com o início, as sessões (só data), os momentos
--    (com título, legenda e foto) e os marcos. Recados, pontos para voltar, cartas e com quem jogou ficam de fora.
-- 3) "Jogando agora": se você quiser, o perfil mostra a sessão aberta (o jogo e desde quando).
-- 4) Links do canal no perfil (YouTube, Twitch, Instagram...).

alter table public.journeys add column if not exists shared boolean not null default false;
alter table public.profiles add column if not exists links jsonb not null default '[]'::jsonb;

-- Gravar perfil passa a guardar também a escolha de "Jogando agora" (aoVivo: sim | nao).
create or replace function public.set_my_profile(p_handle text, p_bio text, p_visibility jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb := '{}'::jsonb; k text; h text := nullif(trim(p_handle), '');
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if h is null then raise exception 'handle_required'; end if;
  if h !~ '^[A-Za-z0-9_]{3,24}$' then raise exception 'handle_format'; end if;
  if lower(h) in ('admin', 'winnerz', 'jornada', 'colecao', 'jogos', 'eventos', 'comunidade', 'preferencias', 'entrar', 'privacidade', 'sessao', 'overlay', 'api')
     and not exists (select 1 from profiles where id = auth.uid() and is_admin) then
    raise exception 'handle_reserved';
  end if;
  foreach k in array array['jornada', 'colecao', 'notas'] loop
    v := v || jsonb_build_object(k, case when p_visibility ->> k in ('link', 'publico') then p_visibility ->> k else 'privado' end);
  end loop;
  v := v || jsonb_build_object('aoVivo', case when p_visibility ->> 'aoVivo' = 'sim' then 'sim' else 'nao' end);
  begin
    update profiles set handle = h, display_name = h, bio = nullif(left(trim(coalesce(p_bio, '')), 160), ''), visibility = v where id = auth.uid();
  exception when unique_violation then raise exception 'handle_taken';
  end;
  return public.my_profile() || jsonb_build_object('links', (select links from profiles where id = auth.uid()));
end; $$;

-- O seu perfil, agora com os links.
create or replace function public.my_profile() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('handle', handle, 'bio', bio, 'visibility', visibility, 'shareKey', share_key, 'links', links)
  from profiles where id = auth.uid();
$$;

-- Links do perfil: até 6, só endereços https, até 200 caracteres cada.
create or replace function public.set_my_links(p_links jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare clean jsonb := '[]'::jsonb; item jsonb; u text;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  for item in select * from jsonb_array_elements(coalesce(p_links, '[]'::jsonb)) limit 6 loop
    u := trim(coalesce(item ->> 'url', ''));
    if u ~ '^https://[^\s]{3,200}$' then
      clean := clean || jsonb_build_array(jsonb_build_object('url', u, 'label', left(trim(coalesce(item ->> 'label', '')), 30)));
    end if;
  end loop;
  update profiles set links = clean where id = auth.uid();
  return public.my_profile();
end; $$;

-- Quem pode ver o pilar Jornada deste perfil?
create or replace function public.can_see_journey(p profiles, p_key text) returns boolean
language sql immutable as $$
  select p.visibility ->> 'jornada' = 'publico' or (p.visibility ->> 'jornada' = 'link' and coalesce(p_key = p.share_key, false));
$$;

-- Perfil público, versão 2: o mesmo da 0011, mais links, Jornadas em destaque e "Jogando agora".
create or replace function public.public_profile_v2(p_handle text, p_key text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles%rowtype; out jsonb; s record;
begin
  out := public.public_profile(p_handle, p_key);
  if out is null then return null; end if;
  select * into p from profiles where handle is not null and lower(handle) = lower(p_handle);
  out := out || jsonb_build_object('links', p.links);
  if public.can_see_journey(p, p_key) then
    out := out || jsonb_build_object('showcase', coalesce((select jsonb_agg(x order by x ->> 'lastAt' desc nulls last) from (
      select jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover, 'backdrop', g.backdrop,
        'stories', (select count(*) from histories h where h.journey_id = j.id),
        'moments', (select count(*) from timeline_events e where e.journey_id = j.id and e.kind = 'momento'),
        'finished', exists (select 1 from histories h where h.journey_id = j.id and h.state = 'concluida'),
        'lastAt', (select max(at) from timeline_events e where e.journey_id = j.id)) x
      from journeys j join games g on g.id = j.game_id where j.user_id = p.id and j.shared) t), '[]'::jsonb));
    if p.visibility ->> 'aoVivo' = 'sim' then
      select g.title, g.slug, g.cover, se.started_at into s
      from sessions se join journeys j on j.id = se.journey_id join games g on g.id = j.game_id
      where se.user_id = p.id and se.ended_at is null and se.started_at > now() - interval '18 hours'
      order by se.started_at desc limit 1;
      if found then
        out := out || jsonb_build_object('live', jsonb_build_object('title', s.title, 'slug', s.slug, 'cover', s.cover, 'since', s.started_at));
      end if;
    end if;
  end if;
  return out;
end; $$;

-- Uma Jornada mostrada no perfil, com a linha do tempo pública. As fotos voltam como caminho no Storage;
-- quem assina o endereço temporário é o servidor do site (/api/perfil), nunca o navegador.
create or replace function public.public_journey(p_handle text, p_key text, p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles%rowtype; j journeys%rowtype; g games%rowtype;
begin
  select * into p from profiles where handle is not null and lower(handle) = lower(p_handle);
  if not found or not public.can_see_journey(p, p_key) then return null; end if;
  select gg.* into g from games gg where gg.slug = p_slug;
  if not found then return null; end if;
  select * into j from journeys where user_id = p.id and game_id = g.id and shared;
  if not found then return null; end if;
  return jsonb_build_object(
    'name', p.display_name, 'handle', p.handle,
    'game', jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover, 'backdrop', g.backdrop, 'year', g.year, 'developer', g.developer),
    'histories', coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'ordinal', h.ordinal, 'title', h.title, 'state', h.state,
        'startedAt', h.started_at, 'startedPrecision', h.started_precision, 'completedAt', h.completed_at, 'completedPrecision', h.completed_precision,
        'progress', h.progress) order by h.ordinal) from histories h where h.journey_id = j.id), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'historyId', e.history_id, 'kind', e.kind, 'at', e.at, 'dateLabel', e.date_label,
        'title', case when e.kind = 'sessao' then 'Sessão' else e.title end,
        'text', case when e.kind in ('momento', 'marco', 'inicio') then e.text end,
        'quote', case when e.kind = 'momento' then e.quote end,
        'imagePath', case when e.kind in ('momento', 'marco', 'inicio') then e.image_path end) order by e.at)
      from timeline_events e where e.journey_id = j.id and e.kind in ('inicio', 'sessao', 'momento', 'marco')), '[]'::jsonb));
end; $$;

revoke all on function public.set_my_links(jsonb) from public, anon;
revoke all on function public.can_see_journey(public.profiles, text) from public, anon, authenticated;
grant execute on function public.set_my_links(jsonb) to authenticated;
grant execute on function public.public_profile_v2(text, text) to anon, authenticated;
grant execute on function public.public_journey(text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
