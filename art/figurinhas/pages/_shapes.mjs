/** Peças que várias páginas usam: árvores, mato, pássaros. */
import { rng } from '../kit.mjs';

export function pine(x, y, h, fill) {
  const w = h * 0.36; const tiers = 5; let d = '';
  for (let i = 0; i < tiers; i++) { const t0 = i / tiers, t1 = Math.min(1, (i + 1.35) / tiers); const y0 = y - h + t0 * h * 0.92, y1 = y - h + t1 * h * 0.92; const ww = w * (0.25 + 0.75 * t1); d += `M${x.toFixed(1)} ${y0.toFixed(1)}L${(x + ww / 2).toFixed(1)} ${y1.toFixed(1)}L${(x - ww / 2).toFixed(1)} ${y1.toFixed(1)}Z`; }
  d += `M${(x - h * 0.025).toFixed(1)} ${(y - h * 0.1).toFixed(1)}h${(h * 0.05).toFixed(1)}V${y}h${(-h * 0.05).toFixed(1)}Z`;
  return `<path d="${d}" fill="${fill}"/>`;
}

export function roundTree(x, y, h, fill, seed = 3) {
  const R = rng(seed); let s = `<path d="M${x - 2.4} ${y}L${x - 1.4} ${y - h * 0.45}L${x + 1.4} ${y - h * 0.45}L${x + 2.6} ${y}Z"/>`;
  for (let i = 0; i < 11; i++) { const a = R() * Math.PI * 2, rr = R() * h * 0.2; s += `<circle cx="${(x + Math.cos(a) * rr).toFixed(1)}" cy="${(y - h * 0.62 + Math.sin(a) * rr * 0.8).toFixed(1)}" r="${(h * (0.13 + R() * 0.1)).toFixed(1)}"/>`; }
  return `<g fill="${fill}">${s}</g>`;
}

export function grass(a, x0, x1, yb, n, h, fill, seed = 9, lean = 0.2) {
  const R = rng(seed); let d = '';
  for (let i = 0; i < n; i++) { const x = x0 + R() * (x1 - x0), hh = h * (0.4 + R() * 0.8), l = (R() - 0.5 + lean) * hh * 0.5, y = yb + R() * 8; d += `M${(x - 1.2).toFixed(1)} ${y.toFixed(1)}Q${(x + l * 0.4).toFixed(1)} ${(y - hh * 0.6).toFixed(1)} ${(x + l).toFixed(1)} ${(y - hh).toFixed(1)}Q${(x + l * 0.3 + 0.6).toFixed(1)} ${(y - hh * 0.55).toFixed(1)} ${(x + 1.2).toFixed(1)} ${y.toFixed(1)}Z`; }
  a.add(`<path d="${d}" fill="${fill}"/>`);
}

export function birds(list, stroke) {
  return list.map(([x, y, s]) => `<path d="M${x - 8 * s} ${y}Q${x - 3 * s} ${y - 5 * s} ${x} ${y}Q${x + 3 * s} ${y - 5 * s} ${x + 8 * s} ${y}" fill="none" stroke="${stroke}" stroke-width="${1.6 * s}"/>`).join('');
}
