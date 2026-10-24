-- =================================================================================================================
-- 0093 · Figurinhas deitadas e páginas montadas à mão (Criador)
--
-- 1. landscape: a figurinha deitada (7:5). Tem a mesma área de uma em pé, então o mesmo destaque na página.
-- 2. leaf: em que página da seção a figurinha fica (1, 2, 3…). Sem leaf, o álbum divide a seção sozinho pelas
--    "figurinhas por página".
-- 3. pos: o lugar exato na página ({ x, y }: o centro, em % da largura e da altura da página). Sem pos, as
--    figurinhas da página vão em fileiras centradas.
-- studio_album_sticker_order passa a gravar também leaf e pos (arrastar as figurinhas nas páginas do Criador).
--
-- Pode rodar mais de uma vez. Precisa da 0092.
-- =================================================================================================================

alter table public.album_stickers add column if not exists landscape boolean not null default false;
alter table public.album_stickers add column if not exists leaf smallint check (leaf between 1 and 60);
alter table public.album_stickers add column if not exists pos jsonb;

create or replace function public.album_sticker_json(s public.album_stickers) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', s.id, 'season', s.season, 'number', s.number, 'name', s.name, 'tier', s.tier, 'art', s.art,
    'credit', s.credit, 'pageId', s.page_id, 'slot', s.slot, 'active', s.active, 'source', s.source, 'framing', s.framing,
    'landscape', s.landscape, 'leaf', s.leaf, 'pos', s.pos);
$$;

create or replace function public.studio_album_sticker_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if v_id is null then
    insert into album_stickers (season, number, page_id, slot, name, tier, art, credit, active, source, framing, landscape, leaf, pos)
    values (coalesce((p ->> 'season')::smallint, 1), (p ->> 'number')::smallint, nullif(p ->> 'pageId', '')::uuid, coalesce((p ->> 'slot')::smallint, 0),
            trim(p ->> 'name'), p ->> 'tier', nullif(p ->> 'art', ''), coalesce(trim(p ->> 'credit'), ''), coalesce((p ->> 'active')::boolean, true),
            nullif(p ->> 'source', ''), case when jsonb_typeof(p -> 'framing') = 'object' then p -> 'framing' else null end,
            coalesce((p ->> 'landscape')::boolean, false), nullif(p ->> 'leaf', '')::smallint,
            case when jsonb_typeof(p -> 'pos') = 'object' then p -> 'pos' else null end);
  else
    update album_stickers set season = coalesce((p ->> 'season')::smallint, season), number = coalesce((p ->> 'number')::smallint, number),
      page_id = case when p ? 'pageId' then nullif(p ->> 'pageId', '')::uuid else page_id end, slot = coalesce((p ->> 'slot')::smallint, slot),
      name = coalesce(trim(p ->> 'name'), name), tier = coalesce(p ->> 'tier', tier), art = case when p ? 'art' then nullif(p ->> 'art', '') else art end,
      credit = coalesce(trim(p ->> 'credit'), credit), active = coalesce((p ->> 'active')::boolean, active),
      source = case when p ? 'source' then nullif(p ->> 'source', '') else source end,
      framing = case when p ? 'framing' then (case when jsonb_typeof(p -> 'framing') = 'object' then p -> 'framing' else null end) else framing end,
      landscape = coalesce((p ->> 'landscape')::boolean, landscape),
      leaf = case when p ? 'leaf' then nullif(p ->> 'leaf', '')::smallint else leaf end,
      pos = case when p ? 'pos' then (case when jsonb_typeof(p -> 'pos') = 'object' then p -> 'pos' else null end) else pos end
    where id = v_id;
  end if;
  return public.studio_album_catalog();
exception when unique_violation then raise exception 'sticker_number_taken';
end; $$;

-- p: [{ id, pageId?, slot?, number?, leaf?, pos? }]. leaf e pos com null limpam (volta ao automático).
create or replace function public.studio_album_sticker_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e jsonb;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 400 then raise exception 'order_format'; end if;
  if exists (
    with novo as (
      select s.id, s.season, coalesce((x ->> 'number')::smallint, s.number) as number
      from jsonb_array_elements(p) x join album_stickers s on s.id = (x ->> 'id')::uuid
    ), todos as (
      select id, season, number from novo
      union all
      select s.id, s.season, s.number from album_stickers s where s.id not in (select id from novo)
    )
    select 1 from todos group by season, number having count(*) > 1
  ) then raise exception 'sticker_number_taken'; end if;
  set constraints public.album_stickers_season_number_key deferred;
  for e in select * from jsonb_array_elements(p) loop
    update album_stickers set
      page_id = case when e ? 'pageId' then nullif(e ->> 'pageId', '')::uuid else page_id end,
      slot = coalesce((e ->> 'slot')::smallint, slot),
      number = coalesce((e ->> 'number')::smallint, number),
      leaf = case when e ? 'leaf' then nullif(e ->> 'leaf', '')::smallint else leaf end,
      pos = case when e ? 'pos' then (case when jsonb_typeof(e -> 'pos') = 'object' then e -> 'pos' else null end) else pos end
    where id = (e ->> 'id')::uuid;
  end loop;
  set constraints public.album_stickers_season_number_key immediate;
  return public.studio_album_catalog();
end; $$;
revoke all on function public.studio_album_sticker_order(jsonb) from public, anon;
grant execute on function public.studio_album_sticker_order(jsonb) to authenticated;
