-- Etapa 3 da revisão: marcadores livres na sessão (co-op, ao vivo, DLC, pós-jogo…).
-- Seguro rodar mais de uma vez.
alter table public.sessions add column if not exists tags text[];
