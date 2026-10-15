-- Etapa 6 · Comunidade reorganizada, entrega A: ajustes ao cânone
--  1. Reações novas: GG, Curti (coracao), Quero jogar, Boa dica, Tamo junto, Haha e Que momento.
--  2. Spoiler com contexto escrito por quem postou ("o que tem de spoiler"); a capa agora vale para todo mundo (no site).
--  3. Seguir uma comunidade não é mais condição nem consequência de postar nela.
--  4. Apagar a conta não apaga a conversa dos outros: a postagem fica sem texto, imagens nem nome ("conta apagada").
--  5. As mensagens dos clubes passam a ser postagens e respostas, como no resto da comunidade (a tabela club_messages sai).
--  6. Menções: @fulano numa postagem ou resposta vira aviso para a pessoa.
--  7. "Seus dados" passa a levar postagens, respostas, comunidades, clubes e reações.
-- Precisa da 0026 e da 0028. Rodar uma vez, no SQL Editor do Supabase (pode rodar de novo sem problema).

-- ---------------------------------------------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------------------------------------------
alter table public.reactions drop constraint if exists reactions_kind_check;
alter table public.reactions add constraint reactions_kind_check check (kind in ('gg', 'coracao', 'jogar', 'dica', 'junto', 'haha', 'momento'));

alter table public.posts add column if not exists spoiler_note text;
alter table public.posts drop constraint if exists posts_spoiler_note_check;
alter table public.posts add constraint posts_spoiler_note_check check (spoiler_note is null or char_length(spoiler_note) <= 80);

-- Postagem de clube: sem comunidade, sem título, numa parte do clube (0 = conversa geral).
alter table public.posts add column if not exists club_id uuid references public.clubs (id) on delete cascade;
alter table public.posts add column if not exists club_part integer not null default 0;
alter table public.posts alter column community_id drop not null;
alter table public.posts alter column title drop not null;
-- "not valid": a regra vale para o que entrar daqui em diante, sem reprovar linhas antigas; assim esta migração
-- pode rodar de novo depois das seguintes (que ampliam a regra) sem dar erro.
alter table public.posts drop constraint if exists posts_place_check;
alter table public.posts add constraint posts_place_check check (community_id is not null or club_id is not null) not valid;
alter table public.posts drop constraint if exists posts_title_needed;
alter table public.posts add constraint posts_title_needed check (club_id is not null or title is not null) not valid;
create index if not exists posts_club on public.posts (club_id, club_part, created_at) where club_id is not null;

-- Respostas de clube podem ter imagens; resposta apagada pode ficar sem texto.
alter table public.replies add column if not exists images text[] not null default '{}';
alter table public.replies drop constraint if exists replies_images_check;
alter table public.replies add constraint replies_images_check check (cardinality(images) <= 4);
alter table public.replies drop constraint if exists replies_body_check;
alter table public.replies add constraint replies_body_check check (char_length(body) <= 5000);

-- Quem escreveu pode sumir (conta apagada) sem levar a conversa junto.
alter table public.posts alter column author drop not null;
alter table public.posts drop constraint if exists posts_author_fkey;
alter table public.posts add constraint posts_author_fkey foreign key (author) references auth.users (id) on delete set null;
alter table public.replies alter column author drop not null;
alter table public.replies drop constraint if exists replies_author_fkey;
alter table public.replies add constraint replies_author_fkey foreign key (author) references auth.users (id) on delete set null;

-- Mensagens dos clubes viram postagens (as de cima) e respostas (as de baixo), com reações e denúncias junto.
do $$ begin
  if to_regclass('public.club_messages') is not null then
    insert into public.posts (id, club_id, club_part, author, kind, title, body, images, created_at, edited_at, deleted_at, mod_hidden)
    select id, club_id, part, author, case when question then 'pergunta' else 'discussao' end, null, body, images, created_at, edited_at, deleted_at, mod_hidden
    from public.club_messages where parent_id is null
    on conflict (id) do nothing;
    insert into public.replies (id, post_id, parent_id, author, body, images, created_at, edited_at, deleted_at, mod_hidden)
    select x.id, x.parent_id, null, x.author, x.body, x.images, x.created_at, x.edited_at, x.deleted_at, x.mod_hidden
    from public.club_messages x where x.parent_id is not null and exists (select 1 from public.posts p where p.id = x.parent_id)
    on conflict (id) do nothing;
    update public.reactions x set target = case when exists (select 1 from public.posts p where p.id = x.target_id) then 'post' else 'resposta' end
     where target = 'mensagem';
    update public.content_reports x set kind = case when exists (select 1 from public.posts p where p.id::text = x.ref) then 'postagem' else 'resposta' end
     where kind = 'mensagem';
    update public.moderation_log x set kind = case when exists (select 1 from public.posts p where p.id::text = x.ref) then 'postagem' else 'resposta' end
     where kind = 'mensagem';
    drop table public.club_messages;
  end if;
end $$;

alter table public.reactions drop constraint if exists reactions_target_check;
alter table public.reactions add constraint reactions_target_check check (target in ('post', 'resposta'));
alter table public.content_reports drop constraint if exists content_reports_kind_check;
alter table public.content_reports add constraint content_reports_kind_check
  check (kind in ('perfil', 'jornada', 'vitrine', 'momento', 'museu', 'comunidade', 'postagem', 'resposta', 'clube')) not valid;

-- ---------------------------------------------------------------------------------------------------------------
-- Peças comuns
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.reaction_json(p_target text, p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'gg', count(*) filter (where kind = 'gg'),
    'coracao', count(*) filter (where kind = 'coracao'),
    'jogar', count(*) filter (where kind = 'jogar'),
    'dica', count(*) filter (where kind = 'dica'),
    'junto', count(*) filter (where kind = 'junto'),
    'haha', count(*) filter (where kind = 'haha'),
    'momento', count(*) filter (where kind = 'momento'),
    'mine', coalesce(jsonb_agg(kind) filter (where user_id = auth.uid()), '[]'::jsonb))
  from reactions where target = p_target and target_id = p_id;
$$;

create or replace function public.post_json(p public.posts, p_full boolean) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', p.id, 'kind', p.kind, 'title', p.title,
    'body', case when p_full then p.body else left(p.body, 280) end,
    'game', public.game_json(p.game_id), 'spoiler', p.spoiler, 'spoilerNote', p.spoiler_note,
    'images', to_jsonb(case when p_full then p.images else p.images[1:1] end), 'imageCount', cardinality(p.images),
    'clip', p.clip, 'pinned', p.pinned, 'answerId', p.answer_id,
    'createdAt', p.created_at, 'editedAt', p.edited_at, 'hidden', p.mod_hidden,
    'author', public.person_json(p.author),
    'community', (select jsonb_build_object('slug', c.slug, 'name', c.name, 'official', c.official) from communities c where c.id = p.community_id),
    'replies', (select count(*) from replies r where r.post_id = p.id and public.content_open(r.author, r.mod_hidden, r.deleted_at)),
    'lastReplyAt', (select max(r.created_at) from replies r where r.post_id = p.id and r.deleted_at is null and not r.mod_hidden),
    'reactions', public.reaction_json('post', p.id));
$$;

-- Expressão para achar @fulano num texto (sem pegar @fulano2 nem email@fulano).
create or replace function public.mention_re(p_handle text) returns text
language sql immutable as $$
  select '(^|[^a-z0-9_.@])@' || regexp_replace(lower(p_handle), '([^a-z0-9_])', '\\\1', 'g') || '($|[^a-z0-9_])';
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Postagens: contexto do spoiler; postar não faz seguir; as de clube só pelas funções do clube
-- ---------------------------------------------------------------------------------------------------------------
drop function if exists public.post_create(uuid, text, text, text, text, text, text[], text);
create or replace function public.post_create(p_community uuid, p_kind text, p_title text, p_body text, p_game text, p_spoiler text, p_spoiler_note text, p_images text[], p_clip text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c communities%rowtype; p posts%rowtype; n integer; v_title text := trim(coalesce(p_title, '')); v_clip text;
  v_note text := nullif(left(trim(coalesce(p_spoiler_note, '')), 80), '');
begin
  perform public.check_can_publish();
  select * into c from communities where id = p_community;
  if not found or c.mod_hidden then raise exception 'target_not_found'; end if;
  if c.official and not public.is_admin() then raise exception 'official_only'; end if;
  if p_kind not in ('discussao', 'pergunta', 'dica', 'colecao', 'clipe') then raise exception 'post_kind'; end if;
  if char_length(v_title) < 3 or char_length(v_title) > 140 then raise exception 'title_invalid'; end if;
  if public.has_bad_term(v_title) or public.has_bad_term(v_note) then raise exception 'title_offensive'; end if;
  if char_length(coalesce(p_body, '')) > 10000 then raise exception 'body_long'; end if;
  if p_spoiler is not null and p_spoiler not in ('inicio', 'meio', 'final') then raise exception 'post_spoiler'; end if;
  v_clip := public.clean_clip(p_clip);
  if p_kind = 'clipe' and v_clip is null then raise exception 'clip_needed'; end if;
  if not public.is_admin() then
    select count(*) into n from posts where author = auth.uid() and created_at > now() - interval '1 day';
    if n >= 20 then raise exception 'post_limit'; end if;
  end if;
  perform public.note_public_act();
  insert into posts (community_id, author, kind, title, body, game_id, spoiler, spoiler_note, images, clip)
  values (c.id, auth.uid(), p_kind, v_title, coalesce(p_body, ''), (select id from games where id = p_game),
          case when p_game is not null then p_spoiler end, case when p_game is not null and p_spoiler is not null then v_note end,
          public.clean_images(p_images), v_clip)
  returning * into p;
  return public.post_json(p, true);
end; $$;

drop function if exists public.post_edit(uuid, text, text, text, text, text, text[], text);
create or replace function public.post_edit(p_id uuid, p_kind text, p_title text, p_body text, p_game text, p_spoiler text, p_spoiler_note text, p_images text[], p_clip text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p posts%rowtype; v_title text := trim(coalesce(p_title, '')); v_clip text;
  v_note text := nullif(left(trim(coalesce(p_spoiler_note, '')), 80), '');
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  select * into p from posts where id = p_id and deleted_at is null and club_id is null;
  if not found or p.author is distinct from auth.uid() then raise exception 'not_author'; end if;
  if p_kind not in ('discussao', 'pergunta', 'dica', 'colecao', 'clipe') then raise exception 'post_kind'; end if;
  if char_length(v_title) < 3 or char_length(v_title) > 140 then raise exception 'title_invalid'; end if;
  if public.has_bad_term(v_title) or public.has_bad_term(v_note) then raise exception 'title_offensive'; end if;
  if char_length(coalesce(p_body, '')) > 10000 then raise exception 'body_long'; end if;
  if p_spoiler is not null and p_spoiler not in ('inicio', 'meio', 'final') then raise exception 'post_spoiler'; end if;
  v_clip := public.clean_clip(p_clip);
  if p_kind = 'clipe' and v_clip is null then raise exception 'clip_needed'; end if;
  update posts set kind = p_kind, title = v_title, body = coalesce(p_body, ''), game_id = (select id from games where id = p_game),
         spoiler = case when p_game is not null then p_spoiler end,
         spoiler_note = case when p_game is not null and p_spoiler is not null then v_note end,
         images = public.clean_images(p_images), clip = v_clip, edited_at = now()
   where id = p_id returning * into p;
  return public.post_json(p, true);
end; $$;

-- A postagem de comunidade inteira. As de clube abrem só na página do clube (que confere quem entra e as partes).
create or replace function public.post_get(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p posts%rowtype; c communities%rowtype;
begin
  select * into p from posts where id = p_id;
  if not found or p.club_id is not null or not public.content_open(p.author, p.mod_hidden, p.deleted_at) then return null; end if;
  select * into c from communities where id = p.community_id;
  if not found or not public.community_open(c) then return null; end if;
  return public.post_json(p, true) || jsonb_build_object(
    'communityFull', public.community_json(c),
    'canModerate', public.community_can_edit(c.id),
    'thread', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'parentId', r.parent_id,
        'body', case when r.deleted_at is not null then '' else r.body end, 'deleted', r.deleted_at is not null,
        'createdAt', r.created_at, 'editedAt', r.edited_at, 'hidden', r.mod_hidden,
        'author', public.person_json(r.author), 'reactions', public.reaction_json('resposta', r.id)) order by r.created_at)
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
  if not found then raise exception 'target_not_found'; end if;
  if not public.author_visible(p.author) then raise exception 'target_not_found'; end if;
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
  return jsonb_build_object('id', r.id, 'parentId', r.parent_id, 'body', r.body, 'deleted', false, 'createdAt', r.created_at, 'editedAt', null,
    'hidden', false, 'author', public.person_json(r.author), 'reactions', public.reaction_json('resposta', r.id));
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Clubes: a conversa agora mora em posts e replies
-- ---------------------------------------------------------------------------------------------------------------
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
    'lastAt', greatest(
      (select max(p.created_at) from posts p where p.club_id = c.id and p.deleted_at is null and not p.mod_hidden),
      (select max(r.created_at) from replies r join posts p on p.id = r.post_id where p.club_id = c.id and r.deleted_at is null and not r.mod_hidden)));
$$;

-- Todas as mensagens de um clube (postagens e respostas), já no formato da página do clube.
create or replace function public.club_messages_of(p_club uuid) returns table (
  id uuid, part integer, parent_id uuid, question boolean, body text, images text[], created_at timestamptz, edited_at timestamptz,
  deleted_at timestamptz, mod_hidden boolean, author uuid, target text, has_kids boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.club_part, null::uuid, p.kind = 'pergunta', p.body, p.images, p.created_at, p.edited_at, p.deleted_at, p.mod_hidden, p.author, 'post',
         exists (select 1 from replies k where k.post_id = p.id and k.deleted_at is null)
  from posts p where p.club_id = p_club
  union all
  select r.id, p.club_part, r.post_id, false, r.body, r.images, r.created_at, r.edited_at, r.deleted_at, r.mod_hidden, r.author, 'resposta', false
  from replies r join posts p on p.id = r.post_id where p.club_id = p_club;
$$;

create or replace function public.club_get(p_slug text, p_code text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c clubs%rowtype; mine club_members%rowtype; v_stage integer; msgs jsonb;
begin
  select * into c from clubs where slug = lower(p_slug);
  if not found then return null; end if;
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
        where y.part > v_stage and y.deleted_at is null and not y.mod_hidden group by y.part) x), '{}'::jsonb));
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
    -- Responder a uma resposta vira resposta da mesma mensagem de cima.
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
    insert into posts (club_id, club_part, author, kind, title, body, images)
    values (p_club, v_part, auth.uid(), case when coalesce(p_question, false) then 'pergunta' else 'discussao' end, null, v_body, public.clean_images(p_images))
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

create or replace function public.club_message_edit(p_id uuid, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare v_body text := trim(coalesce(p_body, ''));
begin
  if char_length(v_body) < 1 or char_length(v_body) > 5000 then raise exception 'body_invalid'; end if;
  update posts set body = v_body, edited_at = now() where id = p_id and club_id is not null and author = auth.uid() and deleted_at is null;
  if found then return; end if;
  update replies set body = v_body, edited_at = now()
   where id = p_id and author = auth.uid() and deleted_at is null and exists (select 1 from posts p where p.id = replies.post_id and p.club_id is not null);
  if not found then raise exception 'not_author'; end if;
end; $$;

create or replace function public.club_message_delete(p_id uuid) returns text[]
language plpgsql security definer set search_path = public as $$
declare imgs text[];
begin
  select images into imgs from posts where id = p_id and club_id is not null and author = auth.uid() and deleted_at is null;
  if found then
    update posts set deleted_at = now(), images = '{}', answer_id = null where id = p_id;
    return coalesce(imgs, '{}');
  end if;
  select y.images into imgs from replies y join posts p on p.id = y.post_id
   where y.id = p_id and p.club_id is not null and y.author = auth.uid() and y.deleted_at is null;
  if not found then raise exception 'not_author'; end if;
  update replies set deleted_at = now(), images = '{}' where id = p_id;
  return coalesce(imgs, '{}');
end; $$;

-- Reações: as sete, em postagens e respostas (as de clube só para quem está no clube).
create or replace function public.react(p_target text, p_id uuid, p_kind text, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a uuid; cid uuid; found_it boolean := false;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if p_kind not in ('gg', 'coracao', 'jogar', 'dica', 'junto', 'haha', 'momento') then raise exception 'react_kind'; end if;
  if p_target = 'post' then
    select true, author, club_id into found_it, a, cid from posts where id = p_id and deleted_at is null and not mod_hidden;
  elsif p_target = 'resposta' then
    select true, r.author, p.club_id into found_it, a, cid from replies r join posts p on p.id = r.post_id where r.id = p_id and r.deleted_at is null and not r.mod_hidden;
  else raise exception 'react_kind'; end if;
  if not coalesce(found_it, false) or not public.author_visible(a) then raise exception 'target_not_found'; end if;
  if cid is not null and not public.club_member(cid) and not public.is_admin() then raise exception 'not_member'; end if;
  if p_on then insert into reactions (target, target_id, user_id, kind) values (p_target, p_id, auth.uid(), p_kind) on conflict do nothing;
  else delete from reactions where target = p_target and target_id = p_id and user_id = auth.uid() and kind = p_kind; end if;
  return public.reaction_json(p_target, p_id);
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Avisos: respostas, menções, encontro e parte do clube
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.my_news() returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (select id, handle, coalesce(replies_seen_at, created_at) since from profiles where id = auth.uid()),
  items as (
    -- respostas nas postagens e respostas da pessoa (comunidades)
    select 'resposta'::text kind, r.created_at at, r.id::text id, p.id::text ref, c.slug, p.title, left(r.body, 140) excerpt, r.author who
    from replies r join posts p on p.id = r.post_id join communities c on c.id = p.community_id
    left join replies parent on parent.id = r.parent_id, me
    where r.author is distinct from me.id and r.author is not null and r.deleted_at is null and not r.mod_hidden and p.deleted_at is null
      and (p.author = me.id or parent.author = me.id) and public.author_visible(r.author)
      and r.created_at > now() - interval '30 days'
    union all
    -- respostas às mensagens da pessoa nos clubes
    select 'clube_resposta', r.created_at, r.id::text, p.club_part::text, k.slug, k.name, left(r.body, 140), r.author
    from replies r join posts p on p.id = r.post_id join clubs k on k.id = p.club_id, me
    where p.author = me.id and r.author is distinct from me.id and r.author is not null and r.deleted_at is null and not r.mod_hidden
      and public.club_member(k.id) and public.author_visible(r.author) and r.created_at > now() - interval '30 days'
    union all
    -- menções nas comunidades: @fulano numa postagem ou resposta
    select 'mencao', x.at, x.id, x.ref, x.slug, x.title, x.excerpt, x.who from (
      select p.created_at at, p.id::text id, p.id::text ref, c.slug, p.title, left(p.body, 140) excerpt, p.author who, p.body
      from posts p join communities c on c.id = p.community_id
      where p.deleted_at is null and not p.mod_hidden and not c.mod_hidden and p.created_at > now() - interval '30 days'
      union all
      select r.created_at, r.id::text, p.id::text, c.slug, p.title, left(r.body, 140), r.author, r.body
      from replies r join posts p on p.id = r.post_id join communities c on c.id = p.community_id
      where r.deleted_at is null and not r.mod_hidden and p.deleted_at is null and not c.mod_hidden and r.created_at > now() - interval '30 days'
    ) x, me
    where me.handle is not null and x.who is distinct from me.id and x.who is not null
      and x.body ilike '%@' || me.handle || '%' and lower(x.body) ~ public.mention_re(me.handle) and public.author_visible(x.who)
    union all
    -- menções nos clubes de que a pessoa participa (só nas partes que ela já pode ler)
    select 'clube_mencao', x.created_at, x.id::text, x.part::text, k.slug, k.name, left(x.body, 140), x.author
    from clubs k join club_members m on m.club_id = k.id, me, lateral public.club_messages_of(k.id) x
    where m.user_id = me.id and me.handle is not null and not k.mod_hidden
      and (x.part = 0 or x.part <= m.stage) and x.deleted_at is null and not x.mod_hidden
      and x.author is distinct from me.id and x.author is not null and x.created_at > now() - interval '30 days'
      and x.body ilike '%@' || me.handle || '%' and lower(x.body) ~ public.mention_re(me.handle) and public.author_visible(x.author)
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
      and (pt.suggested_on::timestamp at time zone 'America/Sao_Paulo') > now() - interval '3 days'),
  -- Uma resposta que também menciona a pessoa aparece uma vez só (como resposta).
  uniq as (select distinct on (id) * from items order by id, kind like '%mencao')
  select jsonb_build_object(
    'count', (select count(*) from uniq, me where uniq.at > me.since and uniq.at <= now()),
    'items', coalesce((select jsonb_agg(jsonb_build_object('kind', i.kind, 'id', i.id, 'ref', i.ref, 'slug', i.slug, 'title', i.title,
        'excerpt', i.excerpt, 'at', i.at, 'new', i.at > (select since from me), 'author', case when i.who is not null then public.person_json(i.who) end)
        order by i.at desc) from (select * from uniq where at <= now() order by at desc limit 15) i), '[]'::jsonb));
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Apagar a conta: a conversa dos outros fica
-- ---------------------------------------------------------------------------------------------------------------
-- Antes de a conta sumir: o que só tem a pessoa some; onde outras pessoas responderam, fica o lugar, sem texto,
-- imagens nem nome (aparece como "conta apagada"). As imagens saem do armazenamento pela rotina de exclusão.
create or replace function public.account_detach(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from replies r where r.author = p_user
    and not exists (select 1 from replies k where k.parent_id = r.id and k.author is distinct from p_user and k.deleted_at is null);
  update replies set body = '', images = '{}', deleted_at = coalesce(deleted_at, now()), edited_at = null where author = p_user;
  delete from posts p where p.author = p_user
    and not exists (select 1 from replies r where r.post_id = p.id and r.author is distinct from p_user and r.deleted_at is null);
  update posts set body = '', images = '{}', clip = null, spoiler_note = null, pinned = false, edited_at = null where author = p_user;
end; $$;

create or replace function public.on_account_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.account_detach(old.id);
  return old;
end; $$;

drop trigger if exists account_detach on auth.users;
create trigger account_detach before delete on auth.users for each row execute function public.on_account_delete();

-- ---------------------------------------------------------------------------------------------------------------
-- Seus dados: o que a pessoa escreveu na comunidade
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.my_community_data() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'postagens', coalesce((select jsonb_agg(jsonb_build_object('id', p.id,
        'onde', case when p.club_id is not null then 'clube/' || k.slug else 'w/' || c.slug end, 'parteDoClube', case when p.club_id is not null then p.club_part end,
        'tipo', p.kind, 'titulo', p.title, 'texto', p.body, 'jogo', g.title, 'spoiler', p.spoiler, 'spoilerSobre', p.spoiler_note,
        'imagens', to_jsonb(p.images), 'link', p.clip, 'criadaEm', p.created_at, 'editadaEm', p.edited_at, 'apagadaEm', p.deleted_at) order by p.created_at)
      from posts p left join communities c on c.id = p.community_id left join clubs k on k.id = p.club_id left join games g on g.id = p.game_id
      where p.author = auth.uid()), '[]'::jsonb),
    'respostas', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'postagem', r.post_id,
        'onde', case when p.club_id is not null then 'clube/' || k.slug else 'w/' || c.slug end, 'emResposta', coalesce(p.title, k.name),
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
      from reactions x where x.user_id = auth.uid()), '[]'::jsonb));
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Denúncias e moderação: as mensagens de clube agora são postagem e resposta
-- ---------------------------------------------------------------------------------------------------------------
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
                              'community', coalesce(c.name, 'Clube ' || k.name), 'club', k.slug, 'photo', cardinality(p.images) > 0,
                              'game', g.title, 'hidden', p.mod_hidden) into out
    from posts p left join communities c on c.id = p.community_id left join clubs k on k.id = p.club_id left join games g on g.id = p.game_id
    where p.author = p_owner and p.id::text = p_ref and p.deleted_at is null;
  elsif p_kind = 'resposta' then
    select jsonb_build_object('title', coalesce(p.title, k.name), 'text', left(r.body, 400), 'slug', coalesce(c.slug, k.slug),
                              'community', coalesce(c.name, 'Clube ' || k.name), 'club', k.slug, 'postId', p.id, 'photo', cardinality(r.images) > 0, 'hidden', r.mod_hidden) into out
    from replies r join posts p on p.id = r.post_id left join communities c on c.id = p.community_id left join clubs k on k.id = p.club_id
    where r.author = p_owner and r.id::text = p_ref and r.deleted_at is null;
  elsif p_kind = 'clube' then
    select jsonb_build_object('title', k.name, 'slug', k.slug, 'description', k.description, 'game', g.title, 'hidden', k.mod_hidden) into out
    from clubs k join games g on g.id = k.game_id where k.created_by = p_owner and k.id::text = p_ref;
  end if;
  return out;
end; $$;

create or replace function public.report_content(p_kind text, p_handle text, p_ref text, p_reason text, p_note text) returns text
language plpgsql security definer set search_path = public as $$
declare owner_id uuid; snap jsonb; n integer; r text := coalesce(p_ref, ''); v_note text := nullif(left(trim(coalesce(p_note, '')), 500), '');
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if p_kind not in ('perfil', 'jornada', 'vitrine', 'momento', 'museu', 'comunidade', 'postagem', 'resposta', 'clube') then raise exception 'report_kind'; end if;
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
revoke all on function public.mention_re(text) from public, anon, authenticated;
revoke all on function public.club_messages_of(uuid) from public, anon, authenticated;
revoke all on function public.account_detach(uuid) from public, anon, authenticated;
revoke all on function public.on_account_delete() from public, anon, authenticated;
revoke all on function public.post_create(uuid, text, text, text, text, text, text, text[], text) from public, anon;
revoke all on function public.post_edit(uuid, text, text, text, text, text, text, text[], text) from public, anon;
revoke all on function public.my_community_data() from public, anon;
grant execute on function public.post_create(uuid, text, text, text, text, text, text, text[], text) to authenticated;
grant execute on function public.post_edit(uuid, text, text, text, text, text, text, text[], text) to authenticated;
grant execute on function public.my_community_data() to authenticated;

notify pgrst, 'reload schema';
