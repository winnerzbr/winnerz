-- 0050 · Jornadas da comunidade na ficha do jogo
--
-- Números anônimos sobre como as pessoas jogam cada jogo: quantas zeraram, quantas estão jogando, quanto tempo
-- leva do começo ao fim (em dias, só com datas exatas), as horas que as pessoas informaram (nunca estimadas),
-- quantas sessões, onde costumam pausar (capítulo) e quantas rejogaram.
--
-- Só entra quem ligou "Contar as minhas Jornadas nos números anônimos" (Preferências → Comunidade; começa
-- desligado). Nada aparece com menos de 5 pessoas: nem o jogo inteiro, nem cada número (abaixo de 5 vira "menos
-- de 5"). Ninguém é identificado, não há lista de pessoas, e Jornadas tiradas pela moderação ou de perfis
-- suspensos ficam de fora. Pode rodar mais de uma vez.

-- As Histórias que entram na conta (de quem ligou, sem moderação nem suspensão). Uso interno.
create or replace function public.game_journey_rows(p_gid text)
returns table (user_id uuid, ordinal integer, state text, started_at timestamptz, completed_at timestamptz, sp text, cp text, hours numeric, part text, progress integer, id uuid)
language sql stable security definer set search_path = public as $$
  select h.user_id, h.ordinal, h.state, h.started_at, h.completed_at, h.started_precision, h.completed_precision, h.hours, h.part, h.progress::integer, h.id
  from histories h join journeys j on j.id = h.journey_id join profiles p on p.id = j.user_id
  where j.game_id = p_gid and not j.mod_hidden and public.cm_pref(p, 'numeros', false) and not coalesce(p.suspended_until > now(), false);
$$;

create or replace function public.game_journey_stats(p_game text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  k constant integer := 5;
  gid text := (select id from games where id = p_game or slug = p_game order by (id = p_game) desc limit 1);
  me boolean := coalesce((select public.cm_pref(p, 'numeros', false) from profiles p where p.id = auth.uid()), false);
  n integer; out jsonb;
begin
  if gid is null then return null; end if;
  select count(distinct r.user_id) into n from public.game_journey_rows(gid) r;
  if n < k then return jsonb_build_object('enough', false, 'k', k, 'me', me); end if;

  with
  _gjs_h as (select * from public.game_journey_rows(gid)),
  -- Por pessoa: o estado da História mais recente.
  last as (select distinct on (user_id) user_id, state, part, progress from _gjs_h order by user_id, ordinal desc),
  done as (select * from _gjs_h where state = 'concluida'),
  -- Do começo ao fim, só com as duas datas exatas e na primeira vez.
  days as (select extract(epoch from (completed_at - started_at)) / 86400.0 d from done where ordinal = 1 and sp = 'dia' and cp = 'dia' and completed_at >= started_at),
  hrs as (select hours from done where hours is not null and hours > 0),
  sess as (select d.id, count(s.*) c, sum(coalesce(s.minutes, 0)) m from done d join sessions s on s.history_id = d.id group by d.id),
  mins as (select s.minutes from sessions s join _gjs_h h on h.id = s.history_id where s.minutes > 0),
  stops as (select part, count(*) c from last where state in ('pausada', 'dropada') and part is not null group by part having count(*) >= k order by count(*) desc limit 3),
  outline as (select parts from game_outlines where game_id = gid)
  select jsonb_build_object(
    'enough', true, 'k', k, 'me', me, 'pessoas', n,
    'zeraram', (select count(distinct user_id) from done),
    'jogando', (select count(*) from last where state = 'ativa'),
    'pausaram', (select count(*) from last where state = 'pausada'),
    'largaram', (select count(*) from last where state = 'dropada'),
    'rejogaram', (select count(distinct user_id) from _gjs_h where ordinal > 1),
    'dias', case when (select count(*) from days) >= k then jsonb_build_object('n', (select count(*) from days),
      'mediana', (select round(percentile_cont(0.5) within group (order by d)::numeric) from days),
      'p25', (select round(percentile_cont(0.25) within group (order by d)::numeric) from days),
      'p75', (select round(percentile_cont(0.75) within group (order by d)::numeric) from days)) end,
    'horas', case when (select count(*) from hrs) >= k then jsonb_build_object('n', (select count(*) from hrs),
      'mediana', (select round(percentile_cont(0.5) within group (order by hours)::numeric, 1) from hrs)) end,
    'sessoes', case when (select count(*) from sess) >= k then jsonb_build_object('n', (select count(*) from sess),
      'mediana', (select round(percentile_cont(0.5) within group (order by c)::numeric) from sess)) end,
    'minutos', case when (select count(distinct h.user_id) from sessions s join _gjs_h h on h.id = s.history_id where s.minutes > 0) >= k
      then (select round(percentile_cont(0.5) within group (order by minutes)::numeric) from mins) end,
    'progressoAoPausar', case when (select count(*) from last where state in ('pausada', 'dropada') and progress is not null) >= k
      then (select round(percentile_cont(0.5) within group (order by progress)::numeric / 5) * 5 from last where state in ('pausada', 'dropada') and progress is not null) end,
    'pausas', coalesce((select jsonb_agg(jsonb_build_object('part', s.part, 'n', s.c,
        'name', (select case when coalesce((x ->> 'spoiler')::boolean, false) then null else x ->> 'name' end
                 from outline o, jsonb_array_elements(o.parts) x where x ->> 'id' = s.part limit 1),
        'pct', (select (x ->> 'pct')::integer from outline o, jsonb_array_elements(o.parts) x where x ->> 'id' = s.part limit 1)) order by s.c desc)
      from stops s), '[]'::jsonb)
  ) into out;
  -- Abaixo de 5 vira "menos de 5" (null), para nenhum número apontar para alguém.
  out := out || jsonb_build_object(
    'zeraram', case when (out ->> 'zeraram')::integer >= k then out -> 'zeraram' else 'null'::jsonb end,
    'jogando', case when (out ->> 'jogando')::integer >= k then out -> 'jogando' else 'null'::jsonb end,
    'pausaram', case when (out ->> 'pausaram')::integer >= k then out -> 'pausaram' else 'null'::jsonb end,
    'largaram', case when (out ->> 'largaram')::integer >= k then out -> 'largaram' else 'null'::jsonb end,
    'rejogaram', case when (out ->> 'rejogaram')::integer >= k then out -> 'rejogaram' else 'null'::jsonb end);
  return out;
end; $$;

revoke all on function public.game_journey_rows(text) from public, anon, authenticated;
revoke all on function public.game_journey_stats(text) from public;
grant execute on function public.game_journey_stats(text) to anon, authenticated;
