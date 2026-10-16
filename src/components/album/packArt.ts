/**
 * As embalagens Ônix (padrão) e Prisma (especial), desenhadas em canvas. Cada uma é desenhada três vezes (cor,
 * material e relevo), vira um mapa de alturas com almofada, selagem serrilhada, rugas, vincos nos cantos e relevo
 * do foil, e é iluminada na hora conforme o mouse ou o dedo.
 */
import { LOGO_D } from './render';

export type PackDesign = 'onix' | 'prisma';
export const PACK_AR = 1619 / 971;
const HU = 100 * PACK_AR, CT = HU * 0.1, CB = HU * 0.92, PERF = HU * 0.153;
const MONO = '"IBM Plex Mono",ui-monospace,monospace', CIN = 'Cinzel,"Trajan Pro",Georgia,serif', ARC = 'Archivo,"Arial Black",Arial,sans-serif';
type Ctx = CanvasRenderingContext2D;
type Col = string | ((c: Ctx) => CanvasGradient);
type Mat = [number, number, number]; // metal, holográfico, brilho
type Build = (c: Ctx) => void;
interface Painter {
  fill(b: Build, col: Col, mat: Mat, emb: number): void;
  stroke(b: Build, col: Col, mat: Mat, emb: number, lw: number): void;
  text(str: string, x: number, y: number, font: string, col: Col, mat: Mat, emb: number, sp?: number, align?: 'center' | 'left' | 'right'): void;
  logo(x: number, y: number, w: number, col: Col, mat: Mat, emb: number): void;
}

let LOGO_P: Path2D | null = null;
const grad = (stops: [number, string][], x0: number, y0: number, x1: number, y1: number) => (c: Ctx) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const GOLDS: [number, string][] = [[0, '#fff3d2'], [0.28, '#e6bd6c'], [0.52, '#9c6c2e'], [0.78, '#f2d491'], [1, '#b8873e']];
const PGOLD = (x0: number, y0: number, x1: number, y1: number) => grad(GOLDS, x0, y0, x1, y1);
const SILVER = (x0: number, y0: number, x1: number, y1: number) => grad([[0, '#fbfcfd'], [0.35, '#b9bec6'], [0.6, '#7d838c'], [0.85, '#eef0f3'], [1, '#a3a8b0']], x0, y0, x1, y1);

function packOutline(c: Ctx) {
  const zz = 2.4, zh = 1.5; c.beginPath(); c.moveTo(0, zh);
  for (let x = 0; x < 100 - 1e-6; x += zz) { c.lineTo(Math.min(100, x + zz / 2), 0); c.lineTo(Math.min(100, x + zz), zh); }
  c.lineTo(100, CT); c.bezierCurveTo(99.3, CT + 1.8, 98.5, CT + 5, 98.8, CT + 14); c.bezierCurveTo(99.6, HU * 0.42, 99.6, HU * 0.62, 98.8, CB - 12); c.bezierCurveTo(98.5, CB - 4, 99.3, CB - 1.6, 100, CB);
  c.lineTo(100, HU - zh);
  for (let x = 100; x > 1e-6; x -= zz) { c.lineTo(Math.max(0, x - zz / 2), HU); c.lineTo(Math.max(0, x - zz), HU - zh); }
  c.lineTo(0, CB); c.bezierCurveTo(0.7, CB - 1.6, 1.5, CB - 4, 1.2, CB - 12); c.bezierCurveTo(0.4, HU * 0.62, 0.4, HU * 0.42, 1.2, CT + 14); c.bezierCurveTo(1.5, CT + 5, 0.7, CT + 1.8, 0, CT);
  c.closePath();
}
function spaced(c: Ctx, str: string, x: number, y: number, sp: number, align: string) {
  const ch = [...str], ws = ch.map((t) => c.measureText(t).width); const w = ws.reduce((a, b) => a + b, 0) + sp * (ch.length - 1);
  let cx = align === 'left' ? x : align === 'right' ? x - w : x - w / 2; c.textAlign = 'left'; ch.forEach((t, i) => { c.fillText(t, cx, y); cx += ws[i] + sp; });
}
function painter(c: Ctx, pass: 'c' | 'm' | 'e'): Painter {
  const ms = (m: Mat) => `rgb(${Math.round(m[0] * 255)},${Math.round(m[1] * 255)},${Math.round(m[2] * 255)})`;
  const st = (col: Col, mat: Mat, emb: number) => (pass === 'c' ? (typeof col === 'function' ? col(c) : col) : pass === 'm' ? ms(mat) : `rgba(255,255,255,${emb || 0})`);
  const skip = (emb: number) => pass === 'e' && !emb;
  return {
    fill(b, col, mat, emb) { if (skip(emb)) return; c.save(); c.beginPath(); b(c); c.fillStyle = st(col, mat, emb); c.fill('evenodd'); c.restore(); },
    stroke(b, col, mat, emb, lw) { if (skip(emb)) return; c.save(); c.beginPath(); b(c); c.lineWidth = lw; c.lineJoin = 'miter'; c.strokeStyle = st(col, mat, emb); c.stroke(); c.restore(); },
    text(str, x, y, font, col, mat, emb, sp = 0, align = 'center') { if (skip(emb)) return; c.save(); c.font = font; c.fillStyle = st(col, mat, emb); spaced(c, str, x, y, sp, align); c.restore(); },
    logo(x, y, w, col, mat, emb) { if (skip(emb)) return; c.save(); c.translate(x, y); c.scale(w / 506, w / 506); c.fillStyle = st(col, mat, emb); c.fill(LOGO_P!); c.restore(); },
  };
}
const crimp = (P: Painter, col: Col, mat: Mat) => { P.fill((c) => { c.rect(0, 0, 100, CT); c.rect(0, CB, 100, HU - CB); }, col, mat, 0); P.fill((c) => { c.rect(0, CT - 0.7, 100, 0.45); c.rect(0, CB + 0.25, 100, 0.45); }, 'rgba(0,0,0,.4)', [0.2, 0, 0.3], 0); };
const perf = (P: Painter, col: string) => { for (let x = 3; x < 96.5; x += 2.1) P.fill((c) => c.rect(x, PERF - 0.22, 1.15, 0.44), col, [0, 0, 0.2], 0); P.text('PUXE ›', 96, PERF - 1.5, `600 2.4px ${MONO}`, col, [0, 0, 0.2], 0, 0.45, 'right'); };
const odds = (P: Painter, y: number, col: string) => P.text('COMUM 70% · INCOMUM 22% · RARA 7% · LENDÁRIA 1%', 50, y, `500 1.95px ${MONO}`, col, [0, 0, 0.2], 0, 0.22);
const dia = (x: number, y: number, s: number): Build => (c) => { c.moveTo(x, y - s); c.lineTo(x + s * 0.7, y); c.lineTo(x, y + s); c.lineTo(x - s * 0.7, y); c.closePath(); };
const star4 = (x: number, y: number, R: number, r: number): Build => (c) => { for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 4, rr = i % 2 ? r : R; if (i) c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); };
const rrect = (x: number, y: number, w: number, h: number, r: number): Build => (c) => { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };

const DESIGNS: Record<PackDesign, (P: Painter) => void> = {
  onix(P) {
    P.fill((c) => c.rect(0, 0, 100, HU), grad([[0, '#2c2c31'], [0.45, '#151518'], [1, '#0a0a0c']], 0, 0, 100, HU), [0.62, 0, 0.7], 0);
    for (let y = CT + 3; y < CB - 2; y += 2.6) P.fill((c) => c.rect(2, y, 96, 0.12), 'rgba(255,255,255,.03)', [0.5, 0, 0.6], 0);
    crimp(P, PGOLD(0, 0, 100, CT), [1, 0, 1]);
    P.text('WINNERZ  ✦  TEMPORADA 1  ✦  WINNERZ', 50, CT - 3.6, `600 2.2px ${MONO}`, 'rgba(70,45,12,.55)', [0.9, 0, 1], 0.35, 0.9);
    const ch = (i: number): Build => (c) => { const x0 = 7 + i, x1 = 93 - i, y0 = 32 + i, y1 = 147 - i, d = 4.2; c.moveTo(x0 + d, y0); c.lineTo(x1 - d, y0); c.lineTo(x1, y0 + d); c.lineTo(x1, y1 - d); c.lineTo(x1 - d, y1); c.lineTo(x0 + d, y1); c.lineTo(x0, y1 - d); c.lineTo(x0, y0 + d); c.closePath(); };
    P.stroke(ch(0), PGOLD(7, 32, 93, 147), [1, 0, 1], 0.55, 0.6); P.stroke(ch(1.4), PGOLD(7, 32, 93, 147), [1, 0, 1], 0.3, 0.22);
    [[9.1, 34.1], [90.9, 34.1], [9.1, 144.9], [90.9, 144.9], [50, 32], [50, 147]].forEach(([x, y]) => P.fill(dia(x, y, 1.6), PGOLD(x - 2, y - 2, x + 2, y + 2), [1, 0, 1], 0.7));
    P.logo(21, 41, 58, PGOLD(0, 0, 506, 280), [1, 0, 1], 1);
    P.text('TEMPORADA 1', 50, 88, `700 7.6px ${CIN}`, PGOLD(15, 80, 85, 89), [1, 0, 1], 0.6, 1);
    P.text('ÁLBUM DE FIGURINHAS', 50, 94.5, `500 2.9px ${MONO}`, '#bba67c', [0, 0, 0.3], 0, 0.8);
    P.fill((c) => c.rect(9, 101, 82, 1.5), '#ecebf6', [1, 1, 1], 0.3);
    P.stroke(rrect(35, 108.5, 30, 6.2, 3.1), PGOLD(35, 108, 65, 115), [1, 0, 1], 0.35, 0.35);
    P.text('5 FIGURINHAS', 50, 112.6, `600 2.5px ${MONO}`, '#ecd29b', [0.9, 0, 1], 0.25, 0.55);
    P.fill((c) => c.arc(77.5, 127, 7.6, 0, Math.PI * 2), '#ebe8f4', [1, 1, 1], 0.45);
    P.stroke((c) => c.arc(77.5, 127, 6.3, 0, Math.PI * 2), 'rgba(40,30,60,.5)', [0, 0, 0.3], 0, 0.18);
    P.text('ORIGINAL', 77.5, 126.4, `800 1.9px ${ARC}`, '#2a2340', [0, 0, 0.3], 0, 0.25); P.text('WINNERZ', 77.5, 129.2, `800 1.9px ${ARC}`, '#2a2340', [0, 0, 0.3], 0, 0.25);
    P.logo(16, 123, 12, '#6f6655', [0, 0, 0.3], 0);
    odds(P, 141, '#857b67'); perf(P, 'rgba(255,255,255,.4)');
  },
  prisma(P) {
    P.fill((c) => c.rect(0, 0, 100, HU), '#e4e2ee', [1, 1, 1], 0);
    crimp(P, SILVER(0, 0, 100, CT), [1, 0, 1]);
    for (let i = 0; i < 26; i++) { const x = 6 + ((i * 37) % 88), y = CT + 6 + ((i * 53) % (CB - CT - 12)); P.fill(star4(x, y, 1.1, 0.25), 'rgba(255,255,255,.95)', [0, 0, 0.5], 0); }
    P.logo(40, 31, 20, '#16121f', [0, 0, 0.35], 0.15);
    P.text('T1', 50, 103, `800 60px ${ARC}`, '#16121f', [0, 0, 0.35], 0.15, -2);
    P.text('PACOTE ESPECIAL', 50, 118.5, `800 5.4px ${ARC}`, '#16121f', [0, 0, 0.35], 0.1, 0.3);
    P.text('WINNERZ · TEMPORADA 1 · 5 FIGURINHAS', 50, 125, `600 2.3px ${MONO}`, '#2b2540', [0, 0, 0.35], 0, 0.45);
    odds(P, 145, '#2b2540'); perf(P, 'rgba(22,18,31,.55)');
  },
};

/* ---- relevo ---- */
function hash(ix: number, iy: number) { const s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1); return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function boxBlur(src: Float32Array, W: number, H: number, r: number) {
  if (r < 1) return src; const tmp = new Float32Array(W * H), out = new Float32Array(W * H), n = 2 * r + 1;
  for (let y = 0; y < H; y++) { let acc = 0; const o = y * W; for (let x = -r; x <= r; x++) acc += src[o + Math.min(W - 1, Math.max(0, x))]; for (let x = 0; x < W; x++) { tmp[o + x] = acc / n; acc += src[o + Math.min(W - 1, x + r + 1)] - src[o + Math.max(0, x - r)]; } }
  for (let x = 0; x < W; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x]; for (let y = 0; y < H; y++) { out[y * W + x] = acc / n; acc += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x]; } }
  return out;
}
const sm = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function addLine(h: Float32Array, W: number, H: number, x0: number, y0: number, x1: number, y1: number, amp: number, wid: number, fadeFrom: boolean) {
  const minx = Math.max(0, Math.floor(Math.min(x0, x1) - wid)), maxx = Math.min(W - 1, Math.ceil(Math.max(x0, x1) + wid)), miny = Math.max(0, Math.floor(Math.min(y0, y1) - wid)), maxy = Math.min(H - 1, Math.ceil(Math.max(y0, y1) + wid));
  const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
  for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
    let t = ((x - x0) * dx + (y - y0) * dy) / L2; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(x - (x0 + dx * t), y - (y0 + dy * t)); if (d >= wid) continue;
    const prof = 1 - d / wid, along = fadeFrom ? Math.pow(1 - t, 1.3) : Math.sin(Math.PI * t); h[y * W + x] += amp * prof * prof * along;
  }
}

export interface PackRender { W: number; H: number; base: Uint8ClampedArray; A: Uint8Array; M: Float32Array; HO: Float32Array; GL: Float32Array; NX: Float32Array; NY: Float32Array; NZ: Float32Array; AO: Float32Array; out: ImageData; L: [number, number, number] }
export const DEFAULT_LIGHT: [number, number, number] = [-0.35, -0.55, 0.76];

/** Desenha a embalagem para uma largura na tela (em px) e devolve os mapas prontos para iluminar. */
export async function buildPack(kind: PackDesign, cssW: number): Promise<PackRender> {
  if (!LOGO_P) LOGO_P = new Path2D(LOGO_D);
  try { await Promise.race([Promise.all([document.fonts.load(`700 10px ${CIN}`), document.fonts.load(`800 10px ${ARC}`), document.fonts.load(`500 10px ${MONO}`)]), new Promise((r) => setTimeout(r, 1500))]); } catch { /* segue com a fonte que tiver */ }
  const W = Math.min(460, Math.round(cssW * Math.min(2, devicePixelRatio || 1))), H = Math.round(W * PACK_AR), k = W / 100, N = W * H;
  const layer = (pass: 'c' | 'm' | 'e') => {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d', { willReadFrequently: true })!; c.scale(k, k); c.save(); packOutline(c); c.clip();
    if (pass === 'm') { c.fillStyle = 'rgb(0,0,100)'; c.fillRect(0, 0, 100, HU); }
    DESIGNS[kind](painter(c, pass)); c.restore(); return c.getImageData(0, 0, W, H).data;
  };
  const base = layer('c'), mat = layer('m'), emb = layer('e');
  const A = new Uint8Array(N), M = new Float32Array(N), HO = new Float32Array(N), GL = new Float32Array(N), E = new Float32Array(N);
  for (let i = 0; i < N; i++) { A[i] = base[i * 4 + 3]; M[i] = mat[i * 4] / 255; HO[i] = mat[i * 4 + 1] / 255; GL[i] = mat[i * 4 + 2] / 255; E[i] = emb[i * 4 + 3] / 255; }
  const h = new Float32Array(N), cT = (CT / HU) * H, cB = (CB / HU) * H, per = 2.4 * k;
  for (let y = 0; y < H; y++) { const v = y / H; for (let x = 0; x < W; x++) { const u = x / W, i = y * W + x; let z;
    if (y < cT || y > cB) { const tri = Math.abs(((x / per) % 1) - 0.5) * 2; z = 0.55 * k * tri + 0.25 * k * vnoise(x / (3 * k), y / (1.2 * k)); }
    else {
      const ex = sm(0, 0.24, Math.min(u, 1 - u)), ey = sm(0, 0.11, Math.min(v - 0.1, 0.92 - v)); z = 11 * k * Math.pow(ex * ey, 0.85);
      z += 2.2 * k * (vnoise(x / (42 * k), y / (46 * k)) - 0.5) + 0.28 * k * (vnoise(x / (15 * k) + 9, y / (17 * k) + 3) - 0.5) + 0.035 * k * (vnoise(x / (1.8 * k) + 31, y / (1.8 * k) + 17) - 0.5);
      z -= 0.5 * k * Math.max(0, 1 - Math.abs(y - cT) / (0.8 * k)) + 0.5 * k * Math.max(0, 1 - Math.abs(y - cB) / (0.8 * k));
    }
    h[i] = z; } }
  const rnd = (a: number) => hash(a * 7.3, a * 1.9);
  for (let n = 0; n < 13; n++) { const x0 = (6 + n * 7.1 + rnd(n) * 4) * k, len = (5 + rnd(n + 40) * 10) * k, ang = (x0 / W - 0.5) * -0.5 + (rnd(n + 80) - 0.5) * 0.3;
    addLine(h, W, H, x0, cT, x0 + Math.sin(ang) * len, cT + Math.cos(ang) * len, (n % 2 ? 1 : -1) * (0.9 + rnd(n + 3) * 0.8) * k, (0.9 + rnd(n + 5) * 0.7) * k, true); }
  for (let n = 0; n < 11; n++) { const x0 = (8 + n * 8.2 + rnd(n + 200) * 4) * k, len = (3.5 + rnd(n + 240) * 7) * k, ang = (x0 / W - 0.5) * 0.5;
    addLine(h, W, H, x0, cB, x0 + Math.sin(ang) * len, cB - Math.cos(ang) * len, (n % 2 ? 1 : -1) * (0.8 + rnd(n + 7) * 0.6) * k, (0.9 + rnd(n + 9) * 0.6) * k, true); }
  ([[0, cT, 1, 1], [W, cT, -1, 1], [0, cB, 1, -1], [W, cB, -1, -1]] as const).forEach(([cx, cy, sx, sy]) => {
    addLine(h, W, H, cx, cy, cx + sx * 15 * k, cy + sy * 11 * k, -1.6 * k, 1.3 * k, true);
    addLine(h, W, H, cx + sx * 1.5 * k, cy, cx + sx * 19 * k, cy + sy * 6.5 * k, 1.1 * k, 1.4 * k, true);
    addLine(h, W, H, cx, cy + sy * 2 * k, cx + sx * 8 * k, cy + sy * 16 * k, 0.9 * k, 1.2 * k, true);
  });
  addLine(h, W, H, W * 0.08, H * 0.62, W * 0.95, H * 0.48, 0.9 * k, 6 * k, false);
  addLine(h, W, H, W * 0.12, H * 0.3, W * 0.55, H * 0.4, -0.7 * k, 4 * k, false);
  addLine(h, W, H, W * 0.6, H * 0.75, W * 0.93, H * 0.86, 0.6 * k, 3.5 * k, false);
  addLine(h, W, H, W * 0.3, H * 0.84, W * 0.7, H * 0.8, -0.45 * k, 2.5 * k, false);
  const Eb = boxBlur(boxBlur(E, W, H, Math.max(1, Math.round(0.35 * k))), W, H, Math.max(1, Math.round(0.25 * k)));
  for (let i = 0; i < N; i++) h[i] += Eb[i] * 0.9 * k;
  const NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N), AO = new Float32Array(N), hb = boxBlur(h, W, H, Math.round(2.2 * k));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; const l = h[i - (x > 0 ? 1 : 0)], r = h[i + (x < W - 1 ? 1 : 0)], t = h[i - (y > 0 ? W : 0)], b = h[i + (y < H - 1 ? W : 0)];
    const nx = -(r - l) * 0.5, ny = -(b - t) * 0.5, nz = 1; const L = Math.hypot(nx, ny, nz); NX[i] = nx / L; NY[i] = ny / L; NZ[i] = nz / L; AO[i] = Math.max(0.55, Math.min(1.06, 1 - ((hb[i] - h[i]) * 0.09) / k));
  }
  return { W, H, base, A, M, HO, GL, NX, NY, NZ, AO, out: new ImageData(W, H), L: DEFAULT_LIGHT };
}

const HOLO_PAL = (() => { const p = new Float32Array(256 * 3); for (let i = 0; i < 256; i++) { const hh = (i / 256) * 6, c = 0.48, x = c * (1 - Math.abs((hh % 2) - 1)); const [r, g, b] = hh < 1 ? [c, x, 0] : hh < 2 ? [x, c, 0] : hh < 3 ? [0, c, x] : hh < 4 ? [0, x, c] : hh < 5 ? [x, 0, c] : [c, 0, x]; p[i * 3] = (r + 0.42) * 255; p[i * 3 + 1] = (g + 0.42) * 255; p[i * 3 + 2] = (b + 0.42) * 255; } return p; })();

/** Ilumina a embalagem com a luz em PK.L e desenha nas telas dadas. */
export function shadePack(PK: PackRender, targets: HTMLCanvasElement[]) {
  const { W, H, base, A, M, HO, GL, NX, NY, NZ, AO, out } = PK, o = out.data;
  let [lx, ly, lz] = PK.L; const ll = Math.hypot(lx, ly, lz); lx /= ll; ly /= ll; lz /= ll;
  let hx = lx, hy = ly, hz = lz + 1; const hl = Math.hypot(hx, hy, hz); hx /= hl; hy /= hl; hz /= hl;
  const ph = lx * 3.1 + ly * 2.3, phh = lx * 0.8 + ly * 0.5;
  for (let y = 0, i = 0; y < H; y++) { const v = y / H; for (let x = 0; x < W; x++, i++) {
    const a = A[i]; const j = i * 4; if (!a) { o[j + 3] = 0; continue; }
    const nx = NX[i], ny = NY[i], nz = NZ[i];
    let r = base[j], g = base[j + 1], b = base[j + 2];
    const ndl = nx * lx + ny * ly + nz * lz, diff = ndl > 0 ? ndl : 0;
    let s = nx * hx + ny * hy + nz * hz; s = s > 0 ? s : 0; s *= s; s *= s; s *= s; s *= s; const s64 = s * s * (s * s);
    const rx = 2 * nz * nx, ry = 2 * nz * ny;
    const ho = HO[i]; if (ho > 0) { let t = (rx * 0.9 + ry * 0.7 + (x / W) * 0.35 + v * 0.3 + phh) % 1; if (t < 0) t += 1; const q = ((t * 255) | 0) * 3; r += (HOLO_PAL[q] - r) * ho; g += (HOLO_PAL[q + 1] - g) * ho; b += (HOLO_PAL[q + 2] - b) * ho; }
    let bd = 0.5 + 0.5 * Math.sin(rx * 4.4 + ry * 2.7 + ph); bd = bd * bd * bd;
    const ao = AO[i], m = M[i], gl = GL[i];
    const kd = (0.3 + 0.84 * diff) * ao, sp = gl * (s64 * 235 + s * 22);
    const km = (0.12 + 0.38 * diff + 1.05 * bd) * ao, msp = s64 * 270 + s * 55;
    const R0 = r * kd + sp, G0 = g * kd + sp, B0 = b * kd + sp;
    const R1 = r * km + msp * (0.45 + (0.55 * r) / 255), G1 = g * km + msp * (0.45 + (0.55 * g) / 255), B1 = b * km + msp * (0.45 + (0.55 * b) / 255);
    o[j] = R0 + (R1 - R0) * m; o[j + 1] = G0 + (G1 - G0) * m; o[j + 2] = B0 + (B1 - B0) * m; o[j + 3] = a;
  } }
  const [first, ...rest] = targets;
  if (!first) return;
  first.getContext('2d')!.putImageData(out, 0, 0);
  for (const t of rest) { const c = t.getContext('2d')!; c.clearRect(0, 0, t.width, t.height); c.drawImage(first, 0, 0); }
}
