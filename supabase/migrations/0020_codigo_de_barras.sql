-- WinnerZ — Etapa 5, entrega 6: adicionar pela câmera (código de barras e foto da capa).
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez.
--
-- Quando alguém lê um código de barras e confirma qual jogo é, o WinnerZ aprende: da próxima vez,
-- para qualquer pessoa, o mesmo código já sugere aquele jogo. Cada pessoa conta um voto por código
-- (quem confirmar errado não consegue empurrar a sugestão sozinho). Ninguém lê nem escreve aqui
-- direto pelo site: só o servidor, com a chave secreta.

create table if not exists public.barcode_votes (
  code text not null check (code ~ '^[0-9]{8,14}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  igdb_id integer,
  slug text not null check (length(slug) between 1 and 200),
  title text not null check (length(title) between 1 and 200),
  platform text check (platform is null or length(platform) <= 80),
  created_at timestamptz not null default now(),
  primary key (code, user_id)
);
create index if not exists barcode_votes_code on public.barcode_votes (code);
alter table public.barcode_votes enable row level security;

-- O que a base pública de códigos (UPCitemdb) disse sobre um código, guardado para não perguntar de novo.
-- "title" vazio quer dizer que a base não conhecia o código (também fica guardado, por um tempo).
create table if not exists public.barcode_lookup (
  code text primary key check (code ~ '^[0-9]{8,14}$'),
  title text,
  brand text,
  source text not null default 'upcitemdb',
  fetched_at timestamptz not null default now()
);
alter table public.barcode_lookup enable row level security;

-- Sem políticas: com RLS ligado e nenhuma política, só a chave secreta (servidor) enxerga as tabelas.
revoke all on public.barcode_votes from anon, authenticated;
revoke all on public.barcode_lookup from anon, authenticated;
grant all on public.barcode_votes to service_role;
grant all on public.barcode_lookup to service_role;
