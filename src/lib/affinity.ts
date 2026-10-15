/**
 * O que duas pessoas têm em comum: jogos, o que as duas zeraram ou estão jogando e dicas que saem do cruzamento.
 * Sem número nem porcentagem de afinidade (o cânone proíbe dar nota para gente).
 */
export interface GameRef { slug: string; title: string; cover: string | null }
export interface AffinityInput {
  mine: { done: GameRef[]; shelf: GameRef[]; playing: GameRef[]; wishes: GameRef[] };
  theirs: { done: GameRef[]; shelf: GameRef[]; playing: GameRef[]; loved: GameRef[] };
}
export interface Affinity {
  common: GameRef[];
  bothDone: GameRef[];
  playingSame: GameRef[];
  /** Jogos que a outra pessoa já zerou e estão nos seus desejos. */
  tips: GameRef[];
  /** Os "três da vida" e o jogo que definiu a outra pessoa que você também jogou ou tem. */
  lovedCommon: GameRef[];
}

const uniq = (list: GameRef[]) => [...new Map(list.filter((g) => g.slug).map((g) => [g.slug, g])).values()];
const inter = (a: GameRef[], b: Set<string>) => uniq(a).filter((g) => b.has(g.slug));
const slugs = (...l: GameRef[][]) => new Set(l.flat().map((g) => g.slug).filter(Boolean));

export function affinity(x: AffinityInput): Affinity {
  const mineAll = slugs(x.mine.done, x.mine.shelf, x.mine.playing);
  const theirList = uniq([...x.theirs.loved, ...x.theirs.done, ...x.theirs.playing, ...x.theirs.shelf]);
  return {
    common: theirList.filter((g) => mineAll.has(g.slug)),
    bothDone: inter(x.theirs.done, slugs(x.mine.done)),
    playingSame: inter(x.theirs.playing, slugs(x.mine.playing)),
    tips: inter(x.theirs.done, slugs(x.mine.wishes)).filter((g) => !mineAll.has(g.slug)),
    lovedCommon: inter(x.theirs.loved, mineAll),
  };
}
