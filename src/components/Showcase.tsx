import { useEffect, useState, type ReactNode } from 'react';
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

/** Uma peça na prateleira de vidro (edição da vitrine): capa ou o console, com a plaquinha. */
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

/** A caixa do jogo em pé, em 3D: lombada com o nome e a capa na frente. */
function GameCase({ it, on, onPick }: { it: ShelfItem; on?: boolean; onPick?: () => void }) {
  const inner = (
    <>
      <span className="vcase__spine"><span>{it.title}</span></span>
      <span className="vcase__front"><CoverArt game={{ title: it.title, cover: it.cover ?? '' }} platform={it.platform} /></span>
    </>
  );
  return onPick
    ? <button className={`vcase${on ? ' is-on' : ''}`} onClick={onPick} aria-pressed={!!on} aria-label={it.title}>{inner}</button>
    : it.slug ? <Link className="vcase" to={`/jogos/${it.slug}`} aria-label={it.title}>{inner}</Link> : <span className="vcase">{inner}</span>;
}

/** Console, portátil ou acessório na prateleira de baixo (desenho genérico, sem marca). */
function HardwarePiece({ it, on, onPick }: { it: ShelfItem; on?: boolean; onPick?: () => void }) {
  const k = it.hwKind ?? 'console';
  const inner = (
    <>
      <span className={`vhw vhw--${k}`} style={{ ['--h' as string]: hueOf(it.platform) }} aria-hidden="true"><i /></span>
      <span className="vhw__t">{it.title}</span>
    </>
  );
  return onPick
    ? <button className={`vhwp${on ? ' is-on' : ''}`} onClick={onPick} aria-pressed={!!on} aria-label={it.title}>{inner}</button>
    : <span className="vhwp">{inner}</span>;
}

/**
 * Vitrine B · Expositor de colecionador: o móvel de vidro com moldura preta, prateleiras com fita de LED,
 * as caixas em pé em 3D e os consoles na prateleira de baixo. A porta abre; tocar numa peça a traz para
 * a frente e mostra o que ela é ao lado.
 */
export function Cabinet({ items, owner, empty }: { items: ShelfItem[]; owner?: string; empty?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [led, setLed] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    const quick = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setOpen(true), quick ? 0 : 500);
    return () => clearTimeout(t);
  }, []);
  const games = items.filter((x) => x.t === 'c'), hw = items.filter((x) => x.t === 'h');
  const cur = items.find((x) => x.key === sel) ?? null;
  const pick = (k: string) => { setOpen(true); setSel((s) => (s === k ? null : k)); };
  if (!items.length) return <div className="vshelf vshelf--empty"><p className="muted">{empty ?? 'Nenhuma peça por enquanto.'}</p></div>;
  return (
    <div className="vcab">
      <div className={`vcab__box${led ? '' : ' is-dark'}`}>
        <div className="vcab__frame">
          {games.length > 0 && <div className="vcab__rows">{games.map((it) => <div key={it.key} className="vcab__cell"><GameCase it={it} on={sel === it.key} onPick={() => pick(it.key)} /></div>)}</div>}
          {hw.length > 0 && <div className="vcab__rows vcab__rows--hw">{hw.map((it) => <div key={it.key} className="vcab__cell"><HardwarePiece it={it} on={sel === it.key} onPick={() => pick(it.key)} /></div>)}</div>}
        </div>
        <span className="vcab__glass" aria-hidden="true"><span className={`vcab__door${open ? ' is-open' : ''}`}><i /></span></span>
        <span className="vcab__plate">WinnerZ · coleção{owner ? ` de @${owner}` : ''}</span>
      </div>
      <aside className="vcab__side">
        <div className="vcab__tools">
          <button className="btn primary sm" onClick={() => setOpen((o) => !o)}>{open ? 'Fechar a porta' : 'Abrir a vitrine'}</button>
          <button className="btn ghost sm" onClick={() => setLed((l) => !l)} aria-pressed={!led}>{led ? 'Apagar as luzes' : 'Acender as luzes'}</button>
        </div>
        {cur ? (
          <div className="vcab__det" key={cur.key}>
            <span className="kicker">{cur.t === 'h' ? ({ console: 'Console', portatil: 'Portátil', acessorio: 'Acessório' } as Record<string, string>)[cur.hwKind ?? 'console'] : 'Jogo'}{cur.platform ? ` · ${shortPlatform(cur.platform)}` : ''}</span>
            <b className="t">{cur.title}</b>
            {cur.slug && <Link to={`/jogos/${cur.slug}`} className="vcab__more">Ver a ficha do jogo →</Link>}
          </div>
        ) : <p className="faint vcab__hint">Toque numa peça para trazer ela para a frente.</p>}
        <ol className="vcab__list">
          {items.map((it, i) => (
            <li key={it.key}><button className={sel === it.key ? 'is-on' : ''} onClick={() => pick(it.key)}><span className="mono">{String(i + 1).padStart(2, '0')}</span><b>{it.title}</b></button></li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

/** A vitrine em lista e no perfil: uma prateleira do expositor, com as caixas em 3D lado a lado. */
export function Shelf({ items, compact = false, link = true, empty }: { items: ShelfItem[]; compact?: boolean; link?: boolean; empty?: ReactNode }) {
  if (!items.length) return <div className={`vshelf vshelf--empty${compact ? ' vshelf--compact' : ''}`}><p className="muted">{empty ?? 'Nenhuma peça por enquanto.'}</p></div>;
  return (
    <div className={`vmini${compact ? ' vmini--compact' : ''}`}>
      <div className="vmini__row">
        {items.map((it) => (
          <div key={it.key} className="vmini__cell" title={it.title}>
            {it.t === 'c' ? (link ? <GameCase it={it} /> : <span className="vcase"><span className="vcase__spine"><span>{it.title}</span></span><span className="vcase__front"><CoverArt game={{ title: it.title, cover: it.cover ?? '' }} platform={it.platform} /></span></span>) : <HardwarePiece it={it} />}
          </div>
        ))}
      </div>
    </div>
  );
}
