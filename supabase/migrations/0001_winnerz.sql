-- WinnerZ — esquema inicial (Coleção, Jogos, Jornada e Análises)
-- Rode no Supabase: SQL Editor → cole este arquivo → Run.
-- Tudo o que é pessoal fica protegido por RLS: cada pessoa só lê e escreve o que é seu.

create extension if not exists "pgcrypto";

-- Perfil e preferências ---------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Jogador',
  prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Jogos (cache do IGDB, compartilhado) ------------------------------------
create table if not exists public.games (
  id text primary key,                -- slug estável do WinnerZ
  igdb_id integer unique,
  slug text not null unique,
  title text not null,
  cover text,
  backdrop text,
  year integer,
  developer text,
  publisher text,
  platforms text[] not null default '{}',
  genres text,
  summary text,
  summary_source text,
  releases jsonb,
  screenshots text[],
  updated_at timestamptz not null default now()
);

-- Coleção ----------------------------------------------------------------
create table if not exists public.copies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  game_id text not null references public.games (id),
  platform text not null,
  kind text not null check (kind in ('fisico', 'digital', 'assinatura', 'outro')),
  items text,
  condition text,
  origin text,
  note text,
  special boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.wishes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  game_id text not null references public.games (id),
  note text,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create table if not exists public.favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  game_id text not null references public.games (id),
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

-- Jornada ----------------------------------------------------------------
create table if not exists public.journeys (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  game_id text not null references public.games (id),
  mood text not null default 'jogando' check (mood in ('jogando', 'silencioso', 'pausado')),
  paused_note text,
  created_at timestamptz not null default now(),
  unique (user_id, game_id)
);

create table if not exists public.histories (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  journey_id uuid not null references public.journeys (id) on delete cascade,
  ordinal integer not null,
  title text not null,
  state text not null check (state in ('ativa', 'pausada', 'concluida', 'encerrada', 'dropada')),
  started_at timestamptz not null,
  completed_at timestamptz,
  progress smallint check (progress between 0 and 100),
  mode text,
  letter_text text,
  letter_opened_at timestamptz,
  unique (journey_id, ordinal)
);

create table if not exists public.sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  journey_id uuid not null references public.journeys (id) on delete cascade,
  history_id uuid not null references public.histories (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  minutes integer check (minutes >= 0),
  note text,
  where_stopped text,
  feeling text
);
-- No máximo uma sessão aberta por pessoa.
create unique index if not exists sessions_one_open on public.sessions (user_id) where ended_at is null;

create table if not exists public.timeline_events (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  journey_id uuid not null references public.journeys (id) on delete cascade,
  history_id uuid not null references public.histories (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  kind text not null check (kind in ('inicio', 'sessao', 'momento', 'ponto', 'marco', 'carta')),
  at timestamptz not null,
  title text not null,
  text text,
  quote text,
  image text,
  resolved boolean not null default false,
  date_label text
);
create index if not exists timeline_events_journey on public.timeline_events (journey_id, at);

-- Análises (nota normalizada 0..1000 + escala original) -------------------
create table if not exists public.reviews (
  id uuid primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  game_id text not null references public.games (id),
  normalized smallint not null check (normalized between 0 and 1000),
  original_scale text not null check (original_scale in ('TEN_POINT', 'FIVE_STAR')),
  original_value numeric(3, 1) not null,
  title text not null default '',
  text text not null default '',
  context text,
  spoiler boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_id),
  -- a nota original precisa obedecer à grade de meio em meio ponto da escala
  check (
    (original_scale = 'TEN_POINT' and original_value between 0 and 10 and normalized = round(original_value * 100))
    or (original_scale = 'FIVE_STAR' and original_value between 0 and 5 and normalized = round(original_value * 200))
  ),
  check (original_value * 2 = round(original_value * 2))
);

create or replace view public.review_stats with (security_invoker = true) as
select
  game_id,
  count(*)::int as count,
  avg(normalized)::float as avg,
  array[
    count(*) filter (where normalized < 100), count(*) filter (where normalized >= 100 and normalized < 200),
    count(*) filter (where normalized >= 200 and normalized < 300), count(*) filter (where normalized >= 300 and normalized < 400),
    count(*) filter (where normalized >= 400 and normalized < 500), count(*) filter (where normalized >= 500 and normalized < 600),
    count(*) filter (where normalized >= 600 and normalized < 700), count(*) filter (where normalized >= 700 and normalized < 800),
    count(*) filter (where normalized >= 800 and normalized < 900), count(*) filter (where normalized >= 900)
  ]::int[] as dist10
from public.reviews
group by game_id;

-- RLS --------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.copies enable row level security;
alter table public.wishes enable row level security;
alter table public.favorites enable row level security;
alter table public.journeys enable row level security;
alter table public.histories enable row level security;
alter table public.sessions enable row level security;
alter table public.timeline_events enable row level security;
alter table public.reviews enable row level security;

-- Perfis: nome visível para quem está logado (aparece nas análises); preferências só para o dono.
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Jogos: leitura pública; o cache é escrito pela função /api/igdb com a chave de serviço.
drop policy if exists "games read" on public.games;
create policy "games read" on public.games for select using (true);

-- Análises: leitura pública, escrita só da própria.
drop policy if exists "reviews read" on public.reviews;
create policy "reviews read" on public.reviews for select using (true);
drop policy if exists "reviews write own" on public.reviews;
create policy "reviews write own" on public.reviews for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Tudo o que é pessoal: só o dono.
do $$
declare t text;
begin
  foreach t in array array['copies', 'wishes', 'favorites', 'journeys', 'histories', 'sessions', 'timeline_events'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
