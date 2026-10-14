-- WinnerZ — Etapa 6, entrega 1: acesso por convite com o site fechado.
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez. Precisa da 0006 (is_admin).
--
-- A administração cria links de convite no Studio (/convite/<código>). Quem abre o link e entra na conta
-- vira convidado e passa a ver o site mesmo com o modo privado ligado. Cada link tem um nome (para você
-- lembrar para quem mandou), um limite de pessoas e, se quiser, uma validade. Dá para revogar o link
-- e tirar o acesso de alguém a qualquer momento.

create table if not exists public.site_invites (
  code text primary key check (code ~ '^[a-z0-9]{12,32}$'),
  label text not null check (length(label) between 1 and 60),
  max_uses integer not null default 1 check (max_uses between 1 and 100),
  uses integer not null default 0,
  expires_at timestamptz,
  revoked boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.site_guests (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text references public.site_invites (code) on delete set null,
  joined_at timestamptz not null default now()
);

alter table public.site_invites enable row level security;
alter table public.site_guests enable row level security;
-- Ninguém lê nem escreve direto: só pelas funções abaixo.
revoke all on public.site_invites from anon, authenticated;
revoke all on public.site_guests from anon, authenticated;

-- Quem está entrando é convidado?
create or replace function public.am_site_guest() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from site_guests where user_id = auth.uid());
$$;

-- O que o link diz, antes de entrar (sem revelar nada além do estado do convite).
create or replace function public.invite_status(p_code text) returns text
language sql stable security definer set search_path = public as $$
  select case
    when i.code is null then 'invalido'
    when i.revoked then 'revogado'
    when i.expires_at is not null and i.expires_at < now() then 'vencido'
    when i.uses >= i.max_uses then 'esgotado'
    else 'valido' end
  from (select 1) x left join site_invites i on i.code = lower(trim(p_code));
$$;

-- Usar o convite (com a conta já aberta). Quem já é convidado não gasta outra vaga.
create or replace function public.redeem_invite(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare i site_invites%rowtype; c text := lower(trim(coalesce(p_code, ''))); n int;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para usar o convite.'; end if;
  if exists (select 1 from site_guests where user_id = auth.uid()) then return 'ja_convidado'; end if;
  select * into i from site_invites where code = c for update;
  if not found then return 'invalido'; end if;
  if i.revoked then return 'revogado'; end if;
  if i.expires_at is not null and i.expires_at < now() then return 'vencido'; end if;
  if i.uses >= i.max_uses then return 'esgotado'; end if;
  insert into site_guests (user_id, code) values (auth.uid(), c) on conflict (user_id) do nothing;
  get diagnostics n = row_count;
  -- Dois pedidos ao mesmo tempo (a página do convite e a volta do e-mail): só o primeiro gasta a vaga.
  if n = 0 then return 'ja_convidado'; end if;
  update site_invites set uses = uses + 1 where code = c;
  return 'ok';
end;
$$;

-- Administração: criar, listar, revogar e tirar acesso.
create or replace function public.create_invite(p_label text, p_max_uses integer default 1, p_days integer default null) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not is_admin() then raise exception 'Só a administração cria convites.'; end if;
  if length(trim(coalesce(p_label, ''))) = 0 then raise exception 'Dê um nome ao convite (para quem é).'; end if;
  -- 16 caracteres aleatórios (64 bits): impossível de adivinhar tentando.
  c := substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
  insert into site_invites (code, label, max_uses, expires_at, created_by)
  values (c, left(trim(p_label), 60), greatest(1, least(coalesce(p_max_uses, 1), 100)),
          case when p_days is null or p_days <= 0 then null else now() + make_interval(days => least(p_days, 365)) end, auth.uid());
  return c;
end;
$$;

create or replace function public.list_invites() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Só a administração vê os convites.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'code', i.code, 'label', i.label, 'max_uses', i.max_uses, 'uses', i.uses, 'expires_at', i.expires_at,
      'revoked', i.revoked, 'created_at', i.created_at,
      'guests', coalesce((select jsonb_agg(jsonb_build_object('user_id', g.user_id, 'handle', p.handle, 'name', p.display_name, 'joined_at', g.joined_at) order by g.joined_at)
                          from site_guests g left join profiles p on p.id = g.user_id where g.code = i.code), '[]'::jsonb)
    ) order by i.created_at desc) from site_invites i), '[]'::jsonb);
end;
$$;

create or replace function public.revoke_invite(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Só a administração revoga convites.'; end if;
  update site_invites set revoked = true where code = lower(trim(p_code));
end;
$$;

create or replace function public.remove_guest(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Só a administração tira acessos.'; end if;
  delete from site_guests where user_id = p_user;
end;
$$;

revoke execute on function public.am_site_guest() from public;
revoke execute on function public.invite_status(text) from public;
revoke execute on function public.redeem_invite(text) from public, anon;
revoke execute on function public.create_invite(text, integer, integer) from public, anon;
revoke execute on function public.list_invites() from public, anon;
revoke execute on function public.revoke_invite(text) from public, anon;
revoke execute on function public.remove_guest(uuid) from public, anon;
grant execute on function public.am_site_guest() to anon, authenticated;
grant execute on function public.invite_status(text) to anon, authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.create_invite(text, integer, integer) to authenticated;
grant execute on function public.list_invites() to authenticated;
grant execute on function public.revoke_invite(text) to authenticated;
grant execute on function public.remove_guest(uuid) to authenticated;
