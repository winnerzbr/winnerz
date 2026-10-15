-- Etapa 6 · Clubes
-- Clubes soltos (podem ficar ligados a uma comunidade), sempre sobre um jogo, em três formatos:
--   encontro      → Encontro de uma noite: dia e hora, link da live, Vou/Talvez/Não vou, mural depois
--   sem_pressa    → Clube sem pressa: partes com datas sugeridas; a conversa de cada parte só abre para quem passou dela
--   primeira_vez  → Primeira vez juntos: quem nunca jogou e os guias (quem já zerou)
-- Acesso: aberto, só amigos (de quem criou) ou por convite (link com código). Limite de vagas opcional.
-- Precisa da 0024, 0025 e 0026. Rodar uma vez, no SQL Editor do Supabase (pode rodar de novo).

-- ---------------------------------------------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------------------------------------------
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'),
  name text not null check (char_length(name) between 3 and 60),
  description text not null default '' check (char_length(description) <= 500),
  format text not null check (format in ('encontro', 'sem_pressa', 'primeira_vez')),
  game_id text not null references public.games (id),
  access text not null default 'aberto' check (access in ('aberto', 'amigos', 'convite')),
  invite_code text not null default substr(md5(gen_random_uuid()::text), 1, 12),
  max_members integer check (max_members is null or max_members between 2 and 500),
  community_id uuid references public.communities (id) on delete set null,
  starts_at timestamptz,
  duration_min integer not null default 120 check (duration_min between 15 and 720),
  live_url text check (live_url is null or char_length(live_url) <= 300),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  mod_hidden boolean not null default false,
  check (format <> 'encontro' or starts_at is not null)
);
create index if not exists clubs_game on public.clubs (game_id);
create index if not exists clubs_starts on public.clubs (starts_at) where format = 'encontro';

create table if not exists public.club_members (
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'membro' check (role in ('dono', 'membro')),
  rsvp text check (rsvp in ('vou', 'talvez', 'nao')),
  first_time boolean,
  stage integer not null default 0 check (stage between 0 and 50),
  finished_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);
create index if not exists club_members_user on public.club_members (user_id, joined_at desc);

create table if not exists public.club_parts (
  club_id uuid not null references public.clubs (id) on delete cascade,
  ordinal integer not null check (ordinal between 1 and 30),
  title text not null check (char_length(title) between 1 and 80),
  suggested_on date,
  primary key (club_id, ordinal)
);

create table if not exists public.club_messages (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  part integer not null default 0 check (part between 0 and 30),
  parent_id uuid references public.club_messages (id) on delete cascade,
  author uuid not null references auth.users (id) on delete cascade,
  question boolean not null default false,
  body text not null check (char_length(body) between 1 and 5000),
  images text[] not null default '{}' check (cardinality(images) <= 4),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  mod_hidden boolean not null default false
);
create index if not exists club_messages_club on public.club_messages (club_id, part, created_at);

alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.club_parts enable row level security;
alter table public.club_messages enable row level security;
revoke all on public.clubs, public.club_members, public.club_parts, public.club_messages from anon, authenticated;

-- Reações (GG e coração) também nas mensagens dos clubes.
alter table public.reactions drop constraint if exists reactions_target_check;
alter table public.reactions add constraint reactions_target_check check (target in ('post', 'resposta', 'mensagem'));

-- ---------------------------------------------------------------------------------------------------------------
-- Quem vê e quem entra
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.club_member(p_club uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from club_members where club_id = p_club and user_id = auth.uid());
$$;

-- Ver a página: aberto para todos; "amigos" para os amigos de quem criou; "convite" com o código. Quem já está dentro
-- sempre vê. Clube tirado do ar pela moderação só para quem criou e a administração.
create or replace function public.club_open(c public.clubs, p_code text default null) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce(c.created_by = auth.uid(), false) or (
    not c.mod_hidden and public.author_visible(c.created_by) and (
      public.club_member(c.id)
      or c.access = 'aberto'
      or (c.access = 'amigos' and public.are_friends(c.created_by, auth.uid()))
      or (c.access = 'convite' and p_code is not null and p_code = c.invite_code)));
$$;

create or replace function public.club_ended(c public.clubs) returns boolean
language sql stable as $$
  select c.format = 'encontro' and c.starts_at + make_interval(mins => c.duration_min) < now();
$$;

-- Progresso de alguém no jogo do clube, pela Jornada, só se ela deixou ver.
create or replace function public.club_progress(p_user uuid, p_game text) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.can_see_pillar(p, 'jornada', null) then (
    select jsonb_build_object('progress', max(h.progress), 'completed', bool_or(h.state = 'concluida'))
    from journeys j join histories h on h.journey_id = j.id where j.user_id = p_user and j.game_id = p_game and not j.mod_hidden)
  end
  from profiles p where p.id = p_user;
$$;

create or replace function public.club_json(c public.clubs, p_full boolean) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'description', c.description, 'format', c.format,
    'game', public.game_json(c.game_id), 'access', c.access, 'maxMembers', c.max_members,
    'community', (select jsonb_build_object('slug', k.slug, 'name', k.name) from communities k where k.id = c.community_id),
    'startsAt', c.starts_at, 'durationMin', c.duration_min, 'liveUrl', c.live_url, 'ended', public.club_ended(c),
    'createdAt', c.created_at, 'hidden', c.mod_hidden, 'owner', public.person_json(c.created_by),
    'members', (select count(*) from club_members m where m.club_id = c.id),
    'going', (select count(*) from club_members m where m.club_id = c.id and m.rsvp = 'vou'),
    'me', (select jsonb_build_object('role', m.role, 'rsvp', m.rsvp, 'firstTime', m.first_time, 'stage', m.stage, 'finishedAt', m.finished_at)
           from club_members m where m.club_id = c.id and m.user_id = auth.uid()),
    'inviteCode', case when p_full and (c.created_by = auth.uid() or public.is_admin()) then c.invite_code end,
    'parts', coalesce((select jsonb_agg(jsonb_build_object('ordinal', pt.ordinal, 'title', pt.title, 'suggestedOn', pt.suggested_on) order by pt.ordinal)
                       from club_parts pt where pt.club_id = c.id), '[]'::jsonb),
    'lastAt', (select max(x.created_at) from club_messages x where x.club_id = c.id and x.deleted_at is null and not x.mod_hidden));
$$;

create or replace function public.club_person(p_club uuid, m public.club_members, p_game text) returns jsonb
language sql stable security definer set search_path = public as $$
  select public.person_json(m.user_id) || jsonb_build_object('role', m.role, 'rsvp', m.rsvp, 'firstTime', m.first_time,
    'stage', m.stage, 'finishedAt', m.finished_at, 'joinedAt', m.joined_at, 'journey', public.club_progress(m.user_id, p_game));
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Listas
-- ---------------------------------------------------------------------------------------------------------------
-- p_filter: 'todos' (abertos e de amigos), 'meus', 'proximos' (encontros dos próximos 7 dias que dá para ver)
create or replace function public.club_list(p_filter text default 'todos', p_game text default null, p_limit integer default 60) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x.j order by x.k1, x.k2 desc), '[]'::jsonb) from (
    select public.club_json(c, false) j,
           case when c.format = 'encontro' and not public.club_ended(c) then extract(epoch from c.starts_at) else 9e12 end k1,
           c.created_at k2
    from clubs c
    where not c.mod_hidden and public.author_visible(c.created_by)
      and (p_game is null or c.game_id = p_game or c.game_id = (select id from games where slug = p_game))
      and case p_filter
            when 'meus' then public.club_member(c.id)
            when 'proximos' then c.format = 'encontro' and c.starts_at + make_interval(mins => c.duration_min) > now()
                                 and c.starts_at < now() + interval '7 days'
                                 and (c.access <> 'convite' or public.club_member(c.id)) and public.club_open(c)
            else (c.access = 'aberto' or (c.access = 'amigos' and public.are_friends(c.created_by, auth.uid())) or public.club_member(c.id))
                 and not public.club_ended(c) end
    order by k1, k2 desc
    limit greatest(1, least(coalesce(p_limit, 60), 200))) x;
$$;

create or replace function public.club_get(p_slug text, p_code text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c clubs%rowtype; mine club_members%rowtype; v_stage integer; msgs jsonb;
begin
  select * into c from clubs where slug = lower(p_slug);
  if not found then return null; end if;
  if not public.club_open(c, p_code) then
    -- Sem acesso: só o cartão básico, para mostrar "este clube é só para amigos / por convite".
    if c.mod_hidden or not public.author_visible(c.created_by) then return null; end if;
    return jsonb_build_object('locked', true, 'slug', c.slug, 'name', c.name, 'access', c.access, 'format', c.format,
      'game', public.game_json(c.game_id), 'owner', public.person_json(c.created_by));
  end if;
  select * into mine from club_members where club_id = c.id and user_id = auth.uid();
  v_stage := case when public.is_admin() then 99 else coalesce(mine.stage, 0) end;
  -- Mensagens: as gerais (parte 0) para quem pode ver o clube; a de cada parte só para quem está dentro e passou dela.
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'part', x.part, 'parentId', x.parent_id, 'question', x.question,
      'body', case when x.deleted_at is not null then '' else x.body end, 'images', to_jsonb(case when x.deleted_at is null then x.images else '{}' end),
      'deleted', x.deleted_at is not null, 'createdAt', x.created_at, 'editedAt', x.edited_at, 'hidden', x.mod_hidden,
      'author', public.person_json(x.author), 'reactions', public.reaction_json('mensagem', x.id)) order by x.created_at), '[]'::jsonb)
  into msgs
  from club_messages x
  where x.club_id = c.id
    and public.author_visible(x.author)
    and (not x.mod_hidden or public.is_admin() or x.author = auth.uid())
    and (x.deleted_at is null or exists (select 1 from club_messages k where k.parent_id = x.id and k.deleted_at is null))
    and (x.part = 0 or (mine.user_id is not null and x.part <= v_stage) or public.is_admin());
  return public.club_json(c, true) || jsonb_build_object('locked', false,
    'people', coalesce((select jsonb_agg(public.club_person(c.id, m, c.game_id) order by m.role = 'dono' desc, m.joined_at)
                        from club_members m where m.club_id = c.id and public.author_visible(m.user_id)), '[]'::jsonb),
    'messages', msgs,
    'hiddenParts', coalesce((select jsonb_object_agg(x.part, x.n) from (
        select part, count(*) n from club_messages where club_id = c.id and part > v_stage and deleted_at is null and not mod_hidden group by part) x), '{}'::jsonb));
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Criar, editar, entrar
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.club_check_fields(p_name text, p_description text, p_live text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if char_length(trim(coalesce(p_name, ''))) < 3 or char_length(trim(p_name)) > 60 then raise exception 'name_invalid'; end if;
  if public.has_bad_term(p_name) or public.has_bad_term(p_description) then raise exception 'text_offensive'; end if;
  if char_length(coalesce(p_description, '')) > 500 then raise exception 'text_long'; end if;
  if p_live is not null and p_live <> '' and (char_length(p_live) > 300 or p_live !~ '^https://[^\s<>"]{4,}$') then raise exception 'live_invalid'; end if;
end; $$;

create or replace function public.club_save_parts(p_club uuid, p_parts jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare x jsonb; i integer := 0;
begin
  delete from club_parts where club_id = p_club;
  for x in select * from jsonb_array_elements(coalesce(p_parts, '[]'::jsonb)) loop
    i := i + 1;
    exit when i > 30;
    if char_length(trim(coalesce(x ->> 'title', ''))) = 0 then continue; end if;
    if public.has_bad_term(x ->> 'title') then raise exception 'text_offensive'; end if;
    insert into club_parts (club_id, ordinal, title, suggested_on)
    values (p_club, i, left(trim(x ->> 'title'), 80), nullif(x ->> 'suggestedOn', '')::date);
  end loop;
end; $$;

create or replace function public.club_create(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_slug text := lower(trim(coalesce(p ->> 'slug', ''))); n integer; c clubs%rowtype; v_game text; v_comm uuid;
begin
  perform public.check_can_publish();
  if not public.community_slug_ok(v_slug) then
    if v_slug !~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$' or v_slug ~ '--' then raise exception 'slug_invalid'; end if;
    if public.has_bad_term(replace(v_slug, '-', ' '), true) then raise exception 'slug_offensive'; end if;
    raise exception 'slug_reserved';
  end if;
  if exists (select 1 from clubs where slug = v_slug) then raise exception 'slug_taken'; end if;
  if p ->> 'format' not in ('encontro', 'sem_pressa', 'primeira_vez') then raise exception 'club_format'; end if;
  if coalesce(p ->> 'access', 'aberto') not in ('aberto', 'amigos', 'convite') then raise exception 'club_access'; end if;
  select id into v_game from games where id = p ->> 'gameId';
  if v_game is null then raise exception 'game_needed'; end if;
  perform public.club_check_fields(p ->> 'name', p ->> 'description', p ->> 'liveUrl');
  if p ->> 'format' = 'encontro' and (p ->> 'startsAt') is null then raise exception 'date_needed'; end if;
  if p ->> 'format' = 'encontro' and (p ->> 'startsAt')::timestamptz < now() - interval '1 hour' then raise exception 'date_past'; end if;
  if (p ->> 'communityId') is not null then
    select id into v_comm from communities where id = (p ->> 'communityId')::uuid and not mod_hidden;
  end if;
  if not public.is_admin() then
    select count(*) into n from clubs where created_by = auth.uid() and created_at > now() - interval '1 day';
    if n >= 5 then raise exception 'club_limit'; end if;
  end if;
  perform public.note_public_act();
  insert into clubs (slug, name, description, format, game_id, access, max_members, community_id, starts_at, duration_min, live_url, created_by)
  values (v_slug, trim(p ->> 'name'), left(trim(coalesce(p ->> 'description', '')), 500), p ->> 'format', v_game,
          coalesce(p ->> 'access', 'aberto'), nullif(p ->> 'maxMembers', '')::integer, v_comm,
          case when p ->> 'format' = 'encontro' then (p ->> 'startsAt')::timestamptz end,
          coalesce(nullif(p ->> 'durationMin', '')::integer, 120), nullif(trim(coalesce(p ->> 'liveUrl', '')), ''), auth.uid())
  returning * into c;
  if c.format = 'sem_pressa' then perform public.club_save_parts(c.id, p -> 'parts'); end if;
  insert into club_members (club_id, user_id, role, rsvp, first_time)
  values (c.id, auth.uid(), 'dono', case when c.format = 'encontro' then 'vou' end,
          case when c.format = 'primeira_vez' then coalesce((p ->> 'firstTime')::boolean, false) end);
  return public.club_json(c, true);
end; $$;

create or replace function public.club_update(p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c clubs%rowtype; v_comm uuid;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  select * into c from clubs where id = p_id;
  if not found then raise exception 'target_not_found'; end if;
  if c.created_by is distinct from auth.uid() and not public.is_admin() then raise exception 'not_owner'; end if;
  perform public.club_check_fields(p ->> 'name', p ->> 'description', p ->> 'liveUrl');
  if coalesce(p ->> 'access', c.access) not in ('aberto', 'amigos', 'convite') then raise exception 'club_access'; end if;
  if (p ->> 'communityId') is not null then
    select id into v_comm from communities where id = (p ->> 'communityId')::uuid and not mod_hidden;
  end if;
  update clubs set name = trim(p ->> 'name'), description = left(trim(coalesce(p ->> 'description', '')), 500),
         access = coalesce(p ->> 'access', access), max_members = nullif(p ->> 'maxMembers', '')::integer, community_id = v_comm,
         starts_at = case when format = 'encontro' then coalesce((p ->> 'startsAt')::timestamptz, starts_at) end,
         duration_min = coalesce(nullif(p ->> 'durationMin', '')::integer, duration_min),
         live_url = nullif(trim(coalesce(p ->> 'liveUrl', '')), ''),
         invite_code = case when (p ->> 'newCode')::boolean then substr(md5(gen_random_uuid()::text), 1, 12) else invite_code end
   where id = p_id returning * into c;
  if c.format = 'sem_pressa' and p ? 'parts' then perform public.club_save_parts(c.id, p -> 'parts'); end if;
  return public.club_json(c, true);
end; $$;

create or replace function public.club_join(p_slug text, p_code text, p_first_time boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c clubs%rowtype; n integer;
begin
  perform public.check_can_publish();
  select * into c from clubs where slug = lower(p_slug);
  if not found or not public.club_open(c, p_code) then raise exception 'club_closed'; end if;
  if public.club_member(c.id) then return public.club_json(c, true); end if;
  if public.club_ended(c) then raise exception 'club_ended'; end if;
  if c.max_members is not null then
    select count(*) into n from club_members where club_id = c.id;
    if n >= c.max_members then raise exception 'club_full'; end if;
  end if;
  insert into club_members (club_id, user_id, rsvp, first_time)
  values (c.id, auth.uid(), case when c.format = 'encontro' then 'vou' end, case when c.format = 'primeira_vez' then coalesce(p_first_time, true) end);
  return public.club_json(c, true);
end; $$;

create or replace function public.club_leave(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from club_members where club_id = p_id and user_id = auth.uid() and role = 'dono') then raise exception 'owner_leave'; end if;
  delete from club_members where club_id = p_id and user_id = auth.uid();
end; $$;

-- A própria situação no clube: Vou/Talvez/Não vou, em que parte está, primeira vez ou guia, "zerei".
create or replace function public.club_me(p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c clubs%rowtype; maxp integer;
begin
  select * into c from clubs where id = p_id;
  if not found or not public.club_member(p_id) then raise exception 'not_member'; end if;
  select coalesce(max(ordinal), 0) into maxp from club_parts where club_id = p_id;
  update club_members set
    rsvp = case when p ? 'rsvp' and c.format = 'encontro' and p ->> 'rsvp' in ('vou', 'talvez', 'nao') then p ->> 'rsvp' else rsvp end,
    stage = case when p ? 'stage' then greatest(0, least(maxp, (p ->> 'stage')::integer)) else stage end,
    first_time = case when p ? 'firstTime' and c.format = 'primeira_vez' then (p ->> 'firstTime')::boolean else first_time end,
    finished_at = case when p ? 'finished' then case when (p ->> 'finished')::boolean then coalesce(finished_at, now()) end else finished_at end
  where club_id = p_id and user_id = auth.uid();
  return public.club_json(c, true);
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Mensagens
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.club_message(p_club uuid, p_part integer, p_parent uuid, p_body text, p_question boolean, p_images text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c clubs%rowtype; mine club_members%rowtype; v_parent uuid := p_parent; v_part integer := coalesce(p_part, 0); n integer; m club_messages%rowtype;
  v_body text := trim(coalesce(p_body, ''));
begin
  perform public.check_can_publish();
  select * into c from clubs where id = p_club and not mod_hidden;
  if not found then raise exception 'target_not_found'; end if;
  select * into mine from club_members where club_id = p_club and user_id = auth.uid();
  if not found then raise exception 'not_member'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 5000 then raise exception 'body_invalid'; end if;
  if v_parent is not null then
    select coalesce(parent_id, id), part into v_parent, v_part from club_messages where id = p_parent and club_id = p_club;
    if v_parent is null then raise exception 'target_not_found'; end if;
  end if;
  if v_part > 0 and v_part > mine.stage and not public.is_admin() then raise exception 'part_locked'; end if;
  if v_part > 0 and not exists (select 1 from club_parts where club_id = p_club and ordinal = v_part) then raise exception 'target_not_found'; end if;
  if not public.is_admin() then
    select count(*) into n from club_messages where author = auth.uid() and created_at > now() - interval '1 hour';
    if n >= 60 then raise exception 'reply_limit'; end if;
  end if;
  perform public.note_public_act();
  insert into club_messages (club_id, part, parent_id, author, question, body, images)
  values (p_club, v_part, v_parent, auth.uid(), coalesce(p_question, false) and v_parent is null, v_body, public.clean_images(p_images))
  returning * into m;
  return jsonb_build_object('id', m.id, 'part', m.part, 'parentId', m.parent_id, 'question', m.question, 'body', m.body, 'images', to_jsonb(m.images),
    'deleted', false, 'createdAt', m.created_at, 'editedAt', null, 'hidden', false, 'author', public.person_json(m.author),
    'reactions', public.reaction_json('mensagem', m.id));
end; $$;

create or replace function public.club_message_edit(p_id uuid, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare v_body text := trim(coalesce(p_body, ''));
begin
  if char_length(v_body) < 1 or char_length(v_body) > 5000 then raise exception 'body_invalid'; end if;
  update club_messages set body = v_body, edited_at = now() where id = p_id and author = auth.uid() and deleted_at is null;
  if not found then raise exception 'not_author'; end if;
end; $$;

create or replace function public.club_message_delete(p_id uuid) returns text[]
language plpgsql security definer set search_path = public as $$
declare imgs text[];
begin
  select images into imgs from club_messages where id = p_id and author = auth.uid() and deleted_at is null;
  if not found then raise exception 'not_author'; end if;
  update club_messages set deleted_at = now(), images = '{}' where id = p_id;
  return coalesce(imgs, '{}');
end; $$;

-- As reações agora valem também para mensagens de clube.
create or replace function public.react(p_target text, p_id uuid, p_kind text, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a uuid; cid uuid;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if p_kind not in ('gg', 'coracao') then raise exception 'react_kind'; end if;
  if p_target = 'post' then select author into a from posts where id = p_id and deleted_at is null and not mod_hidden;
  elsif p_target = 'resposta' then select author into a from replies where id = p_id and deleted_at is null and not mod_hidden;
  elsif p_target = 'mensagem' then
    select author, club_id into a, cid from club_messages where id = p_id and deleted_at is null and not mod_hidden;
    if cid is not null and not public.club_member(cid) then raise exception 'not_member'; end if;
  else raise exception 'react_kind'; end if;
  if a is null or not public.author_visible(a) then raise exception 'target_not_found'; end if;
  if p_on then insert into reactions (target, target_id, user_id, kind) values (p_target, p_id, auth.uid(), p_kind) on conflict do nothing;
  else delete from reactions where target = p_target and target_id = p_id and user_id = auth.uid() and kind = p_kind; end if;
  return public.reaction_json(p_target, p_id);
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Avisos: respostas (comunidades e clubes), encontro chegando e parte que abriu
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.my_news() returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (select id, coalesce(replies_seen_at, created_at) since from profiles where id = auth.uid()),
  items as (
    -- respostas nas postagens e respostas da pessoa
    select 'resposta'::text kind, r.created_at at, r.id::text id, p.id::text ref, c.slug, p.title, left(r.body, 140) excerpt, r.author who
    from replies r join posts p on p.id = r.post_id join communities c on c.id = p.community_id
    left join replies parent on parent.id = r.parent_id, me
    where r.author <> me.id and r.deleted_at is null and not r.mod_hidden and p.deleted_at is null
      and (p.author = me.id or parent.author = me.id) and public.author_visible(r.author)
      and r.created_at > now() - interval '30 days'
    union all
    -- respostas às mensagens da pessoa nos clubes
    select 'clube_resposta', x.created_at, x.id::text, x.part::text, k.slug, k.name, left(x.body, 140), x.author
    from club_messages x join club_messages parent on parent.id = x.parent_id join clubs k on k.id = x.club_id, me
    where parent.author = me.id and x.author <> me.id and x.deleted_at is null and not x.mod_hidden
      and public.club_member(k.id) and public.author_visible(x.author) and x.created_at > now() - interval '30 days'
    union all
    -- encontro que começa nas próximas 12 horas (ou está acontecendo)
    select 'encontro', k.starts_at - interval '12 hours', k.id::text, '', k.slug, k.name, null, null
    from clubs k join club_members m on m.club_id = k.id and m.user_id = auth.uid()
    where k.format = 'encontro' and coalesce(m.rsvp, 'vou') <> 'nao' and not k.mod_hidden
      and k.starts_at - interval '12 hours' <= now() and not public.club_ended(k)
    union all
    -- parte sugerida que abriu hoje (ou nos últimos 3 dias) e a pessoa ainda não passou
    select 'parte', (pt.suggested_on::timestamp at time zone 'America/Sao_Paulo'), k.id::text || ':' || pt.ordinal, pt.ordinal::text, k.slug, k.name, pt.title, null
    from club_parts pt join clubs k on k.id = pt.club_id join club_members m on m.club_id = k.id and m.user_id = auth.uid()
    where pt.suggested_on is not null and not k.mod_hidden and m.stage < pt.ordinal
      and (pt.suggested_on::timestamp at time zone 'America/Sao_Paulo') <= now()
      and (pt.suggested_on::timestamp at time zone 'America/Sao_Paulo') > now() - interval '3 days')
  select jsonb_build_object(
    'count', (select count(*) from items, me where items.at > me.since and items.at <= now()),
    'items', coalesce((select jsonb_agg(jsonb_build_object('kind', i.kind, 'id', i.id, 'ref', i.ref, 'slug', i.slug, 'title', i.title,
        'excerpt', i.excerpt, 'at', i.at, 'new', i.at > (select since from me), 'author', case when i.who is not null then public.person_json(i.who) end)
        order by i.at desc) from (select * from items where at <= now() order by at desc limit 15) i), '[]'::jsonb));
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Denúncias: clube e mensagem de clube também entram na fila do Studio
-- ---------------------------------------------------------------------------------------------------------------
alter table public.content_reports drop constraint if exists content_reports_kind_check;
alter table public.content_reports add constraint content_reports_kind_check
  check (kind in ('perfil', 'jornada', 'vitrine', 'momento', 'museu', 'comunidade', 'postagem', 'resposta', 'clube', 'mensagem')) not valid;

-- Mesmas funções da 0026, agora com clube e mensagem de clube.
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
  elsif p_kind = 'clube' then
    select jsonb_build_object('title', k.name, 'slug', k.slug, 'description', k.description, 'game', g.title, 'hidden', k.mod_hidden) into out
    from clubs k join games g on g.id = k.game_id where k.created_by = p_owner and k.id::text = p_ref;
  elsif p_kind = 'mensagem' then
    select jsonb_build_object('title', k.name, 'text', left(x.body, 400), 'slug', k.slug, 'community', 'Clube', 'photo', cardinality(x.images) > 0, 'hidden', x.mod_hidden) into out
    from club_messages x join clubs k on k.id = x.club_id where x.author = p_owner and x.id::text = p_ref and x.deleted_at is null;
  end if;
  return out;
end; $$;

create or replace function public.report_content(p_kind text, p_handle text, p_ref text, p_reason text, p_note text) returns text
language plpgsql security definer set search_path = public as $$
declare owner_id uuid; snap jsonb; n integer; r text := coalesce(p_ref, ''); v_note text := nullif(left(trim(coalesce(p_note, '')), 500), '');
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if p_kind not in ('perfil', 'jornada', 'vitrine', 'momento', 'museu', 'comunidade', 'postagem', 'resposta', 'clube', 'mensagem') then raise exception 'report_kind'; end if;
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
    when 'clube' then 'O clube “' || coalesce(snap ->> 'title', '') || '”'
    when 'mensagem' then 'Uma mensagem sua no clube “' || coalesce(snap ->> 'title', '') || '”'
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
  elsif p_action = 'ocultar' and p_kind = 'clube' then
    select jsonb_build_object('id', id, 'mod_hidden', mod_hidden) into v_before from clubs where created_by = p_owner and id::text = r;
    if v_before is null then raise exception 'target_not_found'; end if;
    update clubs set mod_hidden = true where id = (v_before ->> 'id')::uuid;
    txt := what || ' saiu do ar por decisão da moderação. Só você ainda consegue abrir.';
  elsif p_action = 'ocultar' and p_kind = 'mensagem' then
    select jsonb_build_object('id', id, 'mod_hidden', mod_hidden) into v_before from club_messages where author = p_owner and id::text = r;
    if v_before is null then raise exception 'target_not_found'; end if;
    update club_messages set mod_hidden = true where id = (v_before ->> 'id')::uuid;
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
  elsif l.action = 'ocultar' and l.kind = 'clube' then
    update clubs set mod_hidden = coalesce((l.before ->> 'mod_hidden')::boolean, false) where id = (l.before ->> 'id')::uuid;
  elsif l.action = 'ocultar' and l.kind = 'mensagem' then
    update club_messages set mod_hidden = coalesce((l.before ->> 'mod_hidden')::boolean, false) where id = (l.before ->> 'id')::uuid;
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
revoke all on function public.club_member(uuid) from public, anon, authenticated;
revoke all on function public.club_open(public.clubs, text) from public, anon, authenticated;
revoke all on function public.club_ended(public.clubs) from public, anon, authenticated;
revoke all on function public.club_progress(uuid, text) from public, anon, authenticated;
revoke all on function public.club_json(public.clubs, boolean) from public, anon, authenticated;
revoke all on function public.club_person(uuid, public.club_members, text) from public, anon, authenticated;
revoke all on function public.club_check_fields(text, text, text) from public, anon, authenticated;
revoke all on function public.club_save_parts(uuid, jsonb) from public, anon, authenticated;

grant execute on function public.club_list(text, text, integer) to anon, authenticated;
grant execute on function public.club_get(text, text) to anon, authenticated;

revoke all on function public.club_create(jsonb) from public, anon;
revoke all on function public.club_update(uuid, jsonb) from public, anon;
revoke all on function public.club_join(text, text, boolean) from public, anon;
revoke all on function public.club_leave(uuid) from public, anon;
revoke all on function public.club_me(uuid, jsonb) from public, anon;
revoke all on function public.club_message(uuid, integer, uuid, text, boolean, text[]) from public, anon;
revoke all on function public.club_message_edit(uuid, text) from public, anon;
revoke all on function public.club_message_delete(uuid) from public, anon;
revoke all on function public.react(text, uuid, text, boolean) from public, anon;
revoke all on function public.my_news() from public, anon;
grant execute on function public.club_create(jsonb) to authenticated;
grant execute on function public.club_update(uuid, jsonb) to authenticated;
grant execute on function public.club_join(text, text, boolean) to authenticated;
grant execute on function public.club_leave(uuid) to authenticated;
grant execute on function public.club_me(uuid, jsonb) to authenticated;
grant execute on function public.club_message(uuid, integer, uuid, text, boolean, text[]) to authenticated;
grant execute on function public.club_message_edit(uuid, text) to authenticated;
grant execute on function public.club_message_delete(uuid) to authenticated;
grant execute on function public.react(text, uuid, text, boolean) to authenticated;
grant execute on function public.my_news() to authenticated;

notify pgrst, 'reload schema';
