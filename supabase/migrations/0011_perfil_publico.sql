-- WinnerZ — 0011: perfil e privacidade
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez.
--
-- Cada pessoa pode ter um endereço (winnerz.com.br/@nome) e escolher, por pilar, quem vê:
--   privado  → só você;
--   link     → só quem tiver o link com o código secreto (?k=...);
--   publico  → qualquer pessoa.
-- Tudo começa privado. O perfil público é lido por uma função que devolve SÓ o que foi liberado:
-- nada de recados, fotos, preços, notas de sessão ou com quem você jogou.

alter table public.profiles add column if not exists handle text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists visibility jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists share_key text not null default encode(gen_random_bytes(9), 'hex');

create unique index if not exists profiles_handle_key on public.profiles (lower(handle)) where handle is not null;
do $$ begin
  alter table public.profiles add constraint profiles_handle_format check (handle is null or handle ~ '^[a-z0-9_]{3,24}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_bio_len check (bio is null or char_length(bio) <= 160);
exception when duplicate_object then null; end $$;

-- O seu perfil (só você lê o código secreto).
create or replace function public.my_profile() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('handle', handle, 'bio', bio, 'visibility', visibility, 'shareKey', share_key)
  from profiles where id = auth.uid();
$$;

-- Gravar endereço, apresentação e visibilidade. O endereço vira minúsculo; repetido → erro "handle_taken".
create or replace function public.set_my_profile(p_handle text, p_bio text, p_visibility jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb := '{}'::jsonb; k text; h text := nullif(lower(trim(p_handle)), '');
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if h is not null and h !~ '^[a-z0-9_]{3,24}$' then raise exception 'handle_format'; end if;
  if h is not null and h in ('admin', 'winnerz', 'jornada', 'colecao', 'jogos', 'eventos', 'comunidade', 'preferencias', 'entrar', 'privacidade', 'sessao', 'overlay', 'api')
     and not exists (select 1 from profiles where id = auth.uid() and is_admin) then
    raise exception 'handle_reserved';
  end if;
  foreach k in array array['jornada', 'colecao', 'notas'] loop
    v := v || jsonb_build_object(k, case when p_visibility ->> k in ('link', 'publico') then p_visibility ->> k else 'privado' end);
  end loop;
  begin
    update profiles set handle = h, bio = nullif(left(trim(coalesce(p_bio, '')), 160), ''), visibility = v where id = auth.uid();
  exception when unique_violation then raise exception 'handle_taken';
  end;
  return public.my_profile();
end; $$;

-- Trocar o código secreto: os links antigos de "só com link" param de funcionar.
create or replace function public.rotate_share_key() returns jsonb
language sql security definer set search_path = public as $$
  update profiles set share_key = encode(gen_random_bytes(9), 'hex') where id = auth.uid();
  select public.my_profile();
$$;

-- O perfil que os outros veem. Devolve null se o endereço não existe ou se nada está liberado para quem pede.
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
      'count', (select count(*) from copies where user_id = p.id),
      'platforms', coalesce((select jsonb_agg(jsonb_build_object('platform', platform, 'n', n) order by n desc) from (
        select platform, count(*) n from copies where user_id = p.id group by platform) t), '[]'::jsonb),
      'items', coalesce((select jsonb_agg(x order by x ->> 'at' desc) from (
        select jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover, 'platform', c.platform, 'at', c.created_at) x
        from copies c join games g on g.id = c.game_id where c.user_id = p.id order by c.created_at desc limit 60) t), '[]'::jsonb)));
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

revoke all on function public.my_profile() from public, anon;
revoke all on function public.set_my_profile(text, text, jsonb) from public, anon;
revoke all on function public.rotate_share_key() from public, anon;
grant execute on function public.my_profile() to authenticated;
grant execute on function public.set_my_profile(text, text, jsonb) to authenticated;
grant execute on function public.rotate_share_key() to authenticated;
grant execute on function public.public_profile(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
