/**
 * "Quanto tempo você tem?" no O que jogar agora. Não é o tempo para zerar: é quanto uma sessão do jogo costuma
 * pedir. Um RPG longo ou um jogo de estratégia não cabem em 20 minutos (só para lembrar onde estava já vai metade);
 * um jogo de luta, de corrida ou de fases curtas cabe. Para o dia todo, valem os jogos de sessão longa e os
 * curtos de zerar numa sentada.
 */
import type { Game } from '../data/types';

export type Sessao = 'curta' | 'media' | 'longa';
export const TEMPOS = [
  { min: 20, label: '20 min' }, { min: 45, label: '45 min' }, { min: 90, label: '1h30' },
  { min: 180, label: '3 horas' }, { min: 600, label: 'O dia todo / Hoje eu não durmo' },
] as const;
export const DIA_TODO = 600;

const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const LONGA = ['role-playing', 'rpg', 'strategy', 'estrategia', 'simulator', 'simulador', 'simulacao', 'tactical', 'tatic', 'turn-based', 'turn based', 'por turnos', 'real time strategy', 'rts', '4x', 'mmo', 'open world', 'mundo aberto', 'sandbox', 'visual novel', 'grand strategy', 'city builder', 'management', 'gerenciamento'];
const CURTA = ['fighting', 'luta', 'racing', 'corrida', 'sport', 'esporte', 'puzzle', 'quebra-cabeca', 'arcade', 'pinball', 'card & board', 'cartas', 'quiz', 'party', 'festa', 'music', 'musica', 'ritmo', 'platform', 'plataforma', 'battle royale', 'roguelike', 'roguelite', 'rogue-lite', 'shoot \'em up', 'beat \'em up'];

/**
 * Quanto uma sessão costuma pedir, pelos gêneros, temas e modos do jogo. Gênero longo vence gênero curto
 * ("RPG de ação" é longo). A comunidade (curto de 0 a 3, história de 0 a 3) ajusta: 3 é curto de verdade,
 * 0 é longo; no meio, só aproxima um passo, e história muito forte nunca vira sessão curta.
 */
export function sessaoDe(g: Pick<Game, 'genres' | 'themes' | 'modes'>, vibe?: { short?: number; story?: number } | null): Sessao {
  const b = ` ${norm([g.genres ?? '', ...(g.themes ?? []), ...(g.modes ?? [])].join(' | '))} `;
  const tem = (ws: string[]) => ws.some((w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(b));
  const pelaFicha: Sessao = tem(LONGA) ? 'longa' : tem(CURTA) ? 'curta' : 'media';
  const c = vibe?.short;
  if (c == null) return pelaFicha;
  if (c >= 3) return 'curta';
  if (c <= 0) return 'longa';
  if (c === 2) return pelaFicha === 'longa' ? 'media' : pelaFicha === 'media' && (vibe?.story ?? 0) < 3 ? 'curta' : pelaFicha;
  return pelaFicha === 'curta' ? 'media' : pelaFicha;
}

/** Cabe no tempo? 20 min: só sessão curta. 45 min: nada de sessão longa. Daí para cima, tudo cabe. */
export function cabeNoTempo(sessao: Sessao, tempo: number | null | undefined): boolean {
  if (!tempo) return true;
  if (tempo <= 20) return sessao === 'curta';
  if (tempo <= 45) return sessao !== 'longa';
  return true;
}

/** Quanto o tempo pesa na ordem das ideias (cabe mas não é o ideal fica mais para trás). */
export function pesoDoTempo(sessao: Sessao, tempo: number | null | undefined, horasParaZerar?: number): number {
  if (!tempo) return 0;
  if (tempo <= 45) return sessao === 'curta' ? 3 : 0;
  if (tempo <= 90) return sessao === 'media' ? 1.5 : sessao === 'longa' ? 1 : 0;
  // 3 horas ou o dia todo: sessões longas primeiro; no dia todo, também o que dá para zerar hoje.
  const zeraHoje = tempo >= DIA_TODO && horasParaZerar != null && horasParaZerar <= 10;
  return (sessao === 'longa' ? 3 : sessao === 'media' ? 1.5 : -1) + (zeraHoje ? 3 : 0);
}

/** O porquê ligado ao tempo, em uma frase. */
export function motivoDoTempo(sessao: Sessao, tempo: number | null | undefined, horasParaZerar?: number): string {
  if (!tempo) return '';
  const t = TEMPOS.find((x) => x.min === tempo)?.label.split(' / ')[0].toLowerCase() ?? '';
  if (tempo >= DIA_TODO && horasParaZerar != null && horasParaZerar <= 10) return `Cerca de ${String(horasParaZerar).replace('.', ',')} h para zerar: dá para terminar hoje.`;
  if (sessao === 'curta') return tempo <= 45 ? `Partidas, fases ou corridas curtas: cabe em ${t} e dá para parar a qualquer hora.` : '';
  if (sessao === 'longa') return tempo >= 180 ? `Pede sessões longas, e ${tempo >= DIA_TODO ? 'hoje tem tempo de sobra' : `${t} rendem de verdade`}.` : tempo >= 90 ? `Pede sessões longas: em ${t} dá para avançar um bom pedaço.` : '';
  return tempo <= 45 ? `Sessão média: em ${t} rende um pedaço, sem pressa.` : '';
}
