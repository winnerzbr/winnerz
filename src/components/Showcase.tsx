import type { ReactNode } from 'react';
import { Link } from '../lib/router';
import type { HardwareKind } from '../data/types';
import type { ResolvedPiece } from '../lib/showcases';
import { CoverArt } from './CoverArt';
import { KindIcon, hueOf } from './HardwareArt';
import { shortPlatform } from '../lib/platforms';

/** O que a vitrine mostra de cada peça: capa, título e plataforma (ou o console). Nada da ficha do exemplar. */
export interface ShelfItem { key: string; t: 'c' | 'h'; title: string; cover?: string; platform?: string; slug?: string; hwKind?: HardwareKind }

export const shelfItem = (p: ResolvedPiece): ShelfItem => (p.kind === 'c'
  ? { key: `c-${p.copy.id}`, t: 'c', title: p.game.title, cover: p.game.cover, platform: p.copy.platform, slug: p.game.slug }
  : { key: `h-${p.hw.id}`, t: 'h', title: p.hw.name, platform: p.hw.platform, hwKind: p.hw.kind });

/** Uma peça na prateleira de vidro: capa (com reflexo) ou o console. */
export function ShelfPiece({ it, link = true, children }: { it: ShelfItem; link?: boolean; children?: ReactNode }) {
  const body = it.t === 'c' ? (
    <span className="vshelf__cover"><CoverArt game={{ title: it.title, cover: it.cover ?? '' }} platform={it.platform} /></span>
  ) : (
    <span className="vshelf__hw" style={{ ['--h' as string]: hueOf(it.platform) }}>
      <KindIcon k={it.hwKind ?? 'console'} />
      <span className="t">{it.title}</span>
    </span>
  );
  return (
    <figure className={`vshelf__piece vshelf__piece--${it.t}`}>
      {link && it.slug ? <Link to={`/jogos/${it.slug}`} className="vshelf__link" aria-label={it.title}>{body}</Link> : body}
      <figcaption className="vshelf__cap">
        <span className="vshelf__title">{it.title}</span>
        {it.platform && <span className="vshelf__plat">{shortPlatform(it.platform)}</span>}
      </figcaption>
      {children}
    </figure>
  );
}

/** A vitrine em si: peças sobre prateleiras de vidro, com luz de cima. `compact` = uma prateleira só, para listas. */
export function Shelf({ items, compact = false, link = true, empty }: { items: ShelfItem[]; compact?: boolean; link?: boolean; empty?: ReactNode }) {
  if (!items.length) return <div className={`vshelf vshelf--empty${compact ? ' vshelf--compact' : ''}`}><p className="muted">{empty ?? 'Nenhuma peça por enquanto.'}</p></div>;
  return (
    <div className={`vshelf${compact ? ' vshelf--compact' : ''}`}>
      <div className="vshelf__glass">
        {items.map((it) => <ShelfPiece key={it.key} it={it} link={link} />)}
      </div>
    </div>
  );
}
