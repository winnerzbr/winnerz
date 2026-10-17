-- =================================================================================================================
-- 0066 · Etapa 7, E7.1: códigos de live
--
-- A administração cria códigos no Studio (um pacote Ônix ou Prisma, ou uma figurinha específica), com validade, limite
-- de usos e motivo. Quem resgata no Álbum ("Tenho um código") ganha na hora: o pacote vai para Pacotes e a figurinha
-- vai para a bandeja. Cada código vale uma vez por conta. Contra abuso: no máximo 10 tentativas erradas por hora,
-- e conta com menos de 7 dias resgata no máximo 3 códigos.
-- source: 'studio' (criado à mão), 'drop' (solto na live pelo overlay, E7.2) e 'twitch' (pontos do canal, E7.3).
-- Pode rodar mais de uma vez. Precisa da 0053 e da 0057.
-- =================================================================================================================

do $$
declare c text;
begin
  for c in select conname from pg_constraint where conrelid = 'public.album_packs'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%origin%' loop
    execute format('alter table public.album_packs drop constraint %I', c);
  end loop;
  alter table public.album_packs add constraint album_packs_origin_check check (origin in ('jornada', 'memoria', 'studio', 'boas_vindas', 'codigo'));
end $$;

create table if not exists public.album_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{4,24}$'),
  source text not null default 'studio' check (source in ('studio', 'drop', 'twitch')),
  title text check (char_length(title) <= 80),
  kind text not null default 'pacote' check (kind in ('pacote', 'figurinha')),
  pack_kind text not null default 'onix' check (pack_kind in ('onix', 'prisma')),
  qty integer not null default 1 check (qty between 1 and 5),
  sticker_id uuid references public.album_stickers (id) on delete set null,
  max_uses integer check (max_uses is null or max_uses between 1 and 100000),
  uses integer not null default 0 check (uses >= 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  note text not null check (char_length(note) between 3 and 200),
  active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (kind = 'pacote' or sticker_id is not null or not active)
);
create index if not exists album_codes_recent on public.album_codes (created_at desc);
alter table public.album_codes enable row level security;
revoke all on public.album_codes from anon, authenticated;

create table if not exists public.album_code_uses (
  code_id uuid not null references public.album_codes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (code_id, user_id)
);
create index if not exists album_code_uses_user on public.album_code_uses (user_id, at desc);
alter table public.album_code_uses enable row level security;
revoke all on public.album_code_uses from anon, authenticated;

create table if not exists public.album_code_tries (
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists album_code_tries_user on public.album_code_tries (user_id, at desc);
alter table public.album_code_tries enable row level security;
revoke all on public.album_code_tries from anon, authenticated;

-- "WZ-7KQ2M9" → "WZ7KQ2M9": letras maiúsculas e números, sem espaços (o hífen fica, se vier no meio).
create or replace function public.album_code_clean(p text) returns text
language sql immutable as $$
  select left(regexp_replace(upper(coalesce(p, '')), '[^A-Z0-9-]', '', 'g'), 24);
$$;

-- Um código novo, difícil de adivinhar (sem 0/O nem 1/I para não confundir na tela da live).
create or replace function public.album_code_new() returns text
language plpgsql volatile set search_path = public as $$
declare abc text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; b bytea; out text; i integer;
begin
  loop
    b := uuid_send(gen_random_uuid()); out := 'WZ';
    for i in 0..6 loop out := out || substr(abc, (get_byte(b, i) % 32) + 1, 1); end loop;
    exit when not exists (select 1 from album_codes where code = out);
  end loop;
  return out;
end; $$;

-- Resgatar. Devolve o que veio: {kind, packs: [pack], sticker, note}, ou {error: 'code_unknown'} para código que não existe.
create or replace function public.album_redeem(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c album_codes; k text := public.album_code_clean(p_code); p album_packs; packs jsonb := '[]'::jsonb; s album_stickers; i integer;
begin
  if me is null then raise exception 'not_logged'; end if;
  if exists (select 1 from profiles where id = me and suspended_until > now()) then raise exception 'code_blocked'; end if;
  if (select count(*) from album_code_tries where user_id = me and at > now() - interval '1 hour') >= 10 then raise exception 'code_tries'; end if;
  select * into c from album_codes where code = k for update;
  if not found or not c.active or c.starts_at > now() then
    -- não levanta erro aqui: a tentativa errada precisa ficar gravada (um erro desfaria a gravação)
    insert into album_code_tries (user_id) values (me);
    return jsonb_build_object('error', 'code_unknown');
  end if;
  if c.ends_at is not null and c.ends_at <= now() then raise exception 'code_expired'; end if;
  if exists (select 1 from album_code_uses where code_id = c.id and user_id = me) then raise exception 'code_used'; end if;
  if c.max_uses is not null and c.uses >= c.max_uses then raise exception 'code_full'; end if;
  if (select created_at from profiles where id = me) > now() - interval '7 days'
     and (select count(*) from album_code_uses where user_id = me) >= 3 then raise exception 'code_new_account'; end if;

  insert into album_code_uses (code_id, user_id) values (c.id, me);
  update album_codes set uses = uses + 1 where id = c.id;
  if c.kind = 'figurinha' then
    select * into s from album_stickers where id = c.sticker_id and active;
    if not found then raise exception 'code_sticker'; end if;
    insert into album_items (user_id, sticker_id, qty, pasted) values (me, s.id, 1, false)
    on conflict (user_id, sticker_id) do update set qty = album_items.qty + 1;
    return jsonb_build_object('kind', 'figurinha', 'packs', '[]'::jsonb, 'sticker', public.album_sticker_json(s), 'note', c.note);
  end if;
  for i in 1..c.qty loop
    insert into album_packs (user_id, kind, origin, state, reason) values (me, c.pack_kind, 'codigo', 'fechado', left(c.note, 200)) returning * into p;
    packs := packs || jsonb_build_array(public.album_pack_json(p));
  end loop;
  return jsonb_build_object('kind', 'pacote', 'packs', packs, 'sticker', null, 'note', c.note);
end; $$;

-- Studio: os códigos (os mais novos primeiro), com quantos usaram.
create or replace function public.studio_codes() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'code', c.code, 'source', c.source, 'title', c.title, 'kind', c.kind, 'packKind', c.pack_kind,
      'qty', c.qty, 'stickerId', c.sticker_id, 'maxUses', c.max_uses, 'uses', c.uses, 'startsAt', c.starts_at, 'endsAt', c.ends_at, 'note', c.note,
      'active', c.active, 'createdAt', c.created_at) order by c.created_at desc)
    from (select * from album_codes order by created_at desc limit 200) c), '[]'::jsonb);
end; $$;

-- Studio: cria ou edita. p: {id?, code?, title?, kind, packKind, qty, stickerId?, maxUses?, startsAt?, endsAt?, note, active?}
create or replace function public.studio_code_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text := nullif(public.album_code_clean(p ->> 'code'), ''); kind text := coalesce(p ->> 'kind', 'pacote'); st uuid := nullif(p ->> 'stickerId', '')::uuid;
        mx integer := nullif(p ->> 'maxUses', '')::integer; ends timestamptz := nullif(p ->> 'endsAt', '')::timestamptz; starts timestamptz := coalesce(nullif(p ->> 'startsAt', '')::timestamptz, now());
        note text := btrim(coalesce(p ->> 'note', ''));
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if k is not null and char_length(k) < 4 then raise exception 'code_format'; end if;
  if kind = 'figurinha' and (st is null or not exists (select 1 from album_stickers where id = st)) then raise exception 'code_sticker'; end if;
  if char_length(note) < 3 then raise exception 'pack_reason'; end if;
  if ends is not null and ends <= starts then raise exception 'code_dates'; end if;
  if p ? 'id' and nullif(p ->> 'id', '') is not null then
    update album_codes set title = nullif(left(btrim(coalesce(p ->> 'title', '')), 80), ''), max_uses = mx, starts_at = starts, ends_at = ends, note = left(note, 200),
      active = coalesce((p ->> 'active')::boolean, active)
    where id = (p ->> 'id')::uuid;
    if not found then raise exception 'not_found'; end if;
  else
    if k is not null and exists (select 1 from album_codes where code = k) then raise exception 'code_taken'; end if;
    insert into album_codes (code, source, title, kind, pack_kind, qty, sticker_id, max_uses, starts_at, ends_at, note, created_by)
    values (coalesce(k, public.album_code_new()), 'studio', nullif(left(btrim(coalesce(p ->> 'title', '')), 80), ''), kind,
            case when p ->> 'packKind' = 'prisma' then 'prisma' else 'onix' end, greatest(1, least(5, coalesce(nullif(p ->> 'qty', '')::integer, 1))),
            case when kind = 'figurinha' then st end, mx, starts, ends, left(note, 200), auth.uid());
  end if;
  return public.studio_codes();
end; $$;

revoke all on function public.album_code_new() from public, anon, authenticated;
revoke all on function public.album_redeem(text) from public, anon;
revoke all on function public.studio_codes() from public, anon;
revoke all on function public.studio_code_save(jsonb) from public, anon;
grant execute on function public.album_redeem(text) to authenticated;
grant execute on function public.studio_codes() to authenticated;
grant execute on function public.studio_code_save(jsonb) to authenticated;
