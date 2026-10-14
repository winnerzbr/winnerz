/** Textos e endereços dos alvos de denúncia (fila do Studio e histórico). */
export type ReportKind = 'perfil' | 'jornada' | 'vitrine' | 'momento' | 'museu';
export interface Snapshot { handle?: string; bio?: string | null; avatar?: boolean; cover?: boolean; game?: string; slug?: string; title?: string; description?: string | null; quote?: string | null; text?: string | null; intro?: string | null; photo?: boolean; shared?: boolean; hidden?: boolean }

/** O que mostrar sobre o alvo na fila e no histórico. */
export function targetLabel(kind: ReportKind, s: Snapshot | null | undefined): string {
  if (!s) return 'Já não existe';
  switch (kind) {
    case 'jornada': return `Jornada de ${s.game ?? 'um jogo'}`;
    case 'vitrine': return `Vitrine “${s.title ?? ''}”`;
    case 'momento': return `Foto “${s.title ?? 'Momento'}” · ${s.game ?? ''}`;
    case 'museu': return `Museu${s.title ? ` “${s.title}”` : ''}`;
    default: return `Perfil @${s.handle ?? ''}`;
  }
}
/** Endereço público do alvo, para abrir e conferir. */
export function targetLink(kind: ReportKind, handle: string | null, ref: string, s: Snapshot | null | undefined): string | null {
  if (!handle) return null;
  const at = `/@${handle.toLowerCase()}`;
  if (kind === 'jornada') return `${at}/${ref}`;
  if (kind === 'momento') return s?.slug ? `${at}/${s.slug}` : at;
  if (kind === 'vitrine') return `${at}/vitrines/${ref}`;
  if (kind === 'museu') return `${at}/museu`;
  return at;
}
