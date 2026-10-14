-- Etapa 6 · Moderação e regras
-- Regras da comunidade (aceite), denúncias, bloquear e silenciar, @ e bio protegidos, fila de moderação com histórico
-- (e desfazer), avisos para a pessoa e limites contra spam.
--
-- O que é público hoje: perfil (@, bio, foto e capa), Jornadas mostradas no perfil, fotos dos momentos, vitrines e Museu.
-- Ocultar pela moderação não apaga nada: o conteúdo sai do perfil público e continua no diário da pessoa.
-- Rodar uma vez, no SQL Editor do Supabase.

-- ---------------------------------------------------------------------------------------------------------------
-- Colunas novas
-- ---------------------------------------------------------------------------------------------------------------
alter table public.profiles add column if not exists rules_accepted_at timestamptz;
alter table public.profiles add column if not exists suspended_until timestamptz;
alter table public.profiles add column if not exists mod jsonb not null default '{}'::jsonb;
alter table public.journeys add column if not exists mod_hidden boolean not null default false;
alter table public.showcases add column if not exists mod_hidden boolean not null default false;
alter table public.timeline_events add column if not exists mod_hidden boolean not null default false;

-- ---------------------------------------------------------------------------------------------------------------
-- Tabelas (só o servidor e as funções abaixo mexem nelas)
-- ---------------------------------------------------------------------------------------------------------------
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references auth.users (id) on delete cascade,
  owner uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('perfil', 'jornada', 'vitrine', 'momento', 'museu')),
  ref text not null default '',
  reason text not null check (reason in ('ofensa', 'spoiler', 'spam', 'improprio', 'outro')),
  note text check (note is null or char_length(note) <= 500),
  snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'aberta' check (status in ('aberta', 'resolvida', 'arquivada')),
  action text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists content_reports_one_open on public.content_reports (reporter, owner, kind, ref) where status = 'aberta';
create index if not exists content_reports_open on public.content_reports (status, created_at desc);
create index if not exists content_reports_reporter on public.content_reports (reporter, created_at desc);

create table if not exists public.moderation_log (
  id uuid primary key default gen_random_uuid(),
  admin uuid,
  owner uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  ref text not null default '',
  action text not null,
  before jsonb not null default '{}'::jsonb,
  message text,
  until timestamptz,
  reports integer not null default 0,
  created_at timestamptz not null default now(),
  undone_at timestamptz
);
create index if not exists moderation_log_recent on public.moderation_log (created_at desc);

create table if not exists public.user_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_id uuid references public.moderation_log (id) on delete set null,
  kind text not null,
  text text not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
create index if not exists user_notices_user on public.user_notices (user_id, created_at desc);

create table if not exists public.user_blocks (
  blocker uuid not null references auth.users (id) on delete cascade,
  blocked uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('bloquear', 'silenciar')),
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

create table if not exists public.handle_changes (
  user_id uuid not null references auth.users (id) on delete cascade,
  old_handle text,
  new_handle text,
  at timestamptz not null default now()
);
create index if not exists handle_changes_user on public.handle_changes (user_id, at desc);

create table if not exists public.public_acts (
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists public_acts_user on public.public_acts (user_id, at desc);

-- Palavras que não entram no @ nem na bio. exato: a palavra sozinha (ou no plural); prefixo: palavras que começam com ela;
-- contem: em qualquer lugar. Para acrescentar: insert into public.blocked_terms values ('palavra', 'exato');
create table if not exists public.blocked_terms (
  term text primary key check (term ~ '^[a-z]+$'),
  mode text not null default 'exato' check (mode in ('exato', 'prefixo', 'contem'))
);
insert into public.blocked_terms (term, mode) values
  ('caralh', 'contem'), ('buceta', 'contem'), ('boceta', 'contem'), ('arrombad', 'contem'), ('xoxota', 'contem'), ('putaria', 'contem'),
  ('piroca', 'contem'), ('punheta', 'contem'), ('siririca', 'contem'), ('fuck', 'contem'), ('nigger', 'contem'), ('nigga', 'contem'),
  ('faggot', 'contem'), ('cunt', 'contem'), ('estupr', 'contem'), ('pedofil', 'contem'), ('hitler', 'contem'),
  ('fodid', 'prefixo'), ('foder', 'prefixo'), ('fodase', 'prefixo'), ('vagabund', 'prefixo'), ('retardad', 'prefixo'), ('traveco', 'prefixo'),
  ('cuzao', 'prefixo'), ('whore', 'prefixo'), ('slut', 'prefixo'), ('bitch', 'prefixo'), ('retard', 'prefixo'), ('pussy', 'prefixo'),
  ('rapist', 'prefixo'), ('porn', 'prefixo'), ('nazis', 'prefixo'),
  ('puta', 'exato'), ('porra', 'exato'), ('cu', 'exato'), ('viado', 'exato'), ('viadinho', 'exato'), ('viadao', 'exato'), ('bicha', 'exato'),
  ('corno', 'exato'), ('xota', 'exato'), ('vadia', 'exato'), ('fag', 'exato'), ('shit', 'exato'), ('rape', 'exato'), ('xxx', 'exato'),
  ('pedo', 'exato'), ('nazi', 'exato')
on conflict (term) do nothing;

alter table public.content_reports enable row level security;
alter table public.moderation_log enable row level security;
alter table public.user_notices enable row level security;
alter table public.user_blocks enable row level security;
alter table public.handle_changes enable row level security;
alter table public.public_acts enable row level security;
alter table public.blocked_terms enable row level security;
revoke all on public.content_reports, public.moderation_log, public.user_notices, public.user_blocks,
              public.handle_changes, public.public_acts, public.blocked_terms from anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Textos: palavras proibidas e endereços reservados
-- ---------------------------------------------------------------------------------------------------------------
-- Minúsculas, sem acento, e os números que imitam letras (0 → o, 1 → i, 3 → e, 4 → a, 5 → s, 7 → t, @ → a, $ → s).
create or replace function public.norm_text(t text) returns text
language sql immutable as $$
  select translate(lower(coalesce(t, '')), 'áàâãäéèêëíìîïóòôõöúùûüçñ013457@$', 'aaaaaeeeeiiiiooooouuuucnoieastas');
$$;

-- p_squash: junta tudo antes de procurar os termos "contem" (para o @, que não tem espaço).
create or replace function public.has_bad_term(t text, p_squash boolean default false) returns boolean
language sql stable security definer set search_path = public as $$
  with s as (select public.norm_text(t) v),
  toks as (select x from s, regexp_split_to_table(s.v, '[^a-z]+') x where x <> '')
  select exists (
    select 1 from blocked_terms b
    where (b.mode = 'contem' and (
             (p_squash and (select regexp_replace(v, '[^a-z]', '', 'g') from s) like '%' || b.term || '%')
             or exists (select 1 from toks where toks.x like '%' || b.term || '%')))
       or exists (select 1 from toks where toks.x in (b.term, b.term || 's', b.term || 'es')
                                        or (b.mode = 'prefixo' and toks.x like b.term || '%')));
$$;

create or replace function public.handle_is_reserved(h text) returns boolean
language sql immutable as $$
  select lower(h) in ('admin', 'administrador', 'administracao', 'winnerz', 'jornada', 'colecao', 'jogos', 'eventos', 'comunidade',
                      'preferencias', 'entrar', 'privacidade', 'sessao', 'overlay', 'api', 'studio', 'convite', 'regras', 'sobre',
                      'boas_vindas', 'boasvindas', 'ajuda', 'suporte', 'oficial', 'equipe', 'sistema', 'root', 'null', 'undefined',
                      'www', 'awards', 'moderacao', 'moderador', 'moderadora', 'staff', 'iamiguinho')
      or lower(h) like 'winnerz%'
      or lower(h) ~ '(admin|moderad|moderac|suporte|staff)';
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Proteções nas tabelas: só a moderação mexe nos campos de moderação
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.note_public_act() returns void
language plpgsql security definer set search_path = public as $$
declare age interval; n integer;
begin
  if auth.uid() is null or public.is_admin() then return; end if;
  select now() - created_at into age from profiles where id = auth.uid();
  if age is not null and age < interval '7 days' then
    select count(*) into n from public_acts where user_id = auth.uid() and at > now() - interval '1 hour';
    if n >= 20 then raise exception 'public_limit'; end if;
  end if;
  delete from public_acts where user_id = auth.uid() and at < now() - interval '1 day';
  insert into public_acts (user_id) values (auth.uid());
end; $$;

create or replace function public.keep_mod_hidden() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_admin() then new.mod_hidden := false; end if;
  elsif not public.is_admin() then
    new.mod_hidden := old.mod_hidden;
  end if;
  if tg_table_name in ('journeys', 'showcases') then
    if new.mod_hidden then new.shared := false; end if;
    if new.shared and (tg_op = 'INSERT' or not old.shared) then perform public.note_public_act(); end if;
  end if;
  return new;
end; $$;

drop trigger if exists journeys_keep_mod on public.journeys;
create trigger journeys_keep_mod before insert or update on public.journeys for each row execute function public.keep_mod_hidden();
drop trigger if exists showcases_keep_mod on public.showcases;
create trigger showcases_keep_mod before insert or update on public.showcases for each row execute function public.keep_mod_hidden();
drop trigger if exists events_keep_mod on public.timeline_events;
create trigger events_keep_mod before insert or update on public.timeline_events for each row execute function public.keep_mod_hidden();

create or replace function public.keep_mod_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.suspended_until := old.suspended_until;
    new.mod := old.mod;
  end if;
  if coalesce((new.mod ->> 'museu')::boolean, false) and coalesce((new.museum ->> 'shared')::boolean, false) then
    new.museum := new.museum || '{"shared": false}'::jsonb;
  end if;
  return new;
end; $$;
drop trigger if exists profiles_keep_mod on public.profiles;
create trigger profiles_keep_mod before update on public.profiles for each row execute function public.keep_mod_fields();

-- ---------------------------------------------------------------------------------------------------------------
-- Quem pode ver um perfil: fora do ar durante a suspensão, e fechado para quem a pessoa bloqueou
-- (a própria pessoa e a administração sempre veem)
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.profile_open(p public.profiles) returns boolean
language sql stable security definer set search_path = public as $$
  select p.id = auth.uid() or public.is_admin() or (
    (p.suspended_until is null or p.suspended_until <= now())
    and not exists (select 1 from user_blocks b where b.blocker = p.id and b.blocked = auth.uid() and b.kind = 'bloquear'));
$$;

-- O servidor (api/perfil) chama as funções públicas com a chave secreta; ele pergunta à parte se quem pediu foi bloqueado.
create or replace function public.viewer_blocked(p_handle text, p_viewer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p join user_blocks b on b.blocker = p.id
                 where p.handle is not null and lower(p.handle) = lower(p_handle) and b.blocked = p_viewer and b.kind = 'bloquear');
$$;

-- public_profile vira a porta de entrada: confere a suspensão e o bloqueio antes de montar o perfil
-- (as versões 2, 3 e 4 começam chamando esta).
do $$ begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'public_profile_base') then
    alter function public.public_profile(text, text) rename to public_profile_base;
  end if;
end $$;

create or replace function public.public_profile(p_handle text, p_key text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles%rowtype;
begin
  select * into p from profiles where handle is not null and lower(handle) = lower(p_handle);
  if not found or not public.profile_open(p) then return null; end if;
  return public.public_profile_base(p_handle, p_key);
end; $$;

create or replace function public.public_profile_v4(p_handle text, p_key text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles%rowtype; out jsonb;
begin
  out := public.public_profile_v3(p_handle, p_key);
  if out is null then return null; end if;
  select * into p from profiles where handle is not null and lower(handle) = lower(p_handle);
  out := out || jsonb_build_object('stage', public.public_stage(p), 'avatar', p.avatar);
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

create or replace function public.public_journey(p_handle text, p_key text, p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles%rowtype; j journeys%rowtype; g games%rowtype;
begin
  select * into p from profiles where handle is not null and lower(handle) = lower(p_handle);
  if not found or not public.profile_open(p) or not public.can_see_journey(p, p_key) then return null; end if;
  select gg.* into g from games gg where gg.slug = p_slug;
  if not found then return null; end if;
  select * into j from journeys where user_id = p.id and game_id = g.id and shared and not mod_hidden;
  if not found then return null; end if;
  return jsonb_build_object(
    'name', p.display_name, 'handle', p.handle,
    'game', jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover, 'backdrop', g.backdrop, 'year', g.year, 'developer', g.developer),
    'histories', coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'ordinal', h.ordinal, 'title', h.title, 'state', h.state,
        'startedAt', h.started_at, 'startedPrecision', h.started_precision, 'completedAt', h.completed_at, 'completedPrecision', h.completed_precision,
        'progress', h.progress) order by h.ordinal) from histories h where h.journey_id = j.id), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'historyId', e.history_id, 'kind', e.kind, 'at', e.at, 'dateLabel', e.date_label,
        'title', case when e.kind = 'sessao' then 'Sessão' else e.title end,
        'text', case when e.kind in ('momento', 'marco', 'inicio') then e.text end,
        'quote', case when e.kind = 'momento' then e.quote end,
        'imagePath', case when e.kind in ('momento', 'marco', 'inicio') then e.image_path end) order by e.at)
      from timeline_events e where e.journey_id = j.id and not e.mod_hidden and e.kind in ('inicio', 'sessao', 'momento', 'marco')), '[]'::jsonb));
end; $$;

create or replace function public.public_collection(p_handle text, p_key text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles%rowtype;
begin
  select * into p from profiles where handle is not null and lower(handle) = lower(p_handle);
  if not found or not public.profile_open(p) or not public.can_see_collection(p, p_key) then return null; end if;
  return coalesce((select jsonb_agg(x order by x ->> 'at' desc) from (
    select jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover, 'platform', c.platform, 'year', g.year, 'at', c.created_at) x
    from copies c join games g on g.id = c.game_id
    where c.user_id = p.id and c.deleted_at is null
    order by c.created_at desc limit 5000) t), '[]'::jsonb);
end; $$;

create or replace function public.public_museum(p_handle text, p_key text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles%rowtype;
begin
  select * into p from profiles where handle is not null and lower(handle) = lower(p_handle);
  if not found or not public.profile_open(p) or not public.can_see_collection(p, p_key) or not coalesce((p.museum ->> 'shared')::boolean, false) then return null; end if;
  return jsonb_build_object(
    'name', p.display_name, 'handle', p.handle,
    'title', nullif(p.museum ->> 'title', ''), 'intro', nullif(p.museum ->> 'intro', ''),
    'rooms', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title, 'text', r.text, 'pieces', coalesce((
        select jsonb_agg(x order by ord) from (
          select ord, case it ->> 't'
            when 'f' then case when (it ->> 'path') like p.id::text || '/%'
                            then jsonb_build_object('t', 'f', 'imagePath', it ->> 'path') end
            when 'm' then (select jsonb_build_object('t', 'm', 'title', e.title, 'quote', e.quote, 'imagePath', e.image_path, 'at', e.at,
                                                     'game', g.title, 'slug', g.slug, 'cover', g.cover)
                           from timeline_events e join journeys j on j.id = e.journey_id join games g on g.id = j.game_id
                           where e.id::text = it ->> 'id' and e.user_id = p.id and not e.mod_hidden and e.kind in ('momento', 'marco', 'inicio'))
            else public.public_piece(p.id, it ->> 't', it ->> 'id')
          end || jsonb_build_object('caption', nullif(it ->> 'caption', '')) x
          from jsonb_array_elements(r.pieces) with ordinality as e(it, ord)) t
        where x ? 't'), '[]'::jsonb)) order by r.position, r.created_at)
      from museum_rooms r where r.user_id = p.id), '[]'::jsonb));
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- O @ e a bio: endereços reservados, palavras proibidas e no máximo 3 trocas de @ a cada 30 dias
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.check_new_handle(h text) returns void
language plpgsql security definer set search_path = public as $$
declare cur text; n integer;
begin
  if public.is_admin() then return; end if;
  if public.handle_is_reserved(h) then raise exception 'handle_reserved'; end if;
  if public.has_bad_term(h, true) then raise exception 'handle_offensive'; end if;
  select handle into cur from profiles where id = auth.uid();
  if cur is not null and lower(cur) <> lower(h) then
    select count(*) into n from handle_changes where user_id = auth.uid() and at > now() - interval '30 days';
    if n >= 3 then raise exception 'handle_limit'; end if;
  end if;
end; $$;

create or replace function public.log_handle_change(old_h text, new_h text) returns void
language sql security definer set search_path = public as $$
  insert into handle_changes (user_id, old_handle, new_handle)
  select auth.uid(), old_h, new_h where old_h is not null and lower(old_h) <> lower(new_h);
$$;

create or replace function public.set_my_handle(p_handle text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare h text := nullif(trim(p_handle), ''); cur text;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if h is null or h !~ '^[A-Za-z0-9_]{3,24}$' then raise exception 'handle_format'; end if;
  perform public.check_new_handle(h);
  select handle into cur from profiles where id = auth.uid();
  begin
    update profiles set handle = h, display_name = h where id = auth.uid();
  exception when unique_violation then raise exception 'handle_taken';
  end;
  perform public.log_handle_change(cur, h);
  return public.my_profile();
end; $$;

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
    v := v || jsonb_build_object(k, case when p_visibility ->> k in ('link', 'publico') then p_visibility ->> k else 'privado' end);
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

create or replace function public.handle_available(p_handle text) returns boolean
language sql stable security definer set search_path = public as $$
  select (public.is_admin() or not (public.handle_is_reserved(trim(p_handle)) or public.has_bad_term(trim(p_handle), true)))
     and not exists (select 1 from profiles where handle is not null and lower(handle) = lower(trim(p_handle))
                     and id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid));
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Para a pessoa: regras, situação e avisos
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.accept_rules() returns timestamptz
language sql security definer set search_path = public as $$
  update profiles set rules_accepted_at = coalesce(rules_accepted_at, now()) where id = auth.uid() returning rules_accepted_at;
$$;

create or replace function public.my_moderation() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'rulesAcceptedAt', p.rules_accepted_at,
    'suspendedUntil', case when p.suspended_until > now() then p.suspended_until end,
    'notices', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'kind', n.kind, 'text', n.text, 'at', n.created_at) order by n.created_at desc)
                         from user_notices n where n.user_id = p.id and n.seen_at is null), '[]'::jsonb))
  from profiles p where p.id = auth.uid();
$$;

create or replace function public.ack_notice(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update user_notices set seen_at = now() where id = p_id and user_id = auth.uid() and seen_at is null;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Denunciar
-- ---------------------------------------------------------------------------------------------------------------
-- O que o alvo mostra agora (ou null se não existe). Serve para a denúncia guardar o que a pessoa viu e para a fila.
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
  end if;
  return out;
end; $$;

create or replace function public.report_content(p_kind text, p_handle text, p_ref text, p_reason text, p_note text) returns text
language plpgsql security definer set search_path = public as $$
declare owner_id uuid; snap jsonb; n integer; r text := coalesce(p_ref, ''); v_note text := nullif(left(trim(coalesce(p_note, '')), 500), '');
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if p_kind not in ('perfil', 'jornada', 'vitrine', 'momento', 'museu') then raise exception 'report_kind'; end if;
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

-- ---------------------------------------------------------------------------------------------------------------
-- Bloquear e silenciar
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.block_user(p_handle text, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if p_kind not in ('bloquear', 'silenciar') then raise exception 'block_kind'; end if;
  select id into t from profiles where handle is not null and lower(handle) = lower(p_handle);
  if t is null then raise exception 'target_not_found'; end if;
  if t = auth.uid() then raise exception 'block_self'; end if;
  insert into user_blocks (blocker, blocked, kind) values (auth.uid(), t, p_kind)
  on conflict (blocker, blocked) do update set kind = excluded.kind, created_at = now();
end; $$;

create or replace function public.unblock_user(p_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from user_blocks where blocker = auth.uid() and blocked = p_id;
$$;

create or replace function public.my_blocks() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', b.blocked, 'handle', p.handle, 'avatar', p.avatar, 'kind', b.kind, 'at', b.created_at) order by b.created_at desc), '[]'::jsonb)
  from user_blocks b join profiles p on p.id = b.blocked where b.blocker = auth.uid();
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Moderação (só a administração)
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.moderation_queue() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return coalesce((select jsonb_agg(x order by x ->> 'lastAt' desc) from (
    select jsonb_build_object('kind', r.kind, 'ref', r.ref, 'owner', r.owner, 'handle', p.handle,
      'count', count(*), 'reasons', jsonb_agg(distinct r.reason),
      'notes', coalesce(jsonb_agg(r.note order by r.created_at desc) filter (where r.note is not null), '[]'::jsonb),
      'firstAt', min(r.created_at), 'lastAt', max(r.created_at),
      'snapshot', (array_agg(r.snapshot order by r.created_at desc))[1],
      'now', public.target_snapshot(r.kind, r.owner, r.ref),
      'history', (select count(*) from moderation_log l where l.owner = r.owner and l.undone_at is null and l.action <> 'arquivar'),
      'suspendedUntil', case when p.suspended_until > now() then p.suspended_until end) x
    from content_reports r join profiles p on p.id = r.owner
    where r.status = 'aberta'
    group by r.kind, r.ref, r.owner, p.handle, p.suspended_until) t), '[]'::jsonb);
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

create or replace function public.moderation_log_list(p_limit integer default 100) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return coalesce((select jsonb_agg(x order by x ->> 'at' desc) from (
    select jsonb_build_object('id', l.id, 'kind', l.kind, 'ref', l.ref, 'action', l.action, 'message', l.message, 'until', l.until,
      'reports', l.reports, 'at', l.created_at, 'undoneAt', l.undone_at, 'owner', l.owner,
      'handle', coalesce(p.handle, l.before ->> 'handle'), 'by', a.handle, 'before', l.before) x
    from moderation_log l left join profiles p on p.id = l.owner left join profiles a on a.id = l.admin
    order by l.created_at desc limit greatest(1, least(coalesce(p_limit, 100), 500))) t), '[]'::jsonb);
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------------------------------------------
revoke all on function public.norm_text(text) from public, anon, authenticated;
revoke all on function public.has_bad_term(text, boolean) from public, anon, authenticated;
revoke all on function public.handle_is_reserved(text) from public, anon, authenticated;
revoke all on function public.note_public_act() from public, anon, authenticated;
revoke all on function public.profile_open(public.profiles) from public, anon, authenticated;
revoke all on function public.public_profile_base(text, text) from public, anon, authenticated;
revoke all on function public.check_new_handle(text) from public, anon, authenticated;
revoke all on function public.log_handle_change(text, text) from public, anon, authenticated;
revoke all on function public.target_snapshot(text, uuid, text) from public, anon, authenticated;
revoke all on function public.viewer_blocked(text, uuid) from public, anon, authenticated;
grant execute on function public.viewer_blocked(text, uuid) to service_role;

grant execute on function public.public_profile(text, text) to anon, authenticated;
grant execute on function public.public_profile_v4(text, text) to anon, authenticated;
grant execute on function public.public_journey(text, text, text) to anon, authenticated;
grant execute on function public.public_collection(text, text) to anon, authenticated;
grant execute on function public.public_museum(text, text) to anon, authenticated;

revoke all on function public.set_my_handle(text) from public, anon;
revoke all on function public.set_my_profile(text, text, jsonb) from public, anon;
revoke all on function public.handle_available(text) from public, anon;
grant execute on function public.set_my_handle(text) to authenticated;
grant execute on function public.set_my_profile(text, text, jsonb) to authenticated;
grant execute on function public.handle_available(text) to authenticated;

revoke all on function public.accept_rules() from public, anon;
revoke all on function public.my_moderation() from public, anon;
revoke all on function public.ack_notice(uuid) from public, anon;
revoke all on function public.report_content(text, text, text, text, text) from public, anon;
revoke all on function public.block_user(text, text) from public, anon;
revoke all on function public.unblock_user(uuid) from public, anon;
revoke all on function public.my_blocks() from public, anon;
revoke all on function public.moderation_queue() from public, anon;
revoke all on function public.moderation_act(text, uuid, text, text, text, integer) from public, anon;
revoke all on function public.moderation_undo(uuid) from public, anon;
revoke all on function public.moderation_log_list(integer) from public, anon;
grant execute on function public.accept_rules() to authenticated;
grant execute on function public.my_moderation() to authenticated;
grant execute on function public.ack_notice(uuid) to authenticated;
grant execute on function public.report_content(text, text, text, text, text) to authenticated;
grant execute on function public.block_user(text, text) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.my_blocks() to authenticated;
grant execute on function public.moderation_queue() to authenticated;
grant execute on function public.moderation_act(text, uuid, text, text, text, integer) to authenticated;
grant execute on function public.moderation_undo(uuid) to authenticated;
grant execute on function public.moderation_log_list(integer) to authenticated;
