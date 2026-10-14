/** Afinidade entre duas pessoas: jogos em comum, um número de 0 a 100 e dicas que saem do cruzamento. */
export interface GameRef { slug: string; title: string; cover: string | null }
export interface AffinityInput {
  mine: { done: GameRef[]; shelf: GameRef[]; playing: GameRef[]; wishes: GameRef[] };
  theirs: { done: GameRef[]; shelf: GameRef[]; playing: GameRef[]; loved: GameRef[] };
}
export interface Affinity {
  /** 0 a 100, ou null quando um dos dois tem pouca coisa para comparar. */
  score: number | null;
  label: string;
  common: GameRef[];
  bothDone: GameRef[];
  playingSame: GameRef[];
  /** Jogos que a outra pessoa já zerou e estão nos seus desejos. */
  tips: GameRef[];
  /** Os "três da vida" e o jogo que definiu a outra pessoa que você também jogou ou tem. */
  lovedCommon: GameRef[];
}

const MIN = 3;
const uniq = (list: GameRef[]) => [...new Map(list.filter((g) => g.slug).map((g) => [g.slug, g])).values()];
const inter = (a: GameRef[], b: Set<string>) => uniq(a).filter((g) => b.has(g.slug));
const slugs = (...l: GameRef[][]) => new Set(l.flat().map((g) => g.slug).filter(Boolean));

export function affinityLabel(score: number | null, common: number): string {
  if (score == null) return common > 0 ? 'Alguma coisa em comum' : '';
  if (score >= 50) return 'Muito em comum';
  if (score >= 25) return 'Bastante em comum';
  if (score >= 10) return 'Um pouco em comum';
  return 'Gostos diferentes, por enquanto';
}

export function affinity(x: AffinityInput): Affinity {
  const mineAll = slugs(x.mine.done, x.mine.shelf, x.mine.playing);
  const theirAll = slugs(x.theirs.done, x.theirs.shelf, x.theirs.playing, x.theirs.loved);
  const theirList = uniq([...x.theirs.loved, ...x.theirs.done, ...x.theirs.playing, ...x.theirs.shelf]);
  const common = theirList.filter((g) => mineAll.has(g.slug));
  const lovedCommon = inter(x.theirs.loved, mineAll);
  // Os jogos que marcaram a outra pessoa pesam o dobro.
  const weight = common.length + lovedCommon.length;
  const base = Math.min(mineAll.size, theirAll.size);
  const score = base < MIN ? null : Math.min(100, Math.round((100 * weight) / base));
  return {
    score,
    label: affinityLabel(score, common.length),
    common,
    bothDone: inter(x.theirs.done, slugs(x.mine.done)),
    playingSame: inter(x.theirs.playing, slugs(x.mine.playing)),
    tips: inter(x.theirs.done, slugs(x.mine.wishes)).filter((g) => !mineAll.has(g.slug)),
    lovedCommon,
  };
}
