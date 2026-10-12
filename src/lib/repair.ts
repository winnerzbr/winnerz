/**
 * Repetidos de importação: o mesmo jogo da planilha ficou duas vezes na estante,
 * uma como jogo sem ficha (primeira importação) e outra com a ficha do IGDB (importação seguinte).
 * Aqui só se calcula o que fazer; a tela confirma com a pessoa e grava.
 */
import type { Copy, Game, ID, State } from '../data/types';
import { canonicalPlatform } from './platforms';
import { similarity, titleKey } from './importer';

export type DupPair = {
  manual: Game; igdb: Game; sim: number; exact: boolean;
  /** Cópias da ficha do IGDB que repetem cópias do jogo sem ficha (as mais novas saem). */
  dropCopies: ID[];
  /** Se a ficha estiver errada: as cópias com ficha que a importação criou (as mais antigas, que já eram suas, ficam). */
  igdbDupCopies: ID[];
  /** Jornada da ficha do IGDB criada depois da do jogo sem ficha (a repetida sai). */
  dropJourney?: ID;
};

const t = (iso?: string) => (iso ? new Date(iso).getTime() : 0);
const slot = (c: Copy) => `${canonicalPlatform(c.platform)}|${c.kind}`;

export function findDuplicatePairs(s: State): DupPair[] {
  const byGame = new Map<ID, Copy[]>();
  for (const c of s.copies) (byGame.get(c.gameId) ?? byGame.set(c.gameId, []).get(c.gameId)!).push(c);
  const slots = new Map<ID, Set<string>>();
  for (const [id, cs] of byGame) slots.set(id, new Set(cs.map(slot)));
  const isManual = (id: ID) => s.games[id]?.source === 'manual';
  // Índice: em cada plataforma + formato, os jogos com ficha que têm cópia ali.
  const igdbBySlot = new Map<string, ID[]>();
  for (const [id, set] of slots) {
    if (!s.games[id] || isManual(id)) continue;
    for (const x of set) (igdbBySlot.get(x) ?? igdbBySlot.set(x, []).get(x)!).push(id);
  }

  const cands: { m: Game; i: Game; sim: number; exact: boolean }[] = [];
  for (const [mid, set] of slots) {
    if (!isManual(mid)) continue;
    const m = s.games[mid], mk = titleKey(m.title);
    const seen = new Set<ID>();
    for (const x of set) for (const iid of igdbBySlot.get(x) ?? []) {
      if (seen.has(iid)) continue;
      seen.add(iid);
      const i = s.games[iid];
      const exact = titleKey(i.title) === mk;
      const sim = exact ? 1 : similarity(m.title, i.title);
      if (sim >= 0.6) cands.push({ m, i, sim, exact });
    }
  }
  // Um para um, do par mais parecido para o menos parecido.
  cands.sort((a, b) => b.sim - a.sim);
  const usedM = new Set<ID>(), usedI = new Set<ID>();
  const pairs: DupPair[] = [];
  for (const c of cands) {
    if (usedM.has(c.m.id) || usedI.has(c.i.id)) continue;
    usedM.add(c.m.id); usedI.add(c.i.id);
    // Em cada plataforma + formato, as cópias dos dois lados são as mesmas: sai o lado que chegou depois.
    const drop: ID[] = [];
    const bySlot = (id: ID) => {
      const out = new Map<string, Copy[]>();
      for (const x of byGame.get(id)!) (out.get(slot(x)) ?? out.set(slot(x), []).get(slot(x))!).push(x);
      return out;
    };
    const ms = bySlot(c.m.id), is = bySlot(c.i.id);
    const igdbDup: ID[] = [];
    const mFirst = Math.min(...byGame.get(c.m.id)!.map((x) => t(x.createdAt)));
    for (const [k, mc] of ms) {
      const newerI = (is.get(k) ?? []).filter((x) => t(x.createdAt) > mFirst).sort((a, b) => t(b.createdAt) - t(a.createdAt));
      igdbDup.push(...newerI.slice(0, mc.length).map((x) => x.id));
    }
    for (const [k, mc] of ms) {
      const ic = is.get(k);
      if (!ic) continue;
      const n = Math.min(mc.length, ic.length);
      const iNewer = Math.max(...ic.map((x) => t(x.createdAt))) > Math.min(...mc.map((x) => t(x.createdAt)));
      const side = (iNewer ? ic : mc).slice().sort((a, b) => t(b.createdAt) - t(a.createdAt));
      drop.push(...side.slice(0, n).map((x) => x.id));
    }
    // Jornada nos dois: sai a mais nova, se ela não tem sessões (as da importação não têm).
    const jm = s.journeys.find((j) => j.gameId === c.m.id), ji = s.journeys.find((j) => j.gameId === c.i.id);
    let dropJourney: ID | undefined;
    if (jm && ji) {
      const newer = t(ji.createdAt) >= t(jm.createdAt) ? ji : jm;
      if (!s.sessions.some((x) => x.journeyId === newer.id)) dropJourney = newer.id;
    }
    pairs.push({ manual: c.m, igdb: c.i, sim: c.sim, exact: c.exact, dropCopies: drop, igdbDupCopies: igdbDup, dropJourney });
  }
  return pairs.sort((a, b) => a.manual.title.localeCompare(b.manual.title, 'pt-BR'));
}
