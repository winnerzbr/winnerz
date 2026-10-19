import { useEffect, useSyncExternalStore } from 'react';

/**
 * Aviso de "Sessão guardada": aparece na Jornada depois de finalizar a sessão e some sozinho.
 * Fica fora das páginas (como a celebração pequena) para sobreviver à troca de tela.
 */
type Notice = { id: number; title: string; text: string };
let current: Notice | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function noticeSaved(title: string, text: string) {
  current = { id: Date.now(), title, text };
  emit();
}

export function SavedNoticeHost() {
  const n = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => current);
  useEffect(() => {
    if (!n) return;
    const t = setTimeout(() => { if (current?.id === n.id) { current = null; emit(); } }, 5000);
    return () => clearTimeout(t);
  }, [n]);
  if (!n) return null;
  return (
    <div className="saved-note" role="status" key={n.id}>
      <span className="saved-note__text"><strong>{n.title}</strong><span>{n.text}</span></span>
      <button className="saved-note__close" aria-label="Fechar" onClick={() => { current = null; emit(); }}>×</button>
    </div>
  );
}
