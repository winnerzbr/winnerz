/**
 * Álbum de figurinhas: as contas que não dependem de tela nem de banco. As mesmas regras rodam no banco (0053);
 * aqui elas servem à demonstração, aos textos e aos testes.
 */

export type Tier = 'comum' | 'incomum' | 'rara' | 'lendaria';
export const TIERS: Tier[] = ['comum', 'incomum', 'rara', 'lendaria'];
export const TIER_LABEL: Record<Tier, string> = { comum: 'Comum', incomum: 'Incomum', rara: 'Rara', lendaria: 'Lendária' };
/** O material de cada raridade na família Coroa. */
export const TIER_MATERIAL: Record<Tier, string> = { comum: 'Prata', incomum: 'Ouro', rara: 'Ametista', lendaria: 'Holográfica' };
export const TIER_STARS: Record<Tier, number> = { comum: 1, incomum: 2, rara: 3, lendaria: 4 };
export const ODDS: Record<Tier, number> = { comum: 0.7, incomum: 0.22, rara: 0.07, lendaria: 0.01 };
export const PACK_SIZE = 5;
/** Depois de tantos pacotes sem Rara (nem Lendária), o próximo traz uma. */
export const PITY = 10;

/** A raridade para um sorteio entre 0 e 1. */
export function tierFor(x: number): Tier {
  if (x < ODDS.lendaria) return 'lendaria';
  if (x < ODDS.lendaria + ODDS.rara) return 'rara';
  if (x < ODDS.lendaria + ODDS.rara + ODDS.incomum) return 'incomum';
  return 'comum';
}
const isRare = (t: Tier) => t === 'rara' || t === 'lendaria';

export interface Drawn { id: string; tier: Tier; dup: boolean }

/**
 * Sorteia um pacote. `pool` são as figurinhas que podem sair; `owned` diz quantas a pessoa já tem de cada uma;
 * `noRare` é quantos pacotes seguidos vieram sem Rara. Se uma raridade não tiver figurinha, cai para outra.
 */
export function drawPack(pool: { id: string; tier: Tier }[], owned: Record<string, number>, noRare: number, rnd: () => number = Math.random): { contents: Drawn[]; rare: boolean } {
  if (!pool.length) throw new Error('catalog_empty');
  const by: Record<Tier, string[]> = { comum: [], incomum: [], rara: [], lendaria: [] };
  for (const s of pool) by[s.tier].push(s.id);
  const pick = (t: Tier): { id: string; tier: Tier } => {
    const order: Tier[] = [t, 'comum', 'incomum', 'rara', 'lendaria'];
    for (const k of order) if (by[k].length) return { id: by[k][Math.floor(rnd() * by[k].length) % by[k].length], tier: k };
    throw new Error('catalog_empty');
  };
  const seen: Record<string, number> = { ...owned };
  const out: Drawn[] = [];
  let rare = false;
  for (let i = 0; i < PACK_SIZE; i++) {
    let t = tierFor(rnd());
    if (i === PACK_SIZE - 1 && !rare && !isRare(t) && noRare >= PITY - 1 && by.rara.length) t = 'rara';
    const s = pick(t);
    if (isRare(s.tier)) rare = true;
    out.push({ id: s.id, tier: s.tier, dup: (seen[s.id] ?? 0) > 0 });
    seen[s.id] = (seen[s.id] ?? 0) + 1;
  }
  return { contents: out, rare };
}

/* ---- Regras de ganho (as mesmas do banco) ------------------------------------------------------------- */
export type HoldRule = 'tempo' | 'semana' | 'conta_nova';
export interface PackSignals { elapsedH?: number; needH?: number; ttbH?: number | null; bridgeMin?: number; accountDays?: number | null; weekPacks?: number; memoria?: number }

/** Metade da duração normal do jogo, ou 24 horas quando não se sabe. */
export const neededHours = (ttbHours?: number | null) => (ttbHours && ttbHours > 0 ? ttbHours / 2 : 24);

/** O que acontece quando alguém zera um jogo começado aqui (ou null se esse jogo já contou). */
export function judgeFinish(o: { counted: boolean; elapsedH: number; ttbH?: number | null; bridgeMin: number; accountDays: number | null; weekPacks: number }):
  { state: 'fechado' | 'retido'; rule: HoldRule | null; signals: PackSignals } | null {
  if (o.counted) return null;
  const need = neededHours(o.ttbH);
  let rule: HoldRule | null = null;
  if (o.elapsedH < need && o.bridgeMin < Math.min(need * 60, 600)) rule = 'tempo';
  else if (o.accountDays != null && o.accountDays < 7 && o.weekPacks >= 1) rule = 'conta_nova';
  else if (o.weekPacks >= 2) rule = 'semana';
  return { state: rule ? 'retido' : 'fechado', rule,
    signals: { elapsedH: Math.round(o.elapsedH * 10) / 10, needH: Math.round(need * 10) / 10, ttbH: o.ttbH ?? null, bridgeMin: o.bridgeMin, accountDays: o.accountDays, weekPacks: o.weekPacks } };
}

/** Pacote de memória: 1 a cada 10 jogos zerados antes, no máximo 3. */
export const memoryPackDue = (memoryCount: number, memoryPacks: number) => memoryCount > 0 && memoryCount % 10 === 0 && memoryPacks < 3;

export const RULE_TITLE: Record<HoldRule, string> = { tempo: 'Zerado rápido demais', semana: 'Limite da semana', conta_nova: 'Conta nova' };
export const RULE_TEXT: Record<HoldRule, string> = {
  tempo: 'Entre começar e zerar passou menos tempo do que o jogo costuma pedir. Se você jogou mesmo, peça revisão.',
  semana: 'A Jornada dá até 2 pacotes por semana. Este ficou guardado; peça revisão se achar que é caso especial.',
  conta_nova: 'Na primeira semana da conta, a Jornada dá 1 pacote. Este ficou guardado; peça revisão se achar justo.',
};

const h1 = (n?: number | null) => (n == null ? '?' : `${String(Math.round(n * 10) / 10).replace('.', ',')} h`);
/** Os sinais de um pacote retido, numa linha para o Studio. */
export function signalsLine(s: PackSignals): string {
  const out: string[] = [];
  if (s.elapsedH != null) out.push(`zerou ${h1(s.elapsedH)} depois de começar (o mínimo era ${h1(s.needH)}${s.ttbH ? `; o jogo leva ${h1(s.ttbH)}` : '; duração desconhecida'})`);
  if (s.bridgeMin) out.push(`${Math.round(s.bridgeMin / 6) / 10} h registradas pelas pontes`.replace('.', ','));
  if (s.accountDays != null) out.push(`conta com ${s.accountDays} ${s.accountDays === 1 ? 'dia' : 'dias'}`);
  if (s.weekPacks) out.push(`${s.weekPacks} ${s.weekPacks === 1 ? 'pacote' : 'pacotes'} na semana`);
  if (s.memoria) out.push(`${s.memoria} jogos zerados antes`);
  return out.join(' · ');
}

/* ---- Álbum ------------------------------------------------------------------------------------------- */
export interface ItemLite { qty: number; pasted: boolean }
/** Figurinhas que a pessoa tem e ainda não colou, entre as dadas. */
export const toPaste = (ids: string[], items: Record<string, ItemLite | undefined>) => ids.filter((id) => (items[id]?.qty ?? 0) > 0 && !items[id]?.pasted);
/** Quantas das figurinhas dadas estão coladas. */
export const pastedCount = (ids: string[], items: Record<string, ItemLite | undefined>) => ids.filter((id) => items[id]?.pasted).length;
/** Repetidas: cópias além da que está (ou vai) no álbum. */
export const spares = (it?: ItemLite) => (it ? Math.max(0, it.qty - 1) : 0);

/* ---- Cofre ------------------------------------------------------------------------------------------- */
/** Quantas repetidas o Cofre pede por uma figurinha que falta (só Comum e Incomum). */
export const VAULT_COST: Partial<Record<Tier, number>> = { comum: 3, incomum: 10 };
export type VaultGive = { id: string; n: number }[];
export type VaultError = 'vault_tier' | 'vault_owned' | 'vault_give' | 'vault_not_spare' | 'vault_count';

/** Confere uma troca no Cofre do mesmo jeito que o banco: null quando está tudo certo. */
export function vaultCheck(target: { id: string; tier: Tier }, give: VaultGive, items: Record<string, ItemLite | undefined>): VaultError | null {
  const need = VAULT_COST[target.tier];
  if (!need) return 'vault_tier';
  if ((items[target.id]?.qty ?? 0) > 0) return 'vault_owned';
  const sum: Record<string, number> = {};
  for (const g of give) {
    if (!Number.isInteger(g.n) || g.n < 1) return 'vault_give';
    sum[g.id] = (sum[g.id] ?? 0) + g.n;
  }
  let total = 0;
  for (const [id, n] of Object.entries(sum)) {
    if (spares(items[id]) < n) return 'vault_not_spare';
    total += n;
  }
  return total === need ? null : 'vault_count';
}

/**
 * Sugestão de repetidas para o Cofre: começa pelas de menor raridade e com mais cópias, sem nunca tocar na última
 * cópia. Devolve menos do que o pedido quando não há repetidas suficientes.
 */
export function vaultSuggest(need: number, pool: { id: string; tier: Tier; number: number }[], items: Record<string, ItemLite | undefined>): VaultGive {
  const rank = (t: Tier) => TIERS.indexOf(t);
  const list = pool.map((s) => ({ s, n: spares(items[s.id]) })).filter((x) => x.n > 0)
    .sort((a, b) => rank(a.s.tier) - rank(b.s.tier) || b.n - a.n || a.s.number - b.s.number);
  const out: VaultGive = []; let left = need;
  for (const x of list) {
    if (left <= 0) break;
    const n = Math.min(left, x.n); out.push({ id: x.s.id, n }); left -= n;
  }
  return out;
}

/* ---- Minhas páginas ------------------------------------------------------------------------------------ */
export interface PersonalSticker { id: string; gameId: string; slug: string; title: string; part: string | null; image: string | null; at: string; when: string }
interface PHist { id: string; journeyId: string; title?: string; ordinal?: number; state: string; completedAt?: string; startedAt?: string; completedPrecision?: string }
interface PGame { id: string; slug: string; title: string; cover: string; backdrop?: string }
/**
 * Cada jogo zerado vira uma figurinha pessoal (não entra em trocas nem em pacotes). A foto é a última que a pessoa
 * guardou naquela história; sem foto, a arte de fundo do jogo; sem ela, a capa. Ordem: do mais antigo ao mais novo.
 */
export function personalStickers(
  histories: PHist[], journeys: { id: string; gameId: string }[], games: Record<string, PGame | undefined>,
  events: { historyId: string; at: string; image?: string }[], when: (iso: string | undefined, precision?: string) => string,
): PersonalSticker[] {
  const jg = new Map(journeys.map((j) => [j.id, j.gameId]));
  const shot = new Map<string, { at: string; image: string }>();
  for (const e of events) if (e.image) { const c = shot.get(e.historyId); if (!c || e.at >= c.at) shot.set(e.historyId, { at: e.at, image: e.image }); }
  const out: PersonalSticker[] = [];
  for (const h of histories) {
    if (h.state !== 'concluida') continue;
    const g = games[jg.get(h.journeyId) ?? ''];
    if (!g) continue;
    const at = h.completedAt ?? h.startedAt ?? '';
    out.push({ id: h.id, gameId: g.id, slug: g.slug, title: g.title, part: (h.ordinal ?? 1) > 1 && h.title ? h.title : null,
      image: shot.get(h.id)?.image ?? g.backdrop ?? g.cover ?? null, at, when: when(h.completedAt, h.completedPrecision) });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at) || a.title.localeCompare(b.title));
}

/* ---- Trocas ------------------------------------------------------------------------------------------- */
export const TRADE_MAX = 5;
/** Lendárias ficam fora das trocas. */
export const tradeableTier = (t: Tier) => t !== 'lendaria';
/** O "peso" de um lado da troca (estrelas de raridade), para mostrar se ela está equilibrada. */
export const tradeWeight = (l: { tier: Tier }[]) => l.reduce((t, s) => t + TIER_STARS[s.tier], 0);
export function tradeBalance(give: { tier: Tier }[], take: { tier: Tier }[]): 'igual' | 'voce_da_mais' | 'voce_recebe_mais' {
  const a = tradeWeight(give), b = tradeWeight(take);
  return a === b ? 'igual' : a > b ? 'voce_da_mais' : 'voce_recebe_mais';
}

/**
 * Monta uma troca sugerida: o mesmo número de figurinhas dos dois lados (até 5), começando pelas mais raras que você
 * recebe e casando cada uma com uma sua da mesma raridade (ou a mais próxima).
 */
export function tradeSuggest<T extends { id: string; tier: Tier; number: number }>(give: T[], take: T[], max = TRADE_MAX): { give: T[]; take: T[] } {
  const rank = (t: Tier) => TIERS.indexOf(t);
  const n = Math.min(give.length, take.length, max);
  const want = [...take].sort((a, b) => rank(b.tier) - rank(a.tier) || a.number - b.number).slice(0, n);
  const pool = [...give].sort((a, b) => a.number - b.number);
  const out: T[] = [];
  for (const w of want) {
    let best = -1;
    pool.forEach((g, i) => { if (best < 0 || Math.abs(rank(g.tier) - rank(w.tier)) < Math.abs(rank(pool[best].tier) - rank(w.tier))) best = i; });
    out.push(pool.splice(best, 1)[0]);
  }
  return { give: out, take: want };
}
