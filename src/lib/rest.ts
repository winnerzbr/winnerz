/**
 * "Jogar como descanso" (J6b): a intenção escolhida antes da sessão, se funcionou depois, e o resumo do mês.
 * Tudo sai do que a pessoa marcou; nada é inferido nem vira meta.
 */
import type { Game, ID, Session, State } from '../data/types';
import { parts } from './memory';

export type Intent = 'descansar' | 'divertir' | 'avancar' | 'desafio';
export type IntentMet = 'sim' | 'meio' | 'nao';
export const INTENTS: { id: Intent; label: string; ask: string; done: string }[] = [
  { id: 'descansar', label: 'Descansar', ask: 'Descansou?', done: 'para descansar' },
  { id: 'divertir', label: 'Me divertir', ask: 'Se divertiu?', done: 'para se divertir' },
  { id: 'avancar', label: 'Avançar na história', ask: 'Avançou?', done: 'para avançar' },
  { id: 'desafio', label: 'Um desafio', ask: 'Valeu o desafio?', done: 'por um desafio' },
];
export const MET: { id: IntentMet; label: string }[] = [
  { id: 'sim', label: 'Sim' },
  { id: 'meio', label: 'Mais ou menos' },
  { id: 'nao', label: 'Não' },
];
export const intentOf = (id?: string) => INTENTS.find((x) => x.id === id);
/** "Jogar só um pouco": fica guardado como o objetivo da sessão (no fim, a pergunta é se deu para parar na hora). */
export const POUCO = 'Jogar só um pouco';
export const metLabel = (id?: string) => MET.find((x) => x.id === id)?.label;

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const PERIODS = ['de madrugada', 'de manhã', 'à tarde', 'à noite'];
const SCORE: Record<IntentMet, number> = { sim: 2, meio: 1, nao: 0 };

/** "2026-10" do instante, no fuso de Brasília. */
export const monthKey = (iso: string) => { const p = parts(iso); return `${p.y}-${String(p.m).padStart(2, '0')}`; };
export const monthLabel = (key: string) => { const [y, m] = key.split('-').map(Number); return `${MONTHS[m - 1]} de ${y}`; };
export const prevMonthKey = (key: string) => { const [y, m] = key.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; };

export type RestGame = { game: Game; sessions: number; sim: number; nao: number };
export type MonthRest = {
  key: string;
  label: string;
  sessions: number;
  minutes: number;
  /** Sessões em que a pessoa marcou uma intenção. */
  withIntent: number;
  byIntent: { intent: Intent; label: string; count: number; sim: number; meio: number; nao: number; answered: number }[];
  /** Os jogos que mais descansaram (com pelo menos um "Sim"). */
  rested: RestGame[];
  /** Jogos em que "Descansar" não funcionou duas vezes ou mais, sem nenhum "Sim". Dito de leve. */
  notRest: RestGame[];
  /** O período do dia em que o descanso mais funciona (com 3 sessões de descanso respondidas ou mais). */
  bestPeriod: string | null;
  /** Minutos das sessões de descanso que funcionaram (só as com tempo). */
  restMinutes: number;
  feelings: { label: string; count: number }[];
};

const gameOf = (s: State, journeyId: ID) => { const j = s.journeys.find((x) => x.id === journeyId); return j ? s.games[j.gameId] : undefined; };

/** O mês de jogo pela intenção. */
export function monthRest(s: State, key: string): MonthRest {
  const xs = s.sessions.filter((x) => x.endedAt && monthKey(x.startedAt) === key);
  const withIntent = xs.filter((x) => x.intent);
  const byIntent = INTENTS.map((it) => {
    const these = withIntent.filter((x) => x.intent === it.id);
    const c = (m: IntentMet) => these.filter((x) => x.intentMet === m).length;
    return { intent: it.id, label: it.label, count: these.length, sim: c('sim'), meio: c('meio'), nao: c('nao'), answered: these.filter((x) => x.intentMet).length };
  }).filter((x) => x.count);
  const rest = withIntent.filter((x) => x.intent === 'descansar' && x.intentMet);
  const per = new Map<ID, RestGame & { score: number }>();
  for (const x of rest) {
    const g = gameOf(s, x.journeyId); if (!g) continue;
    const e = per.get(g.id) ?? { game: g, sessions: 0, sim: 0, nao: 0, score: 0 };
    e.sessions++; e.score += SCORE[x.intentMet!];
    if (x.intentMet === 'sim') e.sim++; if (x.intentMet === 'nao') e.nao++;
    per.set(g.id, e);
  }
  const all = [...per.values()];
  const rested = all.filter((e) => e.sim > 0).sort((a, b) => b.sim - a.sim || b.score / b.sessions - a.score / a.sessions).slice(0, 3);
  const notRest = all.filter((e) => e.sim === 0 && e.nao >= 2).sort((a, b) => b.nao - a.nao).slice(0, 2);
  let bestPeriod: string | null = null;
  if (rest.length >= 3) {
    const pp = [0, 1, 2, 3].map(() => ({ n: 0, sc: 0 }));
    for (const x of rest) { const h = parts(x.startedAt).h; const i = h < 6 ? 0 : h < 12 ? 1 : h < 18 ? 2 : 3; pp[i].n++; pp[i].sc += SCORE[x.intentMet!]; }
    const best = pp.map((p, i) => ({ i, n: p.n, avg: p.n ? p.sc / p.n : -1 })).filter((p) => p.n >= 2).sort((a, b) => b.avg - a.avg || b.n - a.n)[0];
    if (best && best.avg >= 1.5) bestPeriod = PERIODS[best.i];
  }
  const fl = new Map<string, number>();
  for (const x of xs) if (x.feeling) fl.set(x.feeling, (fl.get(x.feeling) ?? 0) + 1);
  return {
    key, label: monthLabel(key), sessions: xs.length, minutes: xs.reduce((a, x) => a + (x.minutes ?? 0), 0),
    withIntent: withIntent.length, byIntent, rested: rested.map(({ score: _s, ...e }) => e), notRest: notRest.map(({ score: _s, ...e }) => e), bestPeriod,
    restMinutes: rest.filter((x) => x.intentMet === 'sim').reduce((a, x) => a + (x.minutes ?? 0), 0),
    feelings: [...fl].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
  };
}

/** Meses com alguma intenção marcada, do mais recente ao mais antigo (sempre inclui o mês atual). */
export function restMonths(s: State, now = new Date().toISOString()): string[] {
  const keys = new Set<string>([monthKey(now)]);
  for (const x of s.sessions) if (x.intent && x.endedAt) keys.add(monthKey(x.startedAt));
  return [...keys].sort().reverse();
}

/** Jogos que costumam descansar a pessoa (todas as sessões, não só do mês), para o "O que jogar". */
export function restfulGames(sessions: Session[], gameOfJourney: (journeyId: ID) => ID | undefined): Map<ID, number> {
  const out = new Map<ID, number>();
  for (const x of sessions) {
    if (x.intent !== 'descansar' || !x.intentMet) continue;
    const g = gameOfJourney(x.journeyId); if (!g) continue;
    out.set(g, (out.get(g) ?? 0) + SCORE[x.intentMet] - 1);
  }
  return out;
}
