import type { Rating, Scale } from '../lib/rating';
import type { DatePrecision } from '../lib/dates';

export type { DatePrecision };

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
  /** 'manual' = jogo cadastrado no WinnerZ sem ficha do IGDB (ex.: vindo da planilha). */
  source?: 'igdb' | 'manual';
  createdBy?: ID;
  /** Tempo para zerar em horas (média do IGDB): rápido, normal, completo. */
  ttb?: { h?: number; n?: number; c?: number } | null;
  /** AAAA-MM-DD do primeiro lançamento. */
  releasedOn?: string;
  /** Quando a ficha foi atualizada pela última vez a partir da fonte (para manter os dados em dia). */
  updatedAt?: string;
}

/** Pilar Coleção: exemplar (posse) — separado da relação com o jogo. */
export type CopyKind = 'fisico' | 'digital' | 'assinatura' | 'outro';
export interface Copy {
  id: ID;
  gameId: ID;
  /** Quando entrou na coleção (vem do banco; serve para achar repetidos de uma importação). */
  createdAt?: string;
  platform: string;
  kind: CopyKind;
  items?: string;
  condition?: string;
  origin?: string;
  note?: string;
  special?: boolean;
  region?: string;
  edition?: string;
  boxCondition?: string;
  /** AAAA-MM-DD */
  purchasedOn?: string;
  purchasePlace?: string;
  pricePaid?: number;
  priceNow?: number;
}

/** Consoles, portáteis e acessórios: ficha própria, separada dos jogos. */
export type HardwareKind = 'console' | 'portatil' | 'acessorio';
export interface Hardware {
  id: ID;
  kind: HardwareKind;
  name: string;
  platform?: string;
  model?: string;
  edition?: string;
  region?: string;
  condition?: string;
  items?: string;
  serial?: string;
  origin?: string;
  /** AAAA-MM-DD */
  purchasedOn?: string;
  purchasePlace?: string;
  pricePaid?: number;
  note?: string;
  createdAt?: string;
}

/** Empréstimo de um exemplar ou console. Quem pegou é sempre privado. Voltou = returnedOn preenchido (o histórico fica). */
export interface Loan {
  id: ID;
  copyId?: ID;
  hardwareId?: ID;
  person: string;
  /** AAAA-MM-DD */
  lentOn: string;
  /** Combinado para voltar até (AAAA-MM-DD). */
  dueOn?: string;
  returnedOn?: string;
  note?: string;
  createdAt?: string;
}

/** Peça de uma Vitrine ou do Museu: um exemplar ('c') ou um console ('h'). */
export interface PieceRef { t: 'c' | 'h'; id: ID }

/** Regra de uma Vitrine inteligente: sempre em dia com a coleção. */
export type ShowcaseRuleType = 'favoritos' | 'especial' | 'zerados' | 'plataforma' | 'geracao';
export interface ShowcaseRule { type: ShowcaseRuleType; /** Plataformas (nomes canônicos) para 'plataforma' e 'geracao'. */ platforms?: string[]; /** Chave da sugestão (ex.: 'plat:PlayStation 2'). */ key?: string }

/** Vitrine: uma seleção da coleção para mostrar uma ideia. Curada = você escolhe; inteligente = uma regra escolhe. */
export interface Showcase {
  id: ID;
  title: string;
  description?: string;
  kind: 'curada' | 'inteligente';
  rule?: ShowcaseRule;
  items: PieceRef[];
  position: number;
  /** Mostrar no perfil (só para quem pode ver o pilar Coleção). */
  shared?: boolean;
  createdAt?: string;
}

/** Peça do Museu, com a sua plaquinha. 'm' = momento da Jornada; 'f' = foto sua. */
export type MuseumPiece =
  | { t: 'c' | 'h' | 'm'; id: ID; caption?: string }
  | { t: 'f'; id: ID; caption?: string; /** Caminho no Storage. */ path?: string; /** Endereço para exibir (link temporário ou foto local). */ image?: string };

export interface MuseumRoom {
  id: ID;
  position: number;
  title: string;
  text?: string;
  pieces: MuseumPiece[];
  createdAt?: string;
}

export interface Museum { title?: string; intro?: string; shared?: boolean }

/** Na lixeira: some da coleção e volta com um toque por 30 dias. */
export type Trashed<T> = T & { deletedAt: string };

/** Seus dados sobre um jogo, com ou sem cópia: prioridade, tempo estimado, "não vou jogar". */
export interface MyGame {
  gameId: ID;
  priority?: 1 | 2 | 3;
  estHours?: number;
  wontPlay?: boolean;
  /** Seu gênero para o jogo (ex.: o da sua planilha). */
  genre?: string;
  note?: string;
  /** "Não agora": o "O que jogar" não sugere até esta data (AAAA-MM-DD). */
  notNowUntil?: string;
  notNowReason?: string;
  /** Minutos jogados segundo a Steam (informado pela Steam, nunca estimado). */
  steamMinutes?: number;
  /** Acompanhando no Radar (lançamento, data, adiamento). Não é posse nem desejo. */
  onRadar?: boolean;
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
  startedPrecision?: DatePrecision;
  completedPrecision?: DatePrecision;
  /** Horas informadas pela pessoa para esta História. Nunca calculadas pelo site. */
  hours?: number;
  /** Um recado sobre o estado (ex.: por que largou). */
  note?: string;
  /** Cápsula de Retomada: o que você precisa saber para voltar. */
  capsule?: Capsule;
}

/** Cápsula de Retomada. Tudo opcional. `ai` = partiu de uma sugestão da IA que você confirmou. */
export interface Capsule {
  where?: string;
  doing?: string;
  next?: string;
  remember?: string;
  ai?: boolean;
  updatedAt?: string;
}

export type JourneyMood = 'jogando' | 'silencioso' | 'pausado';
export interface Journey {
  id: ID;
  gameId: ID;
  createdAt?: string;
  mood: JourneyMood;
  pausedNote?: string;
  /** Mostrada no perfil público (vitrine). Só aparece para quem pode ver o pilar Jornada. */
  shared?: boolean;
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
  /** Com quem você jogou (nomes livres). */
  companions?: string[];
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
  precision?: DatePrecision;
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
  /** Jornada que a pessoa colocou "em foco" (versão antiga, um só jogo). */
  focusJourneyId?: ID | null;
  /** Até três Jornadas em foco; a primeira é a principal. */
  focusIds?: ID[];
  /** Fundo escolhido pela pessoa para cada jogo ("Usar como fundo" na galeria). */
  backdrops?: Record<ID, string>;
  /** Tom das celebrações e mensagens. */
  tone?: Tone;
  /** Modo leve: esconde contadores e números (sessões, horas, porcentagens). */
  light?: boolean;
  /** Segredo do endereço do overlay (trocar invalida o endereço antigo). */
  overlayNonce?: string;
}

export type Tone = 'tranquila' | 'encorajadora' | 'bem-humorada';

export interface Profile {
  id: ID;
  name: string;
  initial: string;
  /** Foto do perfil (endereço pronto para usar). */
  avatar?: string | null;
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
  myGames: Record<ID, MyGame>;
  /** Consoles, portáteis e acessórios. */
  hardware: Hardware[];
  /** Lixeira da coleção (30 dias). */
  trashCopies: Trashed<Copy>[];
  trashHardware: Trashed<Hardware>[];
  /** Empréstimos (ativos e o histórico). */
  loans: Loan[];
  showcases: Showcase[];
  museum: Museum;
  rooms: MuseumRoom[];
  /** A migração 0015 (empréstimos, Vitrines e Museu) já rodou? */
  schemaV15?: boolean;
  /** A migração 0014 (consoles e lixeira) já rodou? */
  schemaV14?: boolean;
  /** A migração 0004 já rodou? (no modo demonstração, sempre sim) */
  schemaV4: boolean;
  /** A migração 0006 (Etapa 3 e Awards) já rodou? */
  schemaV6?: boolean;
  /** A migração 0008 (Etapa 4: Cápsula, companhia, uso da IA) já rodou? */
  schemaV8?: boolean;
  /** Administração (monta os Awards). */
  isAdmin?: boolean;
  /** Parte dos dados não carregou (rede); ações em massa ficam bloqueadas até recarregar. */
  loadIncomplete?: boolean;
}
