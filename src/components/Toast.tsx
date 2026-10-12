import { useEffect, useRef } from 'react';
import { Icon } from './Icon';

/** Confirmação discreta: aparece, confirma e some sozinha. */
export function Toast({ text }: { text: string }) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <Icon name="check" size={16} />{text}
    </div>
  );
}

/** Aviso com uma ação opcional (ex.: "Escrever por quê"). Some sozinho depois de alguns segundos. */
export function ActionToast({ text, action, onAction, onDone, ms = 6000 }: { text: string; action?: string; onAction?: () => void; onDone: () => void; ms?: number }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => { const t = setTimeout(() => done.current(), ms); return () => clearTimeout(t); }, [ms, text]);
  return (
    <div className="toast toast--action" role="status" aria-live="polite">
      <Icon name="check" size={16} /><span>{text}</span>
      {action && onAction && <button className="toast__btn" onClick={() => { onAction(); done.current(); }}>{action}</button>}
    </div>
  );
}
