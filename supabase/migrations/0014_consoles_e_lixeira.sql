-- WinnerZ — 0014: consoles e acessórios, e lixeira da coleção
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez. Precisa da 0011.
--
-- 1) Consoles, portáteis e acessórios ganham ficha própria (tabela hardware), separada dos jogos.
-- 2) Lixeira: tirar um jogo ou um console da coleção não apaga na hora. Ele fica 30 dias na lixeira
--    (deleted_at) e pode voltar com um toque. Depois disso, o site apaga de vez.
-- 3) O perfil público deixa de contar o que está na lixeira.

alter table public.copies add column if not exists deleted_at timestamptz;
create index if not exists copies_trash on public.copies (user_id, deleted_at) where deleted_at is not null;

create table if not exists public.hardware (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('console', 'portatil', 'acessorio')),
  name text not null check (char_length(name) between 1 and 120),
  platform text,
  model text,
  edition text,
  region text,
  condition text,
  items text,
  serial text,
  origin text,
  purchased_on date,
  purchase_place text,
  price_paid numeric(10, 2) check (price_paid is null or price_paid >= 0),
  note text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists hardware_user on public.hardware (user_id);
alter table public.hardware enable row level security;
drop policy if exists "hardware own" on public.hardware;
create policy "hardware own" on public.hardware for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Perfil público: o mesmo da 0011, sem contar o que está na lixeira.
create or replace function public.public_profile(p_handle text, p_key text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles%rowtype; show_j boolean; show_c boolean; show_n boolean; out jsonb;
begin
  select * into p from profiles where handle is not null and lower(handle) = lower(p_handle);
  if not found then return null; end if;
  show_j := p.visibility ->> 'jornada' = 'publico' or (p.visibility ->> 'jornada' = 'link' and coalesce(p_key = p.share_key, false));
  show_c := p.visibility ->> 'colecao' = 'publico' or (p.visibility ->> 'colecao' = 'link' and coalesce(p_key = p.share_key, false));
  show_n := p.visibility ->> 'notas' = 'publico' or (p.visibility ->> 'notas' = 'link' and coalesce(p_key = p.share_key, false));
  if not (show_j or show_c or show_n) then return null; end if;

  out := jsonb_build_object('name', p.display_name, 'handle', p.handle, 'bio', p.bio, 'since', p.created_at,
    'onlyLink', not (p.visibility ->> 'jornada' = 'publico' or p.visibility ->> 'colecao' = 'publico' or p.visibility ->> 'notas' = 'publico'));

  if show_j then
    out := out || jsonb_build_object('jornada', jsonb_build_object(
      'playing', coalesce((select jsonb_agg(x order by x ->> 'startedAt' desc) from (
        select jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover, 'progress', h.progress,
          'startedAt', h.started_at, 'startedPrecision', h.started_precision, 'ordinal', h.ordinal) x
        from histories h join journeys j on j.id = h.journey_id join games g on g.id = j.game_id
        where h.user_id = p.id and h.state = 'ativa' order by h.started_at desc limit 12) t), '[]'::jsonb),
      'completed', coalesce((select jsonb_agg(x order by x ->> 'completedAt' desc nulls last) from (
        select jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover,
          'completedAt', h.completed_at, 'completedPrecision', h.completed_precision, 'ordinal', h.ordinal) x
        from histories h join journeys j on j.id = h.journey_id join games g on g.id = j.game_id
        where h.user_id = p.id and h.state = 'concluida' order by h.completed_at desc nulls last limit 30) t), '[]'::jsonb),
      'journeys', (select count(*) from journeys where user_id = p.id),
      'finished', (select count(*) from histories where user_id = p.id and state = 'concluida')));
  end if;

  if show_c then
    out := out || jsonb_build_object('colecao', jsonb_build_object(
      'count', (select count(*) from copies where user_id = p.id and deleted_at is null),
      'platforms', coalesce((select jsonb_agg(jsonb_build_object('platform', platform, 'n', n) order by n desc) from (
        select platform, count(*) n from copies where user_id = p.id and deleted_at is null group by platform) t), '[]'::jsonb),
      'items', coalesce((select jsonb_agg(x order by x ->> 'at' desc) from (
        select jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover, 'platform', c.platform, 'at', c.created_at) x
        from copies c join games g on g.id = c.game_id where c.user_id = p.id and c.deleted_at is null order by c.created_at desc limit 60) t), '[]'::jsonb)));
  end if;

  if show_n then
    out := out || jsonb_build_object('notas', coalesce((select jsonb_agg(x order by x ->> 'at' desc) from (
      select jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover, 'normalized', r.normalized,
        'originalScale', r.original_scale, 'originalValue', r.original_value, 'reviewTitle', r.title,
        'text', case when r.spoiler then '' else r.text end, 'spoiler', r.spoiler, 'at', r.created_at) x
      from reviews r join games g on g.id = r.game_id where r.user_id = p.id order by r.created_at desc limit 30) t), '[]'::jsonb));
  end if;
  return out;
end; $$;

notify pgrst, 'reload schema';
