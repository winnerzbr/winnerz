import type { Rating, Scale } from '../lib/rating';

export type ID = string;

/** Pilar Jogos: identidade canônica do jogo (vem do IGDB e fica em cache). */
export interface Game {
  id: ID;
  slug: string;
  igdbId?: number;
  title: string;
  cover: string;
  backdrop?: string;
  year?: number;
  developer?: string;
  publisher?: string;
  platforms: string[];
  genres?: string;
  summary?: string;
  summarySource?: string;
  /** Sinopse original do IGDB, quando a de cima foi traduzida. */
  summaryOriginal?: string;
  themes?: string[];
  /** Modos de jogo e perspectivas (nomes do IGDB). */
  modes?: string[];
  releases?: { platform: string; date: string }[];
  screenshots?: string[];
  artworks?: string[];
  /** Vídeos do YouTube listados no IGDB. Ausente = ficha antiga, ainda sem mídia. */
  videos?: { id: string; name: string }[];
}

/** Pilar Coleção: exemplar (posse) — separado da relação com o jogo. */
export type CopyKind = 'fisico' | 'digital' | 'assinatura' | 'outro';
export interface Copy {
  id: ID;
  gameId: ID;
  platform: string;
  kind: CopyKind;
  items?: string;
  condition?: string;
  origin?: string;
  note?: string;
  special?: boolean;
}

export interface Wish {
  gameId: ID;
  note?: string;
}

/** Pilar Jornada */
export type HistoryState = 'ativa' | 'pausada' | 'concluida' | 'encerrada' | 'dropada';
export interface History {
  id: ID;
  journeyId: ID;
  ordinal: number;
  title: string;
  state: HistoryState;
  startedAt: string;
  completedAt?: string;
  progress?: number; // 0..100, sempre informado pelo usuário
  mode?: string; // ex.: "Implacável"
  letter?: { text: string; openedAt?: string };
}

export type JourneyMood = 'jogando' | 'silencioso' | 'pausado';
export interface Journey {
  id: ID;
  gameId: ID;
  mood: JourneyMood;
  pausedNote?: string;
}

export interface Session {
  id: ID;
  journeyId: ID;
  historyId: ID;
  startedAt: string;
  endedAt?: string;
  minutes?: number;
  note?: string; // recado para a próxima vez
  whereStopped?: string;
  feeling?: string;
}

export type EventKind = 'inicio' | 'sessao' | 'momento' | 'ponto' | 'marco' | 'carta';
export interface TimelineEvent {
  id: ID;
  journeyId: ID;
  historyId: ID;
  kind: EventKind;
  at: string;
  title: string;
  text?: string;
  quote?: string;
  /** Endereço para exibir a foto (link temporário do Storage, foto local ou da demonstração). */
  image?: string;
  /** Onde a foto mora no Storage: momentos/<pessoa>/<momento>.jpg. */
  imagePath?: string;
  sessionId?: ID;
  resolved?: boolean;
  dateLabel?: string; // para registros com precisão menor (ex.: "jun a ago 2020")
}

/** Pilar Jogos: análises */
export interface Review {
  id: ID;
  gameId: ID;
  mine: boolean;
  author: { name: string; initial: string; color: string };
  rating: Rating;
  title: string;
  text: string;
  context?: string;
  spoiler?: boolean;
  useful?: number;
  writtenAt: string;
}

export interface Prefs {
  theme: 'escuro' | 'claro';
  black: number; // 0..100
  scale: Scale;
  motion: 'completas' | 'discretas' | 'reduzidas';
  /** Jornada que a pessoa colocou "em foco" (fica destacada no Início e na Jornada). */
  focusJourneyId?: ID | null;
}

export interface Profile {
  id: ID;
  name: string;
  initial: string;
}

export interface State {
  ready: boolean;
  mode: 'demo' | 'supabase';
  profile: Profile | null;
  prefs: Prefs;
  games: Record<ID, Game>;
  copies: Copy[];
  wishes: Wish[];
  favorites: ID[];
  journeys: Journey[];
  histories: History[];
  sessions: Session[];
  events: TimelineEvent[];
  reviews: Review[];
  reviewStats: Record<ID, { count: number; avg: number; dist10: number[] }>;
  focusJourneyId?: ID;
}
