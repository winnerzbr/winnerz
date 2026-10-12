import { useEffect, useRef, useState, type ReactNode, type KeyboardEvent as ReactKeyboardEvent, type CSSProperties } from 'react';
import { Icon } from './Icon';

export type MoreItem = { key: string; label: ReactNode; icon?: string; onSelect: () => void | Promise<void>; on?: boolean; disabled?: boolean; hint?: string };

/** "Mais ações": um botão de três pontos que abre uma lista curta de ações. Fecha com Esc, clique fora ou ao escolher. */
export function MoreActions({ items, label = 'Mais ações', className = 'quick__btn', showLabel = false, align = 'right' }: { items: MoreItem[]; label?: string; className?: string; showLabel?: boolean; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<CSSProperties>({});
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', key);
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, { passive: true, capture: true });
    window.addEventListener('resize', close);
    box.current?.querySelector<HTMLButtonElement>('[role=menuitem]:not(:disabled)')?.focus();
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', key); window.removeEventListener('scroll', close, { capture: true }); window.removeEventListener('resize', close); };
  }, [open]);
  const move = (e: ReactKeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const list = [...(box.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]:not(:disabled)') ?? [])];
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length]?.focus();
  };
  return (
    <div className="more" ref={box}>
      <button ref={btn} type="button" className={className} aria-haspopup="menu" aria-expanded={open} title={label} aria-label={showLabel ? undefined : label} onClick={() => {
          // Menu "fixo" na tela: não é cortado pelo cartão ou pelo topo da ficha. Abre para cima se faltar espaço embaixo.
          const r = btn.current?.getBoundingClientRect();
          if (r) {
            const left = r.right < 250 ? true : r.left > window.innerWidth - 250 ? false : align === 'left';
            const up = window.innerHeight - r.bottom < 240 && r.top > 240;
            setPos({ position: 'fixed', ...(left ? { left: Math.max(8, r.left) } : { right: Math.max(8, window.innerWidth - r.right) }), ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }) });
          }
          setOpen((v) => !v);
        }}>
        <Icon name="maisAcoes" size={17} />{showLabel && label}
      </button>
      {open && (
        <div className="more__menu" style={pos} role="menu" aria-label={label} onKeyDown={move}>
          {items.map((it) => (
            <button key={it.key} type="button" role="menuitem" className={`more__item${it.on ? ' is-on' : ''}`} disabled={it.disabled} title={it.hint}
              onClick={async () => { setOpen(false); await it.onSelect(); }}>
              {it.icon && <Icon name={it.icon} size={16} />}<span>{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
