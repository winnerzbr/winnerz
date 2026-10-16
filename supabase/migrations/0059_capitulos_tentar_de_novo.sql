-- 0059 · Capítulos automáticos: tentar de novo
--
-- Ajustes na 0058: uma tentativa que deu erro (IA fora do ar, wiki sem resposta) pode ser refeita depois de 15
-- minutos, em vez de esperar um dia; e a administração pode pedir de novo na hora (p_force), mesmo depois de 3
-- tentativas sem lista. Quem abre o jogo vê o motivo da última tentativa. Pode rodar mais de uma vez. Precisa da 0058.

create or replace function public.outline_job_start(p_game text, p_limit integer, p_force boolean) returns text
language plpgsql security definer set search_path = public as $$
declare j game_outline_jobs; today integer;
begin
  if exists (select 1 from game_outlines where game_id = p_game and jsonb_array_length(parts) > 0) then return 'pronto'; end if;
  if not exists (select 1 from games where id = p_game) then return 'desistiu'; end if;
  select * into j from game_outline_jobs where game_id = p_game for update;
  if found and not coalesce(p_force, false) then
    if j.state = 'rodando' and j.started_at > now() - interval '3 minutes' then return 'rodando'; end if;
    if j.state = 'erro' and j.finished_at > now() - interval '15 minutes' then return 'desistiu'; end if;
    if j.state = 'sem_lista' and (j.tries >= 3 or j.finished_at > now() - interval '1 day') then return 'desistiu'; end if;
  end if;
  select count(*) into today from game_outline_jobs where started_at > date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  if today >= greatest(1, coalesce(p_limit, 50)) and not coalesce(p_force, false) then return 'limite'; end if;
  insert into game_outline_jobs (game_id, state, tries, started_at, finished_at) values (p_game, 'rodando', 1, now(), null)
  on conflict (game_id) do update set state = 'rodando', tries = game_outline_jobs.tries + 1, started_at = now(), finished_at = null, note = null;
  return 'ok';
end; $$;

-- O motivo da última tentativa aparece junto da lista.
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
    'job', (select j.state from game_outline_jobs j where j.game_id = p_game),
    'jobNote', (select j.note from game_outline_jobs j where j.game_id = p_game))
  from (select 1) x left join game_outlines o on o.game_id = p_game
  where auth.uid() is not null;
$$;

revoke all on function public.outline_job_start(text, integer, boolean) from public, anon, authenticated;
grant execute on function public.outline_job_start(text, integer, boolean) to service_role;
revoke all on function public.outline_get(text) from public, anon;
grant execute on function public.outline_get(text) to authenticated;
