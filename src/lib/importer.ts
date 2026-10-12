/**
 * Importador de planilhas: entende as colunas pelo nome, junta as abas
 * (lista principal, zerados, detalhes da coleção) e casa cada título com o IGDB.
 * Nada aqui grava; só monta o que será importado, para a pessoa revisar antes.
 */
import type { Cell, Sheet } from './xlsx';
import type { CopyKind, DatePrecision } from '../data/types';
import { canonicalPlatform, samePlatform } from './platforms';
import { parseLooseDate } from './dates';

export type Field =
  | 'title' | 'platform' | 'format' | 'status' | 'priority' | 'estHours' | 'genre'
  | 'date' | 'hours' | 'rating' | 'comment'
  | 'region' | 'edition' | 'condition' | 'boxCondition' | 'items' | 'purchasedOn' | 'purchasePlace' | 'pricePaid' | 'priceNow';

export const FIELD_LABEL: Record<Field, string> = {
  title: 'Nome do jogo', platform: 'Plataforma', format: 'Formato (físico/digital)', status: 'Status', priority: 'Prioridade',
  estHours: 'Tempo estimado para zerar', genre: 'Gênero', date: 'Data em que zerou', hours: 'Horas jogadas', rating: 'Nota',
  comment: 'Comentários', region: 'Região', edition: 'Edição', condition: 'Condição da mídia', boxCondition: 'Condição da caixa',
  items: 'Itens inclusos', purchasedOn: 'Data da compra', purchasePlace: 'Local da compra', pricePaid: 'Valor pago', priceNow: 'Valor atual',
};

/** Nomes de coluna que cada campo aceita (sem acento, minúsculas). O primeiro que bater exatamente vence. */
const SYNONYMS: Record<Field, string[]> = {
  title: ['nome do jogo', 'nome', 'jogo', 'titulo', 'title', 'game', 'name'],
  platform: ['plataforma', 'console', 'platform', 'sistema', 'videogame'],
  format: ['formato', 'midia', 'tipo de midia', 'format', 'tipo'],
  status: ['status', 'situacao', 'andamento'],
  priority: ['prioridade', 'priority'],
  estHours: ['tempo estimado para zerar', 'tempo estimado', 'duracao estimada', 'horas estimadas', 'hltb', 'duracao'],
  genre: ['genero', 'genre', 'categoria'],
  date: ['data', 'data que zerou', 'zerado em', 'data de conclusao', 'concluido em', 'data zerado', 'finalizado em'],
  hours: ['tempo de jogo', 'horas jogadas', 'tempo jogado', 'horas', 'playtime'],
  rating: ['nota', 'avaliacao', 'rating', 'score', 'nota final'],
  comment: ['comentarios', 'comentario', 'observacoes', 'observacao', 'obs', 'notas', 'review'],
  region: ['regiao', 'region'],
  edition: ['edicao', 'edition', 'versao'],
  condition: ['condicao da midia', 'condicao', 'estado da midia', 'estado'],
  boxCondition: ['condicao da caixa/encarte', 'condicao da caixa', 'caixa/encarte', 'caixa', 'encarte'],
  items: ['itens inclusos', 'itens', 'conteudo'],
  purchasedOn: ['data da compra', 'comprado em', 'data de compra'],
  purchasePlace: ['local da compra', 'onde comprou', 'loja'],
  pricePaid: ['valor pago', 'preco pago', 'paguei', 'preco'],
  priceNow: ['valor atual (estimado)', 'valor atual', 'valor estimado', 'preco atual'],
};

export const norm = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export type Role = 'lista' | 'zerados' | 'detalhes' | 'ignorar';
export type SheetPlan = { name: string; headerRow: number; columns: string[]; map: Partial<Record<Field, number>>; role: Role; dataRows: number };

/** Acha a linha de cabeçalho (até a 6ª) e liga cada coluna a um campo. */
export function planSheet(sheet: Sheet): SheetPlan {
  let best = { row: -1, map: {} as Partial<Record<Field, number>>, score: 0 };
  for (let r = 0; r < Math.min(6, sheet.rows.length); r++) {
    const map = mapHeader(sheet.rows[r] ?? []);
    const score = Object.keys(map).length + (map.title != null ? 3 : 0);
    if (score > best.score) best = { row: r, map, score };
  }
  const columns = (sheet.rows[best.row] ?? []).map((c) => String(c ?? ''));
  const dataRows = best.row < 0 ? 0 : sheet.rows.slice(best.row + 1).filter((r) => best.map.title != null && r[best.map.title] != null && String(r[best.map.title]).trim()).length;
  return { name: sheet.name, headerRow: best.row, columns, map: best.map, role: guessRole(best.map, dataRows), dataRows };
}

export function mapHeader(row: Cell[]): Partial<Record<Field, number>> {
  const heads = row.map(norm);
  const map: Partial<Record<Field, number>> = {};
  const used = new Set<number>();
  // Primeiro os nomes exatos, depois "começa com", sempre do sinônimo mais específico para o mais genérico.
  for (const pass of ['exact', 'prefix'] as const) {
    for (const f of Object.keys(SYNONYMS) as Field[]) {
      if (map[f] != null) continue;
      for (const syn of SYNONYMS[f]) {
        const i = heads.findIndex((h, k) => !used.has(k) && h && (pass === 'exact' ? h === syn : h.startsWith(syn + ' ') || h.startsWith(syn + '(')));
        if (i >= 0) { map[f] = i; used.add(i); break; }
      }
    }
  }
  return map;
}

function guessRole(map: Partial<Record<Field, number>>, n: number): Role {
  if (map.title == null || n === 0) return 'ignorar';
  const detail = ['region', 'edition', 'boxCondition', 'purchasedOn', 'purchasePlace', 'pricePaid'].filter((f) => map[f as Field] != null).length;
  if (detail >= 2) return 'detalhes';
  if ((map.date != null || map.rating != null || map.hours != null) && map.format == null && map.status == null) return 'zerados';
  return 'lista';
}

/* ------------------------------------------------------------------ */
/* Linhas → itens                                                      */
/* ------------------------------------------------------------------ */

export type Finish = { state: 'concluida' | 'dropada' | 'ativa' | 'pausada'; when?: { iso: string; precision: DatePrecision }; hours?: number };
export type CopyDetail = { region?: string; edition?: string; condition?: string; boxCondition?: string; items?: string; purchasedOn?: string; purchasePlace?: string; pricePaid?: number; priceNow?: number };
export type Item = {
  key: string; title: string; platform: string;
  /** Formato da cópia; ausente = jogo sem cópia (ex.: só na aba de zerados). */
  kind?: CopyKind;
  priority?: 1 | 2 | 3; estHours?: number; genre?: string; wontPlay?: boolean;
  finish?: Finish; rating?: number; comment?: string; detail?: CopyDetail;
  duplicates: number; sources: string[];
};

const str = (v: Cell | undefined) => (v == null ? undefined : String(v).trim() || undefined);
const num = (v: Cell | undefined) => {
  if (v == null || v === '') return undefined;
  if (typeof v === 'number') return isFinite(v) ? v : undefined;
  const t = String(v).replace(/[^\d,.-]/g, '');
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return t && isFinite(n) ? n : undefined;
};

export function parseKind(v: Cell | undefined): CopyKind | undefined {
  const t = norm(v);
  if (!t) return undefined;
  if (/fisic|disco|cartucho|box|caixa/.test(t)) return 'fisico';
  if (/assinatura|game ?pass|ps ?plus|plus|ubisoft\+|ea play/.test(t)) return 'assinatura';
  if (/digital|steam|epic|gog|psn|eshop|download/.test(t)) return 'digital';
  return 'outro';
}

export function parseStatus(v: Cell | undefined): { finish?: Finish['state']; wontPlay?: boolean } {
  const t = norm(v);
  if (!t || /nao inici|backlog|na fila|pendente|a jogar/.test(t)) return {};
  if (/nao vou|desist.* antes|ignorar/.test(t)) return { wontPlay: true };
  if (/zerad|conclu|finaliz|terminad|platin|100%|completo|zerei/.test(t)) return { finish: 'concluida' };
  if (/drop|abandon|larg|desist/.test(t)) return { finish: 'dropada' };
  if (/pausad|parado|em espera/.test(t)) return { finish: 'pausada' };
  if (/jogando|andamento|iniciado|comecei|em curso/.test(t)) return { finish: 'ativa' };
  return {};
}

export function parsePriority(v: Cell | undefined): 1 | 2 | 3 | undefined {
  const t = norm(v);
  if (!t) return undefined;
  const n = Number(t);
  if (n === 1 || n === 2 || n === 3) return n;
  if (/^alt|^high|urgente/.test(t)) return 1;
  if (/^med|^normal/.test(t)) return 2;
  if (/^baix|^low/.test(t)) return 3;
  return undefined;
}

/** Nota em 0–10, na grade de meio ponto. Aceita 0–100 (divide por 10). */
export function parseRating(v: Cell | undefined): number | undefined {
  let n = num(v);
  if (n == null || n < 0) return undefined;
  if (n > 10 && n <= 100) n = n / 10;
  if (n > 10) return undefined;
  return Math.round(n * 2) / 2;
}

const keyOf = (title: string, platform: string) => `${titleKey(title)}|${canonicalPlatform(platform).toLowerCase()}`;

export function buildItems(sheets: Sheet[], plans: SheetPlan[]): { items: Item[]; skipped: number } {
  const items = new Map<string, Item>();
  let skipped = 0;
  const byTitle = (title: string) => [...items.values()].filter((i) => titleKey(i.title) === titleKey(title));
  const order: Role[] = ['lista', 'detalhes', 'zerados'];
  for (const role of order) {
    plans.forEach((plan, idx) => {
      if (plan.role !== role || plan.map.title == null) return;
      const m = plan.map;
      const get = (row: Cell[], f: Field) => (m[f] != null ? row[m[f]!] : undefined);
      for (const row of sheets[idx].rows.slice(plan.headerRow + 1)) {
        const title = str(get(row, 'title'));
        if (!title) continue;
        const platRaw = str(get(row, 'platform'));
        const platform = platRaw ? canonicalPlatform(platRaw) : '';
        let key = keyOf(title, platform);
        let it = items.get(key);
        // Zerados e detalhes sem plataforma (ou com outra grafia) se juntam ao mesmo título, se houver um só.
        if (!it && role !== 'lista') {
          const same = byTitle(title).filter((x) => !platform || !x.platform || samePlatform(x.platform, platform));
          if (same.length === 1) { it = same[0]; key = it.key; }
        }
        if (it && role === 'lista') { it.duplicates++; }
        if (!it) {
          it = { key, title, platform, duplicates: 0, sources: [] };
          items.set(key, it);
        }
        if (!it.sources.includes(plan.name)) it.sources.push(plan.name);
        if (role === 'lista') {
          it.kind = parseKind(get(row, 'format')) ?? it.kind ?? 'outro';
          it.priority = parsePriority(get(row, 'priority')) ?? it.priority;
          it.estHours = num(get(row, 'estHours')) ?? it.estHours;
          it.genre = str(get(row, 'genre')) ?? it.genre;
          const st = parseStatus(get(row, 'status'));
          if (st.wontPlay) it.wontPlay = true;
          if (st.finish && !it.finish) it.finish = { state: st.finish };
        }
        if (role === 'detalhes') {
          it.kind = it.kind ?? 'fisico';
          it.genre = it.genre ?? str(get(row, 'genre'));
          const d: CopyDetail = {
            region: str(get(row, 'region')), edition: str(get(row, 'edition')), condition: str(get(row, 'condition')),
            boxCondition: str(get(row, 'boxCondition')), items: str(get(row, 'items')), purchasePlace: str(get(row, 'purchasePlace')),
            pricePaid: num(get(row, 'pricePaid')), priceNow: num(get(row, 'priceNow')),
          };
          const bought = parseLooseDate(get(row, 'purchasedOn'));
          if (bought) d.purchasedOn = bought.iso.slice(0, 10);
          const clean = Object.fromEntries(Object.entries(d).filter(([, v]) => v != null)) as CopyDetail;
          if (Object.keys(clean).length) it.detail = { ...it.detail, ...clean };
        }
        if (role === 'zerados') {
          it.genre = it.genre ?? str(get(row, 'genre'));
          const when = parseLooseDate(get(row, 'date')) ?? undefined;
          it.finish = { state: 'concluida', when: when ?? it.finish?.when, hours: num(get(row, 'hours')) ?? it.finish?.hours };
          it.rating = parseRating(get(row, 'rating')) ?? it.rating;
          it.comment = str(get(row, 'comment')) ?? it.comment;
          if (!it.platform && platform) it.platform = platform;
        }
      }
    });
  }
  for (const it of items.values()) if (!it.title) skipped++;
  return { items: [...items.values()], skipped };
}

/* ------------------------------------------------------------------ */
/* Casamento com o IGDB                                                */
/* ------------------------------------------------------------------ */

const ROMAN: Record<string, string> = { ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' };

/** Chave de comparação de títulos: sem acento, sem pontuação, numerais romanos em algarismos. */
export function titleKey(t: string) {
  return norm(t).replace(/&/g, ' and ').replace(/['’`´]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
    .split(' ').map((w) => ROMAN[w] ?? w).join(' ').replace(/^the /, '');
}

/** Versão mais curta do título para uma segunda busca: sem subtítulo e sem "remake", "edition" etc. */
export function simplerTitle(t: string) {
  const base = t.split(/\s[-–:]\s|:\s/)[0];
  const cut = base.replace(/\b(remake|remastered|remaster|definitive edition|complete edition|game of the year edition|goty|edition|hd|collection|trilogy|reignited)\b/gi, '').replace(/\s+/g, ' ').trim();
  return cut.length >= 2 && cut !== t ? cut : base !== t ? base : '';
}

function bigrams(s: string) {
  const x = s.replace(/ /g, '');
  const out = new Map<string, number>();
  for (let i = 0; i < x.length - 1; i++) { const b = x.slice(i, i + 2); out.set(b, (out.get(b) ?? 0) + 1); }
  return out;
}
export function similarity(a: string, b: string) {
  const A = titleKey(a), B = titleKey(b);
  if (A === B) return 1;
  if (A.replace(/ /g, '') === B.replace(/ /g, '')) return 0.98; // "Astrobot" e "Astro Bot"
  const x = bigrams(A), y = bigrams(B);
  let inter = 0, total = 0;
  for (const [k, n] of x) { inter += Math.min(n, y.get(k) ?? 0); total += n; }
  for (const n of y.values()) total += n;
  return total ? (2 * inter) / total : 0;
}

export type Candidate = { igdbId: number; slug: string; title: string; year?: number; cover: string; platforms: string[] };
export type Match = { candidates: Candidate[]; chosen: number | null; confidence: 'alta' | 'media' | 'baixa' | 'nenhuma' };

/** Escolhe o melhor candidato: título parecido vale mais; estar na plataforma da cópia desempata. */
export function pickBest(title: string, platforms: string[], candidates: Candidate[]): Match {
  if (!candidates.length) return { candidates, chosen: null, confidence: 'nenhuma' };
  const scored = candidates.map((c) => {
    const sim = similarity(title, c.title);
    const onPlatform = platforms.some((p) => p && c.platforms.some((cp) => samePlatform(cp, p)));
    return { c, sim, onPlatform, score: sim + (onPlatform ? 0.12 : 0) + (c.cover ? 0.01 : 0) };
  }).sort((a, b) => b.score - a.score);
  const top = scored[0];
  const confidence = top.sim >= 0.97 && (top.onPlatform || !platforms.some(Boolean)) ? 'alta'
    : top.sim >= 0.97 || (top.sim >= 0.8 && top.onPlatform) ? 'media'
    : top.sim >= 0.6 ? 'baixa' : 'nenhuma';
  const ordered = scored.map((x) => x.c);
  return { candidates: ordered, chosen: confidence === 'nenhuma' ? null : ordered[0].igdbId, confidence };
}
