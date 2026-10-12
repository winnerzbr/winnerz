-- WinnerZ Awards: o resultado em duas datas.
--   results_at         → quando o resultado chega para a administração (para gravar o vídeo da revelação).
--   public_results_at  → quando ele aparece para todo mundo no site (depois do vídeo). Vazio = junto com o de cima.
-- Antes de results_at, ninguém vê a contagem: nem a administração. A votação fecha, no máximo, em results_at.
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez.

alter table public.awards add column if not exists public_results_at timestamptz;

create or replace function public.award_voting_open(cat uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from award_categories c join awards a on a.id = c.award_id
    where c.id = cat and a.published and a.voting_opens <= now() and (a.voting_closes is null or a.voting_closes > now())
      and (a.results_at is null or a.results_at > now()));
$$;

create or replace function public.award_results(p_award uuid)
returns table (category_id uuid, nominee_id uuid, votes integer)
language sql stable security definer set search_path = public as $$
  select n.category_id, n.id, count(v.user_id)::int
  from award_nominees n
  join award_categories c on c.id = n.category_id
  join awards a on a.id = c.award_id
  left join award_votes v on v.nominee_id = n.id
  where a.id = p_award and a.published and a.results_at is not null and a.results_at <= now()
    and (public.is_admin() or coalesce(a.public_results_at, a.results_at) <= now())
  group by n.category_id, n.id;
$$;
grant execute on function public.award_results(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
