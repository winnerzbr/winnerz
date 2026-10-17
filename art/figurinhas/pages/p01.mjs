/** Página 1 · Vila inicial (fim de tarde dourado). */
import { Art, W, H, ridge, ridgeY, lin, rad, rng } from '../kit.mjs';
import { pine, roundTree, grass, birds } from './_shapes.mjs';

const RIM = '#ffb35c';

/* ---------- 1 · Casa da lareira ---------- */
function casa() {
  const a = new Art(101);
  a.sky([[0, '#0c1424'], [0.3, '#253049'], [0.48, '#6d4f5a'], [0.58, '#c27a5a'], [0.64, '#f0b071']]);
  a.stars(70, 220, '#fff', 0.75);
  a.glow(410, 400, 260, '#ffb066', 0.8);
  a.disc(410, 404, 24, '#ffe0a8', '#ffb36b');
  a.band(-20, 330, 260, 16, '#7a4e5a', '#ffb07a', 0.8);
  a.band(300, 300, 240, 12, '#6a4656', '#ffb07a', 0.7);
  const far = { seed: 4, y: 402, amp: 28, freq: 0.008 };
  a.add(`<path d="${ridge(far)}" fill="#5a4a5c"/>`);
  a.fog(418, 44, '#d39468', 0.55, 8);
  const mid = { seed: 11, y: 436, amp: 18, freq: 0.01 };
  a.add(`<path d="${ridge(mid)}" fill="#2c2a3a"/>`);
  for (let i = 0; i < 26; i++) { const x = 8 + i * 19 + (i % 3) * 4; a.add(pine(x, ridgeY(mid, x) + 6, 20 + (i * 7) % 12, '#262536')); }
  a.fog(450, 30, '#a8706a', 0.35, 6);
  // colina da casa
  const hill = { seed: 7, y: 470, amp: 10, freq: 0.006, shape: (t) => 36 * Math.exp(-((t - 0.45) ** 2) / 0.06) };
  const hp = ridge(hill);
  a.add(`<path d="${hp}" fill="#151621"/>`);
  a.hatch(`<path d="${hp}"/>`, { a: 0.35, fade: [[0, '#fff', 0.2], [0.6, '#fff', 1]] });
  // árvores de trás
  a.add(pine(64, 448, 150, '#10111a'), pine(26, 456, 112, '#10111a'), roundTree(436, 446, 128, '#0f1017', 21));
  a.add(`<path d="M425 330a40 40 0 0 1 44 34" fill="none" stroke="${RIM}" stroke-width="1.6" opacity=".55"/>`);
  // a casa, escalada
  a.group('transform="translate(-92 -268) scale(1.86)"', () => {
    const by = 378;
    const g1 = lin([[0, '#3a2f35'], [1, '#1d1a22']]); a.def(g1);
    const g2 = lin([[0, '#9a644a'], [0.5, '#5c3c33'], [1, '#2c2228']], { x1: 1, y1: 0, x2: 0, y2: 1 }); a.def(g2);
    const roof = lin([[0, '#2a2026'], [1, '#141118']]); a.def(roof);
    const side = `M108 ${by + 2}L108 ${by - 50}L190 ${by - 58}L190 ${by}Z`;
    a.add(`<path d="${side}" fill="${g1.url}"/>`);
    let logs = ''; for (let k = 0; k < 9; k++) logs += `<path d="M108 ${by - 46 + k * 6}L190 ${by - 54 + k * 6.4}" />`;
    a.add(`<g stroke="#120f14" stroke-width=".7" opacity=".7">${logs}</g>`);
    a.add(`<path d="M190 ${by}L190 ${by - 58}L230 ${by - 102}L270 ${by - 58}L270 ${by}Z" fill="${g2.url}"/>`);
    let st = ''; const R = rng(5);
    for (let yy = by - 54; yy < by; yy += 8) for (let xx = 191 + ((yy / 8) % 2) * 6; xx < 268; xx += 11 + R() * 4) st += `<rect x="${xx.toFixed(1)}" y="${yy}" width="${(9 + R() * 3).toFixed(1)}" height="6.2" rx="2"/>`;
    a.add(`<g fill="none" stroke="#2b1d1e" stroke-width=".6" opacity=".6" clip-path="path('M190 ${by}L190 ${by - 58}L270 ${by - 58}L270 ${by}Z')">${st}</g>`);
    const rf = `M100 ${by - 46}L186 ${by - 56}L228 ${by - 106}L150 ${by - 98}Z`;
    a.add(`<path d="${rf}" fill="${roof.url}"/>`);
    let sh = ''; for (let k = 1; k < 9; k++) { const t = k / 9; sh += `<path d="M${100 + 50 * t} ${by - 46 - 52 * t}L${186 + 42 * t} ${by - 56 - 50 * t}"/>`; }
    a.add(`<g stroke="#0a080c" stroke-width=".8" opacity=".9">${sh}</g>`);
    a.add(`<path d="M186 ${by - 56}L228 ${by - 106}L274 ${by - 54}" fill="none" stroke="#120f14" stroke-width="6" stroke-linejoin="round"/>`);
    a.add(`<path d="M229 ${by - 104}L273 ${by - 55}" stroke="${RIM}" stroke-width="1.3" opacity=".95"/><path d="M150 ${by - 97}L227 ${by - 106}" stroke="${RIM}" stroke-width=".8" opacity=".6"/>`);
    a.add(`<path d="M130 ${by - 96}V${by - 128}H146V${by - 98}Z" fill="#2a2228"/><path d="M145 ${by - 128}V${by - 98}" stroke="${RIM}" stroke-width="1" opacity=".75"/><rect x="127" y="${by - 132}" width="22" height="5" fill="#1a1519"/>`);
    a.add(`<path d="M138 ${by - 134}C128 ${by - 152} 150 ${by - 166} 136 ${by - 184}C124 ${by - 200} 142 ${by - 214} 124 ${by - 236}" fill="none" stroke="#e6d2cc" stroke-width="9" stroke-linecap="round" opacity=".2" filter="${a.blur(4)}"/>`);
    const win = (x, y, w, h) => { a.glow(x + w / 2, y + h / 2, 30, '#ffb050', 0.6); a.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffd27a"/><path d="M${x + w / 2} ${y}V${y + h}M${x} ${y + h / 2}H${x + w}" stroke="#4a2a1a" stroke-width="1.2"/><rect x="${x - 1.2}" y="${y - 1.2}" width="${w + 2.4}" height="${h + 2.4}" fill="none" stroke="#1a1214" stroke-width="1.6"/><rect x="${x - 3}" y="${y + h + 1}" width="${w + 6}" height="4" fill="#2a1a16"/><g fill="#d86a5a">${[0, 1, 2, 3].map((i) => `<circle cx="${x - 1 + i * (w + 2) / 3}" cy="${y + h}" r="2"/>`).join('')}</g>`); };
    win(122, by - 40, 16, 17); win(156, by - 43, 16, 17);
    a.glow(230, by - 18, 44, '#ffa040', 0.6);
    a.add(`<path d="M218 ${by}V${by - 30}Q230 ${by - 42} 242 ${by - 30}V${by}Z" fill="#ffcc70"/><path d="M218 ${by}V${by - 30}Q230 ${by - 42} 242 ${by - 30}V${by}" fill="none" stroke="#1a1214" stroke-width="2"/><path d="M234 ${by}V${by - 32}l6 4V${by}Z" fill="#6a3a20" opacity=".6"/>`);
    a.add(`<circle cx="230" cy="${by - 74}" r="6.5" fill="#ffd27a"/><circle cx="230" cy="${by - 74}" r="6.5" fill="none" stroke="#1a1214" stroke-width="1.6"/><path d="M223.5 ${by - 74}H236.5M230 ${by - 80.5}V${by - 67.5}" stroke="#4a2a1a" stroke-width="1"/>`);
    a.add(`<path d="M196 ${by + 1}h68" stroke="#0e0b10" stroke-width="3"/>`);
    // cerca
    let f = ''; for (let k = 0; k < 6; k++) f += `<path d="M${276 + k * 9} ${by + 2}v-15"/>`;
    a.add(`<g stroke="#120e12" stroke-width="2">${f}<path d="M274 ${by - 9}h48M274 ${by - 4}h48" stroke-width="1.4"/></g>`);
  });
  // caminho de luz
  const path = lin([[0, '#e0a060', 0.85], [1, '#6a4a3a', 0.2]]); a.def(path);
  a.add(`<path d="M310 435L338 435C352 500 410 560 450 ${H}L330 ${H}C330 580 300 500 310 435Z" fill="${path.url}"/>`);
  const fg = { seed: 31, y: 610, amp: 16, freq: 0.01, shape: (t) => 50 * (t - 0.5) ** 2 * 4 - 30 };
  a.add(`<path d="${ridge(fg)}" fill="#07090d"/>`);
  grass(a, -10, 510, 520, 150, 40, '#07090d', 4);
  a.motes(26, [40, 340, 420, 180], '#ffd27a', { r0: 0.7, r1: 2 });
  return a.svg({ grain: 0.16 });
}

/* ---------- 2 · Moinho do vale ---------- */
function moinho() {
  const a = new Art(202);
  a.sky([[0, '#1a1830'], [0.28, '#5a3550'], [0.46, '#c45a48'], [0.58, '#f2995a'], [0.66, '#ffd08a']]);
  a.glow(250, 320, 320, '#ffb070', 0.85);
  a.puff(90, 150, 230, 40, '#f4a878', '#6a3a4a', { a: 0.85, seed: 3, light: 0.6 });
  a.puff(420, 112, 210, 32, '#ee9a70', '#5a3048', { a: 0.8, seed: 8, light: -0.6 });
  a.band(150, 210, 200, 8, '#d8786a', '#ffc090', 0.5);
  a.disc(250, 300, 104, '#ffe8b4', '#ffb262');
  a.add(`<g fill="#e88a55" opacity=".55"><rect x="140" y="282" width="220" height="2.6"/><rect x="150" y="300" width="200" height="2.2"/><rect x="164" y="318" width="172" height="1.8"/><rect x="186" y="336" width="128" height="1.4"/></g>`);
  const far = { seed: 9, y: 392, amp: 14, freq: 0.01 };
  a.add(`<path d="${ridge(far)}" fill="#8a4a52" opacity=".9"/>`);
  a.fog(398, 40, '#f0a070', 0.5, 6);
  const hill = { seed: 2, y: 450, amp: 8, freq: 0.008, shape: (t) => 64 * Math.exp(-((t - 0.5) ** 2) / 0.05) };
  a.add(`<path d="${ridge(hill)}" fill="#2a1a26"/>`);
  a.hatch(`<path d="${ridge(hill)}"/>`, { a: 0.3 });
  a.group('transform="translate(-95 -112) scale(1.38)"', () => {
    const cx = 250, base = 400, top = 250;
    const tower = `M${cx - 34} ${base}L${cx - 22} ${top}L${cx + 22} ${top}L${cx + 34} ${base}Z`;
    a.add(`<path d="${tower}" fill="#1c1219"/>`);
    a.hatch(`<path d="${tower}"/>`, { a: 0.3, gap: 2.4, angle: 70 });
    let pl = ''; for (let k = 1; k < 10; k++) { const y = top + k * 15, t = k * 15 / 150; pl += `<path d="M${cx - 22 - 12 * t} ${y}H${cx + 22 + 12 * t}"/>`; }
    a.add(`<g stroke="#0e080c" stroke-width=".8">${pl}</g>`);
    a.add(`<path d="M${cx + 22} ${top}L${cx + 34} ${base}" stroke="#ffb46a" stroke-width="1.4" opacity=".85"/><path d="M${cx - 22} ${top}L${cx - 34} ${base}" stroke="#ffb46a" stroke-width=".9" opacity=".45"/>`);
    a.add(`<path d="M${cx - 28} ${top + 2}Q${cx} ${top - 34} ${cx + 28} ${top + 2}Z" fill="#160e14"/><path d="M${cx} ${top - 14}Q${cx + 18} ${top - 10} ${cx + 28} ${top + 2}" fill="none" stroke="#ffb46a" stroke-width="1.2" opacity=".8"/>`);
    a.glow(cx, base - 13, 26, '#ffa040', 0.6);
    a.add(`<path d="M${cx - 7} ${base}V${base - 22}q7 -8 14 0V${base}Z" fill="#ffc06a"/><rect x="${cx - 5}" y="${top + 40}" width="10" height="13" fill="#ffc77a" opacity=".9"/><rect x="${cx - 4}" y="${top + 86}" width="8" height="11" fill="#ffc77a" opacity=".7"/>`);
    a.add(`<path d="M${cx - 40} ${top + 62}h80l-6 6h-68z" fill="#120a10"/>`);
    const hub = [cx, top - 4];
    let sails = '';
    for (let k = 0; k < 4; k++) {
      const ang = -18 + k * 90;
      let lat = `<rect x="-2.6" y="-130" width="5.2" height="130" fill="#140c12"/><rect x="3" y="-124" width="24" height="94" fill="#3a1e22" opacity=".35"/><rect x="3" y="-124" width="24" height="94" fill="none" stroke="#140c12" stroke-width="2"/>`;
      for (let j = 0; j < 8; j++) lat += `<path d="M3 ${-124 + j * 11.75}H27" stroke="#140c12" stroke-width="1.1"/>`;
      lat += `<path d="M15 -124V-30" stroke="#140c12" stroke-width=".9"/>`;
      sails += `<g transform="translate(${hub[0]} ${hub[1]}) rotate(${ang})">${lat}</g>`;
    }
    a.add(`<g>${sails}</g><circle cx="${hub[0]}" cy="${hub[1]}" r="6.5" fill="#140c12"/><circle cx="${hub[0] + 1.5}" cy="${hub[1] - 1.5}" r="2.2" fill="#ffb46a"/>`);
  });
  const field = { seed: 17, y: 500, amp: 8, freq: 0.012 };
  const fg = lin([[0, '#a8622a'], [0.25, '#4a2a1e'], [1, '#120a0e']]); a.def(fg);
  a.add(`<path d="${ridge(field)}" fill="${fg.url}"/>`);
  const R = rng(44); let w = '';
  for (let i = 0; i < 300; i++) { const x = -10 + R() * 520, y = 476 + R() ** 1.3 * 240, h = 20 + (y - 476) * 0.24 + R() * 12, l = (R() - 0.3) * 6; const lit = y < 540; w += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}Q${(x + l).toFixed(1)} ${(y - h * 0.6).toFixed(1)} ${(x + l * 1.6).toFixed(1)} ${(y - h).toFixed(1)}" stroke="${lit ? '#c8803a' : '#1a0f10'}" stroke-width="${(0.6 + (y - 476) / 240 * 1.6).toFixed(2)}" fill="none"/><ellipse cx="${(x + l * 1.6).toFixed(1)}" cy="${(y - h - 3).toFixed(1)}" rx="${(1 + (y - 476) / 200).toFixed(2)}" ry="${(3.4 + (y - 476) / 70).toFixed(2)}" transform="rotate(${(l * 4).toFixed(1)} ${(x + l * 1.6).toFixed(1)} ${(y - h - 3).toFixed(1)})" fill="${lit ? '#ffc070' : '#2a1812'}"/>`; }
  a.add(`<g>${w}</g>`);
  a.add(birds([[372, 196, 1], [392, 210, 0.8], [356, 216, 0.7], [414, 186, 0.6]], '#2a1420'));
  a.motes(30, [0, 380, 500, 140], '#ffd9a0', { r0: 0.5, r1: 1.6, a: 0.7 });
  return a.svg({ grain: 0.15 });
}

/* ---------- 3 · Poço dos desejos ---------- */
function poco() {
  const a = new Art(303);
  a.sky([[0, '#050a16'], [0.45, '#0f2038'], [0.7, '#1f3a52']]);
  a.stars(120, 330, '#dfe9ff', 0.85);
  a.glow(404, 96, 110, '#9fc4ff', 0.35);
  a.disc(404, 96, 20, '#f4f7ff', '#b9cdf0');
  const far = { seed: 5, y: 400, amp: 30, freq: 0.01 };
  a.add(`<path d="${ridge(far)}" fill="#132338"/>`);
  for (let i = 0; i < 30; i++) { const x = i * 17 + (i % 2) * 6; a.add(pine(x, ridgeY(far, x) + 10, 34 + (i * 13) % 30, '#0e1a2c')); }
  a.fog(440, 60, '#3a5a7a', 0.45, 12);
  a.add(`<path d="${ridge({ seed: 8, y: 470, amp: 6, freq: 0.01 })}" fill="#0a111c"/>`);
  a.group('transform="translate(-62 -24) scale(1.25)"', () => {
    const cx = 250, top = 330, rw = 92, rh = 24, bodyH = 112;
    a.glow(cx, top - 10, 220, '#ffb84d', 0.55);
    a.rays(cx, top + 6, 9, 300, 0.9, '#ffd27a', 0.5, -Math.PI / 2);
    a.add(`<rect x="${cx - rw - 4}" y="${top - 120}" width="12" height="150" fill="#1a130f"/><rect x="${cx + rw - 8}" y="${top - 120}" width="12" height="150" fill="#1a130f"/>`);
    a.add(`<path d="M${cx + rw - 8} ${top - 120}V${top + 20}M${cx - rw + 8} ${top - 120}V${top + 20}" stroke="#ffb24a" stroke-width="1.2" opacity=".6"/>`);
    const rf = `M${cx - rw - 26} ${top - 112}L${cx} ${top - 172}L${cx + rw + 26} ${top - 112}L${cx + rw + 16} ${top - 104}L${cx} ${top - 158}L${cx - rw - 16} ${top - 104}Z`;
    a.add(`<path d="${rf}" fill="#120d0c"/>`);
    a.hatch(`<path d="${rf}"/>`, { a: 0.4, gap: 2.4, angle: 0 });
    a.add(`<path d="M${cx - rw - 16} ${top - 104}L${cx} ${top - 158}L${cx + rw + 16} ${top - 104}" fill="none" stroke="#ffc05a" stroke-width="1.2" opacity=".8"/>`);
    a.add(`<rect x="${cx - rw}" y="${top - 92}" width="${rw * 2}" height="8" rx="3" fill="#24180f"/><path d="M${cx - rw} ${top - 85}H${cx + rw}" stroke="#ffbd55" stroke-width="1" opacity=".8"/><circle cx="${cx + rw + 12}" cy="${top - 88}" r="8" fill="none" stroke="#24180f" stroke-width="3"/>`);
    a.add(`<path d="M${cx + 18} ${top - 84}V${top - 34}" stroke="#4a3520" stroke-width="2"/><path d="M${cx + 4} ${top - 34}h28l-4 26h-20z" fill="#2a1d12"/><path d="M${cx + 4} ${top - 34}h28" stroke="#ffc35c" stroke-width="1.6"/><path d="M${cx + 7} ${top - 34}q11 -14 22 0" fill="none" stroke="#3a2a1a" stroke-width="1.4"/>`);
    const bodyG = lin([[0, '#3a3e48'], [0.5, '#232630'], [1, '#14161c']], { x1: 0, y1: 0, x2: 1, y2: 0 }); a.def(bodyG);
    const body = `M${cx - rw} ${top}V${top + bodyH}A${rw} ${rh} 0 0 0 ${cx + rw} ${top + bodyH}V${top}Z`;
    a.add(`<path d="${body}" fill="${bodyG.url}"/>`);
    let bricks = ''; const R = rng(12);
    for (let r = 0; r < 6; r++) { const y = top + 10 + r * 18; const off = (r % 2) * 0.5; for (let k = -1; k < 8; k++) { const t0 = Math.max(0, (k + off) / 7), t1 = Math.min(1, (k + off + 1) / 7); if (t1 <= t0) continue; const x0 = cx - rw * Math.cos(Math.PI * t0), x1 = cx - rw * Math.cos(Math.PI * t1); const bulge = rh * Math.sin(Math.PI * ((t0 + t1) / 2)); bricks += `<path d="M${(x0 + 1.5).toFixed(1)} ${(y + bulge).toFixed(1)}h${Math.max(0, x1 - x0 - 3).toFixed(1)}v${(14 - R() * 2).toFixed(1)}h${(-Math.max(0, x1 - x0 - 3)).toFixed(1)}z"/>`; } }
    a.add(`<g fill="none" stroke="#0b0c10" stroke-width="1.6" opacity=".8" clip-path="path('${body}')">${bricks}</g>`);
    a.add(`<g clip-path="path('${body}')"><ellipse cx="${cx}" cy="${top + 4}" rx="${rw}" ry="${rh + 18}" fill="#ffb84d" opacity=".25" filter="${a.blur(6)}"/></g>`);
    a.hatch(body, { a: 0.3, gap: 2.8, angle: 80, fade: [[0, '#fff', 0.1], [1, '#fff', 0.9]] });
    const mouth = rad([[0, '#fff6d8'], [0.35, '#ffd27a'], [0.75, '#c06a20'], [1, '#2a1608']]); a.def(mouth);
    a.add(`<ellipse cx="${cx}" cy="${top}" rx="${rw}" ry="${rh}" fill="#2a2d36"/><ellipse cx="${cx}" cy="${top + 2}" rx="${rw - 12}" ry="${rh - 7}" fill="${mouth.url}"/><ellipse cx="${cx}" cy="${top}" rx="${rw}" ry="${rh}" fill="none" stroke="#ffd27a" stroke-width="1.6" opacity=".6"/>`);
    let coins = ''; const C = rng(71);
    for (let i = 0; i < 10; i++) { const x = cx + (C() - 0.5) * 130, y = top - 30 - C() * 200, s = 3 + C() * 4, r = C() * 70 - 35; coins += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${s.toFixed(1)}" ry="${(s * (0.3 + C() * 0.7)).toFixed(1)}" transform="rotate(${r.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="#ffd77e" stroke="#fff3c8" stroke-width=".6"/>`; }
    a.add(`<g>${coins}</g>`);
    a.motes(50, [cx - 120, top - 250, 240, 240], '#ffe2a0', { r0: 0.5, r1: 2, a: 0.95 });
  });
  const fg = { seed: 41, y: 600, amp: 12, freq: 0.012 };
  a.add(`<path d="${ridge(fg)}" fill="#04070c"/>`);
  grass(a, -10, 510, 560, 120, 34, '#04070c', 6, 0);
  return a.svg({ grain: 0.16, vignette: 0.6 });
}

/* ---------- 4 · Ponte de pedra ---------- */
function ponte() {
  const a = new Art(404);
  const cx = 250, foot = 400, archR = 96, archH = 104, dy = 292;
  a.sky([[0, '#26394a'], [0.3, '#6f8a8c'], [0.5, '#d9c79c'], [0.58, '#f7e2b0']]);
  a.band(-30, 150, 280, 12, '#a7a890', '#fff1d0', 0.55);
  a.band(280, 112, 260, 10, '#9a9c88', '#fff1d0', 0.5);
  a.glow(cx, 352, 300, '#fff0c4', 0.8);
  const far = { seed: 22, y: 344, amp: 30, freq: 0.009 };
  a.add(`<path d="${ridge(far)}" fill="#97a596" opacity=".7"/>`);
  a.fog(356, 50, '#f6e8c6', 0.65, 10);
  const mid = { seed: 25, y: 380, amp: 10, freq: 0.014 };
  a.add(`<path d="${ridge(mid)}" fill="#6c8076"/>`);
  for (let i = 0; i < 24; i++) { const x = i * 22 + (i % 3) * 5; a.add(roundTree(x, ridgeY(mid, x) + 8, 26 + (i * 11) % 20, '#647a70', i + 2)); }
  a.disc(cx, 364, 22, '#fffaf0', '#ffe9b4');
  a.fog(392, 26, '#fff4dc', 0.7, 6);
  // água
  const water = lin([[0, '#f0e2bc'], [0.12, '#9aa89c'], [0.5, '#3a4e50'], [1, '#121c22']]); a.def(water);
  a.add(`<rect x="0" y="${foot}" width="${W}" height="${H - foot}" fill="${water.url}"/>`);
  // reflexo do sol
  a.add(`<g filter="${a.blur(1.5)}">${Array.from({ length: 16 }, (_, i) => `<rect x="${(cx - 30 + (i % 3) * 8 - i * 0.6).toFixed(1)}" y="${foot + 8 + i * 9}" width="${(60 - i * 2.4).toFixed(1)}" height="2" fill="#fff6d8" opacity="${(0.8 - i * 0.04).toFixed(2)}"/>`).join('')}</g>`);
  // ponte (contraluz)
  const bridge = `M-20 ${foot}L-20 ${dy + 26}Q${cx} ${dy - 28} ${W + 20} ${dy + 26}L${W + 20} ${foot}L${cx + archR} ${foot}C${cx + archR} ${foot - archH * 0.6} ${cx + archR * 0.56} ${foot - archH} ${cx} ${foot - archH}C${cx - archR * 0.56} ${foot - archH} ${cx - archR} ${foot - archH * 0.6} ${cx - archR} ${foot}Z`;
  const bg = lin([[0, '#6a6252'], [0.4, '#3e3a32'], [1, '#24221e']]); a.def(bg);
  a.add(`<path d="${bridge}" fill="${bg.url}"/>`);
  const clipB = a.clip(`<path d="${bridge}"/>`);
  let bricks = ''; const R = rng(4);
  for (let r = 0; r < 9; r++) for (let k = -1; k < 22; k++) { const x = -20 + k * 25 + (r % 2) * 12; const t = (x + 10 - cx) / (W / 2 + 20); const y = dy + 22 + r * 11 - 26 * (1 - t * t); bricks += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(21 + R() * 3).toFixed(1)}" height="9" rx="2"/>`; }
  a.add(`<g fill="none" stroke="#1c1a16" stroke-width="1" opacity=".6" clip-path="${clipB}">${bricks}</g>`);
  let vous = ''; for (let k = 0; k <= 14; k++) { const t = k / 14; const ang = Math.PI * t; const ix = cx - Math.cos(ang) * archR, iy = foot - Math.sin(ang) * archH; const ox = cx - Math.cos(ang) * (archR + 18), oy = foot - Math.sin(ang) * (archH + 18); vous += `<path d="M${ix.toFixed(1)} ${iy.toFixed(1)}L${ox.toFixed(1)} ${oy.toFixed(1)}"/>`; }
  a.add(`<g stroke="#15130f" stroke-width="1.6">${vous}</g>`);
  // borda de luz no intradorso e no parapeito
  a.add(`<path d="M${cx - archR} ${foot}C${cx - archR} ${foot - archH * 0.6} ${cx - archR * 0.56} ${foot - archH} ${cx} ${foot - archH}C${cx + archR * 0.56} ${foot - archH} ${cx + archR} ${foot - archH * 0.6} ${cx + archR} ${foot}" fill="none" stroke="#ffe8b0" stroke-width="2.2" opacity=".85"/>`);
  a.add(`<path d="M-20 ${dy + 20}Q${cx} ${dy - 34} ${W + 20} ${dy + 20}" fill="none" stroke="#2a2620" stroke-width="12"/><path d="M-20 ${dy + 14}Q${cx} ${dy - 40} ${W + 20} ${dy + 14}" fill="none" stroke="#fff0c6" stroke-width="1.8" opacity=".9"/>`);
  let posts = ''; for (let k = 0; k < 13; k++) { const x = -6 + k * 42; const t = (x - cx) / (W / 2 + 20); const y = dy + 14 - 27 * (1 - t * t); posts += `<rect x="${(x - 4).toFixed(1)}" y="${(y - 14).toFixed(1)}" width="8" height="14" fill="#2a2620"/><path d="M${(x - 4).toFixed(1)} ${(y - 14).toFixed(1)}h8" stroke="#fff0c6" stroke-width="1.2" opacity=".8"/>`; }
  a.add(posts);
  a.hatch(`<path d="${bridge}"/>`, { a: 0.3, gap: 2.8, angle: -30, fade: [[0, '#fff', 0.2], [1, '#fff', 1]] });
  // reflexo da ponte
  const refl = `M-20 ${foot}L${cx - archR} ${foot}C${cx - archR} ${foot + archH * 0.6} ${cx - archR * 0.56} ${foot + archH} ${cx} ${foot + archH}C${cx + archR * 0.56} ${foot + archH} ${cx + archR} ${foot + archH * 0.6} ${cx + archR} ${foot}L${W + 20} ${foot}L${W + 20} ${foot + 96}Q${cx} ${foot + 150} -20 ${foot + 96}Z`;
  a.add(`<path d="${refl}" fill="#1a2024" opacity=".55" filter="${a.blur(1.6)}"/>`);
  let ripples = ''; for (let i = 0; i < 50; i++) { const y = foot + 6 + i * 6 + R() * 4, x = R() * 500, w = 16 + R() * 70; ripples += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="1.1" fill="#fff6dc" opacity="${(0.1 + R() * 0.25).toFixed(2)}"/>`; }
  a.add(ripples);
  // juncos e margem
  a.add(`<path d="M-10 ${H}L-10 560C40 556 90 572 130 610C150 630 160 660 166 ${H}Z" fill="#0c120f"/><path d="M${W + 10} ${H}L${W + 10} 580C460 578 420 596 396 630C384 650 376 676 372 ${H}Z" fill="#0c120f"/>`);
  grass(a, -10, 140, 580, 60, 110, '#0c120f', 3, 0.15);
  grass(a, 380, 510, 600, 50, 90, '#0c120f', 8, -0.1);
  a.motes(30, [140, 300, 220, 120], '#fff6dc', { r0: 0.5, r1: 1.4, a: 0.8 });
  return a.svg({ grain: 0.14, vignette: 0.5 });
}

/* ---------- 5 · Placa da encruzilhada ---------- */
function placa() {
  const a = new Art(505);
  a.sky([[0, '#1d2140'], [0.26, '#4a3a62'], [0.46, '#c0626a'], [0.58, '#f49a62'], [0.64, '#ffd294']]);
  a.puff(120, 196, 300, 46, '#ffb084', '#5a3a5e', { a: 0.9, seed: 13, light: 0.6 });
  a.puff(400, 130, 270, 38, '#ff9e7a', '#4a3058', { a: 0.85, seed: 21, light: 0.4 });
  a.band(160, 80, 280, 14, '#8a5a78', '#e89a90', 0.6);
  a.glow(340, 380, 250, '#ffbe78', 0.85);
  a.disc(340, 382, 18, '#ffe6b8', '#ffb470');
  const far = { seed: 33, y: 380, amp: 16, freq: 0.01 };
  a.add(`<path d="${ridge(far)}" fill="#7a4a5a"/>`);
  a.fog(384, 30, '#ffb38a', 0.55, 6);
  a.add(`<path d="${ridge({ seed: 36, y: 404, amp: 8, freq: 0.012 })}" fill="#3a2838"/>`);
  const ground = `M-10 ${H}L-10 410L${W + 10} 406L${W + 10} ${H}Z`;
  a.add(`<path d="${ground}" fill="#20141c"/>`);
  a.hatch(ground, { a: 0.35, fade: [[0, '#fff', 0.1], [1, '#fff', 1]] });
  const road = lin([[0, '#ffcf96'], [0.3, '#c07a5a'], [1, '#3a2224']]); a.def(road);
  a.add(`<path d="M200 ${H}C224 600 258 500 266 458L258 436C252 426 226 418 176 412L184 410C232 414 258 420 272 430C288 420 340 410 420 406L424 408C360 414 308 424 284 446L282 458C296 526 350 616 410 ${H}Z" fill="${road.url}"/>`);
  // a placa, grande
  const px = 176, pb = 600, pt = 150;
  a.add(`<path d="M${px - 8} ${pb}L${px - 7} ${pt}H${px + 7}L${px + 8} ${pb}Z" fill="#1a1012"/><path d="M${px + 7} ${pt}L${px + 8} ${pb}" stroke="#ffb07a" stroke-width="1.6" opacity=".85"/>`);
  let grainP = ''; for (let k = 0; k < 9; k++) grainP += `<path d="M${px - 5 + k * 1.4} ${pt + 10}V${pb}"/>`;
  a.add(`<g stroke="#0a0608" stroke-width=".5" opacity=".7">${grainP}</g>`);
  const board = (y, dir, len, rot, marks) => {
    const x0 = px + (dir > 0 ? -10 : 10), tip = dir * len; const d = `M${x0} ${y}h${tip}l${dir * 18} 17l${-dir * 18} 17h${-tip}z`;
    let gr = ''; for (let k = 1; k < 4; k++) gr += `<path d="M${x0} ${y + k * 8.5}h${tip}"/>`;
    return `<g transform="rotate(${rot} ${px} ${y + 17})"><path d="${d}" fill="#2e1c17"/><g stroke="#1a0e0c" stroke-width=".7" opacity=".8">${gr}</g><path d="${d}" fill="none" stroke="#120a0a" stroke-width="2.4"/><path d="M${x0} ${y + 1.6}h${tip}l${dir * 17} 16" fill="none" stroke="#ffb27a" stroke-width="1.4" opacity=".8"/><g stroke="#ffcf9a" stroke-width="2" stroke-linecap="round" opacity=".55">${marks.map((t) => `<path d="M${x0 + tip * t} ${y + 11}v12"/>`).join('')}</g><circle cx="${px}" cy="${y + 17}" r="2.4" fill="#0a0606"/></g>`;
  };
  a.add(board(pt + 18, 1, 150, -6, [0.18, 0.3, 0.46, 0.58, 0.74]), board(pt + 74, -1, 120, 5, [0.2, 0.38, 0.56, 0.72]), board(pt + 130, 1, 110, 10, [0.22, 0.4, 0.62]));
  a.add(`<path d="M${px - 9} ${pt}l9 -12l9 12z" fill="#1a1012"/><path d="M${px} ${pt - 12}l9 12" stroke="#ffb07a" stroke-width="1.2" opacity=".8"/>`);
  // lanterna pendurada
  a.add(`<path d="M${px + 8} ${pt + 190}h22v8" stroke="#140c0c" stroke-width="2.4" fill="none"/>`);
  a.glow(px + 30, pt + 214, 50, '#ffb040', 0.75);
  a.add(`<path d="M${px + 22} ${pt + 202}h16l-2 22h-12z" fill="#ffd27a"/><path d="M${px + 22} ${pt + 202}h16l-2 22h-12z" fill="none" stroke="#140c0c" stroke-width="2"/><path d="M${px + 30} ${pt + 202}v22" stroke="#140c0c" stroke-width="1.2"/>`);
  a.add(`<path d="${ridge({ seed: 55, y: 620, amp: 14, freq: 0.01 })}" fill="#0c070b"/>`);
  grass(a, -10, 220, 580, 80, 50, '#0c070b', 11, 0.3);
  grass(a, 330, 510, 590, 60, 46, '#0c070b', 12, -0.1);
  a.add(birds([[320, 250, 1], [340, 262, 0.75], [306, 270, 0.6]], '#2a1a2a'));
  return a.svg({ grain: 0.15 });
}

/* ---------- 6 · Mapa em branco (Incomum) ---------- */
function mapa() {
  const a = new Art(606);
  const wood = lin([[0, '#2a1a12'], [0.5, '#1c120d'], [1, '#100a08']], { x1: 0, y1: 0, x2: 1, y2: 1 }); a.def(wood);
  a.add(`<rect width="${W}" height="${H}" fill="${wood.url}"/>`);
  const R = rng(66); let gr = '';
  for (let i = 0; i < 44; i++) { const y = i * 16 + R() * 8; gr += `<path d="M-10 ${y.toFixed(1)}C120 ${(y + R() * 10 - 5).toFixed(1)} 300 ${(y + R() * 14 - 7).toFixed(1)} 520 ${(y + R() * 8).toFixed(1)}" stroke="#3a2418" stroke-width="${(0.6 + R() * 1.4).toFixed(2)}" fill="none" opacity="${(0.3 + R() * 0.4).toFixed(2)}"/>`; }
  a.add(gr);
  a.glow(410, 70, 420, '#ffb05a', 0.6);
  const paper = lin([[0, '#f3e1b8'], [0.6, '#e2c58e'], [1, '#b48a52']], { x1: 0.8, y1: 0, x2: 0.1, y2: 1 }); a.def(paper);
  const sheet = `M44 52C150 40 300 46 440 58C446 170 438 300 448 420C320 432 170 428 40 418C48 300 36 170 44 52Z`;
  a.add(`<path d="${sheet}" fill="#000" opacity=".5" transform="translate(10 14)" filter="${a.blur(8)}"/><path d="${sheet}" fill="${paper.url}"/>`);
  const burn = rad([[0.6, '#7a4a20', 0], [0.92, '#7a4a20', 0.45], [1, '#3a1e0c', 0.9]], { cx: 0.5, cy: 0.5, r: 0.62 }); a.def(burn);
  a.add(`<path d="${sheet}" fill="${burn.url}"/>`);
  a.add(`<path d="M242 48L246 426" stroke="#9a7444" stroke-width="1.2" opacity=".55"/><path d="M42 236L446 240" stroke="#9a7444" stroke-width="1.2" opacity=".5"/><path d="M244 48L248 426" stroke="#fff6dc" stroke-width="1" opacity=".5"/>`);
  const ink = '#4a2a14';
  a.add(`<g stroke="${ink}" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M86 352l18 -16l18 16v20h-36z"/><path d="M98 372v-10h12v10"/><path d="M128 360l12 -11l12 11v14h-24z"/><path d="M160 346l9 -8l9 8v10h-18z"/>
    <path d="M74 384c40 6 90 4 120 -4"/>
    <path d="M196 352c22 -18 30 -46 60 -58s56 -8 74 -28s26 -54 60 -66" stroke-dasharray="2 8"/>
  </g>`);
  a.add(`<g stroke="#8a1e14" stroke-width="3" stroke-linecap="round" opacity=".9"><path d="M384 190l16 16M400 190l-16 16"/></g>`);
  a.add(`<g fill="${ink}" opacity=".5"><path d="M330 120l7 -16l7 16zM348 126l6 -13l6 13zM298 140l5 -10l5 10z"/></g>`);
  a.add(`<g transform="translate(390 340)" stroke="${ink}" fill="none" stroke-width="1.3" opacity=".75"><circle r="26"/><circle r="18" stroke-dasharray="1.5 3"/><path d="M0 -36L6 0L0 36L-6 0Z" fill="${ink}" fill-opacity=".25"/><path d="M-36 0L0 -5L36 0L0 5Z"/><text y="-42" text-anchor="middle" font-family="Georgia, serif" font-size="12" fill="${ink}" stroke="none">N</text></g>`);
  a.hatch(sheet, { a: 0.1, gap: 3, angle: 20, color: '#6a4a2a' });
  const gold = lin([[0, '#fff3cf'], [0.3, '#e8c27a'], [0.6, '#a4743a'], [1, '#f2d498']], { x1: 0, y1: 0, x2: 1, y2: 1 }); a.def(gold);
  a.add(`<g transform="translate(120 446) rotate(-12)"><circle r="58" fill="#000" opacity=".5" transform="translate(8 10)" filter="${a.blur(6)}"/><circle r="58" fill="${gold.url}"/><circle r="49" fill="#1a1410"/><circle r="49" fill="none" stroke="#6a4a22" stroke-width="1.4"/>
    ${Array.from({ length: 32 }, (_, i) => { const t = (i / 32) * Math.PI * 2, l = i % 8 === 0 ? 8 : i % 4 === 0 ? 5 : 3; return `<path d="M${(Math.cos(t) * 47).toFixed(1)} ${(Math.sin(t) * 47).toFixed(1)}L${(Math.cos(t) * (47 - l)).toFixed(1)} ${(Math.sin(t) * (47 - l)).toFixed(1)}" stroke="#e8c27a" stroke-width="1"/>`; }).join('')}
    <g transform="rotate(44)"><path d="M0 -38L6.5 0L0 38L-6.5 0Z" fill="#2a2018"/><path d="M0 -38L6.5 0H-6.5Z" fill="${gold.url}"/><path d="M0 38L6.5 0H-6.5Z" fill="#6a6a70"/></g><circle r="4" fill="${gold.url}"/>
    <path d="M-40 -28A49 49 0 0 1 10 -48" stroke="#fff" stroke-width="2" fill="none" opacity=".35"/><path d="M0 -58v-12" stroke="${gold.url}" stroke-width="7"/><circle cy="-74" r="7" fill="none" stroke="${gold.url}" stroke-width="3"/></g>`);
  a.add(`<g transform="translate(430 110)"><ellipse cx="0" cy="64" rx="40" ry="12" fill="#000" opacity=".4" filter="${a.blur(4)}"/><ellipse cx="0" cy="58" rx="34" ry="10" fill="${gold.url}"/><rect x="-16" y="-10" width="32" height="68" fill="#efe2c6"/><rect x="6" y="-10" width="10" height="68" fill="#c9b48e"/><path d="M-16 -10c4 10 2 22 6 30" stroke="#fff6e0" stroke-width="4" fill="none"/><ellipse cx="0" cy="-10" rx="16" ry="5" fill="#fff6e0"/><path d="M0 -14v-8" stroke="#2a1a10" stroke-width="1.6"/></g>`);
  a.glow(430, 82, 180, '#ffb450', 0.75);
  a.add(`<path d="M430 60C419 77 421 92 430 96C439 92 441 77 430 60Z" fill="#fff0b0"/><path d="M430 73C426 81 427 89 430 91C433 89 434 81 430 73Z" fill="#fff"/>`);
  a.add(`<g transform="translate(330 420) rotate(-30)"><path d="M0 0C22 -44 32 -118 18 -180C4 -118 -6 -54 0 0Z" fill="#e2d6c0"/><path d="M0 0C10 -64 14 -126 18 -180" stroke="#7a6a54" stroke-width="1.2" fill="none"/>${Array.from({ length: 14 }, (_, i) => `<path d="M${(2 + i * 1.1).toFixed(1)} ${-20 - i * 11}l${(9 - i * 0.3).toFixed(1)} -6" stroke="#b8aa92" stroke-width=".6"/>`).join('')}<path d="M0 0l-3 22" stroke="#2a2018" stroke-width="2.4"/></g>`);
  return a.svg({ grain: 0.13, vignette: 0.65 });
}

export const stickers = [
  { n: 1, file: 'casa-da-lareira', draw: casa },
  { n: 2, file: 'moinho-do-vale', draw: moinho },
  { n: 3, file: 'poco-dos-desejos', draw: poco },
  { n: 4, file: 'ponte-de-pedra', draw: ponte },
  { n: 5, file: 'placa-da-encruzilhada', draw: placa },
  { n: 6, file: 'mapa-em-branco', draw: mapa, engrave: { alpha: 0.35 } },
];
