-- WinnerZ — IAmiguinho M4 (Fase 2, a Jornada): histórico de cameos e limite diário da IA.
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez.
--
-- Histórico de cameos: quando o IAmiguinho apareceu para cada pessoa, por qual motivo e com qual fala dele.
-- Serve para o intervalo entre aparições valer no celular e no computador, e para ele não repetir piada.
-- Guarda só o motivo, o escopo (o id da Jornada ou da História), a hora, de onde veio a fala (IA ou biblioteca) e
-- a própria fala do mascote. Nunca guarda texto escrito pela pessoa. Só o servidor escreve; cada pessoa lê o seu.
create table if not exists public.iamiguinho_cameos (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  motivo text not null,
  escopo text not null default '',
  fonte text not null default 'biblioteca' check (fonte in ('ia', 'biblioteca')),
  fala text check (fala is null or char_length(fala) <= 200),
  at timestamptz not null default now()
);
create index if not exists iamiguinho_cameos_user_at on public.iamiguinho_cameos (user_id, at desc);
alter table public.iamiguinho_cameos enable row level security;
drop policy if exists "iamiguinho cameos own read" on public.iamiguinho_cameos;
create policy "iamiguinho cameos own read" on public.iamiguinho_cameos for select to authenticated using (user_id = auth.uid());

-- Uso da IA do IAmiguinho por dia (horário de Brasília): um teto por pessoa e um teto para o site todo.
-- Ninguém lê nem escreve direto; só as funções abaixo, chamadas pelo servidor.
create table if not exists public.iamiguinho_ia_uso (
  dia date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  usos integer not null default 0,
  primary key (dia, user_id)
);
alter table public.iamiguinho_ia_uso enable row level security;

-- Decide se o cameo pode aparecer e, se puder, já registra (de uma vez só, sem corrida entre dois aparelhos).
--   p_intervalo_dias: intervalo do motivo neste escopo.
--   p_geral_dias: intervalo desde qualquer cameo (0 para momentos especiais, como jogo zerado).
-- Devolve o id do registro, ou null se não é hora. Guarda só os 60 cameos mais recentes de cada pessoa.
create or replace function public.iamiguinho_liberar(p_user uuid, p_motivo text, p_escopo text, p_intervalo_dias numeric, p_geral_dias numeric)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('iamiguinho:' || p_user::text));
  if exists (select 1 from iamiguinho_cameos where user_id = p_user and motivo = p_motivo and escopo = coalesce(p_escopo, '')
             and at > now() - make_interval(secs => p_intervalo_dias * 86400)) then
    return null;
  end if;
  if p_geral_dias > 0 and exists (select 1 from iamiguinho_cameos where user_id = p_user
             and at > now() - make_interval(secs => p_geral_dias * 86400)) then
    return null;
  end if;
  insert into iamiguinho_cameos (user_id, motivo, escopo) values (p_user, p_motivo, coalesce(p_escopo, '')) returning id into v_id;
  delete from iamiguinho_cameos where user_id = p_user and id not in (
    select id from iamiguinho_cameos where user_id = p_user order by at desc limit 60);
  return v_id;
end $$;

-- Guarda a fala que foi mostrada (só a do mascote).
create or replace function public.iamiguinho_falou(p_id bigint, p_user uuid, p_fala text, p_fonte text)
returns void language sql security definer set search_path = public as $$
  update iamiguinho_cameos set fala = left(p_fala, 200), fonte = case when p_fonte = 'ia' then 'ia' else 'biblioteca' end
  where id = p_id and user_id = p_user;
$$;

-- Reserva uma chamada à IA no dia. Devolve o total da pessoa no dia, ou -1 se passou de um dos tetos.
create or replace function public.iamiguinho_reservar(p_user uuid, p_dia date, p_limite integer, p_total integer)
returns integer language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  perform pg_advisory_xact_lock(hashtext('iamiguinho-dia:' || p_dia::text));
  if p_limite <= 0 or p_total <= 0 or coalesce((select sum(usos) from iamiguinho_ia_uso where dia = p_dia), 0) >= p_total then
    return -1;
  end if;
  insert into iamiguinho_ia_uso (dia, user_id, usos) values (p_dia, p_user, 1)
  on conflict (dia, user_id) do update set usos = iamiguinho_ia_uso.usos + 1 where iamiguinho_ia_uso.usos < p_limite
  returning usos into v;
  return coalesce(v, -1);
end $$;

revoke execute on function public.iamiguinho_liberar(uuid, text, text, numeric, numeric) from public, anon, authenticated;
revoke execute on function public.iamiguinho_falou(bigint, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.iamiguinho_reservar(uuid, date, integer, integer) from public, anon, authenticated;
grant execute on function public.iamiguinho_liberar(uuid, text, text, numeric, numeric) to service_role;
grant execute on function public.iamiguinho_falou(bigint, uuid, text, text) to service_role;
grant execute on function public.iamiguinho_reservar(uuid, date, integer, integer) to service_role;

-- Uso antigo da IA do mascote some sozinho depois de 30 dias (roda junto com a limpeza diária, se houver).
delete from public.iamiguinho_ia_uso where dia < current_date - 30;
