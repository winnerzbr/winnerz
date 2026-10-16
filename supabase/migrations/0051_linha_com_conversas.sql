-- 0051 · Linha do tempo com conversas
--
-- Na sua Jornada, entre os seus registros, aparece o que você escreveu na comunidade sobre aquele jogo:
-- postagens e respostas na Praça, em comunidades do jogo, em clubes e jogatinas do jogo. Só as suas, só para
-- você (a linha do tempo pública não muda). Apagadas ficam de fora. Pode rodar mais de uma vez.

create or replace function public.jornada_conversas(p_game text) returns jsonb
language sql stable security definer set search_path = public as $$
  with g as (select id from games where id = p_game or slug = p_game order by (id = p_game) desc limit 1),
  about as (
    select p.id, p.title, p.body, p.spoiler, p.created_at, p.community_id, p.club_id, p.jogatina_id, p.author,
      coalesce(c.name, 'Clube ' || k.name, 'Jogatina ' || jg.title, 'Praça') place,
      case when k.id is not null then '/clube/' || k.slug when jg.id is not null then '/jogatina/' || jg.id end grp
    from posts p
    left join communities c on c.id = p.community_id
    left join clubs k on k.id = p.club_id
    left join jogatinas jg on jg.id = p.jogatina_id
    where p.deleted_at is null and not p.mod_hidden
      and (p.game_id = (select id from g) or c.game_id = (select id from g) or k.game_id = (select id from g) or jg.game_id = (select id from g))),
  mine as (
    select jsonb_build_object('id', 'p-' || a.id, 'kind', 'postagem', 'title', coalesce(a.title, left(a.body, 90)),
      'excerpt', case when a.title is not null then left(a.body, 160) end, 'spoiler', a.spoiler is not null,
      'at', a.created_at, 'place', a.place, 'link', coalesce(a.grp || '#m-' || a.id, '/conversa/' || a.id),
      'replies', (select count(*) from replies r where r.post_id = a.id and r.deleted_at is null and r.author is distinct from a.author)) x, a.created_at at
    from about a where a.author = auth.uid()
    union all
    select jsonb_build_object('id', 'r-' || r.id, 'kind', 'resposta', 'title', coalesce(a.title, left(a.body, 90)),
      'excerpt', left(r.body, 160), 'spoiler', a.spoiler is not null,
      'at', r.created_at, 'place', a.place, 'link', coalesce(a.grp || '#m-' || r.id, '/conversa/' || a.id || '#r-' || r.id)) x, r.created_at at
    from replies r join about a on a.id = r.post_id
    where r.author = auth.uid() and r.deleted_at is null and not r.mod_hidden)
  select coalesce(jsonb_agg(x order by at), '[]'::jsonb) from (select * from mine order by at desc limit 80) z;
$$;

revoke all on function public.jornada_conversas(text) from public, anon;
grant execute on function public.jornada_conversas(text) to authenticated;
