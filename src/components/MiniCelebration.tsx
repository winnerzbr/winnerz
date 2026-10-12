import { useEffect, useSyncExternalStore } from 'react';
import { Compass } from './Icon';

/**
 * Celebração pequena (marcos do caminho): um cartão com figurinha que aparece e some sozinho.
 * Fica fora das páginas para sobreviver à troca de tela (ex.: ao finalizar a sessão).
 */
type Mini = { id: number; title: string; text: string };
let current: Mini | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function celebrateSmall(title: string, text: string) {
  current = { id: Date.now(), title, text };
  emit();
}

export function MiniCelebrationHost() {
  const m = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => current);
  useEffect(() => {
    if (!m) return;
    const t = setTimeout(() => { if (current?.id === m.id) { current = null; emit(); } }, 5200);
    return () => clearTimeout(t);
  }, [m]);
  if (!m) return null;
  return (
    <div className="mini-cel" role="status" key={m.id}>
      <span className="mini-cel__badge" aria-hidden="true"><Compass size={30} color="#E3BF8A" /></span>
      <span className="mini-cel__text"><span className="mini-cel__k">Figurinha do caminho</span><strong>{m.title}</strong><span>{m.text}</span></span>
      <button className="mini-cel__close" aria-label="Fechar" onClick={() => { current = null; emit(); }}>×</button>
    </div>
  );
}
