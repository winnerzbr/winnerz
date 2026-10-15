-- =================================================================================================================
-- 0041 · Jornada 2, entrega J6: ritmo (resumo semanal, pactos entre amigos)
--
-- 1. Resumo semanal no sino: toda segunda, a partir das 8h, um aviso com a semana anterior (sessões, tempo, jogos,
--    zerados e com quem jogou). Só para quem jogou na semana. Desliga nas Preferências (aviso_semana).
-- 2. Pactos entre amigos, sem sequência: um jogo, um combinado leve ("zerar" ou "jogar junto"), um prazo opcional.
--    Quem está dentro vê o andamento dos outros naquele jogo (%, última sessão, se zerou). Convite só para amigos.
--    Avisos: o convite (pacto) e quando alguém do pacto zera (pacto_zerou). Desligam em aviso_pactos.
-- As temporadas pessoais ficam nas Preferências da pessoa (profiles.prefs) e são calculadas no site.
--
-- Pode rodar mais de uma vez.
-- =================================================================================================================

create table if not exists public.pacts (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games (id) on delete cascade,
  goal text not null check (goal in ('zerar', 'jogar')),
  until date,
  note text check (char_length(note) <= 140),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create table if not exists public.pact_people (
  pact_id uuid not null references public.pacts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'convidado' check (status in ('convidado', 'dentro', 'saiu')),
  invited_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz,
  primary key (pact_id, user_id)
);
create index if not exists pact_people_user on public.pact_people (user_id, status);
alter table public.pacts enable row level security;
alter table public.pact_people enable row level security;
revoke all on public.pacts, public.pact_people from anon, authenticated;

-- Um pacto, do jeito que quem está nele vê.
create or replace function public.pact_json(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', pc.id, 'goal', pc.goal, 'until', pc.until, 'note', pc.note, 'createdAt', pc.created_at, 'endedAt', pc.ended_at,
    'game', jsonb_build_object('id', g.id, 'title', g.title, 'slug', g.slug, 'cover', g.cover),
    'mine', pc.created_by = auth.uid(),
    'me', (select status from pact_people where pact_id = pc.id and user_id = auth.uid()),
    'people', coalesce((select jsonb_agg(jsonb_build_object(
        'handle', p.handle, 'avatar', p.avatar, 'me', pp.user_id = auth.uid(), 'status', pp.status,
        -- Andamento só de quem entrou no pacto.
        'progress', case when pp.status = 'dentro' then (select h.progress from histories h join journeys j on j.id = h.journey_id where j.user_id = pp.user_id and j.game_id = pc.game_id order by h.ordinal desc limit 1) end,
        'lastAt', case when pp.status = 'dentro' then (select max(s.ended_at) from sessions s join journeys j on j.id = s.journey_id where j.user_id = pp.user_id and j.game_id = pc.game_id) end,
        'doneAt', case when pp.status = 'dentro' then (select min(h.completed_at) from histories h join journeys j on j.id = h.journey_id where j.user_id = pp.user_id and j.game_id = pc.game_id and h.state = 'concluida' and h.completed_at >= pc.created_at - interval '1 day') end)
      order by (pp.user_id = auth.uid()) desc, pp.joined_at nulls last)
      from pact_people pp join profiles p on p.id = pp.user_id where pp.pact_id = pc.id and pp.status <> 'saiu'), '[]'::jsonb))
  from pacts pc join games g on g.id = pc.game_id
  where pc.id = p_id;
$$;

create or replace function public.my_pacts() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public.pact_json(pc.id) order by pc.created_at desc), '[]'::jsonb)
  from pacts pc join pact_people me on me.pact_id = pc.id and me.user_id = auth.uid() and me.status in ('dentro', 'convidado')
  where pc.ended_at is null or pc.ended_at > now() - interval '30 days';
$$;

create or replace function public.pact_create(p_game text, p_goal text, p_until date, p_note text, p_handles text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pid uuid; h text; v uuid; n integer := 0; t text;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if p_goal not in ('zerar', 'jogar') then raise exception 'pact_goal'; end if;
  select title into t from games where id = p_game;
  if t is null then raise exception 'game_not_found'; end if;
  if (select count(*) from pact_people pp join pacts pc on pc.id = pp.pact_id where pp.user_id = auth.uid() and pp.status = 'dentro' and pc.ended_at is null) >= 10 then raise exception 'pact_limit'; end if;
  if cardinality(coalesce(p_handles, '{}')) = 0 then raise exception 'pact_nobody'; end if;
  if cardinality(p_handles) > 7 then raise exception 'pact_too_many'; end if;
  insert into pacts (game_id, goal, until, note, created_by) values (p_game, p_goal, p_until, nullif(left(btrim(coalesce(p_note, '')), 140), ''), auth.uid()) returning id into pid;
  insert into pact_people (pact_id, user_id, status, joined_at) values (pid, auth.uid(), 'dentro', now());
  foreach h in array p_handles loop
    h := lower(trim(both from regexp_replace(coalesce(h, ''), '^@', '')));
    continue when h = '';
    select id into v from profiles where handle is not null and lower(handle) = h and (suspended_until is null or suspended_until <= now());
    continue when v is null or v = auth.uid() or not public.are_friends(v, auth.uid());
    insert into pact_people (pact_id, user_id, status, invited_by) values (pid, v, 'convidado', auth.uid()) on conflict do nothing;
    if found then
      n := n + 1;
      insert into notifications (user_id, kind, actor, grp, ref, title, link, data)
      values (v, 'pacto', auth.uid(), 'pc:' || pid, pid, t, '/jornada/ritmo#pactos', jsonb_build_object('goal', p_goal, 'until', p_until))
      on conflict do nothing;
    end if;
  end loop;
  if n = 0 then raise exception 'pact_nobody'; end if;
  return public.pact_json(pid);
end; $$;

create or replace function public.pact_respond(p_id uuid, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update pact_people set status = case when p_accept then 'dentro' else 'saiu' end, joined_at = case when p_accept then now() end
  where pact_id = p_id and user_id = auth.uid() and status = 'convidado';
  if not found then raise exception 'not_found'; end if;
  return public.pact_json(p_id);
end; $$;

-- Sair do pacto. Quando não sobra ninguém dentro além de uma pessoa, o pacto termina (sem culpa para ninguém).
create or replace function public.pact_leave(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update pact_people set status = 'saiu' where pact_id = p_id and user_id = auth.uid();
  if not found then raise exception 'not_found'; end if;
  if (select count(*) from pact_people where pact_id = p_id and status = 'dentro') < 2
     and not exists (select 1 from pact_people where pact_id = p_id and status = 'convidado') then
    update pacts set ended_at = now() where id = p_id and ended_at is null;
  end if;
end; $$;

-- Alguém do pacto zerou: avisa os outros que estão dentro.
create or replace function public.pact_on_done() returns trigger
language plpgsql security definer set search_path = public as $$
declare gid text;
begin
  if new.state = 'concluida' and (old.state is distinct from 'concluida') then
    select game_id into gid from journeys where id = new.journey_id;
    insert into notifications (user_id, kind, actor, grp, ref, title, link, data)
    select other.user_id, 'pacto_zerou', new.user_id, 'pz:' || pc.id || ':' || new.user_id, pc.id, g.title, '/jornada/ritmo#pactos', jsonb_build_object('cover', g.cover)
    from pacts pc
    join games g on g.id = pc.game_id
    join pact_people me on me.pact_id = pc.id and me.user_id = new.user_id and me.status = 'dentro'
    join pact_people other on other.pact_id = pc.id and other.user_id <> new.user_id and other.status = 'dentro'
    where pc.game_id = gid and pc.ended_at is null
    on conflict do nothing;
  end if;
  return new;
end; $$;
drop trigger if exists histories_pact_done on public.histories;
create trigger histories_pact_done after update of state on public.histories for each row execute function public.pact_on_done();

-- ---------------------------------------------------------------------------------------------------------------
-- Avisos de relógio: os da 0036 e, agora, o resumo da semana
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.notif_sync() returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); today date := (now() at time zone 'America/Sao_Paulo')::date;
  mon date := date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date;
  wf timestamptz := ((date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date - 7)::timestamp at time zone 'America/Sao_Paulo');
  wt timestamptz := (date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date::timestamp at time zone 'America/Sao_Paulo');
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
    when p_kind in ('pacto', 'pacto_zerou') then 'aviso_pactos'
  end;
$$;

create or replace function public.notif_group(p_kind text) returns text
language sql immutable as $$
  select case
    when p_kind in ('resposta', 'acompanhando', 'mencao', 'reacao') then 'comunidade'
    when p_kind like 'clube_%' or p_kind like 'jogatina_%' or p_kind = 'parte' then 'grupos'
    when p_kind in ('seguiu', 'pacto', 'pacto_zerou') then 'amigos'
    when p_kind in ('lancamento', 'retomada', 'semana') then 'jornada'
    else 'sistema'
  end;
$$;

revoke all on function public.pact_json(uuid) from public, anon, authenticated;
revoke all on function public.pact_on_done() from public, anon, authenticated;
revoke all on function public.notif_sync() from public, anon, authenticated;
revoke all on function public.notif_pref_key(text) from public, anon, authenticated;
revoke all on function public.notif_group(text) from public, anon, authenticated;
revoke all on function public.my_pacts() from public, anon;
revoke all on function public.pact_create(text, text, date, text, text[]) from public, anon;
revoke all on function public.pact_respond(uuid, boolean) from public, anon;
revoke all on function public.pact_leave(uuid) from public, anon;
grant execute on function public.my_pacts() to authenticated;
grant execute on function public.pact_create(text, text, date, text, text[]) to authenticated;
grant execute on function public.pact_respond(uuid, boolean) to authenticated;
grant execute on function public.pact_leave(uuid) to authenticated;
