-- Etapa 6 · Comunidade reorganizada, entrega D
--  1. Moderadores por comunidade: quem criou chama até 10 pessoas pelo @. Moderar = fixar, tirar e devolver
--     postagens e respostas da comunidade, sempre com motivo. Tudo fica no histórico aberto da comunidade.
--  2. Porta de entrada: um convite para se apresentar e até 3 boas conversas para começar (escolhidas pela moderação).
--  3. Aviso de nome parecido ao criar uma comunidade.
--  4. Studio: renomear (o endereço antigo continua levando para o novo) e juntar comunidades.
--  5. A ficha do jogo mostra a comunidade do jogo. Ordens novas: destacadas e perguntas sem resposta.
-- Precisa da 0034. Rodar uma vez, no SQL Editor do Supabase (pode rodar de novo sem problema).

-- ---------------------------------------------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------------------------------------------
alter table public.community_members drop constraint if exists community_members_role_check;
alter table public.community_members add constraint community_members_role_check check (role in ('dono', 'mod', 'membro'));

alter table public.communities add column if not exists welcome text check (welcome is null or char_length(welcome) <= 160);
alter table public.communities add column if not exists starters uuid[] not null default '{}';

-- Endereços antigos (renomeada ou juntada a outra): continuam levando para a comunidade certa.
create table if not exists public.community_aliases (
  slug text primary key,
  community_id uuid not null references public.communities (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.community_aliases enable row level security;
revoke all on public.community_aliases from anon, authenticated;

-- O que a moderação da comunidade fez (aberto para quem visita; o trecho do conteúdo só a moderação vê).
create table if not exists public.community_mod_log (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  actor uuid references auth.users (id) on delete set null,
  action text not null check (action in ('fixar', 'soltar', 'tirar', 'devolver', 'mod_entrou', 'mod_saiu', 'porta', 'renomear', 'juntar')),
  target_kind text check (target_kind in ('postagem', 'resposta', 'pessoa', 'comunidade')),
  target_id uuid,
  target_author uuid references auth.users (id) on delete set null,
  reason text check (reason is null or char_length(reason) <= 300),
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists community_mod_log_comm on public.community_mod_log (community_id, created_at desc);
create index if not exists community_mod_log_target on public.community_mod_log (target_id);
alter table public.community_mod_log enable row level security;
revoke all on public.community_mod_log from anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Quem modera
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.community_can_moderate(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (select 1 from community_members where community_id = p_id and user_id = auth.uid() and role in ('dono', 'mod'));
$$;

create or replace function public.community_mod_note(p_comm uuid, p_action text, p_kind text, p_target uuid, p_author uuid, p_reason text, p_snap jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  insert into community_mod_log (community_id, actor, action, target_kind, target_id, target_author, reason, snapshot)
  values (p_comm, auth.uid(), p_action, p_kind, p_target, p_author, nullif(left(trim(coalesce(p_reason, '')), 300), ''), coalesce(p_snap, '{}'::jsonb))
  returning id into v;
  return v;
end; $$;

-- Cartão de uma comunidade (agora com quem modera, a porta de entrada e se você pode moderar).
create or replace function public.community_json(c public.communities) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'description', c.description, 'rules', c.rules,
    'cover', c.cover, 'official', c.official, 'game', public.game_json(c.game_id), 'createdAt', c.created_at,
    'hidden', c.mod_hidden, 'owner', public.person_json(c.created_by),
    'members', (select count(*) from community_members m where m.community_id = c.id),
    'posts', (select count(*) from posts p where p.community_id = c.id and p.deleted_at is null and not p.mod_hidden),
    'lastAt', (select max(p.created_at) from posts p where p.community_id = c.id and p.deleted_at is null and not p.mod_hidden),
    'role', (select m.role from community_members m where m.community_id = c.id and m.user_id = auth.uid()),
    'canModerate', public.community_can_moderate(c.id),
    'mods', coalesce((select jsonb_agg(public.person_json(m.user_id) || jsonb_build_object('role', m.role) order by m.role = 'dono' desc, m.joined_at)
                      from community_members m where m.community_id = c.id and m.role in ('dono', 'mod') and public.author_visible(m.user_id)), '[]'::jsonb),
    'welcome', c.welcome,
    'starters', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'title', public.post_label(p), 'kind', p.kind,
                            'replies', (select count(*) from replies r where r.post_id = p.id and r.deleted_at is null and not r.mod_hidden)) order by array_position(c.starters, p.id))
                          from posts p where p.id = any(c.starters) and p.community_id = c.id and public.content_open(p.author, p.mod_hidden, p.deleted_at)), '[]'::jsonb));
$$;

-- Endereço antigo leva para o novo.
create or replace function public.community_get(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select public.community_json(c) from communities c where c.slug = lower(p_slug) and public.community_open(c)),
    (select jsonb_build_object('moved', c.slug) from community_aliases a join communities c on c.id = a.community_id
      where a.slug = lower(p_slug) and public.community_open(c)));
$$;

-- p_sort: 'recentes' (com p_before), 'conversadas' (mais respostas na semana), 'destacadas' (mais reações em 30 dias)
-- ou 'semresposta' (perguntas sem resposta escolhida). A moderação também vê o que tirou (para poder devolver).
create or replace function public.community_posts(p_slug text, p_sort text default 'recentes', p_before timestamptz default null, p_limit integer default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c communities%rowtype; lim integer := greatest(1, least(coalesce(p_limit, 30), 60)); list jsonb; pins jsonb; v_mod boolean; v_alias text;
begin
  select * into c from communities where slug = lower(p_slug);
  if not found then
    select c2.slug into v_alias from community_aliases a join communities c2 on c2.id = a.community_id where a.slug = lower(p_slug);
    if v_alias is not null then return jsonb_build_object('moved', v_alias); end if;
    return null;
  end if;
  if not public.community_open(c) then return null; end if;
  v_mod := public.community_can_moderate(c.id);
  select coalesce(jsonb_agg(public.post_json(p, false) order by p.created_at desc), '[]'::jsonb) into pins
  from posts p where p.community_id = c.id and p.pinned and public.content_open(p.author, p.mod_hidden, p.deleted_at);
  select coalesce(jsonb_agg(x.j order by x.k1 desc, x.created_at desc), '[]'::jsonb) into list from (
    select public.post_json(p, false) j, p.created_at,
           case p_sort
             when 'conversadas' then (select count(*) from replies r where r.post_id = p.id and r.created_at > now() - interval '7 days' and r.deleted_at is null and not r.mod_hidden)
             when 'destacadas' then (select count(*) from reactions x where x.target = 'post' and x.target_id = p.id and x.created_at > now() - interval '30 days')
             else 0 end k1
    from posts p
    where p.community_id = c.id and not p.pinned
      and (public.content_open(p.author, p.mod_hidden, p.deleted_at) or (v_mod and p.deleted_at is null))
      and case p_sort
            when 'conversadas' then exists (select 1 from replies r where r.post_id = p.id and r.created_at > now() - interval '7 days' and r.deleted_at is null and not r.mod_hidden)
            when 'destacadas' then exists (select 1 from reactions x where x.target = 'post' and x.target_id = p.id and x.created_at > now() - interval '30 days')
            when 'semresposta' then p.kind = 'pergunta' and p.answer_id is null
            else p_before is null or p.created_at < p_before end
    order by k1 desc, p.created_at desc limit lim) x;
  return jsonb_build_object('community', public.community_json(c), 'pinned', pins, 'posts', list);
end; $$;

-- Fixar e soltar: quem modera (fica no histórico).
create or replace function public.post_pin(p_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
declare p posts%rowtype;
begin
  select * into p from posts where id = p_id and deleted_at is null;
  if not found or p.community_id is null then raise exception 'target_not_found'; end if;
  if not public.community_can_moderate(p.community_id) then raise exception 'not_owner'; end if;
  if p_on and (select count(*) from posts where community_id = p.community_id and pinned) >= 3 then raise exception 'pin_limit'; end if;
  if coalesce(p_on, false) = p.pinned then return; end if;
  update posts set pinned = coalesce(p_on, false) where id = p_id;
  perform public.community_mod_note(p.community_id, case when p_on then 'fixar' else 'soltar' end, 'postagem', p.id, p.author, null,
    jsonb_build_object('title', public.post_label(p)));
end; $$;

-- Tirar e devolver uma postagem ou resposta da comunidade, com motivo.
-- Quem modera não mexe no que é de quem criou a comunidade nem da administração; e não devolve o que a
-- moderação do WinnerZ tirou.
create or replace function public.community_hide(p_kind text, p_id uuid, p_on boolean, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p posts%rowtype; v_author uuid; v_hidden boolean; v_text text; v_comm communities%rowtype; v_log uuid; v_reason text := nullif(left(trim(coalesce(p_reason, '')), 300), '');
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if p_kind = 'postagem' then
    select * into p from posts where id = p_id and deleted_at is null;
    if not found then raise exception 'target_not_found'; end if;
    v_author := p.author; v_hidden := p.mod_hidden; v_text := left(coalesce(p.title || ' · ', '') || p.body, 400);
  elsif p_kind = 'resposta' then
    select x.* into p from replies r join posts x on x.id = r.post_id where r.id = p_id and r.deleted_at is null;
    if not found then raise exception 'target_not_found'; end if;
    select author, mod_hidden, left(body, 400) into v_author, v_hidden, v_text from replies where id = p_id;
  else raise exception 'target_not_found'; end if;
  if p.community_id is null then raise exception 'target_not_found'; end if;
  select * into v_comm from communities where id = p.community_id;
  if not public.community_can_moderate(v_comm.id) then raise exception 'not_owner'; end if;
  if not public.is_admin() and not exists (select 1 from community_members where community_id = v_comm.id and user_id = auth.uid() and role = 'dono')
     and (exists (select 1 from profiles where id = v_author and is_admin)
          or exists (select 1 from community_members where community_id = v_comm.id and user_id = v_author and role = 'dono')) then
    raise exception 'mod_protected';
  end if;
  if p_on then
    if v_reason is null then raise exception 'reason_needed'; end if;
    if v_hidden then return jsonb_build_object('hidden', true); end if;
    if p_kind = 'postagem' then update posts set mod_hidden = true, pinned = false where id = p_id;
    else update replies set mod_hidden = true where id = p_id; end if;
    v_log := public.community_mod_note(v_comm.id, 'tirar', p_kind, p_id, v_author, v_reason, jsonb_build_object('text', v_text, 'post', p.id, 'title', public.post_label(p)));
    perform public.notif_add(v_author, 'comunidade_moderacao', null, 'cm:' || v_log, v_log, v_comm.name,
      'A moderação de w/' || v_comm.slug || ' tirou ' || case when p_kind = 'postagem' then 'uma postagem sua' else 'uma resposta sua' end
        || ' da comunidade. Motivo: ' || v_reason,
      '/conversa/' || p.id || case when p_kind = 'resposta' then '#r-' || p_id else '' end, jsonb_build_object('action', 'tirar'));
  else
    if not v_hidden then return jsonb_build_object('hidden', false); end if;
    -- Só devolve o que foi tirado pela moderação da comunidade (o que a moderação do WinnerZ tirou fica com ela).
    if exists (select 1 from moderation_log l where l.kind = p_kind and l.ref = p_id::text and l.action = 'ocultar' and l.undone_at is null) then
      raise exception 'site_moderated';
    end if;
    if p_kind = 'postagem' then update posts set mod_hidden = false where id = p_id;
    else update replies set mod_hidden = false where id = p_id; end if;
    v_log := public.community_mod_note(v_comm.id, 'devolver', p_kind, p_id, v_author, v_reason, jsonb_build_object('post', p.id, 'title', public.post_label(p)));
    perform public.notif_add(v_author, 'comunidade_moderacao', null, 'cm:' || v_log, v_log, v_comm.name,
      'A moderação de w/' || v_comm.slug || ' devolveu ' || case when p_kind = 'postagem' then 'a sua postagem' else 'a sua resposta' end || ' à comunidade.',
      '/conversa/' || p.id || case when p_kind = 'resposta' then '#r-' || p_id else '' end, jsonb_build_object('action', 'devolver'));
  end if;
  return jsonb_build_object('hidden', p_on);
end; $$;

-- Chamar ou tirar alguém da moderação (quem criou a comunidade ou a administração).
create or replace function public.community_mod_set(p_id uuid, p_handle text, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c communities%rowtype; v_user uuid; v_role text; n integer;
begin
  perform public.check_can_publish();
  select * into c from communities where id = p_id;
  if not found then raise exception 'target_not_found'; end if;
  if not public.community_can_edit(p_id) then raise exception 'not_owner'; end if;
  select id into v_user from profiles where handle is not null and lower(handle) = lower(regexp_replace(trim(coalesce(p_handle, '')), '^@', ''))
    and (suspended_until is null or suspended_until <= now());
  if v_user is null then raise exception 'handle_not_found'; end if;
  select role into v_role from community_members where community_id = p_id and user_id = v_user;
  if v_role = 'dono' then raise exception 'owner_already'; end if;
  if p_on then
    if v_role = 'mod' then return public.community_json(c); end if;
    select count(*) into n from community_members where community_id = p_id and role = 'mod';
    if n >= 10 then raise exception 'mod_limit'; end if;
    if exists (select 1 from user_blocks b where (b.blocker = v_user and b.blocked = auth.uid()) or (b.blocker = auth.uid() and b.blocked = v_user)) then
      raise exception 'handle_not_found';
    end if;
    insert into community_members (community_id, user_id, role) values (p_id, v_user, 'mod')
    on conflict (community_id, user_id) do update set role = 'mod';
    perform public.community_mod_note(p_id, 'mod_entrou', 'pessoa', v_user, v_user, null, '{}'::jsonb);
    perform public.notif_add(v_user, 'comunidade_mod', auth.uid(), 'cmod:' || p_id || ':' || extract(epoch from now())::bigint, p_id, c.name,
      'Você agora ajuda a moderar w/' || c.slug || ': fixar, tirar e devolver conversas, sempre com motivo.', '/w/' || c.slug, '{}'::jsonb);
  else
    if v_role is distinct from 'mod' then return public.community_json(c); end if;
    update community_members set role = 'membro' where community_id = p_id and user_id = v_user;
    perform public.community_mod_note(p_id, 'mod_saiu', 'pessoa', v_user, v_user, null, '{}'::jsonb);
  end if;
  return public.community_json(c);
end; $$;

-- Porta de entrada: convite para se apresentar e até 3 boas conversas para começar (quem modera escolhe).
create or replace function public.community_door(p_id uuid, p_welcome text, p_starters uuid[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c communities%rowtype; v_welcome text := nullif(left(trim(coalesce(p_welcome, '')), 160), ''); v_ids uuid[];
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  select * into c from communities where id = p_id;
  if not found then raise exception 'target_not_found'; end if;
  if not public.community_can_moderate(p_id) then raise exception 'not_owner'; end if;
  if public.has_bad_term(v_welcome) then raise exception 'text_offensive'; end if;
  select coalesce(array_agg(x.id order by x.o), '{}') into v_ids from (
    select s.id, s.o from unnest(coalesce(p_starters, '{}')) with ordinality s(id, o)
    where exists (select 1 from posts p where p.id = s.id and p.community_id = p_id and p.deleted_at is null and not p.mod_hidden)
    limit 3) x;
  update communities set welcome = v_welcome, starters = v_ids where id = p_id returning * into c;
  perform public.community_mod_note(p_id, 'porta', 'comunidade', p_id, null, null, jsonb_build_object('welcome', v_welcome, 'starters', to_jsonb(v_ids)));
  return public.community_json(c);
end; $$;

-- Histórico de moderação da comunidade: aberto. O trecho do que foi tirado e de quem era, só para quem modera.
create or replace function public.community_mod_history(p_slug text, p_limit integer default 50) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c communities%rowtype; v_mod boolean;
begin
  select * into c from communities where slug = lower(p_slug);
  if not found or not public.community_open(c) then return null; end if;
  v_mod := public.community_can_moderate(c.id);
  return jsonb_build_object('community', public.community_json(c), 'canModerate', v_mod,
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'action', l.action, 'kind', l.target_kind, 'targetId', l.target_id, 'reason', l.reason, 'at', l.created_at,
        'actor', public.person_json(l.actor),
        'person', case when l.target_kind = 'pessoa' or v_mod then public.person_json(l.target_author) end,
        'title', case when l.action in ('fixar', 'soltar') or v_mod then l.snapshot ->> 'title' end,
        'post', case when l.action in ('fixar', 'soltar', 'devolver') or v_mod then l.snapshot ->> 'post' end,
        'text', case when v_mod then l.snapshot ->> 'text' end,
        'hiddenNow', case when l.action = 'tirar' and v_mod then coalesce((select r.mod_hidden from replies r where r.id = l.target_id), (select p.mod_hidden from posts p where p.id = l.target_id)) end)
        order by l.created_at desc)
      from (select * from community_mod_log where community_id = c.id order by created_at desc limit greatest(1, least(coalesce(p_limit, 50), 200))) l), '[]'::jsonb));
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Nome parecido e a comunidade do jogo
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.community_key(t text) returns text
language sql immutable as $$
  select regexp_replace(regexp_replace(lower(translate(coalesce(t, ''), 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn')),
         '[^a-z0-9]', '', 'g'), '(brasil|br|oficial|official|comunidade|community|fans|fas|clube|club|grupo)$', '');
$$;

-- Comunidades parecidas com o nome ou endereço que a pessoa está criando (ou do mesmo jogo).
create or replace function public.community_similar(p_name text, p_slug text, p_game text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  with k as (select public.community_key(p_name) a, public.community_key(p_slug) b)
  select coalesce(jsonb_agg(x.j order by x.score desc, x.members desc), '[]'::jsonb) from (
    select public.community_json(c) j, (select count(*) from community_members m where m.community_id = c.id) members,
           case when c.game_id is not null and c.game_id = p_game then 3
                when public.community_key(c.name) in (k.a, k.b) or public.community_key(c.slug) in (k.a, k.b) then 2 else 1 end score
    from communities c, k
    where public.community_open(c) and not c.mod_hidden
      and ((c.game_id is not null and c.game_id = p_game)
        or (char_length(k.a) >= 3 and (public.community_key(c.name) = k.a or public.community_key(c.slug) = k.a
            or (char_length(k.a) >= 4 and (strpos(public.community_key(c.name), k.a) > 0 or strpos(k.a, public.community_key(c.name)) > 0))))
        or (char_length(k.b) >= 3 and (public.community_key(c.slug) = k.b or public.community_key(c.name) = k.b
            or (char_length(k.b) >= 4 and (strpos(public.community_key(c.slug), k.b) > 0 or strpos(k.b, public.community_key(c.slug)) > 0)))))
    order by score desc, members desc limit 5) x;
$$;

create or replace function public.game_communities(p_game text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x.j order by x.official desc, x.members desc), '[]'::jsonb) from (
    select public.community_json(c) j, c.official, (select count(*) from community_members m where m.community_id = c.id) members
    from communities c join games g on g.id = c.game_id
    where (g.id = p_game or g.slug = p_game) and public.community_open(c) and not c.mod_hidden
    order by c.official desc, members desc limit 3) x;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Studio: renomear e juntar
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.admin_community_rename(p_id uuid, p_slug text, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c communities%rowtype; v_slug text := lower(trim(coalesce(p_slug, ''))); v_name text := trim(coalesce(p_name, '')); v_old text;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select * into c from communities where id = p_id;
  if not found then raise exception 'target_not_found'; end if;
  if char_length(v_name) < 3 or char_length(v_name) > 48 then raise exception 'name_invalid'; end if;
  if v_slug <> c.slug then
    if v_slug !~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$' or v_slug ~ '--' then raise exception 'slug_invalid'; end if;
    if exists (select 1 from communities where slug = v_slug) then raise exception 'slug_taken'; end if;
    if exists (select 1 from community_aliases where slug = v_slug and community_id <> p_id) then raise exception 'slug_taken'; end if;
    delete from community_aliases where slug = v_slug;
    insert into community_aliases (slug, community_id) values (c.slug, p_id) on conflict (slug) do update set community_id = excluded.community_id;
  end if;
  v_old := c.slug || ' · ' || c.name;
  update communities set slug = v_slug, name = v_name where id = p_id returning * into c;
  perform public.community_mod_note(p_id, 'renomear', 'comunidade', p_id, null, null, jsonb_build_object('from', v_old, 'to', c.slug || ' · ' || c.name));
  return public.community_json(c);
end; $$;

-- Junta p_from em p_into: conversas, quem segue, jogatinas, clubes e endereços passam para p_into; p_from some
-- e o endereço dela leva para p_into. Quem criou p_from passa a moderar p_into.
create or replace function public.admin_community_merge(p_from uuid, p_into uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a communities%rowtype; b communities%rowtype; n integer;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_from = p_into then raise exception 'merge_same'; end if;
  select * into a from communities where id = p_from;
  select * into b from communities where id = p_into;
  if a.id is null or b.id is null then raise exception 'target_not_found'; end if;
  update posts set community_id = b.id, pinned = false where community_id = a.id;
  get diagnostics n = row_count;
  insert into community_members (community_id, user_id, role, joined_at)
  select b.id, m.user_id, case when m.role in ('dono', 'mod') then 'mod' else 'membro' end, m.joined_at
  from community_members m where m.community_id = a.id
  on conflict (community_id, user_id) do update set role = case when community_members.role = 'membro' and excluded.role = 'mod' then 'mod' else community_members.role end;
  update jogatinas set community_id = b.id where community_id = a.id;
  update clubs set community_id = b.id where community_id = a.id;
  update community_aliases set community_id = b.id where community_id = a.id;
  update community_mod_log set community_id = b.id where community_id = a.id;
  insert into community_aliases (slug, community_id) values (a.slug, b.id) on conflict (slug) do update set community_id = excluded.community_id;
  perform public.community_mod_note(b.id, 'juntar', 'comunidade', a.id, a.created_by, null,
    jsonb_build_object('from', a.slug || ' · ' || a.name, 'posts', n));
  if a.created_by is not null then
    perform public.notif_add(a.created_by, 'comunidade_mod', null, 'merge:' || a.id, b.id, b.name,
      'A comunidade w/' || a.slug || ' foi juntada a w/' || b.slug || ' pela administração. As conversas foram junto, e você ajuda a moderar.', '/w/' || b.slug, '{}'::jsonb);
  end if;
  delete from communities where id = a.id;
  return jsonb_build_object('moved', n, 'into', public.community_json(b));
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- A conversa: quem modera a comunidade também modera ali
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.post_get(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p posts%rowtype; c communities%rowtype; v_mod boolean := false;
begin
  select * into p from posts where id = p_id;
  if not found or p.club_id is not null or p.jogatina_id is not null then return null; end if;
  if p.community_id is not null then
    select * into c from communities where id = p.community_id;
    if not found or not public.community_open(c) then return null; end if;
    v_mod := public.community_can_moderate(c.id);
  else
    v_mod := public.is_admin();
  end if;
  if not public.content_open(p.author, p.mod_hidden, p.deleted_at) and not (v_mod and p.deleted_at is null) then return null; end if;
  return public.post_json(p, true) || jsonb_build_object(
    'communityFull', case when p.community_id is not null then public.community_json(c) end,
    'canModerate', v_mod,
    'thread', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'parentId', r.parent_id,
        'body', case when r.deleted_at is not null then '' else r.body end, 'deleted', r.deleted_at is not null,
        'createdAt', r.created_at, 'editedAt', r.edited_at, 'hidden', r.mod_hidden,
        'author', public.person_json(r.author), 'authorCtx', public.author_ctx(r.author, p.game_id),
        'reactions', public.reaction_json('resposta', r.id)) order by r.created_at)
      from replies r where r.post_id = p.id
        and public.author_visible(r.author)
        and (not r.mod_hidden or public.is_admin() or r.author = auth.uid() or v_mod)
        and (r.deleted_at is null or exists (select 1 from replies k where k.parent_id = r.id and k.deleted_at is null))), '[]'::jsonb));
end; $$;

-- Os avisos de moderação da comunidade entram no grupo "Moderação e site" (sempre aparecem).
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

-- ---------------------------------------------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------------------------------------------
revoke all on function public.community_can_moderate(uuid) from public, anon, authenticated;
revoke all on function public.community_mod_note(uuid, text, text, uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.community_key(text) from public, anon, authenticated;
revoke all on function public.community_hide(text, uuid, boolean, text) from public, anon;
revoke all on function public.community_mod_set(uuid, text, boolean) from public, anon;
revoke all on function public.community_door(uuid, text, uuid[]) from public, anon;
revoke all on function public.community_mod_history(text, integer) from public;
revoke all on function public.community_similar(text, text, text) from public, anon;
revoke all on function public.game_communities(text) from public;
revoke all on function public.admin_community_rename(uuid, text, text) from public, anon;
revoke all on function public.admin_community_merge(uuid, uuid) from public, anon;
grant execute on function public.community_hide(text, uuid, boolean, text) to authenticated;
grant execute on function public.community_mod_set(uuid, text, boolean) to authenticated;
grant execute on function public.community_door(uuid, text, uuid[]) to authenticated;
grant execute on function public.community_mod_history(text, integer) to anon, authenticated;
grant execute on function public.community_similar(text, text, text) to authenticated;
grant execute on function public.game_communities(text) to anon, authenticated;
grant execute on function public.admin_community_rename(uuid, text, text) to authenticated;
grant execute on function public.admin_community_merge(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
