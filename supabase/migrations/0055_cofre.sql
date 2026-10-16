-- 0055 · Álbum, etapa A2: o Cofre
--
-- Repetidas viram figurinhas que faltam: 3 repetidas por uma Comum à escolha, 10 por uma Incomum à escolha. A pessoa
-- escolhe a figurinha (só entre as que ainda não tem, de álbuns publicados) e quais repetidas entram; o banco confere
-- que cada uma é mesmo repetida (fica sempre pelo menos uma de cada), tira as cópias e entrega a nova (ela vai para
-- a bandeja de colar). Cada troca fica registrada. Pode rodar mais de uma vez. Precisa da 0053.

create table if not exists public.album_vault_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target uuid not null references public.album_stickers (id) on delete cascade,
  given jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists album_vault_log_user on public.album_vault_log (user_id, created_at desc);
alter table public.album_vault_log enable row level security;
revoke all on public.album_vault_log from anon, authenticated;

-- p_give: [{"id": "<figurinha>", "n": 2}, ...]
create or replace function public.album_vault(p_target uuid, p_give jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid(); t public.album_stickers; need integer; total integer := 0; g record; have integer;
begin
  if me is null then raise exception 'not_logged'; end if;
  select s.* into t from album_stickers s join album_pages pg on pg.id = s.page_id join album_books b on b.id = pg.book_id
  where s.id = p_target and s.active and b.published;
  if not found then raise exception 'vault_target'; end if;
  need := case t.tier when 'comum' then 3 when 'incomum' then 10 else null end;
  if need is null then raise exception 'vault_tier'; end if;
  if exists (select 1 from album_items where user_id = me and sticker_id = t.id and qty > 0) then raise exception 'vault_owned'; end if;
  if jsonb_typeof(p_give) <> 'array' then raise exception 'vault_give'; end if;

  -- trava as linhas e confere cada repetida
  for g in select (e ->> 'id')::uuid as id, sum((e ->> 'n')::integer) as n from jsonb_array_elements(p_give) e group by 1 loop
    if g.n is null or g.n < 1 then raise exception 'vault_give'; end if;
    select qty into have from album_items where user_id = me and sticker_id = g.id for update;
    if have is null or have - 1 < g.n then raise exception 'vault_not_spare'; end if;
    total := total + g.n;
  end loop;
  if total <> need then raise exception 'vault_count'; end if;

  for g in select (e ->> 'id')::uuid as id, sum((e ->> 'n')::integer) as n from jsonb_array_elements(p_give) e group by 1 loop
    update album_items set qty = qty - g.n where user_id = me and sticker_id = g.id;
  end loop;
  insert into album_items (user_id, sticker_id, qty) values (me, t.id, 1)
  on conflict (user_id, sticker_id) do update set qty = album_items.qty + 1;
  insert into album_vault_log (user_id, target, given) values (me, t.id, p_give);
  return public.album_sticker_json(t);
end; $$;

revoke all on function public.album_vault(uuid, jsonb) from public, anon;
grant execute on function public.album_vault(uuid, jsonb) to authenticated;
