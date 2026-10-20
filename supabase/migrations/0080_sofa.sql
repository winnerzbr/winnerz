-- WinnerZ — IAmiguinho no sofá: o co-apresentador das lives do canal (só a administração usa).
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez. Precisa da 0075.
--
-- A cabine (/studio/sofa) roda no computador da live: olha a tela do jogo de tempos em tempos e pede uma fala à IA
-- pela /api/iamiguinho (kind 'sofa'), que confere se quem pede é da administração. A fala do momento fica nesta
-- linha única, e o overlay da live (que não tem login) lê só ela para mostrar o balão na tela.
-- O que fica aqui já é público por natureza (aparece na transmissão): a fala, o tipo de cena e a hora.

create table if not exists public.sofa_live (
  id smallint primary key default 1 check (id = 1),
  ligado boolean not null default false,       -- a cabine está olhando
  calado boolean not null default false,       -- botão "calar": o balão some na hora e nada novo aparece
  fala text,
  cena text,
  falou_em timestamptz,
  updated_at timestamptz not null default now(),
  check (fala is null or length(fala) <= 300)
);
insert into public.sofa_live (id) values (1) on conflict (id) do nothing;

alter table public.sofa_live enable row level security;
revoke all on public.sofa_live from anon, authenticated;
-- O overlay lê só estas colunas (a escrita é só do servidor, com a chave secreta).
grant select (ligado, calado, fala, cena, falou_em) on public.sofa_live to anon, authenticated;
drop policy if exists sofa_live_ler on public.sofa_live;
create policy sofa_live_ler on public.sofa_live for select to anon, authenticated using (id = 1);
