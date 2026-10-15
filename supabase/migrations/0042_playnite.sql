-- =================================================================================================================
-- 0042 · Jornada 2, entrega J7: ponte do Playnite
--
-- A extensão do Playnite (lançador de jogos do PC) avisa o WinnerZ quando um jogo abre e fecha. Ela se identifica
-- com uma chave pessoal gerada nas Preferências; o banco guarda só o resumo (hash) da chave, em linked_accounts.
-- As sessões entram pelo mesmo caminho das outras pontes (inferred_sessions) e aparecem "pelo Playnite".
--
-- Pode rodar mais de uma vez.
-- =================================================================================================================

alter table public.linked_accounts drop constraint if exists linked_accounts_provider_check;
alter table public.linked_accounts add constraint linked_accounts_provider_check check (provider in ('steam', 'ra', 'playnite'));
alter table public.inferred_sessions drop constraint if exists inferred_sessions_provider_check;
alter table public.inferred_sessions add constraint inferred_sessions_provider_check check (provider in ('steam', 'ra', 'playnite'));
alter table public.sessions drop constraint if exists sessions_source_check;
alter table public.sessions add constraint sessions_source_check check (source in ('steam', 'ra', 'playnite'));
create index if not exists linked_accounts_external on public.linked_accounts (provider, external_id);
