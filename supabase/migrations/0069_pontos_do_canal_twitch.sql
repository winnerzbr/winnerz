-- =================================================================================================================
-- 0069 · Etapa 7, E7.3: pontos do canal na Twitch
--
-- Quem liga a conta da Twitch nas Preferências (login pela própria Twitch) e resgata a recompensa do canal
-- ("Figurinha WinnerZ", com pontos do canal) ganha um pacote no Álbum. A Twitch avisa o servidor (EventSub, assinado);
-- o servidor confere a assinatura e entrega. Resgate de quem ainda não ligou a conta fica guardado 30 dias e chega
-- quando a pessoa ligar. No máximo 5 pacotes por dia por pessoa por esse caminho.
-- twitch_channel guarda a autorização do canal (a conta do canal autoriza uma vez, no Studio) e a inscrição.
-- Pode rodar mais de uma vez. Precisa da 0053 e da 0066.
-- =================================================================================================================

do $$
declare c text;
begin
  for c in select conname from pg_constraint where conrelid = 'public.album_packs'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%origin%' loop
    execute format('alter table public.album_packs drop constraint %I', c);
  end loop;
  alter table public.album_packs add constraint album_packs_origin_check check (origin in ('jornada', 'memoria', 'studio', 'boas_vindas', 'codigo', 'twitch'));
end $$;

create table if not exists public.twitch_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  twitch_id text not null unique check (twitch_id ~ '^[0-9]{1,20}$'),
  login text not null check (char_length(login) between 1 and 40),
  display text check (char_length(display) <= 60),
  linked_at timestamptz not null default now()
);
alter table public.twitch_links enable row level security;
revoke all on public.twitch_links from anon, authenticated;

create table if not exists public.twitch_channel (
  id smallint primary key default 1 check (id = 1),
  broadcaster_id text check (broadcaster_id ~ '^[0-9]{1,20}$'),
  broadcaster_login text check (char_length(broadcaster_login) <= 40),
  reward_title text not null default 'Figurinha WinnerZ' check (char_length(reward_title) between 1 and 45),
  pack_kind text not null default 'onix' check (pack_kind in ('onix', 'prisma')),
  sub_id text check (char_length(sub_id) <= 80),
  sub_status text check (char_length(sub_status) <= 60),
  updated_at timestamptz not null default now()
);
alter table public.twitch_channel enable row level security;
revoke all on public.twitch_channel from anon, authenticated;

create table if not exists public.twitch_redemptions (
  id text primary key check (char_length(id) between 1 and 80),
  twitch_user_id text not null check (twitch_user_id ~ '^[0-9]{1,20}$'),
  twitch_login text check (char_length(twitch_login) <= 40),
  reward_title text check (char_length(reward_title) <= 60),
  at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  pack_id uuid references public.album_packs (id) on delete set null,
  state text not null default 'pendente' check (state in ('entregue', 'pendente', 'limite'))
);
create index if not exists twitch_redemptions_pending on public.twitch_redemptions (twitch_user_id, at) where state = 'pendente';
create index if not exists twitch_redemptions_recent on public.twitch_redemptions (at desc);
alter table public.twitch_redemptions enable row level security;
revoke all on public.twitch_redemptions from anon, authenticated;

-- Entrega um resgate para a pessoa (dentro do limite do dia). Devolve o estado.
create or replace function public.twitch_deliver(p_id text) returns text
language plpgsql security definer set search_path = public as $$
declare r twitch_redemptions; u uuid; p album_packs; k text := coalesce((select pack_kind from twitch_channel where id = 1), 'onix');
begin
  select * into r from twitch_redemptions where id = p_id for update;
  if not found or r.state = 'entregue' then return coalesce(r.state, 'nada'); end if;
  select user_id into u from twitch_links where twitch_id = r.twitch_user_id;
  if u is null then return 'pendente'; end if;
  if (select count(*) from album_packs where user_id = u and origin = 'twitch' and created_at > now() - interval '1 day') >= 5 then
    update twitch_redemptions set user_id = u, state = 'limite' where id = r.id;
    return 'limite';
  end if;
  insert into album_packs (user_id, kind, origin, state, reason) values (u, k, 'twitch', 'fechado', left('Pontos do canal na Twitch: ' || coalesce(r.reward_title, 'Figurinha WinnerZ'), 200))
  returning * into p;
  update twitch_redemptions set user_id = u, pack_id = p.id, state = 'entregue' where id = r.id;
  perform public.notif_add(u, 'album_pacote', null, null, p.id, 'Você ganhou um pacote pela Twitch', 'Resgate com pontos do canal: ' || coalesce(r.reward_title, 'Figurinha WinnerZ') || '.',
    '/album/pacotes', jsonb_build_object('kind', k));
  return 'entregue';
end; $$;

-- Servidor: um resgate chegou da Twitch (repetido não conta de novo).
create or replace function public.twitch_redeemed(p_id text, p_twitch_user text, p_login text, p_reward text, p_at timestamptz) returns text
language plpgsql security definer set search_path = public as $$
begin
  insert into twitch_redemptions (id, twitch_user_id, twitch_login, reward_title, at)
  values (left(p_id, 80), p_twitch_user, left(p_login, 40), left(p_reward, 60), coalesce(p_at, now()))
  on conflict (id) do nothing;
  if not found then return 'repetido'; end if;
  return public.twitch_deliver(left(p_id, 80));
end; $$;

-- Servidor: a pessoa ligou a conta da Twitch (pelo login da Twitch). Entrega o que ficou guardado nos últimos 30 dias.
create or replace function public.twitch_link_set(p_user uuid, p_twitch_id text, p_login text, p_display text) returns integer
language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  if exists (select 1 from twitch_links where twitch_id = p_twitch_id and user_id <> p_user) then raise exception 'twitch_taken'; end if;
  insert into twitch_links (user_id, twitch_id, login, display, linked_at) values (p_user, p_twitch_id, left(p_login, 40), left(p_display, 60), now())
  on conflict (user_id) do update set twitch_id = excluded.twitch_id, login = excluded.login, display = excluded.display, linked_at = now();
  for r in select id from twitch_redemptions where twitch_user_id = p_twitch_id and state in ('pendente', 'limite') and at > now() - interval '30 days' order by at limit 10 loop
    if public.twitch_deliver(r.id) = 'entregue' then n := n + 1; end if;
  end loop;
  return n;
end; $$;

-- A conta da Twitch da pessoa (para as Preferências).
create or replace function public.my_twitch() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'linked', (select jsonb_build_object('login', t.login, 'display', t.display, 'at', t.linked_at) from twitch_links t where t.user_id = auth.uid()),
    'reward', (select reward_title from twitch_channel where id = 1),
    'channel', (select broadcaster_login from twitch_channel where id = 1 and broadcaster_id is not null),
    'packs', (select count(*) from album_packs where user_id = auth.uid() and origin = 'twitch'))
  where auth.uid() is not null;
$$;

create or replace function public.twitch_unlink() returns void
language sql security definer set search_path = public as $$
  delete from twitch_links where user_id = auth.uid();
$$;

-- Studio: a ligação do canal e os últimos resgates.
create or replace function public.studio_twitch() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return jsonb_build_object(
    'channel', (select jsonb_build_object('login', c.broadcaster_login, 'authorized', c.broadcaster_id is not null, 'rewardTitle', c.reward_title, 'packKind', c.pack_kind,
                                          'subStatus', c.sub_status, 'updatedAt', c.updated_at) from twitch_channel c where c.id = 1),
    'links', (select count(*) from twitch_links),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('login', r.twitch_login, 'reward', r.reward_title, 'at', r.at, 'state', r.state,
                                                        'handle', (select handle from profiles where id = r.user_id)) order by r.at desc)
                        from (select * from twitch_redemptions order by at desc limit 30) r), '[]'::jsonb));
end; $$;

create or replace function public.studio_twitch_set(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t text := btrim(coalesce(p ->> 'rewardTitle', ''));
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if char_length(t) < 1 then raise exception 'twitch_reward'; end if;
  insert into twitch_channel (id, reward_title, pack_kind, updated_at) values (1, left(t, 45), case when p ->> 'packKind' = 'prisma' then 'prisma' else 'onix' end, now())
  on conflict (id) do update set reward_title = excluded.reward_title, pack_kind = excluded.pack_kind, updated_at = now();
  return public.studio_twitch();
end; $$;

revoke all on function public.twitch_deliver(text) from public, anon, authenticated;
revoke all on function public.twitch_redeemed(text, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.twitch_link_set(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.my_twitch() from public, anon;
revoke all on function public.twitch_unlink() from public, anon;
revoke all on function public.studio_twitch() from public, anon;
revoke all on function public.studio_twitch_set(jsonb) from public, anon;
grant execute on function public.twitch_redeemed(text, text, text, text, timestamptz) to service_role;
grant execute on function public.twitch_link_set(uuid, text, text, text) to service_role;
grant execute on function public.twitch_deliver(text) to service_role;
grant execute on function public.my_twitch() to authenticated;
grant execute on function public.twitch_unlink() to authenticated;
grant execute on function public.studio_twitch() to authenticated;
grant execute on function public.studio_twitch_set(jsonb) to authenticated;
