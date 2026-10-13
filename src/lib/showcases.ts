import type { Copy, Game, Hardware, PieceRef, Showcase, ShowcaseRule, State } from '../data/types';
import { canonicalPlatform, platformRank, shortPlatform } from './platforms';

/** Gerações conhecidas (consoles de mesa e portáteis da mesma época). PC e celular ficam de fora. */
export const GENERATIONS: { key: string; label: string; platforms: string[] }[] = [
  { key: 'g9', label: 'Nona geração', platforms: ['PlayStation 5', 'Xbox Series X|S', 'Nintendo Switch 2'] },
  { key: 'g8', label: 'Oitava geração', platforms: ['PlayStation 4', 'Xbox One', 'Wii U', 'Nintendo Switch', 'PlayStation Vita', 'Nintendo 3DS'] },
  { key: 'g7', label: 'Sétima geração', platforms: ['PlayStation 3', 'Xbox 360', 'Wii', 'PlayStation Portable', 'Nintendo DS'] },
  { key: 'g6', label: 'Sexta geração', platforms: ['PlayStation 2', 'Xbox', 'Nintendo GameCube', 'Dreamcast', 'Game Boy Advance'] },
  { key: 'g5', label: 'Quinta geração', platforms: ['PlayStation', 'Nintendo 64', 'Sega Saturn'] },
  { key: 'g4', label: 'Quarta geração', platforms: ['Super Nintendo Entertainment System', 'Sega Mega Drive/Genesis', 'Game Boy'] },
  { key: 'g3', label: 'Terceira geração', platforms: ['Nintendo Entertainment System'] },
];

/** Uma peça pronta para mostrar: exemplar (com o jogo) ou console. */
export type ResolvedPiece =
  | { ref: PieceRef; kind: 'c'; copy: Copy; game: Game }
  | { ref: PieceRef; kind: 'h'; hw: Hardware };

export function resolveRef(s: State, ref: PieceRef): ResolvedPiece | null {
  if (ref.t === 'c') {
    const copy = s.copies.find((c) => c.id === ref.id);
    const game = copy ? s.games[copy.gameId] : undefined;
    return copy && game ? { ref, kind: 'c', copy, game } : null;
  }
  const hw = (s.hardware ?? []).find((h) => h.id === ref.id);
  return hw ? { ref, kind: 'h', hw } : null;
}

const finished = (s: State) => {
  const done = new Set(s.histories.filter((h) => h.state === 'concluida').map((h) => h.journeyId));
  return new Set(s.journeys.filter((j) => done.has(j.id)).map((j) => j.gameId));
};

/** Exemplares que a regra encontra hoje. Um por jogo (o primeiro), em ordem alfabética. */
export function ruleCopies(s: State, rule: ShowcaseRule): Copy[] {
  const plats = new Set((rule.platforms ?? []).map((p) => canonicalPlatform(p)));
  const fav = new Set(s.favorites);
  const zerou = rule.type === 'zerados' ? finished(s) : null;
  const hit = (c: Copy) => {
    switch (rule.type) {
      case 'favoritos': return fav.has(c.gameId);
      case 'especial': return !!c.special;
      case 'zerados': return zerou!.has(c.gameId);
      case 'plataforma':
      case 'geracao': return plats.has(canonicalPlatform(c.platform));
    }
    return false;
  };
  const seen = new Set<string>();
  const out = s.copies.filter((c) => {
    if (!s.games[c.gameId] || !hit(c) || seen.has(c.gameId)) return false;
    seen.add(c.gameId);
    return true;
  });
  return out.sort((a, b) => s.games[a.gameId].title.localeCompare(s.games[b.gameId].title, 'pt-BR'));
}

/** As peças de uma Vitrine, prontas para mostrar (o que sumiu da coleção fica de fora). */
export function showcasePieces(s: State, sc: Pick<Showcase, 'kind' | 'rule' | 'items'>): ResolvedPiece[] {
  if (sc.kind === 'inteligente' && sc.rule) return ruleCopies(s, sc.rule).map((copy) => ({ ref: { t: 'c', id: copy.id }, kind: 'c', copy, game: s.games[copy.gameId] }));
  return sc.items.map((r) => resolveRef(s, r)).filter((x): x is ResolvedPiece => !!x);
}

export function ruleLabel(rule?: ShowcaseRule): string {
  if (!rule) return '';
  switch (rule.type) {
    case 'favoritos': return 'seus favoritos';
    case 'especial': return 'o que é especial para você';
    case 'zerados': return 'os jogos que você zerou';
    case 'plataforma': return `os jogos de ${(rule.platforms ?? []).map(shortPlatform).join(', ')}`;
    case 'geracao': return `os jogos de ${(rule.platforms ?? []).map(shortPlatform).join(', ')}`;
  }
  return '';
}

export interface Suggestion { key: string; title: string; description: string; rule: ShowcaseRule; count: number }

/**
 * Vitrines que a coleção já monta sozinha: favoritos, especiais, zerados, as plataformas com mais jogos e as gerações.
 * Uma sugestão já guardada (mesma chave) não aparece de novo.
 */
export function suggestions(s: State): Suggestion[] {
  const saved = new Set((s.showcases ?? []).map((x) => x.rule?.key).filter(Boolean));
  const out: Suggestion[] = [];
  const add = (key: string, title: string, description: string, rule: ShowcaseRule, min = 2) => {
    if (saved.has(key)) return;
    const count = ruleCopies(s, rule).length;
    if (count >= min) out.push({ key, title, description, rule: { ...rule, key }, count });
  };
  add('favoritos', 'Meus favoritos', 'Os jogos que você marcou com coração e que estão na sua estante.', { type: 'favoritos' });
  add('especial', 'Especial para mim', 'Os exemplares que você marcou como especiais.', { type: 'especial' });
  add('zerados', 'Os que eu zerei', 'Da estante, os jogos que você já terminou.', { type: 'zerados' });
  // Plataformas com mais jogos (até quatro).
  const n: Record<string, number> = {};
  for (const c of s.copies) { const p = canonicalPlatform(c.platform); n[p] = (n[p] ?? 0) + 1; }
  Object.entries(n).filter(([, k]) => k >= 3).sort((a, b) => b[1] - a[1] || platformRank(a[0]) - platformRank(b[0])).slice(0, 4)
    .forEach(([p]) => add(`plat:${p}`, `Minha estante de ${shortPlatform(p)}`, `Todos os jogos de ${shortPlatform(p)} que você tem.`, { type: 'plataforma', platforms: [p] }, 3));
  // Gerações com jogos de mais de uma plataforma (senão é igual à de plataforma).
  for (const g of GENERATIONS) {
    const plats = g.platforms.filter((p) => n[p]);
    if (plats.length < 2) continue;
    add(`ger:${g.key}`, g.label, `${plats.map(shortPlatform).join(', ')}: o que você guardou daquela época.`, { type: 'geracao', platforms: g.platforms }, 3);
  }
  return out;
}
