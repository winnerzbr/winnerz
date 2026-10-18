-- WinnerZ — Segurança, etapa B: contadores de uso das funções do servidor.
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez.
--
-- Um contador por "balde" (ex.: "igdb-ficha:<id da pessoa>" ou "ia-site") e por dia ou por mês, no horário de Brasília.
-- Só o servidor (service_role) mexe: o app e quem chama o banco direto não leem nem gravam.
-- Enquanto esta migração não roda, o site segue funcionando sem os limites novos.

create table if not exists public.api_hits (
  bucket text not null check (length(bucket) between 1 and 120),
  day date not null,
  n integer not null default 0,
  primary key (bucket, day)
);
create index if not exists api_hits_day on public.api_hits (day);
alter table public.api_hits enable row level security;
revoke all on public.api_hits from public, anon, authenticated;
grant select, insert, update, delete on public.api_hits to service_role;

-- Soma p_cost ao balde, só se não passar de p_limit. Devolve o total novo, ou -1 se passaria do limite.
-- p_cost negativo devolve um uso (nunca fica abaixo de zero). p_monthly: o balde vale pelo mês inteiro.
create or replace function public.api_hit(p_bucket text, p_limit integer, p_cost integer default 1, p_monthly boolean default false)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  d date := (now() at time zone 'America/Sao_Paulo')::date;
  v integer;
begin
  if p_bucket is null or length(p_bucket) not between 1 and 120 then return -1; end if;
  if p_monthly then d := date_trunc('month', d)::date; end if;
  if p_cost > 0 and p_cost > p_limit then return -1; end if;
  insert into public.api_hits as h (bucket, day, n) values (p_bucket, d, greatest(p_cost, 0))
  on conflict (bucket, day) do update set n = greatest(h.n + p_cost, 0)
    where p_cost <= 0 or h.n + p_cost <= p_limit
  returning h.n into v;
  -- Limpeza de vez em quando: contadores com mais de dois meses não servem para nada.
  if random() < 0.01 then delete from public.api_hits where day < d - 62; end if;
  return coalesce(v, -1);
end $$;

revoke execute on function public.api_hit(text, integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.api_hit(text, integer, integer, boolean) to service_role;
