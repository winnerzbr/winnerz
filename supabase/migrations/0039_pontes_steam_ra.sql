-- =================================================================================================================
-- 0039 · Jornada 2, entrega J4: sessões automáticas pela Steam e pelo RetroAchievements
--
-- 1. Contas ligadas (linked_accounts): a Steam (pelo perfil) e o RetroAchievements (pelo usuário). Quem liga é a
--    própria pessoa; a função /api/pontes (com a chave secreta do servidor) confere a conta e grava.
-- 2. A cada busca, o servidor compara o tempo jogado (Steam) ou lê as conquistas novas (RetroAchievements) e grava
--    sessões inferidas (inferred_sessions). O site registra na Jornada (sozinho, se a pessoa deixou) ou pergunta.
-- 3. A sessão registrada guarda de onde veio (sessions.source) para aparecer "pela Steam" na linha do tempo.
-- 4. "Jogando agora": o que a Steam ou o RetroAchievements disseram na última busca (vale por 20 minutos).
-- Desligar uma ponte apaga a conta ligada, o que foi lido e o que ainda não foi registrado.
--
-- Pode rodar mais de uma vez.
-- =================================================================================================================

alter table public.sessions add column if not exists source text;
do $$ begin
  alter table public.sessions add constraint sessions_source_check check (source in ('steam', 'ra'));
exception when duplicate_object then null; end $$;

create table if not exists public.linked_accounts (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('steam', 'ra')),
  external_id text not null,
  display text,
  auto boolean not null default true,
  created_at timestamptz not null default now(),
  last_sync_at timestamptz,
  last_error text,
  now_playing jsonb,
  now_at timestamptz,
  primary key (user_id, provider)
);
create index if not exists linked_accounts_sync on public.linked_accounts (last_sync_at nulls first);

create table if not exists public.bridge_snapshots (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  ext_game text not null,
  total_minutes integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider, ext_game)
);

-- Jogo da ponte → jogo do WinnerZ, confirmado pela pessoa (no RetroAchievements o nome nem sempre bate).
create table if not exists public.bridge_games (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  ext_game text not null,
  game_id text references public.games (id) on delete cascade,
  primary key (user_id, provider, ext_game)
);

create table if not exists public.inferred_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('steam', 'ra')),
  key text not null,
  ext_game text not null,
  title text not null,
  console text,
  igdb_id integer,
  game_id text references public.games (id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  minutes integer not null check (minutes between 1 and 1440),
  detail text,
  presence text,
  status text not null default 'pendente' check (status in ('pendente', 'registrada', 'ignorada')),
  session_id uuid,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);
create index if not exists inferred_sessions_user on public.inferred_sessions (user_id, status, ended_at desc);

alter table public.linked_accounts enable row level security;
alter table public.bridge_snapshots enable row level security;
alter table public.bridge_games enable row level security;
alter table public.inferred_sessions enable row level security;
revoke all on public.linked_accounts, public.bridge_snapshots, public.bridge_games, public.inferred_sessions from anon, authenticated;

-- Tudo o que o site precisa: as pontes ligadas e o que chegou delas (últimos 60 dias).
create or replace function public.my_bridges() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'accounts', coalesce((select jsonb_agg(jsonb_build_object('provider', a.provider, 'display', a.display, 'auto', a.auto, 'lastSyncAt', a.last_sync_at,
                                                            'error', a.last_error, 'nowPlaying', case when a.now_at > now() - interval '20 minutes' then a.now_playing end) order by a.provider)
                          from linked_accounts a where a.user_id = auth.uid()), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'provider', i.provider, 'extGame', i.ext_game, 'title', i.title, 'console', i.console,
                                                         'igdbId', i.igdb_id, 'gameId', coalesce(m.game_id, i.game_id), 'confirmed', m.game_id is not null,
                                                         'startedAt', i.started_at, 'endedAt', i.ended_at, 'minutes', i.minutes, 'detail', i.detail,
                                                         'presence', i.presence, 'status', i.status, 'sessionId', i.session_id) order by i.ended_at desc)
                       from inferred_sessions i
                       left join bridge_games m on m.user_id = i.user_id and m.provider = i.provider and m.ext_game = i.ext_game
                       where i.user_id = auth.uid() and i.status = 'pendente' and i.ended_at > now() - interval '60 days'), '[]'::jsonb),
    'maps', coalesce((select jsonb_object_agg(b.provider || ':' || b.ext_game, b.game_id) from bridge_games b where b.user_id = auth.uid() and b.game_id is not null), '{}'::jsonb))
  where auth.uid() is not null;
$$;

create or replace function public.bridge_mark(p_id uuid, p_status text, p_session uuid default null, p_game text default null) returns void
language plpgsql security definer set search_path = public as $$
declare it inferred_sessions;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if p_status not in ('registrada', 'ignorada', 'pendente') then raise exception 'bad_status'; end if;
  select * into it from inferred_sessions where id = p_id and user_id = auth.uid();
  if it.id is null then raise exception 'not_found'; end if;
  update inferred_sessions set status = p_status, session_id = coalesce(p_session, session_id), game_id = coalesce(p_game, game_id) where id = p_id;
  -- Registrar confirma o jogo: as próximas sessões deste jogo entram sozinhas.
  if p_status = 'registrada' and p_game is not null and exists (select 1 from games where id = p_game) then
    insert into bridge_games (user_id, provider, ext_game, game_id) values (auth.uid(), it.provider, it.ext_game, p_game)
    on conflict (user_id, provider, ext_game) do update set game_id = excluded.game_id;
  end if;
end; $$;

create or replace function public.bridge_set_auto(p_provider text, p_auto boolean) returns void
language sql security definer set search_path = public as $$
  update linked_accounts set auto = coalesce(p_auto, true) where user_id = auth.uid() and provider = p_provider;
$$;

create or replace function public.bridge_unlink(p_provider text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  delete from linked_accounts where user_id = auth.uid() and provider = p_provider;
  delete from bridge_snapshots where user_id = auth.uid() and provider = p_provider;
  delete from bridge_games where user_id = auth.uid() and provider = p_provider;
  delete from inferred_sessions where user_id = auth.uid() and provider = p_provider and status <> 'registrada';
end; $$;

revoke all on function public.my_bridges() from public, anon;
revoke all on function public.bridge_mark(uuid, text, uuid, text) from public, anon;
revoke all on function public.bridge_set_auto(text, boolean) from public, anon;
revoke all on function public.bridge_unlink(text) from public, anon;
grant execute on function public.my_bridges() to authenticated;
grant execute on function public.bridge_mark(uuid, text, uuid, text) to authenticated;
grant execute on function public.bridge_set_auto(text, boolean) to authenticated;
grant execute on function public.bridge_unlink(text) to authenticated;
