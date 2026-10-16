/**
 * A Chegada (primeira visita em 15 telas): as contas que não dependem de tela. As telas, os capítulos (os cinco
 * emblemas) e as plataformas que a pessoa marca, com o nome do IGDB e se viram console na Coleção.
 */
import type { HardwareKind } from '../data/types';

export type Chapter = 'colecao' | 'jornada' | 'jogos' | 'comunidade' | 'album';
export const CHAPTERS: { key: Chapter; label: string; img: string; first: number }[] = [
  { key: 'colecao', label: 'Coleção', img: '/brand/emb-colecao.webp', first: 1 },
  { key: 'jornada', label: 'Jornada', img: '/brand/emb-jornada.webp', first: 5 },
  { key: 'jogos', label: 'Jogos', img: '/brand/emb-jogos.webp', first: 8 },
  { key: 'comunidade', label: 'Comunidade', img: '/brand/emb-comunidade.webp', first: 10 },
  { key: 'album', label: 'Álbum', img: '/brand/emb-album.webp', first: 12 },
];

/** [capítulo, dica do rodapé, botão de seguir, botão de pular] por tela (0 a 14). */
export const STEPS: [Chapter | 'fim' | null, string, string, string][] = [
  [null, '', 'Começar', ''],
  ['colecao', 'Escolha quantas quiser', 'Continuar', 'Pular esta parte'],
  ['colecao', '', 'Montar a minha vitrine', 'Pular esta parte'],
  ['colecao', 'Vitrine pronta', 'Ver a minha coleção', ''],
  ['colecao', 'Você conheceu a Coleção', 'Seguir para a Jornada', ''],
  ['jornada', '', 'Ver como funciona', 'Não estou jogando nada agora'],
  ['jornada', 'É só uma simulação', 'Continuar', ''],
  ['jornada', '', 'Começar a Jornada', ''],
  ['jogos', '', 'Continuar', 'Pular esta parte'],
  ['jogos', 'Você conheceu Jogos e o Radar', 'Acompanhar no Radar', 'Só guardar nos desejos'],
  ['comunidade', '', 'Continuar', ''],
  ['comunidade', 'Você conheceu a Comunidade', 'Continuar', ''],
  ['album', '', 'Abrir o pacote', ''],
  ['fim', 'Os cinco estão acesos', 'Ir para o Início', ''],
  ['fim', '', '', ''],
];
export const LAST = STEPS.length - 1;

/** Em que capítulo está a tela (0 a 5; 5 = todos acesos). */
export function chapterIndex(step: number): number {
  const c = STEPS[Math.max(0, Math.min(LAST, step))][0];
  if (c === 'fim') return CHAPTERS.length;
  if (!c) return -1;
  return CHAPTERS.findIndex((x) => x.key === c);
}

/** Os capítulos que ainda faltam a partir de uma tela (para "Continuar a chegada" no Início). */
export const chaptersLeft = (step: number) => CHAPTERS.slice(Math.max(0, chapterIndex(step)));

/** Uma plataforma que a pessoa pode marcar: o nome do botão, o nome do IGDB e o tipo de console (se for um). */
export interface PlatChip { label: string; canon: string | null; hw: HardwareKind | null; hwName?: string }
const c = (label: string, canon: string | null, hw: HardwareKind | null = 'console', hwName?: string): PlatChip => ({ label, canon, hw, hwName });
export const PLAT_GROUPS: { label: string; chips: PlatChip[] }[] = [
  { label: 'PlayStation', chips: [c('PS5', 'PlayStation 5'), c('PS4', 'PlayStation 4'), c('PS3', 'PlayStation 3'), c('PS2', 'PlayStation 2'), c('PS1', 'PlayStation', 'console', 'PlayStation'), c('PSP', 'PlayStation Portable', 'portatil'), c('PS Vita', 'PlayStation Vita', 'portatil')] },
  { label: 'Nintendo', chips: [c('Switch 2', 'Nintendo Switch 2'), c('Switch', 'Nintendo Switch'), c('Wii U', 'Wii U'), c('Wii', 'Wii'), c('GameCube', 'Nintendo GameCube'), c('N64', 'Nintendo 64'), c('SNES', 'Super Nintendo Entertainment System', 'console', 'Super Nintendo'), c('3DS', 'Nintendo 3DS', 'portatil'), c('Game Boy', 'Game Boy', 'portatil')] },
  { label: 'Xbox', chips: [c('Xbox Series', 'Xbox Series X|S'), c('Xbox One', 'Xbox One'), c('Xbox 360', 'Xbox 360'), c('Xbox', 'Xbox')] },
  { label: 'PC e lojas', chips: [c('PC · Steam', 'PC (Microsoft Windows)', null), c('Epic', 'PC (Microsoft Windows)', null), c('Game Pass', null, null), c('PS Plus', null, null), c('Celular', 'Android', null)] },
  { label: 'Retrô e outros', chips: [c('Mega Drive', 'Sega Mega Drive/Genesis'), c('Master System', 'Sega Master System/Mark III', 'console', 'Master System'), c('Dreamcast', 'Dreamcast'), c('Atari 2600', 'Atari 2600'), c('Arcade', 'Arcade', null)] },
];
export const ALL_CHIPS = PLAT_GROUPS.flatMap((g) => g.chips);
export const chipOf = (label: string): PlatChip => ALL_CHIPS.find((x) => x.label === label) ?? { label, canon: label, hw: 'console' };

/** As plataformas do IGDB das escolhas (sem repetir), para pedir os clássicos. */
export const canonOf = (labels: string[]) => [...new Set(labels.map((l) => chipOf(l).canon).filter((x): x is string => !!x))];

/** Quantos dias faltam para uma data AAAA-MM-DD (null sem data). */
export function daysUntil(day: string | null | undefined, today = new Date()): number | null {
  if (!day || !/^\d{4}-\d{2}-\d{2}/.test(day)) return null;
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = day.slice(0, 10).split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - t) / 86400_000);
}

/** "1 jogo", "3 jogos". */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
