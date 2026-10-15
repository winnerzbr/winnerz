-- Etapa 6 · Comunidade reorganizada, entrega C: Jogatinas e Clubes
--  1. Jogatina vira a base de "jogar junto": jogo, dia e hora, vagas, Vou/Talvez/Não vou, perguntas antes e
--     memórias depois ("eu estava lá"). Pode ser solta, de uma comunidade ou da agenda de um clube.
--     Os clubes "Encontro de uma noite" que já existem viram jogatinas (com quem ia e a conversa).
--  2. Clube vira um grupo que continua, com ritmo: Sem pressa, Primeira vez juntos, Encontro recorrente ou Clube do mês;
--     jogo atual que pode mudar (cada jogo é uma rodada, com o histórico guardado) e uma agenda de jogatinas.
-- Precisa da 0030. Rodar uma vez, no SQL Editor do Supabase (pode rodar de novo sem problema).

-- ---------------------------------------------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------------------------------------------
create table if not exists public.jogatinas (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 80),
  description text not null default '' check (char_length(description) <= 500),
  game_id text not null references public.games (id),
  starts_at timestamptz not null,
  duration_min integer not null default 120 check (duration_min between 15 and 720),
  platform text check (platform is null or char_length(platform) <= 40),
  max_people integer check (max_people is null or max_people between 2 and 64),
  access text not null default 'aberto' check (access in ('aberto', 'amigos', 'convite')),
  invite_code text not null default substr(md5(gen_random_uuid()::text), 1, 12),
  live_url text check (live_url is null or char_length(live_url) <= 300),
  community_id uuid references public.communities (id) on delete set null,
  club_id uuid references public.clubs (id) on delete set null,
  legacy_slug text unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  canceled_at timestamptz,
  mod_hidden boolean not null default false
);
create index if not exists jogatinas_starts on public.jogatinas (starts_at);
create index if not exists jogatinas_game on public.jogatinas (game_id, starts_at desc);
create index if not exists jogatinas_club on public.jogatinas (club_id, starts_at) where club_id is not null;

create table if not exists public.jogatina_people (
  jogatina_id uuid not null references public.jogatinas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rsvp text not null default 'vou' check (rsvp in ('vou', 'talvez', 'nao')),
  was_there boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (jogatina_id, user_id)
);
create index if not exists jogatina_people_user on public.jogatina_people (user_id, joined_at desc);

alter table public.jogatinas enable row level security;
alter table public.jogatina_people enable row level security;
revoke all on public.jogatinas, public.jogatina_people from anon, authenticated;

-- A conversa da jogatina (perguntas antes, memórias depois) usa postagens e respostas, como os clubes.
alter table public.posts add column if not exists jogatina_id uuid references public.jogatinas (id) on delete cascade;
create index if not exists posts_jogatina on public.posts (jogatina_id, created_at) where jogatina_id is not null;

-- Clube: ritmo, combinado de dia e hora, rodada (cada jogo do clube é uma rodada) e o histórico dos jogos.
alter table public.clubs add column if not exists schedule text check (schedule is null or char_length(schedule) <= 80);
alter table public.clubs add column if not exists round integer not null default 1;
alter table public.posts add column if not exists club_round integer not null default 1;
create table if not exists public.club_games (
  club_id uuid not null references public.clubs (id) on delete cascade,
  round integer not null,
  game_id text not null references public.games (id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  primary key (club_id, round)
);
alter table public.club_games enable row level security;
revoke all on public.club_games from anon, authenticated;

-- Os "Encontro de uma noite" viram jogatinas: quem ia, a conversa e as reações vão junto.
do $$
declare c record; j uuid;
begin
  for c in select * from public.clubs where format = 'encontro' loop
    insert into public.jogatinas (title, description, game_id, starts_at, duration_min, max_people, access, invite_code, live_url,
                                  community_id, legacy_slug, created_by, created_at, mod_hidden)
    values (left(c.name, 80), c.description, c.game_id, coalesce(c.starts_at, c.created_at), c.duration_min, least(c.max_members, 64), c.access,
            c.invite_code, c.live_url, c.community_id, c.slug, c.created_by, c.created_at, c.mod_hidden)
    returning id into j;
    insert into public.jogatina_people (jogatina_id, user_id, rsvp, joined_at)
    select j, m.user_id, coalesce(m.rsvp, 'vou'), m.joined_at from public.club_members m where m.club_id = c.id;
    update public.posts set jogatina_id = j, club_id = null where club_id = c.id;
    delete from public.clubs where id = c.id;
  end loop;
end $$;

alter table public.clubs drop constraint if exists clubs_check;
alter table public.clubs drop constraint if exists clubs_format_check;
alter table public.clubs add constraint clubs_format_check check (format in ('sem_pressa', 'primeira_vez', 'recorrente', 'mes'));

insert into public.club_games (club_id, round, game_id, started_at)
select id, round, game_id, created_at from public.clubs
on conflict do nothing;

alter table public.content_reports drop constraint if exists content_reports_kind_check;
alter table public.content_reports add constraint content_reports_kind_check
  check (kind in ('perfil', 'jornada', 'vitrine', 'momento', 'museu', 'comunidade', 'postagem', 'resposta', 'clube', 'jogatina'));

-- ---------------------------------------------------------------------------------------------------------------
-- A Praça não mostra a conversa de clubes nem de jogatinas
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.praca_open(p public.posts) returns boolean
language sql stable security definer set search_path = public as $$
  select p.club_id is null and p.jogatina_id is null and public.content_open(p.author, p.mod_hidden, p.deleted_at)
     and (p.community_id is null or exists (select 1 from communities c where c.id = p.community_id and public.community_open(c) and not c.mod_hidden));
$$;

create or replace function public.post_get(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p posts%rowtype; c communities%rowtype;
begin
  select * into p from posts where id = p_id;
  if not found or p.club_id is not null or p.jogatina_id is not null or not public.content_open(p.author, p.mod_hidden, p.deleted_at) then return null; end if;
  if p.community_id is not null then
    select * into c from communities where id = p.community_id;
    if not found or not public.community_open(c) then return null; end if;
  end if;
  return public.post_json(p, true) || jsonb_build_object(
    'communityFull', case when p.community_id is not null then public.community_json(c) end,
    'canModerate', case when p.community_id is not null then public.community_can_edit(c.id) else public.is_admin() end,
    'thread', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'parentId', r.parent_id,
        'body', case when r.deleted_at is not null then '' else r.body end, 'deleted', r.deleted_at is not null,
        'createdAt', r.created_at, 'editedAt', r.edited_at, 'hidden', r.mod_hidden,
        'author', public.person_json(r.author), 'authorCtx', public.author_ctx(r.author, p.game_id),
        'reactions', public.reaction_json('resposta', r.id)) order by r.created_at)
      from replies r where r.post_id = p.id
        and public.author_visible(r.author)
        and (not r.mod_hidden or public.is_admin() or r.author = auth.uid())
        and (r.deleted_at is null or exists (select 1 from replies k where k.parent_id = r.id and k.deleted_at is null))), '[]'::jsonb));
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Jogatinas
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.jogatina_in(p_jog uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from jogatina_people where jogatina_id = p_jog and user_id = auth.uid());
$$;

-- Ver a jogatina: aberta para todos; "amigos" para os amigos de quem marcou; "convite" com o código.
-- Quem está dentro sempre vê; a da agenda de um clube, quem está no clube também vê.
create or replace function public.jogatina_open(j public.jogatinas, p_code text default null) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce(j.created_by = auth.uid(), false) or (
    not j.mod_hidden and public.author_visible(j.created_by) and (
      public.jogatina_in(j.id)
      or j.access = 'aberto'
      or (j.access = 'amigos' and public.are_friends(j.created_by, auth.uid()))
      or (j.access = 'convite' and p_code is not null and p_code = j.invite_code)
      or (j.club_id is not null and public.club_member(j.club_id))));
$$;

create or replace function public.jogatina_ended(j public.jogatinas) returns boolean
language sql stable as $$
  select j.starts_at + make_interval(mins => j.duration_min) < now();
$$;

create or replace function public.jogatina_json(j public.jogatinas, p_full boolean) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', j.id, 'title', j.title, 'description', j.description, 'game', public.game_json(j.game_id),
    'startsAt', j.starts_at, 'durationMin', j.duration_min, 'platform', j.platform, 'maxPeople', j.max_people, 'access', j.access,
    'liveUrl', j.live_url, 'ended', public.jogatina_ended(j), 'canceled', j.canceled_at is not null,
    'now', j.canceled_at is null and now() between j.starts_at - interval '15 minutes' and j.starts_at + make_interval(mins => j.duration_min),
    'community', (select jsonb_build_object('slug', k.slug, 'name', k.name) from communities k where k.id = j.community_id),
    'club', (select jsonb_build_object('slug', k.slug, 'name', k.name) from clubs k where k.id = j.club_id),
    'createdAt', j.created_at, 'hidden', j.mod_hidden, 'owner', public.person_json(j.created_by),
    'going', (select count(*) from jogatina_people x where x.jogatina_id = j.id and x.rsvp = 'vou'),
    'maybe', (select count(*) from jogatina_people x where x.jogatina_id = j.id and x.rsvp = 'talvez'),
    'wasThere', (select count(*) from jogatina_people x where x.jogatina_id = j.id and x.was_there),
    'me', (select jsonb_build_object('rsvp', x.rsvp, 'wasThere', x.was_there) from jogatina_people x where x.jogatina_id = j.id and x.user_id = auth.uid()),
    'inviteCode', case when p_full and (j.created_by = auth.uid() or public.is_admin()) then j.invite_code end);
$$;

-- p_filter: 'proximas' (que dá para ver e ainda não acabaram), 'minhas' (onde a pessoa está), 'passadas'.
create or replace function public.jogatina_list(p_filter text default 'proximas', p_game text default null, p_club text default null, p_community text default null, p_limit integer default 40) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x.j order by case when p_filter = 'passadas' then -extract(epoch from x.starts_at) else extract(epoch from x.starts_at) end), '[]'::jsonb) from (
    select public.jogatina_json(j, false) j, j.starts_at
    from jogatinas j
    where not j.mod_hidden and public.author_visible(j.created_by)
      and (p_game is null or j.game_id = p_game or j.game_id = (select id from games where slug = p_game))
      and (p_club is null or j.club_id = (select id from clubs where slug = p_club))
      and (p_community is null or j.community_id = (select id from communities where slug = p_community))
      and case p_filter
            when 'minhas' then public.jogatina_in(j.id)
            when 'passadas' then public.jogatina_ended(j) and (public.jogatina_in(j.id) or j.access = 'aberto') and j.canceled_at is null
            else not public.jogatina_ended(j) and j.canceled_at is null
                 and (j.access = 'aberto' or public.jogatina_in(j.id) or (j.access = 'amigos' and public.are_friends(j.created_by, auth.uid()))
                      or (j.club_id is not null and public.club_member(j.club_id)))
          end
    order by case when p_filter = 'passadas' then -extract(epoch from j.starts_at) else extract(epoch from j.starts_at) end
    limit greatest(1, least(coalesce(p_limit, 40), 100))) x;
$$;

-- Mensagens de uma jogatina (postagens e respostas), no mesmo formato das do clube.
create or replace function public.jogatina_messages_of(p_jog uuid) returns table (
  id uuid, part integer, parent_id uuid, question boolean, body text, images text[], created_at timestamptz, edited_at timestamptz,
  deleted_at timestamptz, mod_hidden boolean, author uuid, target text, has_kids boolean)
language sql stable security definer set search_path = public as $$
  select p.id, 0, null::uuid, p.kind = 'pergunta', p.body, p.images, p.created_at, p.edited_at, p.deleted_at, p.mod_hidden, p.author, 'post',
         exists (select 1 from replies k where k.post_id = p.id and k.deleted_at is null)
  from posts p where p.jogatina_id = p_jog
  union all
  select r.id, 0, r.post_id, false, r.body, r.images, r.created_at, r.edited_at, r.deleted_at, r.mod_hidden, r.author, 'resposta', false
  from replies r join posts p on p.id = r.post_id where p.jogatina_id = p_jog;
$$;

create or replace function public.jogatina_get(p_id uuid, p_code text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare j jogatinas%rowtype;
begin
  select * into j from jogatinas where id = p_id;
  if not found then return null; end if;
  if not public.jogatina_open(j, p_code) then
    if j.mod_hidden or not public.author_visible(j.created_by) then return null; end if;
    return jsonb_build_object('locked', true, 'id', j.id, 'title', j.title, 'access', j.access, 'startsAt', j.starts_at,
      'game', public.game_json(j.game_id), 'owner', public.person_json(j.created_by));
  end if;
  return public.jogatina_json(j, true) || jsonb_build_object('locked', false,
    'people', coalesce((select jsonb_agg(public.person_json(x.user_id) || jsonb_build_object('rsvp', x.rsvp, 'wasThere', x.was_there, 'joinedAt', x.joined_at,
                          'journey', public.club_progress(x.user_id, j.game_id)) order by x.user_id = j.created_by desc, x.joined_at)
                        from jogatina_people x where x.jogatina_id = j.id and public.author_visible(x.user_id)), '[]'::jsonb),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'part', 0, 'parentId', m.parent_id, 'question', m.question, 'target', m.target,
        'body', case when m.deleted_at is not null then '' else m.body end, 'images', to_jsonb(case when m.deleted_at is null then m.images else '{}' end),
        'deleted', m.deleted_at is not null, 'createdAt', m.created_at, 'editedAt', m.edited_at, 'hidden', m.mod_hidden,
        'author', public.person_json(m.author), 'reactions', public.reaction_json(m.target, m.id)) order by m.created_at)
      from public.jogatina_messages_of(j.id) m
      where public.author_visible(m.author) and (not m.mod_hidden or public.is_admin() or m.author = auth.uid())
        and (m.deleted_at is null or m.has_kids)), '[]'::jsonb));
end; $$;

create or replace function public.jogatina_check(p jsonb) returns void
language plpgsql stable security definer set search_path = public as $$
declare t text := trim(coalesce(p ->> 'title', '')); v_live text := nullif(trim(coalesce(p ->> 'liveUrl', '')), '');
begin
  if char_length(t) < 3 or char_length(t) > 80 then raise exception 'name_invalid'; end if;
  if public.has_bad_term(t) or public.has_bad_term(p ->> 'description') or public.has_bad_term(p ->> 'platform') then raise exception 'text_offensive'; end if;
  if char_length(coalesce(p ->> 'description', '')) > 500 then raise exception 'text_long'; end if;
  if char_length(coalesce(p ->> 'platform', '')) > 40 then raise exception 'text_long'; end if;
  if v_live is not null and (char_length(v_live) > 300 or v_live !~ '^https://[^\s<>"]{4,}$') then raise exception 'live_invalid'; end if;
  if coalesce(p ->> 'access', 'aberto') not in ('aberto', 'amigos', 'convite') then raise exception 'club_access'; end if;
  if (p ->> 'startsAt') is null then raise exception 'date_needed'; end if;
  if nullif(p ->> 'maxPeople', '') is not null and (nullif(p ->> 'maxPeople', '')::integer < 2 or nullif(p ->> 'maxPeople', '')::integer > 64) then raise exception 'max_invalid'; end if;
end; $$;

create or replace function public.jogatina_create(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare j jogatinas%rowtype; v_game text; v_comm uuid; v_club uuid; n integer;
begin
  perform public.check_can_publish();
  perform public.jogatina_check(p);
  select id into v_game from games where id = p ->> 'gameId';
  if v_game is null then raise exception 'game_needed'; end if;
  if (p ->> 'startsAt')::timestamptz < now() - interval '1 hour' then raise exception 'date_past'; end if;
  if nullif(p ->> 'communityId', '') is not null then
    select id into v_comm from communities where id = (p ->> 'communityId')::uuid and not mod_hidden;
  end if;
  if nullif(p ->> 'clubId', '') is not null then
    select id into v_club from clubs where id = (p ->> 'clubId')::uuid and not mod_hidden;
    if v_club is not null and not public.club_member(v_club) and not public.is_admin() then raise exception 'not_member'; end if;
  end if;
  if not public.is_admin() then
    select count(*) into n from jogatinas where created_by = auth.uid() and created_at > now() - interval '1 day';
    if n >= 10 then raise exception 'club_limit'; end if;
  end if;
  perform public.note_public_act();
  insert into jogatinas (title, description, game_id, starts_at, duration_min, platform, max_people, access, live_url, community_id, club_id, created_by)
  values (trim(p ->> 'title'), left(trim(coalesce(p ->> 'description', '')), 500), v_game, (p ->> 'startsAt')::timestamptz,
          coalesce(nullif(p ->> 'durationMin', '')::integer, 120), nullif(trim(coalesce(p ->> 'platform', '')), ''),
          nullif(p ->> 'maxPeople', '')::integer, coalesce(p ->> 'access', 'aberto'), nullif(trim(coalesce(p ->> 'liveUrl', '')), ''),
          v_comm, v_club, auth.uid())
  returning * into j;
  insert into jogatina_people (jogatina_id, user_id, rsvp) values (j.id, auth.uid(), 'vou');
  return public.jogatina_json(j, true);
end; $$;

create or replace function public.jogatina_update(p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare j jogatinas%rowtype;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  select * into j from jogatinas where id = p_id;
  if not found then raise exception 'target_not_found'; end if;
  if j.created_by is distinct from auth.uid() and not public.is_admin() then raise exception 'not_owner'; end if;
  perform public.jogatina_check(p);
  update jogatinas set title = trim(p ->> 'title'), description = left(trim(coalesce(p ->> 'description', '')), 500),
         starts_at = (p ->> 'startsAt')::timestamptz, duration_min = coalesce(nullif(p ->> 'durationMin', '')::integer, duration_min),
         platform = nullif(trim(coalesce(p ->> 'platform', '')), ''), max_people = nullif(p ->> 'maxPeople', '')::integer,
         access = coalesce(p ->> 'access', access), live_url = nullif(trim(coalesce(p ->> 'liveUrl', '')), ''),
         invite_code = case when (p ->> 'newCode')::boolean then substr(md5(gen_random_uuid()::text), 1, 12) else invite_code end
   where id = p_id returning * into j;
  return public.jogatina_json(j, true);
end; $$;

create or replace function public.jogatina_cancel(p_id uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare j jogatinas%rowtype;
begin
  select * into j from jogatinas where id = p_id;
  if not found then raise exception 'target_not_found'; end if;
  if j.created_by is distinct from auth.uid() and not public.is_admin() then raise exception 'not_owner'; end if;
  update jogatinas set canceled_at = case when p_on then coalesce(canceled_at, now()) end where id = p_id returning * into j;
  return public.jogatina_json(j, true);
end; $$;

-- Vou / Talvez / Não vou (null = sair da lista). Com vagas, "Vou" só enquanto tiver lugar.
create or replace function public.jogatina_rsvp(p_id uuid, p_code text, p_rsvp text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare j jogatinas%rowtype; n integer; cur text;
begin
  perform public.check_can_publish();
  select * into j from jogatinas where id = p_id;
  if not found or not public.jogatina_open(j, p_code) then raise exception 'club_closed'; end if;
  if j.canceled_at is not null then raise exception 'jogatina_canceled'; end if;
  if public.jogatina_ended(j) and not public.jogatina_in(j.id) then raise exception 'club_ended'; end if;
  if p_rsvp is null then
    if j.created_by = auth.uid() then raise exception 'owner_leave'; end if;
    delete from jogatina_people where jogatina_id = p_id and user_id = auth.uid();
    return public.jogatina_json(j, true);
  end if;
  if p_rsvp not in ('vou', 'talvez', 'nao') then raise exception 'rsvp_invalid'; end if;
  select rsvp into cur from jogatina_people where jogatina_id = p_id and user_id = auth.uid();
  if p_rsvp = 'vou' and cur is distinct from 'vou' and j.max_people is not null then
    select count(*) into n from jogatina_people where jogatina_id = p_id and rsvp = 'vou';
    if n >= j.max_people then raise exception 'club_full'; end if;
  end if;
  insert into jogatina_people (jogatina_id, user_id, rsvp) values (p_id, auth.uid(), p_rsvp)
  on conflict (jogatina_id, user_id) do update set rsvp = excluded.rsvp;
  return public.jogatina_json(j, true);
end; $$;

-- "Eu estava lá": depois que a jogatina começou, quem estava na lista marca.
create or replace function public.jogatina_was_there(p_id uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare j jogatinas%rowtype;
begin
  select * into j from jogatinas where id = p_id;
  if not found or not public.jogatina_in(p_id) then raise exception 'not_member'; end if;
  if j.starts_at > now() then raise exception 'jogatina_not_started'; end if;
  update jogatina_people set was_there = coalesce(p_on, false), rsvp = case when p_on then 'vou' else rsvp end
   where jogatina_id = p_id and user_id = auth.uid();
  return public.jogatina_json(j, true);
end; $$;

create or replace function public.jogatina_message(p_id uuid, p_parent uuid, p_body text, p_question boolean, p_images text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare j jogatinas%rowtype; v_post uuid; n integer; p posts%rowtype; r replies%rowtype; v_body text := trim(coalesce(p_body, ''));
begin
  perform public.check_can_publish();
  select * into j from jogatinas where id = p_id and not mod_hidden;
  if not found or not public.jogatina_open(j) then raise exception 'target_not_found'; end if;
  if not public.jogatina_in(p_id) and not public.is_admin() then raise exception 'not_member'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 5000 then raise exception 'body_invalid'; end if;
  if p_parent is not null then
    select x.id into v_post from posts x where x.id = p_parent and x.jogatina_id = p_id;
    if v_post is null then
      select x.id into v_post from replies y join posts x on x.id = y.post_id where y.id = p_parent and x.jogatina_id = p_id;
    end if;
    if v_post is null then raise exception 'target_not_found'; end if;
  end if;
  if not public.is_admin() then
    select (select count(*) from replies where author = auth.uid() and created_at > now() - interval '1 hour')
         + (select count(*) from posts where author = auth.uid() and jogatina_id is not null and created_at > now() - interval '1 hour') into n;
    if n >= 60 then raise exception 'reply_limit'; end if;
  end if;
  perform public.note_public_act();
  if v_post is null then
    insert into posts (jogatina_id, author, kind, title, body, game_id, images)
    values (p_id, auth.uid(), case when coalesce(p_question, false) then 'pergunta' else 'discussao' end, null, v_body, j.game_id, public.clean_images(p_images))
    returning * into p;
    return jsonb_build_object('id', p.id, 'part', 0, 'parentId', null, 'question', p.kind = 'pergunta', 'target', 'post',
      'body', p.body, 'images', to_jsonb(p.images), 'deleted', false, 'createdAt', p.created_at, 'editedAt', null, 'hidden', false,
      'author', public.person_json(p.author), 'reactions', public.reaction_json('post', p.id));
  end if;
  insert into replies (post_id, parent_id, author, body, images) values (v_post, null, auth.uid(), v_body, public.clean_images(p_images))
  returning * into r;
  return jsonb_build_object('id', r.id, 'part', 0, 'parentId', v_post, 'question', false, 'target', 'resposta',
    'body', r.body, 'images', to_jsonb(r.images), 'deleted', false, 'createdAt', r.created_at, 'editedAt', null, 'hidden', false,
    'author', public.person_json(r.author), 'reactions', public.reaction_json('resposta', r.id));
end; $$;

-- Editar e apagar mensagem: vale para clube e jogatina.
create or replace function public.club_message_edit(p_id uuid, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare v_body text := trim(coalesce(p_body, ''));
begin
  if char_length(v_body) < 1 or char_length(v_body) > 5000 then raise exception 'body_invalid'; end if;
  update posts set body = v_body, edited_at = now()
   where id = p_id and (club_id is not null or jogatina_id is not null) and author = auth.uid() and deleted_at is null;
  if found then return; end if;
  update replies set body = v_body, edited_at = now()
   where id = p_id and author = auth.uid() and deleted_at is null
     and exists (select 1 from posts p where p.id = replies.post_id and (p.club_id is not null or p.jogatina_id is not null));
  if not found then raise exception 'not_author'; end if;
end; $$;

create or replace function public.club_message_delete(p_id uuid) returns text[]
language plpgsql security definer set search_path = public as $$
declare imgs text[];
begin
  select images into imgs from posts where id = p_id and (club_id is not null or jogatina_id is not null) and author = auth.uid() and deleted_at is null;
  if found then
    update posts set deleted_at = now(), images = '{}', answer_id = null where id = p_id;
    return coalesce(imgs, '{}');
  end if;
  select y.images into imgs from replies y join posts p on p.id = y.post_id
   where y.id = p_id and (p.club_id is not null or p.jogatina_id is not null) and y.author = auth.uid() and y.deleted_at is null;
  if not found then raise exception 'not_author'; end if;
  update replies set deleted_at = now(), images = '{}' where id = p_id;
  return coalesce(imgs, '{}');
end; $$;

create or replace function public.react(p_target text, p_id uuid, p_kind text, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a uuid; cid uuid; jid uuid; found_it boolean := false; j jogatinas%rowtype;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if p_kind not in ('gg', 'coracao', 'jogar', 'dica', 'junto', 'haha', 'momento') then raise exception 'react_kind'; end if;
  if p_target = 'post' then
    select true, author, club_id, jogatina_id into found_it, a, cid, jid from posts where id = p_id and deleted_at is null and not mod_hidden;
  elsif p_target = 'resposta' then
    select true, r.author, p.club_id, p.jogatina_id into found_it, a, cid, jid from replies r join posts p on p.id = r.post_id where r.id = p_id and r.deleted_at is null and not r.mod_hidden;
  else raise exception 'react_kind'; end if;
  if not coalesce(found_it, false) or not public.author_visible(a) then raise exception 'target_not_found'; end if;
  if cid is not null and not public.club_member(cid) and not public.is_admin() then raise exception 'not_member'; end if;
  if jid is not null then
    select * into j from jogatinas where id = jid;
    if not public.jogatina_open(j) then raise exception 'not_member'; end if;
  end if;
  if p_on then insert into reactions (target, target_id, user_id, kind) values (p_target, p_id, auth.uid(), p_kind) on conflict do nothing;
  else delete from reactions where target = p_target and target_id = p_id and user_id = auth.uid() and kind = p_kind; end if;
  return public.reaction_json(p_target, p_id);
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Clubes: ritmo, jogo atual (rodadas) e agenda de jogatinas
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.club_ended(c public.clubs) returns boolean
language sql stable as $$ select false; $$;

create or replace function public.club_json(c public.clubs, p_full boolean) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'description', c.description, 'format', c.format,
    'game', public.game_json(c.game_id), 'access', c.access, 'maxMembers', c.max_members, 'schedule', c.schedule, 'round', c.round,
    'community', (select jsonb_build_object('slug', k.slug, 'name', k.name) from communities k where k.id = c.community_id),
    'liveUrl', c.live_url, 'createdAt', c.created_at, 'hidden', c.mod_hidden, 'owner', public.person_json(c.created_by),
    'members', (select count(*) from club_members m where m.club_id = c.id),
    'me', (select jsonb_build_object('role', m.role, 'firstTime', m.first_time, 'stage', m.stage, 'finishedAt', m.finished_at)
           from club_members m where m.club_id = c.id and m.user_id = auth.uid()),
    'inviteCode', case when p_full and (c.created_by = auth.uid() or public.is_admin()) then c.invite_code end,
    'parts', coalesce((select jsonb_agg(jsonb_build_object('ordinal', pt.ordinal, 'title', pt.title, 'suggestedOn', pt.suggested_on) order by pt.ordinal)
                       from club_parts pt where pt.club_id = c.id), '[]'::jsonb),
    'next', (select public.jogatina_json(j, false) from jogatinas j
             where j.club_id = c.id and j.canceled_at is null and not j.mod_hidden and not public.jogatina_ended(j)
             order by j.starts_at limit 1),
    'lastAt', greatest(
      (select max(p.created_at) from posts p where p.club_id = c.id and p.deleted_at is null and not p.mod_hidden),
      (select max(r.created_at) from replies r join posts p on p.id = r.post_id where p.club_id = c.id and r.deleted_at is null and not r.mod_hidden)));
$$;

create or replace function public.club_person(p_club uuid, m public.club_members, p_game text) returns jsonb
language sql stable security definer set search_path = public as $$
  select public.person_json(m.user_id) || jsonb_build_object('role', m.role, 'firstTime', m.first_time,
    'stage', m.stage, 'finishedAt', m.finished_at, 'joinedAt', m.joined_at, 'journey', public.club_progress(m.user_id, p_game));
$$;

-- p_filter: 'todos' (abertos e de amigos) ou 'meus'.
drop function if exists public.club_list(text, text, integer);
create or replace function public.club_list(p_filter text default 'todos', p_game text default null, p_limit integer default 60, p_community text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x.j order by x.k desc), '[]'::jsonb) from (
    select public.club_json(c, false) j, greatest(c.created_at, (select max(p.created_at) from posts p where p.club_id = c.id)) k
    from clubs c
    where not c.mod_hidden and public.author_visible(c.created_by)
      and (p_game is null or c.game_id = p_game or c.game_id = (select id from games where slug = p_game))
      and (p_community is null or c.community_id = (select id from communities where slug = p_community))
      and case p_filter
            when 'meus' then public.club_member(c.id)
            else c.access = 'aberto' or (c.access = 'amigos' and public.are_friends(c.created_by, auth.uid())) or public.club_member(c.id)
          end
    order by k desc
    limit greatest(1, least(coalesce(p_limit, 60), 200))) x;
$$;

-- As mensagens da rodada atual do clube (o jogo de agora). As de jogos anteriores ficam nas memórias.
create or replace function public.club_messages_of(p_club uuid) returns table (
  id uuid, part integer, parent_id uuid, question boolean, body text, images text[], created_at timestamptz, edited_at timestamptz,
  deleted_at timestamptz, mod_hidden boolean, author uuid, target text, has_kids boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.club_part, null::uuid, p.kind = 'pergunta', p.body, p.images, p.created_at, p.edited_at, p.deleted_at, p.mod_hidden, p.author, 'post',
         exists (select 1 from replies k where k.post_id = p.id and k.deleted_at is null)
  from posts p join clubs c on c.id = p.club_id where p.club_id = p_club and p.club_round = c.round
  union all
  select r.id, p.club_part, r.post_id, false, r.body, r.images, r.created_at, r.edited_at, r.deleted_at, r.mod_hidden, r.author, 'resposta', false
  from replies r join posts p on p.id = r.post_id join clubs c on c.id = p.club_id where p.club_id = p_club and p.club_round = c.round;
$$;

create or replace function public.club_get(p_slug text, p_code text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c clubs%rowtype; mine club_members%rowtype; v_stage integer; msgs jsonb; v_jog uuid;
begin
  select * into c from clubs where slug = lower(p_slug);
  if not found then
    -- Era um "Encontro de uma noite": agora é uma jogatina.
    select id into v_jog from jogatinas where legacy_slug = lower(p_slug);
    if v_jog is not null then return jsonb_build_object('moved', v_jog); end if;
    return null;
  end if;
  if not public.club_open(c, p_code) then
    if c.mod_hidden or not public.author_visible(c.created_by) then return null; end if;
    return jsonb_build_object('locked', true, 'slug', c.slug, 'name', c.name, 'access', c.access, 'format', c.format,
      'game', public.game_json(c.game_id), 'owner', public.person_json(c.created_by));
  end if;
  select * into mine from club_members where club_id = c.id and user_id = auth.uid();
  v_stage := case when public.is_admin() then 99 else coalesce(mine.stage, 0) end;
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'part', x.part, 'parentId', x.parent_id, 'question', x.question, 'target', x.target,
      'body', case when x.deleted_at is not null then '' else x.body end, 'images', to_jsonb(case when x.deleted_at is null then x.images else '{}' end),
      'deleted', x.deleted_at is not null, 'createdAt', x.created_at, 'editedAt', x.edited_at, 'hidden', x.mod_hidden,
      'author', public.person_json(x.author), 'reactions', public.reaction_json(x.target, x.id)) order by x.created_at), '[]'::jsonb)
  into msgs
  from public.club_messages_of(c.id) x
  where public.author_visible(x.author)
    and (not x.mod_hidden or public.is_admin() or x.author = auth.uid())
    and (x.deleted_at is null or x.has_kids)
    and (x.part = 0 or (mine.user_id is not null and x.part <= v_stage) or public.is_admin());
  return public.club_json(c, true) || jsonb_build_object('locked', false,
    'people', coalesce((select jsonb_agg(public.club_person(c.id, m, c.game_id) order by m.role = 'dono' desc, m.joined_at)
                        from club_members m where m.club_id = c.id and public.author_visible(m.user_id)), '[]'::jsonb),
    'messages', msgs,
    'hiddenParts', coalesce((select jsonb_object_agg(x.part, x.n) from (
        select y.part, count(*) n from public.club_messages_of(c.id) y
        where y.part > v_stage and y.deleted_at is null and not y.mod_hidden group by y.part) x), '{}'::jsonb),
    'agenda', coalesce((select jsonb_agg(public.jogatina_json(j, false) order by j.starts_at) from jogatinas j
                        where j.club_id = c.id and j.canceled_at is null and not j.mod_hidden and not public.jogatina_ended(j)), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(jsonb_build_object('round', g.round, 'game', public.game_json(g.game_id), 'startedAt', g.started_at, 'endedAt', g.ended_at,
                          'messages', (select count(*) from posts p where p.club_id = c.id and p.club_round = g.round and p.deleted_at is null),
                          'jogatinas', (select count(*) from jogatinas j where j.club_id = c.id and j.canceled_at is null
                                         and j.starts_at >= g.started_at and (g.ended_at is null or j.starts_at < g.ended_at) and public.jogatina_ended(j)))
                          order by g.round desc)
                        from club_games g where g.club_id = c.id and g.round < c.round), '[]'::jsonb));
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
  if p ->> 'format' not in ('sem_pressa', 'primeira_vez', 'recorrente', 'mes') then raise exception 'club_format'; end if;
  if coalesce(p ->> 'access', 'aberto') not in ('aberto', 'amigos', 'convite') then raise exception 'club_access'; end if;
  select id into v_game from games where id = p ->> 'gameId';
  if v_game is null then raise exception 'game_needed'; end if;
  perform public.club_check_fields(p ->> 'name', p ->> 'description', p ->> 'liveUrl');
  if public.has_bad_term(p ->> 'schedule') then raise exception 'text_offensive'; end if;
  if nullif(p ->> 'communityId', '') is not null then
    select id into v_comm from communities where id = (p ->> 'communityId')::uuid and not mod_hidden;
  end if;
  if not public.is_admin() then
    select count(*) into n from clubs where created_by = auth.uid() and created_at > now() - interval '1 day';
    if n >= 5 then raise exception 'club_limit'; end if;
  end if;
  perform public.note_public_act();
  insert into clubs (slug, name, description, format, game_id, access, max_members, community_id, live_url, schedule, created_by)
  values (v_slug, trim(p ->> 'name'), left(trim(coalesce(p ->> 'description', '')), 500), p ->> 'format', v_game,
          coalesce(p ->> 'access', 'aberto'), nullif(p ->> 'maxMembers', '')::integer, v_comm,
          nullif(trim(coalesce(p ->> 'liveUrl', '')), ''), nullif(left(trim(coalesce(p ->> 'schedule', '')), 80), ''), auth.uid())
  returning * into c;
  insert into club_games (club_id, round, game_id) values (c.id, 1, v_game);
  -- Partes (capítulos, atos): qualquer ritmo pode ter; cada um avança no seu passo e a conversa de cada parte só abre para quem chegou lá.
  if p ? 'parts' then perform public.club_save_parts(c.id, p -> 'parts'); end if;
  insert into club_members (club_id, user_id, role, first_time)
  values (c.id, auth.uid(), 'dono', case when c.format = 'primeira_vez' then coalesce((p ->> 'firstTime')::boolean, false) end);
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
  if public.has_bad_term(p ->> 'schedule') then raise exception 'text_offensive'; end if;
  if coalesce(p ->> 'access', c.access) not in ('aberto', 'amigos', 'convite') then raise exception 'club_access'; end if;
  if coalesce(p ->> 'format', c.format) not in ('sem_pressa', 'primeira_vez', 'recorrente', 'mes') then raise exception 'club_format'; end if;
  if nullif(p ->> 'communityId', '') is not null then
    select id into v_comm from communities where id = (p ->> 'communityId')::uuid and not mod_hidden;
  end if;
  update clubs set name = trim(p ->> 'name'), description = left(trim(coalesce(p ->> 'description', '')), 500),
         format = coalesce(p ->> 'format', format),
         access = coalesce(p ->> 'access', access), max_members = nullif(p ->> 'maxMembers', '')::integer, community_id = v_comm,
         live_url = nullif(trim(coalesce(p ->> 'liveUrl', '')), ''), schedule = nullif(left(trim(coalesce(p ->> 'schedule', '')), 80), ''),
         invite_code = case when (p ->> 'newCode')::boolean then substr(md5(gen_random_uuid()::text), 1, 12) else invite_code end
   where id = p_id returning * into c;
  if p ? 'parts' then perform public.club_save_parts(c.id, p -> 'parts'); end if;
  return public.club_json(c, true);
end; $$;

-- Trocar o jogo atual: começa uma rodada nova (as partes e onde cada um estava recomeçam; a conversa antiga fica nas memórias).
create or replace function public.club_set_game(p_id uuid, p_game text, p_parts jsonb default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c clubs%rowtype; v_game text;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  select * into c from clubs where id = p_id;
  if not found then raise exception 'target_not_found'; end if;
  if c.created_by is distinct from auth.uid() and not public.is_admin() then raise exception 'not_owner'; end if;
  select id into v_game from games where id = p_game;
  if v_game is null then raise exception 'game_needed'; end if;
  if v_game = c.game_id then return public.club_json(c, true); end if;
  update club_games set ended_at = now() where club_id = c.id and round = c.round;
  update clubs set game_id = v_game, round = round + 1 where id = c.id returning * into c;
  insert into club_games (club_id, round, game_id) values (c.id, c.round, v_game) on conflict (club_id, round) do update set game_id = excluded.game_id, started_at = now(), ended_at = null;
  update club_members set stage = 0, finished_at = null where club_id = c.id;
  delete from club_parts where club_id = c.id;
  if p_parts is not null then perform public.club_save_parts(c.id, p_parts); end if;
  return public.club_json(c, true);
end; $$;

drop function if exists public.club_join(text, text, boolean);
create or replace function public.club_join(p_slug text, p_code text, p_first_time boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c clubs%rowtype; n integer;
begin
  perform public.check_can_publish();
  select * into c from clubs where slug = lower(p_slug);
  if not found or not public.club_open(c, p_code) then raise exception 'club_closed'; end if;
  if public.club_member(c.id) then return public.club_json(c, true); end if;
  if c.max_members is not null then
    select count(*) into n from club_members where club_id = c.id;
    if n >= c.max_members then raise exception 'club_full'; end if;
  end if;
  insert into club_members (club_id, user_id, first_time)
  values (c.id, auth.uid(), case when c.format = 'primeira_vez' then coalesce(p_first_time, true) end);
  return public.club_json(c, true);
end; $$;

create or replace function public.club_me(p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c clubs%rowtype; maxp integer;
begin
  select * into c from clubs where id = p_id;
  if not found or not public.club_member(p_id) then raise exception 'not_member'; end if;
  select coalesce(max(ordinal), 0) into maxp from club_parts where club_id = p_id;
  update club_members set
    stage = case when p ? 'stage' then greatest(0, least(maxp, (p ->> 'stage')::integer)) else stage end,
    first_time = case when p ? 'firstTime' and c.format = 'primeira_vez' then (p ->> 'firstTime')::boolean else first_time end,
    finished_at = case when p ? 'finished' then case when (p ->> 'finished')::boolean then coalesce(finished_at, now()) end else finished_at end
  where club_id = p_id and user_id = auth.uid();
  return public.club_json(c, true);
end; $$;

create or replace function public.club_message(p_club uuid, p_part integer, p_parent uuid, p_body text, p_question boolean, p_images text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c clubs%rowtype; mine club_members%rowtype; v_post uuid; v_part integer := coalesce(p_part, 0); n integer;
  p posts%rowtype; r replies%rowtype; v_body text := trim(coalesce(p_body, ''));
begin
  perform public.check_can_publish();
  select * into c from clubs where id = p_club and not mod_hidden;
  if not found then raise exception 'target_not_found'; end if;
  select * into mine from club_members where club_id = p_club and user_id = auth.uid();
  if not found then raise exception 'not_member'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 5000 then raise exception 'body_invalid'; end if;
  if p_parent is not null then
    select x.id, x.club_part into v_post, v_part from posts x where x.id = p_parent and x.club_id = p_club;
    if v_post is null then
      select x.id, x.club_part into v_post, v_part from replies y join posts x on x.id = y.post_id where y.id = p_parent and x.club_id = p_club;
    end if;
    if v_post is null then raise exception 'target_not_found'; end if;
  end if;
  if v_part > 0 and v_part > mine.stage and not public.is_admin() then raise exception 'part_locked'; end if;
  if v_part > 0 and not exists (select 1 from club_parts where club_id = p_club and ordinal = v_part) then raise exception 'target_not_found'; end if;
  if not public.is_admin() then
    select (select count(*) from replies where author = auth.uid() and created_at > now() - interval '1 hour')
         + (select count(*) from posts where author = auth.uid() and club_id is not null and created_at > now() - interval '1 hour') into n;
    if n >= 60 then raise exception 'reply_limit'; end if;
  end if;
  perform public.note_public_act();
  if v_post is null then
    insert into posts (club_id, club_part, club_round, author, kind, title, body, game_id, images)
    values (p_club, v_part, c.round, auth.uid(), case when coalesce(p_question, false) then 'pergunta' else 'discussao' end, null, v_body, c.game_id, public.clean_images(p_images))
    returning * into p;
    return jsonb_build_object('id', p.id, 'part', p.club_part, 'parentId', null, 'question', p.kind = 'pergunta', 'target', 'post',
      'body', p.body, 'images', to_jsonb(p.images), 'deleted', false, 'createdAt', p.created_at, 'editedAt', null, 'hidden', false,
      'author', public.person_json(p.author), 'reactions', public.reaction_json('post', p.id));
  end if;
  insert into replies (post_id, parent_id, author, body, images) values (v_post, null, auth.uid(), v_body, public.clean_images(p_images))
  returning * into r;
  return jsonb_build_object('id', r.id, 'part', v_part, 'parentId', v_post, 'question', false, 'target', 'resposta',
    'body', r.body, 'images', to_jsonb(r.images), 'deleted', false, 'createdAt', r.created_at, 'editedAt', null, 'hidden', false,
    'author', public.person_json(r.author), 'reactions', public.reaction_json('resposta', r.id));
end; $$;

-- Editar postagem da Praça/comunidade (as de clube e jogatina têm o próprio caminho).
create or replace function public.post_edit(p_id uuid, p_kind text, p_title text, p_body text, p_game text, p_spoiler text, p_spoiler_note text, p_images text[], p_clip text, p_poll jsonb default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p posts%rowtype; v_title text := nullif(trim(coalesce(p_title, '')), ''); v_clip text; v_images text[];
  v_note text := nullif(left(trim(coalesce(p_spoiler_note, '')), 80), '');
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  select * into p from posts where id = p_id and deleted_at is null and club_id is null and jogatina_id is null;
  if not found or p.author is distinct from auth.uid() then raise exception 'not_author'; end if;
  if p_kind not in ('discussao', 'pergunta', 'dica', 'colecao', 'clipe', 'enquete', 'aquisicao') then raise exception 'post_kind'; end if;
  -- Enquete continua enquete (e o contrário), para não perder os votos.
  if (p.kind = 'enquete') <> (p_kind = 'enquete') then raise exception 'post_kind'; end if;
  if v_title is not null and (char_length(v_title) < 3 or char_length(v_title) > 140) then raise exception 'title_invalid'; end if;
  if public.has_bad_term(v_title) or public.has_bad_term(v_note) then raise exception 'title_offensive'; end if;
  if char_length(coalesce(p_body, '')) > 10000 then raise exception 'body_long'; end if;
  if p_spoiler is not null and p_spoiler not in ('inicio', 'meio', 'final') then raise exception 'post_spoiler'; end if;
  v_clip := public.clean_clip(p_clip);
  v_images := public.clean_images(p_images);
  if p_kind = 'clipe' and v_clip is null then raise exception 'clip_needed'; end if;
  if p_kind = 'aquisicao' and p_game is null then raise exception 'game_needed'; end if;
  if v_title is null and trim(coalesce(p_body, '')) = '' and cardinality(v_images) = 0 and v_clip is null then raise exception 'post_empty'; end if;
  -- As opções da enquete só mudam enquanto ninguém votou.
  if p_kind = 'enquete' and p_poll is not null and not exists (select 1 from poll_votes where post_id = p_id) then
    update post_polls set options = public.clean_poll(p_poll) where post_id = p_id;
  end if;
  update posts set kind = p_kind, title = v_title, body = coalesce(p_body, ''), game_id = (select id from games where id = p_game),
         spoiler = case when p_game is not null then p_spoiler end,
         spoiler_note = case when p_game is not null and p_spoiler is not null then v_note end,
         images = v_images, clip = v_clip, edited_at = now()
   where id = p_id returning * into p;
  return public.post_json(p, true);
end; $$;

-- Avisos: lembrete e respostas das jogatinas (no lugar do "encontro").
create or replace function public.my_news() returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (
    select pr.id, pr.handle, coalesce(pr.replies_seen_at, pr.created_at) since,
           public.cm_pref(pr, 'aviso_respostas', true) a_resp, public.cm_pref(pr, 'aviso_mencoes', true) a_menc,
           public.cm_pref(pr, 'aviso_acompanhando', true) a_acomp, public.cm_pref(pr, 'aviso_clubes', true) a_club
    from profiles pr where pr.id = auth.uid()),
  items as (
    -- respostas nas conversas da pessoa (se ela ainda acompanha) e nas respostas dela
    select 'resposta'::text kind, r.created_at at, r.id::text id, p.id::text ref, c.slug, public.post_label(p) title, left(r.body, 140) excerpt, r.author who
    from replies r join posts p on p.id = r.post_id left join communities c on c.id = p.community_id
    left join replies parent on parent.id = r.parent_id, me
    where me.a_resp and p.club_id is null and p.jogatina_id is null and r.author is distinct from me.id and r.author is not null and r.deleted_at is null and not r.mod_hidden and p.deleted_at is null
      and ((p.author = me.id and exists (select 1 from post_follows f where f.user_id = me.id and f.post_id = p.id)) or parent.author = me.id)
      and public.author_visible(r.author) and r.created_at > now() - interval '30 days'
    union all
    -- respostas novas nas conversas que a pessoa acompanha
    select 'acompanhando', r.created_at, r.id::text, p.id::text, c.slug, public.post_label(p), left(r.body, 140), r.author
    from replies r join posts p on p.id = r.post_id join post_follows f on f.post_id = p.id left join communities c on c.id = p.community_id, me
    where me.a_acomp and f.user_id = me.id and p.author is distinct from me.id and p.club_id is null and p.jogatina_id is null and r.created_at > f.created_at
      and r.author is distinct from me.id and r.author is not null and r.deleted_at is null and not r.mod_hidden and p.deleted_at is null
      and public.author_visible(r.author) and r.created_at > now() - interval '30 days'
    union all
    -- respostas às mensagens da pessoa nos clubes
    select 'clube_resposta', r.created_at, r.id::text, p.club_part::text, k.slug, k.name, left(r.body, 140), r.author
    from replies r join posts p on p.id = r.post_id join clubs k on k.id = p.club_id, me
    where me.a_club and p.author = me.id and r.author is distinct from me.id and r.author is not null and r.deleted_at is null and not r.mod_hidden
      and public.club_member(k.id) and public.author_visible(r.author) and r.created_at > now() - interval '30 days'
    union all
    -- menções: @fulano numa postagem ou resposta da Praça e das comunidades
    select 'mencao', x.at, x.id, x.ref, x.slug, x.title, x.excerpt, x.who from (
      select p.created_at at, p.id::text id, p.id::text ref, c.slug, public.post_label(p) title, left(p.body, 140) excerpt, p.author who, p.body
      from posts p left join communities c on c.id = p.community_id
      where p.club_id is null and p.jogatina_id is null and p.deleted_at is null and not p.mod_hidden and (c.id is null or not c.mod_hidden) and p.created_at > now() - interval '30 days'
      union all
      select r.created_at, r.id::text, p.id::text, c.slug, public.post_label(p), left(r.body, 140), r.author, r.body
      from replies r join posts p on p.id = r.post_id left join communities c on c.id = p.community_id
      where p.club_id is null and p.jogatina_id is null and r.deleted_at is null and not r.mod_hidden and p.deleted_at is null and (c.id is null or not c.mod_hidden)
        and r.created_at > now() - interval '30 days'
    ) x, me
    where me.a_menc and me.handle is not null and x.who is distinct from me.id and x.who is not null
      and x.body ilike '%@' || me.handle || '%' and lower(x.body) ~ public.mention_re(me.handle) and public.author_visible(x.who)
    union all
    -- menções nos clubes de que a pessoa participa (só nas partes que ela já pode ler)
    select 'clube_mencao', x.created_at, x.id::text, x.part::text, k.slug, k.name, left(x.body, 140), x.author
    from clubs k join club_members m on m.club_id = k.id, me, lateral public.club_messages_of(k.id) x
    where me.a_menc and m.user_id = me.id and me.handle is not null and not k.mod_hidden
      and (x.part = 0 or x.part <= m.stage) and x.deleted_at is null and not x.mod_hidden
      and x.author is distinct from me.id and x.author is not null and x.created_at > now() - interval '30 days'
      and x.body ilike '%@' || me.handle || '%' and lower(x.body) ~ public.mention_re(me.handle) and public.author_visible(x.author)
    union all
    -- jogatina que começa nas próximas 12 horas (ou está acontecendo), para quem disse Vou ou Talvez
    select 'jogatina', j.starts_at - interval '12 hours', j.id::text, '', j.id::text, j.title, null, null
    from jogatinas j join jogatina_people x on x.jogatina_id = j.id and x.user_id = auth.uid(), me
    where me.a_club and x.rsvp <> 'nao' and not j.mod_hidden and j.canceled_at is null
      and j.starts_at - interval '12 hours' <= now() and not public.jogatina_ended(j)
    union all
    -- respostas às mensagens da pessoa numa jogatina
    select 'jogatina_resposta', r.created_at, r.id::text, p.id::text, j.id::text, j.title, left(r.body, 140), r.author
    from replies r join posts p on p.id = r.post_id join jogatinas j on j.id = p.jogatina_id, me
    where me.a_club and p.author = me.id and r.author is distinct from me.id and r.author is not null and r.deleted_at is null and not r.mod_hidden
      and public.jogatina_in(j.id) and public.author_visible(r.author) and r.created_at > now() - interval '30 days'
    union all
    -- menções nas jogatinas em que a pessoa está
    select 'jogatina_mencao', x.created_at, x.id::text, '', j.id::text, j.title, left(x.body, 140), x.author
    from jogatinas j join jogatina_people m on m.jogatina_id = j.id, me, lateral public.jogatina_messages_of(j.id) x
    where me.a_menc and m.user_id = me.id and me.handle is not null and not j.mod_hidden
      and x.deleted_at is null and not x.mod_hidden
      and x.author is distinct from me.id and x.author is not null and x.created_at > now() - interval '30 days'
      and x.body ilike '%@' || me.handle || '%' and lower(x.body) ~ public.mention_re(me.handle) and public.author_visible(x.author)
    union all
    -- parte sugerida que abriu hoje (ou nos últimos 3 dias) e a pessoa ainda não passou
    select 'parte', (pt.suggested_on::timestamp at time zone 'America/Sao_Paulo'), k.id::text || ':' || pt.ordinal, pt.ordinal::text, k.slug, k.name, pt.title, null
    from club_parts pt join clubs k on k.id = pt.club_id join club_members m on m.club_id = k.id and m.user_id = auth.uid(), me
    where me.a_club and pt.suggested_on is not null and not k.mod_hidden and m.stage < pt.ordinal
      and (pt.suggested_on::timestamp at time zone 'America/Sao_Paulo') <= now()
      and (pt.suggested_on::timestamp at time zone 'America/Sao_Paulo') > now() - interval '3 days'),
  -- Cada coisa aparece uma vez só: resposta para você, depois menção, depois conversa acompanhada.
  uniq as (select distinct on (id) * from items
           order by id, case when kind in ('resposta', 'clube_resposta', 'jogatina_resposta') then 0 when kind like '%mencao' then 1 else 2 end)
  select jsonb_build_object(
    'count', (select count(*) from uniq, me where uniq.at > me.since and uniq.at <= now()),
    'items', coalesce((select jsonb_agg(jsonb_build_object('kind', i.kind, 'id', i.id, 'ref', i.ref, 'slug', i.slug, 'title', i.title,
        'excerpt', i.excerpt, 'at', i.at, 'new', i.at > (select since from me), 'author', case when i.who is not null then public.person_json(i.who) end)
        order by i.at desc) from (select * from uniq where at <= now() order by at desc limit 20) i), '[]'::jsonb));
$$;

-- Seus dados: também as jogatinas.
create or replace function public.my_community_data() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'postagens', coalesce((select jsonb_agg(jsonb_build_object('id', p.id,
        'onde', case when p.club_id is not null then 'clube/' || k.slug when p.jogatina_id is not null then 'jogatina/' || p.jogatina_id when c.slug is not null then 'w/' || c.slug else 'Praça' end,
        'parteDoClube', case when p.club_id is not null then p.club_part end,
        'tipo', p.kind, 'titulo', p.title, 'texto', p.body, 'jogo', g.title, 'spoiler', p.spoiler, 'spoilerSobre', p.spoiler_note,
        'enquete', (select to_jsonb(pl.options) from post_polls pl where pl.post_id = p.id),
        'imagens', to_jsonb(p.images), 'link', p.clip, 'criadaEm', p.created_at, 'editadaEm', p.edited_at, 'apagadaEm', p.deleted_at) order by p.created_at)
      from posts p left join communities c on c.id = p.community_id left join clubs k on k.id = p.club_id left join jogatinas jg on jg.id = p.jogatina_id left join games g on g.id = p.game_id
      where p.author = auth.uid()), '[]'::jsonb),
    'respostas', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'postagem', r.post_id,
        'onde', case when p.club_id is not null then 'clube/' || k.slug when p.jogatina_id is not null then 'jogatina/' || p.jogatina_id when c.slug is not null then 'w/' || c.slug else 'Praça' end,
        'emResposta', coalesce(p.title, k.name, jg.title, public.post_label(p)),
        'texto', r.body, 'imagens', to_jsonb(r.images), 'criadaEm', r.created_at, 'editadaEm', r.edited_at, 'apagadaEm', r.deleted_at) order by r.created_at)
      from replies r join posts p on p.id = r.post_id left join communities c on c.id = p.community_id left join clubs k on k.id = p.club_id left join jogatinas jg on jg.id = p.jogatina_id
      where r.author = auth.uid()), '[]'::jsonb),
    'comunidadesCriadas', coalesce((select jsonb_agg(jsonb_build_object('endereco', 'w/' || c.slug, 'nome', c.name, 'descricao', c.description,
        'combinados', c.rules, 'capa', c.cover, 'criadaEm', c.created_at) order by c.created_at)
      from communities c where c.created_by = auth.uid()), '[]'::jsonb),
    'comunidadesQueSegue', coalesce((select jsonb_agg(jsonb_build_object('endereco', 'w/' || c.slug, 'nome', c.name, 'desde', m.joined_at) order by m.joined_at)
      from community_members m join communities c on c.id = m.community_id where m.user_id = auth.uid()), '[]'::jsonb),
    'clubes', coalesce((select jsonb_agg(jsonb_build_object('endereco', 'clube/' || k.slug, 'nome', k.name, 'papel', m.role, 'ritmo', k.format, 'combinado', case when k.created_by = auth.uid() then k.schedule end,
        'primeiraVez', m.first_time, 'parte', m.stage, 'terminouEm', m.finished_at, 'entrouEm', m.joined_at,
        'criado', k.created_by = auth.uid(), 'descricao', case when k.created_by = auth.uid() then k.description end) order by m.joined_at)
      from club_members m join clubs k on k.id = m.club_id where m.user_id = auth.uid()), '[]'::jsonb),
    'jogatinas', coalesce((select jsonb_agg(jsonb_build_object('endereco', 'jogatina/' || j.id, 'titulo', j.title, 'jogo', g.title, 'quando', j.starts_at,
        'resposta', x.rsvp, 'euEstavaLa', x.was_there, 'entrouEm', x.joined_at, 'criada', j.created_by = auth.uid(),
        'descricao', case when j.created_by = auth.uid() then j.description end) order by j.starts_at)
      from jogatina_people x join jogatinas j on j.id = x.jogatina_id join games g on g.id = j.game_id where x.user_id = auth.uid()), '[]'::jsonb),
    'reacoes', coalesce((select jsonb_agg(jsonb_build_object('em', x.target, 'id', x.target_id, 'reacao', x.kind, 'quando', x.created_at) order by x.created_at)
      from reactions x where x.user_id = auth.uid()), '[]'::jsonb),
    'votosEmEnquetes', coalesce((select jsonb_agg(jsonb_build_object('postagem', v.post_id, 'opcao', pl.options[v.option + 1], 'quando', v.created_at) order by v.created_at)
      from poll_votes v join post_polls pl on pl.post_id = v.post_id where v.user_id = auth.uid()), '[]'::jsonb),
    'conversasSalvas', coalesce((select jsonb_agg(jsonb_build_object('postagem', s.post_id, 'quando', s.created_at) order by s.created_at)
      from post_saves s where s.user_id = auth.uid()), '[]'::jsonb),
    'conversasAcompanhadas', coalesce((select jsonb_agg(jsonb_build_object('postagem', f.post_id, 'desde', f.created_at) order by f.created_at)
      from post_follows f where f.user_id = auth.uid()), '[]'::jsonb));
$$;

-- Moderação: jogatinas também podem ser denunciadas e tiradas do ar.
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
  end if;
  return out;
end; $$;

create or replace function public.report_content(p_kind text, p_handle text, p_ref text, p_reason text, p_note text) returns text
language plpgsql security definer set search_path = public as $$
declare owner_id uuid; snap jsonb; n integer; r text := coalesce(p_ref, ''); v_note text := nullif(left(trim(coalesce(p_note, '')), 500), '');
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if p_kind not in ('perfil', 'jornada', 'vitrine', 'momento', 'museu', 'comunidade', 'postagem', 'resposta', 'clube', 'jogatina') then raise exception 'report_kind'; end if;
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
    when 'jogatina' then 'A jogatina “' || coalesce(snap ->> 'title', '') || '”'
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
revoke all on function public.jogatina_in(uuid) from public, anon, authenticated;
revoke all on function public.jogatina_open(public.jogatinas, text) from public, anon, authenticated;
revoke all on function public.jogatina_ended(public.jogatinas) from public, anon, authenticated;
revoke all on function public.jogatina_json(public.jogatinas, boolean) from public, anon, authenticated;
revoke all on function public.jogatina_messages_of(uuid) from public, anon, authenticated;
revoke all on function public.jogatina_check(jsonb) from public, anon, authenticated;
revoke all on function public.club_messages_of(uuid) from public, anon, authenticated;
revoke all on function public.jogatina_list(text, text, text, text, integer) from public;
revoke all on function public.jogatina_get(uuid, text) from public;
revoke all on function public.jogatina_create(jsonb) from public, anon;
revoke all on function public.jogatina_update(uuid, jsonb) from public, anon;
revoke all on function public.jogatina_cancel(uuid, boolean) from public, anon;
revoke all on function public.jogatina_rsvp(uuid, text, text) from public, anon;
revoke all on function public.jogatina_was_there(uuid, boolean) from public, anon;
revoke all on function public.jogatina_message(uuid, uuid, text, boolean, text[]) from public, anon;
revoke all on function public.club_list(text, text, integer, text) from public;
revoke all on function public.club_set_game(uuid, text, jsonb) from public, anon;
revoke all on function public.club_join(text, text, boolean) from public, anon;
grant execute on function public.jogatina_list(text, text, text, text, integer) to anon, authenticated;
grant execute on function public.jogatina_get(uuid, text) to anon, authenticated;
grant execute on function public.jogatina_create(jsonb) to authenticated;
grant execute on function public.jogatina_update(uuid, jsonb) to authenticated;
grant execute on function public.jogatina_cancel(uuid, boolean) to authenticated;
grant execute on function public.jogatina_rsvp(uuid, text, text) to authenticated;
grant execute on function public.jogatina_was_there(uuid, boolean) to authenticated;
grant execute on function public.jogatina_message(uuid, uuid, text, boolean, text[]) to authenticated;
grant execute on function public.club_list(text, text, integer, text) to anon, authenticated;
grant execute on function public.club_set_game(uuid, text, jsonb) to authenticated;
grant execute on function public.club_join(text, text, boolean) to authenticated;

notify pgrst, 'reload schema';

-- O jogo nos cartões também leva a imagem de fundo (a arte da jogatina e o topo do clube).
create or replace function public.game_json(p_id text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', g.id, 'slug', g.slug, 'title', g.title, 'cover', g.cover, 'backdrop', g.backdrop) from games g where g.id = p_id;
$$;
revoke all on function public.game_json(text) from public, anon, authenticated;

notify pgrst, 'reload schema';
