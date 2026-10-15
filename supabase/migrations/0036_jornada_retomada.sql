-- =================================================================================================================
-- 0036 · Jornada 2, entrega J1: duração da sessão e aviso de retomada
--
-- 1. A sessão grava quanto durou: ao fechar sem informar minutos, o banco calcula pelo começo e pelo fim
--    (sessões com mais de 12 horas ficam sem duração, porque provavelmente foram esquecidas abertas).
--    As sessões antigas já fechadas recebem a duração calculada do mesmo jeito.
-- 2. Aviso "retomada": faz 14 dias que você não volta a um jogo que está jogando. Um aviso por pausa,
--    com o link para a página "Voltar a um jogo". Desliga nas Preferências (aviso_retomada).
--
-- Pode rodar mais de uma vez.
-- =================================================================================================================

-- ---------------------------------------------------------------------------------------------------------------
-- 1. Duração da sessão
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.session_minutes(p_start timestamptz, p_end timestamptz) returns integer
language sql immutable as $$
  select case
    when p_start is null or p_end is null or p_end < p_start then null
    when p_end - p_start > interval '12 hours' then null
    else greatest(1, least(600, round(extract(epoch from (p_end - p_start)) / 60)::int))
  end;
$$;

create or replace function public.sessions_fill_minutes() returns trigger
language plpgsql as $$
begin
  if new.ended_at is not null and new.minutes is null then
    new.minutes := public.session_minutes(new.started_at, new.ended_at);
  end if;
  return new;
end; $$;

drop trigger if exists sessions_fill_minutes on public.sessions;
create trigger sessions_fill_minutes before insert or update of ended_at, minutes on public.sessions
  for each row execute function public.sessions_fill_minutes();

update public.sessions
   set minutes = public.session_minutes(started_at, ended_at)
 where ended_at is not null and minutes is null and public.session_minutes(started_at, ended_at) is not null;

-- ---------------------------------------------------------------------------------------------------------------
-- 2. Aviso de retomada (entra quando a pessoa abre o site, junto com os outros avisos de relógio)
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.notif_sync() returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if me is null then return; end if;
  -- jogatina que começa em até 1 hora (para quem disse Vou ou Talvez)
  insert into notifications (user_id, kind, grp, ref, title, link, data, created_at)
  select me, 'jogatina_lembrete', 'l:' || j.id, j.id, j.title, '/jogatina/' || j.id, jsonb_build_object('startsAt', j.starts_at), j.starts_at - interval '1 hour'
  from jogatinas j join jogatina_people x on x.jogatina_id = j.id and x.user_id = me and x.rsvp <> 'nao'
  where j.canceled_at is null and not j.mod_hidden and now() between j.starts_at - interval '1 hour' and j.starts_at + interval '15 minutes'
  on conflict do nothing;
  -- parte sugerida do clube que abriu (e a pessoa ainda não passou)
  insert into notifications (user_id, kind, grp, ref, title, excerpt, link, data, created_at)
  select me, 'parte', 'pt:' || k.id || ':' || k.round || ':' || pt.ordinal, k.id, k.name, pt.title, '/clube/' || k.slug || '#parte-' || pt.ordinal,
         jsonb_build_object('part', pt.ordinal), (pt.suggested_on::timestamp at time zone 'America/Sao_Paulo')
  from club_parts pt join clubs k on k.id = pt.club_id join club_members m on m.club_id = k.id and m.user_id = me
  where not k.mod_hidden and pt.suggested_on is not null and m.stage < pt.ordinal and pt.suggested_on between today - 3 and today
  on conflict do nothing;
  -- lançamento de um jogo da lista de desejos ou do Radar
  insert into notifications (user_id, kind, grp, ref, title, link, data, created_at)
  select me, 'lancamento', 'lc:' || g.id, null, g.title, '/jogos/' || g.slug, jsonb_build_object('cover', g.cover, 'releasedOn', g.released_on),
         (g.released_on::timestamp at time zone 'America/Sao_Paulo')
  from games g
  where g.released_on between today - 3 and today
    and (exists (select 1 from wishes w where w.user_id = me and w.game_id = g.id)
         or exists (select 1 from my_games mg where mg.user_id = me and mg.game_id = g.id and mg.on_radar))
  on conflict do nothing;
  -- retomada: 14 dias sem voltar a um jogo que está jogando (um aviso por pausa)
  insert into notifications (user_id, kind, grp, ref, title, excerpt, link, data, created_at)
  select me, 'retomada', 'rt:' || j.id || ':' || to_char(ls.last_at at time zone 'America/Sao_Paulo', 'YYYYMMDD'), j.id, g.title, ls.where_stopped,
         '/jornada/' || g.slug || '/voltar',
         jsonb_build_object('cover', g.cover, 'lastAt', ls.last_at),
         ls.last_at + interval '14 days'
  from journeys j
  join games g on g.id = j.game_id
  join lateral (
    select coalesce(s.ended_at, s.started_at) as last_at, s.where_stopped
    from sessions s where s.journey_id = j.id
    order by s.started_at desc limit 1
  ) ls on true
  where j.user_id = me
    and j.mood <> 'silencioso'
    and exists (select 1 from histories h where h.journey_id = j.id and h.state = 'ativa')
    and not exists (select 1 from sessions s where s.journey_id = j.id and s.ended_at is null)
    and ls.last_at < now() - interval '14 days'
    and ls.last_at > now() - interval '120 days'
  on conflict do nothing;
end; $$;

create or replace function public.notif_pref_key(p_kind text) returns text
language sql immutable as $$
  select case
    when p_kind = 'resposta' then 'aviso_respostas'
    when p_kind = 'acompanhando' then 'aviso_acompanhando'
    when p_kind in ('mencao', 'clube_mencao', 'jogatina_mencao') then 'aviso_mencoes'
    when p_kind in ('clube_resposta', 'jogatina_resposta', 'parte', 'clube_jogo', 'clube_jogatina') then 'aviso_clubes'
    when p_kind = 'reacao' then 'aviso_reacoes'
    when p_kind = 'seguiu' then 'aviso_seguidores'
    when p_kind in ('jogatina_convite', 'clube_convite') then 'aviso_convites'
    when p_kind in ('jogatina_lembrete', 'jogatina_mudou') then 'aviso_lembretes'
    when p_kind = 'lancamento' then 'aviso_lancamentos'
    when p_kind = 'retomada' then 'aviso_retomada'
  end;
$$;

create or replace function public.notif_group(p_kind text) returns text
language sql immutable as $$
  select case
    when p_kind in ('resposta', 'acompanhando', 'mencao', 'reacao') then 'comunidade'
    when p_kind like 'clube_%' or p_kind like 'jogatina_%' or p_kind = 'parte' then 'grupos'
    when p_kind = 'seguiu' then 'amigos'
    when p_kind in ('lancamento', 'retomada') then 'jornada'
    else 'sistema'
  end;
$$;

revoke all on function public.sessions_fill_minutes() from public, anon, authenticated;
revoke all on function public.notif_sync() from public, anon, authenticated;
revoke all on function public.notif_pref_key(text) from public, anon, authenticated;
revoke all on function public.notif_group(text) from public, anon, authenticated;
