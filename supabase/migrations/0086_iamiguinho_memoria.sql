-- WinnerZ — Sistema de live, etapa 4a: o IAmiguinho responde quem chama @iamiguinho no chat da live e lembra das
-- pessoas. Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez. Precisa da 0085.
--
-- O que fica guardado, só do que a pessoa disse para ele (nunca o resto do chat):
--   iam_pessoas: o nome público no chat, quando falou com ele a primeira e a última vez, quantas conversas e até 12
--     lembranças curtas que a própria pessoa contou (jogo favorito, o que está jogando...). Assunto sensível não entra:
--     a IA é instruída a não guardar e o servidor confere de novo.
--   iam_conversas: as últimas 20 perguntas e respostas de cada pessoa (para ele lembrar do papo).
-- "@iamiguinho esquece de mim" apaga a pessoa e as conversas na hora. A administração vê e apaga pela Central da live.
-- Nada disso é lido pelo app sem login.

alter table public.live_bot add column if not exists responde_mencoes boolean not null default true;

create table if not exists public.iam_pessoas (
  quem text primary key check (char_length(quem) <= 80),
  nome text not null check (char_length(nome) between 1 and 60),
  primeira_vez timestamptz not null default now(),
  ultima_vez timestamptz not null default now(),
  conversas integer not null default 0,
  fatos jsonb not null default '[]'::jsonb
);
create index if not exists iam_pessoas_recentes on public.iam_pessoas (ultima_vez desc);
alter table public.iam_pessoas enable row level security;
revoke all on public.iam_pessoas from anon, authenticated;

create table if not exists public.iam_conversas (
  id bigint generated always as identity primary key,
  quem text not null references public.iam_pessoas (quem) on delete cascade,
  pergunta text not null check (char_length(pergunta) between 1 and 300),
  resposta text not null check (char_length(resposta) between 1 and 300),
  em timestamptz not null default now()
);
create index if not exists iam_conversas_quem on public.iam_conversas (quem, em desc);
alter table public.iam_conversas enable row level security;
revoke all on public.iam_conversas from anon, authenticated;

-- Antes de responder (o servidor chama): a pessoa (criada na primeira vez), o que ele lembra dela, as últimas conversas
-- com ela e as últimas respostas dele para todo mundo (para não repetir). Se a pessoa chamou há menos de 12 segundos,
-- devolve { espera: true } e ele não responde (contra enxurrada).
create or replace function public.iam_chat_abrir(p_quem text, p_nome text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p iam_pessoas;
begin
  if coalesce(p_quem, '') = '' then return null; end if;
  select * into p from iam_pessoas where quem = p_quem for update;
  if p.quem is not null and p.conversas > 0 and p.ultima_vez > now() - interval '12 seconds' then return jsonb_build_object('espera', true); end if;
  insert into iam_pessoas (quem, nome) values (left(p_quem, 80), left(coalesce(nullif(btrim(p_nome), ''), '?'), 60))
    on conflict (quem) do update set nome = excluded.nome, ultima_vez = now()
    returning * into p;
  return jsonb_build_object('nome', p.nome, 'conversas', p.conversas, 'primeiraVez', p.primeira_vez, 'fatos', p.fatos,
    'recentes', (select coalesce(jsonb_agg(jsonb_build_object('p', pergunta, 'r', resposta) order by em), '[]'::jsonb) from (select * from iam_conversas where quem = p_quem order by em desc limit 4) x),
    'ultimas', (select coalesce(jsonb_agg(resposta), '[]'::jsonb) from (select resposta from iam_conversas order by em desc limit 6) y));
end $$;

-- Depois de responder: guarda a conversa, soma uma e junta as lembranças novas (sem repetir; fica com as 12 últimas).
create or replace function public.iam_chat_guardar(p_quem text, p_pergunta text, p_resposta text, p_fatos jsonb default '[]'::jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare atual jsonb; f jsonb; novos jsonb := '[]'::jsonb;
begin
  select fatos into atual from iam_pessoas where quem = p_quem for update;
  if atual is null then return; end if;
  for f in select * from jsonb_array_elements(case when jsonb_typeof(p_fatos) = 'array' then p_fatos else '[]'::jsonb end) loop
    if jsonb_typeof(f) = 'string' and char_length(btrim(f #>> '{}')) between 3 and 80
       and not exists (select 1 from jsonb_array_elements(atual || novos) a where lower(a->>'t') = lower(btrim(f #>> '{}'))) then
      novos := novos || jsonb_build_array(jsonb_build_object('t', btrim(f #>> '{}'), 'em', current_date));
    end if;
  end loop;
  atual := atual || novos;
  if jsonb_array_length(atual) > 12 then
    atual := (select jsonb_agg(e order by o) from jsonb_array_elements(atual) with ordinality as x(e, o) where o > jsonb_array_length(atual) - 12);
  end if;
  update iam_pessoas set conversas = conversas + 1, ultima_vez = now(), fatos = atual where quem = p_quem;
  insert into iam_conversas (quem, pergunta, resposta) values (p_quem, left(btrim(p_pergunta), 300), left(btrim(p_resposta), 300));
  delete from iam_conversas where quem = p_quem and id not in (select id from iam_conversas where quem = p_quem order by em desc limit 20);
end $$;

-- "@iamiguinho esquece de mim": apaga a pessoa e as conversas.
create or replace function public.iam_esquecer(p_quem text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  delete from iam_pessoas where quem = p_quem;
  return found;
end $$;

-- Central da live: quem ele lembra (só a administração).
create or replace function public.iam_memoria_ler(p_busca text default '') returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Só a administração pode fazer isso.'; end if;
  return jsonb_build_object(
    'responde', coalesce((select responde_mencoes from live_bot where id = 1), true),
    'total', (select count(*) from iam_pessoas),
    'pessoas', (select coalesce(jsonb_agg(jsonb_build_object('quem', quem, 'nome', nome, 'pl', split_part(quem, ':', 1), 'conversas', conversas,
        'primeiraVez', primeira_vez, 'ultimaVez', ultima_vez, 'fatos', fatos,
        'recentes', (select coalesce(jsonb_agg(jsonb_build_object('p', pergunta, 'r', resposta, 'em', em) order by em desc), '[]'::jsonb) from (select * from iam_conversas c where c.quem = p.quem order by em desc limit 3) z)) order by ultima_vez desc), '[]'::jsonb)
      from (select * from iam_pessoas where coalesce(p_busca, '') = '' or nome ilike '%' || replace(replace(p_busca, '%', ''), '_', '') || '%' order by ultima_vez desc limit 100) p));
end $$;

create or replace function public.iam_memoria_admin(p_acao text, p jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Só a administração pode fazer isso.'; end if;
  case p_acao
  when 'apagar' then delete from iam_pessoas where quem = p->>'quem';
  when 'apagar-fato' then
    update iam_pessoas set fatos = coalesce((select jsonb_agg(e order by o) from jsonb_array_elements(fatos) with ordinality as x(e, o) where o - 1 <> (p->>'i')::integer), '[]'::jsonb)
      where quem = p->>'quem';
  when 'apagar-tudo' then delete from iam_pessoas where true;
  when 'mencoes' then
    insert into live_bot (id) values (1) on conflict (id) do nothing;
    update live_bot set responde_mencoes = coalesce((p->>'ligado')::boolean, true), updated_at = now() where id = 1;
  else raise exception 'Ação desconhecida.';
  end case;
  return iam_memoria_ler(coalesce(p->>'busca', ''));
end $$;

revoke all on function public.iam_chat_abrir(text, text) from public, anon, authenticated;
revoke all on function public.iam_chat_guardar(text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.iam_esquecer(text) from public, anon, authenticated;
revoke all on function public.iam_memoria_ler(text) from public, anon;
revoke all on function public.iam_memoria_admin(text, jsonb) from public, anon;
grant execute on function public.iam_memoria_ler(text) to authenticated;
grant execute on function public.iam_memoria_admin(text, jsonb) to authenticated;
