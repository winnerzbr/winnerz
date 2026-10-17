-- =================================================================================================================
-- 0070 · Etapa 7, E7.4: WinnerZ Awards completo
--
-- Tudo novo nasce desligado: uma edição sem datas de indicação, sem figurinha e sem revelação ao vivo continua
-- igual à versão simples.
-- 1. Indicação aberta: entre nominations_opens e nominations_closes, quem tem conta sugere até 3 jogos por categoria.
--    A administração vê a contagem e escolhe os finalistas (os indicados de sempre).
-- 2. Revelação na live: a apresentação da revelação grava em que categoria e passo está (award_reveal_live); o overlay
--    do OBS do canal mostra a categoria, os indicados e, no passo do vencedor, quem ganhou.
-- 3. Figurinha da edição: a administração liga uma figurinha do álbum à edição (awards.sticker_id, gravado como as
--    demais colunas da edição); quem votou pega a figurinha quando o
--    resultado fica público (uma por conta).
-- 4. Histórico: as edições com resultado público e os vencedores de cada categoria (award_winners).
-- Pode rodar mais de uma vez. Precisa da 0006, da 0007 e da 0053.
-- =================================================================================================================

alter table public.awards add column if not exists nominations_opens timestamptz;
alter table public.awards add column if not exists nominations_closes timestamptz;
alter table public.awards add column if not exists sticker_id uuid references public.album_stickers (id) on delete set null;

create table if not exists public.award_suggestions (
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.award_categories (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, category_id, game_id)
);
create index if not exists award_suggestions_cat on public.award_suggestions (category_id, game_id);
alter table public.award_suggestions enable row level security;
revoke all on public.award_suggestions from anon, authenticated;

create table if not exists public.award_sticker_claims (
  award_id uuid not null references public.awards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (award_id, user_id)
);
alter table public.award_sticker_claims enable row level security;
revoke all on public.award_sticker_claims from anon, authenticated;

create table if not exists public.award_reveal_live (
  award_id uuid primary key references public.awards (id) on delete cascade,
  category_id uuid references public.award_categories (id) on delete set null,
  step text not null default 'categoria' check (step in ('categoria', 'indicados', 'vencedor', 'fim')),
  updated_at timestamptz not null default now()
);
alter table public.award_reveal_live enable row level security;
revoke all on public.award_reveal_live from anon, authenticated;

create or replace function public.award_nominations_open(p_award uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from awards a where a.id = p_award and a.published and a.nominations_opens is not null and a.nominations_opens <= now()
                 and (a.nominations_closes is null or a.nominations_closes > now()));
$$;

-- Indicar (p_on true) ou tirar (false) um jogo numa categoria, durante a indicação aberta. Até 3 por categoria.
create or replace function public.award_suggest(p_category uuid, p_game text, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); aw uuid := (select award_id from award_categories where id = p_category);
begin
  if me is null then raise exception 'not_logged'; end if;
  if aw is null then raise exception 'not_found'; end if;
  if not public.award_nominations_open(aw) then raise exception 'award_nominations_closed'; end if;
  if exists (select 1 from profiles where id = me and suspended_until > now()) then raise exception 'award_blocked'; end if;
  if coalesce(p_on, true) then
    if not exists (select 1 from games where id = p_game) then raise exception 'not_found'; end if;
    if (select count(*) from award_suggestions where user_id = me and category_id = p_category) >= 3 then raise exception 'award_suggest_limit'; end if;
    insert into award_suggestions (user_id, category_id, game_id) values (me, p_category, p_game) on conflict do nothing;
  else
    delete from award_suggestions where user_id = me and category_id = p_category and game_id = p_game;
  end if;
  return public.award_my_suggestions(aw);
end; $$;

-- As suas indicações na edição: [{categoryId, game}].
create or replace function public.award_my_suggestions(p_award uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('categoryId', s.category_id, 'game', public.game_json(s.game_id)) order by s.created_at), '[]'::jsonb)
  from award_suggestions s join award_categories c on c.id = s.category_id
  where s.user_id = auth.uid() and c.award_id = p_award;
$$;

-- Administração: a contagem das indicações por categoria (as mais indicadas primeiro).
create or replace function public.award_suggestion_counts(p_award uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('categoryId', x.category_id, 'game', public.game_json(x.game_id), 'n', x.n) order by x.category_id, x.n desc)
    from (select s.category_id, s.game_id, count(*)::integer as n from award_suggestions s join award_categories c on c.id = s.category_id
          where c.award_id = p_award group by s.category_id, s.game_id) x), '[]'::jsonb);
end; $$;

-- Os vencedores de uma edição com resultado público (o mais votado de cada categoria; empate: o primeiro da lista).
create or replace function public.award_winners(p_award uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('categoryId', w.cid, 'category', w.cname, 'game', public.game_json(w.game_id), 'votes', w.votes) order by w.cpos), '[]'::jsonb)
  from (
    select distinct on (c.id) c.id as cid, c.name as cname, c.position as cpos, n.game_id, count(v.user_id)::integer as votes
    from award_categories c join award_nominees n on n.category_id = c.id left join award_votes v on v.nominee_id = n.id
    where c.award_id = p_award
      and exists (select 1 from awards a where a.id = p_award and a.published and coalesce(a.public_results_at, a.results_at) <= now())
    group by c.id, c.name, c.position, n.id, n.game_id, n.position
    order by c.id, count(v.user_id) desc, n.position
  ) w;
$$;

-- A figurinha da edição: qual é, se a pessoa já pegou e se pode pegar.
create or replace function public.award_sticker_state(p_award uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when a.sticker_id is null then null else jsonb_build_object(
    'sticker', (select public.album_sticker_json(s) from album_stickers s where s.id = a.sticker_id),
    'claimed', exists (select 1 from award_sticker_claims k where k.award_id = a.id and k.user_id = auth.uid()),
    'voted', exists (select 1 from award_votes v join award_categories c on c.id = v.category_id where c.award_id = a.id and v.user_id = auth.uid()),
    'open', coalesce(a.published and coalesce(a.public_results_at, a.results_at) <= now(), false)) end
  from awards a where a.id = p_award;
$$;

create or replace function public.award_sticker_claim(p_award uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); a awards; s album_stickers;
begin
  if me is null then raise exception 'not_logged'; end if;
  select * into a from awards where id = p_award;
  if not found or a.sticker_id is null then raise exception 'not_found'; end if;
  if not coalesce(a.published and coalesce(a.public_results_at, a.results_at) <= now(), false) then raise exception 'award_not_yet'; end if;
  if not exists (select 1 from award_votes v join award_categories c on c.id = v.category_id where c.award_id = a.id and v.user_id = me) then raise exception 'award_no_vote'; end if;
  select * into s from album_stickers where id = a.sticker_id;
  if not found then raise exception 'not_found'; end if;
  insert into award_sticker_claims (award_id, user_id) values (a.id, me) on conflict do nothing;
  if not found then raise exception 'award_claimed'; end if;
  insert into album_items (user_id, sticker_id, qty, pasted) values (me, s.id, 1, false)
  on conflict (user_id, sticker_id) do update set qty = album_items.qty + 1;
  return public.award_sticker_state(a.id);
end; $$;

-- Revelação na live: a apresentação diz onde está; o overlay do canal lê.
create or replace function public.award_reveal_set(p_award uuid, p_category uuid, p_step text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  insert into award_reveal_live (award_id, category_id, step, updated_at) values (p_award, p_category, coalesce(p_step, 'categoria'), now())
  on conflict (award_id) do update set category_id = excluded.category_id, step = excluded.step, updated_at = now();
end; $$;

revoke all on function public.award_nominations_open(uuid) from public;
revoke all on function public.award_suggest(uuid, text, boolean) from public, anon;
revoke all on function public.award_my_suggestions(uuid) from public, anon;
revoke all on function public.award_suggestion_counts(uuid) from public, anon;
revoke all on function public.award_winners(uuid) from public;
revoke all on function public.award_sticker_state(uuid) from public;
revoke all on function public.award_sticker_claim(uuid) from public, anon;
revoke all on function public.award_reveal_set(uuid, uuid, text) from public, anon;
grant execute on function public.award_nominations_open(uuid) to anon, authenticated;
grant execute on function public.award_suggest(uuid, text, boolean) to authenticated;
grant execute on function public.award_my_suggestions(uuid) to authenticated;
grant execute on function public.award_suggestion_counts(uuid) to authenticated;
grant execute on function public.award_winners(uuid) to anon, authenticated;
grant execute on function public.award_sticker_state(uuid) to anon, authenticated;
grant execute on function public.award_sticker_claim(uuid) to authenticated;
grant execute on function public.award_reveal_set(uuid, uuid, text) to authenticated;
