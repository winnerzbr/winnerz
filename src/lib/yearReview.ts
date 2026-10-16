/**
 * "Seu ano no WinnerZ": a retrospectiva do ano, só com o que a pessoa registrou. Horas só as informadas nas
 * sessões (nunca estimadas), datas só as exatas. Sem React e sem a store, para testar.
 */
import type { Game, ID, State, TimelineEvent } from '../data/types';
import { seasonStats, type Season, type SeasonStats } from './seasons';

const TZ = 'America/Sao_Paulo';
const ymd = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
const parts = (iso: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'numeric', weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), h: Number(p.hour) };
};

export const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export type DayPart = 'madrugada' | 'manhã' | 'tarde' | 'noite';
const dayPart = (h: number): DayPart => (h < 6 ? 'madrugada' : h < 12 ? 'manhã' : h < 18 ? 'tarde' : 'noite');

export type YearReview = SeasonStats & {
  year: number;
  /** O ano ainda não acabou: a retrospectiva é "até agora". */
  partial: boolean;
  months: number[];
  weekday?: { day: number; sessions: number };
  part?: { part: DayPart; sessions: number };
  streak: number;
  longest?: { game: Game; minutes: number; at: string };
  allMoments: number;
  quote?: { text: string; game: Game; at: string };
  setAside: { game: Game; state: 'pausada' | 'dropada' }[];
  copies: number;
  replays: Game[];
};

export function yearReview(s: State, year: number, now = new Date()): YearReview {
  const season: Season = { id: `ano-${year}`, name: String(year), from: `${year}-01-01`, to: `${year}-12-31`, auto: true };
  const base = seasonStats(s, season);
  const gameOf = (journeyId: ID) => { const j = s.journeys.find((x) => x.id === journeyId); return j ? s.games[j.gameId] : undefined; };
  const inYear = (iso?: string) => !!iso && ymd(iso).startsWith(`${year}-`);
  const ses = s.sessions.filter((x) => x.endedAt && inYear(x.startedAt));
  const months = Array.from({ length: 12 }, () => 0);
  const wd = Array.from({ length: 7 }, () => 0);
  const dp = new Map<DayPart, number>();
  for (const x of ses) { const p = parts(x.startedAt); months[p.m - 1] += 1; wd[p.wd] += 1; dp.set(dayPart(p.h), (dp.get(dayPart(p.h)) ?? 0) + 1); }
  const bestWd = wd.reduce((b, n, i) => (n > wd[b] ? i : b), 0);
  const bestDp = [...dp].sort((a, b) => b[1] - a[1])[0];
  // Maior sequência de dias seguidos com sessão.
  const days = [...new Set(ses.map((x) => ymd(x.startedAt)))].sort();
  let streak = days.length ? 1 : 0, run = 1;
  for (let i = 1; i < days.length; i++) {
    const gap = (Date.parse(`${days[i]}T12:00:00Z`) - Date.parse(`${days[i - 1]}T12:00:00Z`)) / 86_400_000;
    run = gap === 1 ? run + 1 : 1; streak = Math.max(streak, run);
  }
  const longestS = ses.filter((x) => x.minutes).sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0))[0];
  const longestG = longestS ? gameOf(longestS.journeyId) : undefined;
  const exact = (e: TimelineEvent) => !e.precision || e.precision === 'dia';
  const moms = s.events.filter((e) => e.kind === 'momento' && exact(e) && inYear(e.at));
  const quoted = moms.filter((e) => e.quote && e.quote.length >= 8).sort((a, b) => Number(a.quote!.length > 140) - Number(b.quote!.length > 140) || b.at.localeCompare(a.at))[0];
  const qGame = quoted ? gameOf(quoted.journeyId) : undefined;
  // Deixou de lado sem culpa: Histórias pausadas ou largadas que tiveram sessão no ano.
  const touched = new Set(ses.map((x) => x.historyId));
  const setAside = s.histories.filter((h) => (h.state === 'pausada' || h.state === 'dropada') && touched.has(h.id))
    .map((h) => ({ game: gameOf(h.journeyId)!, state: h.state as 'pausada' | 'dropada' })).filter((x) => x.game);
  const replays = s.histories.filter((h) => h.ordinal > 1 && h.startedPrecision !== 'desconhecida' && inYear(h.startedAt)).map((h) => gameOf(h.journeyId)).filter((g): g is Game => !!g);
  const lastDay = `${year}-12-31`;
  return {
    ...base, year, partial: ymd(now.toISOString()) < lastDay,
    months, weekday: ses.length >= 5 ? { day: bestWd, sessions: wd[bestWd] } : undefined,
    part: ses.length >= 5 && bestDp ? { part: bestDp[0], sessions: bestDp[1] } : undefined,
    streak, longest: longestS && longestG ? { game: longestG, minutes: longestS.minutes!, at: longestS.startedAt } : undefined,
    allMoments: moms.length,
    quote: quoted && qGame ? { text: quoted.quote!, game: qGame, at: quoted.at } : undefined,
    setAside, copies: s.copies.filter((c) => inYear(c.createdAt)).length, replays,
  };
}

/** Os anos que têm alguma coisa registrada (mais recente primeiro), sempre com o ano de agora. */
export function reviewYears(s: State, now = new Date()): number[] {
  const ys = new Set<number>([Number(ymd(now.toISOString()).slice(0, 4))]);
  for (const x of s.sessions) if (x.endedAt) ys.add(Number(ymd(x.startedAt).slice(0, 4)));
  for (const h of s.histories) if (h.completedAt && h.completedPrecision !== 'desconhecida') ys.add(Number(ymd(h.completedAt).slice(0, 4)));
  return [...ys].filter((y) => y > 1990).sort((a, b) => b - a);
}
