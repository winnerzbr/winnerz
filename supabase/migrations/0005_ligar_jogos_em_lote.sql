-- WinnerZ — liga, de uma vez, jogos cadastrados sem ficha (ex.: vindos da planilha) às fichas do IGDB.
-- Tudo o que era do jogo antigo (cópias, Jornada, desejo, favorito, nota, prioridade) passa para a ficha nova.
-- Roda com as permissões de quem chama: cada pessoa só mexe no que é seu.
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez.

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
    insert into my_games (user_id, game_id, priority, est_hours, wont_play, genre, note, updated_at)
      select me, p.dst, priority, est_hours, wont_play, genre, note, now() from my_games where user_id = me and game_id = p.src
    on conflict (user_id, game_id) do update set
      priority = coalesce(my_games.priority, excluded.priority),
      est_hours = coalesce(my_games.est_hours, excluded.est_hours),
      wont_play = my_games.wont_play or excluded.wont_play,
      genre = coalesce(my_games.genre, excluded.genre),
      note = coalesce(my_games.note, excluded.note),
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
notify pgrst, 'reload schema';
