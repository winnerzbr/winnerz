-- WinnerZ — 0009: preferências privadas
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez.
--
-- Antes: qualquer pessoa com conta conseguia ler a linha inteira de qualquer perfil,
-- inclusive profiles.prefs (Jornadas em foco, ajustes e o código secreto do overlay de live).
-- Depois: os outros só enxergam nome e data de criação; as suas preferências só você lê,
-- pela função my_prefs(). O overlay continua funcionando porque roda no servidor.

-- 1) Ninguém mais lê a tabela inteira pelo app.
revoke select on public.profiles from anon, authenticated;

-- 2) Quem tem conta continua lendo só as colunas públicas (nome nas análises, etc.).
grant select (id, display_name, created_at, is_admin) on public.profiles to authenticated;

-- 3) As suas preferências, só as suas.
create or replace function public.my_prefs() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select prefs from profiles where id = auth.uid()), '{}'::jsonb);
$$;
revoke all on function public.my_prefs() from public, anon;
grant execute on function public.my_prefs() to authenticated;

-- Conferência (opcional): deve listar só id, display_name, created_at e is_admin.
-- select column_name from information_schema.column_privileges
--  where table_schema = 'public' and table_name = 'profiles' and grantee = 'authenticated' and privilege_type = 'SELECT';
