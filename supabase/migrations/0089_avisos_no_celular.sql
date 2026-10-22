-- Avisos no celular (app WinnerZ): cada aviso novo da Central de Avisos também chega como notificação no celular.
--
-- Como funciona:
-- 1. O app registra o celular (o "token" do Firebase) em push_devices, com as escolhas de avisos daquele aparelho.
-- 2. Quando entra um aviso novo em notifications, o gatilho chama /api/push no site (pg_net), só com o id do aviso.
--    A função do site lê o aviso, confere as escolhas da pessoa e manda para o Firebase. Nada de segredo passa pelo banco.
-- 3. Alguns avisos só nascem quando a pessoa abre o site (lançamento, voltar a um jogo, lembrete de jogatina, resumo
--    da semana...). Um agendamento (pg_cron) gera esses avisos a cada 10 minutos para quem tem o app, e aí eles também chegam.
--
-- Precisa das extensões pg_net e pg_cron (no Supabase: Database > Extensions). Se o pg_cron não estiver liberado,
-- o resto funciona e só os avisos agendados ficam para quando a pessoa abrir o site.

create extension if not exists pg_net;

-- ---------------------------------------------------------------------------------------------------------------
-- Celulares
-- ---------------------------------------------------------------------------------------------------------------
create table if not exists public.push_devices (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  -- Escolhas deste aparelho (grupos de avisos): conversas, grupos, amigos, jornada, reacoes. Ausente = padrão.
  prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_devices_user on public.push_devices (user_id);
alter table public.push_devices enable row level security;
revoke all on public.push_devices from anon, authenticated;

-- O app registra (ou atualiza) este celular para a conta que está usando. Um token só pertence a uma conta por vez.
create or replace function public.push_register(p_token text, p_platform text, p_prefs jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if p_token is null or char_length(p_token) < 20 or char_length(p_token) > 4096 then raise exception 'bad_token'; end if;
  if p_platform not in ('android', 'ios') then raise exception 'bad_platform'; end if;
  insert into push_devices (token, user_id, platform, prefs, updated_at)
  values (p_token, auth.uid(), p_platform, coalesce(p_prefs, '{}'::jsonb), now())
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, prefs = excluded.prefs, updated_at = now();
end; $$;

-- Ao sair da conta (ou desligar os avisos no app), o celular deixa de receber.
create or replace function public.push_unregister(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from push_devices where token = p_token and user_id = auth.uid();
$$;

grant execute on function public.push_register(text, text, jsonb) to authenticated;
grant execute on function public.push_unregister(text) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Aviso novo → celular
-- ---------------------------------------------------------------------------------------------------------------
alter table public.notifications add column if not exists pushed_at timestamptz;

create or replace function public.push_on_notif() returns trigger
language plpgsql security definer set search_path = public as $$
declare pr profiles; chave text;
begin
  -- Só avisos de agora (os que a sincronização cria com data antiga não viram notificação).
  if new.created_at < now() - interval '12 hours' then return new; end if;
  if not exists (select 1 from push_devices where user_id = new.user_id) then return new; end if;
  -- As escolhas da Central de Avisos (Preferências > Avisos) valem também para o celular.
  select * into pr from profiles where id = new.user_id;
  chave := public.notif_pref_key(new.kind);
  if chave is not null and pr.id is not null and not public.cm_pref(pr, chave, true) then return new; end if;
  perform net.http_post(
    url := 'https://www.winnerz.com.br/api/push',
    body := jsonb_build_object('id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
exception when others then
  -- Avisar o celular nunca pode impedir o aviso de ser gravado.
  return new;
end; $$;

drop trigger if exists push_notif on public.notifications;
create trigger push_notif after insert on public.notifications for each row execute function public.push_on_notif();

-- ---------------------------------------------------------------------------------------------------------------
-- Avisos que nascem com o tempo (lançamento, lembrete de jogatina, retomada, resumos): gera para quem tem o app
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.push_sync_all() returns void
language plpgsql security definer set search_path = public as $$
declare u uuid;
begin
  for u in select distinct user_id from push_devices loop
    begin
      -- notif_sync usa auth.uid(): roda "como" a pessoa, só dentro desta chamada.
      perform set_config('request.jwt.claim.sub', u::text, true);
      perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
      perform public.notif_sync();
    exception when others then
      null; -- uma conta com problema não trava as outras
    end;
  end loop;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
end; $$;
revoke all on function public.push_sync_all() from public, anon, authenticated;

do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron não está liberado: ligue em Database > Extensions e rode esta migração de novo.';
    return;
  end;
  begin
    perform cron.unschedule('winnerz-avisos-celular');
  exception when others then null;
  end;
  perform cron.schedule('winnerz-avisos-celular', '*/10 * * * *', 'select public.push_sync_all();');
end $$;
