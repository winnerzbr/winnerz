-- WinnerZ — Etapa 5, entrega 7: "Algo errado nesta ficha?", fila de correções e painel de qualidade dos dados.
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez. Precisa da 0006 (is_admin).
--
-- Como funciona:
--   · Quem tem conta sugere uma correção numa ficha (um campo por vez, com nota e, se quiser, uma fonte).
--   · A administração revisa a fila. Aceita → a correção vira uma "trava" na ficha (games.fixes).
--   · A trava vale para sempre: quando o IGDB atualiza a ficha, o valor corrigido continua por cima,
--     e o valor novo do IGDB fica guardado ao lado ("was"), para desfazer se precisar.

-- 1. As travas da ficha: {"title": {"v": "Nome certo", "was": "Nome do IGDB", "at": "...", "report": "uuid"}, ...}
alter table public.games add column if not exists fixes jsonb;

-- Campos que podem ser corrigidos e o tipo de cada um.
create or replace function public.fix_field_ok(p_field text, p_value jsonb) returns boolean
language sql immutable as $$
  select case p_field
    when 'title' then jsonb_typeof(p_value) = 'string' and length(trim(p_value #>> '{}')) between 1 and 200
    when 'year' then jsonb_typeof(p_value) = 'number' and (p_value #>> '{}')::numeric between 1950 and 2100 and (p_value #>> '{}')::numeric = trunc((p_value #>> '{}')::numeric)
    when 'developer' then jsonb_typeof(p_value) = 'string' and length(trim(p_value #>> '{}')) between 1 and 120
    when 'publisher' then jsonb_typeof(p_value) = 'string' and length(trim(p_value #>> '{}')) between 1 and 120
    when 'summary' then jsonb_typeof(p_value) = 'string' and length(trim(p_value #>> '{}')) between 20 and 4000
    when 'cover' then jsonb_typeof(p_value) = 'string' and (p_value #>> '{}') ~ '^https://images\.igdb\.com/igdb/image/upload/t_[a-z0-9_]+/[a-z0-9]+\.(jpg|png|webp)$'
    when 'platforms' then jsonb_typeof(p_value) = 'array' and jsonb_array_length(p_value) between 1 and 40
      and not exists (select 1 from jsonb_array_elements(p_value) e where jsonb_typeof(e) <> 'string' or length(e #>> '{}') not between 1 and 80)
    when 'outro' then true
    else false
  end;
$$;

-- 2. Toda gravação na ficha (inclusive a do IGDB) passa pelas travas.
create or replace function public.games_apply_fixes() returns trigger
language plpgsql as $$
declare
  fx jsonb; row_j jsonb; k text; f jsonb; patch jsonb := '{}'::jsonb;
begin
  -- Só o servidor e as funções da administração mexem nas travas (fichas manuais podem ser editadas por quem tem conta).
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then new.fixes := null; else new.fixes := old.fixes; end if;
  end if;
  fx := coalesce(new.fixes, '{}'::jsonb);
  if fx = '{}'::jsonb then return new; end if;
  row_j := to_jsonb(new);
  for k, f in select key, value from jsonb_each(fx) loop
    if k not in ('title', 'year', 'developer', 'publisher', 'summary', 'cover', 'platforms', 'summary_source') then continue; end if;
    -- Chegou um valor diferente do corrigido (o IGDB mudou, ou a ficha é nova): guarda como "o que era".
    if (row_j -> k) is distinct from (f -> 'v') then fx := jsonb_set(fx, array[k, 'was'], coalesce(row_j -> k, 'null'::jsonb)); end if;
    patch := patch || jsonb_build_object(k, f -> 'v');
  end loop;
  new := jsonb_populate_record(new, patch);
  new.fixes := fx;
  return new;
end;
$$;
drop trigger if exists games_apply_fixes on public.games;
create trigger games_apply_fixes before insert or update on public.games for each row execute function public.games_apply_fixes();

-- 3. A fila de correções.
create table if not exists public.game_reports (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  field text not null check (field in ('title', 'year', 'developer', 'publisher', 'summary', 'cover', 'platforms', 'outro')),
  current jsonb,
  proposed jsonb,
  note text check (note is null or length(note) <= 600),
  source text check (source is null or (length(source) <= 300 and source ~* '^https?://')),
  status text not null default 'aberta' check (status in ('aberta', 'aceita', 'recusada')),
  reply text check (reply is null or length(reply) <= 400),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists game_reports_open on public.game_reports (status, created_at);
create index if not exists game_reports_game on public.game_reports (game_id);
create index if not exists game_reports_user on public.game_reports (user_id);
alter table public.game_reports enable row level security;
drop policy if exists "reports own read" on public.game_reports;
create policy "reports own read" on public.game_reports for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- Ninguém grava direto: só pelas funções abaixo (que conferem tudo).
revoke insert, update, delete on public.game_reports from anon, authenticated;

-- 4. Sugerir uma correção. Mesma pessoa, mesmo jogo e mesmo campo com uma sugestão aberta: atualiza a que já existe.
create or replace function public.report_game(p_game text, p_field text, p_value jsonb, p_note text, p_source text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  g games%rowtype; rid uuid; cur jsonb; v_note text := nullif(trim(coalesce(p_note, '')), ''); v_src text := nullif(trim(coalesce(p_source, '')), '');
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para sugerir uma correção.'; end if;
  select * into g from games where id = p_game;
  if not found then raise exception 'Jogo não encontrado.'; end if;
  if p_field = 'outro' then
    if v_note is null or length(v_note) < 10 then raise exception 'Conte em poucas palavras o que está errado.'; end if;
    p_value := null;
  elsif p_value is null or not fix_field_ok(p_field, p_value) then
    raise exception 'O valor sugerido não está no formato certo para esse campo.';
  end if;
  if v_src is not null and v_src !~* '^https?://' then raise exception 'A fonte precisa ser um link (https://...).'; end if;
  if length(coalesce(v_note, '')) > 600 then v_note := left(v_note, 600); end if;
  if length(coalesce(v_src, '')) > 300 then raise exception 'Esse link é longo demais.'; end if;
  cur := case when p_field = 'outro' then null else to_jsonb(g) -> p_field end;
  if p_field <> 'outro' and cur is not distinct from p_value then raise exception 'Isso já é o que a ficha mostra.'; end if;

  select id into rid from game_reports where user_id = auth.uid() and game_id = p_game and field = p_field and status = 'aberta';
  if rid is not null then
    update game_reports set proposed = p_value, current = cur, note = v_note, source = v_src, created_at = now() where id = rid;
    return rid;
  end if;
  if (select count(*) from game_reports where user_id = auth.uid() and status = 'aberta') >= 30 then
    raise exception 'Você tem 30 sugestões esperando revisão. Assim que a equipe olhar, dá para mandar mais.';
  end if;
  insert into game_reports (game_id, user_id, field, current, proposed, note, source)
  values (p_game, auth.uid(), p_field, cur, p_value, v_note, v_src) returning id into rid;
  return rid;
end;
$$;
revoke execute on function public.report_game(text, text, jsonb, text, text) from public, anon;
grant execute on function public.report_game(text, text, jsonb, text, text) to authenticated;

-- 5. Administração: aplicar (ou tirar) uma trava na ficha.
create or replace function public.fix_game(p_game text, p_field text, p_value jsonb, p_report uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g games%rowtype; fx jsonb;
begin
  if not is_admin() then raise exception 'Só a administração pode corrigir fichas.'; end if;
  if p_field = 'outro' or not fix_field_ok(p_field, p_value) then raise exception 'Valor inválido para esse campo.'; end if;
  select * into g from games where id = p_game for update;
  if not found then raise exception 'Jogo não encontrado.'; end if;
  fx := coalesce(g.fixes, '{}'::jsonb) || jsonb_build_object(p_field, jsonb_build_object('v', p_value, 'was', to_jsonb(g) -> p_field, 'at', now(), 'report', p_report));
  -- A sinopse corrigida deixa de ser "tradução automática".
  if p_field = 'summary' then
    fx := fx || jsonb_build_object('summary_source', jsonb_build_object('v', 'Revisado pela comunidade', 'was', to_jsonb(g.summary_source), 'at', now()));
  end if;
  update games set fixes = fx where id = p_game;
  select * into g from games where id = p_game;
  return to_jsonb(g);
end;
$$;

create or replace function public.unfix_game(p_game text, p_field text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g games%rowtype; fx jsonb; back jsonb := '{}'::jsonb;
begin
  if not is_admin() then raise exception 'Só a administração pode desfazer correções.'; end if;
  select * into g from games where id = p_game for update;
  if not found then raise exception 'Jogo não encontrado.'; end if;
  fx := coalesce(g.fixes, '{}'::jsonb);
  if fx ? p_field then back := back || jsonb_build_object(p_field, fx -> p_field -> 'was'); end if;
  if p_field = 'summary' and fx ? 'summary_source' then back := back || jsonb_build_object('summary_source', fx -> 'summary_source' -> 'was'); end if;
  fx := fx - p_field;
  if p_field = 'summary' then fx := fx - 'summary_source'; end if;
  g := jsonb_populate_record(g, back);
  update games set title = g.title, year = g.year, developer = g.developer, publisher = g.publisher, summary = g.summary,
    summary_source = g.summary_source, cover = g.cover, platforms = g.platforms, fixes = nullif(fx, '{}'::jsonb)
  where id = p_game;
  select * into g from games where id = p_game;
  return to_jsonb(g);
end;
$$;

-- 6. Administração: revisar a fila.
create or replace function public.review_report(p_id uuid, p_accept boolean, p_value jsonb default null, p_reply text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r game_reports%rowtype; out jsonb := null;
begin
  if not is_admin() then raise exception 'Só a administração revisa correções.'; end if;
  select * into r from game_reports where id = p_id for update;
  if not found then raise exception 'Sugestão não encontrada.'; end if;
  if p_accept and r.field <> 'outro' then out := fix_game(r.game_id, r.field, coalesce(p_value, r.proposed), r.id); end if;
  update game_reports set status = case when p_accept then 'aceita' else 'recusada' end,
    proposed = case when p_accept and p_value is not null and r.field <> 'outro' then p_value else proposed end,
    reply = nullif(left(trim(coalesce(p_reply, '')), 400), ''), reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_id;
  return out;
end;
$$;

-- A fila, com a ficha e quem mandou (só o @, se a pessoa tiver um).
create or replace function public.report_queue(p_status text default 'aberta')
returns table (id uuid, game_id text, slug text, title text, cover text, igdb_id integer, field text, current jsonb, proposed jsonb,
  note text, source text, status text, reply text, created_at timestamptz, reviewed_at timestamptz, handle text, same_open integer, game jsonb)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Só a administração vê a fila.'; end if;
  return query
    select r.id, r.game_id, g.slug, g.title, g.cover, g.igdb_id, r.field, r.current, r.proposed, r.note, r.source, r.status, r.reply,
      r.created_at, r.reviewed_at, p.handle,
      (select count(*)::int from game_reports o where o.game_id = r.game_id and o.field = r.field and o.status = 'aberta' and o.id <> r.id),
      to_jsonb(g)
    from game_reports r join games g on g.id = r.game_id left join profiles p on p.id = r.user_id
    where r.status = p_status
    order by case when r.status = 'aberta' then r.created_at end asc, r.reviewed_at desc nulls last
    limit 200;
end;
$$;

-- As sugestões da própria pessoa para um jogo (para mostrar o andamento na ficha).
create or replace function public.my_reports(p_game text)
returns table (id uuid, field text, proposed jsonb, note text, status text, reply text, created_at timestamptz)
language sql security definer set search_path = public as $$
  select id, field, proposed, note, status, reply, created_at from game_reports
  where user_id = auth.uid() and game_id = p_game order by created_at desc limit 20;
$$;

-- 7. Painel de qualidade: fichas em uso (na coleção, na Jornada ou nos desejos de alguém) com algo faltando.
create or replace function public.data_quality()
returns jsonb language plpgsql security definer set search_path = public as $$
declare out jsonb;
begin
  if not is_admin() then raise exception 'Só a administração vê o painel.'; end if;
  with used as (
    select game_id, count(*) as n from (
      select game_id from copies union all select game_id from journeys union all select game_id from wishes
    ) u group by game_id
  ), g as (
    select gm.id, gm.slug, gm.title, gm.cover, gm.year, gm.igdb_id, gm.summary, gm.summary_source, gm.platforms, gm.fixes, u.n
    from games gm join used u on u.game_id = gm.id
  ), pick as (
    select 'sem_capa' as k, g.* from g where coalesce(g.cover, '') = ''
    union all select 'sem_ano', g.* from g where g.year is null
    union all select 'sem_sinopse', g.* from g where coalesce(g.summary, '') = ''
    union all select 'sinopse_em_ingles', g.* from g where g.summary_source ilike '%ingl%'
    union all select 'sem_plataforma', g.* from g where coalesce(cardinality(g.platforms), 0) = 0
    union all select 'fora_do_igdb', g.* from g where g.igdb_id is null
    union all select 'repetidos', g.* from g where lower(g.title) in (select lower(title) from g group by lower(title) having count(*) > 1)
    union all select 'corrigidos', g.* from g where coalesce(g.fixes, '{}'::jsonb) <> '{}'::jsonb
  ), ranked as (
    select k, id, slug, title, cover, year, igdb_id, n, row_number() over (partition by k order by n desc, title) as rn, count(*) over (partition by k) as total from pick
  )
  select jsonb_build_object(
    'jogos_em_uso', (select count(*) from g),
    'fila_aberta', (select count(*) from game_reports where status = 'aberta'),
    'grupos', coalesce((select jsonb_object_agg(k, jsonb_build_object('total', total, 'itens', itens)) from (
      select k, max(total) as total, jsonb_agg(jsonb_build_object('id', id, 'slug', slug, 'title', title, 'cover', cover, 'year', year, 'igdb_id', igdb_id, 'usos', n) order by rn) as itens
      from ranked where rn <= 60 group by k) x), '{}'::jsonb)
  ) into out;
  return out;
end;
$$;

revoke execute on function public.fix_game(text, text, jsonb, uuid) from public, anon;
revoke execute on function public.unfix_game(text, text) from public, anon;
revoke execute on function public.review_report(uuid, boolean, jsonb, text) from public, anon;
revoke execute on function public.report_queue(text) from public, anon;
revoke execute on function public.my_reports(text) from public, anon;
revoke execute on function public.data_quality() from public, anon;
grant execute on function public.fix_game(text, text, jsonb, uuid) to authenticated;
grant execute on function public.unfix_game(text, text) to authenticated;
grant execute on function public.review_report(uuid, boolean, jsonb, text) to authenticated;
grant execute on function public.report_queue(text) to authenticated;
grant execute on function public.my_reports(text) to authenticated;
grant execute on function public.data_quality() to authenticated;
