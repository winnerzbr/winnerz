-- WinnerZ — Tradutor de tela: glossário por jogo e caderno das traduções.
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez. Precisa da 0075 e da 0076.
--
-- 1. Glossário do jogo: nomes de personagens, lugares, itens e golpes, para a tradução sair sempre igual.
--    A IA anota sozinha (origem 'ia'); quando a pessoa corrige ou cria um termo, ele vira dela (origem 'pessoa')
--    e a IA não mexe mais nele.
-- 2. Glossário da Galera (ligado por padrão; desliga em Preferências → prefs.trGalera = false): quem joga o mesmo
--    jogo aproveita os termos dos outros. Os da IA entram direto; os escritos à mão só entram quando pelo menos
--    duas pessoas escreveram a mesma coisa (assim ninguém sozinho muda a tradução dos outros).
--    Só os termos circulam, nunca o texto traduzido.
-- 3. Caderno do jogo: cada tradução fica guardada como texto (sem a foto), para reler a história depois.
--
-- As tabelas não são lidas direto pelo app: tudo passa pelas funções abaixo.
-- O servidor (api/retomada.ts, kind 'traduzir') usa tr_context e tr_store com a chave secreta.

-- ------------------------------------------------------------------------------------------------
-- 1. Tabelas
create table if not exists public.tr_terms (
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  src_key text not null,                 -- o original, minúsculo e sem espaços sobrando (chave)
  src text not null,                     -- o original como apareceu
  pt text not null,                      -- como fica em português
  kind text not null default 'outro' check (kind in ('pessoa', 'lugar', 'item', 'golpe', 'outro')),
  origin text not null default 'ia' check (origin in ('ia', 'pessoa')),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id, src_key),
  check (length(src) between 1 and 60 and length(pt) between 1 and 60)
);
create index if not exists tr_terms_game on public.tr_terms (game_id, src_key);

create table if not exists public.tr_notes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  mode text not null check (mode in ('dialogo', 'menu', 'longo', 'explicar', 'estudo')),
  lang text,
  lines jsonb not null default '[]'::jsonb,  -- [{who, src, pt}]
  explain text,
  created_at timestamptz not null default now()
);
create index if not exists tr_notes_user_game on public.tr_notes (user_id, game_id, created_at desc);

alter table public.tr_terms enable row level security;
alter table public.tr_notes enable row level security;
revoke all on public.tr_terms, public.tr_notes from anon, authenticated;

-- ------------------------------------------------------------------------------------------------
-- 2. Ajudantes
create or replace function public.tr_key(p text) returns text
language sql immutable set search_path = public as $$
  select lower(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g'));
$$;

create or replace function public.tr_shares(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (prefs ->> 'trGalera')::boolean from profiles where id = p_user), true);
$$;

-- ------------------------------------------------------------------------------------------------
-- 3. Para o app (com login)

-- O glossário e o caderno de um jogo (as 60 traduções mais recentes).
create or replace function public.tr_my(p_game text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'tr_login'; end if;
  return jsonb_build_object(
    'terms', coalesce((select jsonb_agg(jsonb_build_object('src', t.src, 'pt', t.pt, 'kind', t.kind, 'origin', t.origin) order by t.src_key)
                       from tr_terms t where t.user_id = me and t.game_id = p_game), '[]'::jsonb),
    'galera', coalesce((select jsonb_agg(x order by x ->> 'src') from (
                         select jsonb_build_object('src', min(t.src), 'pt', t.pt, 'kind', min(t.kind), 'people', count(distinct t.user_id)) as x
                           from tr_terms t
                          where t.game_id = p_game and t.user_id <> me and public.tr_shares(t.user_id)
                            and not public.blocked_between(me, t.user_id)
                            and not exists (select 1 from tr_terms m where m.user_id = me and m.game_id = p_game and m.src_key = t.src_key)
                          group by t.src_key, t.pt
                         having bool_or(t.origin = 'ia') or count(distinct t.user_id) >= 2
                          limit 200) g), '[]'::jsonb),
    'notes', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'mode', n.mode, 'lang', n.lang, 'lines', n.lines, 'explain', n.explain, 'at', n.created_at) order by n.created_at desc)
                       from (select * from tr_notes where user_id = me and game_id = p_game order by created_at desc limit 60) n), '[]'::jsonb),
    'share', public.tr_shares(me)
  );
end $$;

-- Cria, corrige ou apaga (p_pt vazio) um termo. Um termo escrito pela pessoa a IA não muda mais.
create or replace function public.tr_term_set(p_game text, p_src text, p_pt text, p_kind text default 'outro') returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); k text := public.tr_key(p_src); v text := btrim(coalesce(p_pt, ''));
begin
  if me is null then raise exception 'tr_login'; end if;
  if k = '' or length(k) > 60 then raise exception 'tr_termo'; end if;
  if v = '' then delete from tr_terms where user_id = me and game_id = p_game and src_key = k; return; end if;
  if length(v) > 60 then raise exception 'tr_termo'; end if;
  if not exists (select 1 from games where id = p_game) then raise exception 'tr_jogo'; end if;
  if (select count(*) from tr_terms where user_id = me and game_id = p_game) >= 400
     and not exists (select 1 from tr_terms where user_id = me and game_id = p_game and src_key = k) then raise exception 'tr_cheio'; end if;
  insert into tr_terms (user_id, game_id, src_key, src, pt, kind, origin, updated_at)
  values (me, p_game, k, left(btrim(p_src), 60), v, case when p_kind in ('pessoa', 'lugar', 'item', 'golpe') then p_kind else 'outro' end, 'pessoa', now())
  on conflict (user_id, game_id, src_key) do update set pt = excluded.pt, kind = excluded.kind, origin = 'pessoa', updated_at = now();
end $$;

-- Apaga uma tradução do caderno (ou o caderno inteiro do jogo, com p_id nulo).
create or replace function public.tr_note_delete(p_game text, p_id bigint default null) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'tr_login'; end if;
  delete from tr_notes where user_id = me and game_id = p_game and (p_id is null or id = p_id);
end $$;

-- ------------------------------------------------------------------------------------------------
-- 4. Para o servidor (chave secreta)

-- O que a IA precisa saber antes de traduzir: os termos da pessoa e, se ela usa o da Galera, os da comunidade.
create or replace function public.tr_context(p_user uuid, p_game text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'title', (select title from games where id = p_game),
    'mine', coalesce((select jsonb_agg(jsonb_build_object('src', src, 'pt', pt, 'kind', kind))
                      from (select * from tr_terms where user_id = p_user and game_id = p_game order by origin desc, updated_at desc limit 120) a), '[]'::jsonb),
    'galera', case when public.tr_shares(p_user) then coalesce((select jsonb_agg(jsonb_build_object('src', s, 'pt', pt, 'kind', k)) from (
                 select min(t.src) as s, t.pt, min(t.kind) as k, count(distinct t.user_id) as n
                   from tr_terms t
                  where t.game_id = p_game and t.user_id <> p_user and public.tr_shares(t.user_id)
                    and not public.blocked_between(p_user, t.user_id)
                    and not exists (select 1 from tr_terms m where m.user_id = p_user and m.game_id = p_game and m.src_key = t.src_key)
                  group by t.src_key, t.pt
                 having bool_or(t.origin = 'ia') or count(distinct t.user_id) >= 2
                  order by n desc limit 80) g), '[]'::jsonb) else '[]'::jsonb end
  );
$$;

-- Guarda uma tradução no caderno e os termos novos que a IA anotou (sem tocar nos que a pessoa escreveu).
-- Devolve o id da tradução no caderno (null se não havia texto).
create or replace function public.tr_store(p_user uuid, p_game text, p_mode text, p_lang text, p_lines jsonb, p_explain text, p_terms jsonb)
returns bigint
language plpgsql security definer set search_path = public as $$
declare nid bigint; t jsonb; k text; n int;
begin
  if not exists (select 1 from games where id = p_game) then return null; end if;
  if jsonb_typeof(p_lines) = 'array' and jsonb_array_length(p_lines) > 0 then
    insert into tr_notes (user_id, game_id, mode, lang, lines, explain)
    values (p_user, p_game, case when p_mode in ('dialogo', 'menu', 'longo', 'explicar', 'estudo') then p_mode else 'dialogo' end,
            left(p_lang, 12), p_lines, nullif(left(coalesce(p_explain, ''), 1200), ''))
    returning id into nid;
    -- O caderno guarda as 500 mais recentes de cada jogo.
    delete from tr_notes where id in (select id from tr_notes where user_id = p_user and game_id = p_game order by created_at desc offset 500);
  end if;
  select count(*) into n from tr_terms where user_id = p_user and game_id = p_game;
  for t in select * from jsonb_array_elements(case when jsonb_typeof(p_terms) = 'array' then p_terms else '[]'::jsonb end) limit 20 loop
    k := public.tr_key(t ->> 'src');
    if k = '' or length(k) > 60 or btrim(coalesce(t ->> 'pt', '')) = '' or length(btrim(t ->> 'pt')) > 60 then continue; end if;
    if n >= 400 then exit; end if;
    insert into tr_terms (user_id, game_id, src_key, src, pt, kind, origin)
    values (p_user, p_game, k, left(btrim(t ->> 'src'), 60), btrim(t ->> 'pt'),
            case when t ->> 'kind' in ('pessoa', 'lugar', 'item', 'golpe') then t ->> 'kind' else 'outro' end, 'ia')
    on conflict (user_id, game_id, src_key) do nothing;
    if found then n := n + 1; end if;
  end loop;
  return nid;
end $$;

-- ------------------------------------------------------------------------------------------------
-- 5. Permissões
revoke all on function public.tr_key(text) from public, anon, authenticated;
revoke all on function public.tr_shares(uuid) from public, anon, authenticated;
revoke all on function public.tr_my(text) from public, anon;
revoke all on function public.tr_term_set(text, text, text, text) from public, anon;
revoke all on function public.tr_note_delete(text, bigint) from public, anon;
revoke all on function public.tr_context(uuid, text) from public, anon, authenticated;
revoke all on function public.tr_store(uuid, text, text, text, jsonb, text, jsonb) from public, anon, authenticated;
grant execute on function public.tr_my(text) to authenticated;
grant execute on function public.tr_term_set(text, text, text, text) to authenticated;
grant execute on function public.tr_note_delete(text, bigint) to authenticated;
grant execute on function public.tr_context(uuid, text) to service_role;
grant execute on function public.tr_store(uuid, text, text, text, jsonb, text, jsonb) to service_role;
grant execute on function public.tr_key(text) to service_role;
grant execute on function public.tr_shares(uuid) to service_role;
