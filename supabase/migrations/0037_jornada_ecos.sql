-- =================================================================================================================
-- 0037 · Jornada 2, entrega J2b: a linha do tempo com o que você não escreveu
--
-- 1. Progresso por sessão: o % informado ao fechar a sessão fica guardado nela (sessions.progress).
--    É o que ancora os ecos dos amigos no ponto certo do jogo.
-- 2. Capítulos narrados pela IA: o texto que a pessoa guardou fica na História (histories.narrations),
--    por capítulo. Nada é narrado sem a pessoa pedir.
-- 3. jornada_ecos(jogo, até): registros de amigos no mesmo jogo, só até o progresso informado (sem spoiler).
--    Amigo = os dois se seguem; precisa poder ver a Jornada da pessoa, sem bloqueio, e ela não ter desligado
--    "Meus registros como eco para amigos" (Preferências, comunidade.eco). Momentos só de Jornadas mostradas
--    no perfil, com título e legenda; recados, pontos para voltar, cartas e com quem jogou nunca aparecem.
-- 4. jornada_comparacao(jogo): números de todo mundo que jogou, só a partir de 5 pessoas e sem nomes.
--
-- Precisa da 0013, 0024, 0025 e 0030. Pode rodar mais de uma vez.
-- =================================================================================================================

alter table public.sessions add column if not exists progress smallint;
do $$ begin
  alter table public.sessions add constraint sessions_progress_range check (progress between 0 and 100);
exception when duplicate_object then null; end $$;
alter table public.histories add column if not exists narrations jsonb not null default '{}'::jsonb;

-- Progresso de um registro: o da sessão dele, ou o último informado antes dele na mesma História.
create or replace function public.event_progress(e public.timeline_events) returns smallint
language sql stable security definer set search_path = public as $$
  select coalesce(
    case when e.kind = 'marco' and e.title ilike 'zerou%' then 100::smallint end,
    (select s.progress from sessions s where s.id = e.session_id),
    (select s.progress from sessions s where s.history_id = e.history_id and s.progress is not null and s.ended_at <= e.at
      order by s.ended_at desc limit 1));
$$;

-- Ecos dos amigos. p_upto = o seu progresso agora; sem ele, vem só quem também jogou (sem registros).
create or replace function public.jornada_ecos(p_game text, p_upto smallint default null) returns jsonb
language sql stable security definer set search_path = public as $$
  with fr as (
    select p.* from profiles p
    where public.are_friends(p.id, auth.uid())
      and p.handle is not null
      and (p.suspended_until is null or p.suspended_until <= now())
      and not exists (select 1 from user_blocks b where (b.blocker = auth.uid() and b.blocked = p.id) or (b.blocker = p.id and b.blocked = auth.uid() and b.kind = 'bloquear'))
      and public.can_see_journey(p, null)
      and public.cm_pref(p, 'eco', true)),
  js as (
    select fr.id uid, fr.handle, fr.avatar, j.id jid, j.shared and not j.mod_hidden shared
    from fr join journeys j on j.user_id = fr.id and j.game_id = p_game),
  pl as (
    select js.handle, js.avatar,
      case when exists (select 1 from histories h where h.journey_id = js.jid and h.state = 'concluida') then 'zerou'
           when exists (select 1 from histories h where h.journey_id = js.jid and h.state = 'ativa') then 'jogando'
           else 'parou' end state
    from js),
  ev as (
    select js.handle, js.avatar, e.id, e.kind, e.at, e.title,
      case when e.kind = 'momento' then e.text end legend,
      case when e.kind = 'momento' then e.image end image,
      public.event_progress(e) prog
    from js join timeline_events e on e.journey_id = js.jid
    where p_upto is not null and not e.mod_hidden
      and (e.kind = 'marco' or (e.kind = 'momento' and js.shared) or e.kind = 'inicio'))
  select jsonb_build_object(
    'friends', coalesce((select jsonb_agg(jsonb_build_object('handle', handle, 'avatar', avatar, 'state', state) order by handle) from pl), '[]'::jsonb),
    'echoes', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'handle', handle, 'avatar', avatar, 'kind', kind, 'at', at, 'title', title,
                                                             'legend', legend, 'image', image, 'progress', prog) order by prog, at)
                        from (select * from ev where prog is not null and prog <= p_upto order by prog, at limit 24) t), '[]'::jsonb));
$$;

-- Comparação anônima: só números, e só quando há gente suficiente para ninguém ser reconhecido.
create or replace function public.jornada_comparacao(p_game text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  k constant integer := 5;
  players integer;
  done_n integer; ses_med numeric; hours_med numeric; hours_n integer;
  paused_n integer; buckets jsonb; playing_n integer;
begin
  if auth.uid() is null then return null; end if;
  select count(distinct j.user_id) into players
  from journeys j join histories h on h.journey_id = j.id where j.game_id = p_game;
  if players < k then return jsonb_build_object('players', players, 'enough', false); end if;

  with hs as (
    select h.id, h.state, h.progress,
      (select count(*) from sessions s where s.history_id = h.id and s.ended_at is not null) n,
      (select sum(s.minutes) from sessions s where s.history_id = h.id) mins,
      (select max(s.ended_at) from sessions s where s.history_id = h.id) last_at,
      (select max(s.progress) from sessions s where s.history_id = h.id) sprog
    from histories h join journeys j on j.id = h.journey_id where j.game_id = p_game)
  select
    count(*) filter (where state = 'concluida'),
    percentile_cont(0.5) within group (order by n) filter (where state = 'concluida' and n > 0),
    percentile_cont(0.5) within group (order by mins) filter (where state = 'concluida' and mins > 0) / 60.0,
    count(*) filter (where state = 'concluida' and mins > 0),
    count(*) filter (where state = 'ativa' and last_at > now() - interval '14 days')
  into done_n, ses_med, hours_med, hours_n, playing_n from hs;

  with hs as (
    select coalesce((select max(s.progress) from sessions s where s.history_id = h.id), h.progress) p
    from histories h join journeys j on j.id = h.journey_id
    where j.game_id = p_game
      and (h.state in ('pausada', 'encerrada', 'dropada')
           or (h.state = 'ativa' and coalesce((select max(s.ended_at) from sessions s where s.history_id = h.id), h.started_at) < now() - interval '30 days'))),
  b as (select least(90, (p / 10) * 10) lo, count(*) c from hs where p is not null and p < 100 group by 1)
  select (select count(*) from hs where p is not null and p < 100), coalesce(jsonb_agg(jsonb_build_object('from', lo, 'count', c) order by lo), '[]'::jsonb)
  into paused_n, buckets from b;

  return jsonb_build_object(
    'players', players, 'enough', true,
    'playing', case when playing_n >= k then playing_n end,
    'done', done_n,
    'doneSessions', case when done_n >= k and ses_med is not null then round(ses_med) end,
    'doneHours', case when hours_n >= k then round(hours_med) end,
    'paused', case when paused_n >= k then paused_n else 0 end,
    'pauseBuckets', case when paused_n >= k then buckets else '[]'::jsonb end);
end; $$;

revoke all on function public.event_progress(public.timeline_events) from public, anon, authenticated;
revoke all on function public.jornada_ecos(text, smallint) from public, anon;
revoke all on function public.jornada_comparacao(text) from public, anon;
grant execute on function public.jornada_ecos(text, smallint) to authenticated;
grant execute on function public.jornada_comparacao(text) to authenticated;
