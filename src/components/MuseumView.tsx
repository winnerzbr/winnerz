import type { ReactNode } from 'react';
import { Link } from '../lib/router';
import type { Exhibit } from '../lib/museum';
import { CoverArt } from './CoverArt';
import { KindIcon, hueOf } from './HardwareArt';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export const roomNumber = (i: number) => ROMAN[i] ?? String(i + 1);

/** Uma peça pendurada na parede: a moldura (capa, foto, momento ou o console no pedestal) e a plaquinha. */
export function ExhibitView({ ex, link = true, children }: { ex: Exhibit; link?: boolean; children?: ReactNode }) {
  const art = ex.t === 'h' ? (
    <span className="mx__plinth" style={{ ['--h' as string]: hueOf(ex.platform) }}>
      <span className="mx__obj"><KindIcon k={ex.hwKind ?? 'console'} /></span>
    </span>
  ) : ex.t === 'c' ? (
    <span className="mx__frame mx__frame--cover"><CoverArt game={{ title: ex.title, cover: ex.cover ?? '' }} platform={ex.platform} /></span>
  ) : ex.img ? (
    <span className={`mx__frame mx__frame--photo${ex.t === 'm' ? ' mx__frame--moment' : ''}`}><img src={ex.img} alt="" loading="lazy" decoding="async" /></span>
  ) : (
    <span className="mx__frame mx__frame--quote"><span className="mx__quote">“{ex.quote || ex.title}”</span></span>
  );
  const plaque = ex.t !== 'f' || ex.caption;
  return (
    <figure className={`mx mx--${ex.t}`}>
      <span className="mx__light" aria-hidden="true" />
      {link && ex.slug && ex.t !== 'm' ? <Link to={`/jogos/${ex.slug}`} className="mx__link" aria-label={ex.title}>{art}</Link> : art}
      {plaque && (
        <figcaption className="mx__plaque">
          {ex.title && <span className="mx__title">{ex.t === 'm' ? `“${ex.title}”` : ex.title}</span>}
          {ex.sub && <span className="mx__sub">{ex.t === 'm' ? `Momento · ${ex.sub}` : ex.sub}</span>}
          {ex.caption && <span className="mx__cap">{ex.caption}</span>}
        </figcaption>
      )}
      {children}
    </figure>
  );
}

/** Uma sala: número, nome, o texto de parede e as peças. */
export function RoomView({ index, title, text, exhibits, tools, children }: { index: number; title: ReactNode; text?: ReactNode; exhibits: ReactNode; tools?: ReactNode; children?: ReactNode }) {
  return (
    <section className="mroom" aria-label={`Sala ${index + 1}`}>
      <header className="mroom__head">
        <span className="mroom__n" aria-hidden="true">{roomNumber(index)}</span>
        <div className="mroom__txt">
          <span className="kicker">Sala {index + 1}</span>
          {title}
          {text}
        </div>
        {tools}
      </header>
      <div className="mroom__wall">{exhibits}</div>
      {children}
    </section>
  );
}
