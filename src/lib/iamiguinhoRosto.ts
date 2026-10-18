/**
 * O rosto do IAmiguinho em vetor (a luz azul-clara da tela): as 12 expressões da ficha, desenhadas para caber na tela
 * das imagens finais (o vidro foi limpo por art/iamiguinho/limpar-tela.py). Os olhos ficam num grupo próprio, para
 * piscar e olhar para os lados sem redesenhar a expressão. viewBox 200 × 140, centro da tela em (100, 70).
 */
export type Expressao = 'sorriso-confiante' | 'feliz' | 'comemorando' | 'orgulhoso' | 'curioso' | 'pensando' | 'surpreso' | 'sem-jeito' | 'tonto' | 'perdido' | 'sonolento' | 'piscando';
export const EXPRESSOES: Expressao[] = ['sorriso-confiante', 'feliz', 'comemorando', 'orgulhoso', 'curioso', 'pensando', 'surpreso', 'sem-jeito', 'tonto', 'perdido', 'sonolento', 'piscando'];

const EX = 56, DX = 144, OY = 54, BY = 96, SW = 15;
const f = (n: number) => n.toFixed(1);
const arco = (cx: number, cy: number, r = 22, up = true) => `<path d="M${f(cx - r)} ${f(cy + (up ? 8 : -8))}Q${f(cx)} ${f(cy + (up ? -r * 1.2 : r * 1.2))} ${f(cx + r)} ${f(cy + (up ? 8 : -8))}" fill="none" stroke-width="${SW}" stroke-linecap="round"/>`;
const meiaLua = (cx: number, cy: number, w = 64, h = 30) => `<path d="M${f(cx - w / 2)} ${f(cy - h / 2)}H${f(cx + w / 2)}Q${f(cx + w / 2)} ${f(cy + h * 0.95)} ${f(cx)} ${f(cy + h * 0.95)}Q${f(cx - w / 2)} ${f(cy + h * 0.95)} ${f(cx - w / 2)} ${f(cy - h / 2)}Z" stroke="none"/>`;
const ponto = (cx: number, cy: number, r = 10) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${r}" stroke="none"/>`;
const anel = (cx: number, cy: number, r = 20) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${r}" fill="none" stroke-width="${SW - 3}"/>`;
const linha = (x1: number, y1: number, x2: number, y2: number, w = SW) => `<path d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}" fill="none" stroke-width="${w}" stroke-linecap="round"/>`;
const estrela = (cx: number, cy: number, r = 24, pts = 5, ins = 0.45, rot = -90) => {
  let d = '';
  for (let i = 0; i < pts * 2; i++) { const a = ((rot + (i * 180) / pts) * Math.PI) / 180, rr = i % 2 ? r * ins : r; d += `${i ? 'L' : 'M'}${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`; }
  return `<path d="${d}Z" stroke="none" stroke-linejoin="round"/>`;
};
const brilho = (cx: number, cy: number, r = 10) => estrela(cx, cy, r, 4, 0.28, 0);
const espiral = (cx: number, cy: number, r = 22) => {
  let d = '';
  for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * 2.1 * Math.PI * 2, rr = 2 + t * (r - 2); d += `${i ? 'L' : 'M'}${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`; }
  return `<path class="iam-espiral" d="${d}" fill="none" stroke-width="7" stroke-linecap="round" style="transform-origin:${cx}px ${cy}px"/>`;
};
const interrogacao = (cx: number, cy: number) => `<path d="M${cx - 12} ${cy - 12}Q${cx - 12} ${cy - 28} ${cx + 1} ${cy - 28}Q${cx + 15} ${cy - 28} ${cx + 15} ${cy - 15}Q${cx + 15} ${cy - 6} ${cx + 4} ${cy}Q${cx} ${cy + 4} ${cx} ${cy + 10}" fill="none" stroke-width="${SW - 4}" stroke-linecap="round" stroke-linejoin="round"/>${ponto(cx, cy + 24, 6)}`;
const onda = (cx: number, cy: number, w = 50, a = 7) => `<path d="M${cx - w / 2} ${cy}q${w / 8} ${-a} ${w / 4} 0t${w / 4} 0t${w / 4} 0t${w / 4} 0" fill="none" stroke-width="${SW - 4}" stroke-linecap="round"/>`;
const gota = (cx: number, cy: number) => `<path d="M${cx} ${cy - 13}Q${cx + 9} ${cy} ${cx + 8} ${cy + 5}A8 8 0 0 1 ${cx - 8} ${cy + 5}Q${cx - 9} ${cy} ${cx} ${cy - 13}Z" stroke="none"/>`;
const zz = (x: number, y: number, s = 1) => `<path d="M${x} ${y}h${12 * s}l${-12 * s} ${12 * s}h${12 * s}" fill="none" stroke-width="${5 * s}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Cada expressão: olhos (piscam e olham para os lados) e o resto (boca e detalhes). */
const FORMAS: Record<Expressao, { o: () => string; r: () => string }> = {
  'sorriso-confiante': { o: () => arco(EX, OY) + arco(DX, OY), r: () => meiaLua(100, BY) },
  feliz: { o: () => arco(EX, OY - 2, 24) + arco(DX, OY - 2, 24), r: () => meiaLua(100, BY - 2, 78, 36) },
  comemorando: { o: () => estrela(EX, OY - 2) + estrela(DX, OY - 2), r: () => meiaLua(100, BY, 72, 34) },
  orgulhoso: { o: () => arco(EX, OY) + arco(DX, OY), r: () => brilho(DX + 36, OY - 32, 11) + `<path d="M70 ${BY - 8}Q104 ${BY + 22} 134 ${BY - 14}" fill="none" stroke-width="${SW}" stroke-linecap="round"/>` },
  curioso: { o: () => anel(EX, OY, 21) + ponto(EX, OY, 7) + ponto(DX, OY + 2, 11), r: () => `<circle cx="106" cy="${BY + 2}" r="9" fill="none" stroke-width="9"/>` },
  pensando: { o: () => '', r: () => `<g class="iam-pensa">${ponto(70, OY + 4, 11)}${ponto(100, OY + 4, 11)}${ponto(130, OY + 4, 11)}</g>` + linha(88, BY + 6, 118, BY + 2, 10) },
  surpreso: { o: () => anel(EX, OY - 2, 22) + anel(DX, OY - 2, 22), r: () => `<ellipse cx="100" cy="${BY + 4}" rx="11" ry="14" fill="none" stroke-width="10"/>` },
  'sem-jeito': { o: () => arco(EX, OY - 4, 20, false) + arco(DX, OY - 4, 20, false), r: () => onda(100, BY + 4, 48, 6) + gota(DX + 38, OY - 30) },
  tonto: { o: () => '', r: () => espiral(EX, OY, 24) + espiral(DX, OY, 24) + onda(100, BY + 6, 52, 8) },
  perdido: { o: () => '', r: () => interrogacao(EX, OY) + interrogacao(DX, OY) + linha(90, BY + 8, 110, BY + 8, 10) },
  sonolento: { o: () => '', r: () => linha(EX - 20, OY + 6, EX + 20, OY + 6) + linha(DX - 20, OY + 6, DX + 20, OY + 6) + `<ellipse cx="100" cy="${BY + 6}" rx="9" ry="6" stroke="none"/>` + zz(DX + 26, OY - 32, 1) + zz(DX + 42, OY - 46, 0.7) },
  piscando: { o: () => '', r: () => arco(EX, OY) + ponto(DX, OY + 2, 12) + meiaLua(100, BY, 62, 28) },
};
/** Olhos fechados (o meio da piscada): dois traços. */
const FECHADOS = linha(EX - 18, OY + 4, EX + 18, OY + 4) + linha(DX - 18, OY + 4, DX + 18, OY + 4);

/**
 * O SVG interno (sem a tag <svg>) da expressão: a luz por cima do brilho borrado. Os olhos ficam em
 * <g class="iam-olhos"> (o CSS faz piscar e olhar). id: um id único na página para o filtro do brilho.
 */
export function rosto(e: Expressao, id = 'iam-brilho', opts: { fechados?: boolean } = {}): string {
  const fma = FORMAS[e] ?? FORMAS['sorriso-confiante'];
  const olhos = fma.o();
  const g = (olhos ? `<g class="iam-olhos">${opts.fechados ? FECHADOS : olhos}</g>` : '') + fma.r();
  return `<defs><filter id="${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="6"/></filter></defs>`
    + `<g fill="#9CEBFF" stroke="#9CEBFF"><g filter="url(#${id})" opacity=".9" fill="#38C8FF" stroke="#38C8FF">${g}</g>${g}</g>`;
}

/** A expressão de cada imagem quando nada está acontecendo (as caras têm o nome da expressão). */
const POSE_EXPRESSAO: Record<string, Expressao> = {
  acenando: 'feliz', atrasado: 'surpreso', cabo: 'sem-jeito', controle: 'feliz', dormindo: 'sonolento', espiando: 'sorriso-confiante',
  'espiando-placa': 'sorriso-confiante', heroi: 'orgulhoso', mapa: 'perdido', pacote: 'sem-jeito', placa: 'feliz', planando: 'sorriso-confiante', trofeu: 'comemorando',
};
export function expressaoDe(img: string): Expressao {
  if (img.startsWith('cara-')) { const e = img.slice(5) as Expressao; return EXPRESSOES.includes(e) ? e : 'sorriso-confiante'; }
  return POSE_EXPRESSAO[img.replace(/^pose-/, '')] ?? 'sorriso-confiante';
}

/** Às vezes, sem motivo, ele faz outra cara por um instante (e volta). Nunca dormindo. */
const DE_PASSAGEM: Partial<Record<Expressao, Expressao[]>> = {
  'sorriso-confiante': ['piscando', 'feliz', 'curioso'], feliz: ['piscando', 'comemorando', 'sorriso-confiante'], comemorando: ['feliz', 'piscando'],
  orgulhoso: ['piscando', 'sorriso-confiante'], curioso: ['pensando', 'surpreso'], pensando: ['curioso', 'perdido'], surpreso: ['sem-jeito', 'curioso'],
  'sem-jeito': ['piscando', 'pensando'], perdido: ['pensando', 'sem-jeito'], piscando: ['sorriso-confiante', 'feliz'],
};
export const dePassagem = (e: Expressao, sorte = Math.random()): Expressao | null => { const l = DE_PASSAGEM[e]; return l ? l[Math.floor(sorte * l.length) % l.length] : null; };
