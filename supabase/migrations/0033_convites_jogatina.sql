-- Etapa 6 · Comunidade, ajuste da entrega C: convidar pessoas para uma jogatina pelo @.
-- Quem marcou ou já está na lista (Vou/Talvez) convida pelo @, ao marcar ou depois, em qualquer tipo de entrada
-- (aberta, só amigos ou por convite). A pessoa convidada passa a ver a jogatina, recebe o aviso no site e responde
-- Vou/Talvez/Não vou. Bloqueios valem: quem bloqueou você não recebe convite seu (e você não fica sabendo).
-- Limites: 20 @ por vez e 60 convites por dia por pessoa.
-- Precisa da 0032. Rodar uma vez, no SQL Editor do Supabase (pode rodar de novo sem problema).

create table if not exists public.jogatina_invites (
  jogatina_id uuid not null references public.jogatinas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (jogatina_id, user_id)
);
create index if not exists jogatina_invites_user on public.jogatina_invites (user_id, created_at desc);
create index if not exists jogatina_invites_by on public.jogatina_invites (invited_by, created_at desc);
alter table public.jogatina_invites enable row level security;
revoke all on public.jogatina_invites from anon, authenticated;

create or replace function public.jogatina_invited(p_jog uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from jogatina_invites where jogatina_id = p_jog and user_id = auth.uid());
$$;

create or replace function public.jogatina_open(j public.jogatinas, p_code text default null) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or coalesce(j.created_by = auth.uid(), false) or (
    not j.mod_hidden and public.author_visible(j.created_by) and (
      public.jogatina_in(j.id)
      or public.jogatina_invited(j.id)
      or j.access = 'aberto'
      or (j.access = 'amigos' and public.are_friends(j.created_by, auth.uid()))
      or (j.access = 'convite' and p_code is not null and p_code = j.invite_code)
      or (j.club_id is not null and public.club_member(j.club_id))));
$$;

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
            when 'minhas' then public.jogatina_in(j.id) or (public.jogatina_invited(j.id) and not public.jogatina_ended(j) and j.canceled_at is null)
            when 'passadas' then public.jogatina_ended(j) and (public.jogatina_in(j.id) or j.access = 'aberto') and j.canceled_at is null
            else not public.jogatina_ended(j) and j.canceled_at is null
                 and (j.access = 'aberto' or public.jogatina_in(j.id) or public.jogatina_invited(j.id) or (j.access = 'amigos' and public.are_friends(j.created_by, auth.uid()))
                      or (j.club_id is not null and public.club_member(j.club_id)))
          end
    order by case when p_filter = 'passadas' then -extract(epoch from j.starts_at) else extract(epoch from j.starts_at) end
    limit greatest(1, least(coalesce(p_limit, 40), 100))) x;
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
    'invitedBy', (select public.person_json(i.invited_by) from jogatina_invites i where i.jogatina_id = j.id and i.user_id = auth.uid()),
    'invited', (select count(*) from jogatina_invites i where i.jogatina_id = j.id and not exists (select 1 from jogatina_people x where x.jogatina_id = j.id and x.user_id = i.user_id)),
    'inviteCode', case when p_full and (j.created_by = auth.uid() or public.is_admin()) then j.invite_code end);
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
    'invites', coalesce((select jsonb_agg(public.person_json(i.user_id) || jsonb_build_object('by', public.person_json(i.invited_by), 'at', i.created_at) order by i.created_at)
                         from jogatina_invites i where i.jogatina_id = j.id and public.author_visible(i.user_id)
                           and not exists (select 1 from jogatina_people x where x.jogatina_id = j.id and x.user_id = i.user_id)), '[]'::jsonb),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'part', 0, 'parentId', m.parent_id, 'question', m.question, 'target', m.target,
        'body', case when m.deleted_at is not null then '' else m.body end, 'images', to_jsonb(case when m.deleted_at is null then m.images else '{}' end),
        'deleted', m.deleted_at is not null, 'createdAt', m.created_at, 'editedAt', m.edited_at, 'hidden', m.mod_hidden,
        'author', public.person_json(m.author), 'reactions', public.reaction_json(m.target, m.id)) order by m.created_at)
      from public.jogatina_messages_of(j.id) m
      where public.author_visible(m.author) and (not m.mod_hidden or public.is_admin() or m.author = auth.uid())
        and (m.deleted_at is null or m.has_kids)), '[]'::jsonb));
end; $$;

-- Convidar pelo @. Devolve quem recebeu, quem já estava na lista e os @ que não existem.
create or replace function public.jogatina_invite(p_id uuid, p_handles text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare j jogatinas%rowtype; h text; v_user uuid; n integer; sent text[] := '{}'; already text[] := '{}'; missing text[] := '{}';
begin
  perform public.check_can_publish();
  select * into j from jogatinas where id = p_id;
  if not found or not public.jogatina_open(j) then raise exception 'target_not_found'; end if;
  if j.canceled_at is not null then raise exception 'jogatina_canceled'; end if;
  if public.jogatina_ended(j) then raise exception 'club_ended'; end if;
  if j.created_by is distinct from auth.uid() and not public.is_admin()
     and not exists (select 1 from jogatina_people where jogatina_id = p_id and user_id = auth.uid() and rsvp <> 'nao') then
    raise exception 'invite_not_allowed';
  end if;
  if cardinality(coalesce(p_handles, '{}')) > 20 then raise exception 'invite_too_many'; end if;
  if not public.is_admin() then
    select count(*) into n from jogatina_invites where invited_by = auth.uid() and created_at > now() - interval '1 day';
    if n + cardinality(coalesce(p_handles, '{}')) > 60 then raise exception 'invite_limit'; end if;
  end if;
  foreach h in array coalesce(p_handles, '{}') loop
    h := lower(trim(both from regexp_replace(coalesce(h, ''), '^@', '')));
    continue when h = '' or h = any(sent) or h = any(already) or h = any(missing);
    select id into v_user from profiles where handle is not null and lower(handle) = h
      and (suspended_until is null or suspended_until <= now());
    if v_user is null or v_user = auth.uid() then missing := missing || h; continue; end if;
    if exists (select 1 from jogatina_people where jogatina_id = p_id and user_id = v_user) then already := already || h; continue; end if;
    -- Bloqueio em qualquer direção: não convida, e quem convidou não fica sabendo.
    if not exists (select 1 from user_blocks b where (b.blocker = v_user and b.blocked = auth.uid()) or (b.blocker = auth.uid() and b.blocked = v_user and b.kind = 'bloquear')) then
      insert into jogatina_invites (jogatina_id, user_id, invited_by) values (p_id, v_user, auth.uid()) on conflict (jogatina_id, user_id) do nothing;
    end if;
    sent := sent || h;
  end loop;
  if cardinality(sent) > 0 then perform public.note_public_act(); end if;
  return jsonb_build_object('sent', to_jsonb(sent), 'already', to_jsonb(already), 'notFound', to_jsonb(missing));
end; $$;

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
    -- convite para uma jogatina que ainda vai acontecer (some quando a pessoa responde)
    select 'jogatina_convite', i.created_at, 'c:' || j.id::text, '', j.id::text, j.title, null, i.invited_by
    from jogatina_invites i join jogatinas j on j.id = i.jogatina_id, me
    where i.user_id = me.id and not j.mod_hidden and j.canceled_at is null and not public.jogatina_ended(j)
      and not exists (select 1 from jogatina_people x where x.jogatina_id = j.id and x.user_id = me.id)
      and (i.invited_by is null or public.author_visible(i.invited_by))
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
           order by id, case when kind in ('resposta', 'clube_resposta', 'jogatina_resposta', 'jogatina_convite') then 0 when kind like '%mencao' then 1 else 2 end)
  select jsonb_build_object(
    'count', (select count(*) from uniq, me where uniq.at > me.since and uniq.at <= now()),
    'items', coalesce((select jsonb_agg(jsonb_build_object('kind', i.kind, 'id', i.id, 'ref', i.ref, 'slug', i.slug, 'title', i.title,
        'excerpt', i.excerpt, 'at', i.at, 'new', i.at > (select since from me), 'author', case when i.who is not null then public.person_json(i.who) end)
        order by i.at desc) from (select * from uniq where at <= now() order by at desc limit 20) i), '[]'::jsonb));
$$;

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
    'convitesDeJogatina', coalesce((select jsonb_agg(jsonb_build_object('endereco', 'jogatina/' || i.jogatina_id, 'titulo', j.title, 'quem',
        case when i.user_id = auth.uid() then 'recebido' else 'enviado' end, 'para', case when i.invited_by = auth.uid() then (select handle from profiles where id = i.user_id) end,
        'quando', i.created_at) order by i.created_at)
      from jogatina_invites i join jogatinas j on j.id = i.jogatina_id where i.user_id = auth.uid() or i.invited_by = auth.uid()), '[]'::jsonb),
    'reacoes', coalesce((select jsonb_agg(jsonb_build_object('em', x.target, 'id', x.target_id, 'reacao', x.kind, 'quando', x.created_at) order by x.created_at)
      from reactions x where x.user_id = auth.uid()), '[]'::jsonb),
    'votosEmEnquetes', coalesce((select jsonb_agg(jsonb_build_object('postagem', v.post_id, 'opcao', pl.options[v.option + 1], 'quando', v.created_at) order by v.created_at)
      from poll_votes v join post_polls pl on pl.post_id = v.post_id where v.user_id = auth.uid()), '[]'::jsonb),
    'conversasSalvas', coalesce((select jsonb_agg(jsonb_build_object('postagem', s.post_id, 'quando', s.created_at) order by s.created_at)
      from post_saves s where s.user_id = auth.uid()), '[]'::jsonb),
    'conversasAcompanhadas', coalesce((select jsonb_agg(jsonb_build_object('postagem', f.post_id, 'desde', f.created_at) order by f.created_at)
      from post_follows f where f.user_id = auth.uid()), '[]'::jsonb));
$$;

revoke all on function public.jogatina_invited(uuid) from public, anon, authenticated;
revoke all on function public.jogatina_invite(uuid, text[]) from public, anon;
grant execute on function public.jogatina_invite(uuid, text[]) to authenticated;

notify pgrst, 'reload schema';
