-- WinnerZ 0002: mídia (vídeos, artes) e sinopse traduzida na ficha do jogo.
-- Pode rodar mais de uma vez sem problema.

alter table public.games add column if not exists summary_original text;  -- sinopse original do IGDB (inglês)
alter table public.games add column if not exists artworks text[];        -- artes oficiais
alter table public.games add column if not exists videos jsonb;           -- [{ "id": "<YouTube>", "name": "Trailer" }]
alter table public.games add column if not exists themes text[];          -- temas do IGDB (nomes originais)
alter table public.games add column if not exists modes text[];           -- modos de jogo e perspectivas

-- Avisa a API do Supabase que a tabela mudou.
notify pgrst, 'reload schema';
