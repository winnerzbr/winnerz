-- 0052 · Jornadas da comunidade: números de todo mundo que jogou
--
-- Decisão de 16 de outubro: os números anônimos da ficha do jogo (0050) passam a contar todo mundo que registrou
-- o jogo, igual à comparação dentro da Jornada (0037). Sem opção de ligar ou desligar. Continua igual: nada com
-- menos de 5 pessoas (nem o jogo inteiro, nem cada número), sem nomes, sem lista de pessoas, e ficam de fora
-- Jornadas tiradas pela moderação e perfis suspensos. Precisa da 0050. Pode rodar mais de uma vez.

create or replace function public.game_journey_rows(p_gid text)
returns table (user_id uuid, ordinal integer, state text, started_at timestamptz, completed_at timestamptz, sp text, cp text, hours numeric, part text, progress integer, id uuid)
language sql stable security definer set search_path = public as $$
  select h.user_id, h.ordinal, h.state, h.started_at, h.completed_at, h.started_precision, h.completed_precision, h.hours, h.part, h.progress::integer, h.id
  from histories h join journeys j on j.id = h.journey_id join profiles p on p.id = j.user_id
  where j.game_id = p_gid and not j.mod_hidden and not coalesce(p.suspended_until > now(), false);
$$;

revoke all on function public.game_journey_rows(text) from public, anon, authenticated;
