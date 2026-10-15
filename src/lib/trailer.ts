/**
 * Trailer da História (J7): o roteiro do vídeo, montado só com o que a pessoa registrou.
 * Abertura, números, capítulos, momentos (fotos), com quem jogou e o fechamento. Sem React, para testar.
 */
import type { Game, ID, State } from '../data/types';
import { buildTimeline, type ChapterItem } from './chapters';

export type Scene =
  | { kind: 'intro'; dur: number; title: string; sub: string; image?: string }
  | { kind: 'stats'; dur: number; lines: [string, string][]; image?: string }
  | { kind: 'chapter'; dur: number; n: number; name: string; line: string; image?: string }
  | { kind: 'moment'; dur: number; image: string; caption: string; when: string }
  | { kind: 'people'; dur: number; names: string[]; image?: string }
  | { kind: 'end'; dur: number; done: boolean; title: string; when: string; image?: string };

const M = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const TZ = 'America/Sao_Paulo';
const day = (iso: string) => { const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)).split('-').map(Number); return { y, m, d }; };
const dm = (iso: string) => { const x = day(iso); return `${x.d} ${M[x.m - 1]}`; };
const dmy = (iso: string) => { const x = day(iso); return `${x.d} ${M[x.m - 1]} ${x.y}`; };
const hrs = (m: number) => (m < 60 ? `${m} min` : `${Math.round(m / 6) / 10} h`.replace('.', ','));
const firstSentence = (t: string) => (t.split(/(?<=[.!?])\s/)[0] ?? t).slice(0, 120);

export function planTrailer(s: State, historyId: ID, game: Game, images: string[] = []): Scene[] {
  const h = s.histories.find((x) => x.id === historyId);
  if (!h) return [];
  const pics = images.length ? images : [game.backdrop, game.cover].filter((x): x is string => !!x);
  const pic = (i: number) => pics[i % Math.max(1, pics.length)];
  const events = s.events.filter((e) => e.historyId === historyId);
  const sessions = s.sessions.filter((x) => x.historyId === historyId && x.endedAt);
  const items = buildTimeline({ events, sessions: s.sessions, allEvents: [], gameTitleOf: () => undefined, journeyId: h.journeyId, today: false });
  const chapters = items.filter((x): x is ChapterItem => x.type === 'chapter');
  const minutes = sessions.reduce((a, x) => a + (x.minutes ?? 0), 0);
  const moments = events.filter((e) => e.kind === 'momento' && e.image).sort((a, b) => a.at.localeCompare(b.at));
  const companions = [...new Set(sessions.flatMap((x) => x.companions ?? []))];
  const done = h.state === 'concluida';
  const end = done && h.completedAt ? h.completedAt : sessions.at(-1)?.endedAt ?? new Date().toISOString();
  const out: Scene[] = [];
  out.push({ kind: 'intro', dur: 3.6, title: game.title, sub: `${h.ordinal > 1 ? `${h.title} · ` : 'A sua História · '}${dm(h.startedAt)} – ${dm(end)}`, image: pic(0) });
  const lines: [string, string][] = [];
  if (sessions.length) lines.push([String(sessions.length), sessions.length === 1 ? 'sessão' : 'sessões']);
  if (minutes) lines.push([hrs(minutes), 'jogadas']);
  const nMom = events.filter((e) => e.kind === 'momento').length;
  if (nMom) lines.push([String(nMom), nMom === 1 ? 'momento' : 'momentos']);
  const days = Math.max(1, Math.round((Date.parse(end) - Date.parse(h.startedAt)) / 86_400_000));
  if (h.startedPrecision !== 'desconhecida') lines.push([String(days), days === 1 ? 'dia' : 'dias']);
  if (lines.length) out.push({ kind: 'stats', dur: 3.4, lines: lines.slice(0, 4), image: pic(1) });
  chapters.slice(0, 5).forEach((c, i) => out.push({ kind: 'chapter', dur: 3, n: c.n, name: c.name, line: firstSentence(c.summary), image: pic(i + 2) }));
  moments.slice(-6).forEach((e) => out.push({ kind: 'moment', dur: 2.6, image: e.image!, caption: e.quote ? `“${e.quote}”` : e.title, when: dm(e.at) }));
  if (companions.length) out.push({ kind: 'people', dur: 2.6, names: companions.slice(0, 4), image: pic(chapters.length + 2) });
  out.push({ kind: 'end', dur: 4.2, done, title: game.title, when: done ? `Zerado em ${dmy(end)}` : `Até agora · ${dmy(end)}`, image: pic(0) });
  return out;
}

export const trailerLength = (scenes: Scene[]) => scenes.reduce((a, x) => a + x.dur, 0);
