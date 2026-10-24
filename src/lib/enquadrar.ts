/**
 * Enquadramento das artes do álbum (Criador de figurinhas, migração 0092). A arte original fica guardada; o que vai
 * para o site é um recorte no formato da figurinha (5:7) ou da capa, definido por um centro (x, y, de 0 a 1 na
 * imagem original) e um zoom (z, 1 = o maior recorte que cabe na imagem). O enquadramento é livre: dá para afastar
 * (z < 1) e arrastar a pintura para fora da borda; o que sobra é preenchido com a própria pintura, desfocada.
 * Funções puras, testadas em enquadrar.test.ts.
 */
export interface Framing { x: number; y: number; z: number }
export interface Rect { sx: number; sy: number; sw: number; sh: number }

export const STICKER_ASPECT = 5 / 7;
export const STICKER_ASPECT_H = 7 / 5;
export const COVER_ASPECT = 460 / 640;
export const ZOOM_MAX = 5;
export const ZOOM_MIN = 0.4;
/** O site mostra a arte da figurinha com 5% de sobra em cada lado (para o efeito de profundidade ao mover o mouse). */
export const OVERSCAN = 1.1;

export const FRAMING_INICIAL: Framing = { x: 0.5, y: 0.5, z: 1 };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** O maior recorte com a proporção pedida que cabe na imagem. */
function base(w: number, h: number, aspect: number) {
  return w / h > aspect ? { bw: h * aspect, bh: h } : { bw: w, bh: w / aspect };
}

/** O recorte (em pixels da original) para um enquadramento. Pode passar da borda da pintura (enquadramento livre). */
export function cropRect(w: number, h: number, aspect: number, f: Framing): Rect {
  const { bw, bh } = base(w, h, aspect);
  const z = clamp(Number.isFinite(f.z) ? f.z : 1, ZOOM_MIN, ZOOM_MAX);
  const sw = bw / z, sh = bh / z;
  const cx = clamp(Number.isFinite(f.x) ? f.x : 0.5, 0, 1) * w, cy = clamp(Number.isFinite(f.y) ? f.y : 0.5, 0, 1) * h;
  return { sx: cx - sw / 2, sy: cy - sh / 2, sw, sh };
}

/** O recorte cobre a pintura inteira, sem sobra (nada precisa ser preenchido)? */
export function coversAll(w: number, h: number, r: Rect): boolean {
  return r.sx >= -0.5 && r.sy >= -0.5 && r.sx + r.sw <= w + 0.5 && r.sy + r.sh <= h + 0.5;
}

/** O mesmo enquadramento, com o centro dentro da pintura e o zoom no intervalo. */
export function clampFraming(w: number, h: number, aspect: number, f: Framing): Framing {
  const r = cropRect(w, h, aspect, f);
  const round = (v: number) => Math.round(v * 10000) / 10000;
  return { x: round((r.sx + r.sw / 2) / w), y: round((r.sy + r.sh / 2) / h), z: round(clamp(f.z, ZOOM_MIN, ZOOM_MAX)) };
}

/** Prende o recorte dentro da pintura (o "Encaixar" de quem quer sem sobra): mantém o zoom, no mínimo 1. */
export function snapInside(w: number, h: number, aspect: number, f: Framing): Framing {
  const z = Math.max(1, f.z);
  const { bw, bh } = base(w, h, aspect);
  const sw = bw / z, sh = bh / z;
  const sx = clamp(f.x * w - sw / 2, 0, w - sw), sy = clamp(f.y * h - sh / 2, 0, h - sh);
  return clampFraming(w, h, aspect, { x: (sx + sw / 2) / w, y: (sy + sh / 2) / h, z });
}

/**
 * Arrastar a imagem: o deslocamento em pixels da tela vira novo centro (o recorte anda ao contrário da mão).
 * Com sobra (overscan), o recorte aparece maior que a caixa, então cada pixel da tela vale menos da original.
 */
export function pan(w: number, h: number, aspect: number, f: Framing, dx: number, dy: number, boxW: number, boxH: number, overscan = 1): Framing {
  const r = cropRect(w, h, aspect, f);
  const kx = r.sw / (boxW * overscan), ky = r.sh / (boxH * overscan);
  return clampFraming(w, h, aspect, { ...f, x: (r.sx + r.sw / 2 - dx * kx) / w, y: (r.sy + r.sh / 2 - dy * ky) / h });
}

/**
 * Onde a imagem original fica, em porcentagem da caixa da arte, para o recorte ocupar a caixa com a sobra do site
 * (overscan 1.1: o recorte vai de -5% a 105%). Serve para mostrar o enquadramento ao vivo sem gerar imagem.
 */
export function placeInBox(w: number, h: number, aspect: number, f: Framing, overscan = OVERSCAN) {
  const r = cropRect(w, h, aspect, f);
  const off = (overscan - 1) / 2;
  const width = (w / r.sw) * overscan, height = (h / r.sh) * overscan;
  return { left: (-off - (r.sx / r.sw) * overscan) * 100, top: (-off - (r.sy / r.sh) * overscan) * 100, width: width * 100, height: height * 100 };
}

/** Quantas colunas e a largura de cada figurinha (em % da largura da página) para N figurinhas numa página do álbum. */
export function slotLayout(n: number): { cols: number; cw: number } {
  if (n <= 1) return { cols: 1, cw: 40 };
  // Área útil da página (460 × 640) em % da largura, já sem margens e título; cada espaço tem a legenda embaixo.
  const W = 84, H = 96, gap = 3.4, cap = 8;
  const size = (cols: number) => {
    const rows = Math.ceil(n / cols);
    return Math.min((W - gap * (cols - 1)) / cols, ((H - gap * (rows - 1)) / rows - cap) / 1.4, 40);
  };
  // Até 6, o desenho de sempre (uma fileira de até 3; 4 em 2 × 2). Daí para cima, a grade que deixa a figurinha maior.
  let cols = n <= 3 ? n : n === 4 ? 2 : n <= 6 ? 3 : 0;
  if (!cols) { cols = 3; for (let c = 3; c <= 4; c++) if (size(c) > size(cols) + 0.01) cols = c; }
  return { cols, cw: Math.floor(size(cols) * 10) / 10 };
}

/**
 * Página com figurinhas em pé e deitadas: as duas têm a mesma área (mesmo destaque). A em pé tem largura L e altura
 * 1,4·L; a deitada, largura 1,4·L e altura L. As figurinhas vão em fileiras centradas, na ordem; devolve a maior
 * largura L (em % da largura da página) que faz tudo caber.
 */
export function mixedLayout(kinds: ('v' | 'h')[]): { pw: number; rows: number[][] } {
  const W = 84, H = 96, gap = 3.4, cap = 8;
  const n = kinds.length;
  if (!n) return { pw: 24, rows: [] };
  const width = (k: 'v' | 'h', L: number) => (k === 'h' ? 1.4 * L : L);
  const height = (k: 'v' | 'h', L: number) => (k === 'h' ? L : 1.4 * L);
  const pack = (L: number) => {
    const rows: number[][] = []; let cur: number[] = [], used = 0;
    kinds.forEach((k, i) => {
      const w = width(k, L);
      if (cur.length && used + gap + w > W + 0.01) { rows.push(cur); cur = []; used = 0; }
      used += (cur.length ? gap : 0) + w; cur.push(i);
    });
    if (cur.length) rows.push(cur);
    const total = rows.reduce((t, r) => t + Math.max(...r.map((i) => height(kinds[i], L))) + cap, 0) + gap * (rows.length - 1);
    return { rows, ok: total <= H + 0.01 };
  };
  const max = n === 1 ? (kinds[0] === 'h' ? 40 : 40) : 30;
  for (let L = max; L >= 8; L -= 0.2) { const r = pack(L); if (r.ok) return { pw: Math.floor(L * 10) / 10, rows: r.rows }; }
  return { pw: 8, rows: pack(8).rows };
}

/** Divide as figurinhas de uma seção em páginas de até perPage. */
export function chunk<T>(list: T[], perPage: number): T[][] {
  const n = Math.max(1, Math.min(12, Math.round(perPage) || 6));
  if (!list.length) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}

/** Move um item numa lista (para arrastar e soltar): tira de onde estava e põe antes do índice pedido. */
export function moveTo<T>(list: T[], item: T, before: number): T[] {
  const from = list.indexOf(item);
  const out = list.filter((x) => x !== item);
  const fim = before < 0 || before >= list.length;
  let at = fim ? out.length : before;
  if (!fim && from >= 0 && from < at) at -= 1;
  out.splice(Math.max(0, Math.min(out.length, at)), 0, item);
  return out;
}

/** O lugar de uma figurinha na página montada à mão: centro em % da largura (x) e da altura (y) da página. */
export interface Pos { x: number; y: number }
interface LeafItem { leaf?: number | null; pos?: Pos | null; landscape?: boolean }

/**
 * As páginas de uma seção. Com leaf (página escolhida à mão), agrupa por ela; as que ainda não têm vão para páginas
 * novas depois, divididas por perPage. Sem nenhuma leaf, divide tudo por perPage. A ordem de dentro é a de entrada.
 */
export function sectionLeaves<T extends LeafItem>(list: T[], perPage: number): T[][] {
  const chosen = list.filter((s) => s.leaf != null && s.leaf > 0);
  if (!chosen.length) return chunk(list, perPage);
  const groups = new Map<number, T[]>();
  for (const s of chosen) { const g = groups.get(s.leaf!) ?? []; g.push(s); groups.set(s.leaf!, g); }
  const out = [...groups.keys()].sort((a, b) => a - b).map((k) => groups.get(k)!);
  const rest = list.filter((s) => !(s.leaf != null && s.leaf > 0));
  if (rest.length) out.push(...chunk(rest, perPage));
  return out;
}

/** Como uma página arruma as suas figurinhas: em fileiras (automático) ou nos lugares escolhidos (livre). */
export function leafMode(list: LeafItem[]): 'rows' | 'free' {
  return list.length > 0 && list.some((s) => s.pos && Number.isFinite(s.pos.x) && Number.isFinite(s.pos.y)) ? 'free' : 'rows';
}

export const clampPos = (p: Pos): Pos => ({ x: Math.round(Math.min(96, Math.max(4, p.x)) * 10) / 10, y: Math.round(Math.min(97, Math.max(3, p.y)) * 10) / 10 });
