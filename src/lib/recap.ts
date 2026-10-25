/**
 * "Anteriormente na sua Jornada…": o que você mesmo registrou, juntado para a volta.
 * Só fatos registrados (recado, onde parou, pontos para voltar, momentos e a Cápsula); nada inventado.
 */
import type { History, ID, Session, State, TimelineEvent } from '../data/types';

/** Mesma regra da Jornada: a História aberta, ou a mais recente. (Aqui sem a store, para testar sem React.) */
function currentHistory(s: State, journeyId: ID): History | null {
  const hs = s.histories.filter((h) => h.journeyId === journeyId).sort((a, b) => a.ordinal - b.ordinal);
  return hs.find((h) => h.state === 'ativa' || h.state === 'pausada') ?? hs[hs.length - 1] ?? null;
}

export type Recap = {
  history: History;
  /** Dias desde a última sessão ou registro. */
  daysAway: number | null;
  last?: Session;
  sessionsCount: number;
  points: TimelineEvent[];
  moments: TimelineEvent[];
  capsule?: History['capsule'];
  /** Há algo para mostrar? */
  any: boolean;
};

const DAY = 86400000;

export function recapFor(s: State, journeyId: ID, now = Date.now()): Recap | null {
  const h = currentHistory(s, journeyId);
  if (!h) return null;
  const sessions = s.sessions.filter((x) => x.historyId === h.id && x.endedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const evs = s.events.filter((e) => e.historyId === h.id);
  const lastAt = [sessions[0]?.endedAt, ...evs.map((e) => e.at)].filter(Boolean).sort().at(-1);
  const points = evs.filter((e) => e.kind === 'ponto' && !e.resolved).sort((a, b) => b.at.localeCompare(a.at));
  const moments = evs.filter((e) => e.kind === 'momento').sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);
  const last = sessions[0];
  // O Bloco da campanha mora junto da Cápsula, mas só conta como Cápsula quando há algum dos quatro campos.
  const capsule = h.capsule && (h.capsule.where || h.capsule.doing || h.capsule.next || h.capsule.remember) ? h.capsule : undefined;
  const any = !!(last?.note || last?.whereStopped || points.length || moments.length || capsule);
  return { history: h, daysAway: lastAt ? Math.floor((now - Date.parse(lastAt)) / DAY) : null, last, sessionsCount: sessions.length, points, moments, capsule, any };
}

/** Vale mostrar o resumo completo? Depois de alguns dias longe, ou com a História pausada. */
export const RECAP_AFTER_DAYS = 3;
export function wantsRecap(r: Recap | null): boolean {
  return !!r && r.any && ((r.daysAway ?? 0) >= RECAP_AFTER_DAYS || r.history.state === 'pausada');
}

export function awayLabel(days: number | null): string {
  if (days == null) return '';
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 14) return `há ${days} dias`;
  if (days < 60) return `há ${Math.round(days / 7)} semanas`;
  if (days < 365) return `há ${Math.round(days / 30)} meses`;
  const y = Math.floor(days / 365);
  return `há ${y === 1 ? 'mais de um ano' : `${y} anos`}`;
}
