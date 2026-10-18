import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Folha que sobe de baixo (no celular) ou aparece no centro (telas largas). Esc e toque fora fecham. */
export function Sheet({ title, onClose, children, labelId = 'sheet-t', wide }: { title: string; onClose: () => void; children: ReactNode; labelId?: string; wide?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    document.addEventListener('keydown', esc);
    const prev = document.activeElement as HTMLElement | null;
    // Foca a folha, não um campo: no celular, focar um campo abriria o teclado sem pedir.
    box.current?.focus({ preventScroll: true });
    return () => { document.removeEventListener('keydown', esc); prev?.focus?.({ preventScroll: true }); };
  }, []);
  return createPortal(
    <div className="sheet-back sheet-back--center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={box} className={`sheet sheet--center${wide ? ' sheet--wide' : ''}`} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={labelId}>
        <div className="sheet__grip" aria-hidden="true" />
        <h2 id={labelId} className="t sheet__title">{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Botão de apagar em dois toques: o primeiro pede confirmação, o segundo apaga. */
export function ConfirmButton({ label, confirm, onConfirm, className = 'btn quiet danger' }: { label: ReactNode; confirm: string; onConfirm: () => void; className?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 5000); return () => clearTimeout(t); }, [armed]);
  return (
    <button type="button" className={`${className}${armed ? ' is-armed' : ''}`} onClick={() => (armed ? onConfirm() : setArmed(true))} aria-live="polite">
      {armed ? confirm : label}
    </button>
  );
}
