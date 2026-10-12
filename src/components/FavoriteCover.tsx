import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { actions, useStore } from '../data/store';

/**
 * Capa que reage ao favoritar: inclina e um rastro de energia percorre a borda.
 * Desfavoritar é discreto (sem animação). Animação de intensidade "média".
 */
export function useFavorite(gameId: string) {
  const fav = useStore((s) => s.favorites.includes(gameId));
  const [burst, setBurst] = useState(0);
  const toggle = () => {
    const now = actions.toggleFavorite(gameId);
    if (now) setBurst((b) => b + 1);
  };
  return { fav, burst, toggle };
}

export function FavoriteCover({ src, alt, width, height, burst, radius = 8 }: { src: string; alt: string; width: number; height: number; burst: number; radius?: number }) {
  const [running, setRunning] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!burst) return;
    setRunning(false);
    const a = requestAnimationFrame(() => setRunning(true));
    const t = setTimeout(() => setRunning(false), 1700);
    return () => { cancelAnimationFrame(a); clearTimeout(t); };
  }, [burst]);

  const pad = 6;
  const w = width + pad * 2;
  const h = height + pad * 2;
  return (
    <div className="fav-cover" style={{ width, height }}>
      <div className={running ? 'fav-cover__in is-tilting' : 'fav-cover__in'}>
        <img src={src} alt={alt} width={width} height={height} style={{ borderRadius: radius }} />
        {running && (
          <svg className="fav-cover__energy" width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ left: -pad, top: -pad }} aria-hidden="true">
            <rect className="tail" x="2" y="2" width={w - 4} height={h - 4} rx={radius + 3} pathLength={100} />
            <rect className="core" x="2" y="2" width={w - 4} height={h - 4} rx={radius + 3} pathLength={100} />
          </svg>
        )}
      </div>
    </div>
  );
}

export function FavoriteButton({ fav, onClick, burst, labels = ['Favoritar', 'Favorito'], className = 'btn ghost' }: { fav: boolean; onClick: () => void; burst: number; labels?: [string, string]; className?: string }) {
  return (
    <button className={className} aria-pressed={fav} onClick={onClick}>
      <span key={burst} className={burst && fav ? 'heart-pop' : ''} style={{ display: 'inline-flex' }}>
        <Icon name="coracao" size={17} fill={fav ? 'currentColor' : 'none'} />
      </span>
      {fav ? labels[1] : labels[0]}
    </button>
  );
}
