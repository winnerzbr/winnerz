-- WinnerZ — 0019: a imagem do topo do perfil
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez. Precisa da 0016 e da 0018.
--
-- O Palco (profiles.stage) passa a guardar a imagem do topo: uma arte de jogo (do IGDB) ou uma imagem
-- enviada por você (no bucket 'avatares', na sua pasta), e a altura do enquadramento (0 a 100).
-- Sem escolha, o topo continua usando a arte do jogo que te definiu.

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
    for item in select * from jsonb_array_elements(p_stage -> 'top') limit 3 loop
      if exists (select 1 from games g where g.id = item ->> 'game') then
        t := t || jsonb_build_array(jsonb_build_object('game', item ->> 'game', 'quote', left(trim(coalesce(item ->> 'quote', '')), 140)));
      end if;
    end loop;
  end if;
  s := s || jsonb_build_object('top', t);
  begin y := (p_stage ->> 'since')::int; exception when others then y := null; end;
  if y between 1970 and extract(year from now())::int then s := s || jsonb_build_object('since', y); end if;
  -- imagem do topo
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

create or replace function public.public_stage(p profiles) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'defining', (select jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover, 'backdrop', g.backdrop, 'year', g.year,
                                           'text', nullif(p.stage -> 'defining' ->> 'text', ''))
                 from games g where g.id = p.stage -> 'defining' ->> 'game'),
    'top', coalesce((select jsonb_agg(jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover, 'quote', nullif(it ->> 'quote', '')) order by ord)
                     from jsonb_array_elements(coalesce(p.stage -> 'top', '[]'::jsonb)) with ordinality as e(it, ord)
                     join games g on g.id = it ->> 'game'), '[]'::jsonb),
    'since', (p.stage ->> 'since')::int,
    'cover', p.stage -> 'cover'));
$$;

revoke all on function public.public_stage(public.profiles) from public, anon, authenticated;
notify pgrst, 'reload schema';
