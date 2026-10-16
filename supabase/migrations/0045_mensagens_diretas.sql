-- 0045 · Comunidade, entrega E: mensagens diretas
--
-- Conversa entre duas pessoas. Quem pode começar uma conversa é escolha de quem recebe
-- (Preferências → Privacidade, em profiles.prefs -> 'comunidade' ->> 'dm'):
--   'amigos' (padrão) · 'seguindo' (quem eu sigo) · 'todos' · 'ninguem'.
-- Quem não está liberado manda um pedido só (uma mensagem), que fica em "Pedidos" até ser aceito. Recusar não
-- avisa quem pediu. Bloquear corta a conversa dos dois lados. "Visto" só aparece quando os dois deixam ligado
-- (prefs -> 'comunidade' ->> 'visto', padrão sim). A moderação vê só a mensagem denunciada.
-- Tudo passa pelas funções abaixo; as tabelas não são abertas para leitura direta.
--
-- Pode rodar mais de uma vez.

create table if not exists public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references auth.users (id) on delete cascade,
  b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  -- Pedido pendente: quem pediu. Fica nulo quando a conversa é aceita (ou nasceu liberada).
  requested_by uuid references auth.users (id) on delete cascade,
  declined_at timestamptz,
  check (a < b),
  unique (a, b)
);
create index if not exists dm_threads_a on public.dm_threads (a, last_at desc);
create index if not exists dm_threads_b on public.dm_threads (b, last_at desc);

create table if not exists public.dm_state (
  thread_id uuid not null references public.dm_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default 'epoch',
  muted boolean not null default false,
  -- "Apagar a conversa para mim": some tudo o que veio antes, só para esta pessoa.
  cleared_at timestamptz,
  primary key (thread_id, user_id)
);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads (id) on delete cascade,
  author uuid not null references auth.users (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 4000),
  game_id text references public.games (id) on delete set null,
  reply_to uuid references public.dm_messages (id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  mod_hidden boolean not null default false
);
create index if not exists dm_messages_thread on public.dm_messages (thread_id, created_at desc);
create index if not exists dm_messages_author on public.dm_messages (author, created_at desc);

alter table public.dm_threads enable row level security;
alter table public.dm_state enable row level security;
alter table public.dm_messages enable row level security;
revoke all on public.dm_threads, public.dm_state, public.dm_messages from anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Regras
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.dm_pref(p uuid, k text, d text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select prefs -> 'comunidade' ->> k from profiles where id = p), d);
$$;

-- O que "me" pode fazer para escrever a "other": ok, pedido, aguardando (pedido já enviado), fechado, bloqueado.
create or replace function public.dm_can(me uuid, other uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare t dm_threads%rowtype; pref text := public.dm_pref(other, 'dm', 'amigos');
begin
  if me is null or other is null or me = other then return 'fechado'; end if;
  if public.blocked_between(me, other) then return 'bloqueado'; end if;
  select * into t from dm_threads where a = least(me, other) and b = greatest(me, other);
  if found and t.requested_by is null then return 'ok'; end if;
  if found and t.requested_by = me then return 'aguardando'; end if;
  if found and t.requested_by = other then return 'ok'; end if; -- responder aceita
  if pref = 'ninguem' then return 'fechado'; end if;
  if pref = 'todos'
     or (pref = 'amigos' and public.are_friends(me, other))
     or (pref = 'seguindo' and exists (select 1 from follows where follower = other and followed = me)) then return 'ok'; end if;
  return 'pedido';
end; $$;

create or replace function public.dm_member(p_thread uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from dm_threads where id = p_thread and auth.uid() in (a, b));
$$;

create or replace function public.dm_other(t public.dm_threads) returns uuid
language sql stable as $$ select case when t.a = auth.uid() then t.b else t.a end; $$;

create or replace function public.dm_msg_json(m public.dm_messages) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', m.id, 'author', m.author, 'mine', m.author = auth.uid(),
    'body', case when m.deleted_at is not null or (m.mod_hidden and m.author <> auth.uid()) then '' else m.body end,
    'deleted', m.deleted_at is not null, 'hidden', m.mod_hidden,
    'at', m.created_at, 'editedAt', m.edited_at,
    'game', (select jsonb_build_object('id', g.id, 'slug', g.slug, 'title', g.title, 'cover', g.cover, 'year', g.year) from games g where g.id = m.game_id and m.deleted_at is null),
    'replyTo', (select jsonb_build_object('id', r.id, 'mine', r.author = auth.uid(), 'body', case when r.deleted_at is not null then '' else left(r.body, 160) end, 'deleted', r.deleted_at is not null)
                from dm_messages r where r.id = m.reply_to));
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Leitura
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.dm_list() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by (x ->> 'lastAt') desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', t.id,
      'person', public.person_json(public.dm_other(t)),
      'lastAt', t.last_at,
      'pending', case when t.requested_by is null then null when t.requested_by = auth.uid() then 'enviado' else 'recebido' end,
      'muted', coalesce(s.muted, false),
      'blocked', public.blocked_between(auth.uid(), public.dm_other(t)),
      'unread', (select count(*) from dm_messages m where m.thread_id = t.id and m.author <> auth.uid() and m.deleted_at is null and not m.mod_hidden
                   and m.created_at > coalesce(s.last_read_at, 'epoch') and m.created_at > coalesce(s.cleared_at, 'epoch')),
      'last', (select jsonb_build_object('body', case when m.deleted_at is not null then '' else left(m.body, 140) end, 'deleted', m.deleted_at is not null,
                                         'mine', m.author = auth.uid(), 'game', (select g.title from games g where g.id = m.game_id), 'at', m.created_at)
               from dm_messages m where m.thread_id = t.id and (not m.mod_hidden or m.author = auth.uid()) and m.created_at > coalesce(s.cleared_at, 'epoch')
               order by m.created_at desc limit 1)) x
    from dm_threads t left join dm_state s on s.thread_id = t.id and s.user_id = auth.uid()
    where auth.uid() in (t.a, t.b)
      -- recusado: some para quem recebeu; para quem pediu, continua "aguardando"
      and not (t.declined_at is not null and t.requested_by <> auth.uid())
      -- apagada para mim e sem nada novo depois
      and exists (select 1 from dm_messages m where m.thread_id = t.id and m.created_at > coalesce(s.cleared_at, 'epoch'))
  ) q;
$$;

-- Abre (ou prepara) a conversa com alguém pelo @: a pessoa, o que dá para fazer e as mensagens mais recentes.
create or replace function public.dm_open(p_handle text, p_before timestamptz default null, p_limit integer default 60) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); other uuid; t dm_threads%rowtype; s dm_state%rowtype; seen boolean;
begin
  if me is null then raise exception 'not_logged'; end if;
  select id into other from profiles where handle is not null and lower(handle) = lower(p_handle);
  if other is null then raise exception 'target_not_found'; end if;
  if other = me then raise exception 'dm_self'; end if;
  select * into t from dm_threads where a = least(me, other) and b = greatest(me, other);
  if found then select * into s from dm_state where thread_id = t.id and user_id = me; end if;
  seen := public.dm_pref(me, 'visto', 'true')::boolean and public.dm_pref(other, 'visto', 'true')::boolean;
  return jsonb_build_object(
    'thread', t.id,
    'person', public.person_json(other),
    'can', public.dm_can(me, other),
    'pending', case when t.id is null or t.requested_by is null then null when t.requested_by = me then 'enviado' else 'recebido' end,
    'muted', coalesce(s.muted, false),
    'seenAt', case when seen and t.id is not null then (select last_read_at from dm_state where thread_id = t.id and user_id = other) end,
    'messages', case when t.id is null then '[]'::jsonb else (
      select coalesce(jsonb_agg(public.dm_msg_json(m) order by m.created_at), '[]'::jsonb) from (
        select * from dm_messages m where m.thread_id = t.id and m.created_at > coalesce(s.cleared_at, 'epoch')
          and (p_before is null or m.created_at < p_before) and (not m.mod_hidden or m.author = me)
        order by m.created_at desc limit greatest(1, least(coalesce(p_limit, 60), 200))) m) end,
    'more', t.id is not null and (select count(*) from dm_messages m where m.thread_id = t.id and m.created_at > coalesce(s.cleared_at, 'epoch')) > coalesce(p_limit, 60));
end; $$;

create or replace function public.dm_unread() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'unread', (select count(*) from dm_threads t left join dm_state s on s.thread_id = t.id and s.user_id = auth.uid()
               where auth.uid() in (t.a, t.b) and t.requested_by is null and not coalesce(s.muted, false)
                 and not public.blocked_between(t.a, t.b)
                 and exists (select 1 from dm_messages m where m.thread_id = t.id and m.author <> auth.uid() and m.deleted_at is null and not m.mod_hidden
                              and m.created_at > coalesce(s.last_read_at, 'epoch') and m.created_at > coalesce(s.cleared_at, 'epoch'))),
    'requests', (select count(*) from dm_threads t where auth.uid() in (t.a, t.b) and t.requested_by is not null and t.requested_by <> auth.uid()
                 and t.declined_at is null and not public.blocked_between(t.a, t.b)));
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Escrita
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.dm_send(p_handle text, p_body text, p_game text default null, p_reply uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); other uuid; can text; t dm_threads%rowtype; v_body text := left(trim(coalesce(p_body, '')), 4000); m dm_messages%rowtype; n integer; me_p profiles%rowtype;
begin
  if me is null then raise exception 'not_logged'; end if;
  select * into me_p from profiles where id = me;
  if me_p.handle is null then raise exception 'dm_need_handle'; end if;
  if me_p.suspended_until is not null and me_p.suspended_until > now() then raise exception 'dm_suspended'; end if;
  if v_body = '' and p_game is null then raise exception 'dm_empty'; end if;
  select id into other from profiles where handle is not null and lower(handle) = lower(p_handle);
  if other is null then raise exception 'target_not_found'; end if;
  can := public.dm_can(me, other);
  if can = 'bloqueado' then raise exception 'dm_blocked'; end if;
  if can = 'fechado' then raise exception 'dm_closed'; end if;
  if can = 'aguardando' then raise exception 'dm_waiting'; end if;
  select count(*) into n from dm_messages where author = me and created_at > now() - interval '1 minute';
  if n >= 30 then raise exception 'dm_rate'; end if;
  select * into t from dm_threads where a = least(me, other) and b = greatest(me, other);
  if can = 'pedido' then
    -- Pedido para quem ainda não liberou: limites e palavras proibidas.
    select count(*) into n from dm_threads where requested_by = me and created_at > now() - interval '1 day';
    if (me_p.created_at > now() - interval '7 days' and n >= 5) or n >= 20 then raise exception 'dm_request_limit'; end if;
    if public.has_bad_term(v_body) then raise exception 'bad_term'; end if;
    insert into dm_threads (a, b, requested_by) values (least(me, other), greatest(me, other), me)
    on conflict (a, b) do update set requested_by = me, declined_at = null, last_at = now() returning * into t;
  elsif t.id is null then
    insert into dm_threads (a, b) values (least(me, other), greatest(me, other)) returning * into t;
  elsif t.requested_by = other then
    update dm_threads set requested_by = null, declined_at = null where id = t.id returning * into t; -- responder aceita
  end if;
  if p_reply is not null and not exists (select 1 from dm_messages where id = p_reply and thread_id = t.id) then p_reply := null; end if;
  if p_game is not null and not exists (select 1 from games where id = p_game) then p_game := null; end if;
  insert into dm_messages (thread_id, author, body, game_id, reply_to) values (t.id, me, v_body, p_game, p_reply) returning * into m;
  update dm_threads set last_at = m.created_at where id = t.id;
  insert into dm_state (thread_id, user_id, last_read_at) values (t.id, me, m.created_at)
  on conflict (thread_id, user_id) do update set last_read_at = greatest(dm_state.last_read_at, m.created_at);
  return public.dm_msg_json(m);
end; $$;

create or replace function public.dm_read(p_thread uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.dm_member(p_thread) then raise exception 'not_found'; end if;
  insert into dm_state (thread_id, user_id, last_read_at) values (p_thread, auth.uid(), now())
  on conflict (thread_id, user_id) do update set last_read_at = now();
end; $$;

create or replace function public.dm_edit(p_id uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m dm_messages%rowtype; v_body text := left(trim(coalesce(p_body, '')), 4000);
begin
  select * into m from dm_messages where id = p_id and author = auth.uid() and deleted_at is null;
  if not found then raise exception 'not_found'; end if;
  if m.created_at < now() - interval '15 minutes' then raise exception 'dm_edit_late'; end if;
  if v_body = '' then raise exception 'dm_empty'; end if;
  update dm_messages set body = v_body, edited_at = now() where id = p_id returning * into m;
  return public.dm_msg_json(m);
end; $$;

create or replace function public.dm_delete(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update dm_messages set deleted_at = now(), body = '', game_id = null where id = p_id and author = auth.uid() and deleted_at is null;
  if not found then raise exception 'not_found'; end if;
end; $$;

-- Pedido: aceitar libera a conversa; recusar some para quem recebeu, sem avisar quem pediu.
create or replace function public.dm_answer(p_thread uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_accept then
    update dm_threads set requested_by = null, declined_at = null where id = p_thread and auth.uid() in (a, b) and requested_by is not null and requested_by <> auth.uid();
  else
    update dm_threads set declined_at = now() where id = p_thread and auth.uid() in (a, b) and requested_by is not null and requested_by <> auth.uid();
  end if;
  if not found then raise exception 'not_found'; end if;
end; $$;

create or replace function public.dm_set(p_thread uuid, p_muted boolean default null, p_clear boolean default false) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.dm_member(p_thread) then raise exception 'not_found'; end if;
  insert into dm_state (thread_id, user_id, muted, cleared_at, last_read_at)
  values (p_thread, auth.uid(), coalesce(p_muted, false), case when p_clear then now() end, now())
  on conflict (thread_id, user_id) do update set
    muted = coalesce(p_muted, dm_state.muted),
    cleared_at = case when p_clear then now() else dm_state.cleared_at end;
end; $$;

-- "Baixar tudo": as mensagens que a pessoa escreveu (o texto dos outros não sai na exportação de ninguém).
create or replace function public.dm_export() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('to', (select handle from profiles where id = public.dm_other(t)), 'at', m.created_at, 'text', m.body,
                                                'game', (select title from games where id = m.game_id)) order by m.created_at), '[]'::jsonb)
  from dm_messages m join dm_threads t on t.id = m.thread_id where m.author = auth.uid() and m.deleted_at is null;
$$;


-- ---------------------------------------------------------------------------------------------------------------
-- Denúncia de mensagem (a fila do Studio ganha o tipo 'mensagem'; as funções abaixo são as da 0031 com ele)
-- ---------------------------------------------------------------------------------------------------------------
alter table public.content_reports drop constraint if exists content_reports_kind_check;
alter table public.content_reports add constraint content_reports_kind_check
  check (kind in ('perfil', 'jornada', 'vitrine', 'momento', 'museu', 'comunidade', 'postagem', 'resposta', 'clube', 'jogatina', 'mensagem'));

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
  end if;
  return out;
end; $$;

create or replace function public.report_content(p_kind text, p_handle text, p_ref text, p_reason text, p_note text) returns text
language plpgsql security definer set search_path = public as $$
declare owner_id uuid; snap jsonb; n integer; r text := coalesce(p_ref, ''); v_note text := nullif(left(trim(coalesce(p_note, '')), 500), '');
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if p_kind not in ('perfil', 'jornada', 'vitrine', 'momento', 'museu', 'comunidade', 'postagem', 'resposta', 'clube', 'jogatina', 'mensagem') then raise exception 'report_kind'; end if;
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
revoke all on function public.dm_pref(uuid, text, text) from public, anon, authenticated;
revoke all on function public.dm_can(uuid, uuid) from public, anon, authenticated;
revoke all on function public.dm_member(uuid) from public, anon, authenticated;
revoke all on function public.dm_msg_json(public.dm_messages) from public, anon, authenticated;
revoke all on function public.dm_list() from public, anon;
revoke all on function public.dm_open(text, timestamptz, integer) from public, anon;
revoke all on function public.dm_unread() from public, anon;
revoke all on function public.dm_send(text, text, text, uuid) from public, anon;
revoke all on function public.dm_read(uuid) from public, anon;
revoke all on function public.dm_edit(uuid, text) from public, anon;
revoke all on function public.dm_delete(uuid) from public, anon;
revoke all on function public.dm_answer(uuid, boolean) from public, anon;
revoke all on function public.dm_set(uuid, boolean, boolean) from public, anon;
revoke all on function public.dm_export() from public, anon;
grant execute on function public.dm_list() to authenticated;
grant execute on function public.dm_open(text, timestamptz, integer) to authenticated;
grant execute on function public.dm_unread() to authenticated;
grant execute on function public.dm_send(text, text, text, uuid) to authenticated;
grant execute on function public.dm_read(uuid) to authenticated;
grant execute on function public.dm_edit(uuid, text) to authenticated;
grant execute on function public.dm_delete(uuid) to authenticated;
grant execute on function public.dm_answer(uuid, boolean) to authenticated;
grant execute on function public.dm_set(uuid, boolean, boolean) to authenticated;
grant execute on function public.dm_export() to authenticated;
