-- WinnerZ — Sistema de live, etapa 3a: os widgets da tela (mortes, metas, enquete, sorteio, créditos) e a conta do
-- IAmiguinho na Twitch (o bot). Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez.
-- Precisa da 0082 e da 0083.
--
-- O chat da Twitch chega ao servidor pela própria Twitch (EventSub, com a conta do IAmiguinho autorizada) e o do
-- YouTube pela leitura da Central; o servidor passa cada mensagem para live_chat_processa, que conta o voto da enquete,
-- a entrada no sorteio, o "!morte" dos moderadores e quantas vezes cada um falou (para os créditos). Nenhuma mensagem é
-- guardada aqui: só o nome público de quem falou e a contagem.
-- O overlay (sem login) lê tudo por live_painel_ler e live_creditos: só o que já aparece na transmissão.
-- A Central da live muda o painel por live_painel_acao (só a administração).

-- A conta do IAmiguinho na Twitch (o bot) e os escopos que o canal autorizou. A chave de renovação fica cifrada.
alter table public.twitch_channel add column if not exists escopos text check (char_length(escopos) <= 600);
alter table public.twitch_channel add column if not exists bot_id text check (bot_id ~ '^[0-9]{1,20}$');
alter table public.twitch_channel add column if not exists bot_login text check (char_length(bot_login) <= 40);
alter table public.twitch_channel add column if not exists bot_refresh text check (char_length(bot_refresh) <= 2000);

create table if not exists public.live_painel (
  id smallint primary key default 1 check (id = 1),
  inicio timestamptz,
  mortes integer not null default 0 check (mortes between 0 and 99999),
  mortes_rotulo text check (char_length(mortes_rotulo) <= 40),
  mostrar_mortes boolean not null default false,
  metas jsonb not null default '[]'::jsonb,
  enquete jsonb,
  sorteio jsonb,
  updated_at timestamptz not null default now()
);
insert into public.live_painel (id) values (1) on conflict (id) do nothing;
alter table public.live_painel enable row level security;
revoke all on public.live_painel from anon, authenticated;

create table if not exists public.live_votos (
  enquete text not null check (char_length(enquete) <= 40),
  quem text not null check (char_length(quem) <= 80),
  opcao smallint not null check (opcao between 1 and 5),
  at timestamptz not null default now(),
  primary key (enquete, quem)
);
alter table public.live_votos enable row level security;
revoke all on public.live_votos from anon, authenticated;

create table if not exists public.live_sorteio (
  sorteio text not null check (char_length(sorteio) <= 40),
  quem text not null check (char_length(quem) <= 80),
  nome text not null check (char_length(nome) between 1 and 60),
  at timestamptz not null default now(),
  primary key (sorteio, quem)
);
alter table public.live_sorteio enable row level security;
revoke all on public.live_sorteio from anon, authenticated;

-- Quantas vezes cada um falou desde que a live começou (zera sozinho na live seguinte).
create table if not exists public.live_conversa (
  quem text primary key check (char_length(quem) <= 80),
  nome text not null check (char_length(nome) between 1 and 60),
  n integer not null default 1,
  ultima timestamptz not null default now()
);
alter table public.live_conversa enable row level security;
revoke all on public.live_conversa from anon, authenticated;

-- Os eventos de verdade (os testes da Central não contam nas metas nem nos créditos).
create or replace function public.live_evento_real(p_origem text, p_ext text) returns boolean
language sql immutable as $$ select p_origem <> 'teste' and coalesce(p_ext, '') not like 'teste:%' $$;

create or replace function public.live_meta_atual(p_tipo text, p_desde timestamptz) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(case p_tipo
    when 'seguidores' then (select count(*) from live_events where tipo = 'follow' and created_at >= p_desde and live_evento_real(origem, ext_id))
    when 'inscritos' then (select sum(case when tipo = 'gift' then coalesce(valor, 1) else 1 end) from live_events where tipo in ('sub', 'resub', 'gift', 'member') and created_at >= p_desde and live_evento_real(origem, ext_id))
    when 'bits' then (select sum(coalesce(valor, 0)) from live_events where tipo = 'cheer' and created_at >= p_desde and live_evento_real(origem, ext_id))
  end, 0)::integer;
$$;

create or replace function public.live_painel_ler() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'mortes', p.mortes, 'mortesRotulo', p.mortes_rotulo, 'mostrarMortes', p.mostrar_mortes,
    'metas', coalesce((select jsonb_agg(jsonb_build_object('id', x->>'id', 'tipo', x->>'tipo', 'titulo', x->>'titulo', 'alvo', (x->>'alvo')::integer,
        'atual', live_meta_atual(x->>'tipo', (x->>'desde')::timestamptz), 'mostrar', coalesce((x->>'mostrar')::boolean, true)) order by o)
      from jsonb_array_elements(p.metas) with ordinality as e(x, o)), '[]'::jsonb),
    'enquete', case when p.enquete is null then null else p.enquete || jsonb_build_object(
      'aberta', coalesce((p.enquete->>'aberta')::boolean, false) and (p.enquete->>'fechaEm' is null or (p.enquete->>'fechaEm')::timestamptz > now()),
      'votos', (select coalesce(jsonb_agg(c order by i), '[]'::jsonb) from (select i, (select count(*) from live_votos v where v.enquete = p.enquete->>'id' and v.opcao = i) c
        from generate_series(1, jsonb_array_length(coalesce(p.enquete->'opcoes', '[]'::jsonb))) i) z)) end,
    'sorteio', case when p.sorteio is null then null else (p.sorteio - 'ganhadores') || jsonb_build_object(
      'participantes', (select count(*) from live_sorteio s where s.sorteio = p.sorteio->>'id')) end,
    'inicio', p.inicio, 'agora', now())
  from live_painel p where p.id = 1;
$$;

create or replace function public.live_creditos() returns jsonb
language sql stable security definer set search_path = public as $$
  with ini as (select coalesce((select inicio from live_painel where id = 1), now() - interval '12 hours') as t),
  ev as (select tipo, quem, min(created_at) as m from live_events, ini where created_at >= ini.t and live_evento_real(origem, ext_id) group by tipo, quem)
  select jsonb_build_object(
    'seguidores', (select coalesce(jsonb_agg(quem order by m), '[]'::jsonb) from (select quem, min(m) m from ev where tipo = 'follow' group by quem order by m limit 120) x),
    'inscritos', (select coalesce(jsonb_agg(quem order by m), '[]'::jsonb) from (select quem, min(m) m from ev where tipo in ('sub', 'resub', 'gift', 'member') group by quem order by m limit 120) x),
    'apoios', (select coalesce(jsonb_agg(quem order by m), '[]'::jsonb) from (select quem, min(m) m from ev where tipo in ('cheer', 'superchat') group by quem order by m limit 120) x),
    'raids', (select coalesce(jsonb_agg(quem order by m), '[]'::jsonb) from (select quem, min(m) m from ev where tipo = 'raid' group by quem order by m limit 40) x),
    'conversa', (select coalesce(jsonb_agg(nome order by n desc), '[]'::jsonb) from (select nome, n from live_conversa, ini where ultima >= ini.t order by n desc limit 20) x));
$$;

-- As mensagens do chat (o servidor chama, com a chave secreta): [{ pl: 'tw'|'yt', uid, nome, texto, mod, dono }].
create or replace function public.live_chat_processa(p_msgs jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  m jsonb; p live_painel; t text; k text; n integer; ini timestamptz;
begin
  select * into p from live_painel where id = 1;
  ini := coalesce(p.inicio, now() - interval '12 hours');
  for m in select * from jsonb_array_elements(case when jsonb_typeof(p_msgs) = 'array' then p_msgs else '[]'::jsonb end) loop
    if coalesce(m->>'uid', '') = '' then continue; end if;
    k := left(coalesce(m->>'pl', '?') || ':' || (m->>'uid'), 80);
    t := btrim(left(coalesce(m->>'texto', ''), 300));
    if t = '' then continue; end if;
    insert into live_conversa (quem, nome, n, ultima) values (k, left(coalesce(nullif(btrim(m->>'nome'), ''), '?'), 60), 1, now())
      on conflict (quem) do update set nome = excluded.nome, n = case when live_conversa.ultima < ini then 1 else live_conversa.n + 1 end, ultima = now();
    if p.id is null then continue; end if;
    -- Enquete: "1", "!1" ou "voto 1" (vale o último voto de cada um).
    if p.enquete is not null and coalesce((p.enquete->>'aberta')::boolean, false)
       and (p.enquete->>'fechaEm' is null or (p.enquete->>'fechaEm')::timestamptz > now()) and t ~* '^!?(voto\s*)?[1-5]$' then
      n := substring(t from '([1-5])$')::integer;
      if n <= jsonb_array_length(coalesce(p.enquete->'opcoes', '[]'::jsonb)) then
        insert into live_votos (enquete, quem, opcao) values (p.enquete->>'id', k, n)
          on conflict (enquete, quem) do update set opcao = excluded.opcao, at = now();
      end if;
    end if;
    -- Sorteio: a palavra do sorteio (o dono do canal não entra).
    if p.sorteio is not null and coalesce((p.sorteio->>'aberto')::boolean, false) and lower(t) = lower(coalesce(p.sorteio->>'palavra', ''))
       and not coalesce((m->>'dono')::boolean, false) then
      insert into live_sorteio (sorteio, quem, nome) values (p.sorteio->>'id', k, left(coalesce(nullif(btrim(m->>'nome'), ''), '?'), 60)) on conflict do nothing;
    end if;
    -- Mortes: "!morte" soma uma, "!morte -" tira uma (só moderadores e o dono do canal).
    if (coalesce((m->>'mod')::boolean, false) or coalesce((m->>'dono')::boolean, false)) and t ~* '^!mortes?(\s|$)' then
      update live_painel set mortes = greatest(0, least(99999, mortes + case when t ~ '^!\S+\s*-' then -1 else 1 end)), updated_at = now() where id = 1
        returning * into p;
    end if;
  end loop;
end $$;

-- A Central da live muda o painel (só a administração). Devolve o painel novo.
create or replace function public.live_painel_acao(p_acao text, p jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  atual live_painel; novo jsonb := '[]'::jsonb; x jsonb; velho jsonb; ops jsonb; seg integer; nome text; quem text; i integer := 0;
begin
  if not is_admin() then raise exception 'Só a administração pode fazer isso.'; end if;
  insert into live_painel (id) values (1) on conflict (id) do nothing;
  select * into atual from live_painel where id = 1 for update;
  p := coalesce(p, '{}'::jsonb);
  case p_acao
  when 'mortes' then
    update live_painel set
      mortes = greatest(0, least(99999, case when p ? 'valor' then (p->>'valor')::integer else mortes + coalesce((p->>'delta')::integer, 0) end)),
      mortes_rotulo = case when p ? 'rotulo' then nullif(left(btrim(p->>'rotulo'), 40), '') else mortes_rotulo end,
      mostrar_mortes = case when p ? 'mostrar' then (p->>'mostrar')::boolean else mostrar_mortes end,
      updated_at = now() where id = 1;
  when 'metas' then
    for x in select * from jsonb_array_elements(case when jsonb_typeof(p->'metas') = 'array' then p->'metas' else '[]'::jsonb end) loop
      i := i + 1;
      exit when i > 3;
      if coalesce(x->>'tipo', '') not in ('seguidores', 'inscritos', 'bits') then continue; end if;
      select e into velho from jsonb_array_elements(atual.metas) e where e->>'id' = x->>'id' limit 1;
      novo := novo || jsonb_build_array(jsonb_build_object(
        'id', coalesce(velho->>'id', left(replace(gen_random_uuid()::text, '-', ''), 12)),
        'tipo', x->>'tipo',
        'titulo', left(btrim(coalesce(x->>'titulo', '')), 40),
        'alvo', greatest(1, least(10000000, coalesce((x->>'alvo')::integer, 10))),
        'mostrar', coalesce((x->>'mostrar')::boolean, true),
        'desde', case when velho is null or coalesce((x->>'recomecar')::boolean, false) then to_jsonb(now()) else velho->'desde' end));
    end loop;
    update live_painel set metas = novo, updated_at = now() where id = 1;
  when 'enquete-abrir' then
    ops := '[]'::jsonb;
    for x in select * from jsonb_array_elements(case when jsonb_typeof(p->'opcoes') = 'array' then p->'opcoes' else '[]'::jsonb end) loop
      if jsonb_typeof(x) = 'string' and btrim(x #>> '{}') <> '' and jsonb_array_length(ops) < 5 then ops := ops || to_jsonb(left(btrim(x #>> '{}'), 40)); end if;
    end loop;
    if jsonb_array_length(ops) < 2 then raise exception 'A enquete precisa de pelo menos duas opções.'; end if;
    seg := nullif(coalesce((p->>'segundos')::integer, 0), 0);
    delete from live_votos where true;
    update live_painel set enquete = jsonb_build_object('id', left(replace(gen_random_uuid()::text, '-', ''), 12),
      'pergunta', left(btrim(coalesce(p->>'pergunta', '')), 90), 'opcoes', ops, 'aberta', true, 'mostrar', true,
      'abertaEm', now(), 'fechaEm', case when seg is null then null else now() + make_interval(secs => greatest(10, least(3600, seg))) end), updated_at = now() where id = 1;
  when 'enquete-fechar' then
    update live_painel set enquete = enquete || jsonb_build_object('aberta', false, 'fechaEm', least(coalesce((enquete->>'fechaEm')::timestamptz, now()), now())), updated_at = now() where id = 1 and enquete is not null;
  when 'enquete-mostrar' then
    update live_painel set enquete = enquete || jsonb_build_object('mostrar', coalesce((p->>'mostrar')::boolean, true)), updated_at = now() where id = 1 and enquete is not null;
  when 'enquete-tirar' then
    delete from live_votos where true;
    update live_painel set enquete = null, updated_at = now() where id = 1;
  when 'sorteio-abrir' then
    delete from live_sorteio where true;
    update live_painel set sorteio = jsonb_build_object('id', left(replace(gen_random_uuid()::text, '-', ''), 12),
      'palavra', coalesce(nullif(left(lower(regexp_replace(btrim(coalesce(p->>'palavra', '')), '\s+', '', 'g')), 24), ''), '!sorteio'),
      'aberto', true, 'mostrar', true, 'ganhador', null, 'ganhadores', '[]'::jsonb), updated_at = now() where id = 1;
  when 'sorteio-fechar' then
    update live_painel set sorteio = sorteio || jsonb_build_object('aberto', false), updated_at = now() where id = 1 and sorteio is not null;
  when 'sorteio-sortear' then
    if atual.sorteio is null then raise exception 'Não há sorteio.'; end if;
    select s.quem, s.nome into quem, nome from live_sorteio s
      where s.sorteio = atual.sorteio->>'id' and not (coalesce(atual.sorteio->'ganhadores', '[]'::jsonb) ? s.quem)
      order by random() limit 1;
    if quem is null then raise exception 'Ninguém entrou no sorteio (ou todos já ganharam).'; end if;
    update live_painel set sorteio = sorteio || jsonb_build_object('aberto', false, 'mostrar', true, 'ganhador', nome, 'sorteadoEm', now(),
      'ganhadores', coalesce(sorteio->'ganhadores', '[]'::jsonb) || to_jsonb(quem)), updated_at = now() where id = 1;
  when 'sorteio-mostrar' then
    update live_painel set sorteio = sorteio || jsonb_build_object('mostrar', coalesce((p->>'mostrar')::boolean, true)), updated_at = now() where id = 1 and sorteio is not null;
  when 'sorteio-tirar' then
    delete from live_sorteio where true;
    update live_painel set sorteio = null, updated_at = now() where id = 1;
  when 'nova-live' then
    update live_painel set inicio = now(), updated_at = now() where id = 1;
  else
    raise exception 'Ação desconhecida.';
  end case;
  return live_painel_ler();
end $$;

revoke all on function public.live_meta_atual(text, timestamptz) from public, anon, authenticated;
revoke all on function public.live_chat_processa(jsonb) from public, anon, authenticated;
revoke all on function public.live_painel_acao(text, jsonb) from public, anon;
grant execute on function public.live_painel_acao(text, jsonb) to authenticated;
grant execute on function public.live_painel_ler() to anon, authenticated;
grant execute on function public.live_creditos() to anon, authenticated;
