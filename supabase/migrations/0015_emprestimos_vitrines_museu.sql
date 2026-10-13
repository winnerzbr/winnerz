-- WinnerZ — 0015: empréstimos, Vitrines e Museu
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez. Precisa da 0013 e da 0014.
--
-- 1) Empréstimos: presos a um exemplar (copies) ou a um console (hardware). Quem pegou, desde quando, até quando
--    foi combinado e quando voltou. O histórico fica. Tudo privado: nunca aparece no perfil.
-- 2) Vitrines: seleções da coleção para mostrar uma ideia. "Inteligente" = montada por uma regra (favoritos,
--    especiais, zerados, plataforma, geração) e sempre em dia; "curada" = você escolhe as peças e a ordem.
-- 3) Museu: salas com peças da coleção (exemplares, consoles), momentos da Jornada e fotos, cada uma com a sua
--    plaquinha. O museu tem título e apresentação (profiles.museum).
-- 4) Perfil: Vitrines e Museu só aparecem se você marcar, uma a uma, e só para quem pode ver o pilar Coleção.
--    Nunca saem preço, estado, série, notas do exemplar ou empréstimos.

-- 1) Empréstimos --------------------------------------------------------------------------------------------
create table if not exists public.loans (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  copy_id uuid references public.copies (id) on delete cascade,
  hardware_id uuid references public.hardware (id) on delete cascade,
  person text not null check (char_length(person) between 1 and 80),
  lent_on date not null default current_date,
  due_on date,
  returned_on date,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  constraint loans_one_item check ((copy_id is null) <> (hardware_id is null))
);
create index if not exists loans_user on public.loans (user_id);
alter table public.loans enable row level security;
drop policy if exists "loans own" on public.loans;
create policy "loans own" on public.loans for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2) Vitrines -----------------------------------------------------------------------------------------------
create table if not exists public.showcases (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text check (description is null or char_length(description) <= 400),
  kind text not null check (kind in ('curada', 'inteligente')),
  rule jsonb,
  items jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists showcases_user on public.showcases (user_id, position);
alter table public.showcases enable row level security;
drop policy if exists "showcases own" on public.showcases;
create policy "showcases own" on public.showcases for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3) Museu --------------------------------------------------------------------------------------------------
alter table public.profiles add column if not exists museum jsonb not null default '{}'::jsonb;

-- A tabela profiles só deixa ler algumas colunas (0009); o Museu é lido e gravado por estas funções.
create or replace function public.my_museum() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(museum, '{}'::jsonb) from profiles where id = auth.uid();
$$;
create or replace function public.set_my_museum(p_title text, p_intro text, p_shared boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  update profiles set museum = jsonb_build_object(
    'title', left(trim(coalesce(p_title, '')), 80),
    'intro', left(trim(coalesce(p_intro, '')), 1000),
    'shared', coalesce(p_shared, false)) where id = auth.uid();
  return public.my_museum();
end; $$;

create table if not exists public.museum_rooms (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position integer not null default 0,
  title text not null check (char_length(title) between 1 and 80),
  text text check (text is null or char_length(text) <= 2000),
  pieces jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists museum_rooms_user on public.museum_rooms (user_id, position);
alter table public.museum_rooms enable row level security;
drop policy if exists "museum_rooms own" on public.museum_rooms;
create policy "museum_rooms own" on public.museum_rooms for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4) Perfil -------------------------------------------------------------------------------------------------
create or replace function public.can_see_collection(p profiles, p_key text) returns boolean
language sql immutable as $$
  select p.visibility ->> 'colecao' = 'publico' or (p.visibility ->> 'colecao' = 'link' and coalesce(p_key = p.share_key, false));
$$;

-- Uma peça da coleção como o público vê: só capa, título e plataforma (ou nome do console). Nada da ficha do exemplar.
create or replace function public.public_piece(p_user uuid, p_t text, p_id text) returns jsonb
language sql stable security definer set search_path = public as $$
  select case p_t
    when 'c' then (select jsonb_build_object('t', 'c', 'title', g.title, 'slug', g.slug, 'cover', g.cover, 'platform', c.platform, 'year', g.year)
                   from copies c join games g on g.id = c.game_id where c.id::text = p_id and c.user_id = p_user and c.deleted_at is null)
    when 'h' then (select jsonb_build_object('t', 'h', 'name', h.name, 'platform', h.platform, 'kind', h.kind)
                   from hardware h where h.id::text = p_id and h.user_id = p_user and h.deleted_at is null)
  end;
$$;

-- As peças de uma Vitrine: as escolhidas (curada) ou as que a regra encontra hoje (inteligente).
create or replace function public.showcase_items(s showcases) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb := coalesce(s.rule, '{}'::jsonb); plats text[];
begin
  if s.kind = 'curada' then
    return coalesce((select jsonb_agg(x order by ord) from (
      select ord, public.public_piece(s.user_id, it ->> 't', it ->> 'id') x
      from jsonb_array_elements(s.items) with ordinality as e(it, ord) limit 60) t where x is not null), '[]'::jsonb);
  end if;
  plats := array(select lower(jsonb_array_elements_text(coalesce(r -> 'platforms', '[]'::jsonb))));
  return coalesce((select jsonb_agg(x order by x ->> 'title') from (
    select public.public_piece(s.user_id, 'c', c.id::text) x
    from copies c
    where c.user_id = s.user_id and c.deleted_at is null and case r ->> 'type'
      when 'favoritos' then exists (select 1 from favorites f where f.user_id = s.user_id and f.game_id = c.game_id)
      when 'especial' then c.special
      when 'zerados' then exists (select 1 from histories h join journeys j on j.id = h.journey_id
                                  where j.user_id = s.user_id and j.game_id = c.game_id and h.state = 'concluida')
      when 'plataforma' then lower(c.platform) = any(plats)
      when 'geracao' then lower(c.platform) = any(plats)
      else false end
    limit 60) t where x is not null), '[]'::jsonb);
end; $$;

-- Perfil público, versão 3: o da 0013, mais as Vitrines marcadas e se o Museu está aberto.
create or replace function public.public_profile_v3(p_handle text, p_key text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles%rowtype; out jsonb;
begin
  out := public.public_profile_v2(p_handle, p_key);
  if out is null then return null; end if;
  select * into p from profiles where handle is not null and lower(handle) = lower(p_handle);
  if public.can_see_collection(p, p_key) then
    out := out || jsonb_build_object(
      'vitrines', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title, 'description', s.description, 'items', public.showcase_items(s))
                                     order by s.position, s.created_at)
                            from showcases s where s.user_id = p.id and s.shared), '[]'::jsonb),
      'museu', case when coalesce((p.museum ->> 'shared')::boolean, false) and exists (select 1 from museum_rooms r where r.user_id = p.id)
                    then jsonb_build_object('title', nullif(p.museum ->> 'title', ''), 'rooms', (select count(*) from museum_rooms r where r.user_id = p.id))
                    else null end);
  end if;
  return out;
end; $$;

-- O Museu aberto ao público. Fotos voltam como caminho no Storage; quem assina é o servidor (/api/perfil).
create or replace function public.public_museum(p_handle text, p_key text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles%rowtype;
begin
  select * into p from profiles where handle is not null and lower(handle) = lower(p_handle);
  if not found or not public.can_see_collection(p, p_key) or not coalesce((p.museum ->> 'shared')::boolean, false) then return null; end if;
  return jsonb_build_object(
    'name', p.display_name, 'handle', p.handle,
    'title', nullif(p.museum ->> 'title', ''), 'intro', nullif(p.museum ->> 'intro', ''),
    'rooms', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'text', r.text, 'pieces', coalesce((
        select jsonb_agg(x order by ord) from (
          select ord, case it ->> 't'
            when 'f' then case when (it ->> 'path') like p.id::text || '/%'
                            then jsonb_build_object('t', 'f', 'imagePath', it ->> 'path') end
            when 'm' then (select jsonb_build_object('t', 'm', 'title', e.title, 'quote', e.quote, 'imagePath', e.image_path, 'at', e.at,
                                                     'game', g.title, 'slug', g.slug, 'cover', g.cover)
                           from timeline_events e join journeys j on j.id = e.journey_id join games g on g.id = j.game_id
                           where e.id::text = it ->> 'id' and e.user_id = p.id and e.kind in ('momento', 'marco', 'inicio'))
            else public.public_piece(p.id, it ->> 't', it ->> 'id')
          end || jsonb_build_object('caption', nullif(it ->> 'caption', '')) x
          from jsonb_array_elements(r.pieces) with ordinality as e(it, ord)) t
        where x ? 't'), '[]'::jsonb)) order by r.position, r.created_at)
      from museum_rooms r where r.user_id = p.id), '[]'::jsonb));
end; $$;

revoke all on function public.can_see_collection(public.profiles, text) from public, anon, authenticated;
revoke all on function public.public_piece(uuid, text, text) from public, anon, authenticated;
revoke all on function public.showcase_items(public.showcases) from public, anon, authenticated;
revoke all on function public.my_museum() from public, anon;
revoke all on function public.set_my_museum(text, text, boolean) from public, anon;
grant execute on function public.my_museum() to authenticated;
grant execute on function public.set_my_museum(text, text, boolean) to authenticated;
grant execute on function public.public_profile_v3(text, text) to anon, authenticated;
grant execute on function public.public_museum(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
