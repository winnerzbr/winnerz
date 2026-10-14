-- Etapa 6 · Comunidades com tema
-- Comunidades em /w/nome criadas por qualquer pessoa, postagens com etiqueta, jogo, spoiler, imagens (até 4) e clipe,
-- respostas em fio (2 níveis), reações GG e coração, "a resposta" nas perguntas, comunidade oficial do canal,
-- avisos de resposta e denúncias de comunidade, postagem e resposta na fila do Studio.
-- Precisa da 0024 e da 0025. Rodar uma vez, no SQL Editor do Supabase (pode rodar de novo sem problema).

-- ---------------------------------------------------------------------------------------------------------------
-- Tabelas (só as funções abaixo mexem nelas)
-- ---------------------------------------------------------------------------------------------------------------
alter table public.profiles add column if not exists replies_seen_at timestamptz;

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'),
  name text not null check (char_length(name) between 3 and 48),
  description text not null default '' check (char_length(description) <= 300),
  rules text not null default '' check (char_length(rules) <= 1000),
  cover text check (cover is null or char_length(cover) <= 200),
  game_id text references public.games (id) on delete set null,
  official boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  mod_hidden boolean not null default false
);
create index if not exists communities_created_by on public.communities (created_by, created_at desc);

create table if not exists public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'membro' check (role in ('dono', 'membro')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index if not exists community_members_user on public.community_members (user_id, joined_at desc);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  author uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('discussao', 'pergunta', 'dica', 'colecao', 'clipe')),
  title text not null check (char_length(title) between 3 and 140),
  body text not null default '' check (char_length(body) <= 10000),
  game_id text references public.games (id) on delete set null,
  spoiler text check (spoiler in ('inicio', 'meio', 'final')),
  images text[] not null default '{}' check (cardinality(images) <= 4),
  clip text check (clip is null or char_length(clip) <= 300),
  pinned boolean not null default false,
  answer_id uuid,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  mod_hidden boolean not null default false
);
create index if not exists posts_community on public.posts (community_id, created_at desc);
create index if not exists posts_game on public.posts (game_id, created_at desc) where game_id is not null;
create index if not exists posts_author on public.posts (author, created_at desc);

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  parent_id uuid references public.replies (id) on delete cascade,
  author uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  mod_hidden boolean not null default false
);
create index if not exists replies_post on public.replies (post_id, created_at);
create index if not exists replies_parent on public.replies (parent_id) where parent_id is not null;
create index if not exists replies_recent on public.replies (created_at desc);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'posts_answer_fk') then
    alter table public.posts add constraint posts_answer_fk foreign key (answer_id) references public.replies (id) on delete set null;
  end if;
end $$;

create table if not exists public.reactions (
  target text not null check (target in ('post', 'resposta')),
  target_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('gg', 'coracao')),
  created_at timestamptz not null default now(),
  primary key (target, target_id, user_id, kind)
);
create index if not exists reactions_target on public.reactions (target, target_id);

alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.posts enable row level security;
alter table public.replies enable row level security;
alter table public.reactions enable row level security;
revoke all on public.communities, public.community_members, public.posts, public.replies, public.reactions from anon, authenticated;

-- Imagens das postagens e capas das comunidades: leitura pública, cada pessoa envia só na própria pasta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comunidade', 'comunidade', true, 3145728, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

drop policy if exists "comunidade: enviar as suas" on storage.objects;
create policy "comunidade: enviar as suas" on storage.objects for insert to authenticated
  with check (bucket_id = 'comunidade' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "comunidade: ver as suas" on storage.objects;
create policy "comunidade: ver as suas" on storage.objects for select to authenticated
  using (bucket_id = 'comunidade' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "comunidade: apagar as suas" on storage.objects;
create policy "comunidade: apagar as suas" on storage.objects for delete to authenticated
  using (bucket_id = 'comunidade' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- ---------------------------------------------------------------------------------------------------------------
-- Quem aparece para quem
-- ---------------------------------------------------------------------------------------------------------------
-- Quem escreveu aparece para quem está vendo? Some se a conta está suspensa, se quem vê bloqueou ou silenciou,
-- ou se quem escreveu bloqueou quem vê. A própria pessoa e a administração sempre veem.
create or replace function public.author_visible(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(a = auth.uid(), false) or public.is_admin() or (
    not exists (select 1 from profiles p where p.id = a and p.suspended_until > now())
    and not exists (select 1 from user_blocks b
                    where (b.blocker = auth.uid() and b.blocked = a)
                       or (b.blocker = a and b.blocked = auth.uid() and b.kind = 'bloquear')));
$$;

create or replace function public.community_open(c public.communities) returns boolean
language sql stable security definer set search_path = public as $$
  select not c.mod_hidden or public.is_admin() or coalesce(c.created_by = auth.uid(), false);
$$;

create or replace function public.content_open(p_author uuid, p_hidden boolean, p_deleted timestamptz) returns boolean
language sql stable security definer set search_path = public as $$
  select p_deleted is null and public.author_visible(p_author)
     and (not p_hidden or public.is_admin() or coalesce(p_author = auth.uid(), false));
$$;

create or replace function public.person_json(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', p.id, 'handle', p.handle, 'avatar', p.avatar, 'admin', p.is_admin)
  from profiles p where p.id = p_id;
$$;

create or replace function public.reaction_json(p_target text, p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'gg', count(*) filter (where kind = 'gg'),
    'coracao', count(*) filter (where kind = 'coracao'),
    'mine', coalesce(jsonb_agg(kind) filter (where user_id = auth.uid()), '[]'::jsonb))
  from reactions where target = p_target and target_id = p_id;
$$;

create or replace function public.game_json(p_id text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', g.id, 'slug', g.slug, 'title', g.title, 'cover', g.cover) from games g where g.id = p_id;
$$;

-- Cartão de uma comunidade.
create or replace function public.community_json(c public.communities) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'description', c.description, 'rules', c.rules,
    'cover', c.cover, 'official', c.official, 'game', public.game_json(c.game_id), 'createdAt', c.created_at,
    'hidden', c.mod_hidden, 'owner', public.person_json(c.created_by),
    'members', (select count(*) from community_members m where m.community_id = c.id),
    'posts', (select count(*) from posts p where p.community_id = c.id and p.deleted_at is null and not p.mod_hidden),
    'lastAt', (select max(p.created_at) from posts p where p.community_id = c.id and p.deleted_at is null and not p.mod_hidden),
    'role', (select m.role from community_members m where m.community_id = c.id and m.user_id = auth.uid()));
$$;

-- Postagem: resumo (lista) ou inteira.
create or replace function public.post_json(p public.posts, p_full boolean) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', p.id, 'kind', p.kind, 'title', p.title,
    'body', case when p_full then p.body else left(p.body, 280) end,
    'game', public.game_json(p.game_id), 'spoiler', p.spoiler,
    'images', to_jsonb(case when p_full then p.images else p.images[1:1] end), 'imageCount', cardinality(p.images),
    'clip', p.clip, 'pinned', p.pinned, 'answerId', p.answer_id,
    'createdAt', p.created_at, 'editedAt', p.edited_at, 'hidden', p.mod_hidden,
    'author', public.person_json(p.author),
    'community', (select jsonb_build_object('slug', c.slug, 'name', c.name, 'official', c.official) from communities c where c.id = p.community_id),
    'replies', (select count(*) from replies r where r.post_id = p.id and public.content_open(r.author, r.mod_hidden, r.deleted_at)),
    'lastReplyAt', (select max(r.created_at) from replies r where r.post_id = p.id and r.deleted_at is null and not r.mod_hidden),
    'reactions', public.reaction_json('post', p.id));
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Comunidades
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.check_can_publish() returns void
language plpgsql stable security definer set search_path = public as $$
declare p profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  select * into p from profiles where id = auth.uid();
  if p.handle is null then raise exception 'handle_needed'; end if;
  if p.rules_accepted_at is null then raise exception 'rules_needed'; end if;
  if p.suspended_until > now() then raise exception 'suspended'; end if;
end; $$;

create or replace function public.community_slug_ok(p_slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select p_slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$' and p_slug !~ '--'
     and (public.is_admin() or not (public.handle_is_reserved(replace(p_slug, '-', '_')) or p_slug in ('nova', 'criar', 'editar', 'escrever', 'comunidades')))
     and not public.has_bad_term(replace(p_slug, '-', ' '), true);
$$;

create or replace function public.community_list(p_q text default null, p_limit integer default 60) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x.j order by x.official desc, x.members desc, x.created_at desc), '[]'::jsonb) from (
    select public.community_json(c) j, c.official, c.created_at,
           (select count(*) from community_members m where m.community_id = c.id) members
    from communities c
    where public.community_open(c) and not c.mod_hidden
      and (coalesce(trim(p_q), '') = '' or public.norm_text(c.name || ' ' || c.description || ' ' || c.slug) like '%' || public.norm_text(trim(p_q)) || '%')
    order by c.official desc, members desc, c.created_at desc
    limit greatest(1, least(coalesce(p_limit, 60), 200))) x;
$$;

create or replace function public.my_communities() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public.community_json(c) order by m.joined_at desc), '[]'::jsonb)
  from community_members m join communities c on c.id = m.community_id
  where m.user_id = auth.uid() and public.community_open(c);
$$;

create or replace function public.community_get(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select public.community_json(c) from communities c where c.slug = lower(p_slug) and public.community_open(c);
$$;

create or replace function public.community_create(p_slug text, p_name text, p_description text, p_rules text, p_game text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_slug text := lower(trim(coalesce(p_slug, ''))); v_name text := trim(coalesce(p_name, '')); n integer; c communities%rowtype;
begin
  perform public.check_can_publish();
  if not public.community_slug_ok(v_slug) then
    if v_slug !~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$' or v_slug ~ '--' then raise exception 'slug_invalid'; end if;
    if public.has_bad_term(replace(v_slug, '-', ' '), true) then raise exception 'slug_offensive'; end if;
    raise exception 'slug_reserved';
  end if;
  if exists (select 1 from communities where slug = v_slug) then raise exception 'slug_taken'; end if;
  if char_length(v_name) < 3 or char_length(v_name) > 48 then raise exception 'name_invalid'; end if;
  if public.has_bad_term(v_name) or public.has_bad_term(p_description) or public.has_bad_term(p_rules) then raise exception 'text_offensive'; end if;
  if not public.is_admin() then
    select count(*) into n from communities where created_by = auth.uid() and created_at > now() - interval '1 day';
    if n >= 3 then raise exception 'community_limit'; end if;
  end if;
  perform public.note_public_act();
  insert into communities (slug, name, description, rules, game_id, created_by)
  values (v_slug, v_name, left(trim(coalesce(p_description, '')), 300), left(trim(coalesce(p_rules, '')), 1000),
          (select id from games where id = p_game), auth.uid())
  returning * into c;
  insert into community_members (community_id, user_id, role) values (c.id, auth.uid(), 'dono');
  return public.community_json(c);
end; $$;

create or replace function public.community_can_edit(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (select 1 from community_members where community_id = p_id and user_id = auth.uid() and role = 'dono');
$$;

create or replace function public.community_update(p_id uuid, p_name text, p_description text, p_rules text, p_game text, p_cover text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_name text := trim(coalesce(p_name, '')); c communities%rowtype;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if not public.community_can_edit(p_id) then raise exception 'not_owner'; end if;
  if char_length(v_name) < 3 or char_length(v_name) > 48 then raise exception 'name_invalid'; end if;
  if public.has_bad_term(v_name) or public.has_bad_term(p_description) or public.has_bad_term(p_rules) then raise exception 'text_offensive'; end if;
  if p_cover is not null and (p_cover not like auth.uid()::text || '/%' or length(p_cover) > 200)
     and p_cover is distinct from (select cover from communities where id = p_id) then raise exception 'image_path'; end if;
  update communities set name = v_name, description = left(trim(coalesce(p_description, '')), 300), rules = left(trim(coalesce(p_rules, '')), 1000),
         game_id = (select id from games where id = p_game), cover = p_cover
   where id = p_id returning * into c;
  return public.community_json(c);
end; $$;

-- Só a administração marca a comunidade oficial do canal.
create or replace function public.community_set_official(p_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update communities set official = coalesce(p_on, false) where id = p_id;
end; $$;

create or replace function public.community_join(p_id uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c communities%rowtype;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  select * into c from communities where id = p_id and public.community_open(communities);
  if not found then raise exception 'target_not_found'; end if;
  if p_on then
    insert into community_members (community_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  else
    if exists (select 1 from community_members where community_id = p_id and user_id = auth.uid() and role = 'dono') then raise exception 'owner_leave'; end if;
    delete from community_members where community_id = p_id and user_id = auth.uid();
  end if;
  return public.community_json(c);
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Postagens
-- ---------------------------------------------------------------------------------------------------------------
-- p_sort: 'recentes' (com p_before para continuar) ou 'conversadas' (as com mais respostas nos últimos 7 dias).
-- As fixadas vêm à parte, em "pinned".
create or replace function public.community_posts(p_slug text, p_sort text default 'recentes', p_before timestamptz default null, p_limit integer default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c communities%rowtype; lim integer := greatest(1, least(coalesce(p_limit, 30), 60)); list jsonb; pins jsonb;
begin
  select * into c from communities where slug = lower(p_slug);
  if not found or not public.community_open(c) then return null; end if;
  select coalesce(jsonb_agg(public.post_json(p, false) order by p.created_at desc), '[]'::jsonb) into pins
  from posts p where p.community_id = c.id and p.pinned and public.content_open(p.author, p.mod_hidden, p.deleted_at);
  if p_sort = 'conversadas' then
    select coalesce(jsonb_agg(x.j order by x.n desc, x.created_at desc), '[]'::jsonb) into list from (
      select public.post_json(p, false) j, p.created_at,
             (select count(*) from replies r where r.post_id = p.id and r.created_at > now() - interval '7 days' and r.deleted_at is null and not r.mod_hidden) n
      from posts p
      where p.community_id = c.id and not p.pinned and public.content_open(p.author, p.mod_hidden, p.deleted_at)
        and exists (select 1 from replies r where r.post_id = p.id and r.created_at > now() - interval '7 days' and r.deleted_at is null and not r.mod_hidden)
      order by n desc, p.created_at desc limit lim) x;
  else
    select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb) into list from (
      select public.post_json(p, false) j, p.created_at from posts p
      where p.community_id = c.id and not p.pinned and public.content_open(p.author, p.mod_hidden, p.deleted_at)
        and (p_before is null or p.created_at < p_before)
      order by p.created_at desc limit lim) x;
  end if;
  return jsonb_build_object('community', public.community_json(c), 'pinned', pins, 'posts', list);
end; $$;

-- A postagem inteira, com as respostas em fio.
create or replace function public.post_get(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p posts%rowtype; c communities%rowtype;
begin
  select * into p from posts where id = p_id;
  if not found or not public.content_open(p.author, p.mod_hidden, p.deleted_at) then return null; end if;
  select * into c from communities where id = p.community_id;
  if not public.community_open(c) then return null; end if;
  return public.post_json(p, true) || jsonb_build_object(
    'communityFull', public.community_json(c),
    'canModerate', public.community_can_edit(c.id),
    'thread', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'parentId', r.parent_id,
        'body', case when r.deleted_at is not null then '' else r.body end, 'deleted', r.deleted_at is not null,
        'createdAt', r.created_at, 'editedAt', r.edited_at, 'hidden', r.mod_hidden,
        'author', public.person_json(r.author), 'reactions', public.reaction_json('resposta', r.id)) order by r.created_at)
      from replies r where r.post_id = p.id
        and public.author_visible(r.author)
        and (not r.mod_hidden or public.is_admin() or r.author = auth.uid())
        -- resposta apagada continua como "apagada" só se tiver respostas embaixo
        and (r.deleted_at is null or exists (select 1 from replies k where k.parent_id = r.id and k.deleted_at is null))), '[]'::jsonb));
end; $$;

create or replace function public.clean_images(p_images text[]) returns text[]
language plpgsql stable security definer set search_path = public as $$
declare out text[] := '{}'; x text;
begin
  foreach x in array coalesce(p_images, '{}') loop
    if x is null or x = '' then continue; end if;
    if x not like auth.uid()::text || '/%' or length(x) > 200 then raise exception 'image_path'; end if;
    out := out || x;
  end loop;
  if cardinality(out) > 4 then raise exception 'image_limit'; end if;
  return out;
end; $$;

create or replace function public.clean_clip(p_clip text) returns text
language plpgsql immutable as $$
declare v text := nullif(trim(coalesce(p_clip, '')), '');
begin
  if v is null then return null; end if;
  if v !~ '^https://(www\.|m\.)?(youtube\.com|youtu\.be|twitch\.tv|clips\.twitch\.tv)/[^\s<>"]{1,240}$' then raise exception 'clip_invalid'; end if;
  return v;
end; $$;

create or replace function public.post_create(p_community uuid, p_kind text, p_title text, p_body text, p_game text, p_spoiler text, p_images text[], p_clip text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c communities%rowtype; p posts%rowtype; n integer; v_title text := trim(coalesce(p_title, '')); v_clip text;
begin
  perform public.check_can_publish();
  select * into c from communities where id = p_community;
  if not found or c.mod_hidden then raise exception 'target_not_found'; end if;
  if c.official and not public.is_admin() then raise exception 'official_only'; end if;
  if p_kind not in ('discussao', 'pergunta', 'dica', 'colecao', 'clipe') then raise exception 'post_kind'; end if;
  if char_length(v_title) < 3 or char_length(v_title) > 140 then raise exception 'title_invalid'; end if;
  if public.has_bad_term(v_title) then raise exception 'title_offensive'; end if;
  if char_length(coalesce(p_body, '')) > 10000 then raise exception 'body_long'; end if;
  if p_spoiler is not null and p_spoiler not in ('inicio', 'meio', 'final') then raise exception 'post_spoiler'; end if;
  v_clip := public.clean_clip(p_clip);
  if p_kind = 'clipe' and v_clip is null then raise exception 'clip_needed'; end if;
  if not public.is_admin() then
    select count(*) into n from posts where author = auth.uid() and created_at > now() - interval '1 day';
    if n >= 20 then raise exception 'post_limit'; end if;
  end if;
  perform public.note_public_act();
  insert into posts (community_id, author, kind, title, body, game_id, spoiler, images, clip)
  values (c.id, auth.uid(), p_kind, v_title, coalesce(p_body, ''), (select id from games where id = p_game),
          case when p_game is not null then p_spoiler end, public.clean_images(p_images), v_clip)
  returning * into p;
  insert into community_members (community_id, user_id) values (c.id, auth.uid()) on conflict do nothing;
  return public.post_json(p, true);
end; $$;

create or replace function public.post_edit(p_id uuid, p_kind text, p_title text, p_body text, p_game text, p_spoiler text, p_images text[], p_clip text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p posts%rowtype; v_title text := trim(coalesce(p_title, '')); v_clip text;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  select * into p from posts where id = p_id and deleted_at is null;
  if not found or p.author <> auth.uid() then raise exception 'not_author'; end if;
  if p_kind not in ('discussao', 'pergunta', 'dica', 'colecao', 'clipe') then raise exception 'post_kind'; end if;
  if char_length(v_title) < 3 or char_length(v_title) > 140 then raise exception 'title_invalid'; end if;
  if public.has_bad_term(v_title) then raise exception 'title_offensive'; end if;
  if char_length(coalesce(p_body, '')) > 10000 then raise exception 'body_long'; end if;
  if p_spoiler is not null and p_spoiler not in ('inicio', 'meio', 'final') then raise exception 'post_spoiler'; end if;
  v_clip := public.clean_clip(p_clip);
  if p_kind = 'clipe' and v_clip is null then raise exception 'clip_needed'; end if;
  update posts set kind = p_kind, title = v_title, body = coalesce(p_body, ''), game_id = (select id from games where id = p_game),
         spoiler = case when p_game is not null then p_spoiler end, images = public.clean_images(p_images), clip = v_clip, edited_at = now()
   where id = p_id returning * into p;
  return public.post_json(p, true);
end; $$;

-- Apaga a própria postagem. Devolve as imagens, para o site tirar do armazenamento.
create or replace function public.post_delete(p_id uuid) returns text[]
language plpgsql security definer set search_path = public as $$
declare imgs text[];
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  select images into imgs from posts where id = p_id and author = auth.uid() and deleted_at is null;
  if not found then raise exception 'not_author'; end if;
  update posts set deleted_at = now(), images = '{}', pinned = false, answer_id = null where id = p_id;
  return coalesce(imgs, '{}');
end; $$;

create or replace function public.post_pin(p_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select community_id into cid from posts where id = p_id and deleted_at is null;
  if cid is null then raise exception 'target_not_found'; end if;
  if not public.community_can_edit(cid) then raise exception 'not_owner'; end if;
  if p_on and (select count(*) from posts where community_id = cid and pinned) >= 3 then raise exception 'pin_limit'; end if;
  update posts set pinned = coalesce(p_on, false) where id = p_id;
end; $$;

-- "A resposta" de uma pergunta: quem perguntou (ou a administração) escolhe; null tira.
create or replace function public.post_answer(p_id uuid, p_reply uuid) returns void
language plpgsql security definer set search_path = public as $$
declare p posts%rowtype;
begin
  select * into p from posts where id = p_id and deleted_at is null;
  if not found then raise exception 'target_not_found'; end if;
  if p.author <> auth.uid() and not public.is_admin() then raise exception 'not_author'; end if;
  if p.kind <> 'pergunta' then raise exception 'post_kind'; end if;
  if p_reply is not null and not exists (select 1 from replies where id = p_reply and post_id = p_id and deleted_at is null) then raise exception 'target_not_found'; end if;
  update posts set answer_id = p_reply where id = p_id;
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Respostas e reações
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.reply_create(p_post uuid, p_parent uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p posts%rowtype; v_parent uuid := p_parent; n integer; r replies%rowtype; v_body text := trim(coalesce(p_body, ''));
begin
  perform public.check_can_publish();
  select * into p from posts where id = p_post and deleted_at is null and not mod_hidden;
  if not found then raise exception 'target_not_found'; end if;
  if not public.author_visible(p.author) then raise exception 'target_not_found'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 5000 then raise exception 'body_invalid'; end if;
  -- No máximo 2 níveis: responder a uma resposta de resposta vira resposta do mesmo fio.
  if v_parent is not null then
    select coalesce(parent_id, id) into v_parent from replies where id = v_parent and post_id = p_post;
    if v_parent is null then raise exception 'target_not_found'; end if;
  end if;
  if not public.is_admin() then
    select count(*) into n from replies where author = auth.uid() and created_at > now() - interval '1 hour';
    if n >= 60 then raise exception 'reply_limit'; end if;
  end if;
  perform public.note_public_act();
  insert into replies (post_id, parent_id, author, body) values (p_post, v_parent, auth.uid(), v_body) returning * into r;
  return jsonb_build_object('id', r.id, 'parentId', r.parent_id, 'body', r.body, 'deleted', false, 'createdAt', r.created_at, 'editedAt', null,
    'hidden', false, 'author', public.person_json(r.author), 'reactions', public.reaction_json('resposta', r.id));
end; $$;

create or replace function public.reply_edit(p_id uuid, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare v_body text := trim(coalesce(p_body, ''));
begin
  if char_length(v_body) < 1 or char_length(v_body) > 5000 then raise exception 'body_invalid'; end if;
  update replies set body = v_body, edited_at = now() where id = p_id and author = auth.uid() and deleted_at is null;
  if not found then raise exception 'not_author'; end if;
end; $$;

create or replace function public.reply_delete(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update replies set deleted_at = now() where id = p_id and author = auth.uid() and deleted_at is null;
  if not found then raise exception 'not_author'; end if;
  update posts set answer_id = null where answer_id = p_id;
end; $$;

create or replace function public.react(p_target text, p_id uuid, p_kind text, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a uuid;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if p_kind not in ('gg', 'coracao') then raise exception 'react_kind'; end if;
  if p_target = 'post' then select author into a from posts where id = p_id and deleted_at is null and not mod_hidden;
  elsif p_target = 'resposta' then select author into a from replies where id = p_id and deleted_at is null and not mod_hidden;
  else raise exception 'react_kind'; end if;
  if a is null or not public.author_visible(a) then raise exception 'target_not_found'; end if;
  if p_on then insert into reactions (target, target_id, user_id, kind) values (p_target, p_id, auth.uid(), p_kind) on conflict do nothing;
  else delete from reactions where target = p_target and target_id = p_id and user_id = auth.uid() and kind = p_kind; end if;
  return public.reaction_json(p_target, p_id);
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Pela Comunidade e pela ficha do jogo
-- ---------------------------------------------------------------------------------------------------------------
-- O que saiu de novo nas comunidades de que a pessoa participa.
create or replace function public.communities_feed(p_limit integer default 20) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x.j order by x.at desc), '[]'::jsonb) from (
    select public.post_json(p, false) j, greatest(p.created_at, coalesce((select max(r.created_at) from replies r where r.post_id = p.id and r.deleted_at is null), p.created_at)) at
    from posts p join community_members m on m.community_id = p.community_id and m.user_id = auth.uid()
    join communities c on c.id = p.community_id
    where public.content_open(p.author, p.mod_hidden, p.deleted_at) and not c.mod_hidden
    order by at desc limit greatest(1, least(coalesce(p_limit, 20), 60))) x;
$$;

-- Postagens ligadas a um jogo, de todas as comunidades.
create or replace function public.game_posts(p_game text, p_limit integer default 10) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb) from (
    select public.post_json(p, false) j, p.created_at from posts p
    join games g on g.id = p.game_id join communities c on c.id = p.community_id
    where (g.id = p_game or g.slug = p_game) and public.content_open(p.author, p.mod_hidden, p.deleted_at) and not c.mod_hidden
    order by p.created_at desc limit greatest(1, least(coalesce(p_limit, 10), 40))) x;
$$;

-- Respostas novas nas postagens da pessoa e nas respostas dela.
create or replace function public.my_reply_news() returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (select id, coalesce(replies_seen_at, created_at) since from profiles where id = auth.uid()),
  news as (
    select r.*, p.title, p.id pid, c.slug from replies r
    join posts p on p.id = r.post_id join communities c on c.id = p.community_id
    left join replies parent on parent.id = r.parent_id, me
    where r.author <> me.id and r.created_at > me.since and r.deleted_at is null and not r.mod_hidden
      and p.deleted_at is null and (p.author = me.id or parent.author = me.id)
      and public.author_visible(r.author))
  select jsonb_build_object('count', (select count(*) from news),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'postId', n.pid, 'slug', n.slug, 'title', n.title,
        'excerpt', left(n.body, 140), 'at', n.created_at, 'author', public.person_json(n.author)) order by n.created_at desc)
      from (select * from news order by created_at desc limit 12) n), '[]'::jsonb));
$$;

create or replace function public.replies_seen() returns void
language sql security definer set search_path = public as $$
  update profiles set replies_seen_at = now() where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Denúncias e moderação: comunidade, postagem e resposta entram na fila do Studio
-- ---------------------------------------------------------------------------------------------------------------
alter table public.content_reports drop constraint if exists content_reports_kind_check;
alter table public.content_reports add constraint content_reports_kind_check
  check (kind in ('perfil', 'jornada', 'vitrine', 'momento', 'museu', 'comunidade', 'postagem', 'resposta'));

-- Mesmas funções da 0024, agora com comunidade, postagem e resposta.
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
    select jsonb_build_object('title', p.title, 'text', left(p.body, 400), 'slug', c.slug, 'community', c.name, 'photo', cardinality(p.images) > 0,
                              'game', g.title, 'hidden', p.mod_hidden) into out
    from posts p join communities c on c.id = p.community_id left join games g on g.id = p.game_id
    where p.author = p_owner and p.id::text = p_ref and p.deleted_at is null;
  elsif p_kind = 'resposta' then
    select jsonb_build_object('title', p.title, 'text', left(r.body, 400), 'slug', c.slug, 'community', c.name, 'postId', p.id, 'hidden', r.mod_hidden) into out
    from replies r join posts p on p.id = r.post_id join communities c on c.id = p.community_id
    where r.author = p_owner and r.id::text = p_ref and r.deleted_at is null;
  end if;
  return out;
end; $$;

create or replace function public.report_content(p_kind text, p_handle text, p_ref text, p_reason text, p_note text) returns text
language plpgsql security definer set search_path = public as $$
declare owner_id uuid; snap jsonb; n integer; r text := coalesce(p_ref, ''); v_note text := nullif(left(trim(coalesce(p_note, '')), 500), '');
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if p_kind not in ('perfil', 'jornada', 'vitrine', 'momento', 'museu', 'comunidade', 'postagem', 'resposta') then raise exception 'report_kind'; end if;
  if p_reason not in ('ofensa', 'spoiler', 'spam', 'improprio', 'outro') then raise exception 'report_reason'; end if;
  select id into owner_id from profiles where handle is not null and lower(handle) = lower(p_handle);
  if owner_id is null then raise exception 'target_not_found'; end if;
  if owner_id = auth.uid() then raise exception 'report_self'; end if;
  if p_kind in ('perfil', 'museu') then r := ''; end if;
  snap := public.target_snapshot(p_kind, owner_id, r);
  if snap is null then raise exception 'target_not_found'; end if;
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
    when 'resposta' then 'Uma resposta sua em “' || coalesce(snap ->> 'title', '') || '”'
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
    txt := what || ' saiu da comunidade por decisão da moderação. Só você ainda consegue ver.';
  elsif p_action = 'ocultar' and p_kind = 'resposta' then
    select jsonb_build_object('id', id, 'mod_hidden', mod_hidden) into v_before from replies where author = p_owner and id::text = r;
    if v_before is null then raise exception 'target_not_found'; end if;
    update replies set mod_hidden = true where id = (v_before ->> 'id')::uuid;
    txt := what || ' saiu da conversa por decisão da moderação. Só você ainda consegue ver.';
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
revoke all on function public.author_visible(uuid) from public, anon, authenticated;
revoke all on function public.community_open(public.communities) from public, anon, authenticated;
revoke all on function public.content_open(uuid, boolean, timestamptz) from public, anon, authenticated;
revoke all on function public.person_json(uuid) from public, anon, authenticated;
revoke all on function public.reaction_json(text, uuid) from public, anon, authenticated;
revoke all on function public.game_json(text) from public, anon, authenticated;
revoke all on function public.community_json(public.communities) from public, anon, authenticated;
revoke all on function public.post_json(public.posts, boolean) from public, anon, authenticated;
revoke all on function public.check_can_publish() from public, anon, authenticated;
revoke all on function public.community_slug_ok(text) from public, anon, authenticated;
revoke all on function public.community_can_edit(uuid) from public, anon, authenticated;
revoke all on function public.clean_images(text[]) from public, anon, authenticated;
revoke all on function public.clean_clip(text) from public, anon, authenticated;

grant execute on function public.community_list(text, integer) to anon, authenticated;
grant execute on function public.community_get(text) to anon, authenticated;
grant execute on function public.community_posts(text, text, timestamptz, integer) to anon, authenticated;
grant execute on function public.post_get(uuid) to anon, authenticated;
grant execute on function public.game_posts(text, integer) to anon, authenticated;

revoke all on function public.my_communities() from public, anon;
revoke all on function public.community_create(text, text, text, text, text) from public, anon;
revoke all on function public.community_update(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.community_set_official(uuid, boolean) from public, anon;
revoke all on function public.community_join(uuid, boolean) from public, anon;
revoke all on function public.post_create(uuid, text, text, text, text, text, text[], text) from public, anon;
revoke all on function public.post_edit(uuid, text, text, text, text, text, text[], text) from public, anon;
revoke all on function public.post_delete(uuid) from public, anon;
revoke all on function public.post_pin(uuid, boolean) from public, anon;
revoke all on function public.post_answer(uuid, uuid) from public, anon;
revoke all on function public.reply_create(uuid, uuid, text) from public, anon;
revoke all on function public.reply_edit(uuid, text) from public, anon;
revoke all on function public.reply_delete(uuid) from public, anon;
revoke all on function public.react(text, uuid, text, boolean) from public, anon;
revoke all on function public.communities_feed(integer) from public, anon;
revoke all on function public.my_reply_news() from public, anon;
revoke all on function public.replies_seen() from public, anon;
grant execute on function public.my_communities() to authenticated;
grant execute on function public.community_create(text, text, text, text, text) to authenticated;
grant execute on function public.community_update(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.community_set_official(uuid, boolean) to authenticated;
grant execute on function public.community_join(uuid, boolean) to authenticated;
grant execute on function public.post_create(uuid, text, text, text, text, text, text[], text) to authenticated;
grant execute on function public.post_edit(uuid, text, text, text, text, text, text[], text) to authenticated;
grant execute on function public.post_delete(uuid) to authenticated;
grant execute on function public.post_pin(uuid, boolean) to authenticated;
grant execute on function public.post_answer(uuid, uuid) to authenticated;
grant execute on function public.reply_create(uuid, uuid, text) to authenticated;
grant execute on function public.reply_edit(uuid, text) to authenticated;
grant execute on function public.reply_delete(uuid) to authenticated;
grant execute on function public.react(text, uuid, text, boolean) to authenticated;
grant execute on function public.communities_feed(integer) to authenticated;
grant execute on function public.my_reply_news() to authenticated;
grant execute on function public.replies_seen() to authenticated;

-- A comunidade oficial do canal. Fica sem dono até a administração entrar nela pelo site (ou rodar o update abaixo).
insert into public.communities (slug, name, description, rules, official)
values ('winnerz', 'WinnerZ', 'A comunidade oficial do canal: avisos de vídeo e de live, novidades do site e o WinnerZ Awards.',
        'Só o canal publica aqui; todo mundo pode responder. Valem as regras da comunidade do WinnerZ.', true)
on conflict (slug) do nothing;
insert into public.community_members (community_id, user_id, role)
select c.id, p.id, 'dono' from public.communities c, public.profiles p where c.slug = 'winnerz' and p.is_admin
on conflict do nothing;

notify pgrst, 'reload schema';
