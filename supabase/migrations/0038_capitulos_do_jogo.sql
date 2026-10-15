-- =================================================================================================================
-- 0038 · Jornada 2, entrega J3: capítulos do jogo, "Dá para parar aqui?" e micro-objetivos
--
-- 1. Capítulos do jogo (game_outlines): a lista de capítulos ou fases de cada jogo, montada pela comunidade.
--    Cada capítulo: nome, % aproximado, duração típica, se dá para parar no meio e uma dica curta (sem spoiler;
--    o nome pode ser marcado como spoiler). Quem tem o jogo na Jornada edita; cada edição fica guardada
--    (game_outline_edits) e a administração pode desfazer. Até 30 edições por pessoa por dia.
-- 2. A História guarda em que capítulo você está (histories.part).
-- 3. A sessão guarda o objetivo pequeno que você escolheu (sessions.goal) e se cumpriu (sessions.goal_done).
--
-- Precisa da 0006 (is_admin) e da 0024 (suspensão). Pode rodar mais de uma vez.
-- =================================================================================================================

alter table public.histories add column if not exists part text;
alter table public.sessions add column if not exists goal text;
alter table public.sessions add column if not exists goal_done text;
do $$ begin
  alter table public.histories add constraint histories_part_len check (char_length(part) <= 40);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.sessions add constraint sessions_goal_len check (char_length(goal) <= 140);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.sessions add constraint sessions_goal_done_check check (goal_done in ('sim', 'quase', 'nao'));
exception when duplicate_object then null; end $$;

create table if not exists public.game_outlines (
  game_id text primary key references public.games (id) on delete cascade,
  parts jsonb not null default '[]'::jsonb,
  version integer not null default 0,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create table if not exists public.game_outline_edits (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  parts jsonb not null,
  version integer not null,
  note text check (char_length(note) <= 140),
  created_at timestamptz not null default now()
);
create index if not exists game_outline_edits_game on public.game_outline_edits (game_id, created_at desc);
create index if not exists game_outline_edits_user on public.game_outline_edits (user_id, created_at desc);
alter table public.game_outlines enable row level security;
alter table public.game_outline_edits enable row level security;
revoke all on public.game_outlines from anon, authenticated;
revoke all on public.game_outline_edits from anon, authenticated;

-- Quem pode editar: tem o jogo na Jornada (ou é da administração) e não está suspenso.
create or replace function public.outline_can_edit(p_game text) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
     and not exists (select 1 from profiles p where p.id = auth.uid() and p.suspended_until > now())
     and (public.is_admin() or exists (select 1 from journeys j where j.user_id = auth.uid() and j.game_id = p_game));
$$;

create or replace function public.outline_get(p_game text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'gameId', p_game,
    'parts', coalesce(o.parts, '[]'::jsonb),
    'version', coalesce(o.version, 0),
    'updatedAt', o.updated_at,
    'edits', (select count(*) from game_outline_edits e where e.game_id = p_game),
    'editors', (select count(distinct e.user_id) from game_outline_edits e where e.game_id = p_game),
    'canEdit', public.outline_can_edit(p_game),
    'admin', public.is_admin())
  from (select 1) x left join game_outlines o on o.game_id = p_game
  where auth.uid() is not null;
$$;

-- Limpa e confere a lista enviada; devolve a lista pronta para gravar, em ordem de %.
create or replace function public.outline_clean(p_parts jsonb) returns jsonb
language plpgsql volatile set search_path = public as $$
declare out jsonb := '[]'::jsonb; it jsonb; nm text; pid text; pc integer; mins integer; st text; nt text;
begin
  if jsonb_typeof(p_parts) <> 'array' then raise exception 'outline_invalid'; end if;
  if jsonb_array_length(p_parts) > 60 then raise exception 'outline_too_long'; end if;
  for it in select * from jsonb_array_elements(p_parts) loop
    nm := left(btrim(coalesce(it ->> 'name', '')), 60);
    pid := left(coalesce(nullif(btrim(it ->> 'id'), ''), md5(random()::text)), 40);
    if nm = '' then continue; end if;
    pc := case when (it ->> 'pct') ~ '^\d+(\.\d+)?$' then greatest(0, least(100, round((it ->> 'pct')::numeric)::integer)) else 0 end;
    mins := case when (it ->> 'minutes') ~ '^\d+(\.\d+)?$' then greatest(1, least(600, round((it ->> 'minutes')::numeric)::integer)) end;
    st := case when it ->> 'stop' in ('qualquer', 'fim', 'pontos', 'longe') then it ->> 'stop' end;
    nt := nullif(left(btrim(coalesce(it ->> 'note', '')), 140), '');
    out := out || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('id', pid, 'name', nm, 'pct', pc, 'minutes', mins, 'stop', st, 'note', nt,
                                                                         'spoiler', case when (it ->> 'spoiler')::boolean then true end)));
  end loop;
  return coalesce((select jsonb_agg(x order by (x ->> 'pct')::integer, ord) from jsonb_array_elements(out) with ordinality t(x, ord)), '[]'::jsonb);
end; $$;

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
  update game_outlines set parts = clean, version = cur + 1, updated_by = auth.uid(), updated_at = now() where game_id = p_game;
  insert into game_outline_edits (game_id, user_id, parts, version, note) values (p_game, auth.uid(), clean, cur + 1, nullif(left(btrim(coalesce(p_note, '')), 140), ''));
  return public.outline_get(p_game);
end; $$;

-- As últimas edições (quem, quando, quantos capítulos e o recado de quem editou).
create or replace function public.outline_history(p_game text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'handle', p.handle, 'at', e.created_at, 'version', e.version, 'note', e.note,
                                               'count', jsonb_array_length(e.parts)) order by e.created_at desc), '[]'::jsonb)
  from (select * from game_outline_edits where game_id = p_game order by created_at desc limit 20) e
  left join profiles p on p.id = e.user_id
  where auth.uid() is not null;
$$;

-- Administração: volta a lista para como estava numa edição antiga (vira uma edição nova).
create or replace function public.outline_revert(p_edit uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e game_outline_edits; cur integer;
begin
  if not public.is_admin() then raise exception 'outline_forbidden'; end if;
  select * into e from game_outline_edits where id = p_edit;
  if e.id is null then raise exception 'outline_not_found'; end if;
  select version into cur from game_outlines where game_id = e.game_id for update;
  update game_outlines set parts = e.parts, version = cur + 1, updated_by = auth.uid(), updated_at = now() where game_id = e.game_id;
  insert into game_outline_edits (game_id, user_id, parts, version, note) values (e.game_id, auth.uid(), e.parts, cur + 1, 'Desfeito pela administração (volta à versão ' || e.version || ')');
  return public.outline_get(e.game_id);
end; $$;

revoke all on function public.outline_can_edit(text) from public, anon, authenticated;
revoke all on function public.outline_clean(jsonb) from public, anon, authenticated;
revoke all on function public.outline_get(text) from public, anon;
revoke all on function public.outline_save(text, jsonb, integer, text) from public, anon;
revoke all on function public.outline_history(text) from public, anon;
revoke all on function public.outline_revert(uuid) from public, anon;
grant execute on function public.outline_get(text) to authenticated;
grant execute on function public.outline_save(text, jsonb, integer, text) to authenticated;
grant execute on function public.outline_history(text) to authenticated;
grant execute on function public.outline_revert(uuid) to authenticated;
