-- WinnerZ — Studio · o contexto do IAmiguinho. Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais
-- de uma vez. Precisa da 0086 (e da 0087, para a conversa por voz).
--
-- iam_contexto guarda o que o canal escreveu no Studio para as conversas da live (voz e chat): a personalidade, o
-- repertório de memes e referências e um contexto livre do canal. Vazio (null) = o texto padrão do site. A identidade
-- e os limites de segurança não ficam aqui (não mudam pelo Studio). Só o servidor lê e grava (com a chave secreta,
-- depois de conferir que é a administração).
-- iam_memoria_admin ganha "adicionar-fato": escrever à mão uma lembrança (sua, na conversa por voz, ou de alguém do chat).

create table if not exists public.iam_contexto (
  id smallint primary key default 1 check (id = 1),
  personalidade text check (char_length(personalidade) <= 6000),
  repertorio text check (char_length(repertorio) <= 6000),
  extra text check (char_length(extra) <= 4000),
  atualizado_em timestamptz not null default now()
);
alter table public.iam_contexto enable row level security;
revoke all on public.iam_contexto from anon, authenticated;

create or replace function public.iam_memoria_admin(p_acao text, p jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if not is_admin() then raise exception 'Só a administração pode fazer isso.'; end if;
  case p_acao
  when 'apagar' then delete from iam_pessoas where quem = p->>'quem';
  when 'apagar-fato' then
    update iam_pessoas set fatos = coalesce((select jsonb_agg(e order by o) from jsonb_array_elements(fatos) with ordinality as x(e, o) where o - 1 <> (p->>'i')::integer), '[]'::jsonb)
      where quem = p->>'quem';
  when 'adicionar-fato' then
    t := left(btrim(regexp_replace(coalesce(p->>'t', ''), '\s+', ' ', 'g')), 120);
    if char_length(t) < 2 then raise exception 'Escreva a lembrança.'; end if;
    if coalesce(p->>'quem', '') = '' then raise exception 'Falta dizer de quem é a lembrança.'; end if;
    -- A sua (conversa por voz) existe mesmo antes da primeira conversa; a de alguém do chat, só se a pessoa já existe.
    if p->>'quem' = 'dono:canal' then
      insert into iam_pessoas (quem, nome) values ('dono:canal', 'Você') on conflict (quem) do nothing;
    end if;
    update iam_pessoas set fatos = (
        select coalesce(jsonb_agg(e order by o), '[]'::jsonb) from jsonb_array_elements(fatos || jsonb_build_array(jsonb_build_object('t', t, 'em', current_date, 'manual', true))) with ordinality as x(e, o)
        where o > jsonb_array_length(fatos) + 1 - 30)
      where quem = p->>'quem' and not exists (select 1 from jsonb_array_elements(fatos) a where lower(a->>'t') = lower(t));
  when 'apagar-tudo' then delete from iam_pessoas where true;
  when 'mencoes' then
    insert into live_bot (id) values (1) on conflict (id) do nothing;
    update live_bot set responde_mencoes = coalesce((p->>'ligado')::boolean, true), updated_at = now() where id = 1;
  else raise exception 'Ação desconhecida.';
  end case;
  return iam_memoria_ler(coalesce(p->>'busca', ''));
end $$;
revoke all on function public.iam_memoria_admin(text, jsonb) from public, anon;
grant execute on function public.iam_memoria_admin(text, jsonb) to authenticated;

-- As lembranças escritas à mão não saem quando a IA junta lembranças novas (só as automáticas ficam nas 12 últimas).
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
  atual := (select coalesce(jsonb_agg(e order by o), '[]'::jsonb) from (
      select e, o, coalesce((e->>'manual')::boolean, false) as manual,
             count(*) filter (where not coalesce((e->>'manual')::boolean, false)) over (order by o desc) as pos
      from jsonb_array_elements(atual) with ordinality as x(e, o)) y
    where manual or pos <= 12);
  update iam_pessoas set conversas = conversas + 1, ultima_vez = now(), fatos = atual where quem = p_quem;
  insert into iam_conversas (quem, pergunta, resposta) values (p_quem, left(btrim(p_pergunta), 300), left(btrim(p_resposta), 300));
  delete from iam_conversas where quem = p_quem and id not in (select id from iam_conversas where quem = p_quem order by em desc limit 20);
end $$;
revoke all on function public.iam_chat_guardar(text, text, text, jsonb) from public, anon, authenticated;
