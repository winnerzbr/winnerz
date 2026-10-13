import type { HardwareKind } from '../data/types';
import { canonicalPlatform } from '../lib/platforms';

/** Tom da plataforma (mesma família, mesmo tom), para o cartão ter cara própria sem foto. */
export function hueOf(p?: string) {
  const c = canonicalPlatform(p ?? '');
  if (/PlayStation|PSP|Vita/.test(c)) return 220;
  if (/Xbox/.test(c)) return 130;
  if (/Nintendo|Wii|Game Boy|NES|SNES|GameCube|3DS|DS/.test(c)) return 0;
  if (/PC/.test(c)) return 270;
  return 32;
}

export function KindIcon({ k }: { k: HardwareKind }) {
  const d = k === 'acessorio'
    ? <><path d="M6 9.5h4M8 7.5v4M15.5 9.5h.01M17.5 11.5h.01" /><path d="M7 5.5h10a4 4 0 0 1 4 3.6l.8 5.9a2.6 2.6 0 0 1-4.6 2l-1.9-2.2H8.7L6.8 17a2.6 2.6 0 0 1-4.6-2l.8-5.9A4 4 0 0 1 7 5.5z" /></>
    : k === 'portatil'
      ? <><rect x="2.5" y="6" width="19" height="12" rx="3" /><rect x="7" y="8.5" width="10" height="7" rx="1" /></>
      : <><rect x="3" y="7" width="18" height="10" rx="2" /><path d="M7 12h3M14.5 12h2.5" /></>;
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
}

