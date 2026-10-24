-- =================================================================================================================
-- 0092 · Criador de figurinhas (Studio → Álbum → Criador)
--
-- 1. Biblioteca de artes (album_arts): as imagens originais que a administração envia (arrastando do computador).
--    Só a administração lê e grava. Os arquivos ficam no bucket público 'album', em originais/.
-- 2. Cada figurinha guarda a arte original (source) e o enquadramento escolhido (framing: centro x, y e zoom z).
--    A arte que aparece no site (art) continua sendo uma imagem já recortada no formato 5:7, gerada no navegador
--    a partir desses dois; assim nada muda para quem coleciona, e dá para reenquadrar depois.
-- 3. Cada álbum tem quantas figurinhas cabem numa página (per_page, de 1 a 12). Uma seção com mais figurinhas
--    continua na página seguinte.
-- 4. studio_album_sticker_order: reordena (e renumera) várias figurinhas de uma vez, ao arrastar no quadro do
--    álbum. O número continua único por Temporada, conferido antes de gravar.
--
-- Pode rodar mais de uma vez.
-- =================================================================================================================

-- 1. Biblioteca de artes ----------------------------------------------------------------------------------------
create table if not exists public.album_arts (
  id uuid primary key default gen_random_uuid(),
  path text not null unique check (char_length(path) between 3 and 400),
  name text not null default '' check (char_length(name) <= 120),
  width integer not null default 0 check (width >= 0),
  height integer not null default 0 check (height >= 0),
  created_at timestamptz not null default now()
);
alter table public.album_arts enable row level security;
revoke all on public.album_arts from anon, authenticated;
grant select, insert, update, delete on public.album_arts to authenticated;
drop policy if exists "album_arts: administração" on public.album_arts;
create policy "album_arts: administração" on public.album_arts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 2. Arte original e enquadramento ------------------------------------------------------------------------------
alter table public.album_stickers add column if not exists source text check (char_length(source) <= 400);
alter table public.album_stickers add column if not exists framing jsonb;

-- 3. Figurinhas por página (e a capa também guarda a original e o enquadramento) --------------------------------
alter table public.album_books add column if not exists per_page smallint not null default 6;
alter table public.album_books add column if not exists cover_source text check (char_length(cover_source) <= 400);
alter table public.album_books add column if not exists cover_framing jsonb;
do $$ begin
  alter table public.album_books add constraint album_books_per_page_check check (per_page between 1 and 12);
exception when duplicate_object then null; end $$;

-- O número único por Temporada passa a poder ser conferido no fim (para trocar dois números de lugar de uma vez).
do $$ begin
  alter table public.album_stickers drop constraint if exists album_stickers_season_number_key;
  alter table public.album_stickers add constraint album_stickers_season_number_key unique (season, number) deferrable initially immediate;
exception when duplicate_object or duplicate_table then null; end $$;

create or replace function public.album_sticker_json(s public.album_stickers) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', s.id, 'season', s.season, 'number', s.number, 'name', s.name, 'tier', s.tier, 'art', s.art,
    'credit', s.credit, 'pageId', s.page_id, 'slot', s.slot, 'active', s.active, 'source', s.source, 'framing', s.framing);
$$;

create or replace function public.album_catalog_json(p_all boolean) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'books', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'slug', b.slug, 'season', b.season, 'title', b.title,
        'subtitle', b.subtitle, 'cover', b.cover, 'position', b.position, 'published', b.published, 'perPage', b.per_page,
        'coverSource', b.cover_source, 'coverFraming', b.cover_framing,
        'pages', coalesce((select jsonb_agg(jsonb_build_object('id', pg.id, 'position', pg.position, 'kicker', pg.kicker, 'title', pg.title,
            'body', pg.body, 'banner', pg.banner, 'legendary', pg.legendary) order by pg.position, pg.id)
          from album_pages pg where pg.book_id = b.id), '[]'::jsonb)) order by b.season, b.position, b.title)
      from album_books b where p_all or b.published), '[]'::jsonb),
    'stickers', coalesce((select jsonb_agg(public.album_sticker_json(s) order by s.season, s.number)
      from album_stickers s
      where p_all or (s.active and exists (select 1 from album_pages pg join album_books b on b.id = pg.book_id
                                           where pg.id = s.page_id and b.published))), '[]'::jsonb));
$$;
revoke all on function public.album_catalog_json(boolean) from public, anon, authenticated;

create or replace function public.studio_album_book_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if v_id is null then
    insert into album_books (season, slug, title, subtitle, cover, position, published, per_page, cover_source, cover_framing)
    values (coalesce((p ->> 'season')::smallint, 1), p ->> 'slug', trim(p ->> 'title'), coalesce(trim(p ->> 'subtitle'), ''), nullif(p ->> 'cover', ''),
            coalesce((p ->> 'position')::smallint, 0), coalesce((p ->> 'published')::boolean, false), coalesce((p ->> 'perPage')::smallint, 6),
            nullif(p ->> 'coverSource', ''), case when jsonb_typeof(p -> 'coverFraming') = 'object' then p -> 'coverFraming' else null end)
    returning id into v_id;
  else
    update album_books set season = coalesce((p ->> 'season')::smallint, season), slug = coalesce(p ->> 'slug', slug), title = coalesce(trim(p ->> 'title'), title),
      subtitle = coalesce(trim(p ->> 'subtitle'), subtitle), cover = case when p ? 'cover' then nullif(p ->> 'cover', '') else cover end,
      position = coalesce((p ->> 'position')::smallint, position), published = coalesce((p ->> 'published')::boolean, published),
      per_page = coalesce((p ->> 'perPage')::smallint, per_page),
      cover_source = case when p ? 'coverSource' then nullif(p ->> 'coverSource', '') else cover_source end,
      cover_framing = case when p ? 'coverFraming' then (case when jsonb_typeof(p -> 'coverFraming') = 'object' then p -> 'coverFraming' else null end) else cover_framing end
    where id = v_id;
  end if;
  return public.studio_album_catalog();
end; $$;

create or replace function public.studio_album_sticker_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if v_id is null then
    insert into album_stickers (season, number, page_id, slot, name, tier, art, credit, active, source, framing)
    values (coalesce((p ->> 'season')::smallint, 1), (p ->> 'number')::smallint, nullif(p ->> 'pageId', '')::uuid, coalesce((p ->> 'slot')::smallint, 0),
            trim(p ->> 'name'), p ->> 'tier', nullif(p ->> 'art', ''), coalesce(trim(p ->> 'credit'), ''), coalesce((p ->> 'active')::boolean, true),
            nullif(p ->> 'source', ''), case when jsonb_typeof(p -> 'framing') = 'object' then p -> 'framing' else null end);
  else
    update album_stickers set season = coalesce((p ->> 'season')::smallint, season), number = coalesce((p ->> 'number')::smallint, number),
      page_id = case when p ? 'pageId' then nullif(p ->> 'pageId', '')::uuid else page_id end, slot = coalesce((p ->> 'slot')::smallint, slot),
      name = coalesce(trim(p ->> 'name'), name), tier = coalesce(p ->> 'tier', tier), art = case when p ? 'art' then nullif(p ->> 'art', '') else art end,
      credit = coalesce(trim(p ->> 'credit'), credit), active = coalesce((p ->> 'active')::boolean, active),
      source = case when p ? 'source' then nullif(p ->> 'source', '') else source end,
      framing = case when p ? 'framing' then (case when jsonb_typeof(p -> 'framing') = 'object' then p -> 'framing' else null end) else framing end
    where id = v_id;
  end if;
  return public.studio_album_catalog();
exception when unique_violation then raise exception 'sticker_number_taken';
end; $$;

-- 4. Reordenar e renumerar de uma vez ---------------------------------------------------------------------------
-- p: [{ id, pageId, slot, number? }]. Confere antes de gravar que nenhum número fica repetido na Temporada.
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
      number = coalesce((e ->> 'number')::smallint, number)
    where id = (e ->> 'id')::uuid;
  end loop;
  set constraints public.album_stickers_season_number_key immediate;
  return public.studio_album_catalog();
end; $$;
revoke all on function public.studio_album_sticker_order(jsonb) from public, anon;
grant execute on function public.studio_album_sticker_order(jsonb) to authenticated;
