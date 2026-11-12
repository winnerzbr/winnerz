-- 0099 · Distribuição das notas na página do jogo (12/11/2026)
-- As barras eram "de 0 a 0,99 = 1 … de 9 a 10 = 10", então um 9,5 aparecia na barra 10.
-- Agora a barra 9 junta 9 e 9,5, a barra 10 é só nota 10, e a barra 1 junta tudo abaixo de 2.
-- Coluna nova dist10b (o site usa ela quando existe; sem esta migração, continua com dist10).
-- Rodar no SQL Editor do Supabase. Não mexe em nenhuma nota.

create or replace view public.review_stats with (security_invoker = false) as
select
  game_id,
  count(*)::int as count,
  avg(normalized)::float as avg,
  array[
    count(*) filter (where normalized < 100), count(*) filter (where normalized >= 100 and normalized < 200),
    count(*) filter (where normalized >= 200 and normalized < 300), count(*) filter (where normalized >= 300 and normalized < 400),
    count(*) filter (where normalized >= 400 and normalized < 500), count(*) filter (where normalized >= 500 and normalized < 600),
    count(*) filter (where normalized >= 600 and normalized < 700), count(*) filter (where normalized >= 700 and normalized < 800),
    count(*) filter (where normalized >= 800 and normalized < 900), count(*) filter (where normalized >= 900)
  ]::int[] as dist10,
  array[
    count(*) filter (where normalized < 200),
    count(*) filter (where normalized >= 200 and normalized < 300), count(*) filter (where normalized >= 300 and normalized < 400),
    count(*) filter (where normalized >= 400 and normalized < 500), count(*) filter (where normalized >= 500 and normalized < 600),
    count(*) filter (where normalized >= 600 and normalized < 700), count(*) filter (where normalized >= 700 and normalized < 800),
    count(*) filter (where normalized >= 800 and normalized < 900), count(*) filter (where normalized >= 900 and normalized < 1000),
    count(*) filter (where normalized >= 1000)
  ]::int[] as dist10b
from public.reviews
group by game_id;
revoke all on public.review_stats from anon, authenticated;
grant select on public.review_stats to anon, authenticated;
