-- WinnerZ — Galera, fase 1: figurinhas de pessoas no álbum.
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez. Precisa da 0053 a 0077.
--
-- 1. Número de chegada: cada conta ganha um número fixo, na ordem de cadastro (nunca muda, nunca é reaproveitado).
-- 2. Figurinha da Galera: quem quiser envia a sua (cenário, jogo marcante, nome e frase opcionais, retrato).
--    Nada sai nos pacotes sem a aprovação da administração. Dá para pausar e sair a qualquer hora.
-- 3. Nos pacotes: às vezes vem +1 da Galera (o de boas-vindas sempre traz uma). Nunca a sua, nunca de quem tem
--    bloqueio com você, nunca repetida. Quem tirou guarda; se a pessoa sai, a cópia vira "aposentada", sem identidade.
-- 4. Denúncia: quem tirou pode denunciar. A figurinha sai dos pacotes na hora e vai para a fila do Studio.

-- ------------------------------------------------------------------------------------------------
-- 1. Número de chegada
alter table public.profiles add column if not exists arrival_no integer;
create sequence if not exists public.profiles_arrival_seq;
with base as (select coalesce(max(arrival_no), 0) as m from public.profiles),
     falta as (select p.id, row_number() over (order by p.created_at, p.id) as r from public.profiles p where p.arrival_no is null)
update public.profiles p set arrival_no = base.m + falta.r from base, falta where p.id = falta.id;
select setval('public.profiles_arrival_seq', greatest((select coalesce(max(arrival_no), 0) from public.profiles), 1),
              (select count(*) > 0 from public.profiles where arrival_no is not null));
alter table public.profiles alter column arrival_no set default nextval('public.profiles_arrival_seq');
create unique index if not exists profiles_arrival_no on public.profiles (arrival_no);

-- ------------------------------------------------------------------------------------------------
-- 2. Tabelas
-- live: a versão aprovada (a que sai nos pacotes e aparece para quem tirou). pending: a versão esperando o Studio.
-- Cada versão: {scene, game, name, phrase, portrait}. portrait é um caminho no bucket 'avatares' (pasta da pessoa)
-- ou null (avatar padrão do WinnerZ).
create table if not exists public.galera_cards (
  user_id uuid primary key references auth.users (id) on delete cascade,
  live jsonb,
  pending jsonb,
  refused jsonb,
  paused boolean not null default false,
  hidden boolean not null default false,
  submitted_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Quem tirou quem. owner sem chave estrangeira de propósito: se a conta for apagada, a cópia fica como aposentada.
create table if not exists public.galera_owned (
  collector uuid not null references auth.users (id) on delete cascade,
  owner uuid not null,
  owner_no integer,
  pack_id uuid,
  drawn_at timestamptz not null default now(),
  primary key (collector, owner)
);
create index if not exists galera_owned_owner on public.galera_owned (owner);

-- Um sorteio por pacote (com ou sem figurinha da Galera), para abrir de novo não sortear de novo.
create table if not exists public.galera_rolls (
  pack_id uuid primary key references public.album_packs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  owner uuid,
  rolled_at timestamptz not null default now()
);

create table if not exists public.galera_reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references auth.users (id) on delete cascade,
  owner uuid not null,
  reason text not null check (reason in ('imagem', 'frase', 'outro')),
  state text not null default 'aberta' check (state in ('aberta', 'resolvida')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);
create unique index if not exists galera_reports_open on public.galera_reports (reporter, owner) where state = 'aberta';

alter table public.galera_cards enable row level security;
alter table public.galera_owned enable row level security;
alter table public.galera_rolls enable row level security;
alter table public.galera_reports enable row level security;
revoke all on public.galera_cards, public.galera_owned, public.galera_rolls, public.galera_reports from anon, authenticated;

alter table public.site_config add column if not exists galera_chance numeric not null default 0.25 check (galera_chance between 0 and 1);

-- ------------------------------------------------------------------------------------------------
-- 3. Ajudantes
create or replace function public.galera_card_json(p_owner uuid, v jsonb) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when v is null then null else jsonb_build_object(
    'owner', p.id, 'handle', p.handle, 'number', p.arrival_no, 'fundador', coalesce(p.arrival_no <= 100, false),
    'scene', coalesce(v ->> 'scene', 'planicies'), 'game', coalesce(v ->> 'game', ''), 'name', coalesce(v ->> 'name', ''),
    'phrase', coalesce(v ->> 'phrase', ''), 'portrait', v ->> 'portrait') end
  from profiles p where p.id = p_owner;
$$;

-- Pode participar: tem @, não está suspensa e a conta tem 7 dias ou já registrou uma sessão.
create or replace function public.galera_why_not(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when p.handle is null then 'galera_handle'
    when p.suspended_until is not null and p.suspended_until > now() then 'galera_blocked'
    when p.created_at > now() - interval '7 days' and not exists (select 1 from sessions s where s.user_id = p.id) then 'galera_new'
    else null end
  from profiles p where p.id = p_user;
$$;

create or replace function public.galera_version(p jsonb, p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  sc text := coalesce(p ->> 'scene', ''); gm text := trim(coalesce(p ->> 'game', '')); nm text := trim(coalesce(p ->> 'name', ''));
  ph text := trim(coalesce(p ->> 'phrase', '')); pt text := nullif(p ->> 'portrait', '');
begin
  if sc not in ('planicies', 'litoral', 'megacidade') then raise exception 'galera_scene'; end if;
  if char_length(gm) > 80 then raise exception 'galera_game'; end if;
  if char_length(nm) > 24 then raise exception 'galera_name'; end if;
  if char_length(ph) > 60 then raise exception 'galera_phrase'; end if;
  if pt is not null and (pt not like p_user::text || '/galera-%' or char_length(pt) > 200) then raise exception 'galera_portrait'; end if;
  return jsonb_build_object('scene', sc, 'game', gm, 'name', nm, 'phrase', ph, 'portrait', pt);
end; $$;

-- ------------------------------------------------------------------------------------------------
-- 4. A própria figurinha
create or replace function public.galera_me() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); c public.galera_cards; p public.profiles;
begin
  if me is null then raise exception 'not_logged'; end if;
  select * into p from profiles where id = me;
  select * into c from galera_cards where user_id = me;
  return jsonb_build_object(
    'number', p.arrival_no, 'fundador', coalesce(p.arrival_no <= 100, false), 'handle', p.handle, 'avatar', p.avatar,
    'why', public.galera_why_not(me),
    'card', case when c.user_id is null then null else jsonb_build_object(
      'live', public.galera_card_json(me, c.live), 'pending', public.galera_card_json(me, c.pending), 'refused', c.refused,
      'paused', c.paused, 'hidden', c.hidden, 'submittedAt', c.submitted_at) end);
end; $$;

create or replace function public.galera_submit(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); why text; v jsonb;
begin
  if me is null then raise exception 'not_logged'; end if;
  why := public.galera_why_not(me);
  if why is not null then raise exception '%', why; end if;
  v := public.galera_version(p, me);
  insert into galera_cards (user_id, pending, submitted_at) values (me, v, now())
  on conflict (user_id) do update set pending = excluded.pending, refused = null, submitted_at = now();
  return public.galera_me();
end; $$;

-- Desiste da versão que está em análise (a aprovada continua valendo).
create or replace function public.galera_cancel() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_logged'; end if;
  update galera_cards set pending = null where user_id = me;
  delete from galera_cards where user_id = me and live is null and pending is null;
  return public.galera_me();
end; $$;

create or replace function public.galera_pause(p_paused boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  update galera_cards set paused = coalesce(p_paused, false) where user_id = auth.uid();
  return public.galera_me();
end; $$;

-- Sair: a figurinha some e as cópias viram aposentadas. Devolve os caminhos dos retratos, para o app apagar o arquivo.
create or replace function public.galera_leave() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c public.galera_cards;
begin
  if me is null then raise exception 'not_logged'; end if;
  delete from galera_cards where user_id = me returning * into c;
  return to_jsonb(array_remove(array[c.live ->> 'portrait', c.pending ->> 'portrait'], null));
end; $$;

-- ------------------------------------------------------------------------------------------------
-- 5. Pacotes: o sorteio da Galera, depois de abrir. Feito uma vez por pacote, no servidor.
create or replace function public.galera_roll(p_pack uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); pk public.album_packs; r public.galera_rolls; chance numeric; pick uuid;
begin
  if me is null then raise exception 'not_logged'; end if;
  select * into pk from album_packs where id = p_pack and user_id = me;
  if not found or pk.state <> 'aberto' then raise exception 'not_found'; end if;
  select * into r from galera_rolls where pack_id = p_pack;
  if found then
    return case when r.owner is null then null else (select public.galera_card_json(c.user_id, c.live) from galera_cards c where c.user_id = r.owner) end;
  end if;
  chance := case when pk.origin = 'boas_vindas' then 1 else coalesce((select galera_chance from site_config where id = 1), 0.25) end;
  -- Só vale para o pacote que acabou de ser aberto (os antigos não sorteiam de novo).
  if pk.opened_at is null or pk.opened_at < now() - interval '2 hours' then chance := 0; end if;
  if random() < chance then
    select c.user_id into pick from galera_cards c join profiles p on p.id = c.user_id
    where c.live is not null and not c.paused and not c.hidden and c.user_id <> me
      and (p.suspended_until is null or p.suspended_until <= now())
      and not public.blocked_between(me, c.user_id)
      and not exists (select 1 from galera_owned o where o.collector = me and o.owner = c.user_id)
    order by exists (select 1 from follows f where f.follower = me and f.followed = c.user_id), random()
    limit 1;
  end if;
  insert into galera_rolls (pack_id, user_id, owner) values (p_pack, me, pick) on conflict (pack_id) do nothing;
  if pick is null then return null; end if;
  insert into galera_owned (collector, owner, owner_no, pack_id)
  values (me, pick, (select arrival_no from profiles where id = pick), p_pack) on conflict do nothing;
  return (select public.galera_card_json(c.user_id, c.live) from galera_cards c where c.user_id = pick);
end; $$;

-- A seção Galera do álbum: quem a pessoa já tirou (as aposentadas sem identidade) e quantas existem.
create or replace function public.galera_collection() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_logged'; end if;
  return jsonb_build_object(
    'cards', coalesce((select jsonb_agg(x.j order by x.n nulls last) from (
        select coalesce(o.owner_no, p.arrival_no) as n,
               case when c.live is not null and p.id is not null
                    then public.galera_card_json(o.owner, c.live) || jsonb_build_object('drawnAt', o.drawn_at)
                    else jsonb_build_object('owner', null, 'retired', true, 'number', coalesce(o.owner_no, p.arrival_no), 'drawnAt', o.drawn_at) end as j
        from galera_owned o
        left join galera_cards c on c.user_id = o.owner
        left join profiles p on p.id = o.owner
        where o.collector = me) x), '[]'::jsonb),
    'total', (select count(*) from galera_cards c where c.live is not null and c.user_id <> me));
end; $$;

create or replace function public.galera_report(p_owner uuid, p_reason text) returns boolean
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_logged'; end if;
  if not exists (select 1 from galera_owned where collector = me and owner = p_owner) then raise exception 'not_found'; end if;
  if p_reason not in ('imagem', 'frase', 'outro') then raise exception 'galera_reason'; end if;
  if exists (select 1 from galera_reports where reporter = me and owner = p_owner and state = 'aberta') then raise exception 'galera_report_dup'; end if;
  insert into galera_reports (reporter, owner, reason) values (me, p_owner, p_reason);
  update galera_cards set hidden = true where user_id = p_owner;
  return true;
end; $$;

-- ------------------------------------------------------------------------------------------------
-- 6. Studio
create or replace function public.studio_galera() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return jsonb_build_object(
    'queue', coalesce((select jsonb_agg(jsonb_build_object('person', public.person_json(c.user_id),
        'pending', public.galera_card_json(c.user_id, c.pending), 'live', public.galera_card_json(c.user_id, c.live),
        'submittedAt', c.submitted_at) order by c.submitted_at)
      from galera_cards c where c.pending is not null), '[]'::jsonb),
    'reports', coalesce((select jsonb_agg(jsonb_build_object('person', public.person_json(r.owner),
        'card', (select public.galera_card_json(c.user_id, c.live) from galera_cards c where c.user_id = r.owner),
        'count', r.n, 'reasons', r.reasons, 'firstAt', r.first_at) order by r.first_at)
      from (select owner, count(*) as n, jsonb_agg(distinct reason) as reasons, min(created_at) as first_at
            from galera_reports where state = 'aberta' group by owner) r), '[]'::jsonb),
    'active', (select count(*) from galera_cards where live is not null and not paused and not hidden),
    'chance', coalesce((select galera_chance from site_config where id = 1), 0.25));
end; $$;

create or replace function public.studio_galera_decide(p_user uuid, p_action text, p_reason text, p_note text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.galera_cards; why text;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select * into c from galera_cards where user_id = p_user for update;
  if not found or c.pending is null then raise exception 'not_found'; end if;
  if p_action in ('aprovar', 'padrao') then
    update galera_cards set live = case when p_action = 'padrao' then c.pending || jsonb_build_object('portrait', null) else c.pending end,
      pending = null, refused = null, hidden = false, decided_at = now(), decided_by = auth.uid() where user_id = p_user;
    perform public.notif_add(p_user, 'galera_ok', null, null, null, 'Sua figurinha da Galera foi aprovada',
      case when p_action = 'padrao' then 'Ela sai com o avatar padrão do WinnerZ: o seu tinha personagem ou marca de outra empresa.'
           else 'Agora ela pode sair nos pacotes de outras pessoas.' end, '/preferencias#figurinha', '{}'::jsonb);
  elsif p_action = 'recusar' then
    if p_reason not in ('avatar', 'imagem', 'frase', 'outro') then raise exception 'galera_reason'; end if;
    why := case p_reason when 'avatar' then 'O avatar tem personagem ou marca de outra empresa.'
                         when 'imagem' then 'A imagem não está de acordo com as regras.'
                         when 'frase' then 'A frase não está de acordo com as regras.'
                         else 'Ela não está de acordo com as regras.' end;
    update galera_cards set pending = null, refused = jsonb_build_object('reason', p_reason, 'note', left(coalesce(p_note, ''), 200), 'at', now()),
      decided_at = now(), decided_by = auth.uid() where user_id = p_user;
    delete from galera_cards where user_id = p_user and live is null and pending is null and refused is null;
    perform public.notif_add(p_user, 'galera_nao', null, null, null, 'Sua figurinha da Galera não foi aprovada',
      why || case when coalesce(p_note, '') <> '' then ' ' || left(p_note, 200) else '' end, '/preferencias#figurinha', '{}'::jsonb);
  else
    raise exception 'galera_action';
  end if;
  return public.studio_galera();
end; $$;

-- Denúncias: manter (volta para os pacotes) ou tirar o retrato e a frase da versão aprovada.
create or replace function public.studio_galera_report(p_owner uuid, p_keep boolean, p_note text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_keep then
    update galera_cards set hidden = false where user_id = p_owner;
  else
    update galera_cards set live = live || jsonb_build_object('portrait', null, 'phrase', ''), hidden = false,
      refused = jsonb_build_object('reason', 'denuncia', 'note', left(coalesce(p_note, ''), 200), 'at', now()),
      decided_at = now(), decided_by = auth.uid()
    where user_id = p_owner and live is not null;
    perform public.notif_add(p_owner, 'galera_nao', null, null, null, 'Sua figurinha da Galera foi revista',
      'Depois de uma denúncia, ela passou a sair com o avatar padrão e sem a frase. Você pode enviar uma versão nova.'
      || case when coalesce(p_note, '') <> '' then ' ' || left(p_note, 200) else '' end, '/preferencias#figurinha', '{}'::jsonb);
  end if;
  update galera_reports set state = 'resolvida', resolved_at = now(), resolved_by = auth.uid() where owner = p_owner and state = 'aberta';
  return public.studio_galera();
end; $$;

create or replace function public.studio_galera_chance(p_chance numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_chance is null or p_chance < 0 or p_chance > 1 then raise exception 'galera_chance'; end if;
  update site_config set galera_chance = p_chance, updated_at = now(), updated_by = auth.uid() where id = 1;
  return public.studio_galera();
end; $$;

-- ------------------------------------------------------------------------------------------------
-- 7. Permissões
revoke all on function public.galera_card_json(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.galera_why_not(uuid) from public, anon, authenticated;
revoke all on function public.galera_version(jsonb, uuid) from public, anon, authenticated;
revoke all on function public.galera_me() from public, anon;
revoke all on function public.galera_submit(jsonb) from public, anon;
revoke all on function public.galera_cancel() from public, anon;
revoke all on function public.galera_pause(boolean) from public, anon;
revoke all on function public.galera_leave() from public, anon;
revoke all on function public.galera_roll(uuid) from public, anon;
revoke all on function public.galera_collection() from public, anon;
revoke all on function public.galera_report(uuid, text) from public, anon;
revoke all on function public.studio_galera() from public, anon;
revoke all on function public.studio_galera_decide(uuid, text, text, text) from public, anon;
revoke all on function public.studio_galera_report(uuid, boolean, text) from public, anon;
revoke all on function public.studio_galera_chance(numeric) from public, anon;
grant execute on function public.galera_me() to authenticated;
grant execute on function public.galera_submit(jsonb) to authenticated;
grant execute on function public.galera_cancel() to authenticated;
grant execute on function public.galera_pause(boolean) to authenticated;
grant execute on function public.galera_leave() to authenticated;
grant execute on function public.galera_roll(uuid) to authenticated;
grant execute on function public.galera_collection() to authenticated;
grant execute on function public.galera_report(uuid, text) to authenticated;
grant execute on function public.studio_galera() to authenticated;
grant execute on function public.studio_galera_decide(uuid, text, text, text) to authenticated;
grant execute on function public.studio_galera_report(uuid, boolean, text) to authenticated;
grant execute on function public.studio_galera_chance(numeric) to authenticated;
