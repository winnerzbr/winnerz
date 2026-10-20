-- WinnerZ — Sistema de live, etapa 1: os eventos da Twitch (seguidor, inscrição, renovação, presente, bits e raid) para
-- os alertas do overlay. Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez.
-- Precisa da 0069 (twitch_channel).
--
-- A Twitch avisa o servidor (EventSub, /api/pontes?twitch=evento) e o servidor grava aqui, com a chave secreta. O
-- overlay da live (que não tem login) lê só os eventos das últimas 24 horas, e só o que já aparece na transmissão: o
-- tipo, o nome público de quem fez e o número (meses, presentes, bits ou pessoas do raid). Nenhuma mensagem é guardada.

create table if not exists public.live_events (
  id bigint generated always as identity primary key,
  origem text not null check (origem in ('twitch', 'youtube', 'teste')),
  tipo text not null check (tipo in ('follow', 'sub', 'resub', 'gift', 'cheer', 'raid', 'superchat', 'member')),
  quem text not null check (char_length(quem) between 1 and 60),
  valor integer check (valor is null or valor between 0 and 10000000),
  ext_id text unique check (char_length(ext_id) <= 120),
  created_at timestamptz not null default now()
);
create index if not exists live_events_recentes on public.live_events (created_at desc);

alter table public.live_events enable row level security;
revoke all on public.live_events from anon, authenticated;
grant select (id, origem, tipo, quem, valor, created_at) on public.live_events to anon, authenticated;
drop policy if exists live_events_ler on public.live_events;
create policy live_events_ler on public.live_events for select to anon, authenticated using (created_at > now() - interval '1 day');

-- As inscrições do EventSub do canal (uma por tipo de evento): [{ "tipo": "...", "id": "...", "status": "..." }].
alter table public.twitch_channel add column if not exists subs jsonb;
