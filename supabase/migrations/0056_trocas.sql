-- 0056 · Álbum, etapa A3: trocas de figurinhas
--
-- Duas pessoas trocam repetidas. Quem propõe escolhe até 5 repetidas suas e até 5 repetidas da outra pessoa que
-- faltam para si; quem recebe aceita ou recusa (quem enviou pode cancelar; a proposta expira em 7 dias). No aceite o
-- banco confere tudo de novo e troca os dois lados de uma vez (as recebidas vão para a bandeja). Só repetidas entram
-- (cada um fica sempre com pelo menos uma cópia) e as Lendárias ficam fora. Limites: contas com menos de 7 dias ainda
-- não trocam; até 5 propostas enviadas em aberto; uma proposta aberta por dupla; bloqueio vale para os dois lados;
-- "Aceito propostas de troca" (ligado se a pessoa nunca mexeu). Sugestões de troca casam o que um tem sobrando com o
-- que falta ao outro. Nada é vendido. Pode rodar mais de uma vez. Precisa da 0053.

create table if not exists public.album_trades (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  give uuid[] not null,          -- vão de from_user para to_user
  take uuid[] not null,          -- vão de to_user para from_user
  message text,
  state text not null default 'aberta' check (state in ('aberta', 'aceita', 'recusada', 'cancelada', 'expirada', 'falhou')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check (from_user <> to_user)
);
create index if not exists album_trades_from on public.album_trades (from_user, created_at desc);
create index if not exists album_trades_to on public.album_trades (to_user, created_at desc);
create index if not exists album_trades_open on public.album_trades (created_at) where state = 'aberta';
alter table public.album_trades enable row level security;
revoke all on public.album_trades from anon, authenticated;

create table if not exists public.album_trade_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  open boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.album_trade_prefs enable row level security;
revoke all on public.album_trade_prefs from anon, authenticated;

-- Os avisos das trocas ficam no grupo Jornada, com os do álbum.
create or replace function public.notif_group(p_kind text) returns text
language sql immutable as $$
  select case
    when p_kind in ('resposta', 'acompanhando', 'mencao', 'reacao') then 'comunidade'
    when p_kind like 'clube_%' or p_kind like 'jogatina_%' or p_kind = 'parte' then 'grupos'
    when p_kind in ('seguiu', 'pacto', 'pacto_zerou', 'lista_convite') then 'amigos'
    when p_kind in ('lancamento', 'retomada', 'semana', 'mes', 'revisao') or p_kind like 'album_%' then 'jornada'
    else 'sistema'
  end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Regras
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.album_tradeable(p_sticker uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from album_stickers s join album_pages pg on pg.id = s.page_id join album_books b on b.id = pg.book_id
    where s.id = p_sticker and s.active and b.published and s.tier <> 'lendaria');
$$;

create or replace function public.album_trade_is_open(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select open from album_trade_prefs where user_id = p_user), true);
$$;

-- Quando a conta passa a poder trocar (7 dias depois de criada); null quando já pode.
create or replace function public.album_trade_new_until(p_user uuid) returns timestamptz
language sql stable security definer set search_path = public as $$
  select case when p.created_at > now() - interval '7 days' then p.created_at + interval '7 days' end from profiles p where p.id = p_user;
$$;

create or replace function public.album_trade_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_blocks where kind = 'bloquear' and ((blocker = a and blocked = b) or (blocker = b and blocked = a)));
$$;

-- Repetidas trocáveis de alguém (ids), e o que falta para alguém entre as trocáveis.
create or replace function public.album_spares_of(p_user uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select i.sticker_id from album_items i where i.user_id = p_user and i.qty >= 2 and public.album_tradeable(i.sticker_id);
$$;
create or replace function public.album_misses_of(p_user uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select s.id from album_stickers s join album_pages pg on pg.id = s.page_id join album_books b on b.id = pg.book_id
  where s.active and b.published and s.tier <> 'lendaria'
    and not exists (select 1 from album_items i where i.user_id = p_user and i.sticker_id = s.id and i.qty > 0);
$$;

create or replace function public.album_trade_json(t public.album_trades) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', t.id, 'from', public.person_json(t.from_user), 'to', public.person_json(t.to_user),
    'give', to_jsonb(t.give), 'take', to_jsonb(t.take), 'message', t.message, 'state', t.state,
    'createdAt', t.created_at, 'decidedAt', t.decided_at, 'expiresAt', t.created_at + interval '7 days', 'mine', t.from_user = auth.uid());
$$;

create or replace function public.album_trade_expire() returns void
language sql volatile security definer set search_path = public as $$
  update album_trades set state = 'expirada', decided_at = now() where state = 'aberta' and created_at < now() - interval '7 days';
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- O que a pessoa vê
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.album_trade_state() returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_logged'; end if;
  perform public.album_trade_expire();
  return jsonb_build_object(
    'open', public.album_trade_is_open(me),
    'newUntil', public.album_trade_new_until(me),
    'received', coalesce((select jsonb_agg(public.album_trade_json(t) order by t.created_at desc) from album_trades t where t.to_user = me and t.state = 'aberta'), '[]'::jsonb),
    'sent', coalesce((select jsonb_agg(public.album_trade_json(t) order by t.created_at desc) from album_trades t where t.from_user = me and t.state = 'aberta'), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(public.album_trade_json(t) order by coalesce(t.decided_at, t.created_at) desc) from album_trades t where t.id in (
      select id from album_trades where (from_user = me or to_user = me) and state <> 'aberta' order by coalesce(decided_at, created_at) desc limit 40)), '[]'::jsonb));
end; $$;

create or replace function public.album_trade_prefs_set(p_open boolean) returns boolean
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_logged'; end if;
  insert into album_trade_prefs (user_id, open) values (me, coalesce(p_open, true))
  on conflict (user_id) do update set open = excluded.open, updated_at = now();
  return coalesce(p_open, true);
end; $$;

-- Trocas sugeridas: quem tem repetida que falta para mim e precisa de uma repetida minha. Amigos primeiro, depois quem
-- eu sigo, depois o resto (até 20 pessoas). give: minhas repetidas que faltam a ela; take: as dela que faltam a mim.
create or replace function public.album_trade_matches() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_logged'; end if;
  return coalesce((select jsonb_agg(x.j order by x.friend desc, x.follow desc, x.n desc, x.handle) from (
    select jsonb_build_object('person', public.person_json(o.uid), 'friend', public.are_friends(me, o.uid),
        'follow', exists (select 1 from follows f where f.follower = me and f.followed = o.uid),
        'give', o.give, 'take', o.take,
        'pending', exists (select 1 from album_trades t where t.state = 'aberta' and ((t.from_user = me and t.to_user = o.uid) or (t.from_user = o.uid and t.to_user = me)))) j,
      public.are_friends(me, o.uid) friend, exists (select 1 from follows f where f.follower = me and f.followed = o.uid) follow,
      least(jsonb_array_length(o.give), jsonb_array_length(o.take)) n, o.handle
    from (
      select p.id uid, p.handle,
        (select coalesce(jsonb_agg(g order by g), '[]'::jsonb) from (select public.album_spares_of(me) g intersect select public.album_misses_of(p.id)) a) give,
        (select coalesce(jsonb_agg(g order by g), '[]'::jsonb) from (select public.album_spares_of(p.id) g intersect select public.album_misses_of(me)) b) take
      from profiles p
      where p.id <> me and p.handle is not null
        and p.id in (select distinct user_id from album_items where qty >= 2)
        and public.album_trade_is_open(p.id) and public.album_trade_new_until(p.id) is null
        and not public.album_trade_blocked(me, p.id)
    ) o
    where jsonb_array_length(o.give) > 0 and jsonb_array_length(o.take) > 0
    order by 2 desc, 3 desc, 4 desc limit 20) x), '[]'::jsonb);
end; $$;

-- Para montar uma proposta a um @: as repetidas dela que faltam para mim e se ela pode trocar.
create or replace function public.album_trade_peer(p_handle text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); o profiles; why text := null;
begin
  if me is null then raise exception 'not_logged'; end if;
  select * into o from profiles where lower(handle) = lower(trim(both '@' from coalesce(p_handle, '')));
  if not found then raise exception 'target_not_found'; end if;
  if o.id = me then why := 'trade_self';
  elsif public.album_trade_blocked(me, o.id) then why := 'target_not_found';
  elsif not public.album_trade_is_open(o.id) then why := 'trade_closed';
  elsif public.album_trade_new_until(o.id) is not null then why := 'trade_new_other';
  end if;
  if why = 'target_not_found' then raise exception 'target_not_found'; end if;
  return jsonb_build_object('person', public.person_json(o.id), 'why', why,
    'take', case when why is null then coalesce((select jsonb_agg(g order by g) from (select public.album_spares_of(o.id) g intersect select public.album_misses_of(me)) a), '[]'::jsonb) else '[]'::jsonb end,
    'theyMiss', case when why is null then coalesce((select jsonb_agg(g) from (select public.album_spares_of(me) g intersect select public.album_misses_of(o.id)) b), '[]'::jsonb) else '[]'::jsonb end,
    'pending', exists (select 1 from album_trades t where t.state = 'aberta' and ((t.from_user = me and t.to_user = o.id) or (t.from_user = o.id and t.to_user = me))));
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Propor, responder, cancelar
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.album_trade_propose(p_handle text, p_give uuid[], p_take uuid[], p_message text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); o profiles; t album_trades; g uuid; myh text;
begin
  if me is null then raise exception 'not_logged'; end if;
  if public.album_trade_new_until(me) is not null then raise exception 'trade_new_account'; end if;
  select * into o from profiles where lower(handle) = lower(trim(both '@' from coalesce(p_handle, '')));
  if not found or public.album_trade_blocked(me, o.id) then raise exception 'target_not_found'; end if;
  if o.id = me then raise exception 'trade_self'; end if;
  if not public.album_trade_is_open(o.id) then raise exception 'trade_closed'; end if;
  if public.album_trade_new_until(o.id) is not null then raise exception 'trade_new_other'; end if;
  if coalesce(cardinality(p_give), 0) not between 1 and 5 or coalesce(cardinality(p_take), 0) not between 1 and 5 then raise exception 'trade_size'; end if;
  if (select count(distinct x) from unnest(p_give) x) <> cardinality(p_give) or (select count(distinct x) from unnest(p_take) x) <> cardinality(p_take) then raise exception 'trade_size'; end if;
  perform public.album_trade_expire();
  if (select count(*) from album_trades where from_user = me and state = 'aberta') >= 5 then raise exception 'trade_limit'; end if;
  if exists (select 1 from album_trades where state = 'aberta' and ((from_user = me and to_user = o.id) or (from_user = o.id and to_user = me))) then raise exception 'trade_pair_open'; end if;
  foreach g in array p_give loop
    if not public.album_tradeable(g) then raise exception 'trade_lendaria'; end if;
    if coalesce((select qty from album_items where user_id = me and sticker_id = g), 0) < 2 then raise exception 'trade_not_spare'; end if;
  end loop;
  foreach g in array p_take loop
    if not public.album_tradeable(g) then raise exception 'trade_lendaria'; end if;
    if coalesce((select qty from album_items where user_id = o.id and sticker_id = g), 0) < 2 then raise exception 'trade_their_spare'; end if;
  end loop;
  insert into album_trades (from_user, to_user, give, take, message)
  values (me, o.id, p_give, p_take, nullif(left(trim(coalesce(p_message, '')), 200), '')) returning * into t;
  select handle into myh from profiles where id = me;
  perform public.notif_add(o.id, 'album_troca', me, null, t.id, '@' || coalesce(myh, 'alguém') || ' propôs uma troca de figurinhas',
    'Você recebe ' || cardinality(p_give) || ' e dá ' || cardinality(p_take) || '.', '/album/trocas', '{}'::jsonb);
  return public.album_trade_json(t);
end; $$;

-- Responder: aceitar troca tudo de uma vez; se algo mudou desde a proposta, ela vira "falhou" e nada muda.
create or replace function public.album_trade_answer(p_trade uuid, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); t album_trades; g uuid; ok boolean := true; myh text;
begin
  if me is null then raise exception 'not_logged'; end if;
  perform public.album_trade_expire();
  select * into t from album_trades where id = p_trade for update;
  if not found or t.to_user <> me then raise exception 'not_found'; end if;
  if t.state <> 'aberta' then raise exception 'trade_not_open'; end if;
  select handle into myh from profiles where id = me;
  if not coalesce(p_accept, false) then
    update album_trades set state = 'recusada', decided_at = now() where id = t.id returning * into t;
    perform public.notif_add(t.from_user, 'album_troca_nao', me, null, t.id, '@' || coalesce(myh, 'alguém') || ' recusou a sua troca', '', '/album/trocas', '{}'::jsonb);
    return public.album_trade_json(t);
  end if;
  if public.album_trade_blocked(t.from_user, me) or public.album_trade_new_until(me) is not null then raise exception 'trade_new_account'; end if;
  -- trava as linhas dos dois e confere tudo de novo
  perform 1 from album_items where (user_id = t.from_user and sticker_id = any (t.give || t.take)) or (user_id = me and sticker_id = any (t.give || t.take)) for update;
  foreach g in array t.give loop
    if not public.album_tradeable(g) or coalesce((select qty from album_items where user_id = t.from_user and sticker_id = g), 0) < 2 then ok := false; end if;
  end loop;
  foreach g in array t.take loop
    if not public.album_tradeable(g) or coalesce((select qty from album_items where user_id = me and sticker_id = g), 0) < 2 then ok := false; end if;
  end loop;
  if not ok then
    update album_trades set state = 'falhou', decided_at = now() where id = t.id returning * into t;
    perform public.notif_add(t.from_user, 'album_troca_nao', me, null, t.id, 'Uma troca com @' || coalesce(myh, 'alguém') || ' não deu certo',
      'Uma das figurinhas deixou de ser repetida antes do aceite. Nada mudou nas coleções.', '/album/trocas', '{}'::jsonb);
    return public.album_trade_json(t);
  end if;
  foreach g in array t.give loop
    update album_items set qty = qty - 1 where user_id = t.from_user and sticker_id = g;
    insert into album_items (user_id, sticker_id, qty) values (me, g, 1) on conflict (user_id, sticker_id) do update set qty = album_items.qty + 1;
  end loop;
  foreach g in array t.take loop
    update album_items set qty = qty - 1 where user_id = me and sticker_id = g;
    insert into album_items (user_id, sticker_id, qty) values (t.from_user, g, 1) on conflict (user_id, sticker_id) do update set qty = album_items.qty + 1;
  end loop;
  update album_trades set state = 'aceita', decided_at = now() where id = t.id returning * into t;
  perform public.notif_add(t.from_user, 'album_troca_ok', me, null, t.id, '@' || coalesce(myh, 'alguém') || ' aceitou a sua troca',
    'As figurinhas novas estão na bandeja do álbum.', '/album/trocas', '{}'::jsonb);
  return public.album_trade_json(t);
end; $$;

create or replace function public.album_trade_cancel(p_trade uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); t album_trades;
begin
  if me is null then raise exception 'not_logged'; end if;
  select * into t from album_trades where id = p_trade for update;
  if not found or t.from_user <> me then raise exception 'not_found'; end if;
  if t.state <> 'aberta' then raise exception 'trade_not_open'; end if;
  update album_trades set state = 'cancelada', decided_at = now() where id = t.id returning * into t;
  return public.album_trade_json(t);
end; $$;

-- O estado do álbum ganha a contagem de propostas recebidas em aberto (para o selo da aba Trocas).
create or replace function public.album_state() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_logged'; end if;
  return public.album_catalog_json(public.is_admin()) || jsonb_build_object(
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.sticker_id, 'qty', i.qty, 'pasted', i.pasted)) from album_items i where i.user_id = me and i.qty > 0), '[]'::jsonb),
    'packs', coalesce((select jsonb_agg(public.album_pack_json(p) order by p.created_at desc) from album_packs p
      where p.id in (select id from album_packs where user_id = me and state <> 'desfeito' order by created_at desc limit 60)), '[]'::jsonb),
    'stats', coalesce((select jsonb_build_object('opened', s.opened, 'noRare', s.no_rare) from album_stats s where s.user_id = me), jsonb_build_object('opened', 0, 'noRare', 0)),
    'tradesIn', (select count(*) from album_trades where to_user = me and state = 'aberta' and created_at > now() - interval '7 days'));
end; $$;

-- Studio: o histórico de todas as trocas (só consulta).
create or replace function public.studio_album_trades() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return coalesce((select jsonb_agg(public.album_trade_json(t) order by t.created_at desc) from album_trades t
    where t.id in (select id from album_trades order by created_at desc limit 200)), '[]'::jsonb);
end; $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------------------------------------------
revoke all on function public.album_tradeable(uuid) from public, anon, authenticated;
revoke all on function public.album_trade_is_open(uuid) from public, anon, authenticated;
revoke all on function public.album_trade_new_until(uuid) from public, anon, authenticated;
revoke all on function public.album_trade_blocked(uuid, uuid) from public, anon, authenticated;
revoke all on function public.album_spares_of(uuid) from public, anon, authenticated;
revoke all on function public.album_misses_of(uuid) from public, anon, authenticated;
revoke all on function public.album_trade_json(public.album_trades) from public, anon, authenticated;
revoke all on function public.album_trade_expire() from public, anon, authenticated;
revoke all on function public.notif_group(text) from public, anon, authenticated;

revoke all on function public.album_trade_state() from public, anon;
revoke all on function public.album_trade_prefs_set(boolean) from public, anon;
revoke all on function public.album_trade_matches() from public, anon;
revoke all on function public.album_trade_peer(text) from public, anon;
revoke all on function public.album_trade_propose(text, uuid[], uuid[], text) from public, anon;
revoke all on function public.album_trade_answer(uuid, boolean) from public, anon;
revoke all on function public.album_trade_cancel(uuid) from public, anon;
revoke all on function public.album_state() from public, anon;
revoke all on function public.studio_album_trades() from public, anon;

grant execute on function public.album_trade_state() to authenticated;
grant execute on function public.album_trade_prefs_set(boolean) to authenticated;
grant execute on function public.album_trade_matches() to authenticated;
grant execute on function public.album_trade_peer(text) to authenticated;
grant execute on function public.album_trade_propose(text, uuid[], uuid[], text) to authenticated;
grant execute on function public.album_trade_answer(uuid, boolean) to authenticated;
grant execute on function public.album_trade_cancel(uuid) to authenticated;
grant execute on function public.album_state() to authenticated;
grant execute on function public.studio_album_trades() to authenticated;
