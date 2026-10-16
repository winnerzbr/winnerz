/**
 * Revisão trimestral do backlog, sem culpa (J6b). Escolhe até 20 itens para olhar com calma:
 * Histórias paradas há meses, jogos da estante ainda não começados e desejos lançados há mais de um ano.
 * As escolhas ficam guardadas como rascunho e só valem quando a pessoa confirma no fim.
 */
import type { Game, History, ID, State } from '../data/types';
import { parts } from './memory';

export type ReviewKind = 'parada' | 'estante' | 'desejo';
export type ReviewItem = {
  key: string;
  kind: ReviewKind;
  game: Game;
  /** A História parada (só em "parada"). */
  history?: History;
  journeyId?: ID;
  /** Dias desde a última vez (sessão ou começo). */
  idleDays?: number;
  whereStopped?: string;
  /** Desde quando está na estante (AAAA-MM-DD), quando se sabe. */
  since?: string;
  priority?: 1 | 2 | 3;
};
export type Decision =
  | 'voltar' | 'pausar' | 'encerrar' // parada
  | 'quero' | 'alta' | 'depois' | 'deixar' // estante
  | 'tirar' // desejo ("quero" também vale)
  | 'pular';

export const CHOICES: Record<ReviewKind, { id: Decision; label: string; hint: string }[]> = {
  parada: [
    { id: 'voltar', label: 'Voltar a jogar', hint: 'Fica em andamento (e em foco, se couber).' },
    { id: 'pausar', label: 'Pausar sem prazo', hint: 'Sai das sugestões até você voltar.' },
    { id: 'encerrar', label: 'Encerrar, sem culpa', hint: 'A História fica guardada como está.' },
  ],
  estante: [
    { id: 'quero', label: 'Ainda quero', hint: 'Continua nas sugestões.' },
    { id: 'alta', label: 'Prioridade alta', hint: 'Passa na frente no “O que jogar”.' },
    { id: 'depois', label: 'Não agora (3 meses)', hint: 'Some das sugestões até a próxima revisão.' },
    { id: 'deixar', label: 'Deixar ir', hint: 'Sai das sugestões. Continua na sua coleção.' },
  ],
  desejo: [
    { id: 'quero', label: 'Ainda quero', hint: 'Continua nos desejos.' },
    { id: 'tirar', label: 'Tirar dos desejos', hint: 'Dá para pôr de volta na ficha do jogo.' },
  ],
};

export const DECISION_DONE: Record<Decision, string> = {
  voltar: 'volta a ser jogado', pausar: 'fica pausado', encerrar: 'é encerrado',
  quero: 'continua', alta: 'vira prioridade alta', depois: 'fica para depois', deixar: 'você deixa ir',
  tirar: 'sai dos desejos', pular: 'fica como está',
};

const DAY = 86400000;
/** "2026-T4" e o rótulo "outubro a dezembro de 2026". */
export function quarterKey(iso = new Date().toISOString()) { const p = parts(iso); return `${p.y}-T${Math.floor((p.m - 1) / 3) + 1}`; }
export function quarterLabel(key: string) {
  const [y, q] = key.split('-T').map(Number);
  return `${['janeiro a março', 'abril a junho', 'julho a setembro', 'outubro a dezembro'][q - 1]} de ${y}`;
}

/** A revisão deste trimestre ainda não foi feita nem dispensada. */
export function reviewDue(s: State, now = new Date().toISOString()) {
  return s.prefs.review?.quarter !== quarterKey(now);
}

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function reviewItems(s: State, now = Date.now(), max = 20): ReviewItem[] {
  const today = isoDay(now);
  const lent = new Set((s.loans ?? []).filter((l) => !l.returnedOn && l.copyId).map((l) => l.copyId!));
  const started = new Set(s.journeys.map((j) => j.gameId));
  const openIds = new Set(s.sessions.filter((x) => !x.endedAt).map((x) => x.journeyId));

  // 1. Histórias paradas: em andamento sem sessão há 60 dias, ou pausadas há 90.
  const paradas: ReviewItem[] = [];
  for (const j of s.journeys) {
    const g = s.games[j.gameId];
    if (!g || openIds.has(j.id)) continue;
    const hs = s.histories.filter((h) => h.journeyId === j.id).sort((a, b) => b.ordinal - a.ordinal);
    const h = hs[0];
    if (!h || (h.state !== 'ativa' && h.state !== 'pausada')) continue;
    const last = s.sessions.filter((x) => x.journeyId === j.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    const lastAt = Date.parse(last?.endedAt ?? last?.startedAt ?? h.startedAt);
    const idle = Math.floor((now - lastAt) / DAY);
    if (idle < (h.state === 'pausada' ? 90 : 60)) continue;
    paradas.push({ key: `parada:${h.id}`, kind: 'parada', game: g, history: h, journeyId: j.id, idleDays: idle, whereStopped: last?.whereStopped });
  }
  paradas.sort((a, b) => b.idleDays! - a.idleDays!);

  // 2. Estante: jogos seus, ao alcance, ainda sem Jornada (sem "não vou jogar" nem "não agora" valendo).
  const firstCopy = new Map<ID, string>();
  for (const c of s.copies) {
    if (lent.has(c.id) || !s.games[c.gameId] || started.has(c.gameId)) continue;
    const when = c.purchasedOn ?? c.createdAt?.slice(0, 10) ?? '9999';
    if (!firstCopy.has(c.gameId) || when < firstCopy.get(c.gameId)!) firstCopy.set(c.gameId, when);
  }
  const estante: ReviewItem[] = [...firstCopy].filter(([gid]) => {
    const m = s.myGames[gid];
    return !m?.wontPlay && !(m?.notNowUntil && m.notNowUntil > today);
  }).map(([gid, since]) => ({ key: `estante:${gid}`, kind: 'estante' as const, game: s.games[gid], since: since === '9999' ? undefined : since, priority: s.myGames[gid]?.priority }))
    // Prioridade alta por último (já foi escolhida); os mais antigos na estante primeiro.
    .sort((a, b) => Number(a.priority === 1) - Number(b.priority === 1) || (a.since ?? '9999').localeCompare(b.since ?? '9999'));

  // 3. Desejos lançados há mais de um ano que ainda não estão na coleção.
  const owned = new Set(s.copies.map((c) => c.gameId));
  const yearAgo = isoDay(now - 365 * DAY);
  const thisYear = Number(today.slice(0, 4));
  const desejos: ReviewItem[] = s.wishes.map((w) => s.games[w.gameId]).filter((g): g is Game => !!g && !owned.has(g.id) && !started.has(g.id))
    .filter((g) => (g.releasedOn ? g.releasedOn <= yearAgo : g.year != null && g.year < thisYear - 1))
    .map((g) => ({ key: `desejo:${g.id}`, kind: 'desejo' as const, game: g }));

  // Até 8 paradas, 9 da estante e 3 desejos; sobrando espaço, completa com o que tiver.
  const take = (xs: ReviewItem[], n: number) => xs.splice(0, n);
  const out = [...take(paradas, 8), ...take(estante, 9), ...take(desejos, 3)];
  for (const rest of [paradas, estante, desejos]) while (out.length < max && rest.length) out.push(rest.shift()!);
  return out.slice(0, max);
}

export type Draft = { quarter: string; decisions: Record<string, Decision> };

/** Resumo do que vai acontecer, agrupado. */
export function draftSummary(items: ReviewItem[], decisions: Record<string, Decision>) {
  const by = (ds: Decision[]) => items.filter((i) => ds.includes(decisions[i.key]));
  return {
    continua: by(['voltar', 'quero', 'alta']),
    depois: by(['pausar', 'depois']),
    deixou: by(['encerrar', 'deixar', 'tirar']),
    pulou: by(['pular']),
  };
}
