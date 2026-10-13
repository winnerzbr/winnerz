-- WinnerZ — 0016: o perfil novo ("Palco")
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez. Precisa da 0011, 0013 e 0015.
--
-- 1) O que você escolhe para o topo do perfil: o jogo que te definiu (com um texto), os três da vida
--    (com uma frase cada) e o ano em que começou a jogar. Fica em profiles.stage e só aparece no perfil
--    quando ele está aberto para alguém (todo mundo ou quem tem o link).
-- 2) Perfil público, versão 4: o mesmo da 3, mais o Palco, os jogos pausados ("Próximo da fila") e o mural
--    de cenas (fotos dos momentos das Jornadas que você marcou "Mostrar no meu perfil"). As fotos voltam
--    como caminho no Storage; quem assina é o servidor (/api/perfil), nunca o navegador.

alter table public.profiles add column if not exists stage jsonb not null default '{}'::jsonb;

-- O seu perfil, agora com o Palco.
create or replace function public.my_profile() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('handle', handle, 'bio', bio, 'visibility', visibility, 'shareKey', share_key, 'links', links, 'stage', stage)
  from profiles where id = auth.uid();
$$;

-- Grava o Palco. Só aceita jogos que existem; textos com limite.
create or replace function public.set_my_stage(p_stage jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s jsonb := '{}'::jsonb; d jsonb; t jsonb := '[]'::jsonb; item jsonb; y int;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  d := p_stage -> 'defining';
  if jsonb_typeof(d) = 'object' and exists (select 1 from games g where g.id = d ->> 'game') then
    s := s || jsonb_build_object('defining', jsonb_build_object('game', d ->> 'game', 'text', left(trim(coalesce(d ->> 'text', '')), 600)));
  end if;
  if jsonb_typeof(p_stage -> 'top') = 'array' then
    for item in select * from jsonb_array_elements(p_stage -> 'top') limit 3 loop
      if exists (select 1 from games g where g.id = item ->> 'game') then
        t := t || jsonb_build_array(jsonb_build_object('game', item ->> 'game', 'quote', left(trim(coalesce(item ->> 'quote', '')), 140)));
      end if;
    end loop;
  end if;
  s := s || jsonb_build_object('top', t);
  begin y := (p_stage ->> 'since')::int; exception when others then y := null; end;
  if y between 1970 and extract(year from now())::int then s := s || jsonb_build_object('since', y); end if;
  update profiles set stage = s where id = auth.uid();
  return public.my_profile();
end; $$;

-- O Palco com os dados dos jogos (capa, arte, ano) para a página pública.
create or replace function public.public_stage(p profiles) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'defining', (select jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover, 'backdrop', g.backdrop, 'year', g.year,
                                           'text', nullif(p.stage -> 'defining' ->> 'text', ''))
                 from games g where g.id = p.stage -> 'defining' ->> 'game'),
    'top', coalesce((select jsonb_agg(jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover, 'quote', nullif(it ->> 'quote', '')) order by ord)
                     from jsonb_array_elements(coalesce(p.stage -> 'top', '[]'::jsonb)) with ordinality as e(it, ord)
                     join games g on g.id = it ->> 'game'), '[]'::jsonb),
    'since', (p.stage ->> 'since')::int));
$$;

create or replace function public.public_profile_v4(p_handle text, p_key text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles%rowtype; out jsonb;
begin
  out := public.public_profile_v3(p_handle, p_key);
  if out is null then return null; end if;
  select * into p from profiles where handle is not null and lower(handle) = lower(p_handle);
  out := out || jsonb_build_object('stage', public.public_stage(p));
  if public.can_see_journey(p, p_key) then
    if out ? 'jornada' then
      out := jsonb_set(out, '{jornada,paused}', coalesce((select jsonb_agg(x order by x ->> 'at' desc) from (
        select jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover, 'progress', h.progress, 'ordinal', h.ordinal, 'at', h.started_at) x
        from histories h join journeys j on j.id = h.journey_id join games g on g.id = j.game_id
        where h.user_id = p.id and h.state = 'pausada' order by h.started_at desc limit 6) t), '[]'::jsonb));
    end if;
    out := out || jsonb_build_object('mural', coalesce((select jsonb_agg(x order by x ->> 'at' desc) from (
      select jsonb_build_object('title', e.title, 'imagePath', e.image_path, 'at', e.at, 'game', g.title, 'slug', g.slug) x
      from timeline_events e join journeys j on j.id = e.journey_id join games g on g.id = j.game_id
      where e.user_id = p.id and j.shared and e.kind = 'momento' and e.image_path like p.id::text || '/%'
      order by e.at desc limit 9) t), '[]'::jsonb));
  end if;
  return out;
end; $$;

revoke all on function public.set_my_stage(jsonb) from public, anon;
revoke all on function public.public_stage(public.profiles) from public, anon, authenticated;
grant execute on function public.set_my_stage(jsonb) to authenticated;
grant execute on function public.public_profile_v4(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
