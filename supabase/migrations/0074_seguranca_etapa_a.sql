-- WinnerZ — Segurança, etapa A: fechar o que dava para fazer chamando o banco direto, sem passar pelo site.
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez.
--
-- 1. Perfil: o app só grava as preferências direto; o resto passa pelas funções set_my_* (que já têm as regras
--    de @ reservado, filtro de palavras, links https e limites). A data de criação deixa de poder ser mudada.
-- 2. Fotos dos momentos: o caminho da foto precisa estar na pasta de quem é dono do momento.
-- 3. Notas e análises: a lista de análises de um jogo respeita a privacidade escolhida no perfil
--    (a média e a contagem da página do jogo seguem somando todo mundo, sem nomes).
-- 4. Jornada: histórias, sessões e momentos só entram nas suas próprias Jornadas.
-- 5. Álbum: sessão "da Steam/RetroAchievements/Playnite" só vale se veio da ponte de verdade; jogo cadastrado
--    à mão não encurta o tempo da regra; história que mudou de jogo não vira pacote de Jornada.
-- 6. Awards: votar exige e-mail confirmado, @ escolhido, conta com 3 dias ou mais e não estar suspensa.
-- 7. Miudezas: nome inicial das contas novas sem o começo do e-mail; funções antigas fechadas; contador de uso
--    só para quem entrou na conta.

-- ------------------------------------------------------------------------------------------------
-- 1. Perfil
revoke insert, update on public.profiles from anon, authenticated;
grant update (prefs) on public.profiles to authenticated;

-- ------------------------------------------------------------------------------------------------
-- 2. Fotos dos momentos: <id do dono>/<arquivo>
alter table public.timeline_events drop constraint if exists timeline_events_image_owner;
alter table public.timeline_events add constraint timeline_events_image_owner
  check (image_path is null or image_path like user_id::text || '/%') not valid;
do $$ begin
  alter table public.timeline_events validate constraint timeline_events_image_owner;
exception when check_violation then
  raise notice 'Há momentos antigos com foto fora da pasta do dono; as novas gravações já são conferidas.';
end $$;

-- ------------------------------------------------------------------------------------------------
-- 3. Notas e análises
create or replace function public.review_visible(p_owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_owner = auth.uid(), false) or exists (
    select 1 from profiles p
    where p.id = p_owner and p.handle is not null
      and (p.suspended_until is null or p.suspended_until <= now())
      and public.can_see_pillar(p, 'notas', null)
      and (auth.uid() is null or not public.blocked_between(p.id, auth.uid())));
$$;
revoke all on function public.review_visible(uuid) from public;
grant execute on function public.review_visible(uuid) to anon, authenticated;

drop policy if exists "reviews read" on public.reviews;
create policy "reviews read" on public.reviews for select using (public.review_visible(user_id));

-- A média do jogo continua com todas as notas (só números, sem quem deu).
create or replace view public.review_stats with (security_invoker = false) as
select
  game_id,
  count(*)::int as count,
  avg(normalized)::float as avg,
  array[
    count(*) filter (where normalized < 100), count(*) filter (where normalized >= 100 and normalized < 200),
    count(*) filter (where normalized >= 200 and normalized < 300), count(*) filter (where normalized >= 300 and normalized < 400),
    count(*) filter (where normalized >= 400 and normalized < 500), count(*) filter (where normalized >= 500 and normalized < 600),
    count(*) filter (where normalized >= 600 and normalized < 700), count(*) filter (where normalized >= 700 and normalized < 800),
    count(*) filter (where normalized >= 800 and normalized < 900), count(*) filter (where normalized >= 900)
  ]::int[] as dist10
from public.reviews
group by game_id;
revoke all on public.review_stats from anon, authenticated;
grant select on public.review_stats to anon, authenticated;

-- ------------------------------------------------------------------------------------------------
-- 4. Jornada: o que é filho de uma Jornada precisa ser do mesmo dono dela.
create or replace function public.journey_child_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.journey_id is not null and exists (select 1 from journeys where id = new.journey_id and user_id is distinct from new.user_id) then
    raise exception 'journey_owner' using errcode = '42501';
  end if;
  -- (os campos só existem em algumas tabelas; por isso os ifs separados)
  if tg_table_name in ('sessions', 'timeline_events') then
    if new.history_id is not null and exists (select 1 from histories where id = new.history_id and user_id is distinct from new.user_id) then
      raise exception 'journey_owner' using errcode = '42501';
    end if;
  end if;
  if tg_table_name = 'timeline_events' then
    if new.session_id is not null and exists (select 1 from sessions where id = new.session_id and user_id is distinct from new.user_id) then
      raise exception 'journey_owner' using errcode = '42501';
    end if;
  end if;
  return new;
end; $$;
revoke all on function public.journey_child_owner() from public, anon, authenticated;

drop trigger if exists histories_owner on public.histories;
create trigger histories_owner before insert or update of journey_id, user_id on public.histories
  for each row execute function public.journey_child_owner();
drop trigger if exists sessions_owner on public.sessions;
create trigger sessions_owner before insert or update of journey_id, history_id, user_id on public.sessions
  for each row execute function public.journey_child_owner();
drop trigger if exists timeline_events_owner on public.timeline_events;
create trigger timeline_events_owner before insert or update of journey_id, history_id, session_id, user_id on public.timeline_events
  for each row execute function public.journey_child_owner();

-- ------------------------------------------------------------------------------------------------
-- 5. Álbum
-- 5a. A origem de uma sessão (steam, ra, playnite) só fica se a ponte trouxe mesmo essa sessão para a pessoa.
--     Quem grava pelo servidor (as pontes) passa direto.
create or replace function public.sessions_source_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.source is null or coalesce(auth.role(), '') = 'service_role' then return new; end if;
  if tg_op = 'UPDATE' and new.source is not distinct from old.source and new.started_at is not distinct from old.started_at
     and new.minutes is not distinct from old.minutes then return new; end if;
  if not exists (
    select 1 from inferred_sessions i
    where i.user_id = new.user_id and i.provider = new.source
      and i.started_at between new.started_at - interval '2 minutes' and new.started_at + interval '2 minutes'
      and coalesce(new.minutes, 0) <= coalesce(i.minutes, 0) + 1) then
    new.source := null; -- vira uma sessão lançada à mão; a Jornada salva normalmente
  end if;
  return new;
end; $$;
revoke all on function public.sessions_source_guard() from public, anon, authenticated;
drop trigger if exists sessions_source_guard on public.sessions;
create trigger sessions_source_guard before insert or update of source, started_at, minutes on public.sessions
  for each row execute function public.sessions_source_guard();

-- 5b. O começo de cada história guarda de qual jogo ela era.
alter table public.album_starts add column if not exists game_id text;
update public.album_starts s set game_id = j.game_id
from public.histories h join public.journeys j on j.id = h.journey_id
where h.id = s.history_id and s.game_id is null;

create or replace function public.album_on_history_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.state = 'concluida' then perform public.album_count(new, false);
  else insert into album_starts (history_id, user_id, game_id)
       values (new.id, new.user_id, (select game_id from journeys where id = new.journey_id)) on conflict do nothing;
  end if;
  return new;
exception when others then return new; -- o álbum nunca impede a Jornada de salvar
end; $$;

-- 5c. A regra do tempo: tempo de jogo de jogos cadastrados à mão não conta; história que trocou de jogo vira memória.
create or replace function public.album_count(h public.histories, p_live boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  g text; s timestamptz; sg text; v_ttb jsonb; hrs numeric; need numeric; el numeric; bm integer; acct timestamptz;
  recent integer; mem integer; memp integer; r text := null; p public.album_packs;
begin
  select game_id into g from journeys where id = h.journey_id;
  if g is null or h.user_id is null then return; end if;
  if exists (select 1 from album_counted where user_id = h.user_id and game_id = g) then return; end if;
  select started_at, game_id into s, sg from album_starts where history_id = h.id;
  if sg is not null and sg <> g then s := null; end if;

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
  select games.ttb into v_ttb from games where id = g and games.source <> 'manual';
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

-- ------------------------------------------------------------------------------------------------
-- 6. Awards: quem pode votar
create or replace function public.award_vote_block() returns text
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then 'login'
    when not exists (select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null) then 'email'
    when exists (select 1 from profiles p where p.id = auth.uid() and p.suspended_until > now()) then 'suspensa'
    when not exists (select 1 from profiles p where p.id = auth.uid() and p.handle is not null) then 'arroba'
    when exists (select 1 from auth.users u where u.id = auth.uid() and u.created_at > now() - interval '3 days') then 'conta_nova'
  end;
$$;
revoke all on function public.award_vote_block() from public, anon;
grant execute on function public.award_vote_block() to authenticated;

drop policy if exists "votes own write" on public.award_votes;
create policy "votes own write" on public.award_votes for insert to authenticated
  with check (user_id = auth.uid() and public.award_voting_open(category_id) and public.award_vote_block() is null
    and exists (select 1 from public.award_nominees n where n.id = nominee_id and n.category_id = award_votes.category_id));
drop policy if exists "votes own change" on public.award_votes;
create policy "votes own change" on public.award_votes for update to authenticated
  using (user_id = auth.uid() and public.award_voting_open(category_id))
  with check (user_id = auth.uid() and public.award_voting_open(category_id) and public.award_vote_block() is null
    and exists (select 1 from public.award_nominees n where n.id = nominee_id and n.category_id = award_votes.category_id));

-- ------------------------------------------------------------------------------------------------
-- 7. Miudezas
-- 7a. Conta nova não ganha mais o começo do e-mail como nome visível.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'name'), 60), ''), 'Jogador'))
  on conflict (id) do nothing;
  return new;
end; $$;

-- 7b. Versões antigas do perfil público, substituídas pela v4.
do $$ begin
  revoke execute on function public.public_profile_v2(text, text) from public, anon, authenticated;
exception when undefined_function then null; end $$;
do $$ begin
  revoke execute on function public.public_profile_v3(text, text) from public, anon, authenticated;
exception when undefined_function then null; end $$;

-- 7c. Contador anônimo de uso: só quem entrou na conta, e só nomes de evento curtos e simples.
drop policy if exists "count only" on public.usage_counts;
create policy "count only" on public.usage_counts for insert to authenticated
  with check (day = current_date and event ~ '^[A-Za-z0-9._@-]{1,60}$');
revoke insert on public.usage_counts from anon;
