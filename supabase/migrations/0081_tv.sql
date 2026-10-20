-- WinnerZ — Modo TV: entrar na TV pelo celular, sem digitar senha com o controle.
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez.
--
-- 1. A TV pede um código curto (6 letras) e guarda um segredo que só ela conhece (aqui fica só o resumo dele).
-- 2. No celular, já com a conta aberta, a pessoa confirma o código (/tv/parear).
-- 3. A TV pergunta com o segredo; se o código foi confirmado há menos de 10 minutos e ainda não foi usado, o servidor
--    (api/conta.ts) gera uma entrada de uso único para aquela conta, e a TV entra. O código não vale de novo.
-- A tabela não é lida pelo app: só o servidor, com a chave secreta.

create table if not exists public.tv_pair (
  code text primary key check (code ~ '^[A-Z0-9]{6}$'),
  secret_hash text not null,
  user_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  used_at timestamptz
);
create index if not exists tv_pair_created on public.tv_pair (created_at);
alter table public.tv_pair enable row level security;
revoke all on public.tv_pair from anon, authenticated;
