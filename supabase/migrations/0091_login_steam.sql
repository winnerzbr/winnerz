-- =================================================================================================================
-- 0091 · Entrar com a Steam
--
-- A Steam usa um login antigo (OpenID 2.0) que o Supabase não faz sozinho. Quem confere é a função /api/conta (com a
-- chave secreta do servidor): ela recebe o número da conta Steam (SteamID, 17 dígitos) e procura aqui de quem é.
--   · Entrou com a Steam pela primeira vez, sem conta: nasce uma conta nova, ligada a essa Steam.
--   · Já tem conta (pelo e-mail, Google…): em Preferências → Conta → Contas ligadas, liga a Steam a ela.
-- Uma Steam só pode estar ligada a uma conta, e uma conta só a uma Steam. Apagar a conta apaga a ligação.
-- A pessoa só lê a própria linha (para a tela de Contas ligadas); gravar, só o servidor.
--
-- Pode rodar mais de uma vez.
-- =================================================================================================================

create table if not exists public.steam_logins (
  steam_id text primary key check (steam_id ~ '^[0-9]{17}$'),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.steam_logins enable row level security;
revoke all on public.steam_logins from anon, authenticated;
grant select on public.steam_logins to authenticated;

drop policy if exists "steam login own read" on public.steam_logins;
create policy "steam login own read" on public.steam_logins for select to authenticated
  using (user_id = auth.uid());
