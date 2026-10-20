-- WinnerZ — Sistema de live, etapa 2: YouTube (inscritos, Super Chat, membros e o chat). Rode no Supabase: SQL Editor →
-- cole este arquivo → Run. Pode rodar mais de uma vez. Precisa da 0082.
--
-- O canal autoriza o WinnerZ uma vez (login do Google, só leitura do YouTube) e a chave de renovação fica aqui, cifrada
-- com a chave do servidor (ninguém de fora lê a tabela). Durante a live, a Central da live (aberta no computador da live)
-- pede ao servidor a cada tantos segundos; o servidor pergunta ao YouTube, grava os alertas em live_events e as mensagens
-- do chat em live_chat, que o overlay lê. O chat do YouTube já é público; guardamos só as das últimas 24 horas.

create table if not exists public.youtube_channel (
  id smallint primary key default 1 check (id = 1),
  channel_id text check (char_length(channel_id) <= 40),
  titulo text check (char_length(titulo) <= 100),
  refresh_cifrado text check (char_length(refresh_cifrado) <= 2000),
  live_chat_id text check (char_length(live_chat_id) <= 200),
  video_id text check (char_length(video_id) <= 40),
  page_token text check (char_length(page_token) <= 400),
  procurou_live timestamptz,
  inscritos_vistos jsonb,
  checou_inscritos timestamptz,
  status text check (char_length(status) <= 80),
  updated_at timestamptz not null default now()
);
alter table public.youtube_channel enable row level security;
revoke all on public.youtube_channel from anon, authenticated;

create table if not exists public.live_chat (
  id bigint generated always as identity primary key,
  origem text not null default 'youtube' check (origem in ('youtube')),
  quem text not null check (char_length(quem) between 1 and 60),
  texto text not null check (char_length(texto) between 1 and 300),
  membro boolean not null default false,
  ext_id text unique check (char_length(ext_id) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists live_chat_recentes on public.live_chat (created_at desc);
alter table public.live_chat enable row level security;
revoke all on public.live_chat from anon, authenticated;
grant select (id, origem, quem, texto, membro, created_at) on public.live_chat to anon, authenticated;
drop policy if exists live_chat_ler on public.live_chat;
create policy live_chat_ler on public.live_chat for select to anon, authenticated using (created_at > now() - interval '1 day');

-- O valor do Super Chat como o YouTube escreve ("R$ 10,00"), para o alerta.
alter table public.live_events add column if not exists extra text check (char_length(extra) <= 40);
grant select (extra) on public.live_events to anon, authenticated;
