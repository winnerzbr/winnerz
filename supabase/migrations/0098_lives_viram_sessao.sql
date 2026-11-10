-- =================================================================================================================
-- 0098 · Pontes: lives da Twitch e do YouTube viram sessão na Jornada
--
-- Duas pontes novas ao lado da Steam, do RetroAchievements e do Playnite:
--   twitch  · quem ligou a conta da Twitch pode pedir que cada live de um jogo vire sessão (a Twitch avisa o começo,
--             o fim e a troca de categoria);
--   youtube · a pessoa informa o canal e as lives já encerradas entram na busca (ao abrir o site e uma vez por dia).
-- As sessões entram pelo mesmo caminho das outras pontes (inferred_sessions) e aparecem "em live".
-- Aqui só se libera o nome das duas pontes novas nas três tabelas. Nenhum dado é apagado.
--
-- Pode rodar mais de uma vez.
-- =================================================================================================================

alter table public.linked_accounts drop constraint if exists linked_accounts_provider_check;
alter table public.linked_accounts add constraint linked_accounts_provider_check check (provider in ('steam', 'ra', 'playnite', 'twitch', 'youtube'));
alter table public.inferred_sessions drop constraint if exists inferred_sessions_provider_check;
alter table public.inferred_sessions add constraint inferred_sessions_provider_check check (provider in ('steam', 'ra', 'playnite', 'twitch', 'youtube'));
alter table public.sessions drop constraint if exists sessions_source_check;
alter table public.sessions add constraint sessions_source_check check (source in ('steam', 'ra', 'playnite', 'twitch', 'youtube'));
