-- 0057 · A Chegada (primeira visita em 15 telas)
--
-- O pacote de boas-vindas: um por conta, para sempre, aberto na tela do Álbum da Chegada (ou depois, em Pacotes).
-- É um pacote especial (Prisma), sem aviso, porque a pessoa o recebe com a Chegada aberta. Pode rodar mais de uma
-- vez. Precisa da 0053.

do $$
declare c text;
begin
  for c in select conname from pg_constraint where conrelid = 'public.album_packs'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%origin%' loop
    execute format('alter table public.album_packs drop constraint %I', c);
  end loop;
  alter table public.album_packs add constraint album_packs_origin_check check (origin in ('jornada', 'memoria', 'studio', 'boas_vindas'));
end $$;

create unique index if not exists album_packs_welcome on public.album_packs (user_id) where origin = 'boas_vindas';

-- Devolve o pacote de boas-vindas da pessoa, criando na primeira vez.
create or replace function public.album_welcome_pack() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); p album_packs;
begin
  if me is null then raise exception 'not_logged'; end if;
  select * into p from album_packs where user_id = me and origin = 'boas_vindas';
  if not found then
    insert into album_packs (user_id, kind, origin, state, reason) values (me, 'prisma', 'boas_vindas', 'fechado', 'Boas-vindas ao WinnerZ')
    on conflict do nothing returning * into p;
    if p.id is null then select * into p from album_packs where user_id = me and origin = 'boas_vindas'; end if;
  end if;
  return public.album_pack_json(p);
end; $$;

revoke all on function public.album_welcome_pack() from public, anon;
grant execute on function public.album_welcome_pack() to authenticated;
