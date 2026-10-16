-- 0043 · Jornada 2, entrega J6b: jogar como descanso e revisão trimestral do backlog
--
-- 1. Intenção da sessão: "Hoje é para…" (descansar, se divertir, avançar, um desafio) e, no fim, se funcionou.
-- 2. Resumo do mês no sino: no dia 1º, a partir das 9h, o mês anterior pela intenção. Só para quem marcou alguma
--    intenção. Desliga nas Preferências (aviso_mes).
-- 3. Revisão do backlog: no começo de cada trimestre, um aviso chamando para a revisão sem culpa
--    (/jornada/revisao). Desliga nas Preferências (aviso_revisao). As escolhas da revisão usam o que já existe
--    (estado da História, "não agora", "não vou jogar", prioridade e desejos); não há tabela nova.
--
-- Pode rodar mais de uma vez.

alter table public.sessions add column if not exists intent text;
alter table public.sessions add column if not exists intent_met text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'sessions_intent_check') then
    alter table public.sessions add constraint sessions_intent_check check (intent is null or intent in ('descansar', 'divertir', 'avancar', 'desafio'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sessions_intent_met_check') then
    alter table public.sessions add constraint sessions_intent_met_check check (intent_met is null or intent_met in ('sim', 'meio', 'nao'));
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Avisos de relógio: os da 0041 e, agora, o mês pela intenção e a revisão do trimestre
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.notif_sync() returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); today date := (now() at time zone 'America/Sao_Paulo')::date;
  mon date := date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date;
  wf timestamptz := ((date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date - 7)::timestamp at time zone 'America/Sao_Paulo');
  wt timestamptz := (date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date::timestamp at time zone 'America/Sao_Paulo');
  m1 date := date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date;
  mt timestamptz := (date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date::timestamp at time zone 'America/Sao_Paulo');
  mf timestamptz := ((date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date - interval '1 month')::timestamp at time zone 'America/Sao_Paulo');
  q1 date := date_trunc('quarter', (now() at time zone 'America/Sao_Paulo'))::date;
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
  -- resumo da semana anterior (segunda, a partir das 8h; só se teve sessão)
  if now() >= wt + interval '8 hours' then
    with s as (
      select x.minutes, x.companions, g.title from sessions x join journeys j on j.id = x.journey_id join games g on g.id = j.game_id
      where x.user_id = me and x.ended_at >= wf and x.ended_at < wt)
    insert into notifications (user_id, kind, grp, title, link, data, created_at)
    select me, 'semana', 'sem:' || to_char(mon - 7, 'IYYY-IW'), null, '/jornada/ritmo#semana',
      jsonb_build_object(
        'sessions', (select count(*) from s),
        'minutes', (select coalesce(sum(minutes), 0) from s),
        'games', (select coalesce(jsonb_agg(title order by c desc), '[]'::jsonb) from (select title, count(*) c from s group by title order by c desc limit 3) q),
        'more', greatest(0, (select count(distinct title) from s) - 3),
        'done', (select coalesce(jsonb_agg(g.title), '[]'::jsonb) from histories h join journeys j on j.id = h.journey_id join games g on g.id = j.game_id
                 where h.user_id = me and h.state = 'concluida' and h.completed_at >= wf and h.completed_at < wt),
        'with', (select coalesce(jsonb_agg(distinct w), '[]'::jsonb) from s, unnest(coalesce(s.companions, '{}'::text[])) w)),
      wt + interval '8 hours'
    where exists (select 1 from s)
    on conflict do nothing;
  end if;
  -- J6b: o mês pela intenção ("jogar como descanso"), no dia 1º a partir das 9h; só se marcou alguma intenção
  if now() >= mt + interval '9 hours' then
    with s as (
      select x.intent, x.intent_met, g.title from sessions x join journeys j on j.id = x.journey_id join games g on g.id = j.game_id
      where x.user_id = me and x.intent is not null and x.ended_at is not null and x.started_at >= mf and x.started_at < mt)
    insert into notifications (user_id, kind, grp, title, link, data, created_at)
    select me, 'mes', 'mes:' || to_char(m1 - 1, 'YYYY-MM'), null, '/jornada/ritmo#mes',
      jsonb_build_object(
        'month', to_char(m1 - 1, 'YYYY-MM'),
        'sessions', (select count(*) from s),
        'rest', (select count(*) from s where intent = 'descansar'),
        'restOk', (select count(*) from s where intent = 'descansar' and intent_met = 'sim'),
        'restAnswered', (select count(*) from s where intent = 'descansar' and intent_met is not null),
        'top', (select title from s where intent = 'descansar' and intent_met = 'sim' group by title order by count(*) desc, title limit 1)),
      mt + interval '9 hours'
    where exists (select 1 from s)
    on conflict do nothing;
  end if;
  -- J6b: revisão do backlog no começo de cada trimestre (até 30 dias depois), para quem tem Jornada ou coleção
  if now() >= (q1::timestamp at time zone 'America/Sao_Paulo') + interval '9 hours' and today < q1 + 30
     and (exists (select 1 from journeys where user_id = me) or exists (select 1 from copies where user_id = me)) then
    insert into notifications (user_id, kind, grp, title, link, data, created_at)
    values (me, 'revisao', 'rev:' || to_char(q1, 'YYYY') || '-T' || to_char(q1, 'Q'), null, '/jornada/revisao',
      jsonb_build_object('quarter', to_char(q1, 'YYYY') || '-T' || to_char(q1, 'Q')),
      (q1::timestamp at time zone 'America/Sao_Paulo') + interval '9 hours')
    on conflict do nothing;
  end if;
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
    when p_kind = 'semana' then 'aviso_semana'
    when p_kind = 'mes' then 'aviso_mes'
    when p_kind = 'revisao' then 'aviso_revisao'
    when p_kind in ('pacto', 'pacto_zerou') then 'aviso_pactos'
  end;
$$;

create or replace function public.notif_group(p_kind text) returns text
language sql immutable as $$
  select case
    when p_kind in ('resposta', 'acompanhando', 'mencao', 'reacao') then 'comunidade'
    when p_kind like 'clube_%' or p_kind like 'jogatina_%' or p_kind = 'parte' then 'grupos'
    when p_kind in ('seguiu', 'pacto', 'pacto_zerou') then 'amigos'
    when p_kind in ('lancamento', 'retomada', 'semana', 'mes', 'revisao') then 'jornada'
    else 'sistema'
  end;
$$;

revoke all on function public.notif_sync() from public, anon, authenticated;
revoke all on function public.notif_pref_key(text) from public, anon, authenticated;
revoke all on function public.notif_group(text) from public, anon, authenticated;
