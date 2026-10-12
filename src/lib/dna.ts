/**
 * DNA de experiência: como é jogar, em poucas linhas, para decidir se cabe no seu momento.
 * Não é teste de personalidade nem nota. Cada linha diz de onde veio:
 * "IGDB" quando é um dado da ficha (modo, tema, tempo médio) e "Inferido" quando o WinnerZ
 * deduziu a partir de gênero, tema e modo. Nada aqui vira gosto permanente da pessoa.
 */
import type { Game, ID, State } from '../data/types';
import { pt } from './igdbPt';

export type Provenance = 'igdb' | 'inferido' | 'voce';
export type TraitKey = 'curtas' | 'reaprender' | 'retomar' | 'historia' | 'junto' | 'sozinho' | 'aberto' | 'terror' | 'duracao';
export type Trait = { key: TraitKey; label: string; detail: string; source: Provenance };
export type Dna = {
  traits: Trait[];
  /** Horas para zerar (normal), quando há. */
  hours?: number;
  hoursSource?: Provenance;
  fits: { short: boolean; light: boolean; together: boolean; story: boolean; long: boolean; relearn: boolean; horror: boolean };
};

const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function bag(g: Game): string {
  const parts = [g.genres ?? '', ...(g.themes ?? []), ...(g.modes ?? [])];
  const out = new Set<string>();
  for (const p of parts) for (const one of p.split(/,\s*| e /)) { if (!one.trim()) continue; out.add(norm(one)); out.add(norm(pt(one))); }
  // Junta tudo para buscar por trecho (os gêneros do site antigo vêm em frases, como "RPG de ação").
  return ` ${[...out].join(' | ')} `;
}

const any = (b: string, words: string[]) => words.some((w) => b.includes(w));

export const fmtHours = (h: number) => (h < 1 ? 'menos de 1 h' : `${String(h).replace('.', ',')} h`);

function durationTrait(h: number, source: Provenance, g: Game): Trait {
  const label = h <= 6 ? 'Cabe em um fim de semana' : h <= 15 ? 'Algumas noites' : h <= 40 ? 'Algumas semanas' : 'Longo, para ir com calma';
  const t = g.ttb;
  const range = source === 'igdb' && t ? [t.h != null && `rápido ${fmtHours(t.h)}`, t.c != null && `completo ${fmtHours(t.c)}`].filter(Boolean).join(', ') : '';
  const detail = source === 'voce'
    ? `Cerca de ${fmtHours(h)} para zerar, pela sua estimativa.`
    : `Cerca de ${fmtHours(h)} para zerar, pela média de quem informou no IGDB${range ? ` (${range})` : ''}.`;
  return { key: 'duracao', label, detail, source };
}

/** Horas para zerar: a sua estimativa primeiro; senão, a média do IGDB. Nunca inventa. */
export function hoursToBeat(s: State | null, g: Game): { hours?: number; source?: Provenance } {
  const mine = s?.myGames[g.id]?.estHours;
  if (mine != null) return { hours: mine, source: 'voce' };
  const n = g.ttb?.n ?? g.ttb?.h;
  return n != null ? { hours: n, source: 'igdb' } : {};
}

export function gameDna(g: Game, s: State | null = null): Dna {
  const b = bag(g);
  const traits: Trait[] = [];
  const together = any(b, ['co-operative', 'cooperativ', 'split screen', 'tela dividida', 'multiplayer', 'multijogador', 'mmo', 'battle royale']);
  const coop = any(b, ['co-operative', 'cooperativ']);
  const split = any(b, ['split screen', 'tela dividida']);
  const online = any(b, ['multiplayer', 'multijogador', 'mmo', 'battle royale']);
  const solo = any(b, ['single player', 'um jogador']);
  const story = any(b, [' adventure', 'aventura', 'role-playing', ' rpg', 'visual novel', 'point-and-click', ' drama', 'mystery', 'misterio', 'romance', 'narrativ']);
  const shortSessions = any(b, ['fighting', ' luta', 'racing', 'corrida', ' sport', 'esporte', 'puzzle', 'quebra-cabeca', 'arcade', 'pinball', 'card & board', 'cartas', 'quiz', 'party', 'festa', 'battle royale', 'music', 'musica']);
  const relearn = any(b, ['strategy', 'estrategia', 'tactical', 'tatico', 'simulator', 'simulac', 'role-playing', ' rpg', 'moba', ' 4x', 'mmo']);
  const open = any(b, ['open world', 'mundo aberto']);
  const sandbox = any(b, ['sandbox']);
  const horror = any(b, ['horror', 'terror']);

  if (together) {
    const ways = [coop && 'cooperativo', split && 'na mesma tela', online && 'online ou em partidas'].filter(Boolean).join(', ');
    traits.push({ key: 'junto', label: 'Dá para jogar junto', detail: `Modos informados no IGDB: ${ways || 'multijogador'}.`, source: 'igdb' });
  } else if (solo) {
    traits.push({ key: 'sozinho', label: 'Para jogar sozinho', detail: 'O IGDB informa só o modo de um jogador.', source: 'igdb' });
  }
  if (story) traits.push({ key: 'historia', label: 'Puxado pela história', detail: 'Gênero e temas indicam uma narrativa contínua. Um recado ao parar ajuda a voltar.', source: 'inferido' });
  if (shortSessions) traits.push({ key: 'curtas', label: 'Bom em sessões curtas', detail: 'Partidas, fases ou corridas que começam e terminam rápido. Dá para parar a qualquer hora.', source: 'inferido' });
  if (relearn) traits.push({ key: 'reaprender', label: 'Pode pedir para reaprender', detail: 'Tem muitos sistemas e comandos. Depois de uma pausa longa, reserve um começo mais calmo.', source: 'inferido' });
  else if (shortSessions || any(b, ['platform', 'plataforma', 'shooter', ' tiro'])) traits.push({ key: 'retomar', label: 'Fácil de retomar', detail: 'Os comandos costumam voltar rápido, mesmo depois de meses parado.', source: 'inferido' });
  if (open || sandbox) traits.push({ key: 'aberto', label: open ? 'Mundo aberto' : 'Sem caminho fixo', detail: open ? 'Você escolhe o que fazer e quando. Fácil se perder, no bom e no mau sentido.' : 'Sandbox: o jogo é o que você constrói.', source: 'igdb' });
  if (horror) traits.push({ key: 'terror', label: 'Clima de terror', detail: 'Tema informado no IGDB. Talvez não seja para antes de dormir.', source: 'igdb' });

  const { hours, source } = hoursToBeat(s, g);
  if (hours != null) traits.push(durationTrait(hours, source!, g));

  return {
    traits, hours, hoursSource: source,
    fits: {
      short: shortSessions || (hours != null && hours <= 8),
      light: !horror && !relearn && (shortSessions || (hours != null && hours <= 12)),
      together, story,
      long: story || (hours != null && hours >= 25),
      relearn, horror,
    },
  };
}

export const PROVENANCE_LABEL: Record<Provenance, string> = { igdb: 'IGDB', inferido: 'Inferido', voce: 'Você' };

/** Gênero que a pessoa mais zerou (pelo nome do IGDB), para o "Quero descobrir algo". */
export function topGenre(s: State): { name: string; count: number } | null {
  const done = new Set<ID>();
  for (const j of s.journeys) if (s.histories.some((h) => h.journeyId === j.id && h.state === 'concluida')) done.add(j.gameId);
  const counts = new Map<string, number>();
  for (const id of done) for (const name of (s.games[id]?.genres ?? '').split(/,\s*/)) if (name && name !== 'Indie') counts.set(name, (counts.get(name) ?? 0) + 1);
  const best = [...counts].sort((a, b) => b[1] - a[1])[0];
  return best ? { name: best[0], count: best[1] } : null;
}
