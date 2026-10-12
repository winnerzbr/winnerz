-- WinnerZ — Etapa 2: ids próprios, datas com precisão, ficha da cópia, seus dados por jogo e métricas anônimas.
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez sem problema.

-- Jogos ---------------------------------------------------------------------
-- O id do jogo deixa de depender do slug do IGDB: fichas novas do IGDB ganham "igdb-<número>",
-- e jogos que não existem no IGDB (ou que você cadastra à mão) ganham "wz-<código>".
alter table public.games add column if not exists source text not null default 'igdb';
alter table public.games add column if not exists created_by uuid references auth.users (id) on delete set null;
do $$ begin
  alter table public.games add constraint games_source_check check (source in ('igdb', 'manual'));
exception when duplicate_object then null; end $$;

drop policy if exists "games insert manual" on public.games;
create policy "games insert manual" on public.games for insert to authenticated
  with check (source = 'manual' and igdb_id is null and created_by = auth.uid());
drop policy if exists "games update manual" on public.games;
create policy "games update manual" on public.games for update to authenticated
  using (source = 'manual' and created_by = auth.uid()) with check (source = 'manual' and created_by = auth.uid());
drop policy if exists "games delete manual" on public.games;
create policy "games delete manual" on public.games for delete to authenticated
  using (source = 'manual' and created_by = auth.uid());

-- Datas com precisão ----------------------------------------------------------
-- dia | mes | ano | aprox (por volta de) | desconhecida
alter table public.histories add column if not exists started_precision text not null default 'dia';
alter table public.histories add column if not exists completed_precision text not null default 'dia';
alter table public.histories add column if not exists hours numeric(6, 1);
alter table public.histories add column if not exists note text;
alter table public.timeline_events add column if not exists date_precision text not null default 'dia';
do $$ begin
  alter table public.histories add constraint histories_started_precision_check check (started_precision in ('dia', 'mes', 'ano', 'aprox', 'desconhecida'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.histories add constraint histories_completed_precision_check check (completed_precision in ('dia', 'mes', 'ano', 'aprox', 'desconhecida'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.histories add constraint histories_hours_check check (hours is null or hours >= 0);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.timeline_events add constraint timeline_events_precision_check check (date_precision in ('dia', 'mes', 'ano', 'aprox', 'desconhecida'));
exception when duplicate_object then null; end $$;

-- Ficha completa da cópia ------------------------------------------------------
alter table public.copies add column if not exists region text;
alter table public.copies add column if not exists edition text;
alter table public.copies add column if not exists box_condition text;
alter table public.copies add column if not exists purchased_on date;
alter table public.copies add column if not exists purchase_place text;
alter table public.copies add column if not exists price_paid numeric(10, 2);
alter table public.copies add column if not exists price_now numeric(10, 2);

-- Seus dados por jogo: prioridade, tempo estimado, "não vou jogar", seu gênero ------
create table if not exists public.my_games (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  priority smallint check (priority between 1 and 3),
  est_hours numeric(6, 1) check (est_hours is null or est_hours >= 0),
  wont_play boolean not null default false,
  genre text,
  note text,
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);
alter table public.my_games enable row level security;
drop policy if exists "own rows" on public.my_games;
create policy "own rows" on public.my_games for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Métricas de uso anônimas: só o nome do recurso e o dia. Nenhum dado da pessoa. ----
create table if not exists public.usage_counts (
  id bigint generated always as identity primary key,
  event text not null check (char_length(event) between 1 and 60),
  day date not null default current_date
);
alter table public.usage_counts enable row level security;
drop policy if exists "count only" on public.usage_counts;
create policy "count only" on public.usage_counts for insert to anon, authenticated with check (day = current_date);
-- Para ver: select event, count(*) from usage_counts where day > current_date - 30 group by 1 order by 2 desc;

-- Avisa a API do Supabase que o esquema mudou (sem isso, as tabelas novas podem demorar a aparecer).
notify pgrst, 'reload schema';
