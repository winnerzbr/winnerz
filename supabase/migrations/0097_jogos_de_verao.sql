-- IAmiguinho: Jogos de Verão no site (01/11/2026).
-- O editor do jogo guarda aqui o rascunho, o que foi aplicado e as versões (antes ficava no banco da página do Claude),
-- e as imagens pintadas no editor vão para a pasta "jogos" do Storage.
-- Todo mundo que joga lê (o jogo precisa do que foi aplicado); só a administração grava.
-- Pode rodar de novo sem problema.

create table if not exists public.jogo_dados (
  caminho text primary key check (char_length(caminho) between 1 and 300),
  dados jsonb not null,
  atualizado timestamptz not null default now()
);
alter table public.jogo_dados enable row level security;
grant select on public.jogo_dados to anon, authenticated;
grant insert, update, delete on public.jogo_dados to authenticated;

drop policy if exists "jogo_dados: todos leem" on public.jogo_dados;
create policy "jogo_dados: todos leem" on public.jogo_dados for select to anon, authenticated using (true);
drop policy if exists "jogo_dados: administração cria" on public.jogo_dados;
create policy "jogo_dados: administração cria" on public.jogo_dados for insert to authenticated with check (public.is_admin());
drop policy if exists "jogo_dados: administração troca" on public.jogo_dados;
create policy "jogo_dados: administração troca" on public.jogo_dados for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "jogo_dados: administração apaga" on public.jogo_dados;
create policy "jogo_dados: administração apaga" on public.jogo_dados for delete to authenticated using (public.is_admin());

-- Imagens pintadas no editor: leitura pública (o jogo carrega), só a administração envia. Até 15 MB por imagem.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('jogos', 'jogos', true, 15728640, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 15728640, allowed_mime_types = array['image/webp', 'image/png', 'image/jpeg'];
drop policy if exists "jogos: administração envia" on storage.objects;
create policy "jogos: administração envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'jogos' and public.is_admin());
drop policy if exists "jogos: administração troca" on storage.objects;
create policy "jogos: administração troca" on storage.objects for update to authenticated
  using (bucket_id = 'jogos' and public.is_admin());
drop policy if exists "jogos: administração apaga" on storage.objects;
create policy "jogos: administração apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'jogos' and public.is_admin());
