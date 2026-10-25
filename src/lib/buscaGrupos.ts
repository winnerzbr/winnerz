/**
 * Etapa 6 da revisão: a busca de jogos agrupada. O jogo principal aparece uma vez, com as versões e edições
 * dele (ports, edições ampliadas) penduradas; remakes e remasters ganham um grupo próprio; DLCs, expansões e
 * pacotes vão para outro; registros cancelados ou nunca lançados ficam recolhidos no fim.
 */
export type HitLike = { igdbId?: number; slug: string; title?: string; kind?: string; parent?: number; versionOf?: boolean; cancelled?: boolean };
const nome = (t?: string) => (t ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const VERSOES = new Set(['port', 'expanded', 'fork']);
const RELANCES = new Set(['remake', 'remaster']);
const EXTRAS = new Set(['dlc', 'expansion', 'bundle', 'pack', 'mod', 'episode', 'season', 'update', 'standalone']);

export function agruparBusca<T extends HitLike>(hits: T[]): { principais: { hit: T; versoes: T[] }[]; relancamentos: { hit: T; versoes: T[] }[]; extras: T[]; cancelados: T[] } {
  const byId = new Map<number, T>();
  for (const h of hits) if (h.igdbId) byId.set(h.igdbId, h);
  const vivos = hits.filter((h) => !h.cancelled);
  const cancelados = hits.filter((h) => h.cancelled);
  // A raiz de uma versão: sobe pelo "versão de" enquanto o pai estiver nos resultados.
  // (No IGDB, ports e edições ampliadas apontam o original por "parent_game"; versões, por "version_parent".)
  const ehVersao = (h: T) => !!h.versionOf || VERSOES.has(h.kind ?? '');
  const raiz = (h: T): T | null => {
    let cur = h; const vistos = new Set<number>();
    while (cur.parent && ehVersao(cur) && byId.has(cur.parent) && !vistos.has(cur.parent)) { vistos.add(cur.parent); cur = byId.get(cur.parent)!; }
    if (cur !== h) return cur;
    // O original não veio na busca: uma versão com o mesmo nome de um jogo principal fica com ele.
    if (ehVersao(h) && h.title) return hits.find((x) => x !== h && !x.cancelled && !ehVersao(x) && (x.kind ?? 'main') === 'main' && nome(x.title) === nome(h.title)) ?? null;
    return null;
  };
  const principais: { hit: T; versoes: T[] }[] = [];
  const relancamentos: { hit: T; versoes: T[] }[] = [];
  const extras: T[] = [];
  const pendentes: [T, T][] = [];
  for (const h of vivos) {
    const r = raiz(h);
    if (r && !r.cancelled && ehVersao(h)) { pendentes.push([h, r]); continue; }
    if (EXTRAS.has(h.kind ?? '')) { extras.push(h); continue; }
    if (RELANCES.has(h.kind ?? '')) { relancamentos.push({ hit: h, versoes: [] }); continue; }
    principais.push({ hit: h, versoes: [] });
  }
  for (const [h, r] of pendentes) {
    const alvo = principais.find((p) => p.hit === r) ?? relancamentos.find((p) => p.hit === r);
    if (alvo) alvo.versoes.push(h);
    else principais.push({ hit: h, versoes: [] });
  }
  // Sem nenhum jogo principal, os relançamentos sobem (senão a busca pareceria vazia).
  if (!principais.length && relancamentos.length) return { principais: relancamentos, relancamentos: [], extras, cancelados };
  return { principais, relancamentos, extras, cancelados };
}
