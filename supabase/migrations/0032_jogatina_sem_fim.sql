-- Etapa 6 · Comunidade, ajuste da entrega C: jogatina "sem hora para acabar".
-- A duração passa a ser opcional (vazia = sem hora para acabar). Para "acontecendo agora", avisos e listas,
-- uma jogatina sem hora para acabar conta como encerrada 12 horas depois de começar.
-- Precisa da 0031. Rodar uma vez, no SQL Editor do Supabase (pode rodar de novo sem problema).

alter table public.jogatinas alter column duration_min drop not null;

create or replace function public.jogatina_ended(j public.jogatinas) returns boolean
language sql stable as $$
  select j.starts_at + make_interval(mins => coalesce(j.duration_min, 720)) < now();
$$;

create or replace function public.jogatina_json(j public.jogatinas, p_full boolean) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', j.id, 'title', j.title, 'description', j.description, 'game', public.game_json(j.game_id),
    'startsAt', j.starts_at, 'durationMin', j.duration_min, 'platform', j.platform, 'maxPeople', j.max_people, 'access', j.access,
    'liveUrl', j.live_url, 'ended', public.jogatina_ended(j), 'canceled', j.canceled_at is not null,
    'now', j.canceled_at is null and now() between j.starts_at - interval '15 minutes' and j.starts_at + make_interval(mins => coalesce(j.duration_min, 720)),
    'community', (select jsonb_build_object('slug', k.slug, 'name', k.name) from communities k where k.id = j.community_id),
    'club', (select jsonb_build_object('slug', k.slug, 'name', k.name) from clubs k where k.id = j.club_id),
    'createdAt', j.created_at, 'hidden', j.mod_hidden, 'owner', public.person_json(j.created_by),
    'going', (select count(*) from jogatina_people x where x.jogatina_id = j.id and x.rsvp = 'vou'),
    'maybe', (select count(*) from jogatina_people x where x.jogatina_id = j.id and x.rsvp = 'talvez'),
    'wasThere', (select count(*) from jogatina_people x where x.jogatina_id = j.id and x.was_there),
    'me', (select jsonb_build_object('rsvp', x.rsvp, 'wasThere', x.was_there) from jogatina_people x where x.jogatina_id = j.id and x.user_id = auth.uid()),
    'inviteCode', case when p_full and (j.created_by = auth.uid() or public.is_admin()) then j.invite_code end);
$$;

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
          case when p ? 'durationMin' then nullif(p ->> 'durationMin', '')::integer else 120 end, nullif(trim(coalesce(p ->> 'platform', '')), ''),
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
         starts_at = (p ->> 'startsAt')::timestamptz, duration_min = case when p ? 'durationMin' then nullif(p ->> 'durationMin', '')::integer else duration_min end,
         platform = nullif(trim(coalesce(p ->> 'platform', '')), ''), max_people = nullif(p ->> 'maxPeople', '')::integer,
         access = coalesce(p ->> 'access', access), live_url = nullif(trim(coalesce(p ->> 'liveUrl', '')), ''),
         invite_code = case when (p ->> 'newCode')::boolean then substr(md5(gen_random_uuid()::text), 1, 12) else invite_code end
   where id = p_id returning * into j;
  return public.jogatina_json(j, true);
end; $$;

notify pgrst, 'reload schema';
