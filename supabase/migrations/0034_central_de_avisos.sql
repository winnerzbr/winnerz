-- Etapa 6 · Central de avisos (antes da entrega D)
--  1. Cada aviso fica guardado no banco no momento em que acontece, com lido e não lido por aviso.
--  2. Tipos: respostas, conversas acompanhadas, menções, reações (agrupadas), clubes e jogatinas (respostas, menções,
--     convites, lembrete 1 hora antes, jogatina que mudou de hora ou foi cancelada, clube que trocou de jogo ou marcou
--     jogatina, parte que abriu), quem começou a seguir você, lançamento da lista de desejos e do Radar, moderação e
--     avisos do site.
--  3. Convite para clube pelo @ (como nas jogatinas).
--  4. Os avisos dos últimos 30 dias que já existiam entram na central.
-- Precisa da 0033. Rodar uma vez, no SQL Editor do Supabase (pode rodar de novo sem problema).

-- ---------------------------------------------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  actor uuid references auth.users (id) on delete set null,
  grp text,
  ref uuid,
  title text,
  excerpt text,
  link text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user on public.notifications (user_id, created_at desc);
create index if not exists notifications_ref on public.notifications (ref) where ref is not null;
-- O mesmo acontecimento não vira dois avisos (a mesma pessoa reagindo de novo, o mesmo lembrete).
create unique index if not exists notifications_once on public.notifications (user_id, kind, grp, coalesce(actor, '00000000-0000-0000-0000-000000000000'::uuid)) where grp is not null;
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;

alter table public.profiles add column if not exists notif_seen_at timestamptz;

create table if not exists public.club_invites (
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (club_id, user_id)
);
create index if not exists club_invites_user on public.club_invites (user_id, created_at desc);
create index if not exists club_invites_by on public.club_invites (invited_by, created_at desc);
alter table public.club_invites enable row level security;
revoke all on public.club_invites from anon, authenticated;

create table if not exists public.site_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  body text not null default '' check (char_length(body) <= 600),
  link text check (link is null or char_length(link) <= 300),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.site_announcements enable row level security;
revoke all on public.site_announcements from anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Peças comuns
-- ---------------------------------------------------------------------------------------------------------------
-- Texto curto para o aviso: sem o que estiver escondido como spoiler.
create or replace function public.notif_text(p text) returns text
language sql immutable as $$
  select nullif(left(regexp_replace(regexp_replace(coalesce(p, ''), '\|\|.*?\|\|', '[spoiler]', 'g'), '\s+', ' ', 'g'), 160), '');
$$;

create or replace function public.notif_add(p_user uuid, p_kind text, p_actor uuid, p_grp text, p_ref uuid, p_title text, p_excerpt text, p_link text,
                                            p_data jsonb default '{}'::jsonb, p_at timestamptz default now()) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_user = p_actor then return; end if;
  insert into notifications (user_id, kind, actor, grp, ref, title, excerpt, link, data, created_at)
  values (p_user, p_kind, p_actor, p_grp, p_ref, left(p_title, 140), p_excerpt, p_link, coalesce(p_data, '{}'::jsonb), coalesce(p_at, now()))
  on conflict do nothing;
end; $$;

-- @ citados num texto (sem a pessoa que escreveu).
create or replace function public.notif_mentioned(p_body text, p_author uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select distinct p.id from (select rtrim(lower(m[1]), '.') h from regexp_matches(coalesce(p_body, ''), '(?:^|[^A-Za-z0-9_.@])@([A-Za-z0-9_.]{2,31})', 'g') m) x
  join profiles p on p.handle is not null and lower(p.handle) = x.h
  where p.id is distinct from p_author;
$$;

-- Onde uma postagem está, para o aviso: o tipo de lugar, o título e o endereço.
create or replace function public.notif_place(p public.posts) returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when p.club_id is not null then (select jsonb_build_object('ctx', 'clube', 'title', k.name, 'link', '/clube/' || k.slug, 'club', k.id) from clubs k where k.id = p.club_id)
    when p.jogatina_id is not null then (select jsonb_build_object('ctx', 'jogatina', 'title', j.title, 'link', '/jogatina/' || j.id, 'jog', j.id) from jogatinas j where j.id = p.jogatina_id)
    else jsonb_build_object('ctx', 'praca', 'title', public.post_label(p), 'link', '/conversa/' || p.id)
  end;
$$;

-- A pessoa consegue ver esta postagem (para o aviso de menção)?
create or replace function public.notif_can_see(p public.posts, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when p.club_id is not null then exists (select 1 from club_members m where m.club_id = p.club_id and m.user_id = p_user and (p.club_part = 0 or m.stage >= p.club_part))
    when p.jogatina_id is not null then exists (select 1 from jogatina_people x where x.jogatina_id = p.jogatina_id and x.user_id = p_user)
                                     or exists (select 1 from jogatina_invites i where i.jogatina_id = p.jogatina_id and i.user_id = p_user)
    else true
  end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Gatilhos: cada acontecimento vira aviso na hora
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.notif_on_post() returns trigger
language plpgsql security definer set search_path = public as $$
declare pl jsonb := public.notif_place(new); u uuid; k text;
begin
  if new.deleted_at is not null or new.mod_hidden or new.author is null then return new; end if;
  k := case pl ->> 'ctx' when 'clube' then 'clube_mencao' when 'jogatina' then 'jogatina_mencao' else 'mencao' end;
  for u in select public.notif_mentioned(new.body, new.author) loop
    if public.notif_can_see(new, u) then
      perform public.notif_add(u, k, new.author, 'p:' || new.id, new.id, pl ->> 'title', public.notif_text(new.body),
        case when pl ->> 'ctx' = 'praca' then pl ->> 'link' else (pl ->> 'link') || '#m-' || new.id end);
    end if;
  end loop;
  return new;
end; $$;

create or replace function public.notif_on_reply() returns trigger
language plpgsql security definer set search_path = public as $$
declare p posts%rowtype; pl jsonb; done uuid[] := array[new.author]; u uuid; v_parent uuid; link text; ctx text; txt text := public.notif_text(new.body);
begin
  if new.deleted_at is not null or new.mod_hidden or new.author is null then return new; end if;
  select * into p from posts where id = new.post_id;
  if not found or p.deleted_at is not null then return new; end if;
  pl := public.notif_place(p); ctx := pl ->> 'ctx';
  link := case when ctx = 'praca' then (pl ->> 'link') || '#r-' || new.id else (pl ->> 'link') || '#m-' || new.id end;
  -- quem escreveu a postagem (na Praça e nas comunidades, só se ainda acompanha a conversa)
  if p.author is not null and not p.author = any(done)
     and (ctx <> 'praca' or exists (select 1 from post_follows f where f.post_id = p.id and f.user_id = p.author)) then
    perform public.notif_add(p.author, case ctx when 'clube' then 'clube_resposta' when 'jogatina' then 'jogatina_resposta' else 'resposta' end,
      new.author, 'r:' || new.id, new.id, pl ->> 'title', txt, link);
    done := done || p.author;
  end if;
  -- quem escreveu a resposta de cima
  if new.parent_id is not null then
    select author into v_parent from replies where id = new.parent_id and deleted_at is null;
    if v_parent is not null and not v_parent = any(done) then
      perform public.notif_add(v_parent, 'resposta', new.author, 'r:' || new.id, new.id, pl ->> 'title', txt, link);
      done := done || v_parent;
    end if;
  end if;
  -- menções
  for u in select public.notif_mentioned(new.body, new.author) loop
    if not u = any(done) and public.notif_can_see(p, u) then
      perform public.notif_add(u, case ctx when 'clube' then 'clube_mencao' when 'jogatina' then 'jogatina_mencao' else 'mencao' end,
        new.author, 'r:' || new.id, new.id, pl ->> 'title', txt, link);
      done := done || u;
    end if;
  end loop;
  -- quem acompanha a conversa (Praça e comunidades)
  if ctx = 'praca' then
    for u in select f.user_id from post_follows f where f.post_id = p.id and not f.user_id = any(done) loop
      perform public.notif_add(u, 'acompanhando', new.author, 'r:' || new.id, new.id, pl ->> 'title', txt, link);
    end loop;
  end if;
  return new;
end; $$;

-- Mensagem apagada ou tirada do ar: o aviso some junto.
create or replace function public.notif_on_gone() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from notifications where ref = old.id;
    return old;
  end if;
  if (new.deleted_at is not null and old.deleted_at is null) or (new.mod_hidden and not old.mod_hidden) then
    delete from notifications where ref = new.id;
  end if;
  return new;
end; $$;

create or replace function public.notif_on_reaction() returns trigger
language plpgsql security definer set search_path = public as $$
declare p posts%rowtype; a uuid; pl jsonb; txt text; link text;
begin
  if tg_op = 'DELETE' then
    if not exists (select 1 from reactions where target = old.target and target_id = old.target_id and user_id = old.user_id) then
      delete from notifications where kind = 'reacao' and grp = old.target || ':' || old.target_id and actor = old.user_id and read_at is null;
    end if;
    return old;
  end if;
  if new.target = 'post' then
    select * into p from posts where id = new.target_id;
    a := p.author; txt := public.notif_text(coalesce(p.title, p.body));
  else
    select p2.* into p from replies r join posts p2 on p2.id = r.post_id where r.id = new.target_id;
    select author, public.notif_text(body) into a, txt from replies where id = new.target_id;
  end if;
  if a is null or p.id is null then return new; end if;
  pl := public.notif_place(p);
  link := case when pl ->> 'ctx' = 'praca' then (pl ->> 'link') || case when new.target = 'resposta' then '#r-' || new.target_id else '' end
               else (pl ->> 'link') || '#m-' || new.target_id end;
  perform public.notif_add(a, 'reacao', new.user_id, new.target || ':' || new.target_id, new.target_id, pl ->> 'title', txt, link,
    jsonb_build_object('reaction', new.kind, 'target', new.target));
  return new;
end; $$;

create or replace function public.notif_on_follow() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notif_add(new.followed, 'seguiu', new.follower, 'f:' || new.follower, null, null, null, null,
    jsonb_build_object('friends', public.are_friends(new.follower, new.followed)));
  return new;
end; $$;

create or replace function public.notif_on_jog_invite() returns trigger
language plpgsql security definer set search_path = public as $$
declare j jogatinas%rowtype;
begin
  select * into j from jogatinas where id = new.jogatina_id;
  perform public.notif_add(new.user_id, 'jogatina_convite', new.invited_by, 'j:' || j.id, j.id, j.title, null, '/jogatina/' || j.id,
    jsonb_build_object('startsAt', j.starts_at));
  return new;
end; $$;

create or replace function public.notif_on_club_invite() returns trigger
language plpgsql security definer set search_path = public as $$
declare c clubs%rowtype;
begin
  select * into c from clubs where id = new.club_id;
  perform public.notif_add(new.user_id, 'clube_convite', new.invited_by, 'k:' || c.id, c.id, c.name, null, '/clube/' || c.slug,
    jsonb_build_object('format', c.format));
  return new;
end; $$;

-- Respondeu ao convite (ou entrou no clube): o aviso do convite fica lido.
create or replace function public.notif_on_join() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'jogatina_people' then
    update notifications set read_at = coalesce(read_at, now()) where user_id = new.user_id and kind = 'jogatina_convite' and ref = new.jogatina_id;
  else
    update notifications set read_at = coalesce(read_at, now()) where user_id = new.user_id and kind = 'clube_convite' and ref = new.club_id;
  end if;
  return new;
end; $$;

-- Jogatina que mudou de hora ou foi cancelada: avisa quem disse Vou ou Talvez.
create or replace function public.notif_on_jog_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare what text; u uuid;
begin
  if new.canceled_at is not null and old.canceled_at is null then what := 'cancelada';
  elsif new.canceled_at is null and new.starts_at is distinct from old.starts_at then what := 'horario';
  else return new; end if;
  delete from notifications where kind = 'jogatina_lembrete' and ref = new.id;
  for u in select user_id from jogatina_people where jogatina_id = new.id and rsvp <> 'nao' and user_id is distinct from auth.uid() loop
    perform public.notif_add(u, 'jogatina_mudou', auth.uid(), 'm:' || new.id || ':' || what || ':' || extract(epoch from now())::bigint, new.id, new.title, null,
      '/jogatina/' || new.id, jsonb_build_object('what', what, 'startsAt', new.starts_at));
  end loop;
  return new;
end; $$;

-- Nova jogatina na agenda de um clube: avisa quem está no clube.
create or replace function public.notif_on_jog_new() returns trigger
language plpgsql security definer set search_path = public as $$
declare c clubs%rowtype; u uuid;
begin
  if new.club_id is null then return new; end if;
  select * into c from clubs where id = new.club_id;
  for u in select user_id from club_members where club_id = new.club_id and user_id is distinct from new.created_by loop
    perform public.notif_add(u, 'clube_jogatina', new.created_by, 'n:' || new.id, new.id, c.name, new.title, '/jogatina/' || new.id,
      jsonb_build_object('startsAt', new.starts_at, 'jogatina', new.title));
  end loop;
  return new;
end; $$;

-- Clube trocou de jogo: avisa quem está no clube.
create or replace function public.notif_on_club_game() returns trigger
language plpgsql security definer set search_path = public as $$
declare u uuid; g text;
begin
  if new.round is not distinct from old.round then return new; end if;
  select title into g from games where id = new.game_id;
  for u in select user_id from club_members where club_id = new.id and user_id is distinct from auth.uid() loop
    perform public.notif_add(u, 'clube_jogo', auth.uid(), 'g:' || new.id || ':' || new.round, new.id, new.name, g, '/clube/' || new.slug,
      jsonb_build_object('game', g));
  end loop;
  return new;
end; $$;

-- Avisos da moderação também entram na central (e somem se a decisão for desfeita antes de a pessoa ver).
create or replace function public.notif_on_notice() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then delete from notifications where ref = old.id; return old; end if;
  perform public.notif_add(new.user_id, 'moderacao', null, 'mod:' || new.id, new.id, 'Moderação', new.text, null, jsonb_build_object('action', new.kind), new.created_at);
  return new;
end; $$;

drop trigger if exists notif_post on public.posts;
create trigger notif_post after insert on public.posts for each row execute function public.notif_on_post();
drop trigger if exists notif_reply on public.replies;
create trigger notif_reply after insert on public.replies for each row execute function public.notif_on_reply();
drop trigger if exists notif_post_gone on public.posts;
create trigger notif_post_gone after update of deleted_at, mod_hidden or delete on public.posts for each row execute function public.notif_on_gone();
drop trigger if exists notif_reply_gone on public.replies;
create trigger notif_reply_gone after update of deleted_at, mod_hidden or delete on public.replies for each row execute function public.notif_on_gone();
drop trigger if exists notif_reaction on public.reactions;
create trigger notif_reaction after insert or delete on public.reactions for each row execute function public.notif_on_reaction();
drop trigger if exists notif_follow on public.follows;
create trigger notif_follow after insert on public.follows for each row execute function public.notif_on_follow();
drop trigger if exists notif_jog_invite on public.jogatina_invites;
create trigger notif_jog_invite after insert on public.jogatina_invites for each row execute function public.notif_on_jog_invite();
drop trigger if exists notif_club_invite on public.club_invites;
create trigger notif_club_invite after insert on public.club_invites for each row execute function public.notif_on_club_invite();
drop trigger if exists notif_jog_join on public.jogatina_people;
create trigger notif_jog_join after insert on public.jogatina_people for each row execute function public.notif_on_join();
drop trigger if exists notif_club_join on public.club_members;
create trigger notif_club_join after insert on public.club_members for each row execute function public.notif_on_join();
drop trigger if exists notif_jog_change on public.jogatinas;
create trigger notif_jog_change after update of starts_at, canceled_at on public.jogatinas for each row execute function public.notif_on_jog_change();
drop trigger if exists notif_jog_new on public.jogatinas;
create trigger notif_jog_new after insert on public.jogatinas for each row execute function public.notif_on_jog_new();
drop trigger if exists notif_jog_gone on public.jogatinas;
create trigger notif_jog_gone after delete on public.jogatinas for each row execute function public.notif_on_gone();
drop trigger if exists notif_club_game on public.clubs;
create trigger notif_club_game after update of round on public.clubs for each row execute function public.notif_on_club_game();
drop trigger if exists notif_notice on public.user_notices;
create trigger notif_notice after insert or delete on public.user_notices for each row execute function public.notif_on_notice();

-- ---------------------------------------------------------------------------------------------------------------
-- Convite para clube pelo @ (quem está no clube convida; a pessoa convidada vê e entra, mesmo sendo por convite)
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.club_open(c public.clubs, p_code text default null) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce(c.created_by = auth.uid(), false) or (
    not c.mod_hidden and public.author_visible(c.created_by) and (
      public.club_member(c.id)
      or exists (select 1 from club_invites i where i.club_id = c.id and i.user_id = auth.uid())
      or c.access = 'aberto'
      or (c.access = 'amigos' and public.are_friends(c.created_by, auth.uid()))
      or (c.access = 'convite' and p_code is not null and p_code = c.invite_code)));
$$;

create or replace function public.club_json(c public.clubs, p_full boolean) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'description', c.description, 'format', c.format,
    'game', public.game_json(c.game_id), 'access', c.access, 'maxMembers', c.max_members, 'schedule', c.schedule, 'round', c.round,
    'community', (select jsonb_build_object('slug', k.slug, 'name', k.name) from communities k where k.id = c.community_id),
    'liveUrl', c.live_url, 'createdAt', c.created_at, 'hidden', c.mod_hidden, 'owner', public.person_json(c.created_by),
    'members', (select count(*) from club_members m where m.club_id = c.id),
    'me', (select jsonb_build_object('role', m.role, 'firstTime', m.first_time, 'stage', m.stage, 'finishedAt', m.finished_at)
           from club_members m where m.club_id = c.id and m.user_id = auth.uid()),
    'invitedBy', (select public.person_json(i.invited_by) from club_invites i where i.club_id = c.id and i.user_id = auth.uid()),
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
                 or exists (select 1 from club_invites i where i.club_id = c.id and i.user_id = auth.uid())
          end
    order by k desc
    limit greatest(1, least(coalesce(p_limit, 60), 200))) x;
$$;

create or replace function public.club_invite(p_id uuid, p_handles text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c clubs%rowtype; h text; v_user uuid; n integer; sent text[] := '{}'; already text[] := '{}'; missing text[] := '{}';
begin
  perform public.check_can_publish();
  select * into c from clubs where id = p_id;
  if not found or not public.club_open(c) then raise exception 'target_not_found'; end if;
  if not public.club_member(p_id) and not public.is_admin() then raise exception 'not_member'; end if;
  if cardinality(coalesce(p_handles, '{}')) > 20 then raise exception 'invite_too_many'; end if;
  if not public.is_admin() then
    select (select count(*) from club_invites where invited_by = auth.uid() and created_at > now() - interval '1 day')
         + (select count(*) from jogatina_invites where invited_by = auth.uid() and created_at > now() - interval '1 day') into n;
    if n + cardinality(coalesce(p_handles, '{}')) > 60 then raise exception 'invite_limit'; end if;
  end if;
  foreach h in array coalesce(p_handles, '{}') loop
    h := lower(trim(both from regexp_replace(coalesce(h, ''), '^@', '')));
    continue when h = '' or h = any(sent) or h = any(already) or h = any(missing);
    select id into v_user from profiles where handle is not null and lower(handle) = h and (suspended_until is null or suspended_until <= now());
    if v_user is null or v_user = auth.uid() then missing := missing || h; continue; end if;
    if exists (select 1 from club_members where club_id = p_id and user_id = v_user) then already := already || h; continue; end if;
    if not exists (select 1 from user_blocks b where (b.blocker = v_user and b.blocked = auth.uid()) or (b.blocker = auth.uid() and b.blocked = v_user and b.kind = 'bloquear')) then
      insert into club_invites (club_id, user_id, invited_by) values (p_id, v_user, auth.uid()) on conflict (club_id, user_id) do nothing;
    end if;
    sent := sent || h;
  end loop;
  if cardinality(sent) > 0 then perform public.note_public_act(); end if;
  return jsonb_build_object('sent', to_jsonb(sent), 'already', to_jsonb(already), 'notFound', to_jsonb(missing));
end; $$;

drop trigger if exists notif_club_gone on public.clubs;
create trigger notif_club_gone after delete on public.clubs for each row execute function public.notif_on_gone();

-- ---------------------------------------------------------------------------------------------------------------
-- Avisos que dependem do relógio: entram quando a pessoa abre o site (lembrete, parte que abriu, lançamento)
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.notif_sync() returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if me is null then return; end if;
  -- jogatina que começa em até 1 hora (para quem disse Vou ou Talvez)
  insert into notifications (user_id, kind, grp, ref, title, link, data, created_at)
  select me, 'jogatina_lembrete', 'l:' || j.id, j.id, j.title, '/jogatina/' || j.id, jsonb_build_object('startsAt', j.starts_at), j.starts_at - interval '1 hour'
  from jogatinas j join jogatina_people x on x.jogatina_id = j.id and x.user_id = me and x.rsvp <> 'nao'
  where j.canceled_at is null and not j.mod_hidden and now() between j.starts_at - interval '1 hour' and j.starts_at + interval '15 minutes'
  on conflict do nothing;
  -- parte sugerida do clube que abriu (e a pessoa ainda não passou)
  insert into notifications (user_id, kind, grp, ref, title, excerpt, link, data, created_at)
  select me, 'parte', 'pt:' || k.id || ':' || k.round || ':' || pt.ordinal, k.id, k.name, pt.title, '/clube/' || k.slug || '#parte-' || pt.ordinal,
         jsonb_build_object('part', pt.ordinal), (pt.suggested_on::timestamp at time zone 'America/Sao_Paulo')
  from club_parts pt join clubs k on k.id = pt.club_id join club_members m on m.club_id = k.id and m.user_id = me
  where not k.mod_hidden and pt.suggested_on is not null and m.stage < pt.ordinal and pt.suggested_on between today - 3 and today
  on conflict do nothing;
  -- lançamento de um jogo da lista de desejos ou do Radar
  insert into notifications (user_id, kind, grp, ref, title, link, data, created_at)
  select me, 'lancamento', 'lc:' || g.id, null, g.title, '/jogos/' || g.slug, jsonb_build_object('cover', g.cover, 'releasedOn', g.released_on),
         (g.released_on::timestamp at time zone 'America/Sao_Paulo')
  from games g
  where g.released_on between today - 3 and today
    and (exists (select 1 from wishes w where w.user_id = me and w.game_id = g.id)
         or exists (select 1 from my_games mg where mg.user_id = me and mg.game_id = g.id and mg.on_radar))
  on conflict do nothing;
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Ler, contar e marcar como lido
-- ---------------------------------------------------------------------------------------------------------------
-- Tipo de aviso → escolha nas Preferências (os da moderação e do site sempre aparecem).
create or replace function public.notif_pref_key(p_kind text) returns text
language sql immutable as $$
  select case
    when p_kind = 'resposta' then 'aviso_respostas'
    when p_kind = 'acompanhando' then 'aviso_acompanhando'
    when p_kind in ('mencao', 'clube_mencao', 'jogatina_mencao') then 'aviso_mencoes'
    when p_kind in ('clube_resposta', 'jogatina_resposta', 'parte', 'clube_jogo', 'clube_jogatina') then 'aviso_clubes'
    when p_kind = 'reacao' then 'aviso_reacoes'
    when p_kind = 'seguiu' then 'aviso_seguidores'
    when p_kind in ('jogatina_convite', 'clube_convite') then 'aviso_convites'
    when p_kind in ('jogatina_lembrete', 'jogatina_mudou') then 'aviso_lembretes'
    when p_kind = 'lancamento' then 'aviso_lancamentos'
  end;
$$;

create or replace function public.notif_group(p_kind text) returns text
language sql immutable as $$
  select case
    when p_kind in ('resposta', 'acompanhando', 'mencao', 'reacao') then 'comunidade'
    when p_kind like 'clube_%' or p_kind like 'jogatina_%' or p_kind = 'parte' then 'grupos'
    when p_kind = 'seguiu' then 'amigos'
    when p_kind = 'lancamento' then 'jornada'
    else 'sistema'
  end;
$$;

-- Os avisos da pessoa, já filtrados (preferências, bloqueios), com as reações juntas num aviso só.
create or replace function public.notif_rows(p_filter text default null) returns table (
  gk text, kind text, title text, excerpt text, link text, data jsonb, at timestamptz, read boolean, ids uuid[], actors uuid[], reactions text[])
language sql stable security definer set search_path = public as $$
  with me as (select * from profiles where id = auth.uid()),
  base as (
    select n.* from notifications n, me
    where n.user_id = me.id
      and (public.notif_pref_key(n.kind) is null or public.cm_pref(me, public.notif_pref_key(n.kind), true))
      and (n.actor is null or public.author_visible(n.actor))
      and (p_filter is null or p_filter = 'tudo' or (p_filter = 'naolidos' and n.read_at is null) or public.notif_group(n.kind) = p_filter)
      and n.created_at <= now()),
  g as (
    select case when b.kind = 'reacao' then 'reacao:' || b.grp || ':' || (b.read_at is null)::text else b.id::text end gk, b.* from base b)
  select g.gk, (array_agg(g.kind))[1], (array_agg(g.title order by g.created_at desc))[1], (array_agg(g.excerpt order by g.created_at desc))[1],
         (array_agg(g.link order by g.created_at desc))[1], (array_agg(g.data order by g.created_at desc))[1], max(g.created_at),
         bool_and(g.read_at is not null), array_agg(g.id), array_remove(array_agg(distinct g.actor), null),
         array_remove(array_agg(distinct g.data ->> 'reaction'), null)
  from g group by g.gk;
$$;

create or replace function public.notif_list(p_filter text default null, p_before timestamptz default null, p_limit integer default 30) returns jsonb
language plpgsql security definer set search_path = public as $$
declare lim integer := greatest(1, least(coalesce(p_limit, 30), 60)); out jsonb; more boolean;
begin
  if auth.uid() is null then return jsonb_build_object('items', '[]'::jsonb, 'more', false); end if;
  perform public.notif_sync();
  select coalesce(jsonb_agg(x.j order by x.at desc), '[]'::jsonb), count(*) > lim into out, more from (
    select r.at, jsonb_build_object('id', r.gk, 'ids', to_jsonb(r.ids), 'kind', r.kind, 'group', public.notif_group(r.kind), 'title', r.title,
      'excerpt', r.excerpt, 'link', r.link, 'data', r.data, 'at', r.at, 'read', r.read, 'reactions', to_jsonb(r.reactions),
      'actorCount', cardinality(r.actors),
      'actors', coalesce((select jsonb_agg(public.person_json(a)) from (select unnest(r.actors[1:3]) a) z), '[]'::jsonb)) j
    from public.notif_rows(p_filter) r
    where p_before is null or r.at < p_before
    order by r.at desc limit lim + 1) x;
  if more then out := out - lim; end if;
  return jsonb_build_object('items', out, 'more', more);
end; $$;

-- Contador do sino: avisos não lidos que chegaram depois da última vez que a pessoa abriu o sino.
create or replace function public.notif_count() returns jsonb
language plpgsql security definer set search_path = public as $$
declare since timestamptz; n integer; u integer;
begin
  if auth.uid() is null then return jsonb_build_object('new', 0, 'unread', 0); end if;
  perform public.notif_sync();
  select coalesce(notif_seen_at, '-infinity'::timestamptz) into since from profiles where id = auth.uid();
  select count(*) filter (where not r.read and r.at > since), count(*) filter (where not r.read) into n, u from public.notif_rows(null) r;
  return jsonb_build_object('new', n, 'unread', u);
end; $$;

create or replace function public.notif_seen() returns void
language sql security definer set search_path = public as $$
  update profiles set notif_seen_at = now() where id = auth.uid();
$$;

create or replace function public.notif_read(p_ids uuid[], p_on boolean default true) returns void
language sql security definer set search_path = public as $$
  update notifications set read_at = case when p_on then coalesce(read_at, now()) end where user_id = auth.uid() and id = any(coalesce(p_ids, '{}'));
$$;

create or replace function public.notif_read_all(p_filter text default null) returns void
language sql security definer set search_path = public as $$
  update notifications n set read_at = now() where n.user_id = auth.uid() and n.read_at is null
    and (p_filter is null or p_filter in ('tudo', 'naolidos') or public.notif_group(n.kind) = p_filter);
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Aviso do site (Studio): vai para todo mundo que tem conta
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.site_announce(p_title text, p_body text, p_link text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a site_announcements%rowtype; n integer; v_link text := nullif(trim(coalesce(p_link, '')), '');
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if char_length(trim(coalesce(p_title, ''))) < 3 or char_length(trim(p_title)) > 120 then raise exception 'name_invalid'; end if;
  if char_length(coalesce(p_body, '')) > 600 then raise exception 'text_long'; end if;
  if v_link is not null and not (v_link ~ '^/[^\s<>"]*$' or v_link ~ '^https://[^\s<>"]{4,}$') then raise exception 'live_invalid'; end if;
  insert into site_announcements (title, body, link, created_by) values (trim(p_title), trim(coalesce(p_body, '')), v_link, auth.uid()) returning * into a;
  insert into notifications (user_id, kind, grp, ref, title, excerpt, link)
  select p.id, 'site', 's:' || a.id, a.id, a.title, nullif(a.body, ''), a.link from profiles p
  on conflict do nothing;
  get diagnostics n = row_count;
  return jsonb_build_object('id', a.id, 'sent', n);
end; $$;

create or replace function public.site_announcements_list() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.is_admin() then coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'body', a.body, 'link', a.link, 'at', a.created_at,
    'read', (select count(*) from notifications n where n.ref = a.id and n.kind = 'site' and n.read_at is not null),
    'sent', (select count(*) from notifications n where n.ref = a.id and n.kind = 'site')) order by a.created_at desc)
    from (select * from site_announcements order by created_at desc limit 20) a), '[]'::jsonb) else '[]'::jsonb end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Os avisos que já existiam (últimos 30 dias) entram na central, uma vez só
-- ---------------------------------------------------------------------------------------------------------------
do $$
declare p record; it jsonb; k text; idt text; refid uuid; lnk text;
begin
  if exists (select 1 from notifications) then return; end if;
  for p in select id, coalesce(replies_seen_at, created_at) since from profiles where handle is not null loop
    perform set_config('request.jwt.claim.sub', p.id::text, true);
    perform set_config('request.jwt.claims', jsonb_build_object('sub', p.id::text, 'role', 'authenticated')::text, true);
    for it in select * from jsonb_array_elements(coalesce(public.my_news() -> 'items', '[]'::jsonb)) loop
      k := it ->> 'kind';
      continue when k not in ('resposta', 'acompanhando', 'mencao', 'clube_resposta', 'clube_mencao', 'jogatina_resposta', 'jogatina_mencao', 'jogatina_convite');
      idt := regexp_replace(it ->> 'id', '^c:', '');
      continue when idt !~ '^[0-9a-f-]{36}$';
      refid := idt::uuid;
      lnk := case
        when k in ('resposta', 'acompanhando', 'mencao') then '/conversa/' || (it ->> 'ref') || case when (it ->> 'id') <> (it ->> 'ref') then '#r-' || (it ->> 'id') else '' end
        when k like 'clube_%' then '/clube/' || (it ->> 'slug') || '#m-' || (it ->> 'id')
        when k = 'jogatina_convite' then '/jogatina/' || (it ->> 'slug')
        else '/jogatina/' || (it ->> 'slug') || '#m-' || (it ->> 'id') end;
      insert into notifications (user_id, kind, actor, grp, ref, title, excerpt, link, created_at, read_at)
      values (p.id, k, nullif(it -> 'author' ->> 'id', '')::uuid, case when k = 'jogatina_convite' then 'j:' || idt else 'r:' || idt end, refid,
              left(it ->> 'title', 140), public.notif_text(it ->> 'excerpt'), lnk, (it ->> 'at')::timestamptz,
              case when (it ->> 'at')::timestamptz <= p.since then (it ->> 'at')::timestamptz end)
      on conflict do nothing;
    end loop;
  end loop;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  -- quem começou a seguir (30 dias) e os avisos da moderação (90 dias)
  insert into notifications (user_id, kind, actor, grp, data, created_at, read_at)
  select f.followed, 'seguiu', f.follower, 'f:' || f.follower, jsonb_build_object('friends', public.are_friends(f.follower, f.followed)), f.created_at,
         case when f.created_at <= coalesce(pr.replies_seen_at, pr.created_at) then f.created_at end
  from follows f join profiles pr on pr.id = f.followed where f.created_at > now() - interval '30 days'
  on conflict do nothing;
  insert into notifications (user_id, kind, grp, ref, title, excerpt, data, created_at, read_at)
  select n.user_id, 'moderacao', 'mod:' || n.id, n.id, 'Moderação', n.text, jsonb_build_object('action', n.kind), n.created_at, n.seen_at
  from user_notices n where n.created_at > now() - interval '90 days'
  on conflict do nothing;
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Seus dados: também os avisos
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.my_notifications_data() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('tipo', n.kind, 'titulo', n.title, 'texto', n.excerpt, 'endereco', n.link, 'quando', n.created_at, 'lidoEm', n.read_at) order by n.created_at desc), '[]'::jsonb)
  from notifications n where n.user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------------------------------------------
revoke all on function public.notif_text(text) from public, anon, authenticated;
revoke all on function public.notif_add(uuid, text, uuid, text, uuid, text, text, text, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.notif_mentioned(text, uuid) from public, anon, authenticated;
revoke all on function public.notif_place(public.posts) from public, anon, authenticated;
revoke all on function public.notif_can_see(public.posts, uuid) from public, anon, authenticated;
revoke all on function public.notif_sync() from public, anon, authenticated;
revoke all on function public.notif_rows(text) from public, anon, authenticated;
revoke all on function public.notif_pref_key(text) from public, anon, authenticated;
revoke all on function public.notif_group(text) from public, anon, authenticated;
revoke all on function public.notif_on_post() from public, anon, authenticated;
revoke all on function public.notif_on_reply() from public, anon, authenticated;
revoke all on function public.notif_on_gone() from public, anon, authenticated;
revoke all on function public.notif_on_reaction() from public, anon, authenticated;
revoke all on function public.notif_on_follow() from public, anon, authenticated;
revoke all on function public.notif_on_jog_invite() from public, anon, authenticated;
revoke all on function public.notif_on_club_invite() from public, anon, authenticated;
revoke all on function public.notif_on_join() from public, anon, authenticated;
revoke all on function public.notif_on_jog_change() from public, anon, authenticated;
revoke all on function public.notif_on_jog_new() from public, anon, authenticated;
revoke all on function public.notif_on_club_game() from public, anon, authenticated;
revoke all on function public.notif_on_notice() from public, anon, authenticated;
revoke all on function public.notif_list(text, timestamptz, integer) from public, anon;
revoke all on function public.notif_count() from public, anon;
revoke all on function public.notif_seen() from public, anon;
revoke all on function public.notif_read(uuid[], boolean) from public, anon;
revoke all on function public.notif_read_all(text) from public, anon;
revoke all on function public.site_announce(text, text, text) from public, anon;
revoke all on function public.site_announcements_list() from public, anon;
revoke all on function public.my_notifications_data() from public, anon;
revoke all on function public.club_invite(uuid, text[]) from public, anon;
grant execute on function public.notif_list(text, timestamptz, integer) to authenticated;
grant execute on function public.notif_count() to authenticated;
grant execute on function public.notif_seen() to authenticated;
grant execute on function public.notif_read(uuid[], boolean) to authenticated;
grant execute on function public.notif_read_all(text) to authenticated;
grant execute on function public.site_announce(text, text, text) to authenticated;
grant execute on function public.site_announcements_list() to authenticated;
grant execute on function public.my_notifications_data() to authenticated;
grant execute on function public.club_invite(uuid, text[]) to authenticated;

notify pgrst, 'reload schema';
