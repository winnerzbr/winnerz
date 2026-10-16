-- 0053 · Álbum de figurinhas, etapa A1
--
-- O catálogo da Temporada (álbuns, páginas e figurinhas, com a arte num bucket público), a coleção de cada pessoa e
-- os pacotes. Um pacote nasce quando a pessoa zera um jogo na Jornada, e o banco aplica as regras contra trapaça:
--   · um pacote por jogo, para sempre;
--   · o tempo entre começar e zerar (pelo relógio do servidor) tem de ser pelo menos metade da duração normal do
--     jogo, ou 24 horas quando não se sabe a duração; sessões vindas das pontes (Steam, RetroAchievements) contam
--     como prova e dispensam a espera;
--   · até 2 pacotes por semana pela Jornada, e 1 nos 7 primeiros dias da conta;
--   · jogos que a pessoa marca como zerados no passado contam para o pacote de memória: 1 a cada 10, no máximo 3.
-- Quando uma regra segura o pacote, ele fica "retido" com o nome da regra; a pessoa pode pedir revisão e o Studio
-- libera ou nega. O Studio também dá pacotes à mão (com motivo e histórico) e desfaz enquanto ninguém abriu.
-- Abrir é no servidor: 5 figurinhas, Comum 70%, Incomum 22%, Rara 7%, Lendária 1%, e Rara garantida depois de 10
-- pacotes sem nenhuma.
--
-- Tudo passa por funções (as tabelas não têm leitura direta). Pode rodar mais de uma vez. Precisa da 0034 e da 0048.

-- ---------------------------------------------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------------------------------------------
create table if not exists public.album_books (
  id uuid primary key default gen_random_uuid(),
  season smallint not null default 1 check (season between 1 and 99),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  title text not null check (char_length(title) between 2 and 60),
  subtitle text not null default '' check (char_length(subtitle) <= 60),
  cover text check (char_length(cover) <= 400),
  position smallint not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.album_pages (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.album_books (id) on delete cascade,
  position smallint not null default 0,
  kicker text not null default '' check (char_length(kicker) <= 40),
  title text not null check (char_length(title) between 1 and 60),
  body text not null default '' check (char_length(body) <= 160),
  banner text check (char_length(banner) <= 400),
  legendary boolean not null default false
);
create index if not exists album_pages_book on public.album_pages (book_id, position);

create table if not exists public.album_stickers (
  id uuid primary key default gen_random_uuid(),
  season smallint not null default 1 check (season between 1 and 99),
  number smallint not null check (number between 1 and 999),
  page_id uuid references public.album_pages (id) on delete set null,
  slot smallint not null default 0,
  name text not null check (char_length(name) between 2 and 40),
  tier text not null check (tier in ('comum', 'incomum', 'rara', 'lendaria')),
  art text check (char_length(art) <= 400),
  credit text not null default '' check (char_length(credit) <= 80),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (season, number)
);
create index if not exists album_stickers_page on public.album_stickers (page_id, slot);

-- ---------------------------------------------------------------------------------------------------------------
-- Coleção e pacotes
-- ---------------------------------------------------------------------------------------------------------------
create table if not exists public.album_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  sticker_id uuid not null references public.album_stickers (id) on delete cascade,
  qty integer not null default 0 check (qty >= 0),
  pasted boolean not null default false,
  first_at timestamptz not null default now(),
  pasted_at timestamptz,
  primary key (user_id, sticker_id)
);

create table if not exists public.album_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'onix' check (kind in ('onix', 'prisma')),
  origin text not null check (origin in ('jornada', 'memoria', 'studio')),
  state text not null default 'fechado' check (state in ('retido', 'fechado', 'aberto', 'desfeito', 'negado')),
  rule text check (rule in ('tempo', 'semana', 'conta_nova')),
  game_id text references public.games (id) on delete set null,
  history_id uuid,
  reason text check (char_length(reason) <= 200),
  granted_by uuid references auth.users (id) on delete set null,
  signals jsonb not null default '{}'::jsonb,
  contents jsonb,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  decision_note text check (char_length(decision_note) <= 300)
);
create index if not exists album_packs_user on public.album_packs (user_id, created_at desc);
create index if not exists album_packs_held on public.album_packs (created_at) where state = 'retido';

create table if not exists public.album_reviews (
  pack_id uuid primary key references public.album_packs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  message text not null check (char_length(message) between 3 and 400),
  state text not null default 'aberta' check (state in ('aberta', 'respondida')),
  answer text check (char_length(answer) <= 300),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  answered_by uuid references auth.users (id) on delete set null
);

-- Cada jogo conta uma vez para sempre (pela Jornada ou pela memória), mesmo que a pessoa reabra e zere de novo.
create table if not exists public.album_counted (
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id text not null,
  history_id uuid,
  kind text not null check (kind in ('jornada', 'memoria')),
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

-- Quando a história começou, pelo relógio do servidor (o cliente não escolhe esta data).
create table if not exists public.album_starts (
  history_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now()
);

create table if not exists public.album_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  opened integer not null default 0,
  no_rare integer not null default 0,
  memory_packs smallint not null default 0
);

alter table public.album_books enable row level security;
alter table public.album_pages enable row level security;
alter table public.album_stickers enable row level security;
alter table public.album_items enable row level security;
alter table public.album_packs enable row level security;
alter table public.album_reviews enable row level security;
alter table public.album_counted enable row level security;
alter table public.album_starts enable row level security;
alter table public.album_stats enable row level security;
revoke all on public.album_books, public.album_pages, public.album_stickers, public.album_items, public.album_packs,
  public.album_reviews, public.album_counted, public.album_starts, public.album_stats from anon, authenticated;

-- Arte das figurinhas, capas e faixas: leitura pública, só a administração envia.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('album', 'album', true, 3145728, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];
drop policy if exists "album: administração envia" on storage.objects;
create policy "album: administração envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'album' and public.is_admin());
drop policy if exists "album: administração troca" on storage.objects;
create policy "album: administração troca" on storage.objects for update to authenticated
  using (bucket_id = 'album' and public.is_admin());
drop policy if exists "album: administração apaga" on storage.objects;
create policy "album: administração apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'album' and public.is_admin());

-- ---------------------------------------------------------------------------------------------------------------
-- Pacotes ao zerar
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.album_pack_notify(p_pack public.album_packs) returns void
language plpgsql security definer set search_path = public as $$
declare t text := (select title from games where id = p_pack.game_id);
begin
  if p_pack.state = 'fechado' then
    perform public.notif_add(p_pack.user_id, 'album_pacote', null, null, p_pack.id,
      case when p_pack.origin = 'memoria' then 'Você ganhou um pacote de memória'
           when p_pack.origin = 'studio' then 'Você ganhou um pacote de figurinhas'
           else 'Você ganhou um pacote de figurinhas' end,
      case when p_pack.origin = 'jornada' and t is not null then 'Por zerar ' || t || '.'
           when p_pack.origin = 'memoria' then 'Pelos jogos que você já tinha zerado.'
           when p_pack.origin = 'studio' then coalesce(p_pack.reason, '')
           else '' end,
      '/album/pacotes', jsonb_build_object('kind', p_pack.kind));
  elsif p_pack.state = 'retido' then
    perform public.notif_add(p_pack.user_id, 'album_retido', null, null, p_pack.id, 'Seu pacote ficou guardado para revisão',
      case p_pack.rule when 'tempo' then 'Você zerou ' || coalesce(t, 'o jogo') || ' mais rápido do que o normal. Se foi isso mesmo, peça revisão.'
                       when 'semana' then 'Você já ganhou 2 pacotes pela Jornada esta semana.'
                       when 'conta_nova' then 'Contas novas ganham 1 pacote pela Jornada na primeira semana.'
                       else '' end,
      '/album/pacotes', '{}'::jsonb);
  end if;
end; $$;

create or replace function public.album_count(h public.histories, p_live boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  g text; s timestamptz; v_ttb jsonb; hrs numeric; need numeric; el numeric; bm integer; acct timestamptz;
  recent integer; mem integer; memp integer; r text := null; p public.album_packs;
begin
  select game_id into g from journeys where id = h.journey_id;
  if g is null or h.user_id is null then return; end if;
  if exists (select 1 from album_counted where user_id = h.user_id and game_id = g) then return; end if;
  select started_at into s from album_starts where history_id = h.id;

  if not p_live or s is null then
    insert into album_counted (user_id, game_id, history_id, kind) values (h.user_id, g, h.id, 'memoria') on conflict do nothing;
    select count(*) into mem from album_counted where user_id = h.user_id and kind = 'memoria';
    insert into album_stats (user_id) values (h.user_id) on conflict do nothing;
    select memory_packs into memp from album_stats where user_id = h.user_id;
    if mem > 0 and mem % 10 = 0 and memp < 3 then
      insert into album_packs (user_id, origin, state, signals) values (h.user_id, 'memoria', 'fechado', jsonb_build_object('memoria', mem))
      returning * into p;
      update album_stats set memory_packs = memory_packs + 1 where user_id = h.user_id;
      perform public.album_pack_notify(p);
    end if;
    return;
  end if;

  insert into album_counted (user_id, game_id, history_id, kind) values (h.user_id, g, h.id, 'jornada') on conflict do nothing;
  select games.ttb into v_ttb from games where id = g;
  hrs := coalesce(nullif((v_ttb ->> 'n')::numeric, 0), nullif((v_ttb ->> 'h')::numeric, 0));
  need := case when hrs is not null then hrs / 2 else 24 end;
  el := extract(epoch from (now() - s)) / 3600;
  select coalesce(sum(minutes), 0) into bm from sessions where history_id = h.id and source is not null;
  select created_at into acct from profiles where id = h.user_id;
  select count(*) into recent from album_packs
    where user_id = h.user_id and origin = 'jornada' and state <> 'retido' and created_at > now() - interval '7 days';

  if el < need and bm < least(need * 60, 600) then r := 'tempo';
  elsif acct is not null and acct > now() - interval '7 days' and recent >= 1 then r := 'conta_nova';
  elsif recent >= 2 then r := 'semana';
  end if;

  insert into album_packs (user_id, origin, state, rule, game_id, history_id, signals)
  values (h.user_id, 'jornada', case when r is null then 'fechado' else 'retido' end, r, g, h.id,
    jsonb_build_object('elapsedH', round(el, 1), 'needH', round(need, 1), 'ttbH', hrs, 'bridgeMin', bm,
      'accountDays', case when acct is null then null else floor(extract(epoch from (now() - acct)) / 86400) end, 'weekPacks', recent))
  returning * into p;
  perform public.album_pack_notify(p);
end; $$;

create or replace function public.album_on_history_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.state = 'concluida' then perform public.album_count(new, false);
  else insert into album_starts (history_id, user_id) values (new.id, new.user_id) on conflict do nothing;
  end if;
  return new;
exception when others then return new; -- o álbum nunca impede a Jornada de salvar
end; $$;

create or replace function public.album_on_history_state() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.state = 'concluida' and old.state is distinct from 'concluida' then perform public.album_count(new, true); end if;
  return new;
exception when others then return new;
end; $$;

drop trigger if exists histories_album_insert on public.histories;
create trigger histories_album_insert after insert on public.histories for each row execute function public.album_on_history_insert();
drop trigger if exists histories_album_state on public.histories;
create trigger histories_album_state after update of state on public.histories for each row execute function public.album_on_history_state();

-- Histórias em andamento antes desta migração: começam a contar de quando a jornada foi criada.
insert into public.album_starts (history_id, user_id, started_at)
select h.id, h.user_id, j.created_at from public.histories h join public.journeys j on j.id = h.journey_id
where h.state <> 'concluida'
on conflict do nothing;

-- Jogos já zerados antes desta migração: entram na memória (sem aviso; os pacotes de memória ficam esperando no álbum).
do $$
declare u record; n integer; k integer;
begin
  insert into public.album_counted (user_id, game_id, history_id, kind)
  select distinct on (h.user_id, j.game_id) h.user_id, j.game_id, h.id, 'memoria'
  from public.histories h join public.journeys j on j.id = h.journey_id
  where h.state = 'concluida'
  order by h.user_id, j.game_id, h.completed_at
  on conflict do nothing;
  for u in select user_id, count(*) as c from public.album_counted where kind = 'memoria' group by user_id loop
    insert into public.album_stats (user_id) values (u.user_id) on conflict do nothing;
    select memory_packs into k from public.album_stats where user_id = u.user_id;
    n := least(3, (u.c / 10)::integer) - k;
    while n > 0 loop
      insert into public.album_packs (user_id, origin, state, signals) values (u.user_id, 'memoria', 'fechado', jsonb_build_object('memoria', u.c));
      update public.album_stats set memory_packs = memory_packs + 1 where user_id = u.user_id;
      n := n - 1;
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Leitura
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.album_sticker_json(s public.album_stickers) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', s.id, 'season', s.season, 'number', s.number, 'name', s.name, 'tier', s.tier, 'art', s.art,
    'credit', s.credit, 'pageId', s.page_id, 'slot', s.slot, 'active', s.active);
$$;

create or replace function public.album_catalog_json(p_all boolean) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'books', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'slug', b.slug, 'season', b.season, 'title', b.title,
        'subtitle', b.subtitle, 'cover', b.cover, 'position', b.position, 'published', b.published,
        'pages', coalesce((select jsonb_agg(jsonb_build_object('id', pg.id, 'position', pg.position, 'kicker', pg.kicker, 'title', pg.title,
            'body', pg.body, 'banner', pg.banner, 'legendary', pg.legendary) order by pg.position, pg.id)
          from album_pages pg where pg.book_id = b.id), '[]'::jsonb)) order by b.season, b.position, b.title)
      from album_books b where p_all or b.published), '[]'::jsonb),
    'stickers', coalesce((select jsonb_agg(public.album_sticker_json(s) order by s.season, s.number)
      from album_stickers s
      where p_all or (s.active and exists (select 1 from album_pages pg join album_books b on b.id = pg.book_id
                                           where pg.id = s.page_id and b.published))), '[]'::jsonb));
$$;

create or replace function public.album_pack_json(p public.album_packs) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', p.id, 'kind', p.kind, 'origin', p.origin, 'state', p.state, 'rule', p.rule, 'reason', p.reason, 'historyId', p.history_id,
    'game', case when p.game_id is null then null else public.game_json(p.game_id) end,
    'contents', p.contents, 'createdAt', p.created_at, 'openedAt', p.opened_at, 'note', p.decision_note,
    'review', (select jsonb_build_object('state', r.state, 'message', r.message, 'answer', r.answer, 'createdAt', r.created_at)
               from album_reviews r where r.pack_id = p.id));
$$;

create or replace function public.album_state() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_logged'; end if;
  return public.album_catalog_json(public.is_admin()) || jsonb_build_object(
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.sticker_id, 'qty', i.qty, 'pasted', i.pasted)) from album_items i where i.user_id = me and i.qty > 0), '[]'::jsonb),
    'packs', coalesce((select jsonb_agg(public.album_pack_json(p) order by p.created_at desc) from album_packs p
      where p.id in (select id from album_packs where user_id = me and state <> 'desfeito' order by created_at desc limit 60)), '[]'::jsonb),
    'stats', coalesce((select jsonb_build_object('opened', s.opened, 'noRare', s.no_rare) from album_stats s where s.user_id = me), jsonb_build_object('opened', 0, 'noRare', 0)));
end; $$;

-- Quantos pacotes fechados a pessoa tem (para o selo no menu).
create or replace function public.album_closed_count() returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer from album_packs where user_id = auth.uid() and state = 'fechado';
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Abrir e colar
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.album_draw(p_tier text) returns uuid
language sql volatile security definer set search_path = public as $$
  select s.id from album_stickers s join album_pages pg on pg.id = s.page_id join album_books b on b.id = pg.book_id
  where s.active and b.published and s.tier = p_tier order by random() limit 1;
$$;

create or replace function public.album_open(p_pack uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid(); p public.album_packs; nr integer; i integer; x double precision; t text; sid uuid;
  got uuid[] := '{}'; tiers text[] := '{}'; res jsonb := '[]'::jsonb; dup boolean; rare boolean := false;
begin
  if me is null then raise exception 'not_logged'; end if;
  select * into p from album_packs where id = p_pack and user_id = me for update;
  if not found then raise exception 'not_found'; end if;
  if p.state = 'aberto' then return p.contents; end if;
  if p.state <> 'fechado' then raise exception 'pack_not_open'; end if;
  if public.album_draw('comum') is null and public.album_draw('incomum') is null and public.album_draw('rara') is null and public.album_draw('lendaria') is null then
    raise exception 'catalog_empty';
  end if;
  insert into album_stats (user_id) values (me) on conflict do nothing;
  select no_rare into nr from album_stats where user_id = me;

  for i in 1..5 loop
    x := random();
    t := case when x < 0.01 then 'lendaria' when x < 0.08 then 'rara' when x < 0.30 then 'incomum' else 'comum' end;
    if i = 5 and not rare and t not in ('rara', 'lendaria') and nr >= 9 then t := 'rara'; end if;
    sid := public.album_draw(t);
    if sid is null then sid := coalesce(public.album_draw('comum'), public.album_draw('incomum'), public.album_draw('rara'), public.album_draw('lendaria')); end if;
    select tier into t from album_stickers where id = sid;
    if t in ('rara', 'lendaria') then rare := true; end if;
    got := got || sid; tiers := tiers || t;
  end loop;

  for i in 1..5 loop
    sid := got[i];
    dup := exists (select 1 from album_items where user_id = me and sticker_id = sid and qty > 0);
    insert into album_items (user_id, sticker_id, qty) values (me, sid, 1)
    on conflict (user_id, sticker_id) do update set qty = album_items.qty + 1;
    res := res || jsonb_build_object('id', sid, 'tier', tiers[i], 'dup', dup);
  end loop;

  update album_packs set state = 'aberto', contents = res, opened_at = now() where id = p.id;
  update album_stats set opened = opened + 1, no_rare = case when rare then 0 else no_rare + 1 end where user_id = me;
  return res;
end; $$;

create or replace function public.album_paste(p_sticker uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  update album_items set pasted = true, pasted_at = now() where user_id = auth.uid() and sticker_id = p_sticker and qty > 0 and not pasted;
  return found;
end; $$;

create or replace function public.album_paste_all() returns jsonb
language plpgsql security definer set search_path = public as $$
declare ids jsonb;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  with u as (update album_items set pasted = true, pasted_at = now() where user_id = auth.uid() and qty > 0 and not pasted returning sticker_id)
  select coalesce(jsonb_agg(sticker_id), '[]'::jsonb) into ids from u;
  return ids;
end; $$;

create or replace function public.album_review_ask(p_pack uuid, p_message text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.album_packs; m text := trim(coalesce(p_message, ''));
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  select * into p from album_packs where id = p_pack and user_id = auth.uid();
  if not found then raise exception 'not_found'; end if;
  if p.state not in ('retido', 'negado') then raise exception 'not_held'; end if;
  if char_length(m) < 3 then raise exception 'review_short'; end if;
  if exists (select 1 from album_reviews where pack_id = p.id and state = 'respondida') and p.state = 'negado' then raise exception 'review_done'; end if;
  insert into album_reviews (pack_id, user_id, message) values (p.id, auth.uid(), left(m, 400))
  on conflict (pack_id) do update set message = excluded.message, state = 'aberta', created_at = now(), answer = null, answered_at = null, answered_by = null;
  return public.album_pack_json(p);
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Studio
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.studio_album_catalog() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return public.album_catalog_json(true) || jsonb_build_object(
    'owned', coalesce((select jsonb_object_agg(sticker_id, n) from (select sticker_id, count(*) n from album_items where qty > 0 group by sticker_id) x), '{}'::jsonb));
end; $$;

create or replace function public.studio_album_book_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if v_id is null then
    insert into album_books (season, slug, title, subtitle, cover, position, published)
    values (coalesce((p ->> 'season')::smallint, 1), p ->> 'slug', trim(p ->> 'title'), coalesce(trim(p ->> 'subtitle'), ''), nullif(p ->> 'cover', ''),
            coalesce((p ->> 'position')::smallint, 0), coalesce((p ->> 'published')::boolean, false))
    returning id into v_id;
  else
    update album_books set season = coalesce((p ->> 'season')::smallint, season), slug = coalesce(p ->> 'slug', slug), title = coalesce(trim(p ->> 'title'), title),
      subtitle = coalesce(trim(p ->> 'subtitle'), subtitle), cover = case when p ? 'cover' then nullif(p ->> 'cover', '') else cover end,
      position = coalesce((p ->> 'position')::smallint, position), published = coalesce((p ->> 'published')::boolean, published)
    where id = v_id;
  end if;
  return public.studio_album_catalog();
end; $$;

create or replace function public.studio_album_book_delete(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if exists (select 1 from album_stickers s join album_pages pg on pg.id = s.page_id join album_items i on i.sticker_id = s.id where pg.book_id = p_id and i.qty > 0) then
    raise exception 'album_in_use';
  end if;
  delete from album_books where id = p_id;
  return public.studio_album_catalog();
end; $$;

create or replace function public.studio_album_page_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if v_id is null then
    insert into album_pages (book_id, position, kicker, title, body, banner, legendary)
    values ((p ->> 'bookId')::uuid, coalesce((p ->> 'position')::smallint, 0), coalesce(trim(p ->> 'kicker'), ''), trim(p ->> 'title'),
            coalesce(trim(p ->> 'body'), ''), nullif(p ->> 'banner', ''), coalesce((p ->> 'legendary')::boolean, false));
  else
    update album_pages set position = coalesce((p ->> 'position')::smallint, position), kicker = coalesce(trim(p ->> 'kicker'), kicker),
      title = coalesce(trim(p ->> 'title'), title), body = coalesce(trim(p ->> 'body'), body),
      banner = case when p ? 'banner' then nullif(p ->> 'banner', '') else banner end, legendary = coalesce((p ->> 'legendary')::boolean, legendary)
    where id = v_id;
  end if;
  return public.studio_album_catalog();
end; $$;

create or replace function public.studio_album_page_delete(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  delete from album_pages where id = p_id; -- as figurinhas da página ficam sem página (não somem de quem tem)
  return public.studio_album_catalog();
end; $$;

create or replace function public.studio_album_sticker_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if v_id is null then
    insert into album_stickers (season, number, page_id, slot, name, tier, art, credit, active)
    values (coalesce((p ->> 'season')::smallint, 1), (p ->> 'number')::smallint, nullif(p ->> 'pageId', '')::uuid, coalesce((p ->> 'slot')::smallint, 0),
            trim(p ->> 'name'), p ->> 'tier', nullif(p ->> 'art', ''), coalesce(trim(p ->> 'credit'), ''), coalesce((p ->> 'active')::boolean, true));
  else
    update album_stickers set season = coalesce((p ->> 'season')::smallint, season), number = coalesce((p ->> 'number')::smallint, number),
      page_id = case when p ? 'pageId' then nullif(p ->> 'pageId', '')::uuid else page_id end, slot = coalesce((p ->> 'slot')::smallint, slot),
      name = coalesce(trim(p ->> 'name'), name), tier = coalesce(p ->> 'tier', tier), art = case when p ? 'art' then nullif(p ->> 'art', '') else art end,
      credit = coalesce(trim(p ->> 'credit'), credit), active = coalesce((p ->> 'active')::boolean, active)
    where id = v_id;
  end if;
  return public.studio_album_catalog();
exception when unique_violation then raise exception 'sticker_number_taken';
end; $$;

create or replace function public.studio_album_sticker_delete(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if exists (select 1 from album_items where sticker_id = p_id and qty > 0) then
    update album_stickers set active = false where id = p_id; -- quem tem continua tendo; só sai dos pacotes
  else
    delete from album_stickers where id = p_id;
  end if;
  return public.studio_album_catalog();
end; $$;

create or replace function public.studio_pack_json(p public.album_packs) returns jsonb
language sql stable security definer set search_path = public as $$
  select public.album_pack_json(p) || jsonb_build_object('person', public.person_json(p.user_id), 'grantedBy', public.person_json(p.granted_by),
    'decidedBy', public.person_json(p.decided_by), 'decidedAt', p.decided_at, 'signals', p.signals);
$$;

-- p_view: 'retidos' (esperando decisão), 'revisoes' (pedidos abertos) ou 'historico' (dados à mão e decisões).
create or replace function public.studio_packs(p_view text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return coalesce((select jsonb_agg(public.studio_pack_json(p) order by p.created_at desc) from album_packs p where p.id in (
    select a.id from album_packs a
    where case p_view
      when 'retidos' then a.state = 'retido'
      when 'revisoes' then exists (select 1 from album_reviews r where r.pack_id = a.id and r.state = 'aberta')
      else a.origin = 'studio' or a.decided_by is not null end
    order by a.created_at desc limit 200)), '[]'::jsonb);
end; $$;

create or replace function public.studio_pack_counts() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return jsonb_build_object('retidos', (select count(*) from album_packs where state = 'retido'),
    'revisoes', (select count(*) from album_reviews where state = 'aberta'));
end; $$;

create or replace function public.studio_pack_give(p_handle text, p_qty integer, p_kind text, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid; n integer := coalesce(p_qty, 1); r text := trim(coalesce(p_reason, '')); p public.album_packs; i integer;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select id into u from profiles where lower(handle) = lower(trim(both '@' from trim(coalesce(p_handle, ''))));
  if u is null then raise exception 'target_not_found'; end if;
  if n < 1 or n > 20 then raise exception 'pack_qty'; end if;
  if coalesce(p_kind, '') not in ('onix', 'prisma') then raise exception 'pack_kind'; end if;
  if char_length(r) < 3 then raise exception 'pack_reason'; end if;
  for i in 1..n loop
    insert into album_packs (user_id, kind, origin, state, reason, granted_by) values (u, p_kind, 'studio', 'fechado', left(r, 200), auth.uid())
    returning * into p;
  end loop;
  perform public.notif_add(u, 'album_pacote', null, null, p.id,
    case when n = 1 then 'Você ganhou um pacote de figurinhas' else 'Você ganhou ' || n || ' pacotes de figurinhas' end,
    left(r, 200), '/album/pacotes', jsonb_build_object('kind', p_kind, 'qty', n));
  return public.studio_packs('historico');
end; $$;

create or replace function public.studio_pack_undo(p_pack uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update album_packs set state = 'desfeito', decided_at = now(), decided_by = auth.uid()
  where id = p_pack and state = 'fechado' and origin = 'studio';
  if not found then raise exception 'pack_already_opened'; end if;
  return public.studio_packs('historico');
end; $$;

create or replace function public.studio_pack_decide(p_pack uuid, p_release boolean, p_note text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.album_packs; nt text := nullif(trim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select * into p from album_packs where id = p_pack for update;
  if not found then raise exception 'not_found'; end if;
  if p.state not in ('retido', 'negado') then raise exception 'not_held'; end if;
  if not p_release and nt is null then raise exception 'pack_reason'; end if;
  update album_packs set state = case when p_release then 'fechado' else 'negado' end, decided_at = now(), decided_by = auth.uid(), decision_note = left(nt, 300)
  where id = p.id returning * into p;
  update album_reviews set state = 'respondida', answer = left(coalesce(nt, 'Liberado.'), 300), answered_at = now(), answered_by = auth.uid() where pack_id = p.id;
  if p_release then
    perform public.album_pack_notify(p);
  else
    perform public.notif_add(p.user_id, 'album_revisao', null, null, p.id, 'Revisão do seu pacote', left(nt, 200), '/album/pacotes', '{}'::jsonb);
  end if;
  return public.studio_pack_json(p);
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Avisos: os tipos do álbum ficam no grupo da Jornada
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.notif_group(p_kind text) returns text
language sql immutable as $$
  select case
    when p_kind in ('resposta', 'acompanhando', 'mencao', 'reacao') then 'comunidade'
    when p_kind like 'clube_%' or p_kind like 'jogatina_%' or p_kind = 'parte' then 'grupos'
    when p_kind in ('seguiu', 'pacto', 'pacto_zerou', 'lista_convite') then 'amigos'
    when p_kind in ('lancamento', 'retomada', 'semana', 'mes', 'revisao', 'album_pacote', 'album_retido', 'album_revisao') then 'jornada'
    else 'sistema'
  end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------------------------------------------
revoke all on function public.album_pack_notify(public.album_packs) from public, anon, authenticated;
revoke all on function public.album_count(public.histories, boolean) from public, anon, authenticated;
revoke all on function public.album_on_history_insert() from public, anon, authenticated;
revoke all on function public.album_on_history_state() from public, anon, authenticated;
revoke all on function public.album_sticker_json(public.album_stickers) from public, anon, authenticated;
revoke all on function public.album_catalog_json(boolean) from public, anon, authenticated;
revoke all on function public.album_pack_json(public.album_packs) from public, anon, authenticated;
revoke all on function public.album_draw(text) from public, anon, authenticated;
revoke all on function public.studio_pack_json(public.album_packs) from public, anon, authenticated;
revoke all on function public.notif_group(text) from public, anon, authenticated;

revoke all on function public.album_state() from public, anon;
revoke all on function public.album_closed_count() from public, anon;
revoke all on function public.album_open(uuid) from public, anon;
revoke all on function public.album_paste(uuid) from public, anon;
revoke all on function public.album_paste_all() from public, anon;
revoke all on function public.album_review_ask(uuid, text) from public, anon;
revoke all on function public.studio_album_catalog() from public, anon;
revoke all on function public.studio_album_book_save(jsonb) from public, anon;
revoke all on function public.studio_album_book_delete(uuid) from public, anon;
revoke all on function public.studio_album_page_save(jsonb) from public, anon;
revoke all on function public.studio_album_page_delete(uuid) from public, anon;
revoke all on function public.studio_album_sticker_save(jsonb) from public, anon;
revoke all on function public.studio_album_sticker_delete(uuid) from public, anon;
revoke all on function public.studio_packs(text) from public, anon;
revoke all on function public.studio_pack_counts() from public, anon;
revoke all on function public.studio_pack_give(text, integer, text, text) from public, anon;
revoke all on function public.studio_pack_undo(uuid) from public, anon;
revoke all on function public.studio_pack_decide(uuid, boolean, text) from public, anon;

grant execute on function public.album_state() to authenticated;
grant execute on function public.album_closed_count() to authenticated;
grant execute on function public.album_open(uuid) to authenticated;
grant execute on function public.album_paste(uuid) to authenticated;
grant execute on function public.album_paste_all() to authenticated;
grant execute on function public.album_review_ask(uuid, text) to authenticated;
grant execute on function public.studio_album_catalog() to authenticated;
grant execute on function public.studio_album_book_save(jsonb) to authenticated;
grant execute on function public.studio_album_book_delete(uuid) to authenticated;
grant execute on function public.studio_album_page_save(jsonb) to authenticated;
grant execute on function public.studio_album_page_delete(uuid) to authenticated;
grant execute on function public.studio_album_sticker_save(jsonb) to authenticated;
grant execute on function public.studio_album_sticker_delete(uuid) to authenticated;
grant execute on function public.studio_packs(text) to authenticated;
grant execute on function public.studio_pack_counts() to authenticated;
grant execute on function public.studio_pack_give(text, integer, text, text) to authenticated;
grant execute on function public.studio_pack_undo(uuid) to authenticated;
grant execute on function public.studio_pack_decide(uuid, boolean, text) to authenticated;
