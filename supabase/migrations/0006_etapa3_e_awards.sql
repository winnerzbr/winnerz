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

-- Ligar jogos em lote (0005) passa a levar também os campos novos de my_games.
create or replace function public.relink_games(pairs jsonb) returns integer
language plpgsql security invoker set search_path = public as $$
declare
  me uuid := auth.uid();
  p record;
  jf uuid;
  jt uuid;
  base integer;
  n integer := 0;
begin
  if me is null then raise exception 'precisa estar logado'; end if;
  for p in select * from jsonb_to_recordset(pairs) as x(src text, dst text) loop
    if p.src is null or p.dst is null or p.src = p.dst then continue; end if;
    if not exists (select 1 from games where id = p.dst) then continue; end if;

    update copies set game_id = p.dst where user_id = me and game_id = p.src;

    -- Jornada: se as duas existem, as Histórias da antiga vão para a nova, numeradas depois das dela.
    select id into jf from journeys where user_id = me and game_id = p.src;
    select id into jt from journeys where user_id = me and game_id = p.dst;
    if jf is not null and jt is not null then
      select coalesce(max(ordinal), 0) into base from histories where journey_id = jt;
      update histories set journey_id = jt, ordinal = ordinal + base where journey_id = jf;
      update sessions set journey_id = jt where journey_id = jf;
      update timeline_events set journey_id = jt where journey_id = jf;
      delete from journeys where id = jf;
    elsif jf is not null then
      update journeys set game_id = p.dst where id = jf;
    end if;

    -- Desejo, favorito e nota: se já existem na ficha nova, fica a da ficha nova.
    update wishes set game_id = p.dst where user_id = me and game_id = p.src
      and not exists (select 1 from wishes w where w.user_id = me and w.game_id = p.dst);
    delete from wishes where user_id = me and game_id = p.src;
    update favorites set game_id = p.dst where user_id = me and game_id = p.src
      and not exists (select 1 from favorites f where f.user_id = me and f.game_id = p.dst);
    delete from favorites where user_id = me and game_id = p.src;
    update reviews set game_id = p.dst where user_id = me and game_id = p.src
      and not exists (select 1 from reviews r where r.user_id = me and r.game_id = p.dst);
    delete from reviews where user_id = me and game_id = p.src;

    -- Prioridade, tempo estimado etc.: junta os dois, preferindo o que já estava na ficha nova.
    insert into my_games (user_id, game_id, priority, est_hours, wont_play, genre, note, not_now_until, not_now_reason, steam_minutes, on_radar, updated_at)
      select me, p.dst, priority, est_hours, wont_play, genre, note, not_now_until, not_now_reason, steam_minutes, on_radar, now() from my_games where user_id = me and game_id = p.src
    on conflict (user_id, game_id) do update set
      priority = coalesce(my_games.priority, excluded.priority),
      est_hours = coalesce(my_games.est_hours, excluded.est_hours),
      wont_play = my_games.wont_play or excluded.wont_play,
      genre = coalesce(my_games.genre, excluded.genre),
      note = coalesce(my_games.note, excluded.note),
      not_now_until = coalesce(my_games.not_now_until, excluded.not_now_until),
      not_now_reason = coalesce(my_games.not_now_reason, excluded.not_now_reason),
      steam_minutes = coalesce(my_games.steam_minutes, excluded.steam_minutes),
      on_radar = my_games.on_radar or excluded.on_radar,
      updated_at = now();
    delete from my_games where user_id = me and game_id = p.src;

    -- O jogo sem ficha sai, se ninguém mais o usa (se algo ainda apontar para ele, fica).
    begin
    delete from games g where g.id = p.src and g.source = 'manual' and g.created_by = me
      and not exists (select 1 from copies where game_id = p.src)
      and not exists (select 1 from journeys where game_id = p.src)
      and not exists (select 1 from wishes where game_id = p.src)
      and not exists (select 1 from favorites where game_id = p.src)
      and not exists (select 1 from reviews where game_id = p.src)
      and not exists (select 1 from my_games where game_id = p.src);
    exception when foreign_key_violation then null;
    end;
    n := n + 1;
  end loop;
  return n;
end $$;

grant execute on function public.relink_games(jsonb) to authenticated;

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
    where c.id = cat and a.published and a.voting_opens <= now() and (a.voting_closes is null or a.voting_closes > now())
      and (a.results_at is null or a.results_at > now()));
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

-- Resultado: contagem por indicado, só depois da data de revelação (para todos, administração inclusive). Nunca mostra quem votou em quê.
create or replace function public.award_results(p_award uuid)
returns table (category_id uuid, nominee_id uuid, votes integer)
language sql stable security definer set search_path = public as $$
  select n.category_id, n.id, count(v.user_id)::int
  from award_nominees n
  join award_categories c on c.id = n.category_id
  join awards a on a.id = c.award_id
  left join award_votes v on v.nominee_id = n.id
  where a.id = p_award and a.published and a.results_at is not null and a.results_at <= now()
  group by n.category_id, n.id;
$$;
grant execute on function public.award_results(uuid) to anon, authenticated;
-- Quantas pessoas já votaram (número só, para mostrar na página).
create or replace function public.award_voters(p_award uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(distinct v.user_id)::int from award_votes v join award_categories c on c.id = v.category_id where c.award_id = p_award;
$$;
grant execute on function public.award_voters(uuid) to anon, authenticated;

-- Primeira edição, ainda não publicada: as categorias do The Game Awards (as que premiam jogos).
-- Datas de partida: votação de 1º a 14 de dezembro, resultado em 15 de dezembro às 20h. Tudo editável na tela de administração.
do $$
declare a uuid;
begin
  if not exists (select 1 from public.awards where year = 2026) then
    insert into public.awards (year, title, intro, voting_opens, voting_closes, results_at, published)
    values (2026, 'WinnerZ Awards 2026', 'Os jogos do ano escolhidos por quem joga. Um voto por categoria, uma pessoa por conta.',
            '2026-12-01 00:00-03', '2026-12-14 23:59-03', '2026-12-15 20:00-03', false)
    returning id into a;
    insert into public.award_categories (award_id, name, description, position)
    select a, x.name, x.descr, x.pos from (values
      (1, 'Jogo do Ano', 'O jogo que melhor representou o ano, em tudo.'),
      (2, 'Melhor Direção de Jogo', 'A visão que juntou tudo: ritmo, desenho e intenção.'),
      (3, 'Melhor Narrativa', 'A história mais bem contada.'),
      (4, 'Melhor Direção de Arte', 'O visual mais marcante, por escolha e não só por tecnologia.'),
      (5, 'Melhor Trilha Sonora', 'A música que ficou na cabeça.'),
      (6, 'Melhor Design de Áudio', 'Som, efeitos e mixagem a serviço do jogo.'),
      (7, 'Inovação em Acessibilidade', 'O jogo que abriu a porta para mais gente jogar.'),
      (8, 'Jogos de Impacto', 'Um jogo com mensagem que importa.'),
      (9, 'Melhor Jogo Contínuo', 'O jogo como serviço que mais evoluiu no ano.'),
      (10, 'Melhor Suporte à Comunidade', 'Quem mais ouviu e cuidou de quem joga.'),
      (11, 'Melhor Jogo Independente', 'O melhor jogo de estúdio independente.'),
      (12, 'Melhor Estreia Independente', 'O primeiro jogo de um estúdio independente.'),
      (13, 'Melhor Jogo Mobile', 'O melhor no celular.'),
      (14, 'Melhor Jogo de Realidade Virtual', 'O melhor em realidade virtual ou aumentada.'),
      (15, 'Melhor Jogo de Ação', 'Ação, tiro e combate.'),
      (16, 'Melhor Jogo de Ação e Aventura', 'Ação com exploração e história.'),
      (17, 'Melhor RPG', 'O melhor jogo de RPG.'),
      (18, 'Melhor Jogo de Luta', 'O melhor jogo de luta.'),
      (19, 'Melhor Jogo para a Família', 'O melhor para jogar com todo mundo.'),
      (20, 'Melhor Jogo de Simulação e Estratégia', 'Simulação, estratégia e gerenciamento.'),
      (21, 'Melhor Jogo de Esporte e Corrida', 'Esporte e corrida.'),
      (22, 'Melhor Multijogador', 'A melhor experiência com outras pessoas.'),
      (23, 'Melhor Jogo de E-sports', 'O jogo competitivo do ano.'),
      (24, 'Jogo Mais Aguardado', 'O que ainda vai sair e mais deixa vontade.')
    ) as x(pos, name, descr);
  end if;
end $$;

notify pgrst, 'reload schema';
