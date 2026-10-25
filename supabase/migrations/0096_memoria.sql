-- WinnerZ — 0096: memória e perfil (etapa 8 da revisão)
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez. Precisa da 0019.
--
-- 1) "Os quatro da vida": o Palco do perfil guarda até quatro jogos (antes eram três).
-- 2) "Assisti": o jogo que você acompanhou numa live ou num vídeo, sem jogar (quando e onde). Fica em my_games.
-- 3) Suas notas e as da comunidade: para cada jogo que você avaliou, a média das outras pessoas (só com 3 ou mais).

-- 1) Palco com quatro jogos
create or replace function public.set_my_stage(p_stage jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s jsonb := '{}'::jsonb; d jsonb; t jsonb := '[]'::jsonb; item jsonb; y int; c jsonb; cy int;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  d := p_stage -> 'defining';
  if jsonb_typeof(d) = 'object' and exists (select 1 from games g where g.id = d ->> 'game') then
    s := s || jsonb_build_object('defining', jsonb_build_object('game', d ->> 'game', 'text', left(trim(coalesce(d ->> 'text', '')), 600)));
  end if;
  if jsonb_typeof(p_stage -> 'top') = 'array' then
    for item in select * from jsonb_array_elements(p_stage -> 'top') limit 4 loop
      if exists (select 1 from games g where g.id = item ->> 'game') then
        t := t || jsonb_build_array(jsonb_build_object('game', item ->> 'game', 'quote', left(trim(coalesce(item ->> 'quote', '')), 140)));
      end if;
    end loop;
  end if;
  s := s || jsonb_build_object('top', t);
  begin y := (p_stage ->> 'since')::int; exception when others then y := null; end;
  if y between 1970 and extract(year from now())::int then s := s || jsonb_build_object('since', y); end if;
  c := p_stage -> 'cover';
  if jsonb_typeof(c) = 'object' then
    begin cy := (c ->> 'y')::int; exception when others then cy := null; end;
    cy := greatest(0, least(100, coalesce(cy, 30)));
    if c ->> 'url' ~ '^https://images\.igdb\.com/igdb/image/upload/[A-Za-z0-9_/.-]{1,160}$' then
      s := s || jsonb_build_object('cover', jsonb_build_object('url', c ->> 'url', 'y', cy));
    elsif c ->> 'path' like auth.uid()::text || '/%' and length(c ->> 'path') < 200 then
      s := s || jsonb_build_object('cover', jsonb_build_object('path', c ->> 'path', 'y', cy));
    elsif c ? 'y' and not (c ? 'url' or c ? 'path') then
      s := s || jsonb_build_object('cover', jsonb_build_object('y', cy));
    end if;
  end if;
  update profiles set stage = s where id = auth.uid();
  return public.my_profile();
end; $$;

-- 2) Assisti
alter table public.my_games add column if not exists watched_at date;
alter table public.my_games add column if not exists watched_where text check (watched_where is null or length(watched_where) <= 120);

-- 3) Suas notas e as da comunidade (só números agregados; ninguém é identificado)
create or replace function public.my_notes_vs_community() returns table (game_id text, mine smallint, others numeric, n integer)
language sql stable security definer set search_path = public as $$
  select m.game_id, m.normalized, avg(o.normalized)::numeric(6, 1), count(o.*)::int
  from reviews m
  join reviews o on o.game_id = m.game_id and o.user_id <> m.user_id
  where m.user_id = auth.uid()
  group by m.game_id, m.normalized
  having count(o.*) >= 3;
$$;
revoke all on function public.my_notes_vs_community() from public, anon;
grant execute on function public.my_notes_vs_community() to authenticated;
