-- WinnerZ — Sistema de live, etapa 4b: "Ô iamiguinho!" (a conversa por voz com quem faz a live). Rode no Supabase:
-- SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez. Precisa da 0086.
--
-- A conversa por voz usa a mesma memória do chat (iam_pessoas / iam_conversas), com a pessoa "dono:canal" (você).
-- Aqui só muda iam_chat_abrir: ganha o tempo de espera entre conversas como parâmetro (no chat continua 12 segundos;
-- na conversa por voz, sem espera, porque é você falando com ele).

drop function if exists public.iam_chat_abrir(text, text);
create or replace function public.iam_chat_abrir(p_quem text, p_nome text, p_espera integer default 12) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p iam_pessoas;
begin
  if coalesce(p_quem, '') = '' then return null; end if;
  select * into p from iam_pessoas where quem = p_quem for update;
  if p.quem is not null and p.conversas > 0 and coalesce(p_espera, 12) > 0 and p.ultima_vez > now() - make_interval(secs => coalesce(p_espera, 12)) then
    return jsonb_build_object('espera', true);
  end if;
  insert into iam_pessoas (quem, nome) values (left(p_quem, 80), left(coalesce(nullif(btrim(p_nome), ''), '?'), 60))
    on conflict (quem) do update set nome = excluded.nome, ultima_vez = now()
    returning * into p;
  return jsonb_build_object('nome', p.nome, 'conversas', p.conversas, 'primeiraVez', p.primeira_vez, 'fatos', p.fatos,
    'recentes', (select coalesce(jsonb_agg(jsonb_build_object('p', pergunta, 'r', resposta) order by em), '[]'::jsonb) from (select * from iam_conversas where quem = p_quem order by em desc limit 6) x),
    'ultimas', (select coalesce(jsonb_agg(resposta), '[]'::jsonb) from (select resposta from iam_conversas order by em desc limit 6) y));
end $$;
revoke all on function public.iam_chat_abrir(text, text, integer) from public, anon, authenticated;
