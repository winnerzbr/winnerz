-- 0064 · Vídeo errado
--
-- Quem tem o jogo na Jornada pode avisar que um vídeo não é daquele trecho ("Não é deste trecho"). O vídeo some
-- daquele item para todo mundo e a busca automática não o põe ali de novo. O detonado do canal WinnerZ só a
-- administração tira. Pode rodar mais de uma vez. Precisa da 0063.

create table if not exists public.game_video_hidden (
  game_id text not null references public.games (id) on delete cascade,
  part_id text not null,
  video_id text not null,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (game_id, part_id, video_id)
);
alter table public.game_video_hidden enable row level security;
revoke all on public.game_video_hidden from anon, authenticated;

-- Os vídeos do jogo, sem os automáticos vencidos e sem os marcados como errados.
create or replace function public.part_videos(p_game text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'videos', coalesce((select jsonb_agg(jsonb_build_object('partId', v.part_id, 'source', v.source, 'lang', v.lang, 'videoId', v.video_id, 'start', v.start_s)
                                         order by v.part_id, v.source, v.lang)
                        from game_part_videos v
                        where v.game_id = p_game and (v.expires_at is null or v.expires_at > now())
                          and not exists (select 1 from game_video_hidden h where h.game_id = v.game_id and h.part_id = v.part_id and h.video_id = v.video_id)), '[]'::jsonb),
    'job', (select j.state from game_video_jobs j where j.game_id = p_game),
    'jobNote', (select j.note from game_video_jobs j where j.game_id = p_game),
    'canEdit', public.outline_can_edit(p_game),
    'admin', public.is_admin())
  where auth.uid() is not null;
$$;

-- "Não é deste trecho".
create or replace function public.part_video_hide(p_game text, p_part text, p_video text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if not public.outline_can_edit(p_game) then raise exception 'outline_forbidden'; end if;
  if coalesce(p_video, '') !~ '^[A-Za-z0-9_-]{6,20}$' then raise exception 'video_invalid'; end if;
  if not public.is_admin() and exists (select 1 from game_part_videos where game_id = p_game and part_id = p_part and video_id = p_video and source = 'canal') then
    raise exception 'video_canal';
  end if;
  if not public.is_admin() and (select count(*) from game_video_hidden where user_id = auth.uid() and created_at > now() - interval '1 day') >= 30 then
    raise exception 'video_limit';
  end if;
  insert into game_video_hidden (game_id, part_id, video_id, user_id) values (p_game, p_part, p_video, auth.uid()) on conflict do nothing;
  return public.part_videos(p_game);
end; $$;

-- A busca automática não põe de volta um vídeo marcado como errado naquele item.
create or replace function public.video_store(p_game text, p_rows jsonb, p_source text, p_user uuid default null) returns integer
language plpgsql security definer set search_path = public as $$
declare it jsonb; n integer := 0; ids text[];
begin
  if p_source not in ('auto', 'canal') or jsonb_typeof(p_rows) <> 'array' then raise exception 'video_invalid'; end if;
  select coalesce(array_agg(x ->> 'id'), '{}') into ids from game_outlines o, jsonb_array_elements(o.parts) x where o.game_id = p_game;
  delete from game_part_videos where game_id = p_game and source = p_source;
  for it in select * from jsonb_array_elements(p_rows) limit 200 loop
    if not (it ->> 'partId' = any (ids)) or coalesce(it ->> 'videoId', '') !~ '^[A-Za-z0-9_-]{6,20}$' then continue; end if;
    if exists (select 1 from game_video_hidden h where h.game_id = p_game and h.part_id = it ->> 'partId' and h.video_id = it ->> 'videoId') then continue; end if;
    insert into game_part_videos (game_id, part_id, source, lang, video_id, start_s, chosen_by, created_at, expires_at)
    values (p_game, it ->> 'partId', p_source, case when it ->> 'lang' in ('pt', 'en') then it ->> 'lang' else '?' end, it ->> 'videoId',
            case when (it ->> 'start') ~ '^\d{1,5}$' then least(86400, (it ->> 'start')::integer) else 0 end,
            p_user, now(), case when p_source = 'auto' then now() + interval '30 days' end)
    on conflict (game_id, part_id, source, lang) do update set video_id = excluded.video_id, start_s = excluded.start_s, created_at = now(), expires_at = excluded.expires_at;
    n := n + 1;
  end loop;
  return n;
end; $$;

revoke all on function public.part_videos(text) from public, anon;
revoke all on function public.part_video_hide(text, text, text) from public, anon;
revoke all on function public.video_store(text, jsonb, text, uuid) from public, anon, authenticated;
grant execute on function public.part_videos(text) to authenticated;
grant execute on function public.part_video_hide(text, text, text) to authenticated;
grant execute on function public.video_store(text, jsonb, text, uuid) to service_role;
