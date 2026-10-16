-- 0044 · "O que jogar hoje?": clima de cada jogo, classificado uma vez pela IA e compartilhado por todo mundo.
--
-- game_vibes guarda, por jogo, notas de 0 a 3: relaxa, desafia, intensidade, história e sessões curtas, mais
-- uma frase de como a comunidade vê o jogo. Quem escreve é só o servidor (/api/retomada, kind 'vibes'); quem está
-- logado lê. vibe_calls limita quantos lotes de classificação cada pessoa dispara por dia (não conta no limite
-- mensal da IA, que é das sugestões pessoais).
--
-- Pode rodar mais de uma vez.

create table if not exists public.game_vibes (
  game_id text primary key references public.games(id) on delete cascade,
  relax smallint not null check (relax between 0 and 3),
  challenge smallint not null check (challenge between 0 and 3),
  intensity smallint not null check (intensity between 0 and 3),
  story smallint not null check (story between 0 and 3),
  short smallint not null check (short between 0 and 3),
  note text,
  model text,
  updated_at timestamptz not null default now()
);
alter table public.game_vibes enable row level security;
drop policy if exists "vibes read" on public.game_vibes;
create policy "vibes read" on public.game_vibes for select to authenticated using (true);

create table if not exists public.vibe_calls (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  n integer not null default 0,
  primary key (user_id, day)
);
alter table public.vibe_calls enable row level security;

create or replace function public.vibes_reserve(p_user uuid, p_day date, p_limit integer) returns integer
language sql security definer set search_path = public as $$
  insert into vibe_calls (user_id, day, n) select p_user, p_day, 1 where p_limit > 0
  on conflict (user_id, day) do update set n = vibe_calls.n + 1 where vibe_calls.n < p_limit
  returning n;
$$;
revoke execute on function public.vibes_reserve(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.vibes_reserve(uuid, date, integer) to service_role;
