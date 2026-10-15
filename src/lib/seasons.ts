/**
 * Temporadas pessoais (J6): as estações do ano no Brasil viram temporadas automáticas, e a pessoa pode criar as suas
 * ("Férias retrô, 15 dez a 31 jan"). A retrospectiva sai só do que foi registrado: horas só as informadas.
 */
import type { Game, ID, State, TimelineEvent } from '../data/types';

export type Season = { id: string; name: string; from: string; to: string; auto: boolean };
export type CustomSeason = { id: string; name: string; from: string; to: string };

const TZ = 'America/Sao_Paulo';
const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const pad = (n: number) => String(n).padStart(2, '0');

/** As quatro estações (hemisfério sul), com as datas de sempre (os dias exatos variam um pouco a cada ano). */
function seasonFor(day: string): Season {
  const [y, m, d] = day.split('-').map(Number);
  const md = m * 100 + d;
  if (md >= 1221) return { id: `verao-${y}`, name: `Verão ${y}/${String(y + 1).slice(2)}`, from: `${y}-12-21`, to: `${y + 1}-03-19`, auto: true };
  if (md <= 319) return { id: `verao-${y - 1}`, name: `Verão ${y - 1}/${String(y).slice(2)}`, from: `${y - 1}-12-21`, to: `${y}-03-19`, auto: true };
  if (md <= 620) return { id: `outono-${y}`, name: `Outono ${y}`, from: `${y}-03-20`, to: `${y}-06-20`, auto: true };
  if (md <= 921) return { id: `inverno-${y}`, name: `Inverno ${y}`, from: `${y}-06-21`, to: `${y}-09-21`, auto: true };
  return { id: `primavera-${y}`, name: `Primavera ${y}`, from: `${y}-09-22`, to: `${y}-12-20`, auto: true };
}

/** A temporada de agora e as anteriores (mais recente primeiro). */
export function autoSeasons(now = new Date(), count = 5): Season[] {
  const out: Season[] = [];
  let day = ymd(now);
  for (let i = 0; i < count; i++) {
    const s = seasonFor(day);
    out.push(s);
    const prev = new Date(`${s.from}T12:00:00Z`); prev.setUTCDate(prev.getUTCDate() - 1);
    day = `${prev.getUTCFullYear()}-${pad(prev.getUTCMonth() + 1)}-${pad(prev.getUTCDate())}`;
  }
  return out;
}

export function seasonById(id: string, custom: CustomSeason[] = [], now = new Date()): Season | null {
  const c = custom.find((x) => x.id === id);
  if (c) return { ...c, auto: false };
  const m = /^(verao|outono|inverno|primavera)-(\d{4})$/.exec(id);
  if (!m) return null;
  const y = Number(m[2]);
  const probe = m[1] === 'verao' ? `${y}-12-25` : m[1] === 'outono' ? `${y}-05-01` : m[1] === 'inverno' ? `${y}-08-01` : `${y}-11-01`;
  const s = seasonFor(probe);
  return s.from <= ymd(now) ? s : null;
}

const inRange = (iso: string | undefined, s: Season) => { if (!iso) return false; const d = ymd(new Date(iso)); return d >= s.from && d <= s.to; };

export type SeasonStats = {
  sessions: number; minutes: number; informed: number; days: number;
  games: { game: Game; sessions: number; minutes: number }[];
  top?: { game: Game; sessions: number; minutes: number };
  done: { game: Game; at: string }[];
  started: Game[];
  moments: TimelineEvent[];
  companions: { name: string; sessions: number }[];
  first?: { game: Game; at: string }; last?: { game: Game; at: string };
};

export function seasonStats(s: State, season: Season): SeasonStats {
  const gameOf = (journeyId: ID) => { const j = s.journeys.find((x) => x.id === journeyId); return j ? s.games[j.gameId] : undefined; };
  const ses = s.sessions.filter((x) => x.endedAt && inRange(x.startedAt, season)).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const byGame = new Map<string, { game: Game; sessions: number; minutes: number }>();
  for (const x of ses) {
    const g = gameOf(x.journeyId); if (!g) continue;
    const cur = byGame.get(g.id) ?? { game: g, sessions: 0, minutes: 0 };
    cur.sessions += 1; cur.minutes += x.minutes ?? 0; byGame.set(g.id, cur);
  }
  const games = [...byGame.values()].sort((a, b) => b.minutes - a.minutes || b.sessions - a.sessions);
  const done = s.histories.filter((h) => h.state === 'concluida' && h.completedPrecision !== 'desconhecida' && h.completedPrecision !== 'ano' && inRange(h.completedAt, season))
    .map((h) => ({ game: gameOf(h.journeyId)!, at: h.completedAt! })).filter((x) => x.game).sort((a, b) => a.at.localeCompare(b.at));
  const started = s.histories.filter((h) => h.ordinal === 1 && h.startedPrecision !== 'desconhecida' && inRange(h.startedAt, season)).map((h) => gameOf(h.journeyId)).filter((g): g is Game => !!g);
  const moments = s.events.filter((e) => e.kind === 'momento' && e.image && (!e.precision || e.precision === 'dia') && inRange(e.at, season)).sort((a, b) => a.at.localeCompare(b.at));
  const who = new Map<string, number>();
  for (const x of ses) for (const c of x.companions ?? []) who.set(c, (who.get(c) ?? 0) + 1);
  const firstG = ses[0] ? gameOf(ses[0].journeyId) : undefined, lastS = ses.at(-1), lastG = lastS ? gameOf(lastS.journeyId) : undefined;
  return {
    sessions: ses.length,
    minutes: ses.reduce((a, x) => a + (x.minutes ?? 0), 0),
    informed: ses.filter((x) => x.minutes).length,
    days: new Set(ses.map((x) => ymd(new Date(x.startedAt)))).size,
    games, top: games[0], done, started, moments: moments.slice(-12),
    companions: [...who].map(([name, sessions]) => ({ name, sessions })).sort((a, b) => b.sessions - a.sessions).slice(0, 5),
    first: firstG && ses[0] ? { game: firstG, at: ses[0].startedAt } : undefined,
    last: lastG && lastS ? { game: lastG, at: lastS.startedAt } : undefined,
  };
}

/** "15 dez – 31 jan" (com o ano quando não é o de agora). */
export function seasonRange(s: Season, now = new Date()): string {
  const M = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const f = (d: string) => { const [y, m, dd] = d.split('-').map(Number); return `${dd} ${M[m - 1]}${y !== now.getFullYear() ? ` ${y}` : ''}`; };
  return `${f(s.from)} – ${f(s.to)}`;
}
