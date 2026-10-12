import type { Game } from '../data/types';
import { shortPlatform } from '../lib/platforms';

/** Tons quentes, alinhados à paleta do site, escolhidos pelo nome do jogo (sempre o mesmo tom para o mesmo jogo). */
const HUES = [28, 18, 38, 8, 200, 160, 260, 340];
function hueFor(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

/**
 * Capa do jogo. Sem capa (jogo sem ficha do IGDB), desenha uma capa tipográfica
 * com o nome e a plataforma, para a estante nunca ter buracos.
 */
export function CoverArt({ game, platform, className = '', lazy = true }: { game: Pick<Game, 'title' | 'cover'>; platform?: string; className?: string; lazy?: boolean }) {
  if (game.cover) return <img className={`cover-art ${className}`} src={game.cover} alt="" loading={lazy ? 'lazy' : undefined} decoding="async" />;
  const hue = hueFor(game.title);
  return (
    <span className={`cover-art cover-art--type ${className}`} style={{ ['--h' as string]: hue }} aria-hidden="true">
      <span className="cover-art__title">{game.title}</span>
      {platform && <span className="cover-art__plat">{shortPlatform(platform)}</span>}
    </span>
  );
}
