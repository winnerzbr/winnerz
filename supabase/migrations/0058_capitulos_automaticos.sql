-- 0058 · Capítulos automáticos (C1) e capítulos na linha do tempo (C2)
--
-- 1. Quando alguém abre a Jornada de um jogo sem lista de capítulos, o servidor monta um rascunho com a IA (a partir
--    dos títulos das páginas da wiki do jogo, com o crédito). O rascunho nasce "Inferido" (origin = 'ia') e vira
--    "Confirmado pela comunidade" com 3 confirmações de quem joga ou com qualquer edição de uma pessoa.
--    game_outline_jobs guarda cada tentativa (para não repetir à toa) e o limite do dia.
-- 2. A História guarda quando a pessoa chegou a cada capítulo (histories.part_log), para a linha do tempo mostrar
--    os capítulos passados com a data. A fonte de cada passagem: 'voce', 'steam' ou 'ra'.
--
-- Precisa da 0038. Pode rodar mais de uma vez.

alter table public.game_outlines add column if not exists origin text not null default 'comunidade';
alter table public.game_outlines add column if not exists sources jsonb not null default '[]'::jsonb;
do $$ begin
  alter table public.game_outlines add constraint game_outlines_origin_check check (origin in ('comunidade', 'ia'));
exception when duplicate_object then null; end $$;

create table if not exists public.game_outline_confirms (
  game_id text not null references public.games (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  version integer not null,
  created_at timestamptz not null default now(),
  primary key (game_id, user_id)
);
alter table public.game_outline_confirms enable row level security;
revoke all on public.game_outline_confirms from anon, authenticated;

create table if not exists public.game_outline_jobs (
  game_id text primary key references public.games (id) on delete cascade,
  state text not null default 'rodando' check (state in ('rodando', 'feito', 'sem_lista', 'erro')),
  tries integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  note text check (char_length(note) <= 200)
);
create index if not exists game_outline_jobs_started on public.game_outline_jobs (started_at desc);
alter table public.game_outline_jobs enable row level security;
revoke all on public.game_outline_jobs from anon, authenticated;

alter table public.histories add column if not exists part_log jsonb;

-- A lista com a procedência, as confirmações e o andamento do rascunho automático.
create or replace function public.outline_get(p_game text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'gameId', p_game,
    'parts', coalesce(o.parts, '[]'::jsonb),
    'version', coalesce(o.version, 0),
    'updatedAt', o.updated_at,
    'edits', (select count(*) from game_outline_edits e where e.game_id = p_game and e.user_id is not null),
    'editors', (select count(distinct e.user_id) from game_outline_edits e where e.game_id = p_game),
    'canEdit', public.outline_can_edit(p_game),
    'admin', public.is_admin(),
    'origin', coalesce(o.origin, 'comunidade'),
    'sources', coalesce(o.sources, '[]'::jsonb),
    'confirms', (select count(*) from game_outline_confirms c where c.game_id = p_game and c.version = coalesce(o.version, 0)),
    'confirmed', coalesce(o.origin, 'comunidade') = 'comunidade'
                 or (select count(*) from game_outline_confirms c where c.game_id = p_game and c.version = coalesce(o.version, 0)) >= 3,
    'mine', exists (select 1 from game_outline_confirms c where c.game_id = p_game and c.user_id = auth.uid() and c.version = coalesce(o.version, 0)),
    'job', (select j.state from game_outline_jobs j where j.game_id = p_game))
  from (select 1) x left join game_outlines o on o.game_id = p_game
  where auth.uid() is not null;
$$;

-- Editar vira "da comunidade": uma pessoa conferiu a lista.
create or replace function public.outline_save(p_game text, p_parts jsonb, p_version integer, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cur integer; clean jsonb;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if not exists (select 1 from games where id = p_game) then raise exception 'game_not_found'; end if;
  if not public.outline_can_edit(p_game) then raise exception 'outline_forbidden'; end if;
  if not public.is_admin() and (select count(*) from game_outline_edits where user_id = auth.uid() and created_at > now() - interval '1 day') >= 30 then
    raise exception 'outline_limit';
  end if;
  clean := public.outline_clean(p_parts);
  insert into game_outlines (game_id) values (p_game) on conflict (game_id) do nothing;
  select version into cur from game_outlines where game_id = p_game for update;
  if cur <> coalesce(p_version, 0) then raise exception 'outline_conflict'; end if;
  update game_outlines set parts = clean, version = cur + 1, updated_by = auth.uid(), updated_at = now(), origin = 'comunidade' where game_id = p_game;
  insert into game_outline_edits (game_id, user_id, parts, version, note) values (p_game, auth.uid(), clean, cur + 1, nullif(left(btrim(coalesce(p_note, '')), 140), ''));
  return public.outline_get(p_game);
end; $$;

-- "Está certo": quem tem o jogo na Jornada confirma o rascunho da IA (uma vez por versão).
create or replace function public.outline_confirm(p_game text, p_version integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare cur integer;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if not public.outline_can_edit(p_game) then raise exception 'outline_forbidden'; end if;
  select version into cur from game_outlines where game_id = p_game;
  if cur is null or cur <> p_version then raise exception 'outline_conflict'; end if;
  insert into game_outline_confirms (game_id, user_id, version) values (p_game, auth.uid(), cur)
  on conflict (game_id, user_id) do update set version = excluded.version, created_at = now();
  return public.outline_get(p_game);
end; $$;

-- Servidor (chave secreta): começa uma tentativa de rascunho. 'ok' para seguir; 'pronto' se já tem lista;
-- 'rodando' se outra tentativa está em andamento; 'desistiu' se já tentou e não achou; 'limite' se o dia acabou.
create or replace function public.outline_job_start(p_game text, p_limit integer) returns text
language plpgsql security definer set search_path = public as $$
declare j game_outline_jobs; today integer;
begin
  if exists (select 1 from game_outlines where game_id = p_game and jsonb_array_length(parts) > 0) then return 'pronto'; end if;
  if not exists (select 1 from games where id = p_game) then return 'desistiu'; end if;
  select * into j from game_outline_jobs where game_id = p_game for update;
  if found then
    if j.state = 'rodando' and j.started_at > now() - interval '3 minutes' then return 'rodando'; end if;
    if j.state in ('sem_lista', 'erro') and (j.tries >= 3 or j.finished_at > now() - interval '1 day') then return 'desistiu'; end if;
  end if;
  select count(*) into today from game_outline_jobs where started_at > date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  if today >= greatest(1, coalesce(p_limit, 50)) then return 'limite'; end if;
  insert into game_outline_jobs (game_id, state, tries, started_at, finished_at) values (p_game, 'rodando', 1, now(), null)
  on conflict (game_id) do update set state = 'rodando', tries = game_outline_jobs.tries + 1, started_at = now(), finished_at = null, note = null;
  return 'ok';
end; $$;

create or replace function public.outline_job_finish(p_game text, p_state text, p_note text default null) returns void
language sql security definer set search_path = public as $$
  update game_outline_jobs set state = case when p_state in ('feito', 'sem_lista', 'erro') then p_state else 'erro' end, finished_at = now(), note = left(p_note, 200)
  where game_id = p_game;
$$;

-- Servidor: guarda o rascunho da IA, só se o jogo ainda não tem lista (nunca passa por cima da comunidade).
create or replace function public.outline_ai_store(p_game text, p_parts jsonb, p_sources jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
declare clean jsonb; cur game_outlines;
begin
  clean := public.outline_clean(p_parts);
  if jsonb_array_length(clean) < 2 then return false; end if;
  insert into game_outlines (game_id) values (p_game) on conflict (game_id) do nothing;
  select * into cur from game_outlines where game_id = p_game for update;
  if jsonb_array_length(cur.parts) > 0 then return false; end if;
  update game_outlines set parts = clean, version = cur.version + 1, updated_by = null, updated_at = now(), origin = 'ia',
    sources = case when jsonb_typeof(p_sources) = 'array' then p_sources else '[]'::jsonb end
  where game_id = p_game;
  insert into game_outline_edits (game_id, user_id, parts, version, note) values (p_game, null, clean, cur.version + 1, 'Rascunho montado pela IA');
  return true;
end; $$;

revoke all on function public.outline_get(text) from public, anon;
revoke all on function public.outline_save(text, jsonb, integer, text) from public, anon;
revoke all on function public.outline_confirm(text, integer) from public, anon;
revoke all on function public.outline_job_start(text, integer) from public, anon, authenticated;
revoke all on function public.outline_job_finish(text, text, text) from public, anon, authenticated;
revoke all on function public.outline_ai_store(text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.outline_get(text) to authenticated;
grant execute on function public.outline_save(text, jsonb, integer, text) to authenticated;
grant execute on function public.outline_confirm(text, integer) to authenticated;
grant execute on function public.outline_job_start(text, integer) to service_role;
grant execute on function public.outline_job_finish(text, text, text) to service_role;
grant execute on function public.outline_ai_store(text, jsonb, jsonb) to service_role;
