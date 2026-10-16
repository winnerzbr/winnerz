-- 0062 · A lista do jogo pelo link da wiki
--
-- Quem tem o jogo na Jornada pode colar o link de uma página de wiki ou de detonado (capítulos, missões, chefes…);
-- o servidor pede à IA que monte a lista lendo só aquela página. A lista nasce "Inferido · confira" e só entra se
-- o jogo ainda não tem lista ou se a lista atual também veio da IA (nunca passa por cima da comunidade).
-- Só o servidor (chave secreta) chama. Pode rodar mais de uma vez. Precisa da 0060.

create or replace function public.outline_ai_from_link(p_game text, p_user uuid, p_parts jsonb, p_sources jsonb, p_structure text) returns text
language plpgsql security definer set search_path = public as $$
declare clean jsonb; cur game_outlines;
begin
  if not exists (select 1 from profiles p where p.id = p_user and coalesce(p.suspended_until, now() - interval '1 second') <= now()) then return 'proibido'; end if;
  if not (coalesce((select is_admin from profiles where id = p_user), false)
          or exists (select 1 from journeys j where j.user_id = p_user and j.game_id = p_game)) then return 'proibido'; end if;
  clean := public.outline_clean(p_parts);
  if jsonb_array_length(clean) < 2 then return 'curta'; end if;
  insert into game_outlines (game_id) values (p_game) on conflict (game_id) do nothing;
  select * into cur from game_outlines where game_id = p_game for update;
  if jsonb_array_length(cur.parts) > 0 and cur.origin <> 'ia' then return 'comunidade'; end if;
  update game_outlines set parts = clean, version = cur.version + 1, updated_by = null, updated_at = now(), origin = 'ia',
    sources = case when jsonb_typeof(p_sources) = 'array' then p_sources else '[]'::jsonb end,
    structure = case when p_structure in ('capitulos', 'missoes', 'areas', 'chefes', 'atos', 'episodios', 'fases', 'mundos', 'etapas') then p_structure else 'capitulos' end
  where game_id = p_game;
  insert into game_outline_edits (game_id, user_id, parts, version, note) values (p_game, null, clean, cur.version + 1, 'Rascunho da IA pelo link de uma wiki');
  update game_outline_jobs set state = 'feito', finished_at = now(), note = 'pelo link' where game_id = p_game;
  return 'ok';
end; $$;

revoke all on function public.outline_ai_from_link(text, uuid, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.outline_ai_from_link(text, uuid, jsonb, jsonb, text) to service_role;
