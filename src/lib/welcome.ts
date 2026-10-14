import type { Game, ID, State } from '../data/types';

/**
 * Início para quem acabou de chegar ("Boas-vindas").
 * Aparece enquanto a pessoa não tem nada em andamento e ainda tem poucos jogos marcados, até ela dispensar.
 */

/** Quantos jogos diferentes a pessoa já marcou (estante, desejos e Jornadas). */
export function markedGames(s: Pick<State, 'copies' | 'wishes' | 'journeys'>): number {
  return new Set<ID>([...s.copies.map((c) => c.gameId), ...s.wishes.map((w) => w.gameId), ...s.journeys.map((j) => j.gameId)]).size;
}

/** A partir de quantos jogos o Início de sempre já tem o que mostrar. */
export const WELCOME_UNTIL = 12;

export function isNewcomer(s: Pick<State, 'prefs' | 'copies' | 'wishes' | 'journeys' | 'histories'>): boolean {
  if (s.prefs.welcomeDone) return false;
  const open = new Set(s.histories.filter((h) => h.state === 'ativa' || h.state === 'pausada').map((h) => h.journeyId));
  if (s.journeys.some((j) => open.has(j.id))) return false;
  return markedGames(s) < WELCOME_UNTIL;
}

/**
 * Espalha posições (em %) para que fiquem a pelo menos `gap` uma da outra, sem sair de [min, max].
 * Mantém a ordem; se não couber, divide o espaço por igual.
 */
export function spread(xs: number[], min: number, max: number, gap: number): number[] {
  if (!xs.length) return [];
  const y = xs.map((x) => Math.min(max, Math.max(min, x)));
  for (let i = 1; i < y.length; i++) y[i] = Math.max(y[i], y[i - 1] + gap);
  if (y[y.length - 1] > max) {
    y[y.length - 1] = max;
    for (let i = y.length - 2; i >= 0; i--) y[i] = Math.min(y[i], y[i + 1] - gap);
  }
  if (y[0] < min) {
    if (y.length === 1) return [min];
    const step = (max - min) / (y.length - 1);
    return y.map((_, i) => min + i * step);
  }
  return y;
}

export type LineKind = 'zerado' | 'tenho' | 'quero';
export interface LineEntry { game: Game; kind: LineKind; at?: string }
export interface Placed extends LineEntry { x: number }

/** Faixas da linha da vida, em % da largura. O sol de hoje fica em SUN_X. */
export const SUN_X = 66;
const PAST: [number, number] = [4, 46];
const SHELF: [number, number] = [51, 60];

/** Ano (aproximado) em que o jogo saiu, para pôr o zerado no lugar certo do passado. */
const yearOf = (g: Game) => g.year ?? (g.releasedOn ? Number(g.releasedOn.slice(0, 4)) : undefined);

/**
 * Monta a linha: zerados no ano em que saíram (do mais antigo ao mais novo), a estante perto do sol de hoje
 * e os desejos depois dele, até onde começam os marcos do calendário.
 */
export function lifeLine(entries: LineEntry[], opts: { thisYear: number; firstYear?: number; maxPast?: number; maxShelf?: number; maxWish?: number; wishEnd?: number; gap?: number }): Placed[] {
  const first = opts.firstYear ?? 1985;
  const gap = opts.gap ?? 4.6;
  const span = Math.max(1, opts.thisYear - first);
  const past = entries.filter((e) => e.kind === 'zerado')
    .map((e) => ({ e, y: yearOf(e.game) ?? opts.thisYear }))
    .sort((a, b) => a.y - b.y || a.e.game.title.localeCompare(b.e.game.title))
    .slice(-(opts.maxPast ?? 6));
  const px = spread(past.map(({ y }) => PAST[0] + ((Math.min(Math.max(y, first), opts.thisYear) - first) / span) * (PAST[1] - PAST[0])), PAST[0], PAST[1], gap);
  const newest = (a: LineEntry, b: LineEntry) => (b.at ?? '').localeCompare(a.at ?? '');
  const shelf = entries.filter((e) => e.kind === 'tenho').sort(newest).slice(0, opts.maxShelf ?? 3).reverse();
  const sx = spread(shelf.map((_, i) => SHELF[1] - (shelf.length - 1 - i) * gap), SHELF[0], SHELF[1], gap);
  const wish = entries.filter((e) => e.kind === 'quero').sort(newest).slice(0, opts.maxWish ?? 3);
  const wEnd = opts.wishEnd ?? 94;
  const wx = spread(wish.map((_, i) => SUN_X + 8 + i * (gap + 2)), SUN_X + 8, wEnd, gap);
  return [
    ...past.map(({ e }, i) => ({ ...e, x: px[i] })),
    ...shelf.map((e, i) => ({ ...e, x: sx[i] })),
    ...wish.map((e, i) => ({ ...e, x: wx[i] })),
  ];
}

/** Os quatro primeiros passos, com o que já foi feito. */
export interface StepsInput { marked: number; sessions: number; top: number; avatar: boolean }
export function stepsDone(i: StepsInput): [boolean, boolean, boolean, boolean] {
  return [i.marked >= 3, i.sessions > 0, i.top >= 3, i.avatar];
}
