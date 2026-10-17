/**
 * Kit de ilustração das figurinhas Comuns e Incomuns da Temporada 1 ("gravura de horizonte").
 * Cada figurinha é um SVG de 500 por 700: céu em degradê, camadas de relevo que clareiam com a distância,
 * neblina entre elas, uma fonte de luz, o assunto com luz de borda, hachura de gravura nas sombras e grão por cima.
 * A placa com o nome cobre o terço de baixo, então o assunto mora nos 60% de cima.
 */
export const W = 500, H = 700;

/** Aleatório com semente (o mesmo desenho sai igual toda vez). */
export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
/** Ruído suave de uma dimensão. */
export function noise1(seed) {
  const r = rng(seed); const v = Array.from({ length: 512 }, r);
  return (x) => { const i = Math.floor(x), f = x - i, t = f * f * (3 - 2 * f); const a = v[((i % 512) + 512) % 512], b = v[(((i + 1) % 512) + 512) % 512]; return a + (b - a) * t; };
}
const f1 = (n) => Math.round(n * 10) / 10;

/** Um relevo (montanha, colina, mata) como caminho fechado até o fim da imagem. */
export function ridge({ seed = 1, y = 400, amp = 60, freq = 0.012, oct = 4, step = 5, x0 = -10, x1 = W + 10, bottom = H + 10, sharp = 0, shape = null }) {
  const n = noise1(seed); const pts = [];
  for (let x = x0; x <= x1; x += step) {
    let v = 0, a = 1, f = freq, tot = 0;
    for (let o = 0; o < oct; o++) { v += (n(x * f + o * 37.1) - 0.5) * a; tot += a; a *= 0.5; f *= 2.1; }
    v /= tot;
    if (sharp) v = v + sharp * (Math.abs(v) - 0.25);
    const s = shape ? shape(x / W) : 0;
    pts.push([x, y - v * amp * 2 - s]);
  }
  return `M${x0} ${bottom} ${pts.map(([x, yy]) => `L${f1(x)} ${f1(yy)}`).join(' ')} L${x1} ${bottom}Z`;
}
/** Altura de um relevo num ponto (para pousar coisas nele). */
export function ridgeY({ seed = 1, y = 400, amp = 60, freq = 0.012, oct = 4, sharp = 0, shape = null }, x) {
  const n = noise1(seed); let v = 0, a = 1, f = freq, tot = 0;
  for (let o = 0; o < oct; o++) { v += (n(x * f + o * 37.1) - 0.5) * a; tot += a; a *= 0.5; f *= 2.1; }
  v /= tot; if (sharp) v = v + sharp * (Math.abs(v) - 0.25);
  return y - v * amp * 2 - (shape ? shape(x / W) : 0);
}

let uid = 0;
export const id = (p = 'g') => `${p}${++uid}`;

/** Degradê linear vertical (ou com x1..y2) a partir de [offset, cor, opacidade?]. */
export function lin(stops, { x1 = 0, y1 = 0, x2 = 0, y2 = 1, units = 'objectBoundingBox' } = {}) {
  const i = id('l');
  return { id: i, url: `url(#${i})`, def: `<linearGradient id="${i}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="${units}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>` };
}
export function rad(stops, { cx = 0.5, cy = 0.5, r = 0.5, fx, fy, units = 'objectBoundingBox' } = {}) {
  const i = id('r');
  return { id: i, url: `url(#${i})`, def: `<radialGradient id="${i}" cx="${cx}" cy="${cy}" r="${r}"${fx != null ? ` fx="${fx}" fy="${fy}"` : ''} gradientUnits="${units}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>` };
}

/** Um desenho em construção: junta defs e camadas. */
export class Art {
  constructor(seed = 1) { this.seed = seed; this.defs = []; this.body = []; this.r = rng(seed); }
  def(...d) { for (const x of d) this.defs.push(typeof x === 'string' ? x : x.def); return this; }
  add(...s) { this.body.push(...s); return this; }
  grad(g) { this.def(g); return g.url; }

  sky(stops) { const g = lin(stops); this.def(g); return this.add(`<rect width="${W}" height="${H}" fill="${g.url}"/>`); }
  /** Brilho de uma luz (sol, lua, janela, chama). */
  glow(x, y, r, color, a = 0.9) { const g = rad([[0, color, a], [0.25, color, a * 0.45], [0.6, color, a * 0.12], [1, color, 0]]); this.def(g); return this.add(`<circle cx="${x}" cy="${y}" r="${r}" fill="${g.url}"/>`); }
  disc(x, y, r, color, edge) { const g = rad([[0, '#fff', 1], [0.55, color, 1], [1, edge ?? color, 1]]); this.def(g); return this.add(`<circle cx="${x}" cy="${y}" r="${r}" fill="${g.url}"/>`); }
  stars(n, ymax, color = '#fff', a = 0.8) {
    const out = []; for (let i = 0; i < n; i++) { const x = this.r() * W, y = this.r() ** 1.6 * ymax, s = this.r(); out.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(0.4 + s * s * 1.3)}" fill="${color}" opacity="${f1((0.25 + s * 0.75) * a * 10) / 10}"/>`); }
    return this.add(`<g>${out.join('')}</g>`);
  }
  /** Feixes de luz saindo de um ponto. */
  rays(x, y, n, len, spread, color, a = 0.12, base = Math.PI / 2) {
    const fid = id('b'); this.def(`<filter id="${fid}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>`);
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1) - 0.5; const ang = base + t * spread + (this.r() - 0.5) * 0.06; const w = 0.025 + this.r() * 0.05;
      const ax = x + Math.cos(ang - w) * len, ay = y + Math.sin(ang - w) * len, bx = x + Math.cos(ang + w) * len, by = y + Math.sin(ang + w) * len;
      out.push(`<path d="M${x} ${y}L${f1(ax)} ${f1(ay)}L${f1(bx)} ${f1(by)}Z" fill="${color}" opacity="${f1((0.4 + this.r() * 0.6) * 10) / 10}"/>`);
    }
    const g = rad([[0, '#fff', 1], [1, '#fff', 0]], { cx: x, cy: y, r: len, units: 'userSpaceOnUse' }); const m = id('m');
    this.def(g, `<mask id="${m}"><rect width="${W}" height="${H}" fill="${g.url}"/></mask>`);
    return this.add(`<g filter="url(#${fid})" mask="url(#${m})" opacity="${a}" style="mix-blend-mode:screen">${out.join('')}</g>`);
  }
  /** Faixa de neblina horizontal. */
  fog(y, h, color, a = 0.6, blur = 10) {
    const g = lin([[0, color, 0], [0.5, color, a], [1, color, 0]]); const fid = id('b');
    this.def(g, `<filter id="${fid}" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="${blur}"/></filter>`);
    return this.add(`<rect x="-20" y="${y - h / 2}" width="${W + 40}" height="${h}" fill="${g.url}" filter="url(#${fid})"/>`);
  }
  /** Nuvem: bolhas sobrepostas com luz de cima e sombra embaixo. */
  cloud(x, y, w, h, lit, shade, a = 1, seed = 1) {
    const r = rng(seed); const blobs = []; const n = 7 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) { const t = i / (n - 1); const bx = x - w / 2 + t * w + (r() - 0.5) * w * 0.08; const bw = w * (0.16 + r() * 0.14) * (1 - Math.abs(t - 0.5) * 0.7); blobs.push([bx, y - bw * (0.35 + r() * 0.35) * (h / w) * 4, bw]); }
    const g = lin([[0, lit], [0.55, lit], [1, shade]]); this.def(g); const c = id('c'); const fid = id('b');
    this.def(`<clipPath id="${c}"><rect x="${x - w}" y="${y - h * 3}" width="${w * 2}" height="${h * 3}"/></clipPath>`, `<filter id="${fid}"><feGaussianBlur stdDeviation="1.2"/></filter>`);
    const shapes = blobs.map(([bx, by, bw]) => `<circle cx="${f1(bx)}" cy="${f1(by + bw * 0.6)}" r="${f1(bw)}"/>`).join('');
    return this.add(`<g opacity="${a}" filter="url(#${fid})"><g clip-path="url(#${c})" fill="${g.url}">${shapes}</g></g>`);
  }
  /** Partículas (poeira, vaga-lumes, brasas) com brilho. */
  motes(n, box, color, { r0 = 0.6, r1 = 2.2, a = 0.9, glow = true } = {}) {
    const [x, y, w, h] = box; const out = []; const fid = id('b');
    this.def(`<filter id="${fid}" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="2"/></filter>`);
    for (let i = 0; i < n; i++) { const px = x + this.r() * w, py = y + this.r() * h, s = this.r(); const rr = r0 + s * s * (r1 - r0); out.push(`${glow ? `<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(rr * 3)}" fill="${color}" opacity="${f1(a * 0.35 * 10) / 10}" filter="url(#${fid})"/>` : ''}<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(rr)}" fill="${color}" opacity="${f1((0.5 + s * 0.5) * a * 10) / 10}"/>`); }
    return this.add(`<g style="mix-blend-mode:screen">${out.join('')}</g>`);
  }
  /** Hachura de gravura por cima de uma forma (sombra em linhas). */
  hatch(shape, { color = '#000', a = 0.35, gap = 3.2, angle = -32, width = 0.9, fade = null } = {}) {
    const p = id('p'), c = id('c');
    this.def(`<pattern id="${p}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><rect width="${width}" height="${gap}" fill="${color}"/></pattern>`, `<clipPath id="${c}">${shape}</clipPath>`);
    let mask = '';
    if (fade) { const g = lin(fade); const m = id('m'); this.def(g, `<mask id="${m}"><rect width="${W}" height="${H}" fill="${g.url}"/></mask>`); mask = ` mask="url(#${m})"`; }
    return this.add(`<g clip-path="url(#${c})"${mask}><rect width="${W}" height="${H}" fill="url(#${p})" opacity="${a}"/></g>`);
  }
  /** Agrupa o que for desenhado dentro de fn num <g> (para mover ou escalar uma peça inteira). */
  group(attrs, fn) { const i = this.body.length; fn(); const inner = this.body.splice(i); return this.add(`<g ${attrs}>${inner.join('')}</g>`); }
  /** Nuvem macia: bolhas com luz de um lado, base que some em vez de corte reto. */
  puff(x, y, w, h, lit, shade, { a = 1, seed = 1, light = -0.6, n = 9 } = {}) {
    const r = rng(seed); const out = [];
    const g = rad([[0, lit], [0.55, lit], [1, shade]], { cx: 0.5 + light * 0.25, cy: 0.25, r: 0.75 }); this.def(g);
    for (let i = 0; i < n; i++) { const t = i / (n - 1); const bw = w * (0.12 + r() * 0.12) * (1.15 - Math.abs(t - 0.5) * 1.1); const bx = x - w / 2 + t * w + (r() - 0.5) * w * 0.06; const by = y - bw * (0.2 + r() * 0.5) * (h / (w * 0.18)); out.push(`<circle cx="${f1(bx)}" cy="${f1(by)}" r="${f1(bw)}" fill="${g.url}"/>`); }
    const m = id('m'); const fade = lin([[0, '#fff', 1], [0.72, '#fff', 1], [1, '#fff', 0]]); this.def(fade, `<mask id="${m}" maskUnits="userSpaceOnUse"><rect x="${x - w}" y="${y - h * 4}" width="${w * 2}" height="${h * 4 + 4}" fill="${fade.url}"/></mask>`);
    return this.add(`<g opacity="${a}" mask="url(#${m})" filter="${this.blur(1.4)}">${out.join('')}</g>`);
  }
  /** Faixa de nuvem comprida (estrato), com borda de luz em cima. */
  band(x, y, w, h, fill, rim, a = 1) {
    const d = `M${x} ${y}C${x + w * 0.1} ${y - h} ${x + w * 0.3} ${y - h * 1.1} ${x + w * 0.45} ${y - h * 0.7}C${x + w * 0.6} ${y - h * 1.3} ${x + w * 0.85} ${y - h * 1.1} ${x + w} ${y}Z`;
    return this.add(`<g opacity="${a}" filter="${this.blur(1.2)}"><path d="${d}" fill="${fill}"/><path d="${d.replace(/Z$/, '')}" fill="none" stroke="${rim}" stroke-width="1.6" opacity=".7"/></g>`);
  }
  /** Recorte por uma forma (devolve o url para clip-path). */
  clip(shape) { const c = id('c'); this.def(`<clipPath id="${c}">${shape}</clipPath>`); return `url(#${c})`; }
  blur(sd) { const fid = id('b'); this.def(`<filter id="${fid}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${sd}"/></filter>`); return `url(#${fid})`; }

  /** Fecha o desenho: vinheta, grão e a borda de impressão. */
  svg({ grain = 0.14, vignette = 0.55, tint = null } = {}) {
    const v = rad([[0.55, '#000', 0], [1, '#000', vignette]], { cx: 0.5, cy: 0.42, r: 0.75 }); const gf = id('n');
    this.def(v, `<filter id="${gf}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${this.seed}" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  .9 .9 .9 0 -1.05"/></filter>`);
    const tintRect = tint ? `<rect width="${W}" height="${H}" fill="${tint[0]}" opacity="${tint[1]}" style="mix-blend-mode:${tint[2] ?? 'soft-light'}"/>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${this.defs.join('')}</defs>${this.body.join('')}${tintRect}<rect width="${W}" height="${H}" fill="${v.url}"/><rect width="${W}" height="${H}" filter="url(#${gf})" opacity="${grain}" style="mix-blend-mode:overlay"/></svg>`;
  }
}
