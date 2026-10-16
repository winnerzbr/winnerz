-- 0049 · Compartilhar trechos da Jornada
--
-- Um momento ou marco da sua Jornada ganha um link próprio (/t/<código>), que mostra só aquele trecho: o jogo, o
-- título, a data e, se você quiser, a nota e a foto. Funciona mesmo com a Jornada fechada no perfil, porque é você
-- que escolhe cada trecho. Desligar o link apaga o código; ligar de novo cria outro. Cartas nunca saem.
-- Quem foi bloqueado não abre, trecho tirado pela moderação some, e perfil suspenso não mostra nada.
--
-- A leitura pública passa pela /api/perfil?t=<código> (com a chave do servidor), que assina a foto por 1 hora.
-- Pode rodar mais de uma vez.

create table if not exists public.journey_snips (
  token text primary key default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  event_id uuid not null unique references public.timeline_events (id) on delete cascade,
  with_photo boolean not null default true,
  with_note boolean not null default true,
  views integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists journey_snips_user on public.journey_snips (user_id, created_at desc);
alter table public.journey_snips enable row level security;

create or replace function public.snip_json(s public.journey_snips) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('token', s.token, 'eventId', s.event_id, 'withPhoto', s.with_photo, 'withNote', s.with_note,
                            'views', s.views, 'createdAt', s.created_at);
$$;

-- Liga (ou muda) o link de um trecho seu.
create or replace function public.snip_set(p_event uuid, p_photo boolean, p_note boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s journey_snips%rowtype; k text;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  select kind into k from timeline_events where id = p_event and user_id = auth.uid();
  if k is null then raise exception 'not_found'; end if;
  if k = 'carta' then raise exception 'snip_letter'; end if;
  if (select count(*) from journey_snips where user_id = auth.uid()) >= 500 then raise exception 'snip_limit'; end if;
  insert into journey_snips (user_id, event_id, with_photo, with_note) values (auth.uid(), p_event, coalesce(p_photo, true), coalesce(p_note, true))
  on conflict (event_id) do update set with_photo = excluded.with_photo, with_note = excluded.with_note
  returning * into s;
  return public.snip_json(s);
end; $$;

create or replace function public.snip_off(p_event uuid) returns void
language sql security definer set search_path = public as $$
  delete from journey_snips where event_id = p_event and user_id = auth.uid();
$$;

create or replace function public.snip_of(p_event uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select public.snip_json(s) from journey_snips s where s.event_id = p_event and s.user_id = auth.uid();
$$;

-- Os seus links ligados (Preferências → Privacidade), para conferir e desligar.
create or replace function public.snips_mine() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public.snip_json(s) || jsonb_build_object('title', e.title, 'kind', e.kind, 'at', e.at, 'game', g.title, 'slug', g.slug)
                            order by s.created_at desc), '[]'::jsonb)
  from journey_snips s join timeline_events e on e.id = s.event_id join journeys j on j.id = e.journey_id join games g on g.id = j.game_id
  where s.user_id = auth.uid();
$$;

-- Leitura pública (só pelo servidor). p_viewer: quem pede, se entrou na conta (para respeitar bloqueios).
create or replace function public.snip_get(p_token text, p_viewer uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s journey_snips%rowtype; out jsonb;
begin
  select * into s from journey_snips where token = p_token;
  if not found then return null; end if;
  if exists (select 1 from profiles p where p.id = s.user_id and (p.handle is null or p.suspended_until > now())) then return null; end if;
  if p_viewer is not null and p_viewer <> s.user_id and public.blocked_between(s.user_id, p_viewer) then return null; end if;
  select jsonb_build_object(
    'kind', e.kind, 'title', e.title, 'at', e.at, 'precision', e.date_precision, 'dateLabel', e.date_label,
    'quote', case when s.with_note then e.quote end, 'text', case when s.with_note then e.text end,
    'imagePath', case when s.with_photo then e.image_path end,
    'eventId', e.id,
    'game', jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover, 'backdrop', g.backdrop),
    'history', jsonb_build_object('ordinal', h.ordinal, 'title', h.title),
    'owner', jsonb_build_object('handle', p.handle, 'avatar', p.avatar))
  into out
  from timeline_events e join journeys j on j.id = e.journey_id join games g on g.id = j.game_id
  join histories h on h.id = e.history_id join profiles p on p.id = e.user_id
  where e.id = s.event_id and not e.mod_hidden and not coalesce(j.mod_hidden, false);
  if out is null then return null; end if;
  if p_viewer is distinct from s.user_id then update journey_snips set views = views + 1 where token = p_token; end if;
  return out;
end; $$;

revoke all on function public.snip_json(public.journey_snips) from public, anon, authenticated;
revoke all on function public.snip_set(uuid, boolean, boolean) from public, anon;
revoke all on function public.snip_off(uuid) from public, anon;
revoke all on function public.snip_of(uuid) from public, anon;
revoke all on function public.snips_mine() from public, anon;
revoke all on function public.snip_get(text, uuid) from public, anon, authenticated;
grant execute on function public.snip_set(uuid, boolean, boolean) to authenticated;
grant execute on function public.snip_off(uuid) to authenticated;
grant execute on function public.snip_of(uuid) to authenticated;
grant execute on function public.snips_mine() to authenticated;
grant execute on function public.snip_get(text, uuid) to service_role;
