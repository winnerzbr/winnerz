import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '../lib/router';
import type { Exhibit } from '../lib/museum';
import { CoverArt } from './CoverArt';
import { KindIcon, hueOf } from './HardwareArt';
import { roomNumber } from './MuseumView';

export interface TourRoom { title: string; text?: string | null; exhibits: Exhibit[] }

const AUTO_MS = 7000;
const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Museu · Visita guiada: uma peça por vez, como num documentário. A cor da peça tinge a sala, um cone de luz
 * cai sobre ela, a plaquinha aparece embaixo e a frase entra como narração. Ao chegar numa sala nova, um cartão
 * com o nome da sala ocupa a tela por um instante. Setas, teclado (← →) e deslizar no celular.
 */
export function MuseumTour({ title, intro, owner, rooms, onClose, onList, back }: {
  title: string; intro?: string | null; owner: string; rooms: TourRoom[]; onClose?: () => void; onList?: () => void; back?: string;
}) {
  const stops = useMemo(() => rooms.flatMap((r, ri) => r.exhibits.map((ex, k) => ({ ex, ri, first: k === 0 }))), [rooms]);
  const groups = useMemo(() => {
    let start = 0;
    return rooms.map((r, ri) => { const g = { ri, title: r.title, text: r.text, start, count: r.exhibits.length }; start += r.exhibits.length; return g; }).filter((g) => g.count > 0);
  }, [rooms]);
  // -1 = entrada do museu
  const [i, setI] = useState(-1);
  const [card, setCard] = useState<number | null>(null);
  const [auto, setAuto] = useState(false);
  const root = useRef<HTMLElement>(null);
  const total = stops.length;
  const cur = i >= 0 ? stops[i] : null;

  const go = useCallback((k: number) => {
    const n = Math.max(-1, Math.min(total - 1, k));
    setI((old) => {
      if (n >= 0 && (old < 0 || stops[old]?.ri !== stops[n].ri)) setCard(stops[n].ri);
      return n;
    });
  }, [total, stops]);
  const next = useCallback(() => go(i + 1 >= total ? -1 : i + 1), [go, i, total]);
  const prev = useCallback(() => go(i - 1), [go, i]);

  // cartão da sala some sozinho
  useEffect(() => {
    if (card === null) return;
    const t = setTimeout(() => setCard(null), reduceMotion() ? 900 : 2200);
    return () => clearTimeout(t);
  }, [card, i]);
  // visita automática
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => { if (i + 1 >= total) setAuto(false); next(); }, i < 0 ? 2500 : AUTO_MS + (card !== null ? 2200 : 0));
    return () => clearTimeout(t);
  }, [auto, i, total, next, card]);
  // teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); setAuto(false); next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); setAuto(false); prev(); }
      else if (e.key === 'Escape' && onClose) onClose();
      else if (e.key === 'Home') go(-1);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [next, prev, go, onClose]);
  // deslizar no celular
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: { touches: TouchList; changedTouches: TouchList }) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e: { touches: TouchList; changedTouches: TouchList }) => {
    const s = touch.current; touch.current = null;
    if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x, dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) { setAuto(false); if (dx < 0) next(); else prev(); }
  };
  // a próxima imagem já vem carregando
  useEffect(() => {
    const n = stops[i + 1]?.ex;
    const src = n?.img || n?.cover;
    if (src) { const im = new Image(); im.src = src; }
  }, [i, stops]);

  const ex = cur?.ex;
  const amb = ex ? (ex.t === 'h' ? null : ex.img || ex.cover || null) : null;
  const hue = ex?.t === 'h' ? hueOf(ex.platform) : null;
  const words = ex ? (ex.t === 'm' ? ex.quote || ex.caption : ex.caption) : null;
  const room = cur ? rooms[cur.ri] : null;

  return (
    <section ref={root} className={`mtour${card !== null ? ' has-card' : ''}`} aria-roledescription="visita guiada" aria-label={`Visita guiada · ${title}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {amb && <img key={`a${i}`} className="mtour__amb" src={amb} alt="" />}
      {hue !== null && <span key={`h${i}`} className="mtour__amb mtour__amb--hue" style={{ ['--h' as string]: hue }} />}
      <span className="mtour__wall" aria-hidden="true" />
      <span className="mtour__floor" aria-hidden="true" />
      {cur && <span className="mtour__cone" aria-hidden="true" />}

      <div className="mtour__top">
        <div className="mtour__where">
          {back ? <Link className="kicker mtour__back" to={back}>← @{owner} · visita guiada</Link> : <span className="kicker">Visita guiada · museu de @{owner}</span>}
          <span className="kicker mtour__pos" aria-live="polite">{cur ? `Peça ${i + 1} de ${total}` : `${groups.length} ${groups.length === 1 ? 'sala' : 'salas'} · ${total} ${total === 1 ? 'peça' : 'peças'}`}</span>
        </div>
        <div className="mtour__tools">
          <div className="mtour__chips" role="group" aria-label="Ir para a sala">
            {groups.map((g) => <button key={g.ri} aria-pressed={cur?.ri === g.ri} onClick={() => { setAuto(false); go(g.start); }}>Sala {roomNumber(g.ri)}</button>)}
          </div>
          {total > 0 && <button className="mtour__tool" onClick={() => { if (!auto && i < 0) go(0); setAuto((a) => !a); }} aria-pressed={auto}>{auto ? 'Pausar' : 'Visita automática'}</button>}
          {onList && <button className="mtour__tool" onClick={onList}>Ver tudo numa página</button>}
          {onClose && <button className="mtour__tool" onClick={onClose} aria-label="Fechar a visita">Fechar ✕</button>}
        </div>
      </div>

      <div className="mtour__stage">
        {!cur ? (
          <div className="mtour__entry" key="entry">
            <span className="kicker">O museu de @{owner}</span>
            <h1 className="t mtour__title">{title}</h1>
            {intro && <p className="mtour__intro">{intro}</p>}
            {total > 0 ? (
              <>
                <ol className="mtour__map">
                  {groups.map((g) => (
                    <li key={g.ri}><button onClick={() => go(g.start)}><span className="mtour__mapn">{roomNumber(g.ri)}</span><b>{g.title}</b><small>{g.count} {g.count === 1 ? 'peça' : 'peças'}</small></button></li>
                  ))}
                </ol>
                <button className="btn primary" onClick={() => go(0)}>Começar a visita →</button>
              </>
            ) : <p className="muted">As salas ainda estão vazias.</p>}
          </div>
        ) : (
          <figure className={`mtour__piece mtour__piece--${ex!.t}`} key={`p${i}`}>
            {ex!.t === 'h' ? (
              <span className="mtour__obj" style={{ ['--h' as string]: hue ?? 210 }}><KindIcon k={ex!.hwKind ?? 'console'} /></span>
            ) : ex!.t === 'c' ? (
              <span className="mtour__fm"><CoverArt game={{ title: ex!.title, cover: ex!.cover ?? '' }} platform={ex!.platform} lazy={false} /></span>
            ) : ex!.img ? (
              <span className="mtour__fm mtour__fm--ph"><img src={ex!.img} alt="" /></span>
            ) : (
              <span className="mtour__fm mtour__fm--quote"><span>“{ex!.quote || ex!.title}”</span></span>
            )}
            {(ex!.title || ex!.sub) && (
              <figcaption className="mtour__plq">
                {ex!.title && <b>{ex!.t === 'm' ? `“${ex!.title}”` : ex!.title}</b>}
                {ex!.sub && <span>{ex!.t === 'm' ? `Momento · ${ex!.sub}` : ex!.sub}</span>}
              </figcaption>
            )}
            {ex!.slug && ex!.t !== 'm' && <Link className="mtour__more" to={`/jogos/${ex!.slug}`}>Ver o jogo →</Link>}
          </figure>
        )}
      </div>

      {words && <p className="mtour__nar" key={`n${i}`}>“{words}”</p>}

      {cur && card !== null && room && (
        <button className="mtour__card" key={`c${card}-${i}`} onClick={() => setCard(null)} aria-label={`Sala ${roomNumber(card)} · ${room.title}. Toque para continuar.`}>
          <span className="mtour__cardn">Sala {roomNumber(card)}</span>
          <b className="t">{room.title}</b>
          {room.text && <span className="mtour__cardtx">{room.text}</span>}
          <span className="kicker">{room.exhibits.length} {room.exhibits.length === 1 ? 'peça' : 'peças'}</span>
        </button>
      )}

      {total > 0 && <>
        <button className="mtour__arw mtour__arw--l" onClick={() => { setAuto(false); prev(); }} aria-label="Peça anterior" disabled={i < 0}>←</button>
        <button className="mtour__arw mtour__arw--r" onClick={() => { setAuto(false); next(); }} aria-label={i + 1 >= total ? 'Voltar à entrada' : 'Próxima peça'}>→</button>
        <div className="mtour__rail">
          {groups.map((g) => (
            <div key={g.ri} className="mtour__grp" style={{ flex: g.count }}>
              <span>Sala {roomNumber(g.ri)} · {g.title}</span>
              <div className="mtour__ticks">
                {Array.from({ length: g.count }, (_, k) => {
                  const n = g.start + k;
                  return <button key={k} className={n < i ? 'done' : n === i ? 'on' : ''} onClick={() => { setAuto(false); go(n); }} aria-label={`Peça ${n + 1}: ${stops[n].ex.title || 'foto'}`} aria-current={n === i ? 'step' : undefined}><i /></button>;
                })}
              </div>
            </div>
          ))}
        </div>
      </>}
      <span className="grain-lite" aria-hidden="true" />
    </section>
  );
}
