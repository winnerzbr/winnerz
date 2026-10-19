-- WinnerZ — Etapa 1 da revisão: limpeza antes dos convites.
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez.
--
-- 1. Uso por recurso: o site já anota quais partes foram usadas (tabela usage_counts, só o nome do recurso e o dia).
--    Agora a administração consegue ler esses números pelo Studio.
-- 2. Comunidades: enquanto o site é pequeno, só a administração cria comunidades. Um botão no Studio libera para todos.

-- ------------------------------------------------------------------------------------------------
-- 1. Uso por recurso (só a administração lê)
create index if not exists usage_counts_day_idx on public.usage_counts (day);

-- Até aqui, a visita a um perfil era contada com o @ da pessoa no nome. Agora fica só "perfil", e as antigas também.
update public.usage_counts set event = 'pagina.perfil' where event like 'pagina.@%';

create or replace function public.usage_features() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'so_administracao' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('event', event, 'd7', d7, 'd30', d30, 'last', last) order by d30 desc, event)
    from (
      select event,
             count(*) filter (where day > current_date - 7)::int as d7,
             count(*)::int as d30,
             max(day) as last
      from usage_counts
      where day > current_date - 30
      group by event
    ) t
  ), '[]'::jsonb);
end $$;

revoke execute on function public.usage_features() from public, anon;
grant execute on function public.usage_features() to authenticated;

-- ------------------------------------------------------------------------------------------------
-- 2. Quem cria comunidades
alter table public.site_config add column if not exists communities_open boolean not null default false;

create or replace function public.communities_open() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select communities_open from site_config where id = 1), false);
$$;

create or replace function public.set_communities_open(p_open boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not coalesce((select is_admin from profiles where id = auth.uid()), false) then
    raise exception 'so_administracao' using errcode = '42501';
  end if;
  insert into site_config (id, communities_open, updated_at, updated_by) values (1, coalesce(p_open, false), now(), auth.uid())
  on conflict (id) do update set communities_open = excluded.communities_open, updated_at = now(), updated_by = auth.uid();
  return coalesce(p_open, false);
end $$;

-- O app pergunta isto ao abrir; agora também diz se qualquer pessoa pode criar comunidade.
create or replace function public.my_access() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'open', public.site_open(),
    'admin', coalesce((select is_admin from profiles where id = auth.uid()), false),
    'guest', auth.uid() is not null and exists (select 1 from site_guests where user_id = auth.uid()),
    'communities', public.communities_open()
  );
$$;

-- Mesma função de antes (0026), com a conferência nova no começo.
create or replace function public.community_create(p_slug text, p_name text, p_description text, p_rules text, p_game text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_slug text := lower(trim(coalesce(p_slug, ''))); v_name text := trim(coalesce(p_name, '')); n integer; c communities%rowtype;
begin
  if not public.is_admin() and not public.communities_open() then raise exception 'community_admin_only'; end if;
  perform public.check_can_publish();
  if not public.community_slug_ok(v_slug) then
    if v_slug !~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$' or v_slug ~ '--' then raise exception 'slug_invalid'; end if;
    if public.has_bad_term(replace(v_slug, '-', ' '), true) then raise exception 'slug_offensive'; end if;
    raise exception 'slug_reserved';
  end if;
  if exists (select 1 from communities where slug = v_slug) then raise exception 'slug_taken'; end if;
  if char_length(v_name) < 3 or char_length(v_name) > 48 then raise exception 'name_invalid'; end if;
  if public.has_bad_term(v_name) or public.has_bad_term(p_description) or public.has_bad_term(p_rules) then raise exception 'text_offensive'; end if;
  if not public.is_admin() then
    select count(*) into n from communities where created_by = auth.uid() and created_at > now() - interval '1 day';
    if n >= 3 then raise exception 'community_limit'; end if;
  end if;
  perform public.note_public_act();
  insert into communities (slug, name, description, rules, game_id, created_by)
  values (v_slug, v_name, left(trim(coalesce(p_description, '')), 300), left(trim(coalesce(p_rules, '')), 1000),
          (select id from games where id = p_game), auth.uid())
  returning * into c;
  insert into community_members (community_id, user_id, role) values (c.id, auth.uid(), 'dono');
  return public.community_json(c);
end; $$;

revoke execute on function public.communities_open() from public;
revoke execute on function public.set_communities_open(boolean) from public, anon;
revoke execute on function public.my_access() from public;
revoke all on function public.community_create(text, text, text, text, text) from public, anon;
grant execute on function public.communities_open() to anon, authenticated, service_role;
grant execute on function public.set_communities_open(boolean) to authenticated;
grant execute on function public.my_access() to anon, authenticated;
grant execute on function public.community_create(text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
