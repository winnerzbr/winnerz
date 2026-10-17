-- =================================================================================================================
-- 0068 · Etapa 7, E7.5: agenda de eventos
--
-- A página Eventos ganha a agenda: os eventos do canal que a administração marca no Studio (lives, estreias, a noite
-- do Awards e outros) e as jogatinas abertas do canal (da comunidade oficial ou criadas pela administração). As datas
-- do WinnerZ Awards vêm da própria edição. Cada item pode ir para a agenda da pessoa (arquivo .ics ou Google Agenda).
-- Pode rodar mais de uma vez. Precisa da 0031 (jogatinas).
-- =================================================================================================================

create table if not exists public.channel_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 100),
  kind text not null default 'live' check (kind in ('live', 'jogatina', 'awards', 'estreia', 'outro')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  link text check (link is null or (char_length(link) <= 300 and link ~* '^https?://')),
  game_id text references public.games (id) on delete set null,
  note text check (char_length(note) <= 300),
  canceled boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index if not exists channel_events_starts on public.channel_events (starts_at);
alter table public.channel_events enable row level security;
revoke all on public.channel_events from anon, authenticated;

-- A agenda: de ontem até p_days dias para a frente. Itens: {id, source, kind, title, startsAt, endsAt, link, game, note, canceled}.
create or replace function public.event_agenda(p_days integer default 90) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x.j order by x.at), '[]'::jsonb) from (
    select e.starts_at as at, jsonb_build_object('id', e.id, 'source', 'canal', 'kind', e.kind, 'title', e.title, 'startsAt', e.starts_at, 'endsAt', e.ends_at,
      'link', e.link, 'game', case when e.game_id is null then null else public.game_json(e.game_id) end, 'note', e.note, 'canceled', e.canceled) as j
    from channel_events e
    where e.starts_at > now() - interval '1 day' and e.starts_at < now() + make_interval(days => greatest(1, least(366, coalesce(p_days, 90))))
    union all
    select j.starts_at, jsonb_build_object('id', j.id, 'source', 'jogatina', 'kind', 'jogatina', 'title', j.title, 'startsAt', j.starts_at,
      'endsAt', j.starts_at + make_interval(mins => j.duration_min), 'link', '/jogatina/' || j.id, 'game', public.game_json(j.game_id), 'note', nullif(left(j.description, 300), ''), 'canceled', false)
    from jogatinas j
    where j.canceled_at is null and not j.mod_hidden and j.access = 'aberto'
      and j.starts_at > now() - interval '1 day' and j.starts_at < now() + make_interval(days => greatest(1, least(366, coalesce(p_days, 90))))
      and (exists (select 1 from communities c where c.id = j.community_id and c.official)
           or exists (select 1 from profiles p where p.id = j.created_by and p.is_admin))
  ) x;
$$;

-- Studio: cria ou edita um evento do canal. p: {id?, title, kind, startsAt, endsAt?, link?, gameId?, note?, canceled?}
create or replace function public.studio_event_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text := coalesce(nullif(p ->> 'kind', ''), 'live'); st timestamptz := nullif(p ->> 'startsAt', '')::timestamptz; en timestamptz := nullif(p ->> 'endsAt', '')::timestamptz;
        lk text := nullif(btrim(coalesce(p ->> 'link', '')), ''); g text := nullif(p ->> 'gameId', '');
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if st is null then raise exception 'event_date'; end if;
  if en is not null and en <= st then raise exception 'event_date'; end if;
  if lk is not null and lk !~* '^https?://' then raise exception 'event_link'; end if;
  if g is not null and not exists (select 1 from games where id = g) then g := null; end if;
  if nullif(p ->> 'id', '') is not null then
    update channel_events set title = left(btrim(p ->> 'title'), 100), kind = k, starts_at = st, ends_at = en, link = lk, game_id = g,
      note = nullif(left(btrim(coalesce(p ->> 'note', '')), 300), ''), canceled = coalesce((p ->> 'canceled')::boolean, canceled)
    where id = (p ->> 'id')::uuid;
    if not found then raise exception 'not_found'; end if;
  else
    insert into channel_events (title, kind, starts_at, ends_at, link, game_id, note, created_by)
    values (left(btrim(coalesce(p ->> 'title', '')), 100), k, st, en, lk, g, nullif(left(btrim(coalesce(p ->> 'note', '')), 300), ''), auth.uid());
  end if;
  return public.event_agenda(366);
end; $$;

create or replace function public.studio_event_delete(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  delete from channel_events where id = p_id;
  return public.event_agenda(366);
end; $$;

revoke all on function public.event_agenda(integer) from public;
revoke all on function public.studio_event_save(jsonb) from public, anon;
revoke all on function public.studio_event_delete(uuid) from public, anon;
grant execute on function public.event_agenda(integer) to anon, authenticated;
grant execute on function public.studio_event_save(jsonb) to authenticated;
grant execute on function public.studio_event_delete(uuid) to authenticated;
