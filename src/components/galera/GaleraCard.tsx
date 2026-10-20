/**
 * A figurinha da Galera (frente e verso), no desenho aprovado: moldura déco de cobre, avatar quadrado com borda
 * discreta, logo no topo, número escrito embaixo do avatar. O Fundador (nº 001 a 100) é dourado, com filigrana nos
 * cantos, a faixa "Fundador" e o foil animado. Só arte do WinnerZ ou da própria pessoa: o jogo marcante vai escrito.
 */
import { useId, type CSSProperties } from 'react';
import { portraitSrc, type GaleraCard as Card } from '../../data/galeraApi';

const LOGO = 'M2 0H58L147 222L124 280H114ZM180 0H222L282 148L307 85H366L288 280H273L201 98L167 182L134 115ZM232 0H506L484 54H254ZM386 105H472L454 150H420L389 226H492L470 280H336L326 256ZM70 0H170L148 54H92Z';
const DEFAULT_AVATAR = '/brand/iamiguinho/icone-256.webp';
const n3 = (n: number | null | undefined) => String(n ?? 0).padStart(3, '0');

function Logo({ fill }: { fill: string }) {
  return <svg viewBox="0 0 506 280" aria-hidden="true"><path fill={fill} d={LOGO} /></svg>;
}

/** Linha déco de cantos escalonados (figurinha comum). */
function DecoLines({ color }: { color: string }) {
  return (
    <svg className="glr__orn" viewBox="0 0 100 140" aria-hidden="true">
      <g fill="none" stroke={color}>
        <path d="M9 5H91V9H95V131H91V135H9V131H5V9H9Z" strokeWidth=".45" />
        <path d="M11 7.4H89V11H92.6V129H89V132.6H11V129H7.4V11H11Z" strokeWidth=".2" />
        <path d="M5 20H9M5 22H8M5 24H7M95 20H91M95 22H92M95 24H93M5 120H9M5 118H8M5 116H7M95 120H91M95 118H92M95 116H93" strokeWidth=".3" />
      </g>
    </svg>
  );
}

const CORNER = (
  <>
    <path d="M0 22V6.5Q0 0 6.5 0H22" fill="none" strokeWidth=".7" />
    <path d="M2.4 17.5V8Q2.4 2.4 8 2.4H17.5" fill="none" strokeWidth=".3" />
    <path d="M5 5C9.4 2.1 13.6 3.9 12.7 7.4C11.9 10.3 7.9 9.5 8.7 7.1" fill="none" strokeWidth=".42" />
    <path d="M5 5C2.1 9.4 3.9 13.6 7.4 12.7C10.3 11.9 9.5 7.9 7.1 8.7" fill="none" strokeWidth=".42" />
    <circle cx="4.5" cy="4.5" r="1.05" stroke="none" />
    <path d="M21.6 -1L25 0L21.6 1ZM-1 21.6L0 25L1 21.6Z" stroke="none" />
  </>
);

/** Filigrana dourada (Fundador): cantos em arabesco ligados por linhas duplas. */
function Filigree({ id }: { id: string }) {
  const g = `url(#${id})`;
  return (
    <svg className="glr__orn" viewBox="0 0 100 140" aria-hidden="true">
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="12" y2="22" spreadMethod="reflect">
          <stop offset="0" stopColor="#FFF4D2" /><stop offset=".35" stopColor="#E6BF72" /><stop offset=".6" stopColor="#A9783A" /><stop offset=".85" stopColor="#F3D899" /><stop offset="1" stopColor="#FFF0C8" />
        </linearGradient>
      </defs>
      <g fill={g} stroke={g}>
        <g transform="translate(4.6 4.6) scale(.75 .75)">{CORNER}</g>
        <g transform="translate(95.4 4.6) scale(-.75 .75)">{CORNER}</g>
        <g transform="translate(4.6 135.4) scale(.75 -.75)">{CORNER}</g>
        <g transform="translate(95.4 135.4) scale(-.75 -.75)">{CORNER}</g>
        <path d="M21.1 4.6H78.9M21.1 135.4H78.9M4.6 21.1V118.9M95.4 21.1V118.9" fill="none" strokeWidth=".5" />
        <path d="M17.7 6.4H82.3M17.7 133.6H82.3M6.4 17.7V122.3M93.6 17.7V122.3" fill="none" strokeWidth=".18" />
        <path d="M4.6 66L6.1 70L4.6 74L3.1 70ZM95.4 66L96.9 70L95.4 74L93.9 70ZM46 135.4L50 133.9L54 135.4L50 136.9Z" stroke="none" />
      </g>
    </svg>
  );
}

export function GaleraCard({ card, back = false, still = false, width, className = '' }: {
  card: Card; back?: boolean; still?: boolean; width?: number | string; className?: string;
}) {
  const gid = `glr-au-${useId().replace(/:/g, '')}`;
  const fund = card.fundador;
  const metal = fund ? '#ebc883' : '#eaa57c';
  const style: CSSProperties | undefined = width != null ? { width } : undefined;
  const handle = card.handle ? `@${card.handle}` : '';
  const atCls = `glr__at glr__mt${handle.length > 15 ? ' glr__at--long' : ''}`;
  const label = `Figurinha da Galera de ${handle || 'uma pessoa'}, nº ${n3(card.number)}${fund ? ', Fundador' : ''}${back ? ', verso' : ''}`;
  if (card.retired) return <GaleraGhost kind="gone" number={card.number} width={width} className={className} />;
  return (
    <div className={`glr${still ? ' is-still' : ''} ${className}`} style={style} role="img" aria-label={label}>
      <div className={`glr__card${fund ? ' is-fund' : ''}${back ? ' is-back' : ''}`}>
        <span className="glr__frame" />
        <div className="glr__art">
          {back ? (
            <div className="glr__bk">
              <div className="glr__bk-logo"><Logo fill={metal} /></div>
              <div className="glr__bk-kick">Figurinha da Galera</div>
              <div className="glr__seal"><small>{fund ? 'Fundador' : 'Jogador'}</small><b className="glr__mt">{n3(card.number)}</b></div>
              <div className={atCls}>{handle}</div>
              {card.name && <div className="glr__name">{card.name}</div>}
              <span className="glr__rule"><i /><b /><i /></span>
              {card.game && <div className="glr__bk-row up">Jogo marcante · {card.game}</div>}
              {card.handle && <div className="glr__bk-row">winnerz.com.br/@{card.handle}</div>}
              <div className="glr__bk-foot">Tirou esta figurinha? Mande um aceno.</div>
            </div>
          ) : (
            <>
              <img className="glr__scene" src={`/galera/${card.scene}.webp`} alt="" loading="lazy" decoding="async" />
              <span className="glr__dim" />
              <span className="glr__rays" />
              <span className="glr__pp" />
              <div className="glr__av"><img src={portraitSrc(card.portrait) ?? DEFAULT_AVATAR} alt="" loading="lazy" decoding="async" /></div>
              <div className="glr__logo"><Logo fill={metal} /></div>
              <div className="glr__num glr__mt">Nº {n3(card.number)}</div>
              <div className="glr__plate">
                {card.phrase && <span className="glr__quote">“{card.phrase}”</span>}
                <span className={atCls}>{handle}</span>
                <span className="glr__rule"><i /><b /><i /></span>
                {card.name && <span className="glr__name">{card.name}</span>}
                {card.game && <span className="glr__game">Jogo marcante · {card.game}</span>}
              </div>
            </>
          )}
          <span className="glr__sheen" />
        </div>
        {fund ? <Filigree id={gid} /> : <DecoLines color={metal} />}
        {fund && !back && <span className="glr__rib">Fundador</span>}
      </div>
    </div>
  );
}

/** Espaço sem figurinha: uma pessoa que você ainda não tirou, ou a cópia de quem saiu (aposentada). */
export function GaleraGhost({ kind, number, width, className = '' }: { kind: 'gone' | 'unknown'; number?: number | null; width?: number | string; className?: string }) {
  return (
    <div className={`glr is-still ${className}`} style={width != null ? { width } : undefined} role="img" aria-label={kind === 'gone' ? `Figurinha aposentada, nº ${n3(number)}` : 'Figurinha que você ainda não tirou'}>
      <div className={`glr__card ${kind === 'gone' ? 'is-gone' : 'is-unknown'}`}>
        <span className="glr__frame" />
        <div className="glr__art">
          <div className="glr__ghost">
            <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="36" r="18" fill="currentColor" /><path d="M14 96C16 72 32 62 50 62C68 62 84 72 86 96Z" fill="currentColor" /></svg>
            {kind === 'gone' ? <><b>Nº {n3(number)}</b><span>Aposentada</span></> : <span>Ainda não tirada</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
