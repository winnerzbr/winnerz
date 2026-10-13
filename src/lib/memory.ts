/**
 * Memória afetiva sem cobrança: a semana de jogo, o seu ritmo, aniversários e a linha do tempo geral.
 * Tudo sai do que a pessoa registrou. Sem streak, sem meta, sem comparação com ninguém.
 * Horas só aparecem quando foram informadas (nunca estimadas).
 */
import type { Game, ID, State, TimelineEvent } from '../data/types';

const DAY = 86400000;
const tz = 'America/Sao_Paulo';
/** Partes da data no fuso de Brasília. */
function parts(iso: string) {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', weekday: 'short', hour12: false }).formatToParts(d);
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? '';
  return { y: Number(get('year')), m: Number(get('month')), d: Number(get('day')), h: Number(get('hour')) % 24, wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')) };
}

const gameOfJourney = (s: State, journeyId: ID): Game | undefined => {
  const j = s.journeys.find((x) => x.id === journeyId);
  return j ? s.games[j.gameId] : undefined;
};

/* ---- Sua semana de jogo ------------------------------------------------------------------ */

export type Week = {
  sessions: number;
  games: Game[];
  moments: number;
  points: number;
  /** Minutos informados por você (só sessões com tempo informado). */
  minutes: number;
  companions: string[];
  finished: Game[];
};

export function weekSummary(s: State, now = Date.now()): Week | null {
  const from = now - 7 * DAY;
  const inWeek = (iso?: string) => !!iso && Date.parse(iso) >= from && Date.parse(iso) <= now;
  const sessions = s.sessions.filter((x) => inWeek(x.endedAt ?? x.startedAt));
  const events = s.events.filter((e) => inWeek(e.at));
  const finished = s.histories.filter((h) => h.state === 'concluida' && inWeek(h.completedAt) && h.completedPrecision !== 'desconhecida');
  if (!sessions.length && !events.some((e) => e.kind === 'momento' || e.kind === 'ponto') && !finished.length) return null;
  const gameIds = [...new Set(sessions.map((x) => x.journeyId))].map((j) => gameOfJourney(s, j)).filter((g): g is Game => !!g);
  return {
    sessions: sessions.length,
    games: gameIds,
    moments: events.filter((e) => e.kind === 'momento').length,
    points: events.filter((e) => e.kind === 'ponto').length,
    minutes: sessions.reduce((a, x) => a + (x.minutes ?? 0), 0),
    companions: [...new Set(sessions.flatMap((x) => x.companions ?? []))],
    finished: finished.map((h) => gameOfJourney(s, h.journeyId)).filter((g): g is Game => !!g),
  };
}

/* ---- Aniversários ------------------------------------------------------------------------ */

export type Anniversary = { kind: 'zerou' | 'comecou'; years: number; game: Game; at: string; journeyId: ID };

/** Aniversários dos últimos dias (hoje incluído): zerou ou começou, só com data de dia exato. */
export function anniversaries(s: State, now = Date.now(), withinDays = 3): Anniversary[] {
  const today = parts(new Date(now).toISOString());
  const out: Anniversary[] = [];
  const check = (iso: string | undefined, precision: string | undefined, kind: Anniversary['kind'], journeyId: ID) => {
    if (!iso || (precision && precision !== 'dia')) return;
    const p = parts(iso);
    for (let back = 0; back <= withinDays; back++) {
      const d = parts(new Date(now - back * DAY).toISOString());
      if (d.m === p.m && d.d === p.d && d.y > p.y) {
        const g = gameOfJourney(s, journeyId);
        if (g) out.push({ kind, years: d.y - p.y, game: g, at: iso, journeyId });
        return;
      }
    }
  };
  for (const h of s.histories) {
    if (h.state === 'concluida') check(h.completedAt, h.completedPrecision, 'zerou', h.journeyId);
    if (h.ordinal === 1) check(h.startedAt, h.startedPrecision, 'comecou', h.journeyId);
  }
  void today;
  // Zerou vem antes de começou; mais anos primeiro.
  return out.sort((a, b) => (a.kind === b.kind ? b.years - a.years : a.kind === 'zerou' ? -1 : 1));
}

/* ---- Meu ritmo --------------------------------------------------------------------------- */

export type Rhythm = {
  sessions: number;
  /** Sessões por dia da semana (0 = domingo). */
  byWeekday: number[];
  /** Sessões por período: madrugada, manhã, tarde, noite. */
  byPeriod: [number, number, number, number];
  /** Mediana de minutos por sessão (só as com tempo informado). */
  medianMinutes: number | null;
  informedSessions: number;
  /** Mediana de dias entre começar e zerar (só Histórias com as duas datas de dia exato). */
  medianDaysToFinish: number | null;
  /** Sessões por mês nos últimos 12 meses (do mais antigo ao atual). */
  months: { label: string; count: number }[];
  /** Em quantos jogos você esteve ao mesmo tempo, em média, nos meses com sessões. */
  parallel: number | null;
  companions: { name: string; sessions: number; games: number }[];
};

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const v = [...xs].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function rhythm(s: State, now = Date.now()): Rhythm {
  const done = s.sessions.filter((x) => x.endedAt);
  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  const byPeriod: [number, number, number, number] = [0, 0, 0, 0];
  for (const x of done) {
    const p = parts(x.startedAt);
    byWeekday[p.wd]++;
    byPeriod[p.h < 6 ? 0 : p.h < 12 ? 1 : p.h < 18 ? 2 : 3]++;
  }
  const informed = done.filter((x) => x.minutes != null && x.minutes > 0).map((x) => x.minutes!);
  const days = s.histories.filter((h) => h.state === 'concluida' && h.completedAt && (h.startedPrecision ?? 'dia') === 'dia' && (h.completedPrecision ?? 'dia') === 'dia')
    .map((h) => Math.round((Date.parse(h.completedAt!) - Date.parse(h.startedAt)) / DAY)).filter((d) => d >= 0);
  const nowP = parts(new Date(now).toISOString());
  const months: Rhythm['months'] = [];
  const perMonthGames: Set<ID>[] = [];
  for (let k = 11; k >= 0; k--) {
    const m0 = nowP.m - 1 - k;
    const y = nowP.y + Math.floor(m0 / 12), m = ((m0 % 12) + 12) % 12 + 1;
    const these = done.filter((x) => { const p = parts(x.startedAt); return p.y === y && p.m === m; });
    months.push({ label: `${MONTHS[m - 1]}${m === 1 || k === 11 ? ` ${String(y).slice(2)}` : ''}`, count: these.length });
    perMonthGames.push(new Set(these.map((x) => x.journeyId)));
  }
  const active = perMonthGames.filter((g) => g.size);
  const comp = new Map<string, { sessions: number; games: Set<ID> }>();
  for (const x of done) for (const c of x.companions ?? []) {
    const e = comp.get(c) ?? { sessions: 0, games: new Set<ID>() };
    e.sessions++; e.games.add(x.journeyId); comp.set(c, e);
  }
  return {
    sessions: done.length, byWeekday, byPeriod,
    medianMinutes: median(informed), informedSessions: informed.length,
    medianDaysToFinish: median(days),
    months,
    parallel: active.length ? Math.round((active.reduce((a, g) => a + g.size, 0) / active.length) * 10) / 10 : null,
    companions: [...comp].map(([name, e]) => ({ name, sessions: e.sessions, games: e.games.size })).sort((a, b) => b.sessions - a.sessions).slice(0, 8),
  };
}

/* ---- Linha do tempo geral ---------------------------------------------------------------- */

export type GlobalItem = {
  id: string;
  at: string;
  kind: 'jornada' | 'colecao';
  label: string;
  title: string;
  text?: string;
  image?: string;
  game?: Game;
  to?: string;
  precision?: string;
  /** Tipo do registro da Jornada (para a marca na linha). */
  ev?: string;
  resolved?: boolean;
};

const KIND_LABEL: Record<string, string> = { inicio: 'Começou', sessao: 'Sessão', momento: 'Momento', ponto: 'Ponto para voltar', marco: 'Marco', carta: 'Carta' };

const copyText = (c: State['copies'][number]) => [c.platform, c.kind === 'fisico' ? 'mídia física' : c.kind === 'digital' ? 'digital' : c.kind === 'assinatura' ? 'assinatura' : ''].filter(Boolean).join(', ');

/** Todas as Jornadas e as chegadas à coleção num fio só, do mais recente ao mais antigo. */
export function globalTimeline(s: State): GlobalItem[] {
  const items: GlobalItem[] = [];
  for (const e of s.events as TimelineEvent[]) {
    if (e.kind === 'carta') continue;
    const g = gameOfJourney(s, e.journeyId);
    items.push({ id: e.id, at: e.at, kind: 'jornada', label: KIND_LABEL[e.kind] ?? 'Registro', title: e.title, text: e.quote ?? e.text, image: e.image, game: g, to: g ? `/jornada/${g.slug}` : undefined, precision: e.precision, ev: e.kind, resolved: e.resolved });
  }
  // Cópias que entraram juntas (importação da planilha ou da Steam) viram um registro só.
  const batches = new Map<string, typeof s.copies>();
  for (const c of s.copies) {
    if (!s.games[c.gameId]) continue;
    if (c.purchasedOn) {
      const g = s.games[c.gameId];
      items.push({ id: `copy-${c.id}`, at: `${c.purchasedOn}T12:00:00-03:00`, kind: 'colecao', label: 'Chegou à coleção', title: g.title, text: copyText(c), game: g, to: `/jogos/${g.slug}`, precision: 'dia' });
    } else if (c.createdAt) {
      const k = c.createdAt.slice(0, 16);
      batches.set(k, [...(batches.get(k) ?? []), c]);
    }
  }
  for (const [k, cs] of batches) {
    if (cs.length <= 3) {
      for (const c of cs) { const g = s.games[c.gameId]; items.push({ id: `copy-${c.id}`, at: c.createdAt!, kind: 'colecao', label: 'Chegou à coleção', title: g.title, text: copyText(c), game: g, to: `/jogos/${g.slug}` }); }
    } else {
      const covers = cs.map((c) => s.games[c.gameId]).filter((g) => g?.cover).slice(0, 1);
      items.push({ id: `batch-${k}`, at: cs[0].createdAt!, kind: 'colecao', label: 'Importação', title: `${cs.length} jogos entraram na coleção`, text: 'De uma vez, pela importação.', game: covers[0], to: '/colecao' });
    }
  }
  // Registros sem data (ex.: "zerou" da planilha sem data) vão para o fim, sem fingir que foram hoje.
  const undated = (x: GlobalItem) => x.precision === 'desconhecida';
  return items.sort((a, b) => Number(undated(a)) - Number(undated(b)) || b.at.localeCompare(a.at));
}
