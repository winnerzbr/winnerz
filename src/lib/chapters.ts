/**
 * Linha do tempo da Jornada em capítulos: a História dividida pelas pausas longas, com um resumo escrito
 * só com o que a pessoa registrou, os silêncios entre um capítulo e outro, lembranças do mesmo dia em
 * anos anteriores e o "Hoje" no fim. Sem React e sem a store, para testar.
 */
import type { OutlinePart, PartLogEntry } from './outline';
import type { DatePrecision, ID, Session, TimelineEvent } from '../data/types';

export const SILENCE_DAYS = 7;
export const MAX_SESSIONS_PER_CHAPTER = 8;
const DAY = 86_400_000;
const TZ = 'America/Sao_Paulo';

export type ChapterItem = { type: 'chapter'; id: string; n: number; name: string; from: string; to: string; summary: string; image?: string; historyId: ID; sessions: number; minutes: number };
export type EventItem = { type: 'event'; id: string; e: TimelineEvent; session?: Session; chapter: number };
export type SilenceItem = { type: 'silence'; id: string; days: number; from: string; to: string; meanwhile: string[]; chapter: number };
export type MemoryItem = { type: 'memory'; id: string; e: TimelineEvent; years: number; gameTitle: string };
export type TodayItem = { type: 'today'; id: 'hoje' };
/** Registro de um amigo no mesmo jogo, ancorado no progresso (só até onde você está). */
export type Echo = { id: string; handle: string; avatar?: string | null; kind: 'inicio' | 'momento' | 'marco'; at: string; title: string; legend?: string | null; image?: string | null; progress: number };
export type EchoItem = { type: 'echo'; id: string; echo: Echo; chapter: number };
/** Números de todo mundo que jogou (sem nomes, só a partir de 5 pessoas). */
export type Compare = { players: number; enough: boolean; playing?: number | null; done?: number; doneSessions?: number | null; doneHours?: number | null; paused?: number; pauseBuckets?: { from: number; count: number }[] };
export type CompareItem = { type: 'compare'; id: 'comparar'; data: Compare; mine?: number };
/** O que você escreveu na comunidade sobre o jogo (postagem ou resposta), na data em que escreveu. */
export type Talk = { id: string; kind: 'postagem' | 'resposta'; title: string; excerpt?: string | null; spoiler?: boolean; at: string; place: string; link: string; replies?: number };
export type TalkItem = { type: 'talk'; id: string; talk: Talk; chapter: number };
/** Um capítulo do jogo (da lista da comunidade ou do rascunho da IA): passado (com a data), atual ou à frente. */
export type GamePartItem = { type: 'gpart'; id: string; part: OutlinePart; n: number; total: number; state: 'passou' | 'atual' | 'frente'; at?: string; src?: 'voce' | 'steam' | 'ra'; more?: number; chapter: number };
/** S3 · Abertura de um capítulo (missão, fase…) do jogo na linha do tempo "Por capítulo", com o que você fez nele. */
export type PartOpenItem = { type: 'popen'; id: string; part: OutlinePart; n: number; total: number; state: 'passou' | 'atual' | 'antes'; from?: string; to?: string; sessions: number; minutes: number; moments: number; summary: string; chapter: number };
export type TLItem = ChapterItem | EventItem | SilenceItem | MemoryItem | TodayItem | EchoItem | CompareItem | TalkItem | GamePartItem | PartOpenItem;

export type BuildInput = {
  /** Registros da História (ou das Histórias) mostrada, em qualquer ordem. */
  events: TimelineEvent[];
  sessions: Session[];
  /** Todos os registros da pessoa (para o "enquanto isso" e as lembranças). */
  allEvents: TimelineEvent[];
  gameTitleOf: (journeyId: ID) => string | undefined;
  journeyId: ID;
  /** Fecha a faixa com o "Hoje" (a História mostrada está em andamento). */
  today: boolean;
  now?: number;
};

const datable = (p?: DatePrecision) => !p || p === 'dia';
const periodOf = (iso: string) => { const h = Number(new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', hour12: false, timeZone: TZ }).slice(0, 2)); return h < 6 ? 'de madrugada' : h < 12 ? 'de manhã' : h < 18 ? 'à tarde' : 'à noite'; };
const mdOf = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ }).slice(5);
const yearOf = (iso: string) => Number(new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ }).slice(0, 4));
const NUM = ['nenhum', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];
const NUMF = ['nenhuma', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];
const count = (n: number, one: string, many: string, fem = false) => `${n <= 10 ? (fem ? NUMF : NUM)[n] : n} ${n === 1 ? one : many}`;
export const durText = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, '0')}` : ''}`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** O resumo do capítulo: só fatos registrados, em frases curtas. */
export function summarize(evs: TimelineEvent[], sessionOf: (id?: ID) => Session | undefined): { text: string; sessions: number; minutes: number; where?: string } {
  const sess = evs.filter((e) => e.kind === 'sessao');
  const ss = sess.map((e) => sessionOf(e.sessionId)).filter((x): x is Session => !!x);
  const minutes = ss.reduce((a, x) => a + (x.minutes ?? 0), 0);
  const moments = evs.filter((e) => e.kind === 'momento').length;
  const points = evs.filter((e) => e.kind === 'ponto').length;
  const where = [...ss].reverse().find((x) => x.whereStopped)?.whereStopped;
  const periods = ss.map((x) => periodOf(x.startedAt));
  const top = periods.length >= 2 ? [...new Set(periods)].map((p) => [p, periods.filter((x) => x === p).length] as const).sort((a, b) => b[1] - a[1])[0] : null;
  const bits: string[] = [];
  // Sessões contadas de uma vez (um registro "23 sessões" sem sessão própria) entram pelo que dizem.
  const lump = sess.filter((e) => !sessionOf(e.sessionId));
  for (const e of lump) bits.push(`${cap(e.title)}${e.dateLabel ? ` (${e.dateLabel})` : ''}.`);
  if (ss.length) {
    let s1 = cap(count(ss.length, 'sessão', 'sessões', true));
    if (minutes) s1 += `, ${durText(minutes)} no total`;
    if (top && top[1] >= Math.ceil(periods.length * 0.6)) s1 += `, ${top[1] === periods.length ? 'sempre' : 'quase sempre'} ${top[0]}`;
    bits.push(s1 + '.');
  }
  const kept = [moments ? count(moments, 'momento guardado', 'momentos guardados') : '', points ? count(points, 'lugar marcado para voltar', 'lugares marcados para voltar') : ''].filter(Boolean);
  if (kept.length) bits.push(cap(kept.join(' e ')) + '.');
  if (evs.some((e) => e.kind === 'carta')) bits.push(evs.some((e) => e.kind === 'marco' && /^Zerou/.test(e.title)) ? 'Uma carta escrita para o fim.' : 'Uma carta lacrada para o fim.');
  const goals = ss.filter((x) => x.goal);
  if (goals.length) { const hit = goals.filter((x) => x.goalDone === 'sim').length; bits.push(goals.length === 1 ? (hit ? 'Cumpriu o objetivo da sessão.' : 'Uma sessão com objetivo.') : `Cumpriu ${hit} de ${goals.length} objetivos de sessão.`); }
  if (where) bits.push(`Você parou em ${where}.`);
  const feel = ss.map((x) => x.feeling).filter(Boolean);
  if (feel.length >= 2 && feel.every((f) => f === feel[0])) bits.push(`Nas sessões, você disse “${feel[0]!.toLowerCase()}”.`);
  if (!bits.length) bits.push(evs.length === 1 ? 'Um registro.' : `${cap(count(evs.length, 'registro', 'registros'))}.`);
  return { text: bits.join(' '), sessions: ss.length, minutes, where };
}

/** O que você fez nos outros jogos durante o silêncio (no máximo três linhas). */
export function meanwhile(all: TimelineEvent[], journeyId: ID, from: string, to: string, titleOf: (j: ID) => string | undefined): string[] {
  const inside = all.filter((e) => e.journeyId !== journeyId && datable(e.precision) && e.at > from && e.at < to);
  const byGame = new Map<ID, TimelineEvent[]>();
  for (const e of inside) byGame.set(e.journeyId, [...(byGame.get(e.journeyId) ?? []), e]);
  const out: string[] = [];
  for (const [j, evs] of [...byGame].sort((a, b) => b[1].length - a[1].length)) {
    const t = titleOf(j);
    if (!t) continue;
    const zerou = evs.find((e) => e.kind === 'marco' && /^Zerou/.test(e.title));
    const n = evs.filter((e) => e.kind === 'sessao').length;
    out.push(zerou ? `Você zerou ${t}` : n ? `${count(n, 'sessão', 'sessões', true).replace(/^./, (c) => c.toUpperCase())} de ${t}` : `Registros em ${t}`);
    if (out.length === 3) break;
  }
  return out;
}

/** Monta a faixa: capítulos, registros, silêncios, lembranças e o "Hoje". */
export function buildTimeline(inp: BuildInput): TLItem[] {
  const now = inp.now ?? Date.now();
  const evs = [...inp.events].sort((a, b) => a.at.localeCompare(b.at));
  const sessionOf = (id?: ID) => (id ? inp.sessions.find((x) => x.id === id) : undefined);
  const out: TLItem[] = [];
  let chapter: { item: ChapterItem; evs: TimelineEvent[] } | null = null;
  let n = 0;
  const close = () => {
    if (!chapter) return;
    const sm = summarize(chapter.evs, sessionOf);
    const firstMoment = chapter.evs.find((e) => e.kind === 'momento')?.title;
    chapter.item.summary = sm.text;
    chapter.item.sessions = sm.sessions;
    chapter.item.minutes = sm.minutes;
    chapter.item.name = sm.where ?? firstMoment ?? (chapter.item.n === 1 ? 'O começo' : chapter.evs[0]?.title ?? `Capítulo ${chapter.item.n}`);
    chapter.item.to = chapter.evs.at(-1)?.at ?? chapter.item.from;
    chapter.item.image = [...chapter.evs].reverse().find((e) => e.image)?.image;
  };
  const open = (e: TimelineEvent) => {
    close();
    n += 1;
    const item: ChapterItem = { type: 'chapter', id: `cap-${e.id}`, n, name: '', from: e.at, to: e.at, summary: '', historyId: e.historyId, sessions: 0, minutes: 0 };
    out.push(item);
    chapter = { item, evs: [] };
  };
  let prev: TimelineEvent | null = null;
  for (const e of evs) {
    let fresh = !chapter || (prev && prev.historyId !== e.historyId);
    if (prev && datable(prev.precision) && datable(e.precision)) {
      const days = Math.floor((Date.parse(e.at) - Date.parse(prev.at)) / DAY);
      if (days >= SILENCE_DAYS && prev.historyId === e.historyId) {
        out.push({ type: 'silence', id: `sil-${e.id}`, days, from: prev.at, to: e.at, meanwhile: meanwhile(inp.allEvents, inp.journeyId, prev.at, e.at, inp.gameTitleOf), chapter: n });
        fresh = true;
      }
    }
    const c = chapter as { item: ChapterItem; evs: TimelineEvent[] } | null;
    if (!fresh && e.kind === 'sessao' && c && c.evs.filter((x) => x.kind === 'sessao').length >= MAX_SESSIONS_PER_CHAPTER) fresh = true;
    if (fresh) open(e);
    (chapter as unknown as { evs: TimelineEvent[] }).evs.push(e);
    out.push({ type: 'event', id: e.id, e, session: sessionOf(e.sessionId), chapter: n });
    prev = e;
  }
  close();
  if (inp.today) {
    // Silêncio até hoje, quando a última vez já vai longe.
    const last = [...evs].reverse().find((e) => datable(e.precision));
    if (last) {
      const days = Math.floor((now - Date.parse(last.at)) / DAY);
      if (days >= SILENCE_DAYS) out.push({ type: 'silence', id: 'sil-hoje', days, from: last.at, to: new Date(now).toISOString(), meanwhile: meanwhile(inp.allEvents, inp.journeyId, last.at, new Date(now).toISOString(), inp.gameTitleOf), chapter: n });
    }
    // Lembranças: o que você registrou neste mesmo dia em anos anteriores (em qualquer jogo).
    const md = mdOf(new Date(now).toISOString()), y = yearOf(new Date(now).toISOString());
    const mem = inp.allEvents.filter((e) => datable(e.precision) && (e.quote || e.image || e.kind === 'inicio' || e.kind === 'marco') && mdOf(e.at) === md && yearOf(e.at) < y)
      .sort((a, b) => b.at.localeCompare(a.at)).slice(0, 2);
    for (const e of mem) {
      const t = inp.gameTitleOf(e.journeyId);
      if (t) out.push({ type: 'memory', id: `mem-${e.id}`, e, years: y - yearOf(e.at), gameTitle: t });
    }
    out.push({ type: 'today', id: 'hoje' });
  }
  return out;
}

/** O capítulo de cada item (para a luz ambiente e a régua). */
export function chapterOf(items: TLItem[], i: number): ChapterItem | null {
  for (let k = Math.min(i, items.length - 1); k >= 0; k--) { const it = items[k]; if (it?.type === 'chapter') return it; }
  return null;
}

/**
 * Costura os ecos dos amigos na faixa. Cada registro seu ganha o progresso da sessão dele (ou o último informado
 * antes, na mesma História); o eco entra antes do primeiro registro seu que já passou daquele ponto. Sem nenhum
 * progresso seu, os ecos ficam juntos antes do fim. A comparação anônima entra logo antes do "Hoje".
 */
export function weaveEchoes(items: TLItem[], echoes: Echo[], compare?: CompareItem | null): TLItem[] {
  const queue = [...echoes].sort((a, b) => a.progress - b.progress || a.at.localeCompare(b.at));
  const out: TLItem[] = [];
  const last = new Map<ID, number>();
  let chapter = 0;
  const flush = (upto: number) => { while (queue.length && queue[0].progress < upto) { const e = queue.shift()!; out.push({ type: 'echo', id: `eco-${e.id}`, echo: e, chapter }); } };
  for (const it of items) {
    if (it.type === 'chapter') chapter = it.n;
    if (it.type === 'event') {
      const own = it.session?.progress;
      const anchor = own ?? last.get(it.e.historyId);
      if (own != null) last.set(it.e.historyId, own);
      if (anchor != null) flush(anchor);
    }
    if (it.type === 'memory' || it.type === 'today') { flush(Infinity); if (it.type === 'today' && compare) out.push(compare); }
    out.push(it);
  }
  flush(Infinity);
  if (compare && !out.includes(compare)) out.push(compare);
  return out;
}

/** As frases da comparação anônima, só com o que os números dizem. */
export function compareLines(c: Compare, mine?: number): string[] {
  const out: string[] = [];
  const b = [...(c.pauseBuckets ?? [])].sort((x, y) => y.count - x.count)[0];
  if (b && (c.paused ?? 0) >= 5) {
    const share = Math.round((b.count / (c.paused ?? 1)) * 10);
    out.push(`Muita gente pausa entre ${b.from}% e ${b.from + 10}%${share >= 2 ? `: ${share} em cada 10 que pararam, pararam aí` : ''}.`);
    if (mine != null && mine >= b.from && mine < b.from + 10) out.push('Você está bem nesse trecho. Se der vontade de parar, não é só com você.');
    else if (mine != null && mine < b.from) out.push('Você ainda não chegou nesse trecho.');
  }
  if (c.doneSessions || c.doneHours) out.push(`Quem zerou levou, em geral, ${[c.doneSessions ? `${c.doneSessions} ${c.doneSessions === 1 ? 'sessão' : 'sessões'}` : '', c.doneHours ? `cerca de ${c.doneHours} h` : ''].filter(Boolean).join(', ')}.`);
  if (c.done != null && c.done > 0) out.push(`${c.done} de ${c.players} ${c.players === 1 ? 'pessoa zerou' : 'pessoas zeraram'}.`);
  if (c.playing) out.push(`${c.playing} ${c.playing === 1 ? 'pessoa está jogando' : 'pessoas estão jogando'} agora.`);
  return out;
}

/**
 * Costura as suas conversas sobre o jogo na faixa, pela data: cada uma entra antes do primeiro registro seu que
 * veio depois dela. As que vêm depois do último registro ficam antes das lembranças e do "Hoje".
 */
export function weaveTalks(items: TLItem[], talks: Talk[]): TLItem[] {
  if (!talks.length) return items;
  const queue = [...talks].sort((a, b) => a.at.localeCompare(b.at));
  const out: TLItem[] = [];
  let chapter = 0;
  const flush = (before: string | null) => { while (queue.length && (before == null || queue[0].at < before)) { const t = queue.shift()!; out.push({ type: 'talk', id: `talk-${t.id}`, talk: t, chapter }); } };
  for (const it of items) {
    if (it.type === 'event' && datable(it.e.precision)) flush(it.e.at);
    if (it.type === 'memory' || it.type === 'today' || it.type === 'compare') flush(null);
    if (it.type === 'chapter') { flush(it.from); chapter = it.n; }
    out.push(it);
  }
  flush(null);
  return out;
}

/**
 * Põe os capítulos do jogo na linha do tempo: os que a pessoa já alcançou entram na data em que chegou (entre os
 * registros); os que vêm depois aparecem depois do "Hoje", apagados (até 6; o último diz quantos faltam).
 */
export function weaveParts(items: TLItem[], rows: { part: OutlinePart; n: number; total: number; state: 'passou' | 'atual' | 'frente'; at?: string; src?: 'voce' | 'steam' | 'ra' }[]): TLItem[] {
  if (!rows.length) return items;
  const dated = rows.filter((r) => r.state !== 'frente' && r.at).sort((a, b) => a.at!.localeCompare(b.at!));
  const ahead = rows.filter((r) => r.state === 'frente');
  const out: TLItem[] = [];
  let chapter = 0;
  const mk = (r: (typeof rows)[number], more?: number): GamePartItem => ({ type: 'gpart', id: `gp-${r.part.id}`, part: r.part, n: r.n, total: r.total, state: r.state, at: r.at, src: r.src, more, chapter });
  const flush = (before: string | null) => { while (dated.length && (before == null || dated[0].at! < before)) out.push(mk(dated.shift()!)); };
  let today = false;
  for (const it of items) {
    if (it.type === 'event' && datable(it.e.precision)) flush(it.e.at);
    if (it.type === 'chapter') { flush(it.from); chapter = it.n; }
    if (it.type === 'today' || it.type === 'compare') flush(null);
    out.push(it);
    if (it.type === 'today') {
      today = true;
      const shown = ahead.slice(0, 6);
      shown.forEach((r, i) => out.push(mk(r, i === shown.length - 1 && ahead.length > shown.length ? ahead.length - shown.length : undefined)));
    }
  }
  flush(null);
  return today ? out : out.filter((x) => x.type !== 'gpart' || x.state !== 'frente');
}

/**
 * S3 · A linha do tempo "Por capítulo": os capítulos do jogo viram as divisões. Cada registro vai para o capítulo em
 * que você estava naquela hora (o começo marcado na sessão ou a última chegada antes dele); o que veio antes da
 * primeira marca fica em "Antes de marcar". O "Hoje" fecha o capítulo atual, e os que vêm depois aparecem à frente,
 * apagados (até 6). Os outros painéis (silêncios, ecos, conversas) vão para o capítulo do registro seguinte.
 */
export function byParts(items: TLItem[], o: { parts: OutlinePart[]; log?: PartLogEntry[]; cur: OutlinePart | null; sessionOf: (id?: ID) => Session | undefined }): TLItem[] {
  const parts = [...o.parts].sort((a, b) => a.pct - b.pct);
  if (parts.length < 2) return items;
  const ids = new Set(parts.map((p) => p.id));
  const idx = new Map(parts.map((p, i) => [p.id, i]));
  const log = [...(o.log ?? [])].filter((e) => ids.has(e.id)).sort((a, b) => a.at.localeCompare(b.at));
  const curIdx = o.cur ? idx.get(o.cur.id) ?? -1 : -1;
  const at = (iso: string): string | null => { let id: string | null = null; for (const e of log) { if (e.at <= iso) id = e.id; else break; } return id; };
  const BEFORE = '__antes';
  const partOfEvent = (it: EventItem): string => {
    const from = it.session?.partMarks?.from?.id;
    if (from && ids.has(from)) return from;
    const byLog = at(it.e.at);
    if (byLog) return byLog;
    if (!log.length) return o.cur?.id ?? BEFORE;
    return BEFORE;
  };
  // Cada item vai para um grupo; os que não são registros seguem o próximo registro (ou o fim).
  const groups = new Map<string, TLItem[]>();
  const push = (k: string, it: TLItem) => groups.set(k, [...(groups.get(k) ?? []), it]);
  let pending: TLItem[] = [];
  let lastKey = o.cur?.id ?? BEFORE;
  for (const it of items) {
    if (it.type === 'chapter' || it.type === 'gpart' || it.type === 'popen') continue;
    if (it.type === 'event') {
      const k = partOfEvent(it);
      for (const x of pending) push(k, x);
      pending = [];
      push(k, it);
      lastKey = k;
    } else pending.push(it);
  }
  const tailKey = o.cur?.id ?? lastKey;
  for (const x of pending) push(tailKey, x);

  const open = (p: OutlinePart, n: number, state: PartOpenItem['state'], list: TLItem[]): PartOpenItem => {
    const evs = list.filter((x): x is EventItem => x.type === 'event').map((x) => x.e);
    const sm = summarize(evs, o.sessionOf);
    const arrived = log.find((e) => e.id === p.id)?.at;
    const dated = evs.filter((e) => datable(e.precision)).map((e) => e.at).sort();
    return { type: 'popen', id: `po-${p.id}`, part: p, n, total: parts.length, state, from: arrived ?? dated[0], to: dated.at(-1), sessions: sm.sessions, minutes: sm.minutes,
      moments: evs.filter((e) => e.kind === 'momento').length, summary: evs.length ? sm.text : state === 'atual' ? 'Você chegou aqui. O que você fizer agora entra neste capítulo.' : 'Você passou por aqui sem registrar nada.', chapter: n };
  };
  const out: TLItem[] = [];
  const before = groups.get(BEFORE);
  if (before?.length) {
    const pseudo: OutlinePart = { id: BEFORE, name: 'Antes de marcar', pct: 0 };
    out.push({ ...open(pseudo, 0, 'antes', before), id: 'po-antes' }, ...before.map((x) => withChapter(x, 0)));
  }
  const lastWithItems = Math.max(curIdx, ...parts.map((p, i) => (groups.get(p.id)?.length ? i : -1)));
  for (let i = 0; i <= lastWithItems; i++) {
    const p = parts[i], list = groups.get(p.id) ?? [];
    const state = i === curIdx ? 'atual' : 'passou';
    if (!list.length && i !== curIdx && !log.some((e) => e.id === p.id) && curIdx >= 0 && i < curIdx) {
      out.push(open(p, i + 1, 'passou', []));
      continue;
    }
    out.push(open(p, i + 1, state, list), ...list.map((x) => withChapter(x, i + 1)));
  }
  const hasToday = out.some((x) => x.type === 'today');
  const ahead = parts.slice(lastWithItems + 1);
  if (hasToday && ahead.length) {
    const shown = ahead.slice(0, 6);
    shown.forEach((p, k) => out.push({ type: 'gpart', id: `gp-${p.id}`, part: p, n: parts.indexOf(p) + 1, total: parts.length, state: 'frente', more: k === shown.length - 1 && ahead.length > shown.length ? ahead.length - shown.length : undefined, chapter: parts.indexOf(p) + 1 }));
  }
  return out;
}
const withChapter = (x: TLItem, n: number): TLItem => ('chapter' in x && typeof x.chapter === 'number' ? { ...x, chapter: n } as TLItem : x);

/** Onde cada painel fica na régua "Por capítulo" (0 a 100): a abertura no começo do capítulo, os registros espalhados
 *  dentro dele, o "Hoje" no seu progresso e os capítulos à frente no começo de cada um. */
export function partPositions(items: TLItem[], parts: OutlinePart[], now: number | null): Map<string, number> {
  const sorted = [...parts].sort((a, b) => a.pct - b.pct);
  const startOf = (id: string) => sorted.find((p) => p.id === id)?.pct ?? 0;
  const endOf = (id: string) => { const i = sorted.findIndex((p) => p.id === id); return i >= 0 ? sorted[i + 1]?.pct ?? 100 : sorted[0]?.pct ?? 0; };
  const m = new Map<string, number>();
  let k = 0;
  while (k < items.length) {
    const it = items[k];
    if (it.type === 'popen') {
      const a = it.part.id === '__antes' ? 0 : startOf(it.part.id), b = it.part.id === '__antes' ? Math.max(0, sorted[0]?.pct ?? 0) : endOf(it.part.id);
      m.set(it.id, a);
      let j = k + 1;
      const inside: TLItem[] = [];
      while (j < items.length && items[j].type !== 'popen' && items[j].type !== 'gpart') { inside.push(items[j]); j++; }
      inside.forEach((x, q) => {
        if (x.type === 'today' && now != null) m.set(x.id, Math.max(a, Math.min(b, now)));
        else m.set(x.id, a + ((b - a) * (q + 1)) / (inside.length + 1));
      });
      k = j;
    } else {
      m.set(it.id, it.type === 'gpart' ? it.part.pct : it.type === 'today' && now != null ? now : 0);
      k++;
    }
  }
  return m;
}
