import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Compass } from './Icon';

/**
 * Celebração de marco (Zerou). Animação "chamativa": ocupa a tela,
 * sempre com saída fácil (botão e tecla Esc).
 */
export function Celebration({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children?: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const parts = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const a = (i / 30) * Math.PI * 2;
    const r = 140 + (i % 4) * 45;
    return { dx: Math.round(Math.cos(a) * r), dy: Math.round(Math.sin(a) * r), d: 0.35 + (i % 5) * 0.05 };
  }), []);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [onClose]);

  return (
    <div className="celebration on-photo" role="dialog" aria-modal="true" aria-labelledby="cel-title">
      <div className="celebration__inner">
        <div className="celebration__burst">
          <svg className="celebration__rays fx-heavy" viewBox="0 0 340 340" aria-hidden="true">
            <g stroke="#E2BE84" strokeWidth="1.2" strokeLinecap="round">
              {Array.from({ length: 12 }, (_, i) => {
                const a = (i / 12) * Math.PI * 2;
                return <line key={i} x1="170" y1="170" x2={170 + Math.cos(a) * 160} y2={170 + Math.sin(a) * 160} />;
              })}
            </g>
          </svg>
          {parts.map((p, i) => (
            <span key={i} className="celebration__part fx-heavy" aria-hidden="true" style={{ ['--dx' as string]: `${p.dx}px`, ['--dy' as string]: `${p.dy}px`, animationDelay: `${p.d}s` }} />
          ))}
          <Compass className="celebration__star" size={140} color="#E2BE84" />
        </div>
        <div className="celebration__text">
          <h2 id="cel-title" className="t">{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
        <button ref={closeRef} className="btn quiet celebration__close" onClick={onClose}>Nada por enquanto</button>
      </div>
    </div>
  );
}

/** Carta lacrada que se abre na celebração. */
export function SealedLetter({ text, date, onOpen, opened }: { text: string; date: string; onOpen: () => void; opened: boolean }) {
  const [open, setOpen] = useState(opened);
  return (
    <div className="letter">
      <div className="letter__meta">Carta que você escreveu em {date}</div>
      {open ? (
        <p className="quote letter__text letter__text--open">“{text}”</p>
      ) : (
        <>
          <p className="quote letter__text">Uma carta lacrada esperava este momento.</p>
          <button className="letter__btn" onClick={() => { setOpen(true); onOpen(); }}>Abrir a carta</button>
        </>
      )}
    </div>
  );
}

/** Figurinha pessoal, feita com a captura do próprio jogador. */
export function PersonalSticker({ image, title }: { image: string; title: string }) {
  return (
    <figure className="personal-sticker">
      <div className="personal-sticker__frame">
        <img src={image} alt={`Sua figurinha pessoal: ${title}`} />
        <div className="personal-sticker__label"><div className="t">{title}</div><div>Figurinha pessoal</div></div>
        <span className="personal-sticker__shine fx-heavy" aria-hidden="true" />
      </div>
      <figcaption>Feita com a sua captura. Só sua, não entra em trocas.</figcaption>
    </figure>
  );
}
