/** Textos e endereços dos alvos de denúncia (fila do Studio e histórico). */
export type ReportKind = 'perfil' | 'jornada' | 'vitrine' | 'momento' | 'museu' | 'comunidade' | 'postagem' | 'resposta' | 'clube';
export interface Snapshot { handle?: string; bio?: string | null; avatar?: boolean; cover?: boolean; game?: string; slug?: string; title?: string; description?: string | null; quote?: string | null; text?: string | null; intro?: string | null; photo?: boolean; shared?: boolean; hidden?: boolean; community?: string; postId?: string; club?: string | null }

/** O que mostrar sobre o alvo na fila e no histórico. */
export function targetLabel(kind: ReportKind, s: Snapshot | null | undefined): string {
  if (!s) return 'Já não existe';
  switch (kind) {
    case 'jornada': return `Jornada de ${s.game ?? 'um jogo'}`;
    case 'vitrine': return `Vitrine “${s.title ?? ''}”`;
    case 'momento': return `Foto “${s.title ?? 'Momento'}” · ${s.game ?? ''}`;
    case 'museu': return `Museu${s.title ? ` “${s.title}”` : ''}`;
    case 'comunidade': return `Comunidade “${s.title ?? ''}”`;
    case 'postagem': return `Postagem “${s.title ?? ''}”${s.community ? ` · ${s.community}` : ''}`;
    case 'clube': return `Clube “${s.title ?? ''}”${s.game ? ` · ${s.game}` : ''}`;
    case 'resposta': return `Resposta em “${s.title ?? ''}”${s.community ? ` · ${s.community}` : ''}`;
    default: return `Perfil @${s.handle ?? ''}`;
  }
}
/** Endereço público do alvo, para abrir e conferir. */
export function targetLink(kind: ReportKind, handle: string | null, ref: string, s: Snapshot | null | undefined): string | null {
  if (kind === 'clube') return s?.slug ? `/clube/${s.slug}` : null;
  // Postagem ou resposta de clube: abre na conversa do clube.
  if ((kind === 'postagem' || kind === 'resposta') && s?.club) return `/clube/${s.club}#m-${ref}`;
  if (kind === 'comunidade') return s?.slug ? `/w/${s.slug}` : null;
  if (kind === 'postagem') return `/conversa/${ref}`;
  if (kind === 'resposta') return s?.postId ? `/conversa/${s.postId}#r-${ref}` : null;
  if (!handle) return null;
  const at = `/@${handle.toLowerCase()}`;
  if (kind === 'jornada') return `${at}/${ref}`;
  if (kind === 'momento') return s?.slug ? `${at}/${s.slug}` : at;
  if (kind === 'vitrine') return `${at}/vitrines/${ref}`;
  if (kind === 'museu') return `${at}/museu`;
  return at;
}
