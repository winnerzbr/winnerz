-- WinnerZ — Etapa 4: Retomada, companhia na sessão e limite de uso da IA.
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez.

-- Cápsula de Retomada: onde estou, o que fazia, o que fazer depois, não esquecer (por História).
alter table public.histories add column if not exists capsule jsonb;

-- Com quem você jogou (nomes livres, opcionais) em cada sessão.
alter table public.sessions add column if not exists companions text[];

-- Quantas vezes cada pessoa usou a IA no mês (a Retomada Inteligente tem limite mensal).
-- Só o servidor escreve aqui (com a chave secreta); cada pessoa só lê o próprio uso.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null,
  uses integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);
alter table public.ai_usage enable row level security;
drop policy if exists "ai usage own read" on public.ai_usage;
create policy "ai usage own read" on public.ai_usage for select to authenticated using (user_id = auth.uid());


-- Trilhas: sequências de jogos com um fio, montadas pela administração (precisa da 0006, que cria is_admin()).
create table if not exists public.trails (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  intro text,
  published boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.trail_items (
  id uuid primary key default gen_random_uuid(),
  trail_id uuid not null references public.trails (id) on delete cascade,
  game_id text not null references public.games (id),
  note text,
  position integer not null default 0,
  unique (trail_id, game_id)
);
alter table public.trails enable row level security;
alter table public.trail_items enable row level security;
drop policy if exists "trails read" on public.trails;
create policy "trails read" on public.trails for select using (published or public.is_admin());
drop policy if exists "trails admin" on public.trails;
create policy "trails admin" on public.trails for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "trail items read" on public.trail_items;
create policy "trail items read" on public.trail_items for select
  using (exists (select 1 from public.trails t where t.id = trail_id and (t.published or public.is_admin())));
drop policy if exists "trail items admin" on public.trail_items;
create policy "trail items admin" on public.trail_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

notify pgrst, 'reload schema';
