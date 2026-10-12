import { useSyncExternalStore } from 'react';
import type { State, Prefs, Session, TimelineEvent, History, Journey, ID, EventKind, Review, Game, Copy } from './types';
import type { Rating } from '../lib/rating';

/**
 * Store único do app. Todas as telas leem daqui e chamam as ações daqui.
 * As ações atualizam a tela na hora (otimista) e o "adaptador" grava:
 *  - modo demonstração: localStorage do navegador;
 *  - modo Supabase: tabelas do banco (ver supabaseAdapter.ts).
 */

export type Action =
  | { type: 'prefs'; prefs: Partial<Prefs> }
  | { type: 'favorite'; gameId: ID; value: boolean }
  | { type: 'wish'; gameId: ID; value: boolean }
  | { type: 'journey.create'; journey: Journey; history: History; event: TimelineEvent }
  | { type: 'history.create'; history: History; event: TimelineEvent }
  | { type: 'session.start'; session: Session }
  | { type: 'session.finish'; session: Session; event: TimelineEvent; progress?: { historyId: ID; value: number } }
  | { type: 'event.add'; event: TimelineEvent }
  | { type: 'event.resolve'; eventId: ID }
  | { type: 'event.update'; eventId: ID; patch: Pick<Partial<TimelineEvent>, 'image' | 'imagePath'> }
  | { type: 'progress'; historyId: ID; value: number }
  | { type: 'history.complete'; history: History; event: TimelineEvent }
  | { type: 'history.letterOpen'; historyId: ID; at: string }
  | { type: 'review.save'; review: Review }
  | { type: 'games.merge'; games: Game[] }
  | { type: 'copy.add'; copy: Copy }
  | { type: 'reviews.merge'; gameId: ID; reviews: Review[]; stats?: State['reviewStats'][string] };

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
    sessions: [], events: [], reviews: [], reviewStats: {},
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

/* ------------------------------------------------------------------ */
/* Seletores                                                           */
/* ------------------------------------------------------------------ */

export const uid = () => (globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
export const nowIso = () => new Date().toISOString();

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
export function eventsOf(s: State, journeyId: ID) {
  return s.events.filter((e) => e.journeyId === journeyId).sort((a, b) => a.at.localeCompare(b.at));
}
export function activeWaypoints(s: State, journeyId: ID) {
  return eventsOf(s, journeyId).filter((e) => e.kind === 'ponto' && !e.resolved);
}

/* ------------------------------------------------------------------ */
/* Ações de alto nível                                                 */
/* ------------------------------------------------------------------ */

export const actions = {
  setPrefs(prefs: Partial<Prefs>) { dispatch({ type: 'prefs', prefs }); },

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

  /** "Jogar": cria a Jornada e a primeira História se ainda não existirem. Sem formulário. */
  play(gameId: ID): Session {
    const existing = openSession(state);
    if (existing) return existing; // nunca troca a sessão aberta silenciosamente
    let journey = journeyForGame(state, gameId);
    let history = journey ? currentHistory(state, journey.id) : null;
    if (!journey || !history || history.state === 'concluida' || history.state === 'encerrada') {
      const at = nowIso();
      const isNewJourney = !journey;
      journey = journey ?? { id: uid(), gameId, mood: 'jogando' };
      const ordinal = isNewJourney ? 1 : historiesOf(state, journey.id).length + 1;
      history = { id: uid(), journeyId: journey.id, ordinal, title: ordinal === 1 ? 'Primeira vez' : 'Rejogada', state: 'ativa', startedAt: at, progress: 0 };
      const event: TimelineEvent = { id: uid(), journeyId: journey.id, historyId: history.id, kind: 'inicio', at, title: history.title, text: ordinal === 1 ? 'Começou sua primeira História com o jogo.' : 'Uma nova História. As anteriores continuam guardadas.' };
      if (isNewJourney) dispatch({ type: 'journey.create', journey, history, event });
      else dispatch({ type: 'history.create', history, event });
    }
    const session: Session = { id: uid(), journeyId: journey.id, historyId: history.id, startedAt: nowIso() };
    dispatch({ type: 'session.start', session });
    return session;
  },

  addMoment(sessionId: ID, data: { id?: ID; title?: string; quote?: string; image?: string; imagePath?: string; kind?: EventKind }): ID | null {
    const ses = state.sessions.find((x) => x.id === sessionId);
    if (!ses) return null;
    const kind = data.kind ?? 'momento';
    const id = data.id ?? uid();
    dispatch({
      type: 'event.add',
      event: { id, journeyId: ses.journeyId, historyId: ses.historyId, sessionId, kind, at: nowIso(), title: data.title ?? (kind === 'ponto' ? 'Quero voltar aqui' : 'Momento guardado'), quote: data.quote, image: data.image, imagePath: data.imagePath },
    });
    return id;
  },

  updateEventPhoto(eventId: ID, patch: { image?: string; imagePath?: string }) { dispatch({ type: 'event.update', eventId, patch }); },

  finishSession(sessionId: ID, data: { note?: string; whereStopped?: string; feeling?: string; minutes?: number; progress?: number }) {
    const ses = state.sessions.find((x) => x.id === sessionId);
    if (!ses) return;
    const at = nowIso();
    const n = sessionsOf(state, ses.historyId).findIndex((x) => x.id === sessionId) + 1;
    const done: Session = { ...ses, endedAt: at, note: data.note || undefined, whereStopped: data.whereStopped || undefined, feeling: data.feeling, minutes: data.minutes };
    const event: TimelineEvent = { id: uid(), journeyId: ses.journeyId, historyId: ses.historyId, sessionId, kind: 'sessao', at, title: `Sessão ${n}`, quote: done.note, text: done.whereStopped ? `Parou em: ${done.whereStopped}.` : undefined };
    dispatch({ type: 'session.finish', session: done, event, progress: data.progress != null ? { historyId: ses.historyId, value: data.progress } : undefined });
  },

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
    dispatch({ type: 'history.complete', history: { ...h, state: 'concluida', completedAt: at, progress: 100 }, event });
  },

  addCopy(copy: Omit<Copy, 'id'>) {
    dispatch({ type: 'copy.add', copy: { ...copy, id: uid() } });
  },

  mergeGames(games: Game[]) { dispatch({ type: 'games.merge', games }); },

  openLetter(historyId: ID) { dispatch({ type: 'history.letterOpen', historyId, at: nowIso() }); },

  saveReview(gameId: ID, rating: Rating, title: string, text: string, existingId?: ID) {
    const me = state.profile;
    const review: Review = {
      id: existingId ?? uid(), gameId, mine: true,
      author: { name: me?.name ?? 'Você', initial: me?.initial ?? 'V', color: '#5A4630' },
      rating, title, text, writtenAt: nowIso(),
    };
    dispatch({ type: 'review.save', review });
  },
};
