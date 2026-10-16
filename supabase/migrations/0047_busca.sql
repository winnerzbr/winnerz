-- 0047 · Comunidade, entrega G: busca
--
-- Uma função que procura, de uma vez, pessoas, comunidades, conversas, clubes e jogatinas, respeitando o que cada
-- um pode ver (bloqueios, suspensões, clubes e jogatinas fechados, moderação). Sem acento e sem diferença de
-- maiúsculas (norm_text, da 0024). Conversas com spoiler mostram só o título. Jogos e o seu acervo continuam vindo
-- do IGDB e do próprio navegador.
--
-- Pode rodar mais de uma vez.

create index if not exists posts_created on public.posts (created_at desc) where deleted_at is null and not mod_hidden;

create or replace function public.search_community(p_q text, p_limit integer default 6) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare q text := public.norm_text(trim(coalesce(p_q, ''))); lim integer := greatest(1, least(coalesce(p_limit, 6), 30)); pat text;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  if char_length(q) < 2 then return jsonb_build_object('pessoas', '[]'::jsonb, 'comunidades', '[]'::jsonb, 'conversas', '[]'::jsonb, 'clubes', '[]'::jsonb, 'jogatinas', '[]'::jsonb); end if;
  pat := '%' || replace(replace(q, '%', ''), '_', '') || '%';
  return jsonb_build_object(
    'pessoas', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select public.person_json(p.id) || jsonb_build_object('bio', left(coalesce(p.bio, ''), 120)) x
      from profiles p
      where p.handle is not null and p.id <> auth.uid() and public.author_visible(p.id)
        and (public.norm_text(p.handle) like pat or public.norm_text(coalesce(p.bio, '')) like pat)
      order by (public.norm_text(p.handle) like q || '%') desc, char_length(p.handle) limit lim) z),
    'comunidades', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select jsonb_build_object('slug', c.slug, 'name', c.name, 'description', left(c.description, 140), 'official', c.official,
                                'members', (select count(*) from community_members m where m.community_id = c.id)) x
      from communities c
      where not c.mod_hidden and (public.norm_text(c.name) like pat or public.norm_text(c.slug) like pat or public.norm_text(c.description) like pat)
      order by c.official desc, (public.norm_text(c.name) like q || '%') desc, (select count(*) from community_members m where m.community_id = c.id) desc limit lim) z),
    'conversas', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select jsonb_build_object('id', p.id, 'title', coalesce(p.title, case when p.spoiler is not null then 'Conversa com spoiler' else left(p.body, 90) end),
                                'excerpt', case when p.spoiler is null then left(p.body, 160) else null end, 'spoiler', p.spoiler is not null,
                                'author', public.person_json(p.author), 'at', p.created_at,
                                'place', coalesce((select c.name from communities c where c.id = p.community_id), 'Praça'),
                                'game', (select g.title from games g where g.id = p.game_id),
                                'replies', (select count(*) from replies r where r.post_id = p.id and r.deleted_at is null)) x
      from posts p
      where p.deleted_at is null and not p.mod_hidden and p.club_id is null and p.jogatina_id is null
        and public.author_visible(p.author)
        and not exists (select 1 from communities c where c.id = p.community_id and c.mod_hidden)
        and (public.norm_text(coalesce(p.title, '')) like pat or (p.spoiler is null and public.norm_text(p.body) like pat)
             or exists (select 1 from games g where g.id = p.game_id and public.norm_text(g.title) like pat))
      order by p.created_at desc limit lim) z),
    'clubes', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select jsonb_build_object('slug', k.slug, 'name', k.name, 'description', left(k.description, 140), 'format', k.format,
                                'game', (select jsonb_build_object('title', g.title, 'cover', g.cover, 'slug', g.slug) from games g where g.id = k.game_id),
                                'members', (select count(*) from club_members m where m.club_id = k.id)) x
      from clubs k
      where public.club_open(k) and (public.norm_text(k.name) like pat or public.norm_text(k.description) like pat
             or exists (select 1 from games g where g.id = k.game_id and public.norm_text(g.title) like pat))
      order by (select count(*) from club_members m where m.club_id = k.id) desc limit lim) z),
    'jogatinas', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
      select jsonb_build_object('id', j.id, 'title', j.title, 'startsAt', j.starts_at,
                                'game', (select jsonb_build_object('title', g.title, 'cover', g.cover, 'slug', g.slug) from games g where g.id = j.game_id),
                                'going', (select count(*) from jogatina_people x where x.jogatina_id = j.id and x.rsvp = 'vou')) x
      from jogatinas j
      where j.canceled_at is null and j.starts_at + make_interval(mins => j.duration_min) > now() - interval '1 day' and public.jogatina_open(j)
        and (public.norm_text(j.title) like pat or public.norm_text(j.description) like pat
             or exists (select 1 from games g where g.id = j.game_id and public.norm_text(g.title) like pat))
      order by j.starts_at limit lim) z)
  );
end; $$;

revoke all on function public.search_community(text, integer) from public, anon;
grant execute on function public.search_community(text, integer) to authenticated;
