/**
 * A figurinha da Galera (frente e verso), no desenho aprovado: moldura déco de cobre, avatar quadrado com borda
 * discreta, logo no topo, número escrito embaixo do avatar. O Fundador (nº 001 a 100) é dourado, com filigrana nos
 * cantos, a faixa "Fundador" e o foil animado. Só arte do WinnerZ ou da própria pessoa: o jogo marcante vai escrito.
 * O desenho em si está em render.ts (o livro do Álbum da Galera usa o mesmo HTML).
 */
import { useMemo, type CSSProperties } from 'react';
import type { GaleraCard as Card } from '../../data/galeraApi';
import { galeraHTML, galeraLabel, ghostHTML } from './render';

export function GaleraCard({ card, back = false, still = false, width, className = '' }: {
  card: Card; back?: boolean; still?: boolean; width?: number | string; className?: string;
}) {
  const html = useMemo(() => galeraHTML(card, back), [card, back]);
  const style: CSSProperties | undefined = width != null ? { width } : undefined;
  return <div className={`glr${still || card.retired ? ' is-still' : ''} ${className}`} style={style} role="img" aria-label={galeraLabel(card, back)} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Espaço sem figurinha: uma pessoa que você ainda não tirou, ou a cópia de quem saiu (aposentada). */
export function GaleraGhost({ kind, number, width, className = '' }: { kind: 'gone' | 'unknown'; number?: number | null; width?: number | string; className?: string }) {
  return <div className={`glr is-still ${className}`} style={width != null ? { width } : undefined} role="img" aria-label={kind === 'gone' ? `Figurinha aposentada, nº ${String(number ?? 0).padStart(3, '0')}` : 'Figurinha que você ainda não tirou'} dangerouslySetInnerHTML={{ __html: ghostHTML(kind, number) }} />;
}
