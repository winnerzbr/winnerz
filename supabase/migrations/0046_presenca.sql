-- 0046 · Comunidade, entrega F: presença opcional
--
-- "Online agora" e "jogando X agora", só para amigos, só para quem ligou (prefs -> 'comunidade' ->> 'presenca' = 'amigos';
-- padrão desligado). É de mão dupla: quem não mostra a própria presença também não vê a dos outros.
-- Online = o site esteve aberto nos últimos 5 minutos (presence_ping a cada 2 minutos com a aba visível).
-- Jogando = sessão aberta no site há menos de 12 horas, ou o que uma ponte (Steam, RetroAchievements, Playnite) leu
-- nos últimos 20 minutos.
--
-- Pode rodar mais de uma vez.

create table if not exists public.presence (
  user_id uuid primary key references auth.users (id) on delete cascade,
  seen_at timestamptz not null default now()
);
alter table public.presence enable row level security;
revoke all on public.presence from anon, authenticated;

create or replace function public.presence_on(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select prefs -> 'comunidade' ->> 'presenca' from profiles where id = p), 'ninguem') = 'amigos';
$$;

-- O que mostrar de uma pessoa (sem conferir quem pede; quem chama confere).
create or replace function public.presence_json(p uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  with s as (
    select g.id, g.slug, g.title, g.cover, x.started_at as since
    from sessions x join journeys j on j.id = x.journey_id join games g on g.id = j.game_id
    where x.user_id = p and x.ended_at is null and x.started_at > now() - interval '12 hours'
    order by x.started_at desc limit 1
  ), b as (
    select coalesce(g.id, null) as id, g.slug, coalesce(g.title, a.now_playing ->> 'title') as title, g.cover, a.now_at as since, a.provider
    from linked_accounts a left join games g on g.id = a.now_playing ->> 'gameId'
    where a.user_id = p and a.now_playing is not null and a.now_at > now() - interval '20 minutes'
    order by a.now_at desc limit 1
  )
  select jsonb_build_object(
    'online', exists (select 1 from presence where user_id = p and seen_at > now() - interval '5 minutes'),
    'game', coalesce((select jsonb_build_object('id', id, 'slug', slug, 'title', title, 'cover', cover, 'since', since, 'via', 'site') from s),
                     (select jsonb_build_object('id', id, 'slug', slug, 'title', title, 'cover', cover, 'since', since, 'via', provider) from b)));
$$;

create or replace function public.presence_ping() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.presence_on(auth.uid()) then return; end if;
  insert into presence (user_id, seen_at) values (auth.uid(), now()) on conflict (user_id) do update set seen_at = now();
end; $$;

-- Some na hora quando a pessoa desliga.
create or replace function public.presence_off() returns void
language sql security definer set search_path = public as $$ delete from presence where user_id = auth.uid(); $$;

-- Amigos que mostram presença e estão online ou jogando agora (para quem também mostra a sua).
create or replace function public.friends_presence() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by (x -> 'presence' -> 'game') is null, x -> 'person' ->> 'handle'), '[]'::jsonb) from (
    select jsonb_build_object('person', public.person_json(f.followed), 'presence', public.presence_json(f.followed)) x
    from follows f
    where f.follower = auth.uid() and public.presence_on(auth.uid())
      and exists (select 1 from follows r where r.follower = f.followed and r.followed = auth.uid())
      and public.presence_on(f.followed) and not public.blocked_between(auth.uid(), f.followed)
  ) q
  where (x -> 'presence' ->> 'online')::boolean or x -> 'presence' -> 'game' <> 'null'::jsonb;
$$;

-- A presença de uma pessoa pelo @ (perfil, conversa): nula quando não dá para ver.
create or replace function public.presence_of(p_handle text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t uuid;
begin
  select id into t from profiles where handle is not null and lower(handle) = lower(p_handle);
  if t is null or t = auth.uid() or not public.presence_on(auth.uid()) or not public.presence_on(t)
     or not public.are_friends(auth.uid(), t) or public.blocked_between(auth.uid(), t) then return null; end if;
  return public.presence_json(t);
end; $$;

revoke all on function public.presence_on(uuid) from public, anon, authenticated;
revoke all on function public.presence_json(uuid) from public, anon, authenticated;
revoke all on function public.presence_ping() from public, anon;
revoke all on function public.presence_off() from public, anon;
revoke all on function public.friends_presence() from public, anon;
revoke all on function public.presence_of(text) from public, anon;
grant execute on function public.presence_ping() to authenticated;
grant execute on function public.presence_off() to authenticated;
grant execute on function public.friends_presence() to authenticated;
grant execute on function public.presence_of(text) to authenticated;
