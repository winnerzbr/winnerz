import { useSyncExternalStore } from 'react';
import type { State, Prefs, Session, TimelineEvent, History, Journey, ID, EventKind, Review, Game, Copy, MyGame, HistoryState, DatePrecision, Capsule, Hardware, Loan, Showcase, Museum, MuseumRoom } from './types';
import type { Rating } from '../lib/rating';
import { track } from '../lib/track';
import { localDay } from '../lib/dates';

/**
 * Store único do app. Todas as telas leem daqui e chamam as ações daqui.
 * As ações atualizam a tela na hora (otimista) e o "adaptador" grava:
 *  - modo demonstração: localStorage do navegador;
 *  - modo Supabase: tabelas do banco (ver supabaseAdapter.ts).
 */

export type ImportPayload = {
  games: Game[]; copies: Copy[]; myGames: MyGame[]; journeys: Journey[]; histories: History[]; events: TimelineEvent[]; reviews: Review[];
};

export type Action =
  | { type: 'prefs'; prefs: Partial<Prefs> }
  | { type: 'profile.name'; name: string }
  | { type: 'profile.avatar'; url: string | null }
  | { type: 'journey.share'; journeyId: ID; shared: boolean }
  | { type: 'favorite'; gameId: ID; value: boolean }
  | { type: 'wish'; gameId: ID; value: boolean }
  | { type: 'journey.create'; journey: Journey; history: History; event: TimelineEvent }
  | { type: 'journey.update'; journey: Journey }
  | { type: 'journey.delete'; journeyId: ID; imagePaths: string[] }
  | { type: 'history.create'; history: History; event: TimelineEvent }
  | { type: 'history.update'; history: History; event?: TimelineEvent; journey?: Journey }
  | { type: 'history.delete'; historyId: ID; imagePaths: string[] }
  | { type: 'session.start'; session: Session }
  | { type: 'session.finish'; session: Session; event: TimelineEvent; progress?: { historyId: ID; value: number } }
  | { type: 'session.update'; session: Session }
  | { type: 'session.delete'; sessionId: ID }
  | { type: 'event.add'; event: TimelineEvent }
  | { type: 'event.resolve'; eventId: ID }
  | { type: 'event.update'; eventId: ID; patch: EventPatch }
  | { type: 'event.delete'; eventId: ID; imagePath?: string }
  | { type: 'progress'; historyId: ID; value: number }
  | { type: 'history.complete'; history: History; event: TimelineEvent }
  | { type: 'history.letterOpen'; historyId: ID; at: string }
  | { type: 'review.save'; review: Review }
  | { type: 'games.merge'; games: Game[] }
  | { type: 'game.create'; game: Game }
  | { type: 'game.relink'; fromId: ID; to: Game; mergeFrom?: ID; mergeInto?: ID }
  | { type: 'games.relinkMany'; pairs: { fromId: ID; to: Game }[] }
  | { type: 'copies.deleteMany'; ids: ID[] }
  | { type: 'journeys.deleteMany'; ids: ID[] }
  | { type: 'copy.add'; copy: Copy }
  | { type: 'copy.update'; copy: Copy }
  | { type: 'copy.delete'; copyId: ID }
  | { type: 'hardware.add'; hw: Hardware }
  | { type: 'hardware.update'; hw: Hardware }
  | { type: 'hardware.delete'; id: ID }
  | { type: 'trash.restore'; what: 'copy' | 'hardware'; id: ID }
  | { type: 'trash.purge'; what: 'copy' | 'hardware'; id: ID }
  | { type: 'trash.empty' }
  | { type: 'loan.save'; loan: Loan }
  | { type: 'loan.delete'; id: ID }
  | { type: 'showcase.save'; sc: Showcase }
  | { type: 'showcase.delete'; id: ID }
  | { type: 'showcases.order'; ids: ID[] }
  | { type: 'museum.meta'; museum: Museum }
  | { type: 'room.save'; room: MuseumRoom; dropPaths?: string[] }
  | { type: 'room.delete'; id: ID; paths: string[] }
  | { type: 'rooms.order'; ids: ID[] }
  | { type: 'mygame.set'; mine: MyGame }
  | { type: 'import.bulk'; data: ImportPayload }
  | { type: 'reviews.merge'; gameId: ID; reviews: Review[]; stats?: State['reviewStats'][string] };

export type EventPatch = Partial<Pick<TimelineEvent, 'image' | 'imagePath' | 'title' | 'text' | 'quote' | 'at' | 'precision' | 'dateLabel'>>;

export interface Adapter {
  load(): Promise<State>;
  persist(action: Action, next: State): Promise<void>;
}

let state: State = emptyState();
let adapter: Adapter | null = null;
const listeners = new Set<() => void>();

export function emptyState(): State {
  return {
    ready: false, mode: 'demo', profile: null,
    prefs: { theme: 'escuro', black: 70, scale: 'TEN_POINT', motion: 'completas' },
    games: {}, copies: [], wishes: [], favorites: [], journeys: [], histories: [],
    sessions: [], events: [], reviews: [], reviewStats: {}, myGames: {}, schemaV4: false,
    hardware: [], trashCopies: [], trashHardware: [],
    loans: [], showcases: [], museum: {}, rooms: [],
  };
}

export function getState() { return state; }

function emit() { listeners.forEach((l) => l()); }

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

export async function initStore(a: Adapter) {
  adapter = a;
  state = await a.load();
  emit();
}

function reduce(s: State, a: Action): State {
  switch (a.type) {
    case 'journey.share':
      return { ...s, journeys: s.journeys.map((j) => (j.id === a.journeyId ? { ...j, shared: a.shared } : j)) };
    case 'profile.name':
      return s.profile ? { ...s, profile: { ...s.profile, name: a.name, initial: a.name.slice(0, 1).toUpperCase() } } : s;
    case 'profile.avatar':
      return s.profile ? { ...s, profile: { ...s.profile, avatar: a.url } } : s;
    case 'prefs':
      return { ...s, prefs: { ...s.prefs, ...a.prefs } };
    case 'favorite':
      return { ...s, favorites: a.value ? [...new Set([...s.favorites, a.gameId])] : s.favorites.filter((g) => g !== a.gameId) };
    case 'wish':
      return { ...s, wishes: a.value ? [...s.wishes.filter((w) => w.gameId !== a.gameId), { gameId: a.gameId }] : s.wishes.filter((w) => w.gameId !== a.gameId) };
    case 'journey.create':
      return { ...s, journeys: [...s.journeys, a.journey], histories: [...s.histories, a.history], events: [...s.events, a.event] };
    case 'history.create':
      return { ...s, histories: [...s.histories, a.history], events: [...s.events, a.event] };
    case 'session.start':
      return { ...s, sessions: [...s.sessions, a.session] };
    case 'session.finish': {
      let histories = s.histories;
      if (a.progress) histories = histories.map((h) => (h.id === a.progress!.historyId ? { ...h, progress: a.progress!.value } : h));
      return { ...s, histories, sessions: s.sessions.map((x) => (x.id === a.session.id ? a.session : x)), events: [...s.events, a.event] };
    }
    case 'event.add':
      return { ...s, events: [...s.events, a.event] };
    case 'event.resolve':
      return { ...s, events: s.events.map((e) => (e.id === a.eventId ? { ...e, resolved: true } : e)) };
    case 'event.update':
      return { ...s, events: s.events.map((e) => (e.id === a.eventId ? { ...e, ...a.patch } : e)) };

    case 'progress':
      return { ...s, histories: s.histories.map((h) => (h.id === a.historyId ? { ...h, progress: a.value } : h)) };
    case 'history.complete':
      return {
        ...s,
        histories: s.histories.map((h) => (h.id === a.history.id ? a.history : h)),
        sessions: s.sessions.map((x) => (x.historyId === a.history.id && !x.endedAt ? { ...x, endedAt: a.event.at } : x)),
        events: [...s.events, a.event],
      };
    case 'history.letterOpen':
      return { ...s, histories: s.histories.map((h) => (h.id === a.historyId && h.letter ? { ...h, letter: { ...h.letter, openedAt: a.at } } : h)) };
    case 'review.save':
      return { ...s, reviews: [...s.reviews.filter((r) => r.id !== a.review.id), a.review] };
    case 'games.merge':
      return { ...s, games: { ...s.games, ...Object.fromEntries(a.games.map((g) => [g.id, g])) } };
    case 'copy.add':
      return { ...s, copies: [...s.copies, a.copy] };
    case 'reviews.merge':
      return {
        ...s,
        reviews: [...s.reviews.filter((r) => r.gameId !== a.gameId || r.mine), ...a.reviews.filter((r) => !r.mine)],
        reviewStats: a.stats ? { ...s.reviewStats, [a.gameId]: a.stats } : s.reviewStats,
      };
    case 'journey.update':
      return { ...s, journeys: s.journeys.map((j) => (j.id === a.journey.id ? a.journey : j)) };
    case 'journey.delete': {
      const focusIds = (s.prefs.focusIds ?? []).filter((id) => id !== a.journeyId);
      return {
        ...s,
        prefs: { ...s.prefs, focusIds, focusJourneyId: s.prefs.focusJourneyId === a.journeyId ? null : s.prefs.focusJourneyId },
        journeys: s.journeys.filter((j) => j.id !== a.journeyId),
        histories: s.histories.filter((h) => h.journeyId !== a.journeyId),
        sessions: s.sessions.filter((x) => x.journeyId !== a.journeyId),
        events: s.events.filter((e) => e.journeyId !== a.journeyId),
      };
    }
    case 'history.update':
      return {
        ...s,
        histories: s.histories.map((h) => (h.id === a.history.id ? a.history : h)),
        journeys: a.journey ? s.journeys.map((j) => (j.id === a.journey!.id ? a.journey! : j)) : s.journeys,
        events: a.event ? [...s.events, a.event] : s.events,
      };
    case 'history.delete':
      return {
        ...s,
        histories: s.histories.filter((h) => h.id !== a.historyId),
        sessions: s.sessions.filter((x) => x.historyId !== a.historyId),
        events: s.events.filter((e) => e.historyId !== a.historyId),
      };
    case 'session.update':
      return { ...s, sessions: s.sessions.map((x) => (x.id === a.session.id ? a.session : x)) };
    case 'session.delete':
      return {
        ...s,
        sessions: s.sessions.filter((x) => x.id !== a.sessionId),
        // O resumo da sessão sai junto; momentos e pontos guardados nela ficam.
        events: s.events.filter((e) => !(e.sessionId === a.sessionId && e.kind === 'sessao')).map((e) => (e.sessionId === a.sessionId ? { ...e, sessionId: undefined } : e)),
      };
    case 'event.delete':
      return { ...s, events: s.events.filter((e) => e.id !== a.eventId) };
    case 'game.create':
      return { ...s, games: { ...s.games, [a.game.id]: a.game } };
    case 'game.relink': {
      const f = a.fromId, t = a.to.id;
      const sw = <T extends { gameId: ID }>(x: T): T => (x.gameId === f ? { ...x, gameId: t } : x);
      const myGames = { ...s.myGames };
      if (myGames[f]) {
        // Junta os dois, preferindo o que já estava na ficha nova; campo vazio de um lado não apaga o do outro.
        const keep = Object.fromEntries(Object.entries(myGames[t] ?? {}).filter(([, v]) => v !== undefined && v !== null));
        myGames[t] = { ...myGames[f], ...keep, wontPlay: myGames[f].wontPlay || myGames[t]?.wontPlay || undefined, onRadar: myGames[f].onRadar || myGames[t]?.onRadar || undefined, gameId: t };
        delete myGames[f];
      }
      // Se os dois jogos já tinham Jornada, as Histórias do antigo passam para a Jornada do novo.
      const jf = s.journeys.find((j) => j.gameId === f), jt = s.journeys.find((j) => j.gameId === t);
      let journeys = s.journeys.map(sw), histories = s.histories, sessions = s.sessions, events = s.events;
      if (jf && jt) {
        const base = Math.max(0, ...s.histories.filter((h) => h.journeyId === jt.id).map((h) => h.ordinal));
        const moved = s.histories.filter((h) => h.journeyId === jf.id).sort((x, y) => x.ordinal - y.ordinal);
        histories = s.histories.map((h) => { const i = moved.findIndex((m) => m.id === h.id); return i < 0 ? h : { ...h, journeyId: jt.id, ordinal: base + i + 1 }; });
        sessions = s.sessions.map((x) => (x.journeyId === jf.id ? { ...x, journeyId: jt.id } : x));
        events = s.events.map((e) => (e.journeyId === jf.id ? { ...e, journeyId: jt.id } : e));
        journeys = s.journeys.filter((j) => j.id !== jf.id);
      }
      const games = { ...s.games, [t]: a.to };
      // Ficha feita à mão some; ficha do IGDB continua no catálogo (só deixa de ser sua).
      if (s.games[f]?.source === 'manual') delete games[f];
      return {
        ...s, games, myGames, journeys, histories, sessions, events,
        copies: s.copies.map(sw),
        wishes: s.wishes.some((w) => w.gameId === t) ? s.wishes.filter((w) => w.gameId !== f) : s.wishes.map(sw),
        favorites: [...new Set(s.favorites.map((g) => (g === f ? t : g)))],
        reviews: s.reviews.some((r) => r.mine && r.gameId === t) ? s.reviews.filter((r) => !(r.mine && r.gameId === f)) : s.reviews.map((r) => (r.mine ? sw(r) : r)),
      };
    }
    case 'copies.deleteMany': {
      const ids = new Set(a.ids);
      return { ...s, copies: s.copies.filter((c) => !ids.has(c.id)) };
    }
    case 'journeys.deleteMany': {
      const ids = new Set(a.ids);
      return {
        ...s,
        journeys: s.journeys.filter((j) => !ids.has(j.id)),
        histories: s.histories.filter((h) => !ids.has(h.journeyId)),
        sessions: s.sessions.filter((x) => !ids.has(x.journeyId)),
        events: s.events.filter((e) => !ids.has(e.journeyId)),
      };
    }
    case 'games.relinkMany':
      return a.pairs.reduce((acc, p) => reduce(acc, { type: 'game.relink', fromId: p.fromId, to: p.to }), s);
    case 'copy.update':
      return { ...s, copies: s.copies.map((c) => (c.id === a.copy.id ? a.copy : c)) };
    case 'copy.delete': {
      // Com a lixeira (migração 0014, ou demonstração), o exemplar fica 30 dias recuperável.
      const c = s.copies.find((x) => x.id === a.copyId);
      const trash = c && s.schemaV14 ? [{ ...c, deletedAt: new Date().toISOString() }, ...(s.trashCopies ?? [])] : s.trashCopies ?? [];
      return { ...s, copies: s.copies.filter((x) => x.id !== a.copyId), trashCopies: trash };
    }
    case 'hardware.add':
      return { ...s, hardware: [...(s.hardware ?? []), a.hw] };
    case 'hardware.update':
      return { ...s, hardware: (s.hardware ?? []).map((h) => (h.id === a.hw.id ? a.hw : h)) };
    case 'hardware.delete': {
      const h = (s.hardware ?? []).find((x) => x.id === a.id);
      return { ...s, hardware: (s.hardware ?? []).filter((x) => x.id !== a.id), trashHardware: h ? [{ ...h, deletedAt: new Date().toISOString() }, ...(s.trashHardware ?? [])] : s.trashHardware ?? [] };
    }
    case 'trash.restore': {
      if (a.what === 'copy') {
        const t = (s.trashCopies ?? []).find((x) => x.id === a.id);
        if (!t) return s;
        const { deletedAt: _d, ...c } = t;
        return { ...s, copies: [...s.copies, c], trashCopies: s.trashCopies.filter((x) => x.id !== a.id) };
      }
      const t = (s.trashHardware ?? []).find((x) => x.id === a.id);
      if (!t) return s;
      const { deletedAt: _d, ...h } = t;
      return { ...s, hardware: [...(s.hardware ?? []), h], trashHardware: s.trashHardware.filter((x) => x.id !== a.id) };
    }
    case 'trash.purge': {
      // Apagar de vez leva junto o histórico de empréstimos daquela peça (no banco, em cascata).
      const loans = (s.loans ?? []).filter((l) => (a.what === 'copy' ? l.copyId : l.hardwareId) !== a.id);
      return a.what === 'copy' ? { ...s, loans, trashCopies: (s.trashCopies ?? []).filter((x) => x.id !== a.id) } : { ...s, loans, trashHardware: (s.trashHardware ?? []).filter((x) => x.id !== a.id) };
    }
    case 'trash.empty': {
      const gone = new Set([...(s.trashCopies ?? []), ...(s.trashHardware ?? [])].map((x) => x.id));
      return { ...s, trashCopies: [], trashHardware: [], loans: (s.loans ?? []).filter((l) => !gone.has(l.copyId ?? l.hardwareId ?? '')) };
    }
    case 'loan.save':
      return { ...s, loans: (s.loans ?? []).some((l) => l.id === a.loan.id) ? s.loans.map((l) => (l.id === a.loan.id ? a.loan : l)) : [...(s.loans ?? []), a.loan] };
    case 'loan.delete':
      return { ...s, loans: (s.loans ?? []).filter((l) => l.id !== a.id) };
    case 'showcase.save':
      return { ...s, showcases: (s.showcases ?? []).some((x) => x.id === a.sc.id) ? s.showcases.map((x) => (x.id === a.sc.id ? a.sc : x)) : [...(s.showcases ?? []), a.sc] };
    case 'showcase.delete':
      return { ...s, showcases: (s.showcases ?? []).filter((x) => x.id !== a.id) };
    case 'showcases.order':
      return { ...s, showcases: (s.showcases ?? []).map((x) => ({ ...x, position: a.ids.indexOf(x.id) < 0 ? x.position : a.ids.indexOf(x.id) })) };
    case 'museum.meta':
      return { ...s, museum: a.museum };
    case 'room.save':
      return { ...s, rooms: (s.rooms ?? []).some((x) => x.id === a.room.id) ? s.rooms.map((x) => (x.id === a.room.id ? a.room : x)) : [...(s.rooms ?? []), a.room] };
    case 'room.delete':
      return { ...s, rooms: (s.rooms ?? []).filter((x) => x.id !== a.id) };
    case 'rooms.order':
      return { ...s, rooms: (s.rooms ?? []).map((x) => ({ ...x, position: a.ids.indexOf(x.id) < 0 ? x.position : a.ids.indexOf(x.id) })) };
    case 'mygame.set':
      return { ...s, myGames: { ...s.myGames, [a.mine.gameId]: a.mine } };
    case 'import.bulk': {
      const d = a.data;
      const myGames = { ...s.myGames };
      for (const m of d.myGames) myGames[m.gameId] = { ...myGames[m.gameId], ...m };
      return {
        ...s, myGames,
        games: { ...s.games, ...Object.fromEntries(d.games.map((g) => [g.id, g])) },
        copies: [...s.copies, ...d.copies],
        journeys: [...s.journeys, ...d.journeys],
        histories: [...s.histories, ...d.histories],
        events: [...s.events, ...d.events],
        reviews: [...s.reviews.filter((r) => !d.reviews.some((x) => x.id === r.id)), ...d.reviews],
      };
    }
  }
}

export function dispatch(a: Action) {
  state = reduce(state, a);
  emit();
  adapter?.persist(a, state).catch((err) => {
    // Falha ao gravar não apaga o que a pessoa fez; avisamos no console e
    // a próxima carga reconcilia com o servidor.
    console.error('[WinnerZ] Não foi possível salvar:', err);
  });
}

/** Como dispatch, mas espera a gravação terminar e repassa o erro (usado na importação). */
export async function commit(a: Action) {
  const before = state;
  state = reduce(state, a);
  emit();
  try {
    await adapter?.persist(a, state);
  } catch (err) {
    // Não deixa na tela o que não chegou ao banco: volta ao estado anterior e repassa o erro.
    // (Partes já gravadas são reconhecidas na próxima tentativa, porque a página é recarregada do banco.)
    state = before;
    emit();
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Seletores                                                           */
/* ------------------------------------------------------------------ */

export const uid = () => (globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
export const nowIso = () => new Date().toISOString();

/** Empréstimo em aberto de um exemplar ou console (se houver). */
export function activeLoan(s: State, item: { copyId?: ID; hardwareId?: ID }): Loan | undefined {
  return (s.loans ?? []).find((l) => !l.returnedOn && (item.copyId ? l.copyId === item.copyId : l.hardwareId === item.hardwareId));
}
/** Histórico de empréstimos de uma peça, do mais recente ao mais antigo. */
export function loansOf(s: State, item: { copyId?: ID; hardwareId?: ID }): Loan[] {
  return (s.loans ?? []).filter((l) => (item.copyId ? l.copyId === item.copyId : l.hardwareId === item.hardwareId)).sort((a, b) => b.lentOn.localeCompare(a.lentOn));
}

export function journeyForGame(s: State, gameId: ID) {
  return s.journeys.find((j) => j.gameId === gameId) ?? null;
}
export function historiesOf(s: State, journeyId: ID) {
  return s.histories.filter((h) => h.journeyId === journeyId).sort((a, b) => a.ordinal - b.ordinal);
}
export function currentHistory(s: State, journeyId: ID) {
  const hs = historiesOf(s, journeyId);
  return hs.find((h) => h.state === 'ativa' || h.state === 'pausada') ?? hs[hs.length - 1] ?? null;
}
export function openSession(s: State) {
  return s.sessions.find((x) => !x.endedAt) ?? null;
}
export function sessionsOf(s: State, historyId: ID) {
  return s.sessions.filter((x) => x.historyId === historyId).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}
export function lastNote(s: State, journeyId: ID) {
  const withNote = s.sessions.filter((x) => x.journeyId === journeyId && x.note && x.endedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return withNote[0] ?? null;
}
export function lastSession(s: State, journeyId: ID) {
  const done = s.sessions.filter((x) => x.journeyId === journeyId && x.endedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return done[0] ?? null;
}
/** História que ainda conta como "em andamento" (jogando ou pausada). */
export const isOpenState = (st?: HistoryState) => st === 'ativa' || st === 'pausada';
/** História que terminou de algum jeito (zerou, encerrou ou largou). */
export const isClosedState = (st?: HistoryState) => st === 'concluida' || st === 'encerrada' || st === 'dropada';

export function nextOrdinal(s: State, journeyId: ID) {
  return Math.max(0, ...s.histories.filter((h) => h.journeyId === journeyId).map((h) => h.ordinal)) + 1;
}

export function myGame(s: State, gameId: ID): MyGame {
  return s.myGames[gameId] ?? { gameId };
}

/** A História que este marco fechou, se ele for o marco de fim atual dela (o último "Zerou", "Largou" ou "Encerrou"). */
export function closedBy(s: State, e: TimelineEvent): History | null {
  if (e.kind !== 'marco' || !e.historyId) return null;
  const h = s.histories.find((x) => x.id === e.historyId);
  if (!h || !isClosedState(h.state)) return null;
  // Só a História atual (a mais recente) volta a ficar em andamento; as anteriores ficam como estão.
  if (currentHistory(s, h.journeyId)?.id !== h.id) return null;
  const word = h.state === 'concluida' ? /^Zerou/ : h.state === 'encerrada' ? /^Encerrou/ : /^Largou/;
  const end = s.events.filter((x) => x.historyId === h.id && x.kind === 'marco' && word.test(x.title)).sort((a, b) => a.at.localeCompare(b.at)).at(-1);
  return end?.id === e.id ? h : null;
}

/** A migração 0008 (Etapa 4) já rodou? No modo demonstração, sempre. */
export const hasV8 = (s: State) => s.mode === 'demo' || !!s.schemaV8;

/** Nomes de quem já jogou com você, dos mais frequentes aos menos (para sugerir na sessão). */
export function knownCompanions(s: State): string[] {
  const n = new Map<string, number>();
  for (const x of s.sessions) for (const c of x.companions ?? []) n.set(c, (n.get(c) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 12);
}

export const MAX_FOCUS = 3;

/**
 * Jornadas em foco (até três, a primeira é a principal), escolhidas pela pessoa.
 * Sem escolha, o foco é a Jornada da sessão aberta, ou a da sessão mais recente.
 */
export function focusJourneys(s: State): { journey: Journey; chosen: boolean }[] {
  const ids = s.prefs.focusIds ?? (s.prefs.focusJourneyId ? [s.prefs.focusJourneyId] : s.prefs.focusJourneyId === null ? [] : s.focusJourneyId ? [s.focusJourneyId] : []);
  const chosen = ids.map((id) => s.journeys.find((j) => j.id === id))
    .filter((j): j is Journey => !!j && isOpenState(currentHistory(s, j.id)?.state))
    .slice(0, MAX_FOCUS).map((journey) => ({ journey, chosen: true }));
  if (chosen.length) return chosen;
  const open = openSession(s);
  const byOpen = open && s.journeys.find((j) => j.id === open.journeyId);
  if (byOpen) return [{ journey: byOpen, chosen: false }];
  const recent = [...s.sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((x) => s.journeys.find((j) => j.id === x.journeyId))
    .find((j) => j && isOpenState(currentHistory(s, j.id)?.state));
  return recent ? [{ journey: recent, chosen: false }] : [];
}

/** A Jornada principal em foco (Início, botão de jogar). */
export function focusJourney(s: State): { journey: Journey; chosen: boolean } | null {
  return focusJourneys(s)[0] ?? null;
}

/** Sessão aberta há tanto tempo que provavelmente foi esquecida. */
export const FORGOTTEN_AFTER_H = 5;
export function forgottenSession(s: State, now = Date.now()) {
  const o = openSession(s);
  return o && now - new Date(o.startedAt).getTime() > FORGOTTEN_AFTER_H * 3_600_000 ? o : null;
}

export function eventsOf(s: State, journeyId: ID) {
  return s.events.filter((e) => e.journeyId === journeyId).sort((a, b) => a.at.localeCompare(b.at));
}
export function activeWaypoints(s: State, journeyId: ID) {
  return eventsOf(s, journeyId).filter((e) => e.kind === 'ponto' && !e.resolved);
}

/* ------------------------------------------------------------------ */
/* Ações de alto nível                                                 */
/* ------------------------------------------------------------------ */

const STATE_EVENT: Record<string, { title: string; text: (note?: string) => string }> = {
  pausada: { title: 'Pausou', text: (n) => n || 'Uma pausa, sem pressa.' },
  dropada: { title: 'Largou', text: (n) => n || 'Não encaixou agora. Sem culpa.' },
  encerrada: { title: 'Encerrou', text: (n) => n || 'Terminou do seu jeito, sem zerar.' },
  ativa: { title: 'Retomou', text: (n) => n || 'De volta à História.' },
};

export const actions = {
  setPrefs(prefs: Partial<Prefs>) { dispatch({ type: 'prefs', prefs }); },
  /** O nome no site é o @ escolhido (já gravado no banco pela função do perfil). */
  setProfileName(name: string) { dispatch({ type: 'profile.name', name }); },
  setProfileAvatar(url: string | null) { dispatch({ type: 'profile.avatar', url }); },
  /** Mostrar (ou esconder) uma Jornada no perfil público. */
  shareJourney(journeyId: ID, shared: boolean) { dispatch({ type: 'journey.share', journeyId, shared }); },

  toggleFavorite(gameId: ID) {
    const value = !state.favorites.includes(gameId);
    dispatch({ type: 'favorite', gameId, value });
    return value;
  },

  toggleWish(gameId: ID) {
    const value = !state.wishes.some((w) => w.gameId === gameId);
    dispatch({ type: 'wish', gameId, value });
    return value;
  },

  /**
   * "Jogar": cria a Jornada e a primeira História se ainda não existirem. Sem formulário.
   * História pausada ou largada é retomada; zerada ou encerrada abre uma História nova.
   */
  play(gameId: ID): Session {
    track('jornada.jogar');
    const existing = openSession(state);
    if (existing) return existing; // nunca troca a sessão aberta silenciosamente
    let journey = journeyForGame(state, gameId);
    let history = journey ? currentHistory(state, journey.id) : null;
    if (journey && history && (history.state === 'pausada' || history.state === 'dropada')) {
      actions.setHistoryState(history.id, 'ativa');
      history = state.histories.find((h) => h.id === history!.id)!;
    }
    if (!journey || !history || history.state === 'concluida' || history.state === 'encerrada') {
      const at = nowIso();
      const isNewJourney = !journey;
      journey = journey ?? { id: uid(), gameId, mood: 'jogando', createdAt: at };
      const ordinal = isNewJourney ? 1 : nextOrdinal(state, journey.id);
      history = { id: uid(), journeyId: journey.id, ordinal, title: ordinal === 1 ? 'Primeira vez' : 'Rejogada', state: 'ativa', startedAt: at, progress: 0 };
      const event: TimelineEvent = { id: uid(), journeyId: journey.id, historyId: history.id, kind: 'inicio', at, title: history.title, text: ordinal === 1 ? 'Começou sua primeira História com o jogo.' : 'Uma nova História. As anteriores continuam guardadas.' };
      if (isNewJourney) dispatch({ type: 'journey.create', journey, history, event });
      else dispatch({ type: 'history.create', history, event });
    }
    const session: Session = { id: uid(), journeyId: journey.id, historyId: history.id, startedAt: nowIso() };
    dispatch({ type: 'session.start', session });
    return session;
  },

  /** Pausar, largar, encerrar ou retomar. Um toque; o recado é opcional. */
  setHistoryState(historyId: ID, next: 'ativa' | 'pausada' | 'dropada' | 'encerrada', note?: string) {
    track(`jornada.estado.${next}`);
    const h = state.histories.find((x) => x.id === historyId);
    if (!h || h.state === next) return;
    const j = state.journeys.find((x) => x.id === h.journeyId)!;
    const at = nowIso();
    const meta = STATE_EVENT[next];
    const event: TimelineEvent = { id: uid(), journeyId: h.journeyId, historyId, kind: 'marco', at, title: meta.title, text: meta.text(note?.trim()) };
    const closing = next === 'encerrada' || next === 'dropada';
    const history: History = { ...h, state: next, note: note?.trim() || (next === 'ativa' ? undefined : h.note), completedAt: closing ? at : next === 'ativa' ? undefined : h.completedAt, completedPrecision: closing ? 'dia' : h.completedPrecision };
    const journey: Journey = { ...j, mood: next === 'pausada' ? 'pausado' : 'jogando', pausedNote: next === 'pausada' ? note?.trim() || undefined : undefined };
    // Uma sessão aberta deste jogo é fechada junto quando a História para.
    const open = openSession(state);
    if (open && open.historyId === historyId && next !== 'ativa') actions.finishSession(open.id, {});
    dispatch({ type: 'history.update', history, event, journey });
    if (next !== 'ativa' && next !== 'pausada') {
      const ids = (state.prefs.focusIds ?? []).filter((id) => id !== j.id);
      if (ids.length !== (state.prefs.focusIds ?? []).length) dispatch({ type: 'prefs', prefs: { focusIds: ids } });
    }
  },

  /**
   * "Já zerei" (ou "joguei antes"): registra uma História do passado sem abrir sessão.
   * Se há uma História em andamento, é ela que termina agora.
   */
  recordPast(gameId: ID, opts: { state?: 'concluida' | 'encerrada' | 'dropada'; when?: { iso: string; precision: DatePrecision }; hours?: number } = {}): ID {
    const finalState = opts.state ?? 'concluida';
    track('jornada.ja-zerei');
    let journey = journeyForGame(state, gameId);
    const cur = journey ? currentHistory(state, journey.id) : null;
    if (cur && isOpenState(cur.state) && !opts.when) {
      if (finalState === 'concluida') actions.completeHistory(cur.id);
      else actions.setHistoryState(cur.id, finalState);
      if (opts.hours != null) actions.updateHistory(cur.id, { hours: opts.hours });
      return cur.id;
    }
    const when = opts.when ?? { iso: nowIso(), precision: 'desconhecida' as DatePrecision };
    const isNewJourney = !journey;
    journey = journey ?? { id: uid(), gameId, mood: 'jogando' };
    const ordinal = isNewJourney ? 1 : nextOrdinal(state, journey.id);
    const title = ordinal === 1 ? 'Primeira vez' : 'Outra vez';
    const history: History = {
      id: uid(), journeyId: journey.id, ordinal, title, state: finalState,
      startedAt: when.iso, startedPrecision: 'desconhecida', completedAt: when.iso, completedPrecision: when.precision,
      progress: finalState === 'concluida' ? 100 : undefined, hours: opts.hours,
    };
    const word = finalState === 'concluida' ? (ordinal > 1 ? 'Zerou de novo' : 'Zerou') : finalState === 'encerrada' ? 'Encerrou' : 'Largou';
    const event: TimelineEvent = {
      id: uid(), journeyId: journey.id, historyId: history.id, kind: 'marco', at: when.iso, precision: when.precision, title: word,
      text: `Registrado depois${opts.hours ? `, ${String(opts.hours).replace('.', ',')} horas informadas` : ''}.`,
    };
    if (isNewJourney) dispatch({ type: 'journey.create', journey, history, event });
    else dispatch({ type: 'history.create', history, event });
    return history.id;
  },

  /** Corrige uma História: título, datas, horas, recado. O marco de conclusão acompanha a data. */
  updateHistory(historyId: ID, patch: Partial<Pick<History, 'title' | 'startedAt' | 'startedPrecision' | 'completedAt' | 'completedPrecision' | 'hours' | 'note' | 'mode' | 'state' | 'progress'>>) {
    const h = state.histories.find((x) => x.id === historyId);
    if (!h) return;
    dispatch({ type: 'history.update', history: { ...h, ...patch } });
    if (patch.completedAt || patch.completedPrecision) {
      // O marco que corresponde ao estado atual (um "Largou" antigo, de antes de retomar, fica onde está).
      const word = (patch.state ?? h.state) === 'concluida' ? /^Zerou/ : (patch.state ?? h.state) === 'encerrada' ? /^Encerrou/ : /^Largou/;
      const end = [...eventsOf(state, h.journeyId)].reverse().find((e) => e.historyId === historyId && e.kind === 'marco' && word.test(e.title));
      if (end) dispatch({ type: 'event.update', eventId: end.id, patch: { at: patch.completedAt ?? end.at, precision: patch.completedPrecision ?? end.precision } });
    }
    if (patch.startedAt || patch.startedPrecision) {
      const start = eventsOf(state, h.journeyId).find((e) => e.historyId === historyId && e.kind === 'inicio');
      if (start) dispatch({ type: 'event.update', eventId: start.id, patch: { at: patch.startedAt ?? start.at, precision: patch.startedPrecision ?? start.precision } });
    }
  },

  /** Guarda a Cápsula de Retomada da História (campos vazios saem). */
  setCapsule(historyId: ID, capsule: Capsule) {
    const h = state.histories.find((x) => x.id === historyId);
    if (!h) return;
    const clean = Object.fromEntries(Object.entries(capsule).filter(([k, v]) => k === 'ai' ? v : typeof v === 'string' ? v.trim() : v != null).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])) as Capsule;
    const empty = !clean.where && !clean.doing && !clean.next && !clean.remember;
    track(capsule.ai ? 'retomada.capsula-ia' : 'retomada.capsula');
    dispatch({ type: 'history.update', history: { ...h, capsule: empty ? undefined : { ...clean, updatedAt: nowIso() } } });
  },

  deleteHistory(historyId: ID) {
    const h = state.histories.find((x) => x.id === historyId);
    if (!h) return;
    const imagePaths = state.events.filter((e) => e.historyId === historyId && e.imagePath).map((e) => e.imagePath!);
    const remaining = state.histories.filter((x) => x.journeyId === h.journeyId && x.id !== historyId);
    if (!remaining.length) return actions.deleteJourney(h.journeyId);
    dispatch({ type: 'history.delete', historyId, imagePaths });
  },

  deleteJourney(journeyId: ID) {
    const imagePaths = state.events.filter((e) => e.journeyId === journeyId && e.imagePath).map((e) => e.imagePath!);
    dispatch({ type: 'journey.delete', journeyId, imagePaths });
  },

  addMoment(sessionId: ID, data: { id?: ID; title?: string; text?: string; quote?: string; image?: string; imagePath?: string; kind?: EventKind }): ID | null {
    const ses = state.sessions.find((x) => x.id === sessionId);
    if (!ses) return null;
    const kind = data.kind ?? 'momento';
    const id = data.id ?? uid();
    dispatch({
      type: 'event.add',
      event: { id, journeyId: ses.journeyId, historyId: ses.historyId, sessionId, kind, at: nowIso(), title: data.title ?? (kind === 'ponto' ? 'Quero voltar aqui' : 'Momento guardado'), text: data.text, quote: data.quote, image: data.image, imagePath: data.imagePath },
    });
    return id;
  },

  /** Momento de antes (ex.: de uma captura de tela), na data em que aconteceu, sem sessão. */
  addPastMoment(historyId: ID, data: { id?: ID; at: string; title?: string; text?: string; image?: string; imagePath?: string; precision?: DatePrecision }): ID | null {
    const h = state.histories.find((x) => x.id === historyId);
    if (!h) return null;
    const id = data.id ?? uid();
    dispatch({ type: 'event.add', event: { id, journeyId: h.journeyId, historyId, kind: 'momento', at: data.at, precision: data.precision ?? 'dia', title: data.title || 'Captura de tela', text: data.text, image: data.image, imagePath: data.imagePath } });
    return id;
  },

  /* Foco ----------------------------------------------------------------- */
  /** Põe em foco. Retorna false quando já há três jogos em foco. */
  addFocus(journeyId: ID): boolean {
    track('jornada.foco');
    const ids = focusJourneys(state).filter((f) => f.chosen).map((f) => f.journey.id);
    if (ids.includes(journeyId)) return true;
    if (ids.length >= MAX_FOCUS) return false;
    dispatch({ type: 'prefs', prefs: { focusIds: [...ids, journeyId], focusJourneyId: null } });
    return true;
  },
  removeFocus(journeyId: ID) {
    const ids = focusJourneys(state).filter((f) => f.chosen).map((f) => f.journey.id).filter((id) => id !== journeyId);
    dispatch({ type: 'prefs', prefs: { focusIds: ids, focusJourneyId: null } });
  },
  makePrincipal(journeyId: ID) {
    const ids = focusJourneys(state).filter((f) => f.chosen).map((f) => f.journey.id).filter((id) => id !== journeyId);
    dispatch({ type: 'prefs', prefs: { focusIds: [journeyId, ...ids].slice(0, MAX_FOCUS), focusJourneyId: null } });
  },
  /** Compatibilidade: definir (ou limpar) o foco principal. */
  setFocus(journeyId: ID | null) {
    if (journeyId) actions.makePrincipal(journeyId);
    else dispatch({ type: 'prefs', prefs: { focusIds: [], focusJourneyId: null } });
  },

  /* Acontecimentos e sessões ------------------------------------------------ */
  updateEventPhoto(eventId: ID, patch: { image?: string; imagePath?: string }) { dispatch({ type: 'event.update', eventId, patch }); },
  updateEvent(eventId: ID, patch: EventPatch) { track('jornada.editar'); dispatch({ type: 'event.update', eventId, patch }); },
  deleteEvent(eventId: ID) {
    const e = state.events.find((x) => x.id === eventId);
    if (!e) return;
    // Apagar o marco que fechou a História ("Zerou", "Largou", "Encerrou") desfaz o fechamento.
    const h = closedBy(state, e);
    if (h) return actions.reopenHistory(h.id);
    dispatch({ type: 'event.delete', eventId, imagePath: e.imagePath });
  },

  /**
   * Desfaz o fim de uma História (ex.: zerou só para testar): o marco de fim sai e ela volta a ficar em andamento,
   * com sessões e momentos. Se ela era só o registro do "Já zerei", sem mais nada, a História inteira sai.
   */
  reopenHistory(historyId: ID) {
    const h = state.histories.find((x) => x.id === historyId);
    if (!h || !isClosedState(h.state)) return;
    const end = state.events.find((x) => x.historyId === h.id && closedBy(state, x));
    const hasLife = state.sessions.some((x) => x.historyId === h.id) || state.events.some((x) => x.historyId === h.id && x.id !== end?.id);
    track('jornada.desfazer-fim');
    if (!hasLife) return actions.deleteHistory(h.id);
    if (end) dispatch({ type: 'event.delete', eventId: end.id, imagePath: end.imagePath });
    const j = state.journeys.find((x) => x.id === h.journeyId);
    dispatch({
      type: 'history.update',
      history: { ...h, state: 'ativa', completedAt: undefined, completedPrecision: undefined, progress: h.state === 'concluida' && h.progress === 100 ? undefined : h.progress },
      journey: j ? { ...j, mood: 'jogando', pausedNote: undefined } : undefined,
    });
  },

  finishSession(sessionId: ID, data: { note?: string; whereStopped?: string; feeling?: string; minutes?: number; progress?: number; endedAt?: string; companions?: string[] }) {
    const ses = state.sessions.find((x) => x.id === sessionId);
    if (!ses) return;
    const at = data.endedAt ?? nowIso();
    const n = sessionsOf(state, ses.historyId).findIndex((x) => x.id === sessionId) + 1;
    const companions = (data.companions ?? []).map((x) => x.trim()).filter(Boolean).slice(0, 8);
    const done: Session = { ...ses, endedAt: at, note: data.note || undefined, whereStopped: data.whereStopped || undefined, feeling: data.feeling, minutes: data.minutes, companions: companions.length ? companions : undefined };
    const withText = companions.length ? `Com ${companions.length > 1 ? `${companions.slice(0, -1).join(', ')} e ${companions.at(-1)}` : companions[0]}.` : '';
    const text = [done.whereStopped ? `Parou em: ${done.whereStopped}.` : '', withText].filter(Boolean).join(' ') || undefined;
    const event: TimelineEvent = { id: uid(), journeyId: ses.journeyId, historyId: ses.historyId, sessionId, kind: 'sessao', at, title: `Sessão ${n}`, quote: done.note, text };
    dispatch({ type: 'session.finish', session: done, event, progress: data.progress != null ? { historyId: ses.historyId, value: data.progress } : undefined });
  },

  updateSession(sessionId: ID, patch: Partial<Pick<Session, 'minutes' | 'note' | 'whereStopped' | 'feeling'>>) {
    const ses = state.sessions.find((x) => x.id === sessionId);
    if (ses) dispatch({ type: 'session.update', session: { ...ses, ...patch } });
  },

  /** Apaga a sessão (ex.: aberta sem querer). Momentos guardados nela ficam na linha do tempo. */
  deleteSession(sessionId: ID) { track('sessao.apagar'); dispatch({ type: 'session.delete', sessionId }); },

  setProgress(historyId: ID, value: number) {
    dispatch({ type: 'progress', historyId, value: Math.max(0, Math.min(100, Math.round(value))) });
  },

  resolveWaypoint(eventId: ID) { dispatch({ type: 'event.resolve', eventId }); },

  /** "Zerei": marco de conclusão. Repetir não duplica. */
  completeHistory(historyId: ID) {
    const h = state.histories.find((x) => x.id === historyId);
    if (!h || h.state === 'concluida') return;
    const at = nowIso();
    const event: TimelineEvent = { id: uid(), journeyId: h.journeyId, historyId, kind: 'marco', at, title: h.ordinal > 1 ? 'Zerou de novo' : 'Zerou', text: h.ordinal > 1 ? `História ${h.ordinal} concluída. As anteriores continuam guardadas.` : 'Primeira História concluída.' };
    dispatch({ type: 'history.complete', history: { ...h, state: 'concluida', completedAt: at, completedPrecision: 'dia', progress: 100 }, event });
    const j = state.journeys.find((x) => x.id === h.journeyId);
    if (j && (state.prefs.focusIds ?? []).includes(j.id)) dispatch({ type: 'prefs', prefs: { focusIds: (state.prefs.focusIds ?? []).filter((id) => id !== j.id) } });
  },

  /* Coleção ------------------------------------------------------------------ */
  addCopy(copy: Omit<Copy, 'id'>) {
    const full = { ...copy, id: uid(), createdAt: nowIso() };
    dispatch({ type: 'copy.add', copy: full });
    return full;
  },
  updateCopy(copyId: ID, patch: Partial<Omit<Copy, 'id' | 'gameId'>>) {
    const c = state.copies.find((x) => x.id === copyId);
    if (c) { track('colecao.editar-copia'); dispatch({ type: 'copy.update', copy: { ...c, ...patch } }); }
  },
  deleteCopy(copyId: ID) { dispatch({ type: 'copy.delete', copyId }); },
  /** Exemplar ligado ao jogo errado do catálogo: passa só ele para o jogo certo. */
  moveCopy(copyId: ID, to: Game) {
    const c = state.copies.find((x) => x.id === copyId);
    if (!c || c.gameId === to.id) return;
    track('colecao.trocar-jogo');
    dispatch({ type: 'copy.update', copy: { ...c, gameId: to.id } });
  },
  addHardware(hw: Omit<Hardware, 'id' | 'createdAt'>) {
    const full: Hardware = { ...hw, id: uid(), createdAt: new Date().toISOString() };
    track('colecao.console');
    dispatch({ type: 'hardware.add', hw: full });
    return full;
  },
  updateHardware(hw: Hardware) { dispatch({ type: 'hardware.update', hw }); },
  deleteHardware(id: ID) { dispatch({ type: 'hardware.delete', id }); },
  restoreFromTrash(what: 'copy' | 'hardware', id: ID) { dispatch({ type: 'trash.restore', what, id }); },
  purgeFromTrash(what: 'copy' | 'hardware', id: ID) { dispatch({ type: 'trash.purge', what, id }); },
  emptyTrash() { dispatch({ type: 'trash.empty' }); },

  /* Empréstimos ------------------------------------------------------------- */
  lend(item: { copyId?: ID; hardwareId?: ID }, data: { person: string; lentOn?: string; dueOn?: string; note?: string }) {
    track('colecao.emprestar');
    const loan: Loan = { id: uid(), ...item, person: data.person.trim(), lentOn: data.lentOn || localDay(), dueOn: data.dueOn || undefined, note: data.note?.trim() || undefined, createdAt: nowIso() };
    dispatch({ type: 'loan.save', loan });
    return loan;
  },
  updateLoan(loan: Loan) { dispatch({ type: 'loan.save', loan }); },
  returnLoan(id: ID, on = localDay()) {
    const l = state.loans.find((x) => x.id === id);
    if (l) { track('colecao.devolvido'); dispatch({ type: 'loan.save', loan: { ...l, returnedOn: on } }); }
  },
  deleteLoan(id: ID) { dispatch({ type: 'loan.delete', id }); },

  /* Vitrines ---------------------------------------------------------------- */
  saveShowcase(sc: Omit<Showcase, 'id' | 'position'> & { id?: ID; position?: number }) {
    const old = sc.id ? state.showcases.find((x) => x.id === sc.id) : undefined;
    if (!old) track('colecao.vitrine-nova');
    const full: Showcase = { ...old, ...sc, id: sc.id ?? uid(), position: sc.position ?? old?.position ?? Math.max(-1, ...state.showcases.map((x) => x.position)) + 1, createdAt: old?.createdAt ?? nowIso() } as Showcase;
    dispatch({ type: 'showcase.save', sc: full });
    return full;
  },
  deleteShowcase(id: ID) { dispatch({ type: 'showcase.delete', id }); },
  orderShowcases(ids: ID[]) { dispatch({ type: 'showcases.order', ids }); },

  /* Museu ------------------------------------------------------------------- */
  setMuseum(m: Museum) { dispatch({ type: 'museum.meta', museum: { ...state.museum, ...m } }); },
  saveRoom(room: Omit<MuseumRoom, 'id' | 'position'> & { id?: ID; position?: number }) {
    const old = room.id ? state.rooms.find((x) => x.id === room.id) : undefined;
    if (!old) track('colecao.museu-sala');
    const full: MuseumRoom = { ...old, ...room, id: room.id ?? uid(), position: room.position ?? old?.position ?? Math.max(-1, ...state.rooms.map((x) => x.position)) + 1, createdAt: old?.createdAt ?? nowIso() } as MuseumRoom;
    const keep = new Set(full.pieces.flatMap((p) => (p.t === 'f' && p.path ? [p.path] : [])));
    const dropPaths = (old?.pieces ?? []).flatMap((p) => (p.t === 'f' && p.path && !keep.has(p.path) ? [p.path] : []));
    dispatch({ type: 'room.save', room: full, dropPaths });
    return full;
  },
  deleteRoom(id: ID) {
    const r = state.rooms.find((x) => x.id === id);
    const paths = (r?.pieces ?? []).flatMap((p) => (p.t === 'f' && p.path ? [p.path] : []));
    dispatch({ type: 'room.delete', id, paths });
  },
  orderRooms(ids: ID[]) { dispatch({ type: 'rooms.order', ids }); },

  setMyGame(gameId: ID, patch: Partial<Omit<MyGame, 'gameId'>>) {
    dispatch({ type: 'mygame.set', mine: { ...myGame(state, gameId), ...patch, gameId } });
  },
  toggleRadar(gameId: ID) {
    const value = !myGame(state, gameId).onRadar;
    track(value ? 'radar.acompanhar' : 'radar.deixar');
    actions.setMyGame(gameId, { onRadar: value || undefined });
    return value;
  },
  toggleWontPlay(gameId: ID) {
    const value = !myGame(state, gameId).wontPlay;
    track('colecao.nao-vou-jogar');
    actions.setMyGame(gameId, { wontPlay: value });
    return value;
  },

  /* Jogos ----------------------------------------------------------------------- */
  mergeGames(games: Game[]) { dispatch({ type: 'games.merge', games }); },

  /** Jogo sem ficha do IGDB (ex.: vindo da planilha). Pode ser ligado ao IGDB depois. */
  createManualGame(title: string, extra: Partial<Game> = {}): Game {
    const id = `wz-${uid().replace(/-/g, '').slice(0, 12)}`;
    const game: Game = { platforms: [], cover: '', ...extra, id, slug: `${slugify(title) || 'jogo'}-${id.slice(3, 9)}`, title: title.trim(), source: 'manual', createdBy: state.profile?.id };
    dispatch({ type: 'game.create', game });
    return game;
  },

  /** Troca um jogo pela ficha certa (manual → IGDB, ou IGDB errado → IGDB certo): tudo o que era dele passa para a ficha. */
  relinkGame(fromId: ID, to: Game) {
    if (fromId === to.id) return;
    track('jogos.ligar-igdb');
    const jf = journeyForGame(state, fromId), jt = journeyForGame(state, to.id);
    dispatch({ type: 'game.relink', fromId, to, mergeFrom: jf && jt ? jf.id : undefined, mergeInto: jf && jt ? jt.id : undefined });
  },

  importBulk(data: ImportPayload) { dispatch({ type: 'import.bulk', data }); },

  openLetter(historyId: ID) { dispatch({ type: 'history.letterOpen', historyId, at: nowIso() }); },

  saveReview(gameId: ID, rating: Rating, title: string, text: string, existingId?: ID) {
    const me = state.profile;
    const review: Review = {
      id: existingId ?? state.reviews.find((r) => r.mine && r.gameId === gameId)?.id ?? uid(), gameId, mine: true,
      author: { name: me?.name ?? 'Você', initial: me?.initial ?? 'V', color: '#5A4630' },
      rating, title, text, writtenAt: nowIso(),
    };
    dispatch({ type: 'review.save', review });
  },
};

export function slugify(t: string) {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}
