-- WinnerZ — 0010: arte dos indicados do Awards
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez.
--
-- Na votação, cada indicado aparece com uma arte oficial do jogo (sem logo) em vez da capa.
-- art: o endereço da imagem escolhida na montagem; focus: o ponto da imagem que fica à vista ("50% 40%").
-- Sem esta migração o site continua funcionando: usa a primeira arte oficial do jogo.

alter table public.award_nominees add column if not exists art text;
alter table public.award_nominees add column if not exists focus text;

-- Avisa a API do Supabase das colunas novas na hora.
notify pgrst, 'reload schema';
