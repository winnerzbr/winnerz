-- WinnerZ — Segurança, etapa C: site fechado de verdade.
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez.
--
-- Até aqui, o "Em breve" era só a tela: quem criasse uma conta conseguia ler e gravar no banco chamando a API
-- direto. Agora o próprio banco confere, antes de cada pedido do app, se o site está aberto ou se a pessoa é
-- da administração ou convidada. Quem não é recebe "site_fechado" e só alcança o necessário para usar um convite.
--
-- Abrir e fechar: botão no Studio (função set_site_open). O site começa FECHADO, como está hoje.
-- Para desligar esta trava numa emergência, rode só a linha do fim:  alter role authenticator reset pgrst.db_pre_request;

-- ------------------------------------------------------------------------------------------------
-- Estado do site (uma linha só)
create table if not exists public.site_config (
  id smallint primary key default 1 check (id = 1),
  open boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
insert into public.site_config (id, open) values (1, false) on conflict (id) do nothing;
alter table public.site_config enable row level security;
revoke all on public.site_config from public, anon, authenticated;
grant select, insert, update on public.site_config to service_role;

create or replace function public.site_open() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select open from site_config where id = 1), false);
$$;

-- Quem passa com o site fechado: administração e convidados.
create or replace function public.site_member() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.site_open()
    or coalesce((select is_admin from profiles where id = auth.uid()), false)
    or exists (select 1 from site_guests where user_id = auth.uid())
  );
$$;

-- O mesmo, para as funções do servidor (Vercel) conferirem uma pessoa pelo id.
create or replace function public.site_member_of(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_user is not null and (
    public.site_open()
    or coalesce((select is_admin from profiles where id = p_user), false)
    or exists (select 1 from site_guests where user_id = p_user)
  );
$$;

-- O que o app precisa saber logo ao abrir: o site está aberto? quem entrou é da administração? é convidada?
create or replace function public.my_access() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'open', public.site_open(),
    'admin', coalesce((select is_admin from profiles where id = auth.uid()), false),
    'guest', auth.uid() is not null and exists (select 1 from site_guests where user_id = auth.uid())
  );
$$;

-- Botão do Studio: abrir ou fechar o site (só a administração).
create or replace function public.set_site_open(p_open boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not coalesce((select is_admin from profiles where id = auth.uid()), false) then
    raise exception 'so_administracao' using errcode = '42501';
  end if;
  insert into site_config (id, open, updated_at, updated_by) values (1, coalesce(p_open, false), now(), auth.uid())
  on conflict (id) do update set open = excluded.open, updated_at = now(), updated_by = auth.uid();
  return coalesce(p_open, false);
end $$;

revoke execute on function public.site_open() from public;
revoke execute on function public.site_member() from public;
revoke execute on function public.site_member_of(uuid) from public, anon, authenticated;
revoke execute on function public.my_access() from public;
revoke execute on function public.set_site_open(boolean) from public, anon;
grant execute on function public.site_open() to anon, authenticated, service_role;
grant execute on function public.site_member() to anon, authenticated, service_role;
grant execute on function public.site_member_of(uuid) to service_role;
grant execute on function public.my_access() to anon, authenticated;
grant execute on function public.set_site_open(boolean) to authenticated;

-- ------------------------------------------------------------------------------------------------
-- A trava: roda antes de cada pedido que chega pela API (PostgREST). O servidor (service_role) não passa por ela.
create or replace function public.site_gate() returns void
language plpgsql stable set search_path = public as $$
declare
  p text := coalesce(current_setting('request.path', true), '');
begin
  if current_user not in ('anon', 'authenticated') then return; end if;
  if public.site_open() then return; end if;
  -- O mínimo para a tela "Em breve", a página do convite e o uso do convite.
  if p in ('/rpc/my_access', '/rpc/invite_status', '/rpc/site_open') then return; end if;
  if current_user = 'authenticated' then
    if p = '/rpc/redeem_invite' then return; end if;
    if public.site_member() then return; end if;
  end if;
  raise exception 'site_fechado' using errcode = '42501', hint = 'O WinnerZ ainda está fechado: só entra quem tem convite.';
end $$;
revoke execute on function public.site_gate() from public;
grant execute on function public.site_gate() to anon, authenticated;

-- ------------------------------------------------------------------------------------------------
-- Arquivos (fotos, avatares, imagens da comunidade): com o site fechado, só quem participa envia ou troca.
drop policy if exists "site fechado: enviar" on storage.objects;
create policy "site fechado: enviar" on storage.objects as restrictive for insert to authenticated
  with check (public.site_member());
drop policy if exists "site fechado: trocar" on storage.objects;
create policy "site fechado: trocar" on storage.objects as restrictive for update to authenticated
  using (public.site_member()) with check (public.site_member());

-- ------------------------------------------------------------------------------------------------
-- Liga a trava na API e avisa o PostgREST.
alter role authenticator set pgrst.db_pre_request = 'public.site_gate';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
