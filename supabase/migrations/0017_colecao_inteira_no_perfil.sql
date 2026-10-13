-- WinnerZ — 0017: a coleção inteira no perfil
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez. Precisa da 0015.
--
-- O perfil mostra as 60 peças mais recentes. Esta função devolve a coleção inteira (capa, título e
-- plataforma; nada da ficha dos exemplares) para a aba Coleção poder filtrar por plataforma e buscar.
-- Só responde para quem pode ver o pilar Coleção (todo mundo, ou quem tem o link).

create or replace function public.public_collection(p_handle text, p_key text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p profiles%rowtype;
begin
  select * into p from profiles where handle is not null and lower(handle) = lower(p_handle);
  if not found or not public.can_see_collection(p, p_key) then return null; end if;
  return coalesce((select jsonb_agg(x order by x ->> 'at' desc) from (
    select jsonb_build_object('title', g.title, 'slug', g.slug, 'cover', g.cover, 'platform', c.platform, 'year', g.year, 'at', c.created_at) x
    from copies c join games g on g.id = c.game_id
    where c.user_id = p.id and c.deleted_at is null
    order by c.created_at desc limit 5000) t), '[]'::jsonb);
end; $$;

grant execute on function public.public_collection(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
