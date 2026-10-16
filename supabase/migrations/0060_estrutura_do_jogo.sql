-- 0060 · Estrutura do jogo: capítulos, missões, áreas, chefes, atos…
--
-- Nem todo jogo se divide em capítulos. A lista passa a guardar como o jogo se divide (game_outlines.structure:
-- capitulos, missoes, areas, chefes, atos, episodios, fases, mundos ou etapas) e cada item pode ter um grupo (a
-- região, o ato, o mundo) e um tipo curto (chefe, área, masmorra, opcional). O rascunho da IA agora pesquisa na web
-- (wikis e detonados) e escolhe a estrutura. Pode rodar mais de uma vez. Precisa da 0058.

alter table public.game_outlines add column if not exists structure text not null default 'capitulos';
do $$ begin
  alter table public.game_outlines add constraint game_outlines_structure_check
    check (structure in ('capitulos', 'missoes', 'areas', 'chefes', 'atos', 'episodios', 'fases', 'mundos', 'etapas'));
exception when duplicate_object then null; end $$;

-- Limpa a lista: agora também guarda o grupo e o tipo de cada item.
create or replace function public.outline_clean(p_parts jsonb) returns jsonb
language plpgsql volatile set search_path = public as $$
declare res jsonb := '[]'::jsonb; it jsonb; nm text; pid text; pc integer; mins integer; st text; nt text; gr text; kd text;
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
    gr := nullif(left(btrim(coalesce(it ->> 'group', '')), 40), '');
    kd := nullif(left(btrim(coalesce(it ->> 'kind', '')), 20), '');
    res := res || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('id', pid, 'name', nm, 'pct', pc, 'minutes', mins, 'stop', st, 'note', nt,
                                                                         'group', gr, 'kind', kd,
                                                                         'spoiler', case when (it ->> 'spoiler')::boolean then true end)));
  end loop;
  return coalesce((select jsonb_agg(x order by (x ->> 'pct')::integer, ord) from jsonb_array_elements(res) with ordinality t(x, ord)), '[]'::jsonb);
end; $$;

-- Servidor: guarda o rascunho da IA com a estrutura (só se o jogo ainda não tem lista).
create or replace function public.outline_ai_store(p_game text, p_parts jsonb, p_sources jsonb, p_structure text) returns boolean
language plpgsql security definer set search_path = public as $$
declare clean jsonb; cur game_outlines;
begin
  clean := public.outline_clean(p_parts);
  if jsonb_array_length(clean) < 2 then return false; end if;
  insert into game_outlines (game_id) values (p_game) on conflict (game_id) do nothing;
  select * into cur from game_outlines where game_id = p_game for update;
  if jsonb_array_length(cur.parts) > 0 then return false; end if;
  update game_outlines set parts = clean, version = cur.version + 1, updated_by = null, updated_at = now(), origin = 'ia',
    sources = case when jsonb_typeof(p_sources) = 'array' then p_sources else '[]'::jsonb end,
    structure = case when p_structure in ('capitulos', 'missoes', 'areas', 'chefes', 'atos', 'episodios', 'fases', 'mundos', 'etapas') then p_structure else 'capitulos' end
  where game_id = p_game;
  insert into game_outline_edits (game_id, user_id, parts, version, note) values (p_game, null, clean, cur.version + 1, 'Rascunho montado pela IA');
  return true;
end; $$;

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
    'structure', coalesce(o.structure, 'capitulos'),
    'confirms', (select count(*) from game_outline_confirms c where c.game_id = p_game and c.version = coalesce(o.version, 0)),
    'confirmed', coalesce(o.origin, 'comunidade') = 'comunidade'
                 or (select count(*) from game_outline_confirms c where c.game_id = p_game and c.version = coalesce(o.version, 0)) >= 3,
    'mine', exists (select 1 from game_outline_confirms c where c.game_id = p_game and c.user_id = auth.uid() and c.version = coalesce(o.version, 0)),
    'job', (select j.state from game_outline_jobs j where j.game_id = p_game),
    'jobNote', (select j.note from game_outline_jobs j where j.game_id = p_game))
  from (select 1) x left join game_outlines o on o.game_id = p_game
  where auth.uid() is not null;
$$;

revoke all on function public.outline_clean(jsonb) from public, anon, authenticated;
revoke all on function public.outline_ai_store(text, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.outline_ai_store(text, jsonb, jsonb, text) to service_role;
revoke all on function public.outline_get(text) from public, anon;
grant execute on function public.outline_get(text) to authenticated;
