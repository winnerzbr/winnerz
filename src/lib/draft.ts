/**
 * Rascunho automático (só neste navegador): o que a pessoa está escrevendo numa postagem ou resposta
 * fica guardado enquanto ela digita e volta se a página fechar. Some ao publicar.
 */
import { useEffect, useRef, useState } from 'react';

const PREFIX = 'wz.rascunho.';
const MAX_AGE = 14 * 86_400_000;

export function readDraft<T>(key: string | null): T | null {
  if (!key) return null;
  try {
    const x = JSON.parse(localStorage.getItem(PREFIX + key) || 'null') as { at: number; v: T } | null;
    if (!x || Date.now() - x.at > MAX_AGE) return null;
    return x.v;
  } catch { return null; }
}
export function clearDraft(key: string | null) {
  if (!key) return;
  try { localStorage.removeItem(PREFIX + key); } catch { /* nada */ }
}
export function writeDraft<T>(key: string, v: T) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), v })); } catch { /* sem espaço: segue sem rascunho */ }
}

/**
 * Guarda `value` meio segundo depois da última mudança. `empty` diz quando não há nada para guardar
 * (aí o rascunho some). Devolve quando foi guardado pela última vez.
 */
export function useDraft<T>(key: string | null, value: T, empty: boolean): number | null {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (!key) return;
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => {
      if (empty) { clearDraft(key); setSavedAt(null); } else { writeDraft(key, value); setSavedAt(Date.now()); }
    }, 500);
    return () => clearTimeout(t);
  }, [key, JSON.stringify(value), empty]); // eslint-disable-line react-hooks/exhaustive-deps
  return savedAt;
}
