import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { Sticker } from '../../data/albumApi';
import { TIER_LABEL, TIER_MATERIAL } from '../../lib/album';
import { backHTML, num3, stickerHTML } from './render';
import { reduceMotion } from './fx';

/** A luz e o foil seguem o ponteiro. */
export function lightFollow(e: { currentTarget: HTMLElement; clientX: number; clientY: number }) {
  if (reduceMotion()) return;
  const w = e.currentTarget, st = w.querySelector<HTMLElement>('.wst'); if (!st) return;
  const r = w.getBoundingClientRect();
  st.style.setProperty('--px', `${((e.clientX - r.left) / r.width) * 100}%`);
  st.style.setProperty('--py', `${((e.clientY - r.top) / r.height) * 100}%`);
}
export function lightReset(e: { currentTarget: HTMLElement }) {
  const st = (e.currentTarget as HTMLElement).querySelector<HTMLElement>('.wst'); st?.style.removeProperty('--px'); st?.style.removeProperty('--py');
}

/** Uma figurinha na tela. Com onOpen, vira botão (ampliar). */
export function StickerView({ s, section = '', onOpen, className = '' }: { s: Sticker; section?: string; onOpen?: (el: HTMLElement) => void; className?: string }) {
  const html = { __html: stickerHTML(s, section) };
  if (onOpen) return (
    <button type="button" className={`wsw ${className}`} aria-label={`${s.name}, ${TIER_LABEL[s.tier]}, número ${num3(s.number)}. Ver de perto`}
      onClick={(e) => onOpen(e.currentTarget)} onPointerMove={lightFollow} onPointerLeave={lightReset} dangerouslySetInnerHTML={html} />
  );
  return <div className={`wsw ${className}`} role="img" aria-label={`${s.name}, ${TIER_LABEL[s.tier]}`} onPointerMove={lightFollow} onPointerLeave={lightReset} dangerouslySetInnerHTML={html} />;
}

/** Figurinha ampliada: inclina com o ponteiro e vira para mostrar o verso. */
export function StickerZoom({ s, section = '', from, onClose }: { s: Sticker; section?: string; from?: HTMLElement | null; onClose: () => void }) {
  const [back, setBack] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const flipBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    flipBtn.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    if (from && card.current && !reduceMotion()) {
      const r = from.getBoundingClientRect(), z = card.current.getBoundingClientRect();
      card.current.animate([{ transform: `translate(${r.left - z.left}px,${r.top - z.top}px) scale(${r.width / z.width})` }, { transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    return () => { document.removeEventListener('keydown', esc); from?.focus?.(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    if (reduceMotion() || !tilt.current) return;
    const r = e.currentTarget.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    tilt.current.style.transform = `rotateY(${(x - 0.5) * 24}deg) rotateX(${(0.5 - y) * 24}deg)`;
    const st = (e.currentTarget as HTMLElement).querySelector<HTMLElement>('.wst'); if (st) { st.classList.add('is-tilt'); st.style.setProperty('--px', `${x * 100}%`); st.style.setProperty('--py', `${y * 100}%`); }
  };
  const leave = (e: RPointerEvent<HTMLDivElement>) => {
    if (tilt.current) tilt.current.style.transform = '';
    const st = (e.currentTarget as HTMLElement).querySelector<HTMLElement>('.wst'); if (st) { st.classList.remove('is-tilt'); st.style.removeProperty('--px'); st.style.removeProperty('--py'); }
  };
  return (
    <div className="alb-zoom" role="dialog" aria-modal="true" aria-label={s.name} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="alb-zoom__in">
        <div className={`alb-zoom__card${back ? ' is-back' : ''}`} ref={card} onPointerMove={move} onPointerLeave={leave}>
          <div className="alb-zoom__tilt" ref={tilt}>
            <div className="alb-zoom__rot">
              <div className="wsw alb-face" dangerouslySetInnerHTML={{ __html: stickerHTML(s, section) }} />
              <div className="alb-face alb-face--b"><div className="wsw" dangerouslySetInnerHTML={{ __html: backHTML(s, section) }} /></div>
            </div>
          </div>
        </div>
        <div className="alb-zoom__ttl"><span className="alb-kick">{TIER_LABEL[s.tier]} · {TIER_MATERIAL[s.tier]} · {num3(s.number)}</span><b>{s.name}</b></div>
        <div className="alb-zoom__btns">
          <button ref={flipBtn} className="btn now" onClick={() => setBack((b) => !b)}>{back ? 'Ver frente' : 'Ver verso'}</button>
          <button className="btn ghost" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
