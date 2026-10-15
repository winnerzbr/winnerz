-- Etapa 6 · Comunidade reorganizada, entrega B: a Praça
--  1. Postar direto na Praça: comunidade e título opcionais; postagens novas de Enquete e Aquisição ("chegou na coleção").
--  2. Caminhos da Praça (Para você, Amigos, Seguindo, Discussões, Salvos, Novos por aqui), cada postagem com o motivo.
--     Para você mostra também o resto da Praça (de quem a pessoa ainda não segue) e as postagens dela, dizendo de onde veio.
--  3. Salvar e acompanhar conversas; quantas respostas novas desde a última visita ("continuar de onde parei").
--  4. Boa conversa para entrar, conversas que continuam e quem chegou agora (só quem topou aparecer).
--  5. O jogo da conversa ao lado do nome ("jogando", "zerou"), só para quem ligou nas Preferências.
--  6. Avisos por tipo (respostas, menções, conversas acompanhadas, clubes), escolhidos nas Preferências.
-- As escolhas da pessoa ficam em profiles.prefs -> 'comunidade' (o site já guarda as Preferências ali).
-- Precisa da 0029. Rodar uma vez, no SQL Editor do Supabase (pode rodar de novo sem problema).

-- ---------------------------------------------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------------------------------------------
alter table public.posts drop constraint if exists posts_kind_check;
alter table public.posts add constraint posts_kind_check
  check (kind in ('discussao', 'pergunta', 'dica', 'colecao', 'clipe', 'enquete', 'aquisicao'));
-- Postagem da Praça: sem comunidade e sem clube. Título opcional em todas.
alter table public.posts drop constraint if exists posts_place_check;
alter table public.posts drop constraint if exists posts_title_needed;
create index if not exists posts_praca on public.posts (created_at desc) where community_id is null and club_id is null;

create table if not exists public.post_polls (
  post_id uuid primary key references public.posts (id) on delete cascade,
  options text[] not null check (cardinality(options) between 2 and 6)
);
create table if not exists public.poll_votes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  option smallint not null check (option between 0 and 5),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table if not exists public.post_saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create table if not exists public.post_follows (
  user_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists post_follows_post on public.post_follows (post_id);
create table if not exists public.post_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
alter table public.post_polls enable row level security;
alter table public.poll_votes enable row level security;
alter table public.post_saves enable row level security;
alter table public.post_follows enable row level security;
alter table public.post_reads enable row level security;
revoke all on public.post_polls, public.poll_votes, public.post_saves, public.post_follows, public.post_reads from anon, authenticated;

-- Quem escreveu acompanha a própria conversa (dá para deixar de acompanhar); quem respondeu também.
insert into public.post_follows (user_id, post_id, created_at)
select author, id, created_at from public.posts where author is not null and club_id is null and deleted_at is null
on conflict do nothing;
insert into public.post_follows (user_id, post_id, created_at)
select distinct on (r.author, r.post_id) r.author, r.post_id, r.created_at from public.replies r join public.posts p on p.id = r.post_id
where r.author is not null and p.club_id is null and r.deleted_at is null
on conflict do nothing;

-- ---------------------------------------------------------------------------------------------------------------
-- Peças comuns
-- ---------------------------------------------------------------------------------------------------------------
-- Uma escolha da comunidade nas Preferências (profiles.prefs -> 'comunidade').
create or replace function public.cm_pref(p public.profiles, p_key text, p_default boolean) returns boolean
language sql stable as $$
  select coalesce((p.prefs -> 'comunidade' ->> p_key)::boolean, p_default);
$$;

-- Pessoa nas listas: "novo por aqui" só aparece para quem topou (e por 3 semanas).
create or replace function public.person_json(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', p.id, 'handle', p.handle, 'avatar', p.avatar, 'admin', p.is_admin,
    'novo', public.cm_pref(p, 'novos', false) and p.created_at > now() - interval '21 days')
  from profiles p where p.id = p_id;
$$;

-- "Jogando" ou "zerou" o jogo da conversa, ao lado do nome. Só para quem ligou nas Preferências.
create or replace function public.author_ctx(p_user uuid, p_game text) returns text
language sql stable security definer set search_path = public as $$
  select case when bool_or(h.state = 'concluida') then 'zerou' else 'jogando' end
  from profiles pr join journeys j on j.user_id = pr.id and j.game_id = p_game and not j.mod_hidden
  left join histories h on h.journey_id = j.id
  where pr.id = p_user and p_game is not null and public.cm_pref(pr, 'jogo', false)
  group by pr.id;
$$;

create or replace function public.poll_json(p_post uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'options', (select jsonb_agg(jsonb_build_object('text', o.t, 'votes', (select count(*) from poll_votes v where v.post_id = p_post and v.option = o.i - 1)) order by o.i)
                from unnest(pl.options) with ordinality o(t, i)),
    'total', (select count(*) from poll_votes v where v.post_id = p_post),
    'mine', (select v.option from poll_votes v where v.post_id = p_post and v.user_id = auth.uid()))
  from post_polls pl where pl.post_id = p_post;
$$;

create or replace function public.post_json(p public.posts, p_full boolean) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', p.id, 'kind', p.kind, 'title', p.title,
    'body', case when p_full then p.body else left(p.body, 280) end,
    'game', public.game_json(p.game_id), 'spoiler', p.spoiler, 'spoilerNote', p.spoiler_note,
    'images', to_jsonb(case when p_full then p.images else p.images[1:1] end), 'imageCount', cardinality(p.images),
    'clip', p.clip, 'pinned', p.pinned, 'answerId', p.answer_id,
    'createdAt', p.created_at, 'editedAt', p.edited_at, 'hidden', p.mod_hidden,
    'author', public.person_json(p.author), 'authorCtx', public.author_ctx(p.author, p.game_id),
    'community', (select jsonb_build_object('slug', c.slug, 'name', c.name, 'official', c.official) from communities c where c.id = p.community_id),
    'replies', (select count(*) from replies r where r.post_id = p.id and public.content_open(r.author, r.mod_hidden, r.deleted_at)),
    'lastReplyAt', (select max(r.created_at) from replies r where r.post_id = p.id and r.deleted_at is null and not r.mod_hidden),
    'reactions', public.reaction_json('post', p.id),
    'poll', case when p.kind = 'enquete' then public.poll_json(p.id) end,
    'saved', exists (select 1 from post_saves s where s.post_id = p.id and s.user_id = auth.uid()),
    'following', exists (select 1 from post_follows f where f.post_id = p.id and f.user_id = auth.uid()),
    'readAt', (select x.read_at from post_reads x where x.post_id = p.id and x.user_id = auth.uid()),
    'unread', (select count(*) from replies r join post_reads x on x.post_id = r.post_id and x.user_id = auth.uid()
               where r.post_id = p.id and r.created_at > x.read_at and r.author is distinct from auth.uid() and r.deleted_at is null and not r.mod_hidden));
$$;

-- Postagem que aparece na Praça: de comunidade aberta ou da própria Praça (as de clube ficam no clube).
create or replace function public.praca_open(p public.posts) returns boolean
language sql stable security definer set search_path = public as $$
  select p.club_id is null and public.content_open(p.author, p.mod_hidden, p.deleted_at)
     and (p.community_id is null or exists (select 1 from communities c where c.id = p.community_id and public.community_open(c) and not c.mod_hidden));
$$;

-- Título para avisos e listas, quando a postagem não tem título.
create or replace function public.post_label(p public.posts) returns text
language sql immutable as $$
  select coalesce(p.title, nullif(left(regexp_replace(regexp_replace(p.body, '\|\|.*?\|\|', '[spoiler]', 'g'), '\s+', ' ', 'g'), 80), ''), 'Postagem');
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Escrever: na Praça ou numa comunidade, com título opcional, enquete e aquisição
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.clean_poll(p_poll jsonb) returns text[]
language plpgsql immutable as $$
declare out text[] := '{}'; x text;
begin
  if p_poll is null or jsonb_typeof(p_poll) <> 'array' then raise exception 'poll_invalid'; end if;
  for x in select trim(v) from jsonb_array_elements_text(p_poll) v loop
    if x = '' then continue; end if;
    if char_length(x) > 80 then raise exception 'poll_invalid'; end if;
    out := out || x;
  end loop;
  if cardinality(out) < 2 or cardinality(out) > 6 then raise exception 'poll_invalid'; end if;
  return out;
end; $$;

drop function if exists public.post_create(uuid, text, text, text, text, text, text, text[], text);
create or replace function public.post_create(p_community uuid, p_kind text, p_title text, p_body text, p_game text, p_spoiler text, p_spoiler_note text, p_images text[], p_clip text, p_poll jsonb default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c communities%rowtype; p posts%rowtype; n integer; v_title text := nullif(trim(coalesce(p_title, '')), ''); v_clip text; v_poll text[];
  v_note text := nullif(left(trim(coalesce(p_spoiler_note, '')), 80), ''); v_images text[];
begin
  perform public.check_can_publish();
  if p_community is not null then
    select * into c from communities where id = p_community;
    if not found or c.mod_hidden then raise exception 'target_not_found'; end if;
    if c.official and not public.is_admin() then raise exception 'official_only'; end if;
  end if;
  if p_kind not in ('discussao', 'pergunta', 'dica', 'colecao', 'clipe', 'enquete', 'aquisicao') then raise exception 'post_kind'; end if;
  if v_title is not null and (char_length(v_title) < 3 or char_length(v_title) > 140) then raise exception 'title_invalid'; end if;
  if public.has_bad_term(v_title) or public.has_bad_term(v_note) then raise exception 'title_offensive'; end if;
  if char_length(coalesce(p_body, '')) > 10000 then raise exception 'body_long'; end if;
  if p_spoiler is not null and p_spoiler not in ('inicio', 'meio', 'final') then raise exception 'post_spoiler'; end if;
  v_clip := public.clean_clip(p_clip);
  v_images := public.clean_images(p_images);
  if p_kind = 'clipe' and v_clip is null then raise exception 'clip_needed'; end if;
  if p_kind = 'enquete' then
    v_poll := public.clean_poll(p_poll);
    if v_title is null and trim(coalesce(p_body, '')) = '' then raise exception 'poll_question'; end if;
  end if;
  if p_kind = 'aquisicao' and p_game is null then raise exception 'game_needed'; end if;
  if v_title is null and trim(coalesce(p_body, '')) = '' and cardinality(v_images) = 0 and v_clip is null then raise exception 'post_empty'; end if;
  if not public.is_admin() then
    select count(*) into n from posts where author = auth.uid() and club_id is null and created_at > now() - interval '1 day';
    if n >= 20 then raise exception 'post_limit'; end if;
  end if;
  perform public.note_public_act();
  insert into posts (community_id, author, kind, title, body, game_id, spoiler, spoiler_note, images, clip)
  values (p_community, auth.uid(), p_kind, v_title, coalesce(p_body, ''), (select id from games where id = p_game),
          case when p_game is not null then p_spoiler end, case when p_game is not null and p_spoiler is not null then v_note end,
          v_images, v_clip)
  returning * into p;
  if v_poll is not null then insert into post_polls (post_id, options) values (p.id, v_poll); end if;
  insert into post_follows (user_id, post_id) values (auth.uid(), p.id) on conflict do nothing;
  return public.post_json(p, true);
end; $$;

drop function if exists public.post_edit(uuid, text, text, text, text, text, text, text[], text);
create or replace function public.post_edit(p_id uuid, p_kind text, p_title text, p_body text, p_game text, p_spoiler text, p_spoiler_note text, p_images text[], p_clip text, p_poll jsonb default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p posts%rowtype; v_title text := nullif(trim(coalesce(p_title, '')), ''); v_clip text; v_images text[];
  v_note text := nullif(left(trim(coalesce(p_spoiler_note, '')), 80), '');
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  select * into p from posts where id = p_id and deleted_at is null and club_id is null;
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

-- A conversa inteira (Praça ou comunidade). As de clube abrem só na página do clube.
create or replace function public.post_get(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p posts%rowtype; c communities%rowtype;
begin
  select * into p from posts where id = p_id;
  if not found or p.club_id is not null or not public.content_open(p.author, p.mod_hidden, p.deleted_at) then return null; end if;
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

create or replace function public.reply_create(p_post uuid, p_parent uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p posts%rowtype; v_parent uuid := p_parent; n integer; r replies%rowtype; v_body text := trim(coalesce(p_body, ''));
begin
  perform public.check_can_publish();
  select * into p from posts where id = p_post and deleted_at is null and not mod_hidden and club_id is null;
  if not found or not public.praca_open(p) then raise exception 'target_not_found'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 5000 then raise exception 'body_invalid'; end if;
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
  -- Quem responde passa a acompanhar a conversa (e já leu até aqui).
  insert into post_follows (user_id, post_id) values (auth.uid(), p_post) on conflict do nothing;
  insert into post_reads (user_id, post_id, read_at) values (auth.uid(), p_post, now())
  on conflict (user_id, post_id) do update set read_at = now();
  return jsonb_build_object('id', r.id, 'parentId', r.parent_id, 'body', r.body, 'deleted', false, 'createdAt', r.created_at, 'editedAt', null,
    'hidden', false, 'author', public.person_json(r.author), 'authorCtx', public.author_ctx(r.author, p.game_id),
    'reactions', public.reaction_json('resposta', r.id));
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Enquete, salvar, acompanhar, ler
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.poll_vote(p_post uuid, p_option integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p posts%rowtype; n integer;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  select * into p from posts where id = p_post and kind = 'enquete' and deleted_at is null and not mod_hidden;
  if not found or not public.praca_open(p) then raise exception 'target_not_found'; end if;
  if p_option is null then
    delete from poll_votes where post_id = p_post and user_id = auth.uid();
  else
    select cardinality(options) into n from post_polls where post_id = p_post;
    if n is null or p_option < 0 or p_option >= n then raise exception 'poll_invalid'; end if;
    insert into poll_votes (post_id, user_id, option) values (p_post, auth.uid(), p_option)
    on conflict (post_id, user_id) do update set option = excluded.option, created_at = now();
  end if;
  return public.poll_json(p_post);
end; $$;

create or replace function public.post_save(p_post uuid, p_on boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if p_on then
    if not exists (select 1 from posts p where p.id = p_post and public.praca_open(p)) then raise exception 'target_not_found'; end if;
    insert into post_saves (user_id, post_id) values (auth.uid(), p_post) on conflict do nothing;
  else
    delete from post_saves where user_id = auth.uid() and post_id = p_post;
  end if;
  return p_on;
end; $$;

create or replace function public.post_follow(p_post uuid, p_on boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if p_on then
    if not exists (select 1 from posts p where p.id = p_post and public.praca_open(p)) then raise exception 'target_not_found'; end if;
    insert into post_follows (user_id, post_id) values (auth.uid(), p_post) on conflict do nothing;
  else
    delete from post_follows where user_id = auth.uid() and post_id = p_post;
  end if;
  return p_on;
end; $$;

-- Marca a conversa como lida agora e devolve quando foi a visita anterior (para a linha "novas desde a sua visita").
create or replace function public.post_read(p_post uuid) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare before timestamptz;
begin
  if auth.uid() is null then return null; end if;
  select read_at into before from post_reads where user_id = auth.uid() and post_id = p_post;
  if exists (select 1 from posts where id = p_post) then
    insert into post_reads (user_id, post_id, read_at) values (auth.uid(), p_post, now())
    on conflict (user_id, post_id) do update set read_at = now();
  end if;
  return before;
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Os caminhos da Praça
-- ---------------------------------------------------------------------------------------------------------------
-- p_path: 'para', 'amigos', 'seguindo', 'discussoes', 'salvos', 'novos'. Cada postagem vem com "why": o motivo de estar ali.
create or replace function public.praca_feed(p_path text default 'para', p_before timestamptz default null, p_limit integer default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); lim integer := greatest(1, least(coalesce(p_limit, 30), 60)); out jsonb;
begin
  if p_path = 'salvos' then
    select coalesce(jsonb_agg(public.post_json(p, false) || jsonb_build_object('why', null, 'at', s.created_at) order by s.created_at desc), '[]'::jsonb) into out
    from (select * from post_saves where user_id = me and (p_before is null or created_at < p_before) order by created_at desc limit lim) s
    join posts p on p.id = s.post_id where public.praca_open(p);
    return out;
  end if;

  if p_path = 'discussoes' then
    -- As mais conversadas da semana e as conversas antigas que voltaram a render.
    select coalesce(jsonb_agg(x.j order by x.n desc, x.last desc), '[]'::jsonb) into out from (
      select public.post_json(p, false) || jsonb_build_object('why',
               case when p.created_at < now() - interval '7 days' then 'Conversa que voltou: ' else '' end
               || case when k.n = 1 then '1 resposta esta semana' else k.n || ' respostas esta semana' end, 'at', k.last) j, k.n, k.last
      from posts p, lateral (select count(*) n, max(r.created_at) last from replies r
                             where r.post_id = p.id and r.created_at > now() - interval '7 days' and r.deleted_at is null and not r.mod_hidden) k
      where k.n > 0 and public.praca_open(p) and (p_before is null or k.last < p_before)
      order by k.n desc, k.last desc limit lim) x;
    return out;
  end if;

  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb) into out from (
    select public.post_json(p, false) || jsonb_build_object('why', w.why, 'at', p.created_at) j, p.created_at
    from posts p
    left join profiles pr on pr.id = p.author
    left join communities c on c.id = p.community_id
    cross join lateral (select
        me is not null and p.author is not null and public.are_friends(me, p.author) friend,
        exists (select 1 from follows f where f.follower = me and f.followed = p.author) fol_person,
        exists (select 1 from community_members m where m.user_id = me and m.community_id = p.community_id) fol_comm,
        (select count(*) from replies r where r.post_id = p.id and r.created_at > now() - interval '7 days' and r.deleted_at is null and not r.mod_hidden) week,
        case when p.game_id is null or me is null then null
             when exists (select 1 from journeys j where j.user_id = me and j.game_id = p.game_id) then 'jornada'
             when exists (select 1 from copies k where k.user_id = me and k.game_id = p.game_id and k.deleted_at is null) then 'colecao'
             when exists (select 1 from wishes d where d.user_id = me and d.game_id = p.game_id) then 'desejos' end mine) s
    left join games g on g.id = p.game_id
    cross join lateral (select case
        when p.author = me then 'Você publicou'
        when s.friend then 'Porque você e @' || pr.handle || ' se seguem'
        when s.mine = 'jornada' then 'Porque ' || g.title || ' está na sua Jornada'
        when s.mine = 'colecao' then 'Porque ' || g.title || ' está na sua Coleção'
        when s.mine = 'desejos' then 'Porque ' || g.title || ' está nos seus desejos'
        when s.fol_comm then 'Você segue w/' || c.slug
        when s.fol_person then 'Você segue @' || pr.handle
        when s.week >= 3 then 'Uma das mais conversadas da semana'
        when p.community_id is null and p.created_at > now() - interval '3 days' then 'Novo na Praça'
        when c.official then 'Da comunidade oficial do canal'
        -- O resto da Praça também aparece (de quem você ainda não segue), dizendo de onde veio.
        when p.community_id is null then 'Na Praça, de quem você ainda não segue'
        else 'Em w/' || c.slug || ', que você ainda não segue'
      end why) w
    where public.praca_open(p)
      and (p_before is null or p.created_at < p_before)
      and case p_path
            when 'amigos' then s.friend
            when 'seguindo' then s.fol_person or s.fol_comm or p.author = me
            when 'novos' then pr.created_at > now() - interval '21 days' and public.cm_pref(pr, 'novos', false)
            else p.created_at > now() - interval '45 days'
          end
    order by p.created_at desc limit lim) x;
  return out;
end; $$;

-- Os cantos da Praça: boa conversa para entrar, conversas que continuam e quem chegou agora.
create or replace function public.praca_side() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'entrar', coalesce((select jsonb_agg(x.j) from (
        select public.post_json(p, false) || jsonb_build_object('why', case when k.n = 0 then 'Ninguém respondeu ainda' when k.n = 1 then 'Só 1 resposta até agora' else k.n || ' respostas até agora' end) j
        from posts p left join profiles pr on pr.id = p.author,
        lateral (select count(*) n from replies r where r.post_id = p.id and r.deleted_at is null and not r.mod_hidden) k
        where public.praca_open(p) and p.author is distinct from auth.uid() and p.author is not null
          and p.created_at > now() - interval '4 days' and k.n <= 2 and p.kind <> 'aquisicao'
        order by (p.kind = 'pergunta') desc, (pr.created_at > now() - interval '21 days' and public.cm_pref(pr, 'novos', false)) desc, p.created_at desc
        limit 3) x), '[]'::jsonb),
    'continuam', coalesce((select jsonb_agg(x.j) from (
        select public.post_json(p, false) || jsonb_build_object('why', 'Começou ' || to_char(p.created_at at time zone 'America/Sao_Paulo', 'DD/MM') || ' e voltou a render') j
        from posts p, lateral (select count(*) n, max(r.created_at) last from replies r
                               where r.post_id = p.id and r.created_at > now() - interval '3 days' and r.deleted_at is null and not r.mod_hidden) k
        where public.praca_open(p) and p.created_at < now() - interval '7 days' and k.n > 0
        order by k.last desc limit 3) x), '[]'::jsonb),
    'novos', coalesce((select jsonb_agg(x.j) from (
        select public.person_json(pr.id) || jsonb_build_object('since', pr.created_at,
                 'post', (select jsonb_build_object('id', p.id, 'title', public.post_label(p)) from posts p
                          where p.author = pr.id and public.praca_open(p) order by p.created_at desc limit 1)) j
        from profiles pr
        where pr.handle is not null and pr.created_at > now() - interval '21 days' and public.cm_pref(pr, 'novos', false)
          and pr.id is distinct from auth.uid() and public.author_visible(pr.id)
        order by pr.created_at desc limit 8) x), '[]'::jsonb));
$$;

-- Comunidades e ficha do jogo: a Praça também conta; as de clube ficam de fora.
create or replace function public.game_posts(p_game text, p_limit integer default 10) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb) from (
    select public.post_json(p, false) j, p.created_at from posts p
    join games g on g.id = p.game_id
    where (g.id = p_game or g.slug = p_game) and public.praca_open(p)
    order by p.created_at desc limit greatest(1, least(coalesce(p_limit, 10), 40))) x;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Avisos, com as escolhas da pessoa
-- ---------------------------------------------------------------------------------------------------------------
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
    where me.a_resp and p.club_id is null and r.author is distinct from me.id and r.author is not null and r.deleted_at is null and not r.mod_hidden and p.deleted_at is null
      and ((p.author = me.id and exists (select 1 from post_follows f where f.user_id = me.id and f.post_id = p.id)) or parent.author = me.id)
      and public.author_visible(r.author) and r.created_at > now() - interval '30 days'
    union all
    -- respostas novas nas conversas que a pessoa acompanha
    select 'acompanhando', r.created_at, r.id::text, p.id::text, c.slug, public.post_label(p), left(r.body, 140), r.author
    from replies r join posts p on p.id = r.post_id join post_follows f on f.post_id = p.id left join communities c on c.id = p.community_id, me
    where me.a_acomp and f.user_id = me.id and p.author is distinct from me.id and p.club_id is null and r.created_at > f.created_at
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
      where p.club_id is null and p.deleted_at is null and not p.mod_hidden and (c.id is null or not c.mod_hidden) and p.created_at > now() - interval '30 days'
      union all
      select r.created_at, r.id::text, p.id::text, c.slug, public.post_label(p), left(r.body, 140), r.author, r.body
      from replies r join posts p on p.id = r.post_id left join communities c on c.id = p.community_id
      where p.club_id is null and r.deleted_at is null and not r.mod_hidden and p.deleted_at is null and (c.id is null or not c.mod_hidden)
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
    -- encontro que começa nas próximas 12 horas (ou está acontecendo)
    select 'encontro', k.starts_at - interval '12 hours', k.id::text, '', k.slug, k.name, null, null
    from clubs k join club_members m on m.club_id = k.id and m.user_id = auth.uid(), me
    where me.a_club and k.format = 'encontro' and coalesce(m.rsvp, 'vou') <> 'nao' and not k.mod_hidden
      and k.starts_at - interval '12 hours' <= now() and not public.club_ended(k)
    union all
    -- parte sugerida que abriu hoje (ou nos últimos 3 dias) e a pessoa ainda não passou
    select 'parte', (pt.suggested_on::timestamp at time zone 'America/Sao_Paulo'), k.id::text || ':' || pt.ordinal, pt.ordinal::text, k.slug, k.name, pt.title, null
    from club_parts pt join clubs k on k.id = pt.club_id join club_members m on m.club_id = k.id and m.user_id = auth.uid(), me
    where me.a_club and pt.suggested_on is not null and not k.mod_hidden and m.stage < pt.ordinal
      and (pt.suggested_on::timestamp at time zone 'America/Sao_Paulo') <= now()
      and (pt.suggested_on::timestamp at time zone 'America/Sao_Paulo') > now() - interval '3 days'),
  -- Cada coisa aparece uma vez só: resposta para você, depois menção, depois conversa acompanhada.
  uniq as (select distinct on (id) * from items
           order by id, case when kind in ('resposta', 'clube_resposta') then 0 when kind like '%mencao' then 1 else 2 end)
  select jsonb_build_object(
    'count', (select count(*) from uniq, me where uniq.at > me.since and uniq.at <= now()),
    'items', coalesce((select jsonb_agg(jsonb_build_object('kind', i.kind, 'id', i.id, 'ref', i.ref, 'slug', i.slug, 'title', i.title,
        'excerpt', i.excerpt, 'at', i.at, 'new', i.at > (select since from me), 'author', case when i.who is not null then public.person_json(i.who) end)
        order by i.at desc) from (select * from uniq where at <= now() order by at desc limit 20) i), '[]'::jsonb));
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Seus dados: também votos, conversas salvas e acompanhadas
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.my_community_data() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'postagens', coalesce((select jsonb_agg(jsonb_build_object('id', p.id,
        'onde', case when p.club_id is not null then 'clube/' || k.slug when c.slug is not null then 'w/' || c.slug else 'Praça' end,
        'parteDoClube', case when p.club_id is not null then p.club_part end,
        'tipo', p.kind, 'titulo', p.title, 'texto', p.body, 'jogo', g.title, 'spoiler', p.spoiler, 'spoilerSobre', p.spoiler_note,
        'enquete', (select to_jsonb(pl.options) from post_polls pl where pl.post_id = p.id),
        'imagens', to_jsonb(p.images), 'link', p.clip, 'criadaEm', p.created_at, 'editadaEm', p.edited_at, 'apagadaEm', p.deleted_at) order by p.created_at)
      from posts p left join communities c on c.id = p.community_id left join clubs k on k.id = p.club_id left join games g on g.id = p.game_id
      where p.author = auth.uid()), '[]'::jsonb),
    'respostas', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'postagem', r.post_id,
        'onde', case when p.club_id is not null then 'clube/' || k.slug when c.slug is not null then 'w/' || c.slug else 'Praça' end,
        'emResposta', coalesce(p.title, k.name, public.post_label(p)),
        'texto', r.body, 'imagens', to_jsonb(r.images), 'criadaEm', r.created_at, 'editadaEm', r.edited_at, 'apagadaEm', r.deleted_at) order by r.created_at)
      from replies r join posts p on p.id = r.post_id left join communities c on c.id = p.community_id left join clubs k on k.id = p.club_id
      where r.author = auth.uid()), '[]'::jsonb),
    'comunidadesCriadas', coalesce((select jsonb_agg(jsonb_build_object('endereco', 'w/' || c.slug, 'nome', c.name, 'descricao', c.description,
        'combinados', c.rules, 'capa', c.cover, 'criadaEm', c.created_at) order by c.created_at)
      from communities c where c.created_by = auth.uid()), '[]'::jsonb),
    'comunidadesQueSegue', coalesce((select jsonb_agg(jsonb_build_object('endereco', 'w/' || c.slug, 'nome', c.name, 'desde', m.joined_at) order by m.joined_at)
      from community_members m join communities c on c.id = m.community_id where m.user_id = auth.uid()), '[]'::jsonb),
    'clubes', coalesce((select jsonb_agg(jsonb_build_object('endereco', 'clube/' || k.slug, 'nome', k.name, 'papel', m.role, 'vou', m.rsvp,
        'primeiraVez', m.first_time, 'parte', m.stage, 'terminouEm', m.finished_at, 'entrouEm', m.joined_at,
        'criado', k.created_by = auth.uid(), 'descricao', case when k.created_by = auth.uid() then k.description end) order by m.joined_at)
      from club_members m join clubs k on k.id = m.club_id where m.user_id = auth.uid()), '[]'::jsonb),
    'reacoes', coalesce((select jsonb_agg(jsonb_build_object('em', x.target, 'id', x.target_id, 'reacao', x.kind, 'quando', x.created_at) order by x.created_at)
      from reactions x where x.user_id = auth.uid()), '[]'::jsonb),
    'votosEmEnquetes', coalesce((select jsonb_agg(jsonb_build_object('postagem', v.post_id, 'opcao', pl.options[v.option + 1], 'quando', v.created_at) order by v.created_at)
      from poll_votes v join post_polls pl on pl.post_id = v.post_id where v.user_id = auth.uid()), '[]'::jsonb),
    'conversasSalvas', coalesce((select jsonb_agg(jsonb_build_object('postagem', s.post_id, 'quando', s.created_at) order by s.created_at)
      from post_saves s where s.user_id = auth.uid()), '[]'::jsonb),
    'conversasAcompanhadas', coalesce((select jsonb_agg(jsonb_build_object('postagem', f.post_id, 'desde', f.created_at) order by f.created_at)
      from post_follows f where f.user_id = auth.uid()), '[]'::jsonb));
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------------------------------------------
revoke all on function public.cm_pref(public.profiles, text, boolean) from public, anon, authenticated;
revoke all on function public.author_ctx(uuid, text) from public, anon, authenticated;
revoke all on function public.poll_json(uuid) from public, anon, authenticated;
revoke all on function public.praca_open(public.posts) from public, anon, authenticated;
revoke all on function public.post_label(public.posts) from public, anon, authenticated;
revoke all on function public.clean_poll(jsonb) from public, anon, authenticated;
revoke all on function public.post_create(uuid, text, text, text, text, text, text, text[], text, jsonb) from public, anon;
revoke all on function public.post_edit(uuid, text, text, text, text, text, text, text[], text, jsonb) from public, anon;
revoke all on function public.poll_vote(uuid, integer) from public, anon;
revoke all on function public.post_save(uuid, boolean) from public, anon;
revoke all on function public.post_follow(uuid, boolean) from public, anon;
revoke all on function public.post_read(uuid) from public, anon;
revoke all on function public.praca_feed(text, timestamptz, integer) from public, anon;
revoke all on function public.praca_side() from public, anon;
grant execute on function public.post_create(uuid, text, text, text, text, text, text, text[], text, jsonb) to authenticated;
grant execute on function public.post_edit(uuid, text, text, text, text, text, text, text[], text, jsonb) to authenticated;
grant execute on function public.poll_vote(uuid, integer) to authenticated;
grant execute on function public.post_save(uuid, boolean) to authenticated;
grant execute on function public.post_follow(uuid, boolean) to authenticated;
grant execute on function public.post_read(uuid) to authenticated;
grant execute on function public.praca_feed(text, timestamptz, integer) to authenticated;
grant execute on function public.praca_side() to authenticated;

notify pgrst, 'reload schema';
