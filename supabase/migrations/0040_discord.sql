-- =================================================================================================================
-- 0040 · Jornada 2, entrega J5: Discord
--
-- 1. Conta do Discord ligada à do WinnerZ (discord_links), pelo login do Discord (/api/discord). Os tokens do
--    Discord ficam numa tabela que só o servidor lê (discord_tokens); servem para atualizar os cargos ligados.
-- 2. O que o bot publica no canal, só se a pessoa escolher: sessões (jogo e duração), zerados e jogatinas abertas.
--    discord_posts evita publicar a mesma coisa duas vezes.
-- 3. Jogatina aberta vira evento do servidor (jogatinas.discord_event_id).
-- 4. Funções só do servidor (chave secreta): fechar a sessão pelo /parei, ver o que a pessoa está jogando, listar
--    jogatinas, montar o que publicar e os números dos cargos ligados.
--
-- Pode rodar mais de uma vez.
-- =================================================================================================================

create table if not exists public.discord_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  discord_id text not null unique,
  username text,
  avatar text,
  share_sessions boolean not null default false,
  share_done boolean not null default false,
  share_jogatinas boolean not null default false,
  linked_at timestamptz not null default now(),
  roles_at timestamptz
);
create table if not exists public.discord_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz not null
);
create table if not exists public.discord_posts (
  kind text not null,
  ref text not null,
  user_id uuid references auth.users (id) on delete cascade,
  posted_at timestamptz not null default now(),
  primary key (kind, ref)
);
alter table public.jogatinas add column if not exists discord_event_id text;

alter table public.discord_links enable row level security;
alter table public.discord_tokens enable row level security;
alter table public.discord_posts enable row level security;
revoke all on public.discord_links, public.discord_tokens, public.discord_posts from anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Para o site (com login)
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.my_discord() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('linked', true, 'username', d.username, 'avatar', d.avatar, 'shareSessions', d.share_sessions,
                                             'shareDone', d.share_done, 'shareJogatinas', d.share_jogatinas, 'linkedAt', d.linked_at)
                   from discord_links d where d.user_id = auth.uid()), jsonb_build_object('linked', false))
  where auth.uid() is not null;
$$;

create or replace function public.discord_set_share(p_sessions boolean, p_done boolean, p_jogatinas boolean) returns void
language sql security definer set search_path = public as $$
  update discord_links set share_sessions = coalesce(p_sessions, share_sessions), share_done = coalesce(p_done, share_done),
                           share_jogatinas = coalesce(p_jogatinas, share_jogatinas)
  where user_id = auth.uid();
$$;

create or replace function public.discord_unlink() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  delete from discord_tokens where user_id = auth.uid();
  delete from discord_links where user_id = auth.uid();
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Só do servidor
-- ---------------------------------------------------------------------------------------------------------------
-- /parei: fecha a sessão aberta de quem ligou o Discord, com onde parou e recado opcionais.
create or replace function public.discord_finish_session(p_discord text, p_where text default null, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid; s sessions; n integer; mins integer; title text; w text := nullif(left(btrim(coalesce(p_where, '')), 140), ''); nt text := nullif(left(btrim(coalesce(p_note, '')), 500), '');
begin
  select user_id into uid from discord_links where discord_id = p_discord;
  if uid is null then return jsonb_build_object('error', 'nao_ligado'); end if;
  select * into s from sessions where user_id = uid and ended_at is null order by started_at desc limit 1;
  if s.id is null then return jsonb_build_object('error', 'sem_sessao'); end if;
  update sessions set ended_at = now(), where_stopped = coalesce(w, where_stopped), note = coalesce(nt, note) where id = s.id;
  select minutes into mins from sessions where id = s.id;
  select count(*) into n from sessions where history_id = s.history_id and started_at <= s.started_at;
  insert into timeline_events (id, user_id, journey_id, history_id, session_id, kind, at, title, text, quote)
  values (gen_random_uuid(), uid, s.journey_id, s.history_id, s.id, 'sessao', now(), 'Sessão ' || n,
          concat_ws(' ', case when w is not null then 'Parou em: ' || w || '.' end, 'Fechada pelo Discord.'), nt);
  select g.title into title from journeys j join games g on g.id = j.game_id where j.id = s.journey_id;
  return jsonb_build_object('game', title, 'minutes', mins, 'n', n, 'where', w);
end; $$;

-- /jogando: a sessão aberta (ou a última) de quem ligou o Discord.
create or replace function public.discord_now(p_discord text) returns jsonb
language sql stable security definer set search_path = public as $$
  with u as (select user_id from discord_links where discord_id = p_discord)
  select case when not exists (select 1 from u) then jsonb_build_object('error', 'nao_ligado') else jsonb_build_object(
    'open', (select jsonb_build_object('game', g.title, 'slug', g.slug, 'since', s.started_at)
             from sessions s join journeys j on j.id = s.journey_id join games g on g.id = j.game_id
             where s.user_id = (select user_id from u) and s.ended_at is null order by s.started_at desc limit 1),
    'last', (select jsonb_build_object('game', g.title, 'slug', g.slug, 'at', s.ended_at, 'minutes', s.minutes, 'where', s.where_stopped)
             from sessions s join journeys j on j.id = s.journey_id join games g on g.id = j.game_id
             where s.user_id = (select user_id from u) and s.ended_at is not null order by s.ended_at desc limit 1)) end;
$$;

-- /jogatina: as próximas jogatinas abertas.
create or replace function public.discord_jogatinas() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'title', x.title, 'game', x.game, 'startsAt', x.starts_at, 'platform', x.platform) order by x.starts_at), '[]'::jsonb)
  from (select j.id, j.title, g.title game, j.starts_at, j.platform from jogatinas j join games g on g.id = j.game_id
        where j.access = 'aberto' and j.canceled_at is null and not j.mod_hidden
          and j.starts_at + make_interval(mins => j.duration_min) > now()
        order by j.starts_at limit 6) x;
$$;

-- O que publicar no canal. Confere dono, escolha da pessoa e se já foi publicado (aí devolve null).
create or replace function public.discord_publish_info(p_user uuid, p_kind text, p_ref uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d discord_links; handle text; out jsonb;
begin
  select * into d from discord_links where user_id = p_user;
  if d.user_id is null then return null; end if;
  select coalesce(p.handle, p.display_name) into handle from profiles p where p.id = p_user;
  if p_kind = 'sessao' and d.share_sessions then
    select jsonb_build_object('kind', 'sessao', 'handle', handle, 'discordId', d.discord_id, 'game', g.title, 'slug', g.slug, 'cover', g.cover, 'minutes', s.minutes)
      into out from sessions s join journeys j on j.id = s.journey_id join games g on g.id = j.game_id
      where s.id = p_ref and s.user_id = p_user and s.ended_at is not null and s.ended_at > now() - interval '2 days';
  elsif p_kind = 'zerou' and d.share_done then
    select jsonb_build_object('kind', 'zerou', 'handle', handle, 'discordId', d.discord_id, 'game', g.title, 'slug', g.slug, 'cover', g.cover, 'ordinal', h.ordinal)
      into out from histories h join journeys j on j.id = h.journey_id join games g on g.id = j.game_id
      where h.id = p_ref and h.user_id = p_user and h.state = 'concluida';
  elsif p_kind = 'jogatina' and d.share_jogatinas then
    select jsonb_build_object('kind', 'jogatina', 'handle', handle, 'discordId', d.discord_id, 'id', x.id, 'title', x.title, 'description', x.description, 'game', g.title,
                              'cover', g.cover, 'startsAt', x.starts_at, 'durationMin', x.duration_min, 'platform', x.platform)
      into out from jogatinas x join games g on g.id = x.game_id
      where x.id = p_ref and x.created_by = p_user and x.access = 'aberto' and x.canceled_at is null and not x.mod_hidden and x.starts_at > now();
  end if;
  if out is null then return null; end if;
  insert into discord_posts (kind, ref, user_id) values (p_kind, p_ref::text, p_user) on conflict do nothing;
  if not found then return null; end if;
  return out;
end; $$;

-- Os números dos cargos ligados.
create or replace function public.discord_role_stats(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'handle', (select coalesce(handle, display_name) from profiles where id = p_user),
    'zerados', (select count(*) from histories where user_id = p_user and state = 'concluida'),
    'sessoes30', (select count(*) from sessions where user_id = p_user and ended_at > now() - interval '30 days'),
    'desde', (select created_at from profiles where id = p_user));
$$;

revoke all on function public.my_discord() from public, anon;
revoke all on function public.discord_set_share(boolean, boolean, boolean) from public, anon;
revoke all on function public.discord_unlink() from public, anon;
grant execute on function public.my_discord() to authenticated;
grant execute on function public.discord_set_share(boolean, boolean, boolean) to authenticated;
grant execute on function public.discord_unlink() to authenticated;
revoke all on function public.discord_finish_session(text, text, text) from public, anon, authenticated;
revoke all on function public.discord_now(text) from public, anon, authenticated;
revoke all on function public.discord_jogatinas() from public, anon, authenticated;
revoke all on function public.discord_publish_info(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.discord_role_stats(uuid) from public, anon, authenticated;
do $$ begin
  grant execute on function public.discord_finish_session(text, text, text) to service_role;
  grant execute on function public.discord_now(text) to service_role;
  grant execute on function public.discord_jogatinas() to service_role;
  grant execute on function public.discord_publish_info(uuid, text, uuid) to service_role;
  grant execute on function public.discord_role_stats(uuid) to service_role;
exception when undefined_object then null; end $$;
