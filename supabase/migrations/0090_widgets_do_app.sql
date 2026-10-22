-- Widgets do app WinnerZ (Android): a sessão inteira pelo widget e os widgets novos (O que jogar hoje, Sua semana,
-- Próxima jogatina, Atalho, Álbum, WinnerZ Awards, Avisos, Live).
--
-- Os widgets rodam fora do site, então não têm o login do site. Quando a pessoa entra no app, o site pede uma
-- "chave do app" (app_parear) e entrega ao Android. A chave só serve para estas funções (painel e ações dos widgets),
-- fica guardada no celular e o banco guarda só o resumo dela (sha256). Sair da conta apaga a chave.
-- Quem chama app_painel e app_acao é a função do site /api/app (com a chave do servidor), nunca o público.
--
-- As ações repetem o que o site faz (src/data/store.ts: play, setSessionIntent, setSessionGoal, addMoment,
-- finishSession), gravando as mesmas linhas, para a Jornada ficar igual venha a sessão do site ou do widget.

create extension if not exists pgcrypto;

create table if not exists public.app_keys (
  key_hash text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);
create index if not exists app_keys_user on public.app_keys (user_id, created_at desc);
alter table public.app_keys enable row level security;
revoke all on public.app_keys from anon, authenticated;

-- O site (já com login) pede a chave para o celular. Cada conta guarda até 5 aparelhos; os mais antigos saem.
create or replace function public.app_parear() returns text
language plpgsql security definer set search_path = public, extensions as $$
declare k text := encode(gen_random_bytes(32), 'hex');
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  insert into app_keys (key_hash, user_id) values (encode(digest(k, 'sha256'), 'hex'), auth.uid());
  delete from app_keys where user_id = auth.uid() and key_hash not in (
    select key_hash from app_keys where user_id = auth.uid() order by created_at desc limit 5);
  return k;
end; $$;
revoke all on function public.app_parear() from public, anon;
grant execute on function public.app_parear() to authenticated;

-- Quem é o dono da chave. Passa a valer como "a pessoa" (auth.uid()) só dentro desta chamada.
create or replace function public.app_entrar(p_key text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare u uuid; h text := encode(digest(coalesce(p_key, ''), 'sha256'), 'hex');
begin
  update app_keys set last_used_at = now() where key_hash = h returning user_id into u;
  if u is null then raise exception 'chave_invalida'; end if;
  perform set_config('request.jwt.claim.sub', u::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  return u;
end; $$;
revoke all on function public.app_entrar(text) from public, anon, authenticated;

create or replace function public.app_esquecer(p_key text) returns void
language sql security definer set search_path = public, extensions as $$
  delete from app_keys where key_hash = encode(digest(coalesce(p_key, ''), 'sha256'), 'hex');
$$;
revoke all on function public.app_esquecer(text) from public, anon, authenticated;

-- Para o site enviar a foto de um momento: só devolve de quem é a chave.
create or replace function public.app_quem(p_key text) returns uuid
language plpgsql security definer set search_path = public as $$
begin return public.app_entrar(p_key); end; $$;
revoke all on function public.app_quem(text) from public, anon, authenticated;

-- Minutos de uma sessão, como em src/lib/sessions.ts (nada de sessões de mais de 12 horas).
create or replace function public.app_minutos(p_ini timestamptz, p_fim timestamptz) returns integer
language sql immutable as $$
  select case when m < 0 or m > 720 then null else greatest(1, least(600, round(m)::integer)) end
  from (select extract(epoch from (p_fim - p_ini)) / 60.0 as m) x;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Painel: tudo o que os widgets mostram, numa chamada só
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.app_painel(p_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  u uuid := public.app_entrar(p_key);
  tz text := 'America/Sao_Paulo';
  hoje date := (now() at time zone tz)::date;
  seg date := date_trunc('week', now() at time zone tz)::date;
  aberta jsonb; jogos jsonb; ultima jsonb; sugestoes jsonb; semana jsonb; jogatina jsonb; album jsonb; awards jsonb; avisos jsonb; canal jsonb;
  dias integer[] := array[0,0,0,0,0,0,0]; tot integer := 0; nses integer := 0; njogos integer := 0; topo jsonb;
  r record; aw awards%rowtype; ncat integer; nvot integer;
begin
  -- Jornada: a sessão aberta, os jogos em andamento e a última sessão guardada
  select jsonb_build_object('id', s.id, 'gameId', g.id, 'titulo', g.title, 'slug', g.slug, 'capa', g.cover, 'inicio', s.started_at,
           'intencao', s.intent, 'objetivo', s.goal, 'progresso', h.progress)
    into aberta
    from sessions s join journeys j on j.id = s.journey_id join games g on g.id = j.game_id join histories h on h.id = s.history_id
   where s.user_id = u and s.ended_at is null limit 1;

  select coalesce(jsonb_agg(x.o order by x.quando desc nulls last), '[]'::jsonb) into jogos from (
    select jsonb_build_object('gameId', g.id, 'titulo', g.title, 'slug', g.slug, 'capa', g.cover, 'estado', h.state, 'progresso', h.progress,
             'recado', (select s2.note from sessions s2 where s2.journey_id = j.id and s2.ended_at is not null and s2.note is not null order by s2.started_at desc limit 1),
             'ultima', ls.ended_at,
             'sessoes', (select count(*) from sessions s3 where s3.journey_id = j.id and s3.ended_at is not null),
             'minutos', (select coalesce(sum(s3.minutes), 0) from sessions s3 where s3.journey_id = j.id and s3.ended_at is not null)) o,
           coalesce(ls.ended_at, h.started_at) quando
      from journeys j join games g on g.id = j.game_id
      join lateral (select * from histories h0 where h0.journey_id = j.id and h0.state in ('ativa', 'pausada') order by h0.ordinal desc limit 1) h on true
      left join lateral (select s1.ended_at from sessions s1 where s1.journey_id = j.id and s1.ended_at is not null order by s1.ended_at desc limit 1) ls on true
     where j.user_id = u
     order by coalesce(ls.ended_at, h.started_at) desc nulls last limit 8) x;

  select jsonb_build_object('titulo', g.title, 'minutos', s.minutes, 'fim', s.ended_at) into ultima
    from sessions s join journeys j on j.id = s.journey_id join games g on g.id = j.game_id
   where s.user_id = u and s.ended_at > now() - interval '2 hours' order by s.ended_at desc limit 1;

  -- O que jogar hoje: jogos parados há uns dias e jogos da estante ainda sem Jornada, com o motivo
  select coalesce(jsonb_agg(x.o), '[]'::jsonb) into sugestoes from (
    select o from (
      select jsonb_build_object('gameId', g.id, 'titulo', g.title, 'slug', g.slug, 'capa', g.cover,
               'motivo', case when ls.ended_at is null then 'Começou e ainda não teve sessão.'
                              else 'Parado há ' || greatest(1, (hoje - (ls.ended_at at time zone tz)::date)) || ' dias'
                                   || case when h.progress is not null and h.progress > 0 then ', ' || h.progress || '% do caminho.' else '.' end end) o,
             coalesce(mg.priority, 0) prio, md5(g.id || hoje::text) ordem
        from journeys j join games g on g.id = j.game_id
        join lateral (select * from histories h0 where h0.journey_id = j.id and h0.state in ('ativa', 'pausada') order by h0.ordinal desc limit 1) h on true
        left join lateral (select s1.ended_at from sessions s1 where s1.journey_id = j.id and s1.ended_at is not null order by s1.ended_at desc limit 1) ls on true
        left join my_games mg on mg.user_id = u and mg.game_id = g.id
       where j.user_id = u and (ls.ended_at is null or ls.ended_at < now() - interval '4 days')
         and not exists (select 1 from sessions so where so.user_id = u and so.ended_at is null and so.journey_id = j.id)
      union all
      select jsonb_build_object('gameId', g.id, 'titulo', g.title, 'slug', g.slug, 'capa', g.cover,
               'motivo', case when mg.priority = 3 then 'Prioridade alta na sua estante.' else 'Na sua estante, ainda sem Jornada.' end) o,
             coalesce(mg.priority, 0) prio, md5(g.id || hoje::text) ordem
        from (select distinct c.game_id from copies c where c.user_id = u) c
        join games g on g.id = c.game_id
        left join my_games mg on mg.user_id = u and mg.game_id = g.id
       where not exists (select 1 from journeys j2 where j2.user_id = u and j2.game_id = g.id)
         and not coalesce(mg.wont_play, false)
         and (mg.not_now_until is null or mg.not_now_until < hoje)
    ) y order by prio desc, ordem limit 10) x;

  -- Sua semana (segunda a domingo, no horário de São Paulo)
  for r in select s.started_at, coalesce(s.minutes, public.app_minutos(s.started_at, coalesce(s.ended_at, now())), 0) m, j.game_id
             from sessions s join journeys j on j.id = s.journey_id
            where s.user_id = u and (s.started_at at time zone tz)::date >= seg loop
    dias[extract(isodow from (r.started_at at time zone tz))::int] := dias[extract(isodow from (r.started_at at time zone tz))::int] + r.m;
    tot := tot + r.m; nses := nses + 1;
  end loop;
  select count(distinct j.game_id) into njogos from sessions s join journeys j on j.id = s.journey_id
   where s.user_id = u and (s.started_at at time zone tz)::date >= seg;
  select jsonb_build_object('titulo', g.title, 'minutos', sum(coalesce(s.minutes, 0))) into topo
    from sessions s join journeys j on j.id = s.journey_id join games g on g.id = j.game_id
   where s.user_id = u and (s.started_at at time zone tz)::date >= seg
   group by g.title order by sum(coalesce(s.minutes, 0)) desc limit 1;
  semana := jsonb_build_object('inicio', seg, 'hoje', extract(isodow from (now() at time zone tz))::int, 'dias', to_jsonb(dias),
                               'minutos', tot, 'sessoes', nses, 'jogos', njogos, 'topo', topo);

  -- Próxima jogatina: em que a pessoa está, foi convidada, ou da agenda dos clubes dela
  select jsonb_build_object('id', jg.id, 'titulo', jg.title, 'jogo', g.title, 'inicio', jg.starts_at, 'duracao', jg.duration_min,
           'clube', cl.name, 'resposta', p.rsvp,
           'vao', (select count(*) from jogatina_people x where x.jogatina_id = jg.id and x.rsvp = 'vou'),
           'talvez', (select count(*) from jogatina_people x where x.jogatina_id = jg.id and x.rsvp = 'talvez'),
           'quem', (select coalesce(jsonb_agg(left(coalesce(pr.handle, '?'), 1)), '[]'::jsonb) from (
                      select pr0.handle from jogatina_people x join profiles pr0 on pr0.id = x.user_id
                       where x.jogatina_id = jg.id and x.rsvp = 'vou' order by x.joined_at limit 3) pr))
    into jogatina
    from jogatinas jg join games g on g.id = jg.game_id
    left join clubs cl on cl.id = jg.club_id
    left join jogatina_people p on p.jogatina_id = jg.id and p.user_id = u
   where jg.canceled_at is null and not jg.mod_hidden
     and jg.starts_at + make_interval(mins => jg.duration_min) > now()
     and (p.user_id is not null
          or exists (select 1 from jogatina_invites i where i.jogatina_id = jg.id and i.user_id = u)
          or (jg.club_id is not null and exists (select 1 from club_members cm where cm.club_id = jg.club_id and cm.user_id = u)))
     and coalesce(p.rsvp, '') <> 'nao'
   order by jg.starts_at limit 1;

  -- Álbum
  select jsonb_build_object(
           'pacotes', (select count(*) from album_packs pk where pk.user_id = u and pk.state = 'fechado'),
           'total', (select count(*) from album_stickers st join album_pages pg on pg.id = st.page_id join album_books b on b.id = pg.book_id where b.published and st.active),
           'coladas', (select count(*) from album_items it join album_stickers st on st.id = it.sticker_id join album_pages pg on pg.id = st.page_id
                        join album_books b on b.id = pg.book_id where it.user_id = u and it.pasted and b.published and st.active))
    into album;

  -- WinnerZ Awards: só datas e os votos da própria pessoa. Resultado nunca sai daqui.
  select * into aw from awards where published order by year desc limit 1;
  if found then
    select count(*) into ncat from award_categories where award_id = aw.id;
    select count(*) into nvot from award_votes v join award_categories c on c.id = v.category_id where c.award_id = aw.id and v.user_id = u;
    awards := jsonb_build_object('id', aw.id, 'titulo', aw.title, 'ano', aw.year,
      'fase', case when aw.voting_opens is not null and now() < aw.voting_opens then 'em_breve'
                   when aw.voting_closes is not null and now() < aw.voting_closes then 'votacao'
                   when aw.results_at is not null and now() < aw.results_at then 'revelacao'
                   else 'resultado' end,
      'abre', aw.voting_opens, 'fecha', aw.voting_closes, 'revela', aw.results_at, 'categorias', ncat, 'votos', nvot);
  end if;

  -- Avisos (as mesmas funções do sino do site)
  begin
    avisos := jsonb_build_object('lista', public.notif_list(null, null, 4), 'conta', public.notif_count());
  exception when others then avisos := null;
  end;

  -- Canal da live (o site confere na Twitch se está no ar)
  begin
    select jsonb_build_object('login', c.broadcaster_login, 'id', c.broadcaster_id) into canal from twitch_channel c where c.id = 1;
  exception when others then canal := null;
  end;
  begin
    if exists (select 1 from live_painel where id = 1 and inicio > now() - interval '12 hours') then
      canal := coalesce(canal, '{}'::jsonb) || jsonb_build_object('inicio', (select inicio from live_painel where id = 1));
    end if;
  exception when others then null;
  end;

  return jsonb_build_object('agora', now(), 'jornada', jsonb_build_object('aberta', aberta, 'jogos', jogos, 'ultima', ultima),
    'sugestoes', sugestoes, 'semana', semana, 'jogatina', jogatina, 'album', album, 'awards', awards, 'avisos', avisos, 'canal', canal);
end; $$;
revoke all on function public.app_painel(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Ações dos widgets
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.app_acao(p_key text, p_acao text, p jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  u uuid := public.app_entrar(p_key);
  s sessions%rowtype; j journeys%rowtype; h histories%rowtype; jg jogatinas%rowtype;
  g text; n integer; mins integer; txt text; meta text; titulo text; ev uuid; prog integer; novo boolean;
begin
  if p_acao = 'jogar' then
    -- como actions.play: nunca troca a sessão aberta; reabre a História pausada; cria Jornada/História se precisar
    select * into s from sessions where user_id = u and ended_at is null;
    if found then return jsonb_build_object('ok', true, 'sessao', s.id, 'ja', true); end if;
    g := p->>'gameId';
    if g is null or not exists (select 1 from games where id = g) then raise exception 'jogo'; end if;
    select * into j from journeys where user_id = u and game_id = g limit 1;
    novo := not found;
    if found then
      select * into h from histories where journey_id = j.id order by ordinal desc limit 1;
      if found and h.state in ('pausada', 'dropada') then
        update histories set state = 'ativa', completed_at = null where id = h.id;
        update journeys set mood = 'jogando', paused_note = null where id = j.id;
        insert into timeline_events (id, user_id, journey_id, history_id, kind, at, title, text)
        values (gen_random_uuid(), u, j.id, h.id, 'marco', now(), 'Retomou', 'De volta à História.');
        h.state := 'ativa';
      end if;
    end if;
    if novo then
      insert into journeys (id, user_id, game_id, mood) values (gen_random_uuid(), u, g, 'jogando') returning * into j;
    end if;
    if novo or h.id is null or h.state in ('concluida', 'encerrada') then
      select coalesce(max(ordinal), 0) + 1 into n from histories where journey_id = j.id;
      insert into histories (id, user_id, journey_id, ordinal, title, state, started_at, progress)
      values (gen_random_uuid(), u, j.id, n, case when n = 1 then 'Primeira vez' else 'Rejogada' end, 'ativa', now(), 0) returning * into h;
      insert into timeline_events (id, user_id, journey_id, history_id, kind, at, title, text)
      values (gen_random_uuid(), u, j.id, h.id, 'inicio', now(), h.title,
              case when n = 1 then 'Começou sua primeira História com o jogo.' else 'Uma nova História. As anteriores continuam guardadas.' end);
    end if;
    insert into sessions (id, user_id, journey_id, history_id, started_at) values (gen_random_uuid(), u, j.id, h.id, now()) returning * into s;
    return jsonb_build_object('ok', true, 'sessao', s.id);
  end if;

  if p_acao in ('intencao', 'objetivo', 'momento', 'finalizar') then
    select * into s from sessions where user_id = u and ended_at is null;
    if not found then raise exception 'sem_sessao'; end if;
  end if;

  if p_acao = 'intencao' then
    if coalesce(p->>'intencao', '') not in ('descansar', 'divertir', 'avancar', 'desafio', '') then raise exception 'intencao'; end if;
    update sessions set intent = nullif(p->>'intencao', ''), intent_met = null where id = s.id;
    return jsonb_build_object('ok', true);
  end if;

  if p_acao = 'objetivo' then
    update sessions set goal = nullif(left(trim(coalesce(p->>'objetivo', '')), 120), ''), goal_done = null where id = s.id;
    return jsonb_build_object('ok', true);
  end if;

  if p_acao = 'momento' then
    txt := nullif(trim(coalesce(p->>'nota', '')), '');
    titulo := nullif(left(trim(coalesce(p->>'titulo', '')), 80), '');
    if coalesce(p->>'tipo', 'momento') = 'ponto' then
      titulo := coalesce(titulo, case when txt is null then 'Ponto para voltar'
                                      when char_length(txt) <= 48 then upper(left(txt, 1)) || substr(regexp_replace(txt, '[.!?…]+$', ''), 2)
                                      else upper(left(txt, 1)) || substr(left(txt, 47), 2) || '…' end);
    else
      titulo := coalesce(titulo, 'Momento guardado');
    end if;
    ev := coalesce((p->>'id')::uuid, gen_random_uuid());
    insert into timeline_events (id, user_id, journey_id, history_id, session_id, kind, at, title, text, image_path)
    values (ev, u, s.journey_id, s.history_id, s.id, case when p->>'tipo' = 'ponto' then 'ponto' else 'momento' end, now(), titulo,
            left(txt, 1000), case when p->>'imagem' like u::text || '/%' then p->>'imagem' end);
    return jsonb_build_object('ok', true, 'evento', ev);
  end if;

  if p_acao = 'finalizar' then
    -- como actions.finishSession
    select count(*) into n from sessions where history_id = s.history_id and started_at <= s.started_at;
    mins := public.app_minutos(s.started_at, now());
    prog := case when p ? 'progresso' and p->>'progresso' ~ '^\d{1,3}$' then least(100, (p->>'progresso')::int) end;
    if prog is null then select progress into prog from histories where id = s.history_id; end if;
    s.note := nullif(left(trim(coalesce(p->>'recado', '')), 500), '');
    s.where_stopped := nullif(left(trim(coalesce(p->>'onde', '')), 140), '');
    s.feeling := nullif(p->>'sentimento', '');
    s.goal_done := case when s.goal is not null and p->>'objetivoFeito' in ('sim', 'quase', 'nao') then p->>'objetivoFeito' end;
    s.intent_met := case when s.intent is not null and p->>'intencaoFeita' in ('sim', 'meio', 'nao') then p->>'intencaoFeita' end;
    update sessions set ended_at = now(), minutes = mins, note = s.note, where_stopped = s.where_stopped, feeling = s.feeling,
      progress = prog, goal_done = s.goal_done, intent_met = s.intent_met where id = s.id;
    meta := case when s.goal is not null then 'Objetivo: ' || s.goal ||
              case s.goal_done when 'sim' then ' (cumprido)' when 'quase' then ' (quase)' when 'nao' then ' (fica para a próxima)' else '' end || '.' end;
    txt := nullif(concat_ws(' ', case when s.where_stopped is not null then 'Parou em: ' || s.where_stopped || '.' end, meta), '');
    insert into timeline_events (id, user_id, journey_id, history_id, session_id, kind, at, title, text, quote)
    values (gen_random_uuid(), u, s.journey_id, s.history_id, s.id, 'sessao', now(), 'Sessão ' || n, txt, s.note);
    if p ? 'progresso' and prog is not null then update histories set progress = prog where id = s.history_id; end if;
    return jsonb_build_object('ok', true, 'minutos', mins);
  end if;

  if p_acao = 'rsvp' then
    select * into jg from jogatinas where id = (p->>'id')::uuid;
    if not found then raise exception 'jogatina'; end if;
    perform public.jogatina_rsvp(jg.id, jg.invite_code, case when p->>'resposta' in ('vou', 'talvez', 'nao') then p->>'resposta' end);
    return jsonb_build_object('ok', true);
  end if;

  if p_acao = 'lidos' then
    perform public.notif_read_all(null);
    perform public.notif_seen();
    return jsonb_build_object('ok', true);
  end if;

  raise exception 'acao';
end; $$;
revoke all on function public.app_acao(text, text, jsonb) from public, anon, authenticated;
