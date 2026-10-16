-- 0063 · Vídeos dos capítulos (C4)
--
-- Cada item da lista do jogo (capítulo, missão, área…) pode ter um vídeo do YouTube com o minuto de início.
-- Guardamos só o código do vídeo, o minuto, a língua e a origem:
--   'canal'  · detonado do canal WinnerZ (a administração liga uma playlist do canal ao jogo);
--   'pessoa' · alguém que tem o jogo na Jornada colou um link;
--   'auto'   · achado pelo servidor na busca do YouTube (em português e em inglês). Vence em 30 dias e é buscado
--              de novo, como pedem as regras do YouTube.
-- Na hora de mostrar vale: canal, pessoa, automático em português, automático em inglês.
-- game_video_jobs guarda cada tentativa automática (para não repetir à toa) e o limite do dia (a cota gratuita).
-- Pode rodar mais de uma vez. Precisa da 0058.

create table if not exists public.game_part_videos (
  game_id text not null references public.games (id) on delete cascade,
  part_id text not null check (char_length(part_id) between 1 and 40),
  source text not null check (source in ('canal', 'pessoa', 'auto')),
  lang text not null default '?' check (lang in ('pt', 'en', '?')),
  video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{6,20}$'),
  start_s integer not null default 0 check (start_s between 0 and 86400),
  chosen_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (game_id, part_id, source, lang)
);
alter table public.game_part_videos enable row level security;
revoke all on public.game_part_videos from anon, authenticated;

create table if not exists public.game_video_jobs (
  game_id text primary key references public.games (id) on delete cascade,
  state text not null default 'rodando' check (state in ('rodando', 'feito', 'sem_video', 'erro')),
  tries integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  note text check (char_length(note) <= 200)
);
create index if not exists game_video_jobs_started on public.game_video_jobs (started_at desc);
alter table public.game_video_jobs enable row level security;
revoke all on public.game_video_jobs from anon, authenticated;

-- Os vídeos do jogo (os automáticos vencidos ficam de fora) e o andamento da busca automática.
create or replace function public.part_videos(p_game text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'videos', coalesce((select jsonb_agg(jsonb_build_object('partId', v.part_id, 'source', v.source, 'lang', v.lang, 'videoId', v.video_id, 'start', v.start_s)
                                         order by v.part_id, v.source, v.lang)
                        from game_part_videos v where v.game_id = p_game and (v.expires_at is null or v.expires_at > now())), '[]'::jsonb),
    'job', (select j.state from game_video_jobs j where j.game_id = p_game),
    'jobNote', (select j.note from game_video_jobs j where j.game_id = p_game),
    'canEdit', public.outline_can_edit(p_game),
    'admin', public.is_admin())
  where auth.uid() is not null;
$$;

-- "Trocar o vídeo": quem tem o jogo na Jornada cola um link (sem vídeo, apaga a escolha de pessoa).
create or replace function public.part_video_set(p_game text, p_part text, p_video text, p_start integer) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if not public.outline_can_edit(p_game) then raise exception 'outline_forbidden'; end if;
  if not exists (select 1 from game_outlines o, jsonb_array_elements(o.parts) x where o.game_id = p_game and x ->> 'id' = p_part) then raise exception 'video_part'; end if;
  if not public.is_admin() and (select count(*) from game_part_videos where chosen_by = auth.uid() and created_at > now() - interval '1 day') >= 30 then
    raise exception 'video_limit';
  end if;
  if p_video is null or btrim(p_video) = '' then
    delete from game_part_videos where game_id = p_game and part_id = p_part and source = 'pessoa';
  else
    if p_video !~ '^[A-Za-z0-9_-]{6,20}$' then raise exception 'video_invalid'; end if;
    insert into game_part_videos (game_id, part_id, source, lang, video_id, start_s, chosen_by, created_at, expires_at)
    values (p_game, p_part, 'pessoa', '?', p_video, greatest(0, least(86400, coalesce(p_start, 0))), auth.uid(), now(), null)
    on conflict (game_id, part_id, source, lang) do update set video_id = excluded.video_id, start_s = excluded.start_s, chosen_by = excluded.chosen_by, created_at = now();
  end if;
  return public.part_videos(p_game);
end; $$;

-- Servidor (chave secreta): começa uma busca automática. 'ok' para seguir; 'pronto' se já tem vídeos válidos;
-- 'sem_lista' se o jogo ainda não tem lista; 'rodando'; 'desistiu' (tentou há pouco); 'limite' (cota do dia).
create or replace function public.video_job_start(p_game text, p_limit integer, p_force boolean) returns text
language plpgsql security definer set search_path = public as $$
declare j game_video_jobs; today integer;
begin
  if not exists (select 1 from game_outlines where game_id = p_game and jsonb_array_length(parts) > 1) then return 'sem_lista'; end if;
  -- Já tem vídeos automáticos válidos para a lista atual (uma lista nova, com outros itens, busca de novo).
  if not coalesce(p_force, false) and exists (select 1 from game_part_videos v, game_outlines o, jsonb_array_elements(o.parts) x
                                              where v.game_id = p_game and o.game_id = p_game and x ->> 'id' = v.part_id and v.source = 'auto' and v.expires_at > now()) then return 'pronto'; end if;
  select * into j from game_video_jobs where game_id = p_game for update;
  if found and not coalesce(p_force, false) then
    if j.state = 'rodando' and j.started_at > now() - interval '3 minutes' then return 'rodando'; end if;
    if j.state = 'erro' and j.finished_at > now() - interval '30 minutes' then return 'desistiu'; end if;
    if j.state = 'sem_video' and j.finished_at > now() - interval '7 days' then return 'desistiu'; end if;
    if j.state = 'feito' and j.finished_at > now() - interval '1 day' then return 'desistiu'; end if;
  end if;
  select count(*) into today from game_video_jobs where started_at > date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  if today >= greatest(1, coalesce(p_limit, 40)) and not coalesce(p_force, false) then return 'limite'; end if;
  insert into game_video_jobs (game_id, state, tries, started_at, finished_at) values (p_game, 'rodando', 1, now(), null)
  on conflict (game_id) do update set state = 'rodando', tries = game_video_jobs.tries + 1, started_at = now(), finished_at = null, note = null;
  return 'ok';
end; $$;

create or replace function public.video_job_finish(p_game text, p_state text, p_note text default null) returns void
language sql security definer set search_path = public as $$
  update game_video_jobs set state = case when p_state in ('feito', 'sem_video', 'erro') then p_state else 'erro' end, finished_at = now(), note = left(p_note, 200)
  where game_id = p_game;
$$;

-- Servidor: guarda os vídeos achados. p_rows: [{partId, lang, videoId, start}]. 'auto' troca os automáticos do jogo
-- (vencem em 30 dias); 'canal' troca os do canal (não vencem). Itens que não estão na lista são ignorados.
create or replace function public.video_store(p_game text, p_rows jsonb, p_source text, p_user uuid default null) returns integer
language plpgsql security definer set search_path = public as $$
declare it jsonb; n integer := 0; ids text[];
begin
  if p_source not in ('auto', 'canal') or jsonb_typeof(p_rows) <> 'array' then raise exception 'video_invalid'; end if;
  select coalesce(array_agg(x ->> 'id'), '{}') into ids from game_outlines o, jsonb_array_elements(o.parts) x where o.game_id = p_game;
  delete from game_part_videos where game_id = p_game and source = p_source;
  for it in select * from jsonb_array_elements(p_rows) limit 200 loop
    if not (it ->> 'partId' = any (ids)) or coalesce(it ->> 'videoId', '') !~ '^[A-Za-z0-9_-]{6,20}$' then continue; end if;
    insert into game_part_videos (game_id, part_id, source, lang, video_id, start_s, chosen_by, created_at, expires_at)
    values (p_game, it ->> 'partId', p_source, case when it ->> 'lang' in ('pt', 'en') then it ->> 'lang' else '?' end, it ->> 'videoId',
            case when (it ->> 'start') ~ '^\d{1,5}$' then least(86400, (it ->> 'start')::integer) else 0 end,
            p_user, now(), case when p_source = 'auto' then now() + interval '30 days' end)
    on conflict (game_id, part_id, source, lang) do update set video_id = excluded.video_id, start_s = excluded.start_s, created_at = now(), expires_at = excluded.expires_at;
    n := n + 1;
  end loop;
  return n;
end; $$;

-- Limpeza: automáticos vencidos saem de vez (as regras do YouTube pedem no máximo 30 dias).
create or replace function public.video_purge() returns integer
language sql security definer set search_path = public as $$
  with d as (delete from game_part_videos where source = 'auto' and expires_at < now() returning 1) select count(*)::integer from d;
$$;

revoke all on function public.part_videos(text) from public, anon;
revoke all on function public.part_video_set(text, text, text, integer) from public, anon;
revoke all on function public.video_job_start(text, integer, boolean) from public, anon, authenticated;
revoke all on function public.video_job_finish(text, text, text) from public, anon, authenticated;
revoke all on function public.video_store(text, jsonb, text, uuid) from public, anon, authenticated;
revoke all on function public.video_purge() from public, anon, authenticated;
grant execute on function public.part_videos(text) to authenticated;
grant execute on function public.part_video_set(text, text, text, integer) to authenticated;
grant execute on function public.video_job_start(text, integer, boolean) to service_role;
grant execute on function public.video_job_finish(text, text, text) to service_role;
grant execute on function public.video_store(text, jsonb, text, uuid) to service_role;
grant execute on function public.video_purge() to service_role;
