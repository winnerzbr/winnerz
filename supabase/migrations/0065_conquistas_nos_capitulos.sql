-- =================================================================================================================
-- 0065 · C3: onde a pessoa está, pelas conquistas (Steam e RetroAchievements)
--
-- 1. game_achievement_links: para cada jogo com lista, a IA liga as conquistas de história ao item da lista em que a
--    pessoa fica depois de desbloquear cada uma. Uma vez por jogo (por versão: o app da Steam ou o jogo do
--    RetroAchievements), serve para todo mundo. A comunidade corrige no editor ('pessoa'), e a IA não refaz por cima;
--    part_id vazio quer dizer "esta conquista não indica capítulo".
-- 2. game_achievement_jobs: cada tentativa automática e o limite do dia (feito pelo servidor, com a chave secreta).
-- 3. bridge_part_moves: na leitura das Pontes, cada conquista ligada que a pessoa desbloqueou vira um avanço com a
--    data real. Quem aplica na História é o site (nunca volta para trás e nunca passa por cima de uma marca mais nova
--    da pessoa); depois marca como visto.
-- Desligar a ponte esconde os avanços dela; apagar a conta apaga tudo. Pode rodar mais de uma vez. Precisa da 0039,
-- da 0058 e da 0060.
-- =================================================================================================================

create table if not exists public.game_achievement_links (
  game_id text not null references public.games (id) on delete cascade,
  provider text not null check (provider in ('steam', 'ra')),
  ach_key text not null check (char_length(ach_key) between 1 and 160),
  ext_game text not null check (char_length(ext_game) between 1 and 40),
  name text not null check (char_length(name) between 1 and 120),
  part_id text check (char_length(part_id) between 1 and 40),
  origin text not null default 'ia' check (origin in ('ia', 'pessoa')),
  changed_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (game_id, provider, ach_key)
);
create index if not exists game_achievement_links_ext on public.game_achievement_links (provider, ext_game);
alter table public.game_achievement_links enable row level security;
revoke all on public.game_achievement_links from anon, authenticated;

create table if not exists public.game_achievement_jobs (
  game_id text not null references public.games (id) on delete cascade,
  provider text not null check (provider in ('steam', 'ra')),
  ext_game text not null check (char_length(ext_game) between 1 and 40),
  state text not null default 'rodando' check (state in ('rodando', 'feito', 'sem_conquistas', 'erro')),
  tries integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  note text check (char_length(note) <= 200),
  primary key (game_id, provider, ext_game)
);
create index if not exists game_achievement_jobs_started on public.game_achievement_jobs (started_at desc);
alter table public.game_achievement_jobs enable row level security;
revoke all on public.game_achievement_jobs from anon, authenticated;

create table if not exists public.bridge_part_moves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  provider text not null check (provider in ('steam', 'ra')),
  ach_key text not null check (char_length(ach_key) between 1 and 160),
  part_id text not null check (char_length(part_id) between 1 and 40),
  name text check (char_length(name) <= 120),
  at timestamptz not null,
  seen boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, game_id, provider, ach_key)
);
create index if not exists bridge_part_moves_pending on public.bridge_part_moves (user_id) where not seen;
alter table public.bridge_part_moves enable row level security;
revoke all on public.bridge_part_moves from anon, authenticated;

-- Os avanços que ainda esperam o site (só das pontes que continuam ligadas).
create or replace function public.my_part_moves() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'gameId', m.game_id, 'provider', m.provider, 'partId', m.part_id, 'name', m.name, 'at', m.at)
                            order by m.at), '[]'::jsonb)
  from bridge_part_moves m
  where m.user_id = auth.uid() and not m.seen
    and exists (select 1 from linked_accounts a where a.user_id = m.user_id and a.provider = m.provider);
$$;

create or replace function public.part_moves_done(p_ids uuid[]) returns void
language sql security definer set search_path = public as $$
  update bridge_part_moves set seen = true where user_id = auth.uid() and id = any (coalesce(p_ids, '{}'));
$$;

-- As ligações do jogo, para o painel "Conquistas ligadas" da lista.
create or replace function public.achievement_links(p_game text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'links', coalesce((select jsonb_agg(jsonb_build_object('provider', l.provider, 'key', l.ach_key, 'name', l.name, 'partId', l.part_id, 'origin', l.origin)
                                        order by l.provider, l.name)
                       from game_achievement_links l where l.game_id = p_game), '[]'::jsonb),
    'job', (select j.state from game_achievement_jobs j where j.game_id = p_game order by j.started_at desc limit 1),
    'canEdit', public.outline_can_edit(p_game),
    'bridges', coalesce((select jsonb_agg(a.provider) from linked_accounts a where a.user_id = auth.uid() and a.provider in ('steam', 'ra')), '[]'::jsonb))
  where auth.uid() is not null;
$$;

-- Correção da comunidade: troca o item ligado (ou desliga, com p_part vazio). A IA não refaz por cima.
create or replace function public.achievement_link_set(p_game text, p_provider text, p_key text, p_part text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare part text := nullif(btrim(coalesce(p_part, '')), '');
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if not public.outline_can_edit(p_game) then raise exception 'outline_forbidden'; end if;
  if part is not null and not exists (select 1 from game_outlines o, jsonb_array_elements(o.parts) x where o.game_id = p_game and x ->> 'id' = part) then
    raise exception 'achievement_part';
  end if;
  if not public.is_admin() and (select count(*) from game_achievement_links where changed_by = auth.uid() and updated_at > now() - interval '1 day') >= 80 then
    raise exception 'achievement_limit';
  end if;
  update game_achievement_links set part_id = part, origin = 'pessoa', changed_by = auth.uid(), updated_at = now()
  where game_id = p_game and provider = p_provider and ach_key = p_key;
  if not found then raise exception 'achievement_missing'; end if;
  return public.achievement_links(p_game);
end; $$;

-- Servidor (chave secreta): começa a ligação automática. 'ok' para seguir; 'pronto' se já tem ligações;
-- 'sem_lista' se o jogo ainda não tem lista; 'rodando'; 'desistiu' (tentou há pouco); 'limite' (do dia).
create or replace function public.achievement_job_start(p_game text, p_provider text, p_ext text, p_limit integer, p_force boolean) returns text
language plpgsql security definer set search_path = public as $$
declare j game_achievement_jobs; today integer;
begin
  if not exists (select 1 from game_outlines where game_id = p_game and jsonb_array_length(parts) > 1) then return 'sem_lista'; end if;
  if not coalesce(p_force, false) and exists (select 1 from game_achievement_links where game_id = p_game and provider = p_provider and ext_game = p_ext) then return 'pronto'; end if;
  select * into j from game_achievement_jobs where game_id = p_game and provider = p_provider and ext_game = p_ext for update;
  if found then
    if j.state = 'rodando' and j.started_at > now() - interval '3 minutes' then return 'rodando'; end if;
    if not coalesce(p_force, false) then
      if j.state = 'erro' and j.finished_at > now() - interval '1 hour' then return 'desistiu'; end if;
      if j.state = 'sem_conquistas' and j.finished_at > now() - interval '14 days' then return 'desistiu'; end if;
      if j.state = 'feito' then return 'pronto'; end if;
    end if;
  end if;
  select count(*) into today from game_achievement_jobs where started_at > date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  if today >= greatest(1, coalesce(p_limit, 30)) then return 'limite'; end if;
  insert into game_achievement_jobs (game_id, provider, ext_game, state, tries, started_at, finished_at) values (p_game, p_provider, p_ext, 'rodando', 1, now(), null)
  on conflict (game_id, provider, ext_game) do update set state = 'rodando', tries = game_achievement_jobs.tries + 1, started_at = now(), finished_at = null, note = null;
  return 'ok';
end; $$;

create or replace function public.achievement_job_finish(p_game text, p_provider text, p_ext text, p_state text, p_note text default null) returns void
language sql security definer set search_path = public as $$
  update game_achievement_jobs set state = case when p_state in ('feito', 'sem_conquistas', 'erro') then p_state else 'erro' end, finished_at = now(), note = left(p_note, 200)
  where game_id = p_game and provider = p_provider and ext_game = p_ext;
$$;

-- Servidor: guarda as ligações da IA. p_rows: [{key, name, partId}] (partId vazio = conquista que não indica
-- capítulo). Troca as da IA desta versão do jogo; as corrigidas pela comunidade ficam. Itens fora da lista são ignorados.
create or replace function public.achievement_store(p_game text, p_provider text, p_ext text, p_rows jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare it jsonb; n integer := 0; ids text[]; part text;
begin
  if p_provider not in ('steam', 'ra') or jsonb_typeof(p_rows) <> 'array' then raise exception 'achievement_invalid'; end if;
  select coalesce(array_agg(x ->> 'id'), '{}') into ids from game_outlines o, jsonb_array_elements(o.parts) x where o.game_id = p_game;
  delete from game_achievement_links where game_id = p_game and provider = p_provider and ext_game = p_ext and origin = 'ia';
  for it in select * from jsonb_array_elements(p_rows) limit 400 loop
    if coalesce(it ->> 'key', '') = '' or coalesce(btrim(it ->> 'name'), '') = '' then continue; end if;
    part := case when it ->> 'partId' = any (ids) then it ->> 'partId' end;
    insert into game_achievement_links (game_id, provider, ach_key, ext_game, name, part_id, origin, updated_at)
    values (p_game, p_provider, left(it ->> 'key', 160), p_ext, left(btrim(it ->> 'name'), 120), part, 'ia', now())
    on conflict (game_id, provider, ach_key) do nothing;
    if part is not null then n := n + 1; end if;
  end loop;
  return n;
end; $$;

revoke all on function public.my_part_moves() from public, anon;
revoke all on function public.part_moves_done(uuid[]) from public, anon;
revoke all on function public.achievement_links(text) from public, anon;
revoke all on function public.achievement_link_set(text, text, text, text) from public, anon;
revoke all on function public.achievement_job_start(text, text, text, integer, boolean) from public, anon, authenticated;
revoke all on function public.achievement_job_finish(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.achievement_store(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.my_part_moves() to authenticated;
grant execute on function public.part_moves_done(uuid[]) to authenticated;
grant execute on function public.achievement_links(text) to authenticated;
grant execute on function public.achievement_link_set(text, text, text, text) to authenticated;
grant execute on function public.achievement_job_start(text, text, text, integer, boolean) to service_role;
grant execute on function public.achievement_job_finish(text, text, text, text, text) to service_role;
grant execute on function public.achievement_store(text, text, text, jsonb) to service_role;
