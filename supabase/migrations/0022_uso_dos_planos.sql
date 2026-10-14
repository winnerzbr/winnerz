-- WinnerZ — Etapa 5, entrega 8: painel "Uso dos planos gratuitos" no Studio.
-- Rode no Supabase: SQL Editor → cole este arquivo → Run. Pode rodar mais de uma vez. Precisa da 0006 (is_admin).
-- Só números agregados: nenhum e-mail, nome ou dado de pessoa sai daqui.

create or replace function public.usage_report()
returns jsonb language plpgsql security definer set search_path = public as $$
declare out jsonb; buckets jsonb := '[]'::jsonb; ai int := 0; m text;
begin
  if not is_admin() then raise exception 'Só a administração vê o uso.'; end if;
  m := to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM');
  begin
    select coalesce(jsonb_agg(jsonb_build_object('bucket', bucket_id, 'bytes', bytes, 'files', files) order by bytes desc), '[]'::jsonb) into buckets
    from (select bucket_id, sum(coalesce((metadata ->> 'size')::bigint, 0)) as bytes, count(*) as files from storage.objects group by bucket_id) b;
  exception when others then buckets := '[]'::jsonb;
  end;
  begin
    execute 'select coalesce(sum(uses), 0)::int from public.ai_usage where month = $1' into ai using m;
  exception when others then ai := 0;
  end;
  select jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'buckets', buckets,
    'users', (select count(*) from auth.users),
    'active_30d', (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
    'signins_24h', (select count(*) from auth.users where last_sign_in_at > now() - interval '24 hours'),
    'new_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'ai_month', ai,
    'month', m,
    'games', (select count(*) from games),
    'copies', (select count(*) from copies),
    'journeys', (select count(*) from journeys),
    'biggest', (select coalesce(jsonb_agg(t order by bytes desc), '[]'::jsonb) from (
      select c.relname as name, pg_total_relation_size(c.oid) as bytes
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' order by pg_total_relation_size(c.oid) desc limit 6) t)
  ) into out;
  return out;
end;
$$;
revoke execute on function public.usage_report() from public, anon;
grant execute on function public.usage_report() to authenticated;
