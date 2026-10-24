-- =================================================================================================================
-- 0094 · Apagar figurinhas de vez (Criador)
--
-- Até aqui, apagar uma figurinha que alguém já tinha só a tirava dos pacotes (quem tinha continuava tendo).
-- studio_album_sticker_delete_many apaga várias de uma vez e, com p_force, apaga de vez mesmo as que alguém tem:
-- a figurinha some do álbum, dos pacotes e da coleção de todo mundo; trocas abertas com ela são canceladas.
-- Sem p_force, faz como antes: apaga as que ninguém tem e só tira dos pacotes as que alguém tem.
--
-- Pode rodar mais de uma vez.
-- =================================================================================================================

create or replace function public.studio_album_sticker_delete_many(p_ids uuid[], p_force boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_ids is null or cardinality(p_ids) = 0 then return public.studio_album_catalog(); end if;
  if cardinality(p_ids) > 400 then raise exception 'order_format'; end if;
  if p_force then
    update album_trades set state = 'cancelada', decided_at = now()
      where state = 'aberta' and (give && p_ids or take && p_ids);
    delete from album_stickers where id = any (p_ids);  -- a coleção (album_items) vai junto, em cascata
  else
    update album_stickers s set active = false
      where s.id = any (p_ids) and exists (select 1 from album_items i where i.sticker_id = s.id and i.qty > 0);
    delete from album_stickers s
      where s.id = any (p_ids) and not exists (select 1 from album_items i where i.sticker_id = s.id and i.qty > 0);
  end if;
  return public.studio_album_catalog();
end; $$;
revoke all on function public.studio_album_sticker_delete_many(uuid[], boolean) from public, anon;
grant execute on function public.studio_album_sticker_delete_many(uuid[], boolean) to authenticated;
