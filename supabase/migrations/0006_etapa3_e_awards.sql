-- WinnerZ — Etapa 3 (Descobrir) e WinnerZ Awards.
-- Rode no Supabase (projeto do site): SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez.

-- Jogos: tempo para zerar (horas, média do IGDB) e data de lançamento (para o Radar) ----------
alter table public.games add column if not exists ttb jsonb;          -- {"h": rápido, "n": normal, "c": completo}
alter table public.games add column if not exists released_on date;

-- Seus dados por jogo: "não agora" com prazo, motivo, e horas vindas da Steam ------------------
alter table public.my_games add column if not exists not_now_until date;
alter table public.my_games add column if not exists not_now_reason text;
alter table public.my_games add column if not exists steam_minutes integer check (steam_minutes is null or steam_minutes >= 0);
-- Radar: acompanhar um jogo (lançamento, data, adiamento). Não é posse nem desejo.
alter table public.my_games add column if not exists on_radar boolean not null default false;

-- Administração (só quem tiver is_admin = true monta os Awards) --------------------------------
alter table public.profiles add column if not exists is_admin boolean not null default false;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;
-- Ninguém se promove sozinho: is_admin só muda pelo SQL Editor.
create or replace function public.keep_admin_flag() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_admin is distinct from old.is_admin and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     and auth.uid() is not null then
    new.is_admin := old.is_admin;
  end if;
  return new;
end $$;
drop trigger if exists keep_admin_flag on public.profiles;
create trigger keep_admin_flag before update on public.profiles for each row execute function public.keep_admin_flag();

-- WinnerZ Awards ------------------------------------------------------------------------------------
create table if not exists public.awards (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  title text not null,
  intro text,
  voting_opens timestamptz,
  voting_closes timestamptz,
  results_at timestamptz,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.award_categories (
  id uuid primary key default gen_random_uuid(),
  award_id uuid not null references public.awards (id) on delete cascade,
  name text not null,
  description text,
  position integer not null default 0
);
create table if not exists public.award_nominees (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.award_categories (id) on delete cascade,
  game_id text not null references public.games (id),
  note text,
  position integer not null default 0,
  unique (category_id, game_id)
);
create table if not exists public.award_votes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null references public.award_categories (id) on delete cascade,
  nominee_id uuid not null references public.award_nominees (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

alter table public.awards enable row level security;
alter table public.award_categories enable row level security;
alter table public.award_nominees enable row level security;
alter table public.award_votes enable row level security;

-- Leitura: o que foi publicado, para todos; tudo, para quem administra.
drop policy if exists "awards read" on public.awards;
create policy "awards read" on public.awards for select using (published or public.is_admin());
drop policy if exists "award categories read" on public.award_categories;
create policy "award categories read" on public.award_categories for select
  using (exists (select 1 from public.awards a where a.id = award_id and (a.published or public.is_admin())));
drop policy if exists "award nominees read" on public.award_nominees;
create policy "award nominees read" on public.award_nominees for select
  using (exists (select 1 from public.award_categories c join public.awards a on a.id = c.award_id where c.id = category_id and (a.published or public.is_admin())));

-- Escrita das edições, categorias e indicados: só administração.
drop policy if exists "awards admin" on public.awards;
create policy "awards admin" on public.awards for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "award categories admin" on public.award_categories;
create policy "award categories admin" on public.award_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "award nominees admin" on public.award_nominees;
create policy "award nominees admin" on public.award_nominees for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Votos: cada pessoa vê e muda só o seu, e só com a votação aberta e o indicado da mesma categoria.
create or replace function public.award_voting_open(cat uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from award_categories c join awards a on a.id = c.award_id
    where c.id = cat and a.published and a.voting_opens <= now() and (a.voting_closes is null or a.voting_closes > now()));
$$;
drop policy if exists "votes own read" on public.award_votes;
create policy "votes own read" on public.award_votes for select to authenticated using (user_id = auth.uid());
drop policy if exists "votes own write" on public.award_votes;
create policy "votes own write" on public.award_votes for insert to authenticated
  with check (user_id = auth.uid() and public.award_voting_open(category_id)
    and exists (select 1 from public.award_nominees n where n.id = nominee_id and n.category_id = award_votes.category_id));
drop policy if exists "votes own change" on public.award_votes;
create policy "votes own change" on public.award_votes for update to authenticated
  using (user_id = auth.uid() and public.award_voting_open(category_id))
  with check (user_id = auth.uid() and public.award_voting_open(category_id)
    and exists (select 1 from public.award_nominees n where n.id = nominee_id and n.category_id = award_votes.category_id));
drop policy if exists "votes own delete" on public.award_votes;
create policy "votes own delete" on public.award_votes for delete to authenticated using (user_id = auth.uid() and public.award_voting_open(category_id));

-- Resultado: contagem por indicado, só depois da data de revelação (ou para administração). Nunca mostra quem votou em quê.
create or replace function public.award_results(p_award uuid)
returns table (category_id uuid, nominee_id uuid, votes integer)
language sql stable security definer set search_path = public as $$
  select n.category_id, n.id, count(v.user_id)::int
  from award_nominees n
  join award_categories c on c.id = n.category_id
  join awards a on a.id = c.award_id
  left join award_votes v on v.nominee_id = n.id
  where a.id = p_award and a.published and (public.is_admin() or (a.results_at is not null and a.results_at <= now()))
  group by n.category_id, n.id;
$$;
grant execute on function public.award_results(uuid) to anon, authenticated;
-- Quantas pessoas já votaram (número só, para mostrar na página).
create or replace function public.award_voters(p_award uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(distinct v.user_id)::int from award_votes v join award_categories c on c.id = v.category_id where c.award_id = p_award;
$$;
grant execute on function public.award_voters(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
