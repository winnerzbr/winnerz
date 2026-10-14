-- Etapa 6 · Comunidades: o campo "vídeo ou post" aceita qualquer endereço https (antes, só YouTube e Twitch).
-- O site mostra dentro da postagem o que reconhece (YouTube, Twitch, Kick, TikTok, Instagram, X, Threads, Facebook,
-- Reddit, Vimeo, Dailymotion, Streamable, Spotify, SoundCloud, Steam); o resto aparece como link.
-- Precisa da 0026. Pode rodar mais de uma vez.
create or replace function public.clean_clip(p_clip text) returns text
language plpgsql immutable as $$
declare v text := nullif(trim(coalesce(p_clip, '')), '');
begin
  if v is null then return null; end if;
  if char_length(v) > 300 or v !~ '^https://[^\s<>"]{4,}$' then raise exception 'clip_invalid'; end if;
  return v;
end; $$;
revoke all on function public.clean_clip(text) from public, anon, authenticated;

notify pgrst, 'reload schema';
