/**
 * Mapa ilustrado da Jornada: uma ilha pintada em relevo, desenhada no navegador.
 * Cada capítulo vira uma região (floresta, montanhas, neve, vulcão, deserto…), a trilha passa por elas
 * e o que ainda não aconteceu fica a lápis. Luz quente, sombra fria e pinceladas que seguem o relevo.
 * Sem imagens de fora: tudo sai de ruído e de pinceladas em canvas.
 */

export const MAP_W = 3000;
export const MAP_H = 1800;

export type Biome = 'floresta' | 'montanha' | 'neve' | 'vulcao' | 'deserto';
export const BIOMES: Biome[] = ['floresta', 'montanha', 'neve', 'deserto', 'vulcao'];
export const BIOME_NAME: Record<Biome, string> = { floresta: 'Floresta', montanha: 'Montanhas', neve: 'Neve', vulcao: 'Vulcão', deserto: 'Deserto' };

export type MapRegion = { x: number; y: number; biome: Biome };
export type MapPlan = {
  /** Trilha completa (do começo até o fim imaginado), em pontos do mapa. */
  path: [number, number][];
  /** Até onde a trilha já foi percorrida (0..1 do comprimento em x). */
  explored: number;
  regions: MapRegion[];
  /** Onde fica o marco do fim (na névoa). */
  goal: [number, number];
  title: string;
  subtitle: string;
  stats: string;
  lite: boolean;
};

// ---------------------------------------------------------------- ruído
function ihash(x: number, y: number, sd: number) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(sd, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vn(x: number, y: number, sd = 1) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = ihash(xi, yi, sd), b = ihash(xi + 1, yi, sd), c = ihash(xi, yi + 1, sd), d = ihash(xi + 1, yi + 1, sd); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x: number, y: number, o: number, sd = 1) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vn(x * f, y * f, sd + i * 17); a *= 0.5; f *= 2.03; } return s; }
function ridge(x: number, y: number, o: number, sd = 1) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { const n = 1 - Math.abs(vn(x * f, y * f, sd + i * 31) * 2 - 1); s += a * n * n; a *= 0.5; f *= 2.1; } return s; }
const sst = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
type RGB = [number, number, number];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function rng(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

const PAL: Record<Biome, { lo: RGB; mid: RGB; hi: RGB; amp: number; ridged: boolean }> = {
  floresta: { lo: hex('#87b04a'), mid: hex('#4d7f34'), hi: hex('#93905c'), amp: 0.14, ridged: false },
  montanha: { lo: hex('#98a866'), mid: hex('#a88c6a'), hi: hex('#f4f2ee'), amp: 1.05, ridged: true },
  neve: { lo: hex('#e4ecf4'), mid: hex('#d2deec'), hi: hex('#ffffff'), amp: 0.85, ridged: true },
  vulcao: { lo: hex('#6a4636'), mid: hex('#3a2620'), hi: hex('#5a4038'), amp: 0.45, ridged: true },
  deserto: { lo: hex('#e2c48a'), mid: hex('#c89a5a'), hi: hex('#a8704a'), amp: 0.3, ridged: false },
};

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/** Pinta o mapa no canvas (MAP_W × MAP_H). Devolve quando termina; dá para cancelar com o sinal. */
export async function paintMap(canvas: HTMLCanvasElement, plan: MapPlan, signal?: { cancelled: boolean }) {
  const W = MAP_W, H = MAP_H, S = plan.lite ? 5 : 4, w = Math.round(W / S), h = Math.round(H / S), N = w * h, R = rng(33), ink = '#2b241f';
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d')!;
  const path = plan.path.map(([x, y]) => [x / S, y / S] as [number, number]);
  const x0 = plan.path[0][0], x1 = plan.path[plan.path.length - 1][0];
  const tAtX = (x: number) => (x - x0) / (x1 - x0);
  const RG = plan.regions.map((r) => ({ ...r, ux: r.x / S, uy: r.y / S }));
  const sig = Math.max(70, (w * 0.75) / Math.max(1, RG.length));
  const LAKE: [number, number] | null = RG[0]?.biome === 'floresta' ? [RG[0].ux + 40, RG[0].uy + 48] : null;
  const volIdx = RG.findIndex((r) => r.biome === 'vulcao');
  const VOL: [number, number] | null = volIdx >= 0 ? [RG[volIdx].ux + 20, RG[volIdx].uy - 50] : null;

  const HGT = new Float32Array(N), LAND = new Float32Array(N), WB = new Float32Array(N * RG.length), EXP = new Float32Array(N);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, u = x / w, v = y / h;
      let dmin = 1e9; for (let k = 0; k < path.length; k += 3) { const dx = x - path[k][0], dy = y - path[k][1], d = dx * dx + dy * dy; if (d < dmin) dmin = d; } dmin = Math.sqrt(dmin);
      const el = Math.hypot((u - 0.5) / 0.48, (v - 0.52) / 0.44);
      const land = 1 - el + (fbm(u * 5, v * 5, 4, 3) - 0.5) * 0.55 + Math.exp(-((dmin / 70) ** 2)) * 0.45;
      LAND[i] = land;
      let ws = 0; for (let k = 0; k < RG.length; k++) { const dx = x - RG[k].ux, dy = y - RG[k].uy, wk = Math.exp(-(dx * dx + dy * dy) / (2 * sig * sig)) + 1e-4; WB[i * RG.length + k] = wk; ws += wk; }
      for (let k = 0; k < RG.length; k++) WB[i * RG.length + k] /= ws;
      const valley = sst(10, 55, dmin), base = fbm(u * 9, v * 9, 4, 7) * 0.25, rg = ridge(u * 7, v * 7, 5, 11), sm = fbm(u * 22, v * 22, 3, 5);
      let ht = base;
      for (let k = 0; k < RG.length; k++) { const p = PAL[RG[k].biome], wk = WB[i * RG.length + k]; if (wk > 0.002) ht += wk * (p.ridged ? rg : sm) * p.amp * valley; }
      if (VOL) { const vd = Math.hypot(x - VOL[0], y - VOL[1]); ht += Math.max(0, 1 - vd / 95) ** 1.6 * 1.1 - (vd < 14 ? (1 - vd / 14) * 0.5 : 0); }
      if (LAKE) { const ld = Math.hypot((x - LAKE[0]) / 1.9, y - LAKE[1]); ht -= Math.max(0, 1 - ld / 22) * 0.35; }
      HGT[i] = land > 0 ? ht * sst(0, 0.12, land) : 0;
      EXP[i] = 1 - sst(-0.025, 0.025, tAtX(x * S) - plan.explored + (fbm(u * 6, v * 6, 4, 21) - 0.5) * 0.22 + (v - 0.45) * 0.07);
    }
    if (y % 30 === 0) { await tick(); if (signal?.cancelled) return; }
  }

  // cor por pixel com relevo, luz quente e sombra fria
  const lo = document.createElement('canvas'); lo.width = w; lo.height = h;
  const lg = lo.getContext('2d')!, img = lg.createImageData(w, h), D = img.data, COL = new Float32Array(N * 3);
  const Lx = -0.62, Ly = -0.55, Lz = 0.56, PAPER = hex('#eadcbc');
  const snowIdx = RG.map((r, k) => (r.biome === 'neve' ? k : -1)).filter((k) => k >= 0);
  const volcanic = RG.map((r, k) => (r.biome === 'vulcao' ? k : -1)).filter((k) => k >= 0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, land = LAND[i], ht = HGT[i];
    const hx = HGT[y * w + Math.min(w - 1, x + 1)] - HGT[y * w + Math.max(0, x - 1)], hy = HGT[Math.min(h - 1, y + 1) * w + x] - HGT[Math.max(0, y - 1) * w + x];
    const nx = -hx * 26, ny = -hy * 26, nl = Math.hypot(nx, ny, 1), shade = Math.max(0, (nx * Lx + ny * Ly + Lz) / nl);
    let c: RGB;
    if (land <= 0) {
      const dep = sst(0, 0.35, -land); c = mix(hex('#8cc6c4'), hex('#2e6676'), dep); c = mix(c, [246, 244, 232], (1 - sst(0, 0.03, -land)) * 0.8);
      const wv = (fbm(x * 0.08, y * 0.3, 2, 41) - 0.5) * 18; c = [c[0] + wv, c[1] + wv, c[2] + wv];
    } else {
      c = [0, 0, 0];
      for (let k = 0; k < RG.length; k++) {
        const wk = WB[i * RG.length + k]; if (wk < 0.002) continue;
        const b = RG[k].biome, p = PAL[b], e = Math.min(1, ht / (b === 'montanha' ? 0.95 : b === 'neve' ? 0.8 : 0.7));
        let ck = e < 0.5 ? mix(p.lo, p.mid, e * 2) : mix(p.mid, p.hi, (e - 0.5) * 2);
        if (b === 'montanha' && ht > 0.62) ck = mix(ck, [244, 247, 250], sst(0.62, 0.78, ht));
        if (b === 'floresta') ck = mix(ck, hex('#2f5a28'), sst(0.45, 0.7, fbm(x * 0.06, y * 0.06, 3, 9)) * 0.6);
        if (b === 'deserto') ck = mix(ck, hex('#f0d8a0'), (Math.sin(x * 0.09 + fbm(x * 0.02, y * 0.02, 2, 13) * 6) * 0.5 + 0.5) * 0.35);
        c[0] += ck[0] * wk; c[1] += ck[1] * wk; c[2] += ck[2] * wk;
      }
      c = mix(c, hex('#e8d8a8'), (1 - sst(0, 0.035, land)) * 0.85);
      let wsn = 0; for (const k of snowIdx) wsn += WB[i * RG.length + k];
      const smin = 0.48 + wsn * 0.3, k2 = smin + shade * (1.28 - smin); c = [c[0] * k2, c[1] * k2, c[2] * k2];
      const warm = Math.max(0, shade - 0.62) * 2.2, cool = Math.max(0, 0.55 - shade) * 1.8;
      c = [c[0] + warm * 26 - cool * 14, c[1] + warm * 14 - cool * 6, c[2] - warm * 8 + cool * (16 + wsn * 30)];
      if (wsn > 0.2) c = mix(c, mix([214, 226, 242], [255, 255, 255], shade), sst(0.18, 0.42, ht) * sst(0.2, 0.5, wsn) * 0.9);
      if (LAKE) { const ld = Math.hypot((x - LAKE[0]) / 1.9, y - LAKE[1]); if (ld < 16) c = mix(c, mix(hex('#5f9ec8'), hex('#a8d4ec'), 1 - ld / 16), 1 - sst(10, 16, ld)); }
      if (VOL) { const vd = Math.hypot(x - VOL[0], y - VOL[1]); if (vd < 14) c = mix(c, hex('#ff7a2a'), (1 - vd / 14) * 0.9); }
      let wv = 0; for (const k of volcanic) wv += WB[i * RG.length + k];
      if (wv > 0.3) { const cr = ridge(x * 0.05, y * 0.05, 3, 77); if (cr > 0.62) c = mix(c, hex('#ff8a2a'), sst(0.62, 0.72, cr) * wv * 0.9); }
      const tint = (fbm(x * 0.04, y * 0.04, 3, 55) - 0.5) * 26; c = [c[0] + tint, c[1] + tint * 0.8, c[2] + tint * 0.4];
    }
    const ex = EXP[i];
    if (ex < 1) { const gray = 168 + shade * 70 - (land <= 0 ? 0 : 10); const pc: RGB = land > 0 ? [gray, gray * 0.96, gray * 0.88] : mix(PAPER, [200, 205, 200], 0.3); c = mix(pc, c, ex); }
    COL[i * 3] = c[0]; COL[i * 3 + 1] = c[1]; COL[i * 3 + 2] = c[2];
    D[i * 4] = c[0]; D[i * 4 + 1] = c[1]; D[i * 4 + 2] = c[2]; D[i * 4 + 3] = 255;
  }
  lg.putImageData(img, 0, 0); await tick(); if (signal?.cancelled) return;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(lo, 0, 0, W, H);

  const idx = (x: number, y: number) => Math.max(0, Math.min(h - 1, (y / S) | 0)) * w + Math.max(0, Math.min(w - 1, (x / S) | 0));
  const grad = (i: number) => { const x = i % w, y = (i / w) | 0; const hx = HGT[y * w + Math.min(w - 1, x + 1)] - HGT[y * w + Math.max(0, x - 1)], hy = HGT[Math.min(h - 1, y + 1) * w + x] - HGT[Math.max(0, y - 1) * w + x]; return [Math.atan2(hy, hx) + Math.PI / 2, Math.hypot(hx, hy)]; };

  // pinceladas que seguem o relevo
  const NS = plan.lite ? 18000 : 42000; g.lineCap = 'round';
  for (let k = 0; k < NS; k++) {
    const x = R() * W, y = R() * H, i = idx(x, y), land = LAND[i], ex = EXP[i];
    let [ang, mag] = grad(i); if (land <= 0) ang = (R() - 0.5) * 0.3; else if (mag < 0.004) ang = R() * 6.28;
    const j = (R() - 0.5) * 34, len = land <= 0 ? 10 + R() * 26 : 7 + R() * 20;
    if (ex < 0.5 && land > 0) { g.strokeStyle = `rgba(90,82,74,${0.12 + R() * 0.12})`; g.lineWidth = 1 + R(); }
    else { g.strokeStyle = `rgba(${(COL[i * 3] + j) | 0},${(COL[i * 3 + 1] + j) | 0},${(COL[i * 3 + 2] + j * 0.7) | 0},${0.38 + R() * 0.3})`; g.lineWidth = land <= 0 ? 1.5 + R() * 2 : 2 + R() * 4.5; }
    g.beginPath(); g.moveTo(x - Math.cos(ang) * len / 2, y - Math.sin(ang) * len / 2); g.quadraticCurveTo(x + Math.cos(ang + 1.57) * len * 0.12, y + Math.sin(ang + 1.57) * len * 0.12, x + Math.cos(ang) * len / 2, y + Math.sin(ang) * len / 2); g.stroke();
    if (k % 6000 === 0) { await tick(); if (signal?.cancelled) return; }
  }
  // árvores pintadas com sombra
  const nearPath = (x: number, y: number) => { let d = 1e9; for (let k = 0; k < plan.path.length; k += 2) { const dd = Math.hypot(x - plan.path[k][0], y - plan.path[k][1]); if (dd < d) d = dd; } return d; };
  const trees: [number, number, 'f' | 's' | 'p' | 'c', number][] = [];
  for (let k = 0; k < (plan.lite ? 1600 : 2600); k++) {
    const x = 80 + R() * (W - 160), y = 80 + R() * (H - 160), i = idx(x, y);
    if (LAND[i] < 0.04 || EXP[i] < 0.5) continue;
    if (LAKE && Math.hypot((x / S - LAKE[0]) / 1.9, y / S - LAKE[1]) < 19) continue;
    if (nearPath(x, y) < 34) continue;
    let best = 0, bw = 0; for (let r = 0; r < RG.length; r++) { const wk = WB[i * RG.length + r]; if (wk > bw) { bw = wk; best = r; } }
    const b = RG[best].biome, ht = HGT[i];
    if (b === 'floresta' && bw > 0.5 && R() < 0.9) trees.push([x, y, 'f', 0.7 + R() * 0.7]);
    else if (b === 'montanha' && ht < 0.45 && R() < 0.35) trees.push([x, y, 'p', 0.6 + R() * 0.6]);
    else if (b === 'neve' && ht < 0.5 && R() < 0.5) trees.push([x, y, 's', 0.6 + R() * 0.6]);
    else if (b === 'deserto' && R() < 0.12) trees.push([x, y, 'c', 0.6 + R() * 0.5]);
  }
  trees.sort((a, b) => a[1] - b[1]);
  const dab = (x: number, y: number, r: number, col: string, a: number) => { g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.ellipse(x, y, r * (0.7 + R() * 0.7), r * (0.35 + R() * 0.5), 0, 0, 6.283); g.fill(); g.globalAlpha = 1; };
  for (const [x, y, t, s] of trees) {
    g.globalAlpha = 0.28; g.fillStyle = '#1a2414'; g.beginPath(); g.ellipse(x + 7 * s, y + 2, 9 * s, 3.5 * s, -0.2, 0, 6.283); g.fill(); g.globalAlpha = 1;
    if (t === 'f') { g.fillStyle = '#4a3220'; g.fillRect(x - 1.2 * s, y - 6 * s, 2.4 * s, 7 * s); const cy = y - 12 * s; dab(x + 2 * s, cy + 2 * s, 8 * s, '#24481e', 0.95); dab(x, cy, 7.5 * s, '#3c7a2e', 0.95); dab(x - 2.5 * s, cy - 2.5 * s, 4.5 * s, '#86c050', 0.9); dab(x - 3.5 * s, cy - 3.5 * s, 2 * s, '#d8f090', 0.7); }
    else if (t === 'c') { g.fillStyle = '#4f7a3a'; g.fillRect(x - 2 * s, y - 16 * s, 4 * s, 16 * s); g.fillRect(x + 2 * s, y - 10 * s, 5 * s, 2.5 * s); g.fillRect(x + 5 * s, y - 14 * s, 2.5 * s, 6 * s); g.fillStyle = '#86b060'; g.fillRect(x - 2 * s, y - 16 * s, 1.5 * s, 16 * s); }
    else { const lit = t === 's' ? '#e8f0f8' : '#4f7a4e', dk = t === 's' ? '#7f96b0' : '#24442e'; for (let k = 0; k < 3; k++) { const ww = (7 - k * 1.6) * s, hh = (11 - k * 2) * s, yy = y - k * 6 * s; g.fillStyle = dk; g.beginPath(); g.moveTo(x, yy - hh); g.lineTo(x + ww, yy); g.lineTo(x - ww, yy); g.closePath(); g.fill(); g.fillStyle = lit; g.beginPath(); g.moveTo(x, yy - hh); g.lineTo(x - ww, yy); g.lineTo(x - ww * 0.1, yy); g.closePath(); g.fill(); } }
  }
  await tick(); if (signal?.cancelled) return;
  // rio do lago até o mar
  if (LAKE) {
    const lx = LAKE[0] * S, ly = LAKE[1] * S, pts: [number, number][] = [[lx + 30, ly + 30]]; let x = lx + 30, y = ly + 30;
    for (let k = 0; k < 60; k++) { x += 6 + R() * 6; y += 4 + Math.sin(k * 0.3) * 6 + R() * 3; pts.push([x, y]); if (LAND[idx(x, y)] < -0.01) break; }
    g.lineCap = 'round'; g.lineJoin = 'round';
    ([[12, '#3f7aa8', 0.8], [7, '#7fb8dc', 0.9], [2.5, '#e6f6ff', 0.8]] as const).forEach(([wd, c, a]) => { g.globalAlpha = a; g.strokeStyle = c; g.lineWidth = wd; g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke(); }); g.globalAlpha = 1;
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.5; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(lx - 10, ly - 6, 26 + k * 18, 9 + k * 6, 0.05, 0.4, 2.6); g.stroke(); }
  }
  // ondas
  for (let k = 0; k < 420; k++) { const x = R() * W, y = R() * H; if (LAND[idx(x, y)] > -0.04) continue; g.strokeStyle = 'rgba(240,250,250,.45)'; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, 7, 3.6, 5.8); g.stroke(); g.beginPath(); g.arc(x + 12, y, 7, 3.6, 5.8); g.stroke(); }
  // vulcão: brilho e fumaça
  if (VOL) { const vx = VOL[0] * S, vy = VOL[1] * S; g.save(); if ('filter' in g) g.filter = 'blur(18px)'; g.globalAlpha = 0.55; g.fillStyle = '#ff7a2a'; g.beginPath(); g.arc(vx, vy, 60, 0, 6.283); g.fill(); g.restore(); for (let k = 0; k < 8; k++) dab(vx + 10 + k * 22, vy - 50 - k * 34, 26 + k * 9, k % 2 ? '#9a948c' : '#c8c2b8', 0.45); }
  // traço de tinta nos picos
  const inkLine = (pts: [number, number][], wd: number, a: number) => { g.globalAlpha = a; g.strokeStyle = ink; g.lineWidth = wd; g.lineCap = 'round'; g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo(px + (R() - 0.5) * 1.4, py + (R() - 0.5) * 1.4) : g.moveTo(px, py))); g.stroke(); g.globalAlpha = 1; };
  for (let k = 0; k < 3200; k++) { const x = R() * W, y = R() * H, i = idx(x, y); if (LAND[i] < 0.05 || HGT[i] < 0.62 || R() > 0.06) continue; const s = 0.6 + (HGT[i] - 0.62) * 2.2; inkLine([[x - 18 * s, y + 6 * s], [x - 2 * s, y - 16 * s], [x + 4 * s, y - 12 * s], [x + 20 * s, y + 6 * s]], 1.3, EXP[i] > 0.5 ? 0.55 : 0.3); }
  // pegadas no trecho percorrido
  const walked = plan.path.filter(([x]) => tAtX(x) <= plan.explored);
  for (let k = 2; k < walked.length - 1; k += 3) { const [x, y] = walked[k], [x2, y2] = walked[k + 1], a = Math.atan2(y2 - y, x2 - x), sd = (Math.floor(k / 3) % 2 ? 1 : -1) * 9; g.fillStyle = '#3a2a1a'; g.globalAlpha = 0.4; g.beginPath(); g.ellipse(x - Math.sin(a) * sd, y + Math.cos(a) * sd, 3, 5.5, a, 0, 6.283); g.fill(); } g.globalAlpha = 1;
  // terra incógnita
  if (plan.explored < 0.98) { const [gx, gy] = plan.goal; g.font = '700 54px Caveat, "Segoe Print", cursive'; g.fillStyle = 'rgba(90,80,70,.65)'; g.textAlign = 'center'; g.fillText('terra incógnita', gx - 20, gy + 210); g.font = '500 30px Caveat, "Segoe Print", cursive'; g.fillText('ainda não foi pintado', gx - 10, gy + 250); }
  // cartela, rosa dos ventos, legenda, moldura
  const box = (x: number, y: number, fw: number, fh: number) => { g.strokeStyle = ink; g.lineWidth = 2.5; g.strokeRect(x, y, fw, fh); g.lineWidth = 1; g.strokeRect(x + 7, y + 7, fw - 14, fh - 14); [[x, y], [x + fw, y], [x, y + fh], [x + fw, y + fh]].forEach(([cx, cy]) => { const sx = cx === x ? 1 : -1, sy = cy === y ? 1 : -1; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx + sx * 7, cy + sy * 30); g.quadraticCurveTo(cx + sx * 7, cy + sy * 7, cx + sx * 30, cy + sy * 7); g.stroke(); g.beginPath(); g.arc(cx + sx * 18, cy + sy * 18, 5, 0, 6.283); g.stroke(); }); };
  { const x = 110, y = 90, fw = 760, fh = 150; g.fillStyle = 'rgba(246,236,212,.92)'; g.fillRect(x, y, fw, fh); box(x, y, fw, fh); g.textAlign = 'left'; g.fillStyle = ink; g.font = '700 56px Caveat, "Segoe Print", cursive'; g.fillText(plan.title.length > 30 ? plan.title.slice(0, 29) + '…' : plan.title, x + 36, y + 64); g.fillStyle = '#8a4b1f'; g.font = '700 32px Caveat, "Segoe Print", cursive'; g.fillText(plan.subtitle, x + 36, y + 102); g.fillStyle = '#6b5a4a'; g.font = '500 21px Caveat, "Segoe Print", cursive'; g.fillText(plan.stats, x + 36, y + 130); }
  { const x = 250, y = 1500; g.fillStyle = 'rgba(246,236,212,.85)'; g.beginPath(); g.arc(x, y, 104, 0, 6.283); g.fill(); g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 78, 0, 6.283); g.stroke(); g.lineWidth = 1; g.beginPath(); g.arc(x, y, 52, 0, 6.283); g.stroke(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 - Math.PI / 2, L = k % 2 ? 50 : 86; g.fillStyle = k % 2 ? '#8a4b1f' : ink; g.beginPath(); g.moveTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.lineTo(x + Math.cos(a + 0.35) * 14, y + Math.sin(a + 0.35) * 14); g.lineTo(x + Math.cos(a - 0.35) * 14, y + Math.sin(a - 0.35) * 14); g.closePath(); g.fill(); g.fillStyle = k % 2 ? '#d8a070' : '#f6ecd4'; g.beginPath(); g.moveTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); g.lineTo(x + Math.cos(a - 0.35) * 14, y + Math.sin(a - 0.35) * 14); g.closePath(); g.fill(); } g.font = '700 32px Caveat, "Segoe Print", cursive'; g.textAlign = 'center'; g.fillStyle = '#8a4b1f'; g.fillText('N', x, y - 92); }
  { const x = W - 560, y = H - 230, fw = 440, fh = 140; g.fillStyle = 'rgba(246,236,212,.92)'; g.fillRect(x, y, fw, fh); box(x, y, fw, fh); g.textAlign = 'left'; g.fillStyle = ink; g.font = '700 28px Caveat, "Segoe Print", cursive'; g.fillText('Legenda', x + 24, y + 38); g.fillStyle = '#4a3f36'; g.font = '500 21px Caveat, "Segoe Print", cursive'; ['● sessão   ⚑ para voltar   ✦ momento', '✉ carta   ◆ marco   ☺ você', '— — trilha percorrida   · · · ainda a lápis'].forEach((t, k) => g.fillText(t, x + 24, y + 68 + k * 24)); }
  box(40, 40, W - 80, H - 80);
}

/** Trilha em "S" pela ilha: t de 0 a 1 vira um ponto do mapa. */
export function trailPoint(t: number): [number, number] {
  return [360 + t * 2280 + Math.sin(t * 7) * 70, 1000 + Math.sin(t * 5.2 + 0.4) * 270 - t * 230];
}

/** Guarda a pintura no navegador (IndexedDB), por História e pelo formato da linha do tempo. */
const DB = 'wz-mapas', STORE = 'pinturas';
function idb(): Promise<IDBDatabase | null> {
  return new Promise((res) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch { res(null); }
  });
}
export async function loadPainting(key: string): Promise<Blob | null> {
  const db = await idb(); if (!db) return null;
  return new Promise((res) => { try { const q = db.transaction(STORE).objectStore(STORE).get(key); q.onsuccess = () => res((q.result as Blob) ?? null); q.onerror = () => res(null); } catch { res(null); } });
}
export async function savePainting(key: string, blob: Blob, prefix: string): Promise<void> {
  const db = await idb(); if (!db) return;
  try {
    const tx = db.transaction(STORE, 'readwrite'), st = tx.objectStore(STORE);
    // Uma pintura por História: as versões antigas saem.
    const keys = st.getAllKeys();
    keys.onsuccess = () => { for (const k of keys.result) if (String(k).startsWith(prefix) && k !== key) st.delete(k); st.put(blob, key); };
  } catch { /* sem espaço ou bloqueado: pinta de novo da próxima vez */ }
}
