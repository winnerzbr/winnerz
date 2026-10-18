-- WinnerZ — Jornada, fase 4: o que um jogador hardcore mede além de "zerei".
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez.
--
-- feats: marcos depois de zerar, numa lista [{ "kind": "platina" | "cem" | "finais" | "dificil" | "ngplus" | "semmorrer" | "speedrun",
--        "at": "<data>", "detail": "<texto opcional, ex.: o tempo do speedrun>", "eventId": "<marco na linha do tempo>" }]. Nenhum é obrigatório.
-- A dificuldade usa a coluna mode, que já existe.
-- As regras de acesso da tabela histories já valem para a coluna nova (cada pessoa só lê e escreve as suas).
alter table public.histories add column if not exists feats jsonb;
