-- WinnerZ — Etapa 4: Retomada, companhia na sessão e limite de uso da IA.
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez.

-- Cápsula de Retomada: onde estou, o que fazia, o que fazer depois, não esquecer (por História).
alter table public.histories add column if not exists capsule jsonb;

-- Com quem você jogou (nomes livres, opcionais) em cada sessão.
alter table public.sessions add column if not exists companions text[];

-- Quantas vezes cada pessoa usou a IA no mês (a Retomada Inteligente tem limite mensal).
-- Só o servidor escreve aqui (com a chave secreta); cada pessoa só lê o próprio uso.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null,
  uses integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);
alter table public.ai_usage enable row level security;
drop policy if exists "ai usage own read" on public.ai_usage;
create policy "ai usage own read" on public.ai_usage for select to authenticated using (user_id = auth.uid());

notify pgrst, 'reload schema';
