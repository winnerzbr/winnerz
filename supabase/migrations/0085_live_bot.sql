-- WinnerZ — Sistema de live, etapa 3b: o bot do IAmiguinho no chat da Twitch (comandos, avisos automáticos, moderação
-- e pontos por conversar e assistir). Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma
-- vez. Precisa da 0084.
--
-- Cada mensagem do chat chega ao servidor (EventSub, pela conta do IAmiguinho). O servidor confere a moderação e chama
-- live_bot_msg, que faz o que a 0084 já fazia (enquete, sorteio, mortes, créditos), soma os pontos, procura o comando e
-- diz se é hora de um aviso automático; o servidor responde no chat como o IAmiguinho. Nenhuma mensagem é guardada:
-- dos pontos, só o nome público e o total. Nada aqui é lido pelo app sem login; a Central usa live_bot_ler e
-- live_bot_admin (só a administração).

create table if not exists public.live_bot (
  id smallint primary key default 1 check (id = 1),
  ligado boolean not null default true,
  pontos_nome text not null default 'pontos' check (char_length(pontos_nome) between 1 and 20),
  pontos_msg integer not null default 5 check (pontos_msg between 0 and 1000),
  pontos_assistir integer not null default 10 check (pontos_assistir between 0 and 1000),
  mod_links boolean not null default false,
  mod_links_ok text not null default 'winnerz.com.br twitch.tv youtube.com youtu.be' check (char_length(mod_links_ok) <= 500),
  mod_caps boolean not null default false,
  mod_palavras text not null default '' check (char_length(mod_palavras) <= 2000),
  mod_acao text not null default 'apagar' check (mod_acao in ('apagar', 'castigo')),
  mod_segundos integer not null default 60 check (mod_segundos between 10 and 3600),
  mod_isentos_subs boolean not null default true,
  ultima_distribuicao timestamptz,
  status text check (char_length(status) <= 120),
  updated_at timestamptz not null default now()
);
insert into public.live_bot (id) values (1) on conflict (id) do nothing;
alter table public.live_bot enable row level security;
revoke all on public.live_bot from anon, authenticated;

create table if not exists public.live_comandos (
  nome text primary key check (nome ~ '^![a-z0-9_]{1,24}$'),
  resposta text not null check (char_length(resposta) between 1 and 400),
  so_mod boolean not null default false,
  ativo boolean not null default true,
  usos integer not null default 0,
  ultimo_uso timestamptz
);
alter table public.live_comandos enable row level security;
revoke all on public.live_comandos from anon, authenticated;
insert into public.live_comandos (nome, resposta, so_mod) values
  ('!discord', 'Entra no Discord do canal: {discord}', false),
  ('!redes', 'YouTube: {youtube} · Twitch: {twitch} · Discord: {discord}', false),
  ('!figurinha', 'Figurinhas da live: winnerz.com.br/codigo', false),
  ('!tempo', 'No ar há {tempo}.', false),
  ('!so', 'Conheçam o canal de {alvo}: twitch.tv/{alvo}', true)
on conflict (nome) do nothing;

create table if not exists public.live_avisos (
  id text primary key default left(replace(gen_random_uuid()::text, '-', ''), 12),
  texto text not null check (char_length(texto) between 1 and 400),
  a_cada_min integer not null default 20 check (a_cada_min between 5 and 240),
  min_msgs integer not null default 10 check (min_msgs between 0 and 500),
  ativo boolean not null default false,
  ultimo_em timestamptz,
  msgs_desde integer not null default 0,
  criado_em timestamptz not null default now()
);
alter table public.live_avisos enable row level security;
revoke all on public.live_avisos from anon, authenticated;
insert into public.live_avisos (id, texto, a_cada_min, min_msgs, ativo)
  values ('padrao', 'Curtindo a live? Segue o canal e pega uma figurinha em winnerz.com.br/codigo', 20, 15, false)
on conflict (id) do nothing;

create table if not exists public.live_pontos (
  quem text primary key check (char_length(quem) <= 80),
  nome text not null check (char_length(nome) between 1 and 60),
  pontos bigint not null default 0 check (pontos >= 0),
  ultimo_msg timestamptz,
  atualizado timestamptz not null default now()
);
create index if not exists live_pontos_top on public.live_pontos (pontos desc);
alter table public.live_pontos enable row level security;
revoke all on public.live_pontos from anon, authenticated;

-- Uma mensagem do chat (o servidor chama, com a chave secreta, depois de conferir a moderação):
-- { pl, uid, nome, texto, mod, dono }. Devolve o que o bot faz: o comando achado, os pontos de quem falou, o top 5
-- (para !top), um aviso automático que chegou a hora (e já fica marcado) e se é hora de dar os pontos por assistir.
create or replace function public.live_bot_msg(p_msg jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  b live_bot; k text; t text; palavra text; c live_comandos; av live_avisos; pts bigint := 0; out jsonb := '{}'::jsonb;
  ehmod boolean;
begin
  perform live_chat_processa(jsonb_build_array(p_msg));
  select * into b from live_bot where id = 1;
  if b.id is null or coalesce(p_msg->>'uid', '') = '' then return out; end if;
  k := left(coalesce(p_msg->>'pl', '?') || ':' || (p_msg->>'uid'), 80);
  t := btrim(left(coalesce(p_msg->>'texto', ''), 300));
  ehmod := coalesce((p_msg->>'mod')::boolean, false) or coalesce((p_msg->>'dono')::boolean, false);
  -- Pontos por conversar: no máximo uma vez por minuto.
  insert into live_pontos (quem, nome, pontos, ultimo_msg) values (k, left(coalesce(nullif(btrim(p_msg->>'nome'), ''), '?'), 60), b.pontos_msg, now())
    on conflict (quem) do update set nome = excluded.nome, atualizado = now(),
      pontos = live_pontos.pontos + case when live_pontos.ultimo_msg is null or live_pontos.ultimo_msg < now() - interval '1 minute' then b.pontos_msg else 0 end,
      ultimo_msg = case when live_pontos.ultimo_msg is null or live_pontos.ultimo_msg < now() - interval '1 minute' then now() else live_pontos.ultimo_msg end
    returning pontos into pts;
  out := out || jsonb_build_object('pontos', pts, 'pontosNome', b.pontos_nome);
  if not b.ligado then return out; end if;
  -- Comando: a primeira palavra, se começar com "!". Os da casa (!comandos, !pontos, !top) e os da Central.
  if t ~ '^!' then
    palavra := lower(substring(t from '^(!\S+)'));
    if palavra = '!top' then
      out := out || jsonb_build_object('comando', jsonb_build_object('nome', '!top'), 'top',
        (select coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'pontos', pontos) order by pontos desc), '[]'::jsonb) from (select nome, pontos from live_pontos where pontos > 0 order by pontos desc limit 5) x));
    elsif palavra in ('!pontos', '!comandos') then
      out := out || jsonb_build_object('comando', jsonb_build_object('nome', palavra));
      if palavra = '!comandos' then
        out := out || jsonb_build_object('lista', (select coalesce(jsonb_agg(nome order by nome), '[]'::jsonb) from live_comandos where ativo and (ehmod or not so_mod)));
      end if;
    else
      select * into c from live_comandos where nome = palavra and ativo;
      if c.nome is not null and (ehmod or not c.so_mod) and (c.ultimo_uso is null or c.ultimo_uso < now() - interval '10 seconds') then
        update live_comandos set usos = usos + 1, ultimo_uso = now() where nome = c.nome;
        out := out || jsonb_build_object('comando', jsonb_build_object('nome', c.nome, 'resposta', c.resposta));
      end if;
    end if;
  end if;
  -- Avisos automáticos: contam as mensagens; quando passa o tempo e o chat falou o bastante, sai um (o mais atrasado).
  update live_avisos set msgs_desde = msgs_desde + 1 where ativo;
  select * into av from live_avisos
    where ativo and (ultimo_em is null or ultimo_em <= now() - make_interval(mins => a_cada_min)) and msgs_desde >= min_msgs
    order by ultimo_em nulls first limit 1 for update skip locked;
  if av.id is not null then
    update live_avisos set ultimo_em = now(), msgs_desde = 0 where id = av.id;
    out := out || jsonb_build_object('aviso', av.texto);
  end if;
  -- Pontos por assistir: a cada 5 minutos, quem está no chat da Twitch (o servidor pede a lista à Twitch).
  if b.pontos_assistir > 0 and (b.ultima_distribuicao is null or b.ultima_distribuicao < now() - interval '5 minutes') then
    update live_bot set ultima_distribuicao = now() where id = 1;
    out := out || jsonb_build_object('distribuir', true);
  end if;
  return out;
end $$;

-- Pontos por assistir: [{ uid, nome }] de quem está no chat da Twitch agora.
create or replace function public.live_pontos_assistir(p_quem jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare b live_bot; n integer := 0; x jsonb;
begin
  select * into b from live_bot where id = 1;
  if b.id is null or b.pontos_assistir <= 0 then return 0; end if;
  for x in select * from jsonb_array_elements(case when jsonb_typeof(p_quem) = 'array' then p_quem else '[]'::jsonb end) limit 2000 loop
    if coalesce(x->>'uid', '') !~ '^[0-9]{1,20}$' then continue; end if;
    insert into live_pontos (quem, nome, pontos) values ('tw:' || (x->>'uid'), left(coalesce(nullif(btrim(x->>'nome'), ''), '?'), 60), b.pontos_assistir)
      on conflict (quem) do update set pontos = live_pontos.pontos + b.pontos_assistir, nome = excluded.nome, atualizado = now();
    n := n + 1;
  end loop;
  return n;
end $$;

-- A Central lê tudo do bot (só a administração).
create or replace function public.live_bot_ler() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Só a administração pode fazer isso.'; end if;
  return (select jsonb_build_object(
    'config', (select to_jsonb(b) - 'id' - 'updated_at' - 'ultima_distribuicao' from live_bot b where id = 1),
    'comandos', (select coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'resposta', resposta, 'soMod', so_mod, 'ativo', ativo, 'usos', usos) order by nome), '[]'::jsonb) from live_comandos),
    'avisos', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'texto', texto, 'aCadaMin', a_cada_min, 'minMsgs', min_msgs, 'ativo', ativo, 'ultimoEm', ultimo_em) order by criado_em), '[]'::jsonb) from live_avisos),
    'top', (select coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'pontos', pontos, 'pl', split_part(quem, ':', 1)) order by pontos desc), '[]'::jsonb) from (select * from live_pontos where pontos > 0 order by pontos desc limit 20) x),
    'pessoas', (select count(*) from live_pontos)));
end $$;

-- A Central muda o bot (só a administração). Devolve o mesmo que live_bot_ler.
create or replace function public.live_bot_admin(p_acao text, p jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare nome_novo text;
begin
  if not is_admin() then raise exception 'Só a administração pode fazer isso.'; end if;
  insert into live_bot (id) values (1) on conflict (id) do nothing;
  p := coalesce(p, '{}'::jsonb);
  case p_acao
  when 'config' then
    update live_bot set
      ligado = coalesce((p->>'ligado')::boolean, ligado),
      pontos_nome = coalesce(nullif(left(btrim(p->>'pontos_nome'), 20), ''), pontos_nome),
      pontos_msg = greatest(0, least(1000, coalesce((p->>'pontos_msg')::integer, pontos_msg))),
      pontos_assistir = greatest(0, least(1000, coalesce((p->>'pontos_assistir')::integer, pontos_assistir))),
      mod_links = coalesce((p->>'mod_links')::boolean, mod_links),
      mod_links_ok = coalesce(left(lower(p->>'mod_links_ok'), 500), mod_links_ok),
      mod_caps = coalesce((p->>'mod_caps')::boolean, mod_caps),
      mod_palavras = coalesce(left(p->>'mod_palavras', 2000), mod_palavras),
      mod_acao = case when p->>'mod_acao' in ('apagar', 'castigo') then p->>'mod_acao' else mod_acao end,
      mod_segundos = greatest(10, least(3600, coalesce((p->>'mod_segundos')::integer, mod_segundos))),
      mod_isentos_subs = coalesce((p->>'mod_isentos_subs')::boolean, mod_isentos_subs),
      updated_at = now()
    where id = 1;
  when 'comando-salvar' then
    nome_novo := lower(btrim(coalesce(p->>'nome', '')));
    if nome_novo !~ '^!' then nome_novo := '!' || nome_novo; end if;
    if nome_novo !~ '^![a-z0-9_]{1,24}$' then raise exception 'O comando precisa ser ! seguido de letras sem acento, números ou _ (até 24).'; end if;
    if nome_novo in ('!top', '!pontos', '!comandos', '!morte', '!mortes') then raise exception 'Esse comando já é da casa.'; end if;
    if btrim(coalesce(p->>'resposta', '')) = '' then raise exception 'Escreva a resposta do comando.'; end if;
    if coalesce(p->>'antigo', '') <> '' and p->>'antigo' <> nome_novo then delete from live_comandos where nome = p->>'antigo'; end if;
    insert into live_comandos (nome, resposta, so_mod, ativo) values (nome_novo, left(btrim(p->>'resposta'), 400), coalesce((p->>'soMod')::boolean, false), coalesce((p->>'ativo')::boolean, true))
      on conflict (nome) do update set resposta = excluded.resposta, so_mod = excluded.so_mod, ativo = excluded.ativo;
  when 'comando-apagar' then
    delete from live_comandos where nome = p->>'nome';
  when 'aviso-salvar' then
    if btrim(coalesce(p->>'texto', '')) = '' then raise exception 'Escreva o texto do aviso.'; end if;
    if coalesce(p->>'id', '') <> '' and exists (select 1 from live_avisos where id = p->>'id') then
      update live_avisos set texto = left(btrim(p->>'texto'), 400), a_cada_min = greatest(5, least(240, coalesce((p->>'aCadaMin')::integer, a_cada_min))),
        min_msgs = greatest(0, least(500, coalesce((p->>'minMsgs')::integer, min_msgs))), ativo = coalesce((p->>'ativo')::boolean, ativo) where id = p->>'id';
    else
      if (select count(*) from live_avisos) >= 10 then raise exception 'Até 10 avisos.'; end if;
      insert into live_avisos (texto, a_cada_min, min_msgs, ativo) values (left(btrim(p->>'texto'), 400), greatest(5, least(240, coalesce((p->>'aCadaMin')::integer, 20))),
        greatest(0, least(500, coalesce((p->>'minMsgs')::integer, 10))), coalesce((p->>'ativo')::boolean, true));
    end if;
  when 'aviso-apagar' then
    delete from live_avisos where id = p->>'id';
  when 'pontos-zerar' then
    delete from live_pontos where true;
  else
    raise exception 'Ação desconhecida.';
  end case;
  return live_bot_ler();
end $$;

revoke all on function public.live_bot_msg(jsonb) from public, anon, authenticated;
revoke all on function public.live_pontos_assistir(jsonb) from public, anon, authenticated;
revoke all on function public.live_bot_ler() from public, anon;
revoke all on function public.live_bot_admin(text, jsonb) from public, anon;
grant execute on function public.live_bot_ler() to authenticated;
grant execute on function public.live_bot_admin(text, jsonb) to authenticated;
