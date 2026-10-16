-- 0048 · Comunidade, entrega H: listas compartilhadas
--
-- Listas de jogos com título, descrição, ordem livre ou numerada e uma nota curta por jogo. Quem vê: só quem criou
-- (e quem edita junto), amigos, quem tiver o link, ou todo mundo. Quem criou convida até 10 amigos para editar junto.
-- Outras pessoas podem salvar a lista. Listas aparecem no perfil, na ficha do jogo e na busca, e podem ser
-- denunciadas (a moderação ganha o tipo 'lista', com ocultar e desfazer).
--
-- Tudo passa por funções (as tabelas não têm política de leitura direta). Pode rodar mais de uma vez.

create table if not exists public.game_lists (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  description text not null default '' check (char_length(description) <= 600),
  visibility text not null default 'privada' check (visibility in ('privada', 'amigos', 'link', 'publica')),
  ranked boolean not null default false,
  link_key text not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  mod_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists game_lists_owner on public.game_lists (owner, updated_at desc);
create index if not exists game_lists_public on public.game_lists (updated_at desc) where visibility = 'publica' and not mod_hidden;

create table if not exists public.game_list_items (
  list_id uuid not null references public.game_lists (id) on delete cascade,
  game_id text not null references public.games (id),
  position integer not null default 0,
  note text not null default '' check (char_length(note) <= 280),
  added_by uuid references auth.users (id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (list_id, game_id)
);
create index if not exists game_list_items_game on public.game_list_items (game_id);

create table if not exists public.game_list_editors (
  list_id uuid not null references public.game_lists (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, user_id)
);
create index if not exists game_list_editors_user on public.game_list_editors (user_id);

create table if not exists public.game_list_saves (
  list_id uuid not null references public.game_lists (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (list_id, user_id)
);
create index if not exists game_list_saves_user on public.game_list_saves (user_id, at desc);

alter table public.game_lists enable row level security;
alter table public.game_list_items enable row level security;
alter table public.game_list_editors enable row level security;
alter table public.game_list_saves enable row level security;

-- ---------------------------------------------------------------------------------------------------------------
-- Quem vê e quem edita
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.list_role(p_list uuid, p_uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when p_uid is null then null
    when exists (select 1 from game_lists l where l.id = p_list and l.owner = p_uid) then 'dona'
    when exists (select 1 from game_list_editors e where e.list_id = p_list and e.user_id = p_uid) then 'edita'
  end;
$$;

-- Sem a chave: pública (para todos) e de amigos (para amigos). Com a chave certa: também a de link.
create or replace function public.list_can_see(l public.game_lists, p_uid uuid, p_key text default null) returns boolean
language sql stable security definer set search_path = public as $$
  select public.list_role(l.id, p_uid) is not null or public.is_admin() or (
    not l.mod_hidden and public.author_visible(l.owner) and (
      l.visibility = 'publica'
      or (l.visibility = 'amigos' and p_uid is not null and public.are_friends(l.owner, p_uid))
      or (l.visibility = 'link' and p_key is not null and p_key = l.link_key)
    ));
$$;

create or replace function public.list_json(l public.game_lists) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', l.id, 'title', l.title, 'description', l.description, 'visibility', l.visibility, 'ranked', l.ranked,
    'owner', public.person_json(l.owner), 'updatedAt', l.updated_at, 'createdAt', l.created_at, 'hidden', l.mod_hidden,
    'count', (select count(*) from game_list_items i where i.list_id = l.id),
    'covers', coalesce((select jsonb_agg(jsonb_build_object('title', g.title, 'cover', g.cover, 'slug', g.slug) order by i.position, i.added_at)
                        from (select * from game_list_items i2 where i2.list_id = l.id order by i2.position, i2.added_at limit 4) i
                        join games g on g.id = i.game_id), '[]'::jsonb),
    'editors', coalesce((select jsonb_agg(public.person_json(e.user_id) order by e.added_at) from game_list_editors e where e.list_id = l.id), '[]'::jsonb),
    'saves', (select count(*) from game_list_saves s where s.list_id = l.id),
    'saved', exists (select 1 from game_list_saves s where s.list_id = l.id and s.user_id = auth.uid()),
    'role', public.list_role(l.id, auth.uid()),
    'key', case when public.list_role(l.id, auth.uid()) is not null then l.link_key end);
$$;

create or replace function public.list_game_id(p_game text) returns text
language sql stable security definer set search_path = public as $$
  select id from games where id = p_game or slug = p_game order by (id = p_game) desc limit 1;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Leitura
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.lists_mine() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  return jsonb_build_object(
    'minhas', coalesce((select jsonb_agg(public.list_json(l) order by l.updated_at desc) from game_lists l where l.owner = auth.uid()), '[]'::jsonb),
    'comigo', coalesce((select jsonb_agg(public.list_json(l) order by l.updated_at desc)
                        from game_lists l join game_list_editors e on e.list_id = l.id and e.user_id = auth.uid()), '[]'::jsonb),
    'salvas', coalesce((select jsonb_agg(public.list_json(l) order by s.at desc)
                        from game_list_saves s join game_lists l on l.id = s.list_id
                        where s.user_id = auth.uid() and public.list_can_see(l, auth.uid(), l.link_key)
                          and (l.visibility <> 'privada' or public.list_role(l.id, auth.uid()) is not null)), '[]'::jsonb));
end; $$;

create or replace function public.list_get(p_id uuid, p_key text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare l game_lists%rowtype;
begin
  select * into l from game_lists where id = p_id;
  if not found or not public.list_can_see(l, auth.uid(), p_key) then raise exception 'not_found'; end if;
  return public.list_json(l) || jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object('game', public.game_json(i.game_id), 'note', i.note, 'position', i.position,
                                        'addedBy', case when i.added_by is not null and i.added_by <> l.owner then public.person_json(i.added_by) end,
                                        'addedAt', i.added_at) order by i.position, i.added_at)
    from game_list_items i where i.list_id = l.id), '[]'::jsonb));
end; $$;

-- Listas que aparecem no perfil de alguém (pública; de amigos para amigos). As de link nunca aparecem.
create or replace function public.lists_of(p_handle text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid;
begin
  select id into uid from profiles where handle is not null and lower(handle) = lower(p_handle);
  if uid is null or not public.author_visible(uid) then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(public.list_json(l) order by l.updated_at desc) from (
    select * from game_lists l where l.owner = uid and not l.mod_hidden
      and (l.visibility = 'publica' or (l.visibility = 'amigos' and auth.uid() is not null and (auth.uid() = uid or public.are_friends(uid, auth.uid()))))
      and exists (select 1 from game_list_items i where i.list_id = l.id)
    order by l.updated_at desc limit 24) l), '[]'::jsonb);
end; $$;

-- Listas com um jogo (ficha do jogo): públicas e de amigos, as mais salvas primeiro.
create or replace function public.lists_with_game(p_game text, p_limit integer default 6) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare gid text := public.list_game_id(p_game);
begin
  if gid is null then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(public.list_json(l) || jsonb_build_object('note', x.note)) from (
    select l.id, i.note from game_list_items i join game_lists l on l.id = i.list_id
    where i.game_id = gid and not l.mod_hidden and public.author_visible(l.owner)
      and (l.visibility = 'publica' or (l.visibility = 'amigos' and auth.uid() is not null and (l.owner = auth.uid() or public.are_friends(l.owner, auth.uid()))))
    order by (select count(*) from game_list_saves s where s.list_id = l.id) desc, l.updated_at desc
    limit greatest(1, least(coalesce(p_limit, 6), 24))) x join game_lists l on l.id = x.id), '[]'::jsonb);
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Escrita
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.list_touch(p_list uuid) returns void
language sql security definer set search_path = public as $$
  update game_lists set updated_at = now() where id = p_list;
$$;

create or replace function public.list_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid; l game_lists%rowtype;
  v_title text := left(trim(coalesce(p ->> 'title', '')), 80);
  v_desc text := left(trim(coalesce(p ->> 'description', '')), 600);
  v_vis text := coalesce(p ->> 'visibility', 'privada');
  v_ranked boolean := coalesce((p ->> 'ranked')::boolean, false);
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if char_length(v_title) < 2 then raise exception 'list_title'; end if;
  if v_vis not in ('privada', 'amigos', 'link', 'publica') then raise exception 'list_visibility'; end if;
  if public.has_bad_term(v_title || ' ' || v_desc) then raise exception 'bad_term'; end if;
  if v_id is null then
    if (select count(*) from game_lists where owner = auth.uid()) >= 60 then raise exception 'list_limit'; end if;
    insert into game_lists (owner, title, description, visibility, ranked) values (auth.uid(), v_title, v_desc, v_vis, v_ranked) returning * into l;
  else
    select * into l from game_lists where id = v_id;
    if not found then raise exception 'not_found'; end if;
    -- Quem edita junto muda título, descrição e ordem; só quem criou muda quem vê.
    if public.list_role(v_id, auth.uid()) is null then raise exception 'not_allowed'; end if;
    if l.owner <> auth.uid() then v_vis := l.visibility; end if;
    update game_lists set title = v_title, description = v_desc, visibility = v_vis, ranked = v_ranked, updated_at = now()
     where id = v_id returning * into l;
  end if;
  return public.list_json(l);
end; $$;

create or replace function public.list_delete(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from game_lists where id = p_id and owner = auth.uid();
  if not found then raise exception 'not_found'; end if;
end; $$;

create or replace function public.list_new_key(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare k text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
begin
  update game_lists set link_key = k where id = p_id and owner = auth.uid();
  if not found then raise exception 'not_found'; end if;
  return k;
end; $$;

create or replace function public.list_add(p_id uuid, p_game text, p_note text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare gid text := public.list_game_id(p_game); v_note text := left(trim(coalesce(p_note, '')), 280);
begin
  if public.list_role(p_id, auth.uid()) is null then raise exception 'not_allowed'; end if;
  if gid is null then raise exception 'game_not_found'; end if;
  if v_note <> '' and public.has_bad_term(v_note) then raise exception 'bad_term'; end if;
  if (select count(*) from game_list_items where list_id = p_id) >= 300 then raise exception 'list_full'; end if;
  insert into game_list_items (list_id, game_id, position, note, added_by)
  values (p_id, gid, coalesce((select max(position) + 1 from game_list_items where list_id = p_id), 0), v_note, auth.uid())
  on conflict (list_id, game_id) do update set note = case when v_note <> '' then v_note else game_list_items.note end;
  perform public.list_touch(p_id);
  return public.list_get(p_id, null);
end; $$;

create or replace function public.list_remove(p_id uuid, p_game text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.list_role(p_id, auth.uid()) is null then raise exception 'not_allowed'; end if;
  delete from game_list_items where list_id = p_id and game_id = public.list_game_id(p_game);
  perform public.list_touch(p_id);
end; $$;

create or replace function public.list_note(p_id uuid, p_game text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare v_note text := left(trim(coalesce(p_note, '')), 280);
begin
  if public.list_role(p_id, auth.uid()) is null then raise exception 'not_allowed'; end if;
  if v_note <> '' and public.has_bad_term(v_note) then raise exception 'bad_term'; end if;
  update game_list_items set note = v_note where list_id = p_id and game_id = public.list_game_id(p_game);
  perform public.list_touch(p_id);
end; $$;

-- A ordem nova vem como a lista de ids (ou slugs) dos jogos, do primeiro ao último.
create or replace function public.list_move(p_id uuid, p_order text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.list_role(p_id, auth.uid()) is null then raise exception 'not_allowed'; end if;
  update game_list_items i set position = x.n - 1
    from (select public.list_game_id(g) gid, n from unnest(p_order) with ordinality as t(g, n)) x
   where i.list_id = p_id and i.game_id = x.gid;
  perform public.list_touch(p_id);
end; $$;

create or replace function public.list_editor_add(p_id uuid, p_handle text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l game_lists%rowtype; uid uuid;
begin
  select * into l from game_lists where id = p_id and owner = auth.uid();
  if not found then raise exception 'not_found'; end if;
  select id into uid from profiles where handle is not null and lower(handle) = lower(trim(both '@' from coalesce(p_handle, '')));
  if uid is null or uid = auth.uid() then raise exception 'target_not_found'; end if;
  if not public.are_friends(auth.uid(), uid) or public.blocked_between(auth.uid(), uid) then raise exception 'list_only_friends'; end if;
  if (select count(*) from game_list_editors where list_id = p_id) >= 10 then raise exception 'list_editors_full'; end if;
  insert into game_list_editors (list_id, user_id) values (p_id, uid) on conflict do nothing;
  if found then
    perform public.notif_add(uid, 'lista_convite', auth.uid(), 'lista:' || p_id, p_id, l.title, null, '/lista/' || p_id, '{}'::jsonb, now());
  end if;
  return public.list_json(l);
end; $$;

-- Quem criou tira alguém; quem edita pode sair sozinho.
create or replace function public.list_editor_remove(p_id uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (p_user = auth.uid() or exists (select 1 from game_lists where id = p_id and owner = auth.uid())) then raise exception 'not_allowed'; end if;
  delete from game_list_editors where list_id = p_id and user_id = p_user;
end; $$;

create or replace function public.list_bookmark(p_id uuid, p_on boolean, p_key text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l game_lists%rowtype;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  select * into l from game_lists where id = p_id;
  if not found or not public.list_can_see(l, auth.uid(), p_key) then raise exception 'not_found'; end if;
  if p_on then insert into game_list_saves (list_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  else delete from game_list_saves where list_id = p_id and user_id = auth.uid(); end if;
  return jsonb_build_object('saved', p_on, 'saves', (select count(*) from game_list_saves where list_id = p_id));
end; $$;

-- Para "Seus dados": as listas que você criou, com os jogos e as notas.
create or replace function public.list_export() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('title', l.title, 'description', l.description, 'visibility', l.visibility, 'ranked', l.ranked,
    'createdAt', l.created_at, 'games', coalesce((select jsonb_agg(jsonb_build_object('title', g.title, 'note', i.note) order by i.position, i.added_at)
      from game_list_items i join games g on g.id = i.game_id where i.list_id = l.id), '[]'::jsonb)) order by l.created_at), '[]'::jsonb)
  from game_lists l where l.owner = auth.uid();
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Aviso de convite para editar junto
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.notif_pref_key(p_kind text) returns text
language sql immutable as $$
  select case
    when p_kind = 'resposta' then 'aviso_respostas'
    when p_kind = 'acompanhando' then 'aviso_acompanhando'
    when p_kind in ('mencao', 'clube_mencao', 'jogatina_mencao') then 'aviso_mencoes'
    when p_kind in ('clube_resposta', 'jogatina_resposta', 'parte', 'clube_jogo', 'clube_jogatina') then 'aviso_clubes'
    when p_kind = 'reacao' then 'aviso_reacoes'
    when p_kind = 'seguiu' then 'aviso_seguidores'
    when p_kind in ('jogatina_convite', 'clube_convite', 'lista_convite') then 'aviso_convites'
    when p_kind in ('jogatina_lembrete', 'jogatina_mudou') then 'aviso_lembretes'
    when p_kind = 'lancamento' then 'aviso_lancamentos'
    when p_kind = 'retomada' then 'aviso_retomada'
    when p_kind = 'semana' then 'aviso_semana'
    when p_kind = 'mes' then 'aviso_mes'
    when p_kind = 'revisao' then 'aviso_revisao'
    when p_kind in ('pacto', 'pacto_zerou') then 'aviso_pactos'
  end;
$$;

create or replace function public.notif_group(p_kind text) returns text
language sql immutable as $$
  select case
    when p_kind in ('resposta', 'acompanhando', 'mencao', 'reacao') then 'comunidade'
    when p_kind like 'clube_%' or p_kind like 'jogatina_%' or p_kind = 'parte' then 'grupos'
    when p_kind in ('seguiu', 'pacto', 'pacto_zerou', 'lista_convite') then 'amigos'
    when p_kind in ('lancamento', 'retomada', 'semana', 'mes', 'revisao') then 'jornada'
    else 'sistema'
  end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Busca: a da 0047 com as listas (públicas, de amigos e as suas)
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.search_community(p_q text, p_limit integer default 6) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare q text := public.norm_text(trim(coalesce(p_q, ''))); lim integer := greatest(1, least(coalesce(p_limit, 6), 30)); pat text;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if char_length(q) < 2 then return jsonb_build_object('pessoas', '[]'::jsonb, 'comunidades', '[]'::jsonb, 'conversas', '[]'::jsonb, 'clubes', '[]'::jsonb, 'jogatinas', '[]'::jsonb, 'listas', '[]'::jsonb); end if;
  pat := '%' || replace(replace(q, '%', ''), '_', '') || '%';
  return jsonb_build_object(
    'pessoas', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select public.person_json(p.id) || jsonb_build_object('bio', left(coalesce(p.bio, ''), 120)) x
      from profiles p
      where p.handle is not null and p.id <> auth.uid() and public.author_visible(p.id)
        and (public.norm_text(p.handle) like pat or public.norm_text(coalesce(p.bio, '')) like pat)
      order by (public.norm_text(p.handle) like q || '%') desc, char_length(p.handle) limit lim) z),
    'comunidades', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select jsonb_build_object('slug', c.slug, 'name', c.name, 'description', left(c.description, 140), 'official', c.official,
                                'members', (select count(*) from community_members m where m.community_id = c.id)) x
      from communities c
      where not c.mod_hidden and (public.norm_text(c.name) like pat or public.norm_text(c.slug) like pat or public.norm_text(c.description) like pat)
      order by c.official desc, (public.norm_text(c.name) like q || '%') desc, (select count(*) from community_members m where m.community_id = c.id) desc limit lim) z),
    'conversas', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select jsonb_build_object('id', p.id, 'title', coalesce(p.title, case when p.spoiler is not null then 'Conversa com spoiler' else left(p.body, 90) end),
                                'excerpt', case when p.spoiler is null then left(p.body, 160) else null end, 'spoiler', p.spoiler is not null,
                                'author', public.person_json(p.author), 'at', p.created_at,
                                'place', coalesce((select c.name from communities c where c.id = p.community_id), 'Praça'),
                                'game', (select g.title from games g where g.id = p.game_id),
                                'replies', (select count(*) from replies r where r.post_id = p.id and r.deleted_at is null)) x
      from posts p
      where p.deleted_at is null and not p.mod_hidden and p.club_id is null and p.jogatina_id is null
        and public.author_visible(p.author)
        and not exists (select 1 from communities c where c.id = p.community_id and c.mod_hidden)
        and (public.norm_text(coalesce(p.title, '')) like pat or (p.spoiler is null and public.norm_text(p.body) like pat)
             or exists (select 1 from games g where g.id = p.game_id and public.norm_text(g.title) like pat))
      order by p.created_at desc limit lim) z),
    'clubes', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select jsonb_build_object('slug', k.slug, 'name', k.name, 'description', left(k.description, 140), 'format', k.format,
                                'game', (select jsonb_build_object('title', g.title, 'cover', g.cover, 'slug', g.slug) from games g where g.id = k.game_id),
                                'members', (select count(*) from club_members m where m.club_id = k.id)) x
      from clubs k
      where public.club_open(k) and (public.norm_text(k.name) like pat or public.norm_text(k.description) like pat
             or exists (select 1 from games g where g.id = k.game_id and public.norm_text(g.title) like pat))
      order by (select count(*) from club_members m where m.club_id = k.id) desc limit lim) z),
    'jogatinas', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select jsonb_build_object('id', j.id, 'title', j.title, 'startsAt', j.starts_at,
                                'game', (select jsonb_build_object('title', g.title, 'cover', g.cover, 'slug', g.slug) from games g where g.id = j.game_id),
                                'going', (select count(*) from jogatina_people x where x.jogatina_id = j.id and x.rsvp = 'vou')) x
      from jogatinas j
      where j.canceled_at is null and j.starts_at + make_interval(mins => j.duration_min) > now() - interval '1 day' and public.jogatina_open(j)
        and (public.norm_text(j.title) like pat or public.norm_text(j.description) like pat
             or exists (select 1 from games g where g.id = j.game_id and public.norm_text(g.title) like pat))
      order by j.starts_at limit lim) z),
    'listas', (select coalesce(jsonb_agg(public.list_json(l)), '[]'::jsonb) from (
      select l.* from game_lists l
      where not l.mod_hidden and public.author_visible(l.owner)
        and (l.visibility = 'publica' or (l.visibility = 'amigos' and (l.owner = auth.uid() or public.are_friends(l.owner, auth.uid())))
             or public.list_role(l.id, auth.uid()) is not null)
        and exists (select 1 from game_list_items i where i.list_id = l.id)
        and (public.norm_text(l.title) like pat or public.norm_text(l.description) like pat)
      order by (select count(*) from game_list_saves s where s.list_id = l.id) desc, l.updated_at desc limit lim) l)
  );
end; $$;


-- ---------------------------------------------------------------------------------------------------------------
-- Denúncia de lista (as funções abaixo são as da 0045 com o tipo 'lista')
-- ---------------------------------------------------------------------------------------------------------------
alter table public.content_reports drop constraint if exists content_reports_kind_check;
alter table public.content_reports add constraint content_reports_kind_check
  check (kind in ('perfil', 'jornada', 'vitrine', 'momento', 'museu', 'comunidade', 'postagem', 'resposta', 'clube', 'jogatina', 'mensagem', 'lista'));

create or replace function public.target_snapshot(p_kind text, p_owner uuid, p_ref text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare out jsonb;
begin
  if p_kind = 'perfil' then
    select jsonb_build_object('handle', handle, 'bio', bio, 'avatar', avatar is not null, 'cover', stage ? 'cover') into out from profiles where id = p_owner;
  elsif p_kind = 'jornada' then
    select jsonb_build_object('game', g.title, 'slug', g.slug, 'shared', j.shared, 'hidden', j.mod_hidden) into out
    from journeys j join games g on g.id = j.game_id where j.user_id = p_owner and g.slug = p_ref;
  elsif p_kind = 'vitrine' then
    select jsonb_build_object('title', s.title, 'description', s.description, 'shared', s.shared, 'hidden', s.mod_hidden) into out
    from showcases s where s.user_id = p_owner and s.id::text = p_ref;
  elsif p_kind = 'momento' then
    select jsonb_build_object('title', e.title, 'quote', e.quote, 'text', e.text, 'game', g.title, 'slug', g.slug, 'photo', e.image_path is not null, 'hidden', e.mod_hidden) into out
    from timeline_events e join journeys j on j.id = e.journey_id join games g on g.id = j.game_id where e.user_id = p_owner and e.id::text = p_ref;
  elsif p_kind = 'museu' then
    select jsonb_build_object('title', museum ->> 'title', 'intro', museum ->> 'intro', 'shared', coalesce((museum ->> 'shared')::boolean, false), 'hidden', coalesce((mod ->> 'museu')::boolean, false))
    into out from profiles where id = p_owner;
  elsif p_kind = 'comunidade' then
    select jsonb_build_object('title', c.name, 'slug', c.slug, 'description', c.description, 'hidden', c.mod_hidden) into out
    from communities c where c.created_by = p_owner and c.id::text = p_ref;
  elsif p_kind = 'postagem' then
    select jsonb_build_object('title', coalesce(p.title, left(p.body, 80)), 'text', left(p.body, 400), 'slug', coalesce(c.slug, k.slug),
                              'community', coalesce(c.name, 'Clube ' || k.name, 'Jogatina ' || jg.title, 'Praça'), 'club', k.slug, 'jogatina', jg.id, 'photo', cardinality(p.images) > 0,
                              'game', g.title, 'hidden', p.mod_hidden) into out
    from posts p left join communities c on c.id = p.community_id left join clubs k on k.id = p.club_id left join jogatinas jg on jg.id = p.jogatina_id left join games g on g.id = p.game_id
    where p.author = p_owner and p.id::text = p_ref and p.deleted_at is null;
  elsif p_kind = 'resposta' then
    select jsonb_build_object('title', coalesce(p.title, k.name, jg.title, left(p.body, 80)), 'text', left(r.body, 400), 'slug', coalesce(c.slug, k.slug),
                              'community', coalesce(c.name, 'Clube ' || k.name, 'Jogatina ' || jg.title, 'Praça'), 'club', k.slug, 'jogatina', jg.id, 'postId', p.id, 'photo', cardinality(r.images) > 0, 'hidden', r.mod_hidden) into out
    from replies r join posts p on p.id = r.post_id left join communities c on c.id = p.community_id left join clubs k on k.id = p.club_id left join jogatinas jg on jg.id = p.jogatina_id
    where r.author = p_owner and r.id::text = p_ref and r.deleted_at is null;
  elsif p_kind = 'clube' then
    select jsonb_build_object('title', k.name, 'slug', k.slug, 'description', k.description, 'game', g.title, 'hidden', k.mod_hidden) into out
    from clubs k join games g on g.id = k.game_id where k.created_by = p_owner and k.id::text = p_ref;
  elsif p_kind = 'jogatina' then
    select jsonb_build_object('title', j.title, 'description', j.description, 'game', g.title, 'startsAt', j.starts_at, 'hidden', j.mod_hidden) into out
    from jogatinas j join games g on g.id = j.game_id where j.created_by = p_owner and j.id::text = p_ref;
  elsif p_kind = 'mensagem' then
    -- Só a mensagem denunciada (nunca a conversa inteira).
    select jsonb_build_object('title', 'Mensagem direta', 'text', left(m.body, 400), 'to', (select handle from profiles where id = case when t.a = p_owner then t.b else t.a end),
                              'game', (select title from games where id = m.game_id), 'hidden', m.mod_hidden) into out
    from dm_messages m join dm_threads t on t.id = m.thread_id where m.author = p_owner and m.id::text = p_ref and m.deleted_at is null;
  elsif p_kind = 'lista' then
    select jsonb_build_object('title', l.title, 'description', l.description, 'visibility', l.visibility,
                              'games', (select string_agg(g.title || case when i.note <> '' then ' (' || left(i.note, 80) || ')' else '' end, ' · ' order by i.position)
                                        from (select * from game_list_items i2 where i2.list_id = l.id order by i2.position limit 12) i join games g on g.id = i.game_id),
                              'hidden', l.mod_hidden) into out
    from game_lists l where l.owner = p_owner and l.id::text = p_ref;
  end if;
  return out;
end; $$;

create or replace function public.report_content(p_kind text, p_handle text, p_ref text, p_reason text, p_note text) returns text
language plpgsql security definer set search_path = public as $$
declare owner_id uuid; snap jsonb; n integer; r text := coalesce(p_ref, ''); v_note text := nullif(left(trim(coalesce(p_note, '')), 500), '');
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if p_kind not in ('perfil', 'jornada', 'vitrine', 'momento', 'museu', 'comunidade', 'postagem', 'resposta', 'clube', 'jogatina', 'mensagem', 'lista') then raise exception 'report_kind'; end if;
  if p_reason not in ('ofensa', 'spoiler', 'spam', 'improprio', 'outro') then raise exception 'report_reason'; end if;
  select id into owner_id from profiles where handle is not null and lower(handle) = lower(p_handle);
  if owner_id is null then raise exception 'target_not_found'; end if;
  if owner_id = auth.uid() then raise exception 'report_self'; end if;
  if p_kind in ('perfil', 'museu') then r := ''; end if;
  snap := public.target_snapshot(p_kind, owner_id, r);
  if snap is null then raise exception 'target_not_found'; end if;
  -- Mensagem direta: só quem está na conversa denuncia.
  if p_kind = 'mensagem' and not exists (select 1 from dm_messages m join dm_threads t on t.id = m.thread_id where m.id::text = r and auth.uid() in (t.a, t.b)) then
    raise exception 'target_not_found';
  end if;
  -- Lista: só quem consegue ver denuncia.
  if p_kind = 'lista' and not exists (select 1 from game_lists l where l.id::text = r and public.list_can_see(l, auth.uid(), l.link_key)) then
    raise exception 'target_not_found';
  end if;
  update content_reports set reason = p_reason, note = coalesce(v_note, content_reports.note), created_at = now()
   where reporter = auth.uid() and owner = owner_id and kind = p_kind and ref = r and status = 'aberta';
  if found then return 'atualizada'; end if;
  select count(*) into n from content_reports where reporter = auth.uid() and created_at > now() - interval '1 day';
  if n >= 10 then raise exception 'report_limit'; end if;
  insert into content_reports (reporter, owner, kind, ref, reason, note, snapshot) values (auth.uid(), owner_id, p_kind, r, p_reason, v_note, snap);
  return 'ok';
end; $$;

create or replace function public.moderation_act(p_kind text, p_owner uuid, p_ref text, p_action text, p_message text, p_days integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_before jsonb := '{}'::jsonb; until_at timestamptz; v_log uuid; n integer; txt text; what text; snap jsonb;
  msg text := nullif(left(trim(coalesce(p_message, '')), 600), ''); r text := coalesce(p_ref, '');
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_kind in ('perfil', 'museu') then r := ''; end if;
  snap := public.target_snapshot(p_kind, p_owner, r);
  what := case p_kind
    when 'jornada' then 'A Jornada de ' || coalesce(snap ->> 'game', 'um jogo')
    when 'vitrine' then 'A vitrine “' || coalesce(snap ->> 'title', '') || '”'
    when 'momento' then 'Uma foto da Jornada de ' || coalesce(snap ->> 'game', 'um jogo')
    when 'museu' then 'O seu Museu'
    when 'comunidade' then 'A comunidade “' || coalesce(snap ->> 'title', '') || '”'
    when 'postagem' then 'A postagem “' || coalesce(snap ->> 'title', '') || '”'
    when 'clube' then 'O clube “' || coalesce(snap ->> 'title', '') || '”'
    when 'jogatina' then 'A jogatina “' || coalesce(snap ->> 'title', '') || '”'
    when 'resposta' then 'Uma resposta sua em “' || coalesce(snap ->> 'title', '') || '”'
    when 'mensagem' then 'Uma mensagem direta sua'
    when 'lista' then 'A lista “' || coalesce(snap ->> 'title', '') || '”'
    else 'O seu perfil' end;

  if p_action = 'arquivar' then
    null;
  elsif p_action = 'avisar' then
    txt := 'A moderação revisou uma denúncia sobre ' || lower(left(what, 1)) || substr(what, 2) || ' e pede atenção às regras da comunidade.';
  elsif p_action = 'suspender' then
    until_at := now() + make_interval(days => greatest(1, least(coalesce(p_days, 7), 365)));
    select jsonb_build_object('suspended_until', suspended_until) into v_before from profiles where id = p_owner;
    update profiles set suspended_until = until_at where id = p_owner;
    txt := 'O seu perfil público fica fora do ar até ' || to_char(until_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') || '. O seu diário continua funcionando normalmente.';
  elsif p_action = 'ocultar' and p_kind = 'jornada' then
    select jsonb_build_object('id', j.id, 'shared', j.shared, 'mod_hidden', j.mod_hidden) into v_before
    from journeys j join games g on g.id = j.game_id where j.user_id = p_owner and g.slug = r;
    if v_before is null then raise exception 'target_not_found'; end if;
    update journeys set mod_hidden = true, shared = false where id = (v_before ->> 'id')::uuid;
    txt := what || ' saiu do seu perfil público por decisão da moderação. Ela continua no seu diário, só para você.';
  elsif p_action = 'ocultar' and p_kind = 'vitrine' then
    select jsonb_build_object('id', id, 'shared', shared, 'mod_hidden', mod_hidden) into v_before from showcases where user_id = p_owner and id::text = r;
    if v_before is null then raise exception 'target_not_found'; end if;
    update showcases set mod_hidden = true, shared = false where id = (v_before ->> 'id')::uuid;
    txt := what || ' saiu do seu perfil público por decisão da moderação. Ela continua na sua coleção, só para você.';
  elsif p_action = 'ocultar' and p_kind = 'momento' then
    select jsonb_build_object('id', id, 'mod_hidden', mod_hidden) into v_before from timeline_events where user_id = p_owner and id::text = r;
    if v_before is null then raise exception 'target_not_found'; end if;
    update timeline_events set mod_hidden = true where id = (v_before ->> 'id')::uuid;
    txt := what || ' saiu do seu perfil público por decisão da moderação. Ela continua no seu diário, só para você.';
  elsif p_action = 'ocultar' and p_kind = 'museu' then
    select jsonb_build_object('museum_shared', coalesce((museum ->> 'shared')::boolean, false), 'mod', mod) into v_before from profiles where id = p_owner;
    update profiles set mod = mod || '{"museu": true}'::jsonb, museum = museum || '{"shared": false}'::jsonb where id = p_owner;
    txt := what || ' saiu do perfil público por decisão da moderação. Ele continua na sua coleção, só para você.';
  elsif p_action = 'ocultar' and p_kind = 'comunidade' then
    select jsonb_build_object('id', id, 'mod_hidden', mod_hidden) into v_before from communities where created_by = p_owner and id::text = r;
    if v_before is null then raise exception 'target_not_found'; end if;
    update communities set mod_hidden = true where id = (v_before ->> 'id')::uuid;
    txt := what || ' saiu do ar por decisão da moderação. Só você ainda consegue abrir.';
  elsif p_action = 'ocultar' and p_kind = 'postagem' then
    select jsonb_build_object('id', id, 'mod_hidden', mod_hidden, 'pinned', pinned) into v_before from posts where author = p_owner and id::text = r;
    if v_before is null then raise exception 'target_not_found'; end if;
    update posts set mod_hidden = true, pinned = false where id = (v_before ->> 'id')::uuid;
    txt := what || ' saiu da conversa por decisão da moderação. Só você ainda consegue ver.';
  elsif p_action = 'ocultar' and p_kind = 'resposta' then
    select jsonb_build_object('id', id, 'mod_hidden', mod_hidden) into v_before from replies where author = p_owner and id::text = r;
    if v_before is null then raise exception 'target_not_found'; end if;
    update replies set mod_hidden = true where id = (v_before ->> 'id')::uuid;
    txt := what || ' saiu da conversa por decisão da moderação. Só você ainda consegue ver.';
  elsif p_action = 'ocultar' and p_kind = 'clube' then
    select jsonb_build_object('id', id, 'mod_hidden', mod_hidden) into v_before from clubs where created_by = p_owner and id::text = r;
    if v_before is null then raise exception 'target_not_found'; end if;
    update clubs set mod_hidden = true where id = (v_before ->> 'id')::uuid;
    txt := what || ' saiu do ar por decisão da moderação. Só você ainda consegue abrir.';
  elsif p_action = 'ocultar' and p_kind = 'jogatina' then
    select jsonb_build_object('id', id, 'mod_hidden', mod_hidden) into v_before from jogatinas where created_by = p_owner and id::text = r;
    if v_before is null then raise exception 'target_not_found'; end if;
    update jogatinas set mod_hidden = true where id = (v_before ->> 'id')::uuid;
    txt := what || ' saiu do ar por decisão da moderação. Só você ainda consegue abrir.';
  elsif p_action = 'ocultar' and p_kind = 'mensagem' then
    select jsonb_build_object('id', id, 'mod_hidden', mod_hidden) into v_before from dm_messages where author = p_owner and id::text = r;
    if v_before is null then raise exception 'target_not_found'; end if;
    update dm_messages set mod_hidden = true where id = (v_before ->> 'id')::uuid;
    txt := what || ' saiu da conversa por decisão da moderação. Só você ainda consegue ver.';
  elsif p_action = 'ocultar' and p_kind = 'lista' then
    select jsonb_build_object('id', id, 'mod_hidden', mod_hidden) into v_before from game_lists where owner = p_owner and id::text = r;
    if v_before is null then raise exception 'target_not_found'; end if;
    update game_lists set mod_hidden = true where id = (v_before ->> 'id')::uuid;
    txt := what || ' saiu do ar por decisão da moderação. Ela continua com você e com quem edita junto.';
  elsif p_action = 'limpar_bio' then
    select jsonb_build_object('bio', bio) into v_before from profiles where id = p_owner;
    update profiles set bio = null where id = p_owner;
    txt := 'A sua bio foi apagada pela moderação.';
  elsif p_action = 'trocar_arroba' then
    select jsonb_build_object('handle', handle, 'display_name', display_name) into v_before from profiles where id = p_owner;
    update profiles set handle = null, display_name = 'Jogador' where id = p_owner;
    txt := 'O seu @ precisou ser trocado por decisão da moderação. Escolha um novo para continuar.';
  elsif p_action = 'tirar_imagens' then
    select jsonb_build_object('avatar', avatar, 'cover', stage -> 'cover') into v_before from profiles where id = p_owner;
    update profiles set avatar = null, stage = stage - 'cover' where id = p_owner;
    txt := 'A foto e a capa do seu perfil foram retiradas pela moderação.';
  else
    raise exception 'moderation_action';
  end if;

  update content_reports set status = case when p_action = 'arquivar' then 'arquivada' else 'resolvida' end,
         action = p_action, resolved_by = auth.uid(), resolved_at = now()
   where owner = p_owner and kind = p_kind and ref = r and status = 'aberta';
  get diagnostics n = row_count;

  insert into moderation_log (admin, owner, kind, ref, action, before, message, until, reports)
  values (auth.uid(), p_owner, p_kind, r, p_action, coalesce(v_before, '{}'::jsonb), msg, until_at, n) returning id into v_log;

  if txt is not null then
    insert into user_notices (user_id, log_id, kind, text)
    values (p_owner, v_log, p_action, txt || case when msg is not null then ' Mensagem da moderação: ' || msg else '' end);
  end if;
  return jsonb_build_object('id', v_log, 'reports', n);
end; $$;

create or replace function public.moderation_undo(p_log uuid) returns void
language plpgsql security definer set search_path = public as $$
declare l moderation_log%rowtype;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select * into l from moderation_log where id = p_log and undone_at is null;
  if not found then raise exception 'not_found'; end if;
  if l.action = 'suspender' then
    update profiles set suspended_until = (l.before ->> 'suspended_until')::timestamptz where id = l.owner;
  elsif l.action = 'ocultar' and l.kind = 'jornada' then
    update journeys set mod_hidden = coalesce((l.before ->> 'mod_hidden')::boolean, false) where id = (l.before ->> 'id')::uuid;
    update journeys set shared = coalesce((l.before ->> 'shared')::boolean, false) where id = (l.before ->> 'id')::uuid and not mod_hidden;
  elsif l.action = 'ocultar' and l.kind = 'vitrine' then
    update showcases set mod_hidden = coalesce((l.before ->> 'mod_hidden')::boolean, false) where id = (l.before ->> 'id')::uuid;
    update showcases set shared = coalesce((l.before ->> 'shared')::boolean, false) where id = (l.before ->> 'id')::uuid and not mod_hidden;
  elsif l.action = 'ocultar' and l.kind = 'momento' then
    update timeline_events set mod_hidden = coalesce((l.before ->> 'mod_hidden')::boolean, false) where id = (l.before ->> 'id')::uuid;
  elsif l.action = 'ocultar' and l.kind = 'museu' then
    update profiles set mod = coalesce(l.before -> 'mod', '{}'::jsonb) where id = l.owner;
    update profiles set museum = museum || jsonb_build_object('shared', coalesce((l.before ->> 'museum_shared')::boolean, false)) where id = l.owner;
  elsif l.action = 'ocultar' and l.kind = 'comunidade' then
    update communities set mod_hidden = coalesce((l.before ->> 'mod_hidden')::boolean, false) where id = (l.before ->> 'id')::uuid;
  elsif l.action = 'ocultar' and l.kind = 'postagem' then
    update posts set mod_hidden = coalesce((l.before ->> 'mod_hidden')::boolean, false), pinned = coalesce((l.before ->> 'pinned')::boolean, false) where id = (l.before ->> 'id')::uuid;
  elsif l.action = 'ocultar' and l.kind = 'resposta' then
    update replies set mod_hidden = coalesce((l.before ->> 'mod_hidden')::boolean, false) where id = (l.before ->> 'id')::uuid;
  elsif l.action = 'ocultar' and l.kind = 'clube' then
    update clubs set mod_hidden = coalesce((l.before ->> 'mod_hidden')::boolean, false) where id = (l.before ->> 'id')::uuid;
  elsif l.action = 'ocultar' and l.kind = 'jogatina' then
    update jogatinas set mod_hidden = coalesce((l.before ->> 'mod_hidden')::boolean, false) where id = (l.before ->> 'id')::uuid;
  elsif l.action = 'ocultar' and l.kind = 'mensagem' then
    update dm_messages set mod_hidden = coalesce((l.before ->> 'mod_hidden')::boolean, false) where id = (l.before ->> 'id')::uuid;
  elsif l.action = 'ocultar' and l.kind = 'lista' then
    update game_lists set mod_hidden = coalesce((l.before ->> 'mod_hidden')::boolean, false) where id = (l.before ->> 'id')::uuid;
  elsif l.action = 'limpar_bio' then
    update profiles set bio = l.before ->> 'bio' where id = l.owner and bio is null;
  elsif l.action = 'trocar_arroba' then
    begin
      update profiles set handle = l.before ->> 'handle', display_name = coalesce(l.before ->> 'display_name', l.before ->> 'handle')
       where id = l.owner and handle is null;
    exception when unique_violation then raise exception 'handle_taken';
    end;
  elsif l.action = 'tirar_imagens' then
    update profiles set avatar = coalesce(avatar, l.before ->> 'avatar'),
                        stage = case when l.before ? 'cover' and l.before -> 'cover' <> 'null'::jsonb and not stage ? 'cover' then stage || jsonb_build_object('cover', l.before -> 'cover') else stage end
     where id = l.owner;
  end if;
  update moderation_log set undone_at = now() where id = p_log;
  -- O aviso que a pessoa ainda não viu some; se ela já viu, recebe outro dizendo que a decisão foi desfeita.
  delete from user_notices where log_id = p_log and seen_at is null;
  if exists (select 1 from user_notices where log_id = p_log) then
    insert into user_notices (user_id, log_id, kind, text) values (l.owner, p_log, 'desfeito', 'A moderação revisou de novo e desfez a decisão anterior. Está tudo como antes.');
  end if;
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------------------------------------------
revoke all on function public.list_role(uuid, uuid) from public, anon, authenticated;
revoke all on function public.list_can_see(public.game_lists, uuid, text) from public, anon, authenticated;
revoke all on function public.list_json(public.game_lists) from public, anon, authenticated;
revoke all on function public.list_game_id(text) from public, anon, authenticated;
revoke all on function public.list_touch(uuid) from public, anon, authenticated;
revoke all on function public.lists_mine() from public, anon;
revoke all on function public.list_get(uuid, text) from public;
revoke all on function public.lists_of(text) from public;
revoke all on function public.lists_with_game(text, integer) from public;
revoke all on function public.list_save(jsonb) from public, anon;
revoke all on function public.list_delete(uuid) from public, anon;
revoke all on function public.list_new_key(uuid) from public, anon;
revoke all on function public.list_add(uuid, text, text) from public, anon;
revoke all on function public.list_remove(uuid, text) from public, anon;
revoke all on function public.list_note(uuid, text, text) from public, anon;
revoke all on function public.list_move(uuid, text[]) from public, anon;
revoke all on function public.list_editor_add(uuid, text) from public, anon;
revoke all on function public.list_editor_remove(uuid, uuid) from public, anon;
revoke all on function public.list_bookmark(uuid, boolean, text) from public, anon;
revoke all on function public.list_export() from public, anon;
grant execute on function public.lists_mine() to authenticated;
grant execute on function public.list_get(uuid, text) to anon, authenticated;
grant execute on function public.lists_of(text) to anon, authenticated;
grant execute on function public.lists_with_game(text, integer) to anon, authenticated;
grant execute on function public.list_save(jsonb) to authenticated;
grant execute on function public.list_delete(uuid) to authenticated;
grant execute on function public.list_new_key(uuid) to authenticated;
grant execute on function public.list_add(uuid, text, text) to authenticated;
grant execute on function public.list_remove(uuid, text) to authenticated;
grant execute on function public.list_note(uuid, text, text) to authenticated;
grant execute on function public.list_move(uuid, text[]) to authenticated;
grant execute on function public.list_editor_add(uuid, text) to authenticated;
grant execute on function public.list_editor_remove(uuid, uuid) to authenticated;
grant execute on function public.list_bookmark(uuid, boolean, text) to authenticated;
grant execute on function public.list_export() to authenticated;
revoke all on function public.search_community(text, integer) from public, anon;
grant execute on function public.search_community(text, integer) to authenticated;
revoke all on function public.notif_pref_key(text) from public, anon, authenticated;
revoke all on function public.notif_group(text) from public, anon, authenticated;
