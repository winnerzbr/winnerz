/**
 * Compatibilidade: os pontos antigos do mascote (indecisão, Retomada, primeiro zerado) agora usam o balão novo do
 * IAmiguinho, com as regras de modo e intervalo de lib/iamiguinho.
 */
import { CameoBalao, useCameo } from './IAmiguinho';
import type { Cameo } from '../lib/iamiguinho';

export type BuddyReason = Cameo;

export function useBuddy(reason: BuddyReason, when: boolean, scope = ''): { motivo: BuddyReason; fala: string } | null {
  const fala = useCameo(reason, when, scope);
  return fala ? { motivo: reason, fala } : null;
}

export function Buddy({ line }: { line: { motivo: BuddyReason; fala: string } | null; className?: string }) {
  return line ? <CameoBalao motivo={line.motivo} fala={line.fala} /> : null;
}
