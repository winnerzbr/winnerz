-- WinnerZ — 0012: o @ é o seu nome no site
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez. Precisa da 0011.
--
-- Antes: o nome vinha do começo do e-mail (ou do Google) e o @ era outra coisa.
-- Depois: no primeiro acesso a pessoa escolhe o @, e ele passa a ser o nome dela no site inteiro
-- (cabeçalho, perfil, análises). O @ guarda as maiúsculas que a pessoa escolheu ("HeverShow"),
-- mas é único sem diferenciar maiúsculas, e o endereço do perfil fica em minúsculas.

alter table public.profiles drop constraint if exists profiles_handle_format;
alter table public.profiles add constraint profiles_handle_format check (handle is null or handle ~ '^[A-Za-z0-9_]{3,24}$');

-- Quem já escolheu o @ passa a usá-lo como nome.
update public.profiles set display_name = handle where handle is not null and display_name is distinct from handle;

create or replace function public.set_my_profile(p_handle text, p_bio text, p_visibility jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb := '{}'::jsonb; k text; h text := nullif(trim(p_handle), '');
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if h is null then raise exception 'handle_required'; end if;
  if h !~ '^[A-Za-z0-9_]{3,24}$' then raise exception 'handle_format'; end if;
  if lower(h) in ('admin', 'winnerz', 'jornada', 'colecao', 'jogos', 'eventos', 'comunidade', 'preferencias', 'entrar', 'privacidade', 'sessao', 'overlay', 'api')
     and not exists (select 1 from profiles where id = auth.uid() and is_admin) then
    raise exception 'handle_reserved';
  end if;
  foreach k in array array['jornada', 'colecao', 'notas'] loop
    v := v || jsonb_build_object(k, case when p_visibility ->> k in ('link', 'publico') then p_visibility ->> k else 'privado' end);
  end loop;
  begin
    update profiles set handle = h, display_name = h, bio = nullif(left(trim(coalesce(p_bio, '')), 160), ''), visibility = v where id = auth.uid();
  exception when unique_violation then raise exception 'handle_taken';
  end;
  return public.my_profile();
end; $$;

-- Só o @ (primeiro acesso): não mexe na apresentação nem na visibilidade.
create or replace function public.set_my_handle(p_handle text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare h text := nullif(trim(p_handle), '');
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if h is null or h !~ '^[A-Za-z0-9_]{3,24}$' then raise exception 'handle_format'; end if;
  if lower(h) in ('admin', 'winnerz', 'jornada', 'colecao', 'jogos', 'eventos', 'comunidade', 'preferencias', 'entrar', 'privacidade', 'sessao', 'overlay', 'api')
     and not exists (select 1 from profiles where id = auth.uid() and is_admin) then
    raise exception 'handle_reserved';
  end if;
  begin
    update profiles set handle = h, display_name = h where id = auth.uid();
  exception when unique_violation then raise exception 'handle_taken';
  end;
  return public.my_profile();
end; $$;

-- Saber se um @ está livre enquanto a pessoa digita (sem revelar nada além de sim ou não).
create or replace function public.handle_available(p_handle text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from profiles where handle is not null and lower(handle) = lower(trim(p_handle)) and id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid));
$$;

revoke all on function public.set_my_handle(text) from public, anon;
revoke all on function public.handle_available(text) from public, anon;
grant execute on function public.set_my_handle(text) to authenticated;
grant execute on function public.handle_available(text) to authenticated;

notify pgrst, 'reload schema';
