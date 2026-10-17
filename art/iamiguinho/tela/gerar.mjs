/**
 * As 12 expressões da tela do IAmiguinho, em vetor: node art/iamiguinho/tela/gerar.mjs
 * Gera tela-<nome>.svg (vidro escuro com a luz) e luz-<nome>.svg (só a luz, fundo transparente, para pôr sobre os renders).
 * As formas seguem as imagens de referência: olhos em arco, sorriso em meia-lua, luz azul-clara com brilho.
 * O mesmo desenho alimenta o componente do site na M3 (EXPRESSOES exporta as formas).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const COR = { luz: '#8FE8FF', brilho: '#38C8FF', tela: '#061428', telaBorda: '#0C2240' };
const W = 200, H = 140, EX = 62, DX = 138, OY = 56, BY = 98, SW = 11;

const arco = (cx, cy, r = 17, up = true) => `<path d="M${cx - r} ${cy + (up ? 6 : -6)}Q${cx} ${cy + (up ? -r * 1.15 : r * 1.15)} ${cx + r} ${cy + (up ? 6 : -6)}" fill="none" stroke-width="${SW}" stroke-linecap="round"/>`;
const meiaLua = (cx, cy, w = 46, h = 20) => `<path d="M${cx - w / 2} ${cy - h / 2}H${cx + w / 2}Q${cx + w / 2} ${cy + h * 0.95} ${cx} ${cy + h * 0.95}Q${cx - w / 2} ${cy + h * 0.95} ${cx - w / 2} ${cy - h / 2}Z" stroke="none"/>`;
const ponto = (cx, cy, r = 8) => `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="none"/>`;
const anel = (cx, cy, r = 15) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke-width="${SW - 2}"/>`;
const linha = (x1, y1, x2, y2, w = SW) => `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke-width="${w}" stroke-linecap="round"/>`;
const estrela = (cx, cy, r = 19, pts = 5, ins = 0.45, rot = -90) => { let d = ''; for (let i = 0; i < pts * 2; i++) { const a = ((rot + (i * 180) / pts) * Math.PI) / 180, rr = i % 2 ? r * ins : r; d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`; } return `<path d="${d}Z" stroke="none" stroke-linejoin="round"/>`; };
const brilho = (cx, cy, r = 8) => estrela(cx, cy, r, 4, 0.28, 0);
const espiral = (cx, cy, voltas = 2.2, r = 17, cls = '') => { let d = ''; const n = 60; for (let i = 0; i <= n; i++) { const t = i / n, a = t * voltas * Math.PI * 2, rr = 2 + t * (r - 2); d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`; } return `<path class="${cls}" d="${d}" fill="none" stroke-width="5.5" stroke-linecap="round" style="transform-origin:${cx}px ${cy}px"/>`; };
const interrogacao = (cx, cy) => `<path d="M${cx - 10} ${cy - 10}Q${cx - 10} ${cy - 24} ${cx + 1} ${cy - 24}Q${cx + 13} ${cy - 24} ${cx + 13} ${cy - 13}Q${cx + 13} ${cy - 5} ${cx + 3} ${cy}Q${cx} ${cy + 3} ${cx} ${cy + 8}" fill="none" stroke-width="${SW - 3}" stroke-linecap="round" stroke-linejoin="round"/>${ponto(cx, cy + 20, 5)}`;
const onda = (cx, cy, w = 44, a = 6) => `<path d="M${cx - w / 2} ${cy}q${w / 8} ${-a} ${w / 4} 0t${w / 4} 0t${w / 4} 0t${w / 4} 0" fill="none" stroke-width="${SW - 3}" stroke-linecap="round"/>`;
const gota = (cx, cy) => `<path d="M${cx} ${cy - 11}Q${cx + 8} ${cy} ${cx + 7} ${cy + 4}A7 7 0 0 1 ${cx - 7} ${cy + 4}Q${cx - 8} ${cy} ${cx} ${cy - 11}Z" stroke="none"/>`;
const zz = (x, y, s = 1) => `<path d="M${x} ${y}h${10 * s}l${-10 * s} ${10 * s}h${10 * s}" fill="none" stroke-width="${4 * s}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** nome do arquivo → { titulo, quando, o: os olhos (piscam), r: o resto }. Expressões sem olhos piscáveis têm o vazio. */
export const EXPRESSOES = {
  'sorriso-confiante': { titulo: 'Sorriso confiante', quando: 'padrão, falas comuns', o: () => arco(EX, OY) + arco(DX, OY), r: () => meiaLua(100, BY) },
  feliz: { titulo: 'Feliz de verdade', quando: 'boas-vindas, Retomada', o: () => arco(EX, OY - 2, 19) + arco(DX, OY - 2, 19), r: () => meiaLua(100, BY - 2, 58, 26) + linha(EX - 20, OY + 22, EX - 12, OY + 22, 5) + linha(DX + 12, OY + 22, DX + 20, OY + 22, 5) },
  comemorando: { titulo: 'Comemorando', quando: 'jogo zerado, página completa, Awards', o: () => estrela(EX, OY - 2) + estrela(DX, OY - 2), r: () => meiaLua(100, BY, 54, 26) },
  orgulhoso: { titulo: 'Orgulhoso', quando: 'marcos da Jornada, pose de herói', o: () => arco(EX, OY) + arco(DX, OY), r: () => brilho(DX + 30, OY - 26, 9) + `<path d="M76 ${BY - 6}Q104 ${BY + 18} 128 ${BY - 12}" fill="none" stroke-width="${SW}" stroke-linecap="round"/>` },
  curioso: { titulo: 'Curioso', quando: 'dicas, novidades', o: () => anel(EX, OY, 17) + ponto(EX, OY, 5) + ponto(DX, OY + 2, 8), r: () => `<circle cx="104" cy="${BY + 2}" r="7" fill="none" stroke-width="7"/>` },
  pensando: { titulo: 'Pensando', quando: '"O que jogar", espera curta', o: () => '', r: () => `<g class="pensa">${ponto(76, OY + 4, 8)}${ponto(100, OY + 4, 8)}${ponto(124, OY + 4, 8)}</g>` + linha(92, BY + 4, 116, BY + 1, 8) },
  surpreso: { titulo: 'Surpreso', quando: 'figurinha rara ou Lendária', o: () => anel(EX, OY - 2, 18) + anel(DX, OY - 2, 18), r: () => `<ellipse cx="100" cy="${BY + 2}" rx="9" ry="11" fill="none" stroke-width="8"/>` },
  'sem-jeito': { titulo: 'Sem jeito', quando: 'erro do site', o: () => arco(EX, OY - 4, 16, false) + arco(DX, OY - 4, 16, false), r: () => onda(100, BY + 2, 40, 5) + gota(DX + 34, OY - 26) },
  tonto: { titulo: 'Tonto', quando: 'tocaram nele várias vezes', o: () => '', r: () => espiral(EX, OY, 2, 20, 'gira') + espiral(DX, OY, 2, 20, 'gira') + onda(100, BY + 4, 46, 7) },
  perdido: { titulo: 'Perdido', quando: '404, busca sem resultado', o: () => '', r: () => interrogacao(EX, OY) + interrogacao(DX, OY) + linha(92, BY + 6, 108, BY + 6, 8) },
  sonolento: { titulo: 'Sonolento', quando: 'página parada, manutenção', o: () => '', r: () => linha(EX - 16, OY + 4, EX + 16, OY + 4) + linha(DX - 16, OY + 4, DX + 16, OY + 4) + `<ellipse cx="100" cy="${BY + 4}" rx="7" ry="5" stroke="none"/>` + zz(DX + 22, OY - 26, 1) + zz(DX + 36, OY - 38, 0.7) },
  piscando: { titulo: 'Piscando', quando: 'despedida, segredinho', o: () => '', r: () => arco(EX, OY) + ponto(DX, OY + 2, 9) + meiaLua(100, BY, 46, 20) },
};

/** Só a luz (com brilho), para pôr sobre a tela. */
export function luz(nome) {
  const e = EXPRESSOES[nome], o = e.o(), r = e.r();
  const g = (o ? `<g class="olhos" style="transform-origin:100px ${OY}px">${o}</g>` : '') + r;
  return `<g fill="${COR.luz}" stroke="${COR.luz}"><g filter="url(#iam-brilho)" opacity=".85" fill="${COR.brilho}" stroke="${COR.brilho}">${g}</g>${g}</g>`;
}
const DEFS = `<defs><filter id="iam-brilho" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter><linearGradient id="iam-vidro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B2244"/><stop offset=".55" stop-color="${COR.tela}"/><stop offset="1" stop-color="#03091A"/></linearGradient></defs>`;
export const telaSvg = (nome) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 2}" height="${H * 2}">${DEFS}<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="38" fill="url(#iam-vidro)" stroke="${COR.telaBorda}" stroke-width="3"/><path d="M30 18Q60 10 110 12" stroke="#fff" stroke-opacity=".12" stroke-width="6" fill="none" stroke-linecap="round"/>${luz(nome)}</svg>`;
export const luzSvg = (nome) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 2}" height="${H * 2}">${DEFS}${luz(nome)}</svg>`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = dirname(fileURLToPath(import.meta.url));
  mkdirSync(out, { recursive: true });
  for (const nome of Object.keys(EXPRESSOES)) {
    writeFileSync(join(out, `tela-${nome}.svg`), telaSvg(nome));
    writeFileSync(join(out, `luz-${nome}.svg`), luzSvg(nome));
  }
  console.log(Object.keys(EXPRESSOES).length, 'expressões');
}
