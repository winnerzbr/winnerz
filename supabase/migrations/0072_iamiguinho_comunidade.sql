-- WinnerZ — IAmiguinho M5 (Fase 3, a Comunidade e os Eventos): as respostas dele quando alguém chama @iamiguinho.
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez. Precisa da 0071.
--
-- Ele não tem conta: as respostas dele ficam numa tabela própria, ligadas à postagem ou à resposta que o chamou.
-- Assim não contam como resposta de pessoa, não entram em ranking e não geram conta falsa.
-- Só o servidor escreve (/api/iamiguinho, com a chave secreta). Ler é pelas funções abaixo, com as mesmas regras de
-- visibilidade da conversa (post_get).
create table if not exists public.iamiguinho_respostas (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  origem text not null check (origem in ('post', 'resposta')),
  origem_id uuid not null,
  reply_id uuid references public.replies (id) on delete cascade,
  pergunta_de uuid not null references auth.users (id) on delete cascade,
  body text check (body is null or char_length(body) <= 400),
  fonte text check (fonte is null or fonte in ('ia', 'biblioteca')),
  estado text not null default 'pendente' check (estado in ('pendente', 'publicada', 'tirada')),
  created_at timestamptz not null default now(),
  unique (origem, origem_id)
);
create index if not exists iamiguinho_respostas_post on public.iamiguinho_respostas (post_id, created_at);
create index if not exists iamiguinho_respostas_quem on public.iamiguinho_respostas (pergunta_de, created_at desc);
create index if not exists iamiguinho_respostas_recentes on public.iamiguinho_respostas (created_at desc) where estado = 'publicada';
alter table public.iamiguinho_respostas enable row level security;

-- Começo do dia no horário de Brasília (os tetos viram junto com o calendário da pessoa).
create or replace function public.iamiguinho_inicio_do_dia() returns timestamptz
language sql stable as $$
  select (date_trunc('day', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo';
$$;

-- Reserva a resposta antes de chamar a IA: uma por postagem ou resposta que chamou, com teto por pessoa e para o
-- site todo por dia. Devolve o id da reserva, ou null (já respondida, ou passou do teto).
create or replace function public.iamiguinho_mencao_reservar(p_user uuid, p_origem text, p_origem_id uuid, p_post uuid, p_reply uuid, p_limite integer, p_total integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_inicio timestamptz := public.iamiguinho_inicio_do_dia();
begin
  perform pg_advisory_xact_lock(hashtext('iamiguinho-mencao'));
  if exists (select 1 from iamiguinho_respostas where origem = p_origem and origem_id = p_origem_id) then return null; end if;
  if p_limite <= 0 or (select count(*) from iamiguinho_respostas where pergunta_de = p_user and created_at >= v_inicio) >= p_limite then return null; end if;
  if p_total <= 0 or (select count(*) from iamiguinho_respostas where created_at >= v_inicio) >= p_total then return null; end if;
  insert into iamiguinho_respostas (post_id, origem, origem_id, reply_id, pergunta_de)
  values (p_post, p_origem, p_origem_id, p_reply, p_user) returning id into v_id;
  return v_id;
end $$;

create or replace function public.iamiguinho_mencao_publicar(p_id uuid, p_body text, p_fonte text)
returns void language sql security definer set search_path = public as $$
  update iamiguinho_respostas set body = left(p_body, 400), fonte = case when p_fonte = 'ia' then 'ia' else 'biblioteca' end,
    estado = 'publicada', created_at = now()
  where id = p_id and estado = 'pendente';
$$;

-- Quando ele decide não responder (assunto proibido, moderação), a reserva some e não conta no teto.
create or replace function public.iamiguinho_mencao_desistir(p_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from iamiguinho_respostas where id = p_id and estado = 'pendente';
$$;

-- As respostas dele numa conversa, com as mesmas regras de visibilidade do post_get.
create or replace function public.iamiguinho_fio(p_post uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p posts%rowtype; c communities%rowtype; v_mod boolean := false;
begin
  select * into p from posts where id = p_post;
  if not found or p.club_id is not null or p.jogatina_id is not null then return '[]'::jsonb; end if;
  if p.community_id is not null then
    select * into c from communities where id = p.community_id;
    if not found or not public.community_open(c) then return '[]'::jsonb; end if;
    v_mod := public.community_can_moderate(c.id);
  else
    v_mod := public.is_admin();
  end if;
  if not public.content_open(p.author, p.mod_hidden, p.deleted_at) then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'origem', a.origem, 'origemId', a.origem_id, 'body', a.body,
      'createdAt', a.created_at, 'canRemove', coalesce(a.pergunta_de = auth.uid(), false) or v_mod or public.is_admin()) order by a.created_at)
    from iamiguinho_respostas a
    left join replies r on r.id = a.reply_id
    where a.post_id = p.id and a.estado = 'publicada'
      and (a.origem = 'post' or (r.id is not null and r.deleted_at is null and not r.mod_hidden and public.author_visible(r.author)))), '[]'::jsonb);
end $$;

-- Quem chamou, a moderação da comunidade ou a administração podem tirar a resposta dele do ar.
create or replace function public.iamiguinho_tirar(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a iamiguinho_respostas%rowtype; v_comm uuid;
begin
  select * into a from iamiguinho_respostas where id = p_id;
  if not found then return; end if;
  select community_id into v_comm from posts where id = a.post_id;
  if not (coalesce(a.pergunta_de = auth.uid(), false) or public.is_admin() or (v_comm is not null and public.community_can_moderate(v_comm))) then
    raise exception 'sem_permissao';
  end if;
  update iamiguinho_respostas set estado = 'tirada' where id = p_id;
end $$;

-- "Aparições públicas" no perfil @iamiguinho: só respostas em conversas abertas a todo mundo (Praça e comunidades
-- no ar), nunca em clube ou jogatina, e nunca se a conversa ou a resposta que chamou saiu do ar.
create or replace function public.iamiguinho_aparicoes(p_limit integer default 12) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by (x->>'createdAt') desc), '[]'::jsonb) from (
    select jsonb_build_object('id', a.id, 'postId', p.id, 'title', coalesce(nullif(p.title, ''), left(p.body, 80)),
      'place', coalesce(c.name, 'Praça'), 'body', a.body, 'createdAt', a.created_at,
      'anchor', case when a.origem = 'resposta' then 'r-' || a.origem_id::text else null end) as x
    from iamiguinho_respostas a
    join posts p on p.id = a.post_id
    left join communities c on c.id = p.community_id
    left join replies r on r.id = a.reply_id
    where a.estado = 'publicada' and p.club_id is null and p.jogatina_id is null and p.deleted_at is null and not p.mod_hidden
      and (c.id is null or not c.mod_hidden)
      and not exists (select 1 from profiles pr where pr.id = p.author and pr.suspended_until > now())
      and (a.origem = 'post' or (r.id is not null and r.deleted_at is null and not r.mod_hidden))
    order by a.created_at desc
    limit least(greatest(p_limit, 1), 30)
  ) t;
$$;

revoke all on function public.iamiguinho_inicio_do_dia() from public, anon, authenticated;
revoke all on function public.iamiguinho_mencao_reservar(uuid, text, uuid, uuid, uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.iamiguinho_mencao_publicar(uuid, text, text) from public, anon, authenticated;
revoke all on function public.iamiguinho_mencao_desistir(uuid) from public, anon, authenticated;
revoke all on function public.iamiguinho_fio(uuid) from public;
revoke all on function public.iamiguinho_tirar(uuid) from public, anon;
revoke all on function public.iamiguinho_aparicoes(integer) from public;
grant execute on function public.iamiguinho_mencao_reservar(uuid, text, uuid, uuid, uuid, integer, integer) to service_role;
grant execute on function public.iamiguinho_mencao_publicar(uuid, text, text) to service_role;
grant execute on function public.iamiguinho_mencao_desistir(uuid) to service_role;
grant execute on function public.iamiguinho_fio(uuid) to anon, authenticated;
grant execute on function public.iamiguinho_tirar(uuid) to authenticated;
grant execute on function public.iamiguinho_aparicoes(integer) to anon, authenticated;
