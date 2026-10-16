-- 0054 · Álbum inicial da Temporada 1
--
-- Só quando o catálogo ainda está vazio: cria o álbum "Mundos para explorar" (publicado), com 4 capítulos e a página
-- lendária, e as 13 figurinhas com a arte que já está no site (/figurinhas/t1). Assim os pacotes guardados já podem
-- ser abertos. Tudo pode ser trocado, despublicado ou apagado no Studio → Álbum. Pode rodar mais de uma vez.
-- Precisa da 0053.

do $$
declare b uuid := 'a1b00000-0000-4000-8000-000000000001';
  p1 uuid := 'a1b00000-0000-4000-8000-000000000011'; p2 uuid := 'a1b00000-0000-4000-8000-000000000012';
  p3 uuid := 'a1b00000-0000-4000-8000-000000000013'; p4 uuid := 'a1b00000-0000-4000-8000-000000000014';
  p5 uuid := 'a1b00000-0000-4000-8000-000000000015';
begin
  if exists (select 1 from public.album_books) or exists (select 1 from public.album_stickers) then return; end if;

  insert into public.album_books (id, season, slug, title, subtitle, cover, position, published)
  values (b, 1, 'mundos', 'Mundos para explorar', 'Temporada 1', '/figurinhas/t1/castelo.webp', 1, true);

  insert into public.album_pages (id, book_id, position, kicker, title, body, banner, legendary) values
    (p1, b, 1, 'Capítulo 01', 'Portais da floresta', 'Passagens que só aparecem para quem continua andando.', '/figurinhas/t1/copa.webp', false),
    (p2, b, 2, 'Capítulo 02', 'Ruínas e descobertas', 'O que ficou de pé depois de tudo.', '/figurinhas/t1/ruinas.webp', false),
    (p3, b, 3, 'Capítulo 03', 'Reinos esquecidos', 'Cada mundo é um convite.', '/figurinhas/t1/reinos.webp', false),
    (p4, b, 4, 'Capítulo 04', 'Além das nuvens', 'Lá em cima, o caminho continua.', '/figurinhas/t1/castelo.webp', false),
    (p5, b, 5, 'Página lendária', 'Confluência', 'A figurinha do WinnerZ Awards. Uma por Temporada.', null, true);

  insert into public.album_stickers (season, number, page_id, slot, name, tier, art, credit) values
    (1, 1, p1, 1, 'Além do portal', 'rara', '/figurinhas/t1/portal.webp', 'Arte: WinnerZ'),
    (1, 2, p1, 2, 'Cidades nas árvores', 'incomum', '/figurinhas/t1/arvores.webp', 'Arte: WinnerZ'),
    (1, 3, p1, 3, 'Copa antiga', 'comum', '/figurinhas/t1/copa.webp', 'Arte: WinnerZ'),
    (1, 4, p2, 1, 'Ruínas do oeste', 'comum', '/figurinhas/t1/ruinas.webp', 'Arte: WinnerZ'),
    (1, 5, p2, 2, 'Guardião branco', 'incomum', '/figurinhas/t1/guardioes.webp', 'Arte: WinnerZ'),
    (1, 6, p2, 3, 'Cascata escondida', 'comum', '/figurinhas/t1/cascata.webp', 'Arte: WinnerZ'),
    (1, 7, p3, 1, 'Reinos esquecidos', 'rara', '/figurinhas/t1/reinos.webp', 'Arte: WinnerZ'),
    (1, 8, p3, 2, 'Rio de jade', 'incomum', '/figurinhas/t1/rio.webp', 'Arte: WinnerZ'),
    (1, 9, p3, 3, 'Flores do vale', 'comum', '/figurinhas/t1/flores.webp', 'Arte: WinnerZ'),
    (1, 10, p4, 1, 'Castelo das nuvens', 'rara', '/figurinhas/t1/castelo.webp', 'Arte: WinnerZ'),
    (1, 11, p4, 2, 'Ilha flutuante', 'lendaria', '/figurinhas/t1/nuvens.webp', 'Arte: WinnerZ'),
    (1, 12, p4, 3, 'Arco de luz', 'incomum', '/figurinhas/t1/arco.webp', 'Arte: WinnerZ'),
    (1, 13, p5, 1, 'Confluência', 'lendaria', '/figurinhas/t1/confluencia.webp', 'Arte: WinnerZ');
end $$;
