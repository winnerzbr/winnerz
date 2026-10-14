-- Etapa 6 · Seguir e amigos
-- Seguir um perfil (sem aprovação); quando os dois se seguem, viram amigos. Novo nível de visibilidade por pilar:
-- "amigos". Listas de quem você segue e de quem te segue (com remover seguidor), atividade dos amigos e contadores
-- no perfil. Quem está bloqueado não segue, e bloquear desfaz o seguir dos dois lados.
-- Rodar uma vez, no SQL Editor do Supabase (depois da 0024).

create table if not exists public.follows (
  follower uuid not null references auth.users (id) on delete cascade,
  followed uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followed),
  check (follower <> followed)
);
create index if not exists follows_followed on public.follows (followed, created_at desc);
alter table public.follows enable row level security;
revoke all on public.follows from anon, authenticated;

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(a is not null and b is not null and a <> b, false)
     and exists (select 1 from follows where follower = a and followed = b)
     and exists (select 1 from follows where follower = b and followed = a);
$$;

-- Quem pede pode ver o pilar? Público, com o código do link, a própria pessoa, ou amigo quando o pilar é "amigos".
create or replace function public.can_see_pillar(p public.profiles, p_pillar text, p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p.id = auth.uid(), false)
      or coalesce(p.visibility ->> p_pillar = 'publico', false)
      or coalesce(p.visibility ->> p_pillar = 'link' and p_key = p.share_key, false)
      or coalesce(p.visibility ->> p_pillar = 'amigos' and public.are_friends(p.id, auth.uid()), false);
$$;
create or replace function public.can_see_journey(p public.profiles, p_key text) returns boolean
language sql stable security definer set search_path = public as $$ select public.can_see_pillar(p, 'jornada', p_key); $$;
create or replace function public.can_see_collection(p public.profiles, p_key text) returns boolean
language sql stable security definer set search_path = public as $$ select public.can_see_pillar(p, 'colecao', p_key); $$;

-- A base do perfil passa a usar as mesmas regras. Perfil com algum pilar "só amigos" mostra ao menos o cartão
-- (nome, @, bio), para quem não é amigo conseguir seguir.
create or replace function public.public_profile_base(p_handle text, p_key text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles%rowtype; show_j boolean; show_c boolean; show_n boolean; social boolean; out jsonb;
begin
  select * into p from profiles where handle is not null and lower(handle) = lower(p_handle);
  if not found then return null; end if;
  show_j := public.can_see_pillar(p, 'jornada', p_key);
  show_c := public.can_see_pillar(p, 'colecao', p_key);
  show_n := public.can_see_pillar(p, 'notas', p_key);
  social := 'amigos' in (coalesce(p.visibility ->> 'jornada', ''), coalesce(p.visibility ->> 'colecao', ''), coalesce(p.visibility ->> 'notas', ''));
  if not (show_j or show_c or show_n or social) then return null; end if;

  out := jsonb_build_object('name', p.display_name, 'handle', p.handle, 'bio', p.bio, 'since', p.created_at,
    'onlyLink', not (p.visibility ->> 'jornada' = 'publico' or p.visibility ->> 'colecao' = 'publico' or p.visibility ->> 'notas' = 'publico'),
    'friendsOnly', social and not public.are_friends(p.id, auth.uid()) and p.id is distinct from auth.uid());

  if show_j then
    out := out || jsonb_build_object('jornada', jsonb_build_object(
      'playing', coalesce((select jsonb_agg(x order by x ->> 'startedAt' desc) from (
        select jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover, 'progress', h.progress,
          'startedAt', h.started_at, 'startedPrecision', h.started_precision, 'ordinal', h.ordinal) x
        from histories h join journeys j on j.id = h.journey_id join games g on g.id = j.game_id
        where h.user_id = p.id and h.state = 'ativa' order by h.started_at desc limit 12) t), '[]'::jsonb),
      'completed', coalesce((select jsonb_agg(x order by x ->> 'completedAt' desc nulls last) from (
        select jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover,
          'completedAt', h.completed_at, 'completedPrecision', h.completed_precision, 'ordinal', h.ordinal) x
        from histories h join journeys j on j.id = h.journey_id join games g on g.id = j.game_id
        where h.user_id = p.id and h.state = 'concluida' order by h.completed_at desc nulls last limit 30) t), '[]'::jsonb),
      'journeys', (select count(*) from journeys where user_id = p.id),
      'finished', (select count(*) from histories where user_id = p.id and state = 'concluida')));
  end if;

  if show_c then
    out := out || jsonb_build_object('colecao', jsonb_build_object(
      'count', (select count(*) from copies where user_id = p.id and deleted_at is null),
      'platforms', coalesce((select jsonb_agg(jsonb_build_object('platform', platform, 'n', n) order by n desc) from (
        select platform, count(*) n from copies where user_id = p.id and deleted_at is null group by platform) t), '[]'::jsonb),
      'items', coalesce((select jsonb_agg(x order by x ->> 'at' desc) from (
        select jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover, 'platform', c.platform, 'at', c.created_at) x
        from copies c join games g on g.id = c.game_id where c.user_id = p.id and c.deleted_at is null order by c.created_at desc limit 60) t), '[]'::jsonb)));
  end if;

  if show_n then
    out := out || jsonb_build_object('notas', coalesce((select jsonb_agg(x order by x ->> 'at' desc) from (
      select jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover, 'normalized', r.normalized,
        'originalScale', r.original_scale, 'originalValue', r.original_value, 'reviewTitle', r.title,
        'text', case when r.spoiler then '' else r.text end, 'spoiler', r.spoiler, 'at', r.created_at) x
      from reviews r join games g on g.id = r.game_id where r.user_id = p.id order by r.created_at desc limit 30) t), '[]'::jsonb));
  end if;
  return out;
end; $$;

-- O perfil completo ganha os contadores de quem segue.
create or replace function public.public_profile_v4(p_handle text, p_key text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles%rowtype; out jsonb;
begin
  out := public.public_profile_v3(p_handle, p_key);
  if out is null then return null; end if;
  select * into p from profiles where handle is not null and lower(handle) = lower(p_handle);
  out := out || jsonb_build_object('stage', public.public_stage(p), 'avatar', p.avatar,
    'followers', (select count(*) from follows where followed = p.id),
    'following', (select count(*) from follows where follower = p.id));
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
      where e.user_id = p.id and j.shared and not e.mod_hidden and e.kind = 'momento' and e.image_path like p.id::text || '/%'
      order by e.at desc limit 9) t), '[]'::jsonb));
  end if;
  return out;
end; $$;

-- O servidor (api/perfil) usa a chave secreta para assinar as fotos; com estas, as regras de amigos e bloqueio valem
-- para quem pediu (o servidor confere o token da pessoa antes). Só o servidor chama.
create or replace function public.public_profile_as(p_handle text, p_key text, p_viewer uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_viewer::text, ''), true);
  return public.public_profile_v4(p_handle, p_key);
end; $$;
create or replace function public.public_journey_as(p_handle text, p_key text, p_slug text, p_viewer uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_viewer::text, ''), true);
  return public.public_journey(p_handle, p_key, p_slug);
end; $$;
create or replace function public.public_museum_as(p_handle text, p_key text, p_viewer uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_viewer::text, ''), true);
  return public.public_museum(p_handle, p_key);
end; $$;

-- Visibilidade: aceita "amigos".
create or replace function public.set_my_profile(p_handle text, p_bio text, p_visibility jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb := '{}'::jsonb; k text; h text := nullif(trim(p_handle), ''); b text := nullif(left(trim(coalesce(p_bio, '')), 160), ''); cur text;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if h is null then raise exception 'handle_required'; end if;
  if h !~ '^[A-Za-z0-9_]{3,24}$' then raise exception 'handle_format'; end if;
  perform public.check_new_handle(h);
  if b is not null and not public.is_admin() and public.has_bad_term(b) then raise exception 'bio_offensive'; end if;
  foreach k in array array['jornada', 'colecao', 'notas'] loop
    v := v || jsonb_build_object(k, case when p_visibility ->> k in ('link', 'publico', 'amigos') then p_visibility ->> k else 'privado' end);
  end loop;
  v := v || jsonb_build_object('aoVivo', case when p_visibility ->> 'aoVivo' = 'sim' then 'sim' else 'nao' end);
  select handle into cur from profiles where id = auth.uid();
  begin
    update profiles set handle = h, display_name = h, bio = b, visibility = v where id = auth.uid();
  exception when unique_violation then raise exception 'handle_taken';
  end;
  perform public.log_handle_change(cur, h);
  return public.my_profile() || jsonb_build_object('links', (select links from profiles where id = auth.uid()));
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Seguir
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_blocks where kind = 'bloquear' and ((blocker = a and blocked = b) or (blocker = b and blocked = a)));
$$;

create or replace function public.follow_state(p_handle text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t uuid;
begin
  select id into t from profiles where handle is not null and lower(handle) = lower(p_handle);
  if t is null then return null; end if;
  return jsonb_build_object(
    'following', exists (select 1 from follows where follower = auth.uid() and followed = t),
    'followedBy', exists (select 1 from follows where follower = t and followed = auth.uid()),
    'followers', (select count(*) from follows where followed = t),
    'followingCount', (select count(*) from follows where follower = t),
    'blocked', auth.uid() is not null and public.blocked_between(auth.uid(), t),
    'self', t = auth.uid());
end; $$;

create or replace function public.follow_user(p_handle text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t uuid; n integer;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  select id into t from profiles where handle is not null and lower(handle) = lower(p_handle);
  if t is null then raise exception 'target_not_found'; end if;
  if t = auth.uid() then raise exception 'follow_self'; end if;
  if public.blocked_between(auth.uid(), t) then raise exception 'follow_blocked'; end if;
  if not exists (select 1 from follows where follower = auth.uid() and followed = t) then
    select count(*) into n from follows where follower = auth.uid() and created_at > now() - interval '1 day';
    if n >= 200 and not public.is_admin() then raise exception 'follow_limit'; end if;
    insert into follows (follower, followed) values (auth.uid(), t) on conflict do nothing;
  end if;
  return public.follow_state(p_handle);
end; $$;

create or replace function public.unfollow_user(p_handle text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  delete from follows where follower = auth.uid() and followed = (select id from profiles where handle is not null and lower(handle) = lower(p_handle));
  return public.follow_state(p_handle);
end; $$;

-- Tirar alguém da lista de quem te segue (a pessoa não é avisada; pode seguir de novo).
create or replace function public.remove_follower(p_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from follows where follower = p_id and followed = auth.uid();
$$;

-- As três listas da própria pessoa.
create or replace function public.my_people() returns jsonb
language sql stable security definer set search_path = public as $$
  with mine as (select auth.uid() u),
  ing as (select f.followed id, f.created_at at from follows f, mine where f.follower = mine.u),
  ers as (select f.follower id, f.created_at at from follows f, mine where f.followed = mine.u),
  row_of as (
    select p.id, jsonb_build_object('id', p.id, 'handle', p.handle, 'avatar', p.avatar, 'bio', p.bio) j from profiles p
    where p.id in (select id from ing union select id from ers))
  select jsonb_build_object(
    'following', coalesce((select jsonb_agg(r.j || jsonb_build_object('at', ing.at, 'mutual', exists (select 1 from ers where ers.id = ing.id)) order by ing.at desc)
                           from ing join row_of r on r.id = ing.id), '[]'::jsonb),
    'followers', coalesce((select jsonb_agg(r.j || jsonb_build_object('at', ers.at, 'mutual', exists (select 1 from ing where ing.id = ers.id)) order by ers.at desc)
                           from ers join row_of r on r.id = ers.id), '[]'::jsonb));
$$;

-- O que os amigos andaram jogando: só o que cada um deixou ver (pilar Jornada público ou só amigos),
-- sem quem você silenciou ou bloqueou, sem perfis suspensos e sem o que a moderação tirou do perfil.
create or replace function public.friends_activity(p_limit integer default 40) returns jsonb
language sql stable security definer set search_path = public as $$
  with fr as (
    select p.* from profiles p
    where public.are_friends(p.id, auth.uid())
      and p.handle is not null
      and (p.suspended_until is null or p.suspended_until <= now())
      and not exists (select 1 from user_blocks b where b.blocker = auth.uid() and b.blocked = p.id)
      and public.can_see_journey(p, null)),
  ev as (
    select 'jogando' kind, fr.handle, fr.avatar, g.title, g.slug, g.cover, h.started_at at, null::text detail, j.shared and not j.mod_hidden shared
    from fr join histories h on h.user_id = fr.id join journeys j on j.id = h.journey_id join games g on g.id = j.game_id
    where h.state = 'ativa' and h.started_at > now() - interval '60 days'
    union all
    select 'zerou', fr.handle, fr.avatar, g.title, g.slug, g.cover, h.completed_at, null, j.shared and not j.mod_hidden
    from fr join histories h on h.user_id = fr.id join journeys j on j.id = h.journey_id join games g on g.id = j.game_id
    where h.state = 'concluida' and h.completed_at > now() - interval '60 days'
    union all
    select 'momento', fr.handle, fr.avatar, g.title, g.slug, g.cover, e.at, e.title, true
    from fr join journeys j on j.user_id = fr.id and j.shared and not j.mod_hidden join timeline_events e on e.journey_id = j.id join games g on g.id = j.game_id
    where e.kind = 'momento' and not e.mod_hidden and e.at > now() - interval '60 days')
  select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'handle', handle, 'avatar', avatar, 'title', title, 'slug', slug, 'cover', cover,
                                               'at', at, 'detail', detail, 'shared', shared) order by at desc), '[]'::jsonb)
  from (select * from ev where at is not null order by at desc limit greatest(1, least(coalesce(p_limit, 40), 100))) t;
$$;

-- Bloquear desfaz o seguir dos dois lados.
create or replace function public.unfollow_on_block() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'bloquear' then
    delete from follows where (follower = new.blocker and followed = new.blocked) or (follower = new.blocked and followed = new.blocker);
  end if;
  return new;
end; $$;
drop trigger if exists user_blocks_unfollow on public.user_blocks;
create trigger user_blocks_unfollow after insert or update on public.user_blocks for each row execute function public.unfollow_on_block();

-- ---------------------------------------------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------------------------------------------
revoke all on function public.are_friends(uuid, uuid) from public, anon, authenticated;
revoke all on function public.can_see_pillar(public.profiles, text, text) from public, anon, authenticated;
revoke all on function public.can_see_journey(public.profiles, text) from public, anon, authenticated;
revoke all on function public.can_see_collection(public.profiles, text) from public, anon, authenticated;
revoke all on function public.public_profile_base(text, text) from public, anon, authenticated;
revoke all on function public.blocked_between(uuid, uuid) from public, anon, authenticated;
revoke all on function public.public_profile_as(text, text, uuid) from public, anon, authenticated;
revoke all on function public.public_journey_as(text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.public_museum_as(text, text, uuid) from public, anon, authenticated;
grant execute on function public.public_profile_as(text, text, uuid) to service_role;
grant execute on function public.public_journey_as(text, text, text, uuid) to service_role;
grant execute on function public.public_museum_as(text, text, uuid) to service_role;
grant execute on function public.public_profile_v4(text, text) to anon, authenticated;

revoke all on function public.set_my_profile(text, text, jsonb) from public, anon;
grant execute on function public.set_my_profile(text, text, jsonb) to authenticated;
revoke all on function public.follow_state(text) from public, anon;
revoke all on function public.follow_user(text) from public, anon;
revoke all on function public.unfollow_user(text) from public, anon;
revoke all on function public.remove_follower(uuid) from public, anon;
revoke all on function public.my_people() from public, anon;
revoke all on function public.friends_activity(integer) from public, anon;
grant execute on function public.follow_state(text) to authenticated;
grant execute on function public.follow_user(text) to authenticated;
grant execute on function public.unfollow_user(text) to authenticated;
grant execute on function public.remove_follower(uuid) to authenticated;
grant execute on function public.my_people() to authenticated;
grant execute on function public.friends_activity(integer) to authenticated;
