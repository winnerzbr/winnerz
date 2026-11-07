/* ============================================================ jogo: Queda do Disco */
// Uma torre de discos de jogo (CD/DVD com rótulos inventados) presa num eixo, como num tubo de mídia.
// O IAmiguinho quica sozinho no disco de cima; você gira a torre para ele cair pelos buracos (fatias que faltam).
// Pisar na parte arranhada (vermelha listrada) acaba a partida. Cair 3 andares seguidos sem tocar liga o turbo:
// o próximo disco que ele tocar quebra inteiro, até o arranhado (e vale 1 andar extra).
// Fases de 15 discos; o 15º é o disco de ouro, que quebra sozinho e abre a fase seguinte (cor nova e novidade):
//   2 discos que giram sozinhos · 3 buracos menores · 4 disco que vai e volta · 5 arranhado em dobro · 6+ mais arranhado e mais rápido.
// Controles: ← → / A D / analógico / LB RB giram a torre · no celular, arrastar o dedo na horizontal.
// Desenho: os discos são pintados pixel a pixel numa tela de 160×180 (ampliada 2×), em perspectiva vista um pouco de cima.
Music.define('disco', {
  bpm: 132,
  lead: bars('E5 . G5 . B5 - A5 . G5 . E5 . D5 - E5 .', 'G5 - . E5 . D5 . B4 - - . D5 . E5 - .', 'C6 . B5 . A5 - G5 . A5 . B5 . D6 - B5 .', 'A5 - - . G5 . F#5 . E5 - - - . . D5 .'),
  arp: bars('. E5 . B4 . G5 . B4 . E5 . B4 . G5 . B4', '. G5 . D5 . B5 . D5 . G5 . D5 . B5 . D5', '. C5 . G4 . E5 . G4 . C5 . G4 . E5 . G4', '. D5 . A4 . F#5 . A4 . D5 . A4 . F#5 . A4'),
  bass: bars(oct8('E2', 'E3'), oct8('G2', 'G3'), oct8('C2', 'C3'), oct8('D2', 'D3')),
  drums: 'k . o . ks . o . k . o . ks . o h',
  mix: { arp: .65, bass: .9 },
});
const QD_BW = 160, QD_BH = 180, QD_CX = 80, QD_R = 56, QD_HUB = 12, QD_POLE = 6, QD_K = .42, QD_T = 4, QD_N = 12;
const QD_TAU = Math.PI * 2, QD_SEC = QD_TAU / QD_N, QD_RB = 42, QD_SP = 64, QD_CAMY = 150, QD_POR = 15;
const QD_G = 1500, QD_V0 = 400, QD_VMAX = 760, QD_GIRO = 3.6, QD_DRAG = .024;
const QD_FRONT = 2 * Math.round(QD_RB * QD_K); // da linha do disco até o pé do IAmiguinho, na frente da torre
const qdMod = (a) => ((a % QD_TAU) + QD_TAU) % QD_TAU;
const qdU = (hex) => { const n = parseInt(hex.slice(1), 16); return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0; };
const qdRgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
// tela pequena onde os discos são pintados
const QD_CV = document.createElement('canvas'); QD_CV.width = QD_BW; QD_CV.height = QD_BH;
const QD_CTX = QD_CV.getContext('2d'), QD_IMG = QD_CTX.createImageData(QD_BW, QD_BH), QD_BUF = new Uint32Array(QD_IMG.data.buffer);
// rótulos inventados: cor principal, faixa, "letreiro"
const QD_ROTULOS = [
  ['#2e6fd8', '#f6f7f9', '#bfefff'], ['#3fc9c0', '#0a1016', '#e8fff8'], ['#43d17a', '#f6f7f9', '#0a1016'], ['#c0d040', '#0a1016', '#3a4a10'],
  ['#a77bff', '#ffd04a', '#f6f7f9'], ['#7fdcff', '#1c4a99', '#ffffff'], ['#3a4a9a', '#ffd04a', '#bfefff'], ['#5fa0ff', '#43d17a', '#ffffff'],
];
const QD_BRILHO = ['#c9d3de', '#b8c6ff', '#c8f0ff', '#e6d0ff', '#d8f5d0', '#f0f4f8'];
const qdPal = ([m, band, dots], rim = QD_BRILHO) => ({ m: qdU(m), l: qdU(mixHex(m, '#ffffff', .35)), d: qdU(mixHex(m, '#000000', .45)), band: qdU(band), dots: qdU(mixHex(dots, m, .35)), rim: rim.map(qdU), hex: m });
const QD_PALS = QD_ROTULOS.map((r) => qdPal(r));
const QD_OURO = qdPal(['#ffd04a', '#fff1b8', '#b08a12'], ['#fff1b8', '#ffe07a', '#ffffff', '#ffd04a']);
const QD_C = {
  out: qdU('#07050c'), hubL: qdU('#c3ccd6'), hubM: qdU('#8e99a8'), hubD: qdU('#3a4456'),
  red: qdU('#e8443a'), redD: qdU('#8a1f1a'), redL: qdU('#ffb0a8'), flash: qdU('#ffffff'),
  sideL: qdU('#d4dbe3'), side: qdU('#9aa5b3'), sideM: qdU('#6f7a88'), sideD: qdU('#4a5462'),
  redS: qdU('#b8322a'), redSD: qdU('#6a1814'), goldS: qdU('#e0b030'), goldSD: qdU('#8a6a12'),
};
const QD_LOMBADA = QD_ROTULOS.map(([m]) => mixHex(m, '#05070d', .62)).concat(['#3a2030', '#20303a', '#30302a']);
const QD_TEMAS = [
  { nome: 'Estante da Sala', bg0: '#0b1534', bg1: '#04060d', luz: '#7fdcff', pole: '#4a6a9a' },
  { nome: 'Locadora do Bairro', bg0: '#1c0f38', bg1: '#06040d', luz: '#b79cff', pole: '#6a5a9a' },
  { nome: 'Caixa de Promoção', bg0: '#082a1e', bg1: '#03080a', luz: '#43d17a', pole: '#3f8a66' },
  { nome: 'Feira de Usados', bg0: '#2e1808', bg1: '#0a0503', luz: '#ff9a4a', pole: '#9a6a44' },
  { nome: 'Sebo dos Riscados', bg0: '#2e0b20', bg1: '#0a0307', luz: '#ff6fb0', pole: '#9a4a70' },
  { nome: 'Cofre do Colecionador', bg0: '#2a2008', bg1: '#080602', luz: '#ffd04a', pole: '#9a8a44' },
];
const qdTema = (f) => { const b = QD_TEMAS[(f - 1) % QD_TEMAS.length]; return f <= QD_TEMAS.length ? b : { ...b, nome: `Prateleira Sem Fim ${f - QD_TEMAS.length}` }; };
const QD_NOVO = { 2: 'Discos que giram sozinhos', 3: 'Buracos menores', 4: 'Disco que vai e volta', 5: 'Arranhado em dobro', 6: 'Mais arranhado, mais rápido' };
const qdFaseDe = (i) => (i <= 0 ? 1 : Math.ceil(i / QD_POR));
// dificuldade de cada fase
function qdFase(f) {
  const k = Math.min(f, 6) - 1, x = Math.max(0, f - 6);
  return {
    h0: f >= 3 ? 1 : 2, h1: f >= 3 ? 2 : 3, blocos: f === 1 ? 2 : f === 2 ? (Math.random() < .5 ? 2 : 1) : 1,
    r0: [0, 1, 1, 2, 2, 3][k] + Math.floor(x / 2), r1: Math.min(7, [1, 2, 3, 3, 4, 5][k] + Math.ceil(x / 2)), rb: f >= 5 ? 2 : 1,
    gira: Math.min(.75, [0, .3, .35, .45, .5, .55][k] + x * .04), vel: Math.min(2.3, 1 + .14 * Math.max(0, f - 2)), vai: f >= 4,
  };
}
const qdInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
// um disco novo da torre (i = andar; 0 é o disco de partida)
function qdNovoDisco(i, prev) {
  const f = qdFaseDe(i), j = i - (f - 1) * QD_POR;
  let pi = Math.floor(Math.random() * QD_PALS.length); if (prev && QD_PALS[pi] === prev.cols) pi = (pi + 1) % QD_PALS.length;
  const d = { i, y: i * QD_SP, sec: new Array(QD_N).fill(0), spin: 0, osc: 0, ow: 0, ph: rand(0, 6.28), seed: (Math.random() * 97) | 0, spl: [], gone: false, cols: QD_PALS[pi], hc: 0 };
  if (i > 0 && j === QD_POR) { d.sec.fill(3); d.ouro = true; d.cols = QD_OURO; return d; }
  if (i === 0) { d.sec[8] = d.sec[9] = d.sec[10] = 1; d.hc = 9; return d; }
  const P = qdFase(f);
  // buracos: fatias que faltam
  let nb = 0;
  for (let b = 0; b < P.blocos; b++) {
    const w = qdInt(P.h0, P.h1);
    for (let tries = 0; tries < 20; tries++) {
      const s0 = Math.floor(Math.random() * QD_N); let ok = true;
      for (let q = -1; q <= w; q++) if (d.sec[(s0 + q + QD_N) % QD_N] === 1) ok = false;
      if (!ok) continue;
      for (let q = 0; q < w; q++) d.sec[(s0 + q) % QD_N] = 1;
      if (!b) d.hc = (s0 + Math.floor(w / 2)) % QD_N;
      nb += w; break;
    }
  }
  // gira sozinho?
  if (Math.random() < P.gira) {
    if (P.vai && Math.random() < .4) { d.osc = rand(.9, 1.7); d.ow = rand(1.3, 2.1) * P.vel; }
    else d.spin = rand(.5, .85) * P.vel * (Math.random() < .5 ? -1 : 1);
  }
  // arranhados: nunca bem embaixo do buraco de cima quando os dois estão parados
  const parado = (x) => x && !x.spin && !x.osc;
  const livre = parado(prev) && parado(d) && prev.sec[prev.hc] === 1 ? prev.hc : -1;
  let nr = qdInt(P.r0, P.r1) - (j <= 2 ? 1 : 0); if (f === 1 && j <= 3) nr = 0;
  nr = clamp(nr, 0, QD_N - nb - 3);
  const blocos = nr >= 2 ? P.rb : 1;
  for (let b = 0; b < blocos && nr > 0; b++) {
    const w = b === blocos - 1 ? nr : Math.ceil(nr / blocos);
    for (let tries = 0; tries < 30; tries++) {
      const s0 = Math.floor(Math.random() * QD_N); let ok = true;
      for (let q = 0; q < w; q++) { const s = (s0 + q) % QD_N; if (d.sec[s] !== 0 || s === livre) ok = false; }
      if (!ok) continue;
      for (let q = 0; q < w; q++) d.sec[(s0 + q) % QD_N] = 2;
      nr -= w; break;
    }
  }
  return d;
}
const qdAng = (d, t) => (d.osc ? d.osc * Math.sin(t * d.ow + d.ph) : d.spin * t);
// molde do disco: todos têm a mesma elipse, então a geometria de cada pixel é calculada uma vez só
const QD_TPL = (() => {
  const R = QD_R, R2 = R * R, K = QD_K, P2 = QD_POLE * QD_POLE, ry = Math.ceil(R * K + 1), L = { px: [], oy: [], r: [], phi: [], x: [], z: [], brilho: [] };
  for (let oy = -ry; oy <= ry; oy++) {
    const dz = (oy + .5) / K; if (dz * dz >= R2) continue;
    for (let px = 0; px < QD_BW; px++) {
      const dx = px + .5 - QD_CX, r2 = dx * dx + dz * dz; if (r2 > R2) continue;
      if (dx * dx < P2 && (dz < 0 || dz * dz < P2 - dx * dx)) continue; // atrás do eixo
      const phi = Math.atan2(dz, dx);
      L.px.push(px); L.oy.push(oy); L.r.push(Math.sqrt(r2)); L.phi.push(phi); L.x.push(dx); L.z.push(dz); L.brilho.push(Math.sin(2 * phi + .9) > .9 ? 1 : 0);
    }
  }
  const borda = { px: [], top: [], phi: [], ax: [] };
  for (let px = Math.ceil(QD_CX - R); px <= Math.floor(QD_CX + R); px++) {
    const dx = px + .5 - QD_CX; if (dx * dx >= R2) continue;
    const e = Math.sqrt(R2 - dx * dx); borda.px.push(px); borda.top.push(Math.floor(e * K - .5) + 1); borda.phi.push(Math.atan2(e, dx)); borda.ax.push(Math.abs(dx) / R);
  }
  return { n: L.px.length, px: Int16Array.from(L.px), oy: Int16Array.from(L.oy), r: Float32Array.from(L.r), phi: Float32Array.from(L.phi), x: Float32Array.from(L.x), z: Float32Array.from(L.z), brilho: Uint8Array.from(L.brilho), borda };
})();
// pinta um disco (face de cima + borda da frente) na tela pequena
function qdPintaDisco(d, cy, base, tt, flash) {
  const B = QD_BUF, T = QD_TPL, R = QD_R, N = QD_N, IS = 1 / QD_SEC, sec = d.sec, C = QD_C, spl = d.spl, ns = spl.length;
  const pisca = flash && Math.floor(tt * 12) % 2 === 0, cb = Math.cos(base), sb = Math.sin(base), pal = d.cols, gold = QD_OURO;
  for (let k = 0; k < T.n; k++) {
    const py = cy + T.oy[k]; if (py < 0 || py >= QD_BH) continue;
    const r = T.r[k];
    let a = (T.phi[k] - base) * IS; a -= Math.floor(a / N) * N;
    const s = a | 0, typ = sec[s];
    let c;
    if (r < QD_HUB) c = r < QD_HUB - 2 ? (T.z[k] < 0 ? C.hubL : C.hubM) : C.hubD;
    else if (typ === 1) continue;
    else {
      const fr = a - s, ed = (fr < .5 ? fr : 1 - fr) * QD_SEC * r, nb = sec[fr < .5 ? (s + N - 1) % N : (s + 1) % N];
      if (r > R - 1.2 || (nb !== typ && ed < 1.1)) c = C.out;
      else {
        // posição no próprio disco (gira junto com ele)
        const X = T.x[k], Z = T.z[k], lx = X * cb + Z * sb, lz = Z * cb - X * sb;
        if (typ === 2) {
          c = pisca ? C.flash : (Math.floor((lx + lz) / 3) & 1) ? C.red : C.redD;
          if (!pisca && (Math.floor(lx * .7 - lz + 300) % 11) === 0 && r > 18) c = C.redL;
        } else {
          const p = typ === 3 ? gold : pal, loc = a * QD_SEC;
          if (r > R - 6) c = p.rim[(Math.floor(loc * 5 + r * .7)) % p.rim.length];
          else if (r < QD_HUB + 2) c = p.d;
          else if (r > 25 && r < 27.5) c = p.band;
          else if (((r > 35 && r < 37.5) || (r > 40 && r < 42.5)) && loc > .5 && loc < 2.5 && ((Math.floor(loc * r / 2.4) * 7 + d.seed + (r > 39 ? 3 : 0)) % 5) < 3) c = p.dots;
          else c = T.brilho[k] ? p.l : p.m;
          for (let q = 0; q < ns; q++) { const m = spl[q], ex = lx - m[0], ez = lz - m[1]; if (ex * ex + ez * ez < m[2]) { c = m[3]; break; } }
        }
      }
    }
    B[py * QD_BW + T.px[k]] = c;
  }
  // borda da frente (a espessura do disco)
  const E = T.borda;
  for (let k = 0; k < E.px.length; k++) {
    let a = (E.phi[k] - base) * IS; a -= Math.floor(a / N) * N;
    const typ = sec[a | 0]; if (typ === 1) continue;
    const ax = E.ax[k], top = cy + E.top[k];
    const c0 = typ === 2 ? (pisca ? C.flash : C.redS) : typ === 3 ? C.goldS : ax > .75 ? C.side : C.sideL;
    const c1 = typ === 2 ? C.redS : typ === 3 ? C.goldS : ax > .75 ? C.sideM : ax > .4 ? C.side : C.sideL;
    const c2 = typ === 2 ? C.redSD : typ === 3 ? C.goldSD : ax > .75 ? C.sideD : ax > .4 ? C.sideM : C.side;
    for (let j = 0; j < QD_T; j++) {
      const py = top + j; if (py < 0 || py >= QD_BH) continue;
      B[py * QD_BW + E.px[k]] = j === QD_T - 1 ? C.out : j === 0 ? c0 : j === 1 ? c1 : c2;
    }
  }
}
// a torre inteira: eixo e discos, de baixo para cima
function qdPintaTorre(g, tt, rot, th) {
  const B = QD_BUF; B.fill(0);
  const pc = [QD_C.out, qdU(mixHex(th.pole, '#000000', .5)), qdU(th.pole), qdU(mixHex(th.pole, '#ffffff', .3)), qdU(mixHex(th.pole, th.luz, .7))];
  const pd = qdU(mixHex(th.pole, '#000000', .3)), col = [0, 1, 2, 2, 3, 4, 3, 2, 2, 1, 1, 0];
  for (let py = 0; py < QD_BH; py++) {
    const anel = ((Math.floor(py * 2 + g.camY) % 26) + 26) % 26 < 2;
    for (let k = 0; k < col.length; k++) B[py * QD_BW + QD_CX - QD_POLE + k] = anel && col[k] > 1 ? pd : pc[col[k]];
  }
  const vis = [];
  for (let i = g.next; i < g.discs.length; i++) {
    const d = g.discs[i]; if (d.gone) continue;
    const cy = Math.round((d.y - g.camY) / 2); if (cy > QD_BH + 30) break; if (cy < -30) continue;
    vis.push([d, cy]);
  }
  for (let k = vis.length - 1; k >= 0; k--) { const [d, cy] = vis[k]; qdPintaDisco(d, cy, rot + qdAng(d, tt), tt, g.dead && d.i === g.next); }
  QD_CTX.putImageData(QD_IMG, 0, 0);
}
const qdJogo = {
  id: 'disco', name: 'Queda do Disco', tag: 'Queda · torre de discos', unit: 'andares', ia: 27, bestKey: '.v1',
  desc: 'Gire a torre de discos e desça pelos buracos.',
  how: 'Gire a torre para o IAmiguinho cair pelos buracos e nunca pise na parte arranhada, a vermelha. Caindo 3 andares seguidos sem tocar em nada, o turbo quebra o próximo disco inteiro.',
  ctl: [['← →', 'girar a torre', 'pc'], ['A D', 'girar a torre', 'pc'], ['Analógico / LB RB', 'girar a torre', 'pc'], ['Arrastar', 'na horizontal: girar a torre', 'touch']],
  pad: null,
  rank: [['@rafa', 104], ['@duda', 86], ['@carol', 63], ['@bia', 41]],
  nota: 'o disco veio arranhado de fábrica',
  falas: [
    'Esses discos são todos originais. As capas eu desenhei, mas os discos são originais kkkk',
    'Parte arranhada não se pisa. Igual disco emprestado de primo: devolve do jeito que veio.',
    'Eu desço quicando porque escada é coisa de quem não tem estilo.',
    'Três andares em queda livre e eu viro um meteoro de boné. A física pediu demissão hahaha',
    'Você gira a torre, eu quico com elegância. Divisão justa de tarefas.',
  ],
  init() {
    Object.assign(this, {
      t: 0, score: 0, fase: 1, next: 0, rot: 0, w: 0, face: 1, dragX: null, combo: 0, turbo: false, turbos: 0, dead: false, deadT: 0, ouroT: 0,
      camY: -QD_CAMY, camT: -QD_CAMY, ball: { y: -46, vy: 0 }, discs: [], fx: [], pops: [], placa: { t: 0, f: 1 }, isDemo: false, temaA: 1, temaK: 1,
    });
    this.gerar();
  },
  demo() {
    this.isDemo = true; this.rot = .4;
    const d = this.discs[1]; d.sec = [0, 0, 1, 1, 0, 0, 0, 2, 2, 0, 0, 0];
  },
  gerar() { while (this.discs.length < this.next + 9) this.discs.push(qdNovoDisco(this.discs.length, this.discs[this.discs.length - 1])); },
  locBola(d) { return qdMod(Math.PI / 2 - this.rot - qdAng(d, this.t)); },
  setor(d) { return (this.locBola(d) / QD_SEC) | 0; },
  pop(txt, c, big) {
    for (const p of this.pops) p.t = Math.max(p.t, .55); // o texto novo empurra o antigo para sumir
    const fy = Math.round(this.ball.y - this.camY + QD_FRONT);
    this.pops.push({ txt, c, t: 0, x: big ? 160 : 206, y: clamp(big ? fy - 62 : fy - 30, 70, 260), big });
  },
  cacos(d, n, cor) {
    for (let k = 0; k < n; k++) {
      const a = rand(0, QD_TAU), r = rand(QD_HUB + 4, QD_R - 2) * 2, s = (qdMod(a - this.rot - qdAng(d, this.t)) / QD_SEC) | 0, typ = d.sec[s];
      if (typ === 1 && !cor) continue;
      const c = cor || (typ === 2 ? pick(['#e8443a', '#8a1f1a']) : typ === 3 ? pick(['#ffd04a', '#fff1b8']) : pick([d.cols.hex, mixHex(d.cols.hex, '#ffffff', .35), '#c9d3de']));
      this.fx.push({ x: 160 + Math.cos(a) * r, y: d.y + Math.sin(a) * r * QD_K, vx: Math.cos(a) * rand(50, 170), vy: Math.sin(a) * rand(10, 60) - rand(110, 230), c, t: 0, life: rand(.6, 1), s: Math.random() < .5 ? 4 : 2 });
    }
  },
  // o disco de baixo sai da torre (passou pelo buraco, quebrou no turbo ou era o de ouro)
  passa(d, como) {
    d.gone = true; this.next = d.i + 1;
    this.cacos(d, como === 'buraco' ? 18 : 34);
    if (como === 'turbo') {
      this.score += 2; this.combo = 0; this.turbo = false; this.turbos++; this.ball.vy *= .55; shake = .22;
      this.pop('+2 TURBO', '#ffd04a', true); beep(120, .25, 'sawtooth', .06, -60); sfx.coin();
    } else if (como === 'buraco') {
      this.score += 1; this.combo++;
      if (this.combo >= 3 && !this.turbo) { this.turbo = true; this.pop('TURBO!', '#ff9a4a', true); sfx.big(); }
      else { this.pop(this.combo >= 2 ? `x${this.combo}` : '+1', this.combo >= 2 ? '#7fdcff' : '#ffffff'); beep(520 + this.combo * 130, .07, 'square', .035); }
    } else { this.score += 1; this.combo = 0; beep(880, .1, 'triangle', .05, 300); }
    if (d.ouro) {
      this.temaA = this.fase; this.temaK = 0; this.fase = qdFaseDe(this.next); this.placa = { t: 0, f: this.fase }; this.ouroT = 0;
      Music.jingle(JINGLE.comeco); shake = .2;
    }
    this.gerar();
  },
  update(dt) {
    this.t += dt; this.temaK = Math.min(1, this.temaK + dt * .8);
    for (const f of this.fx) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 620 * dt; }
    this.fx = this.fx.filter((f) => f.t < f.life);
    for (const p of this.pops) p.t += dt; this.pops = this.pops.filter((p) => p.t < .9);
    if (this.placa) { this.placa.t += dt; if (this.placa.t > 2.6) this.placa = null; }
    if (this.dead) { this.deadT += dt; return this.deadT > 1.5; }
    // girar a torre
    let ax = inp.ax; if (isHeld('PadLB')) ax -= 1; if (isHeld('PadRB')) ax += 1; ax = clamp(ax, -1, 1);
    this.w += (ax * QD_GIRO - this.w) * Math.min(1, dt * 16); this.rot -= this.w * dt;
    if (Math.abs(ax) > .2) this.face = Math.sign(ax);
    if (inp.drag) {
      if (this.dragX == null) this.dragX = inp.drag.x;
      const dx = inp.drag.x - this.dragX; this.rot -= dx * QD_DRAG; this.dragX = inp.drag.x; if (Math.abs(dx) > .3) this.face = Math.sign(dx);
    } else this.dragX = null;
    // disco de ouro: quebra sozinho depois de um instante
    if (this.ouroT > 0) { this.ouroT -= dt; if (this.ouroT <= 0) this.passa(this.discs[this.next], 'ouro'); }
    // queda e quique
    const b = this.ball; b.vy = Math.min(QD_VMAX, b.vy + QD_G * dt); b.y += b.vy * dt;
    for (let guard = 0; guard < 4; guard++) {
      const d = this.discs[this.next]; if (!d || b.vy <= 0 || b.y < d.y) break;
      const typ = d.sec[this.setor(d)];
      if (typ === 1) { this.passa(d, 'buraco'); continue; }
      if (this.turbo) { this.passa(d, 'turbo'); continue; }
      b.y = d.y;
      if (typ === 2) { this.dead = true; this.deadT = 0; b.vy = 0; sfx.hit(); shake = .3; this.cacos(d, 10, '#e8443a'); this.pop('ARRANHOU!', '#ff8a8a', true); break; }
      b.vy = -QD_V0; this.combo = 0;
      beep(rand(250, 290), .08, 'triangle', .05, 200);
      // mancha de tinta azul onde ele quicou (gira junto com o disco)
      const L = this.locBola(d), sx = QD_RB * Math.cos(L), sz = QD_RB * Math.sin(L), cb = qdU('#2e6fd8'), cl = qdU('#7fdcff');
      d.spl.push([sx, sz, 12, cb], [sx + .5, sz - .5, 2.5, cl]);
      for (let k = 0; k < 3; k++) { const a = rand(0, QD_TAU), rr = rand(4.5, 6.5); d.spl.push([sx + Math.cos(a) * rr, sz + Math.sin(a) * rr, 1.6, cb]); }
      if (d.spl.length > 25) d.spl.splice(0, 5);
      for (let k = 0; k < 5; k++) this.fx.push({ x: 160 + rand(-8, 8), y: d.y + QD_FRONT, vx: rand(-70, 70), vy: rand(-110, -50), c: pick(['#2e6fd8', '#7fdcff', '#f6f7f9']), t: 0, life: rand(.25, .45), s: 2 });
      if (typ === 3 && !d.ouroOk) { d.ouroOk = true; this.ouroT = .75; this.pop('DISCO DE OURO!', '#ffd04a', true); sfx.big(); }
      break;
    }
    // câmera só desce
    this.camT = Math.max(this.camT, b.y - QD_CAMY); this.camY += (this.camT - this.camY) * Math.min(1, dt * 12);
    this.camY = Math.max(this.camY, b.y - QD_CAMY - 50); // caindo rápido, o IAmiguinho nunca some lá embaixo
    return false;
  },
  fundo(t, th) {
    let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.bg0); g.addColorStop(1, th.bg1); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(160, 190, 10, 160, 190, 190); g.addColorStop(0, qdRgba(th.luz, .16)); g.addColorStop(1, qdRgba(th.luz, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // fachos de luz
    ctx.fillStyle = qdRgba(th.luz, .045);
    for (let i = 0; i < 3; i++) { const x = 40 + i * 120 + Math.sin(t * .4 + i * 2) * 30; ctx.beginPath(); ctx.moveTo(x - 8, 0); ctx.lineTo(x + 8, 0); ctx.lineTo(x + 60, H); ctx.lineTo(x - 60, H); ctx.closePath(); ctx.fill(); }
    // pontinhos de luz ao fundo
    const cam = this.camY || 0;
    for (let i = 0; i < 26; i++) {
      const x = (i * 83 + 17) % W, y = Math.round((((i * 59 + 23) - cam * .2) % H + H) % H);
      ctx.fillStyle = qdRgba(th.luz, (i + Math.floor(t * 2)) % 5 ? .22 : .5); ctx.fillRect(x & ~1, y & ~1, 2, 2);
    }
    // estantes com caixinhas de jogo nas laterais
    const par = cam * .45, off = ((par % 60) + 60) % 60;
    for (let y = -off - 60, n = 0; y < H + 60; y += 60, n++) {
      const row = Math.floor((y + par) / 60 + .5);
      for (const side of [0, 1]) {
        const x0 = side ? W - 40 : 0;
        ctx.fillStyle = '#0c0f17'; ctx.fillRect(x0, Math.round(y) + 52, 40, 5);
        ctx.fillStyle = qdRgba(th.luz, .18); ctx.fillRect(x0, Math.round(y) + 52, 40, 1);
        for (let k = 0; k < 6; k++) {
          const hsh = Math.abs(row * 31 + k * 17 + side * 7), h = 30 + (hsh % 4) * 4, x = x0 + 2 + k * 6;
          ctx.fillStyle = QD_LOMBADA[hsh % QD_LOMBADA.length]; ctx.fillRect(x, Math.round(y) + 52 - h, 5, h);
          ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x + 1, Math.round(y) + 52 - h + 4, 3, 2);
        }
      }
    }
  },
  temaAgora() {
    const a = qdTema(this.temaA || 1), b = qdTema(this.fase), k = this.temaK;
    if (k >= 1) return b;
    return { nome: b.nome, bg0: mixHex(a.bg0, b.bg0, k), bg1: mixHex(a.bg1, b.bg1, k), luz: mixHex(a.luz, b.luz, k), pole: mixHex(a.pole, b.pole, k) };
  },
  draw(t = this.t) {
    const menu = state === 'menu' || this.isDemo, tt = menu ? t : this.t, th = this.temaAgora();
    const rot = this.rot + (menu ? t * .35 : 0);
    let by = this.ball.y;
    if (menu) { const P = 2 * QD_V0 / QD_G, p = t % P; by = this.discs[0].y - (QD_V0 * p - QD_G * p * p / 2); }
    this.fundo(t, th);
    qdPintaTorre(this, tt, rot, th);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(QD_CV, 0, 0, W, H);
    // cacos voando
    for (const f of this.fx) { ctx.globalAlpha = clamp((f.life - f.t) * 3, 0, 1); ctx.fillStyle = f.c; ctx.fillRect(Math.round(f.x / 2) * 2, Math.round((f.y - this.camY) / 2) * 2, f.s, f.s); }
    ctx.globalAlpha = 1;
    // sombra no disco de baixo
    const d = this.discs[this.next];
    const feet = Math.round(by - this.camY + QD_FRONT), x = 146;
    if (d && !d.gone) {
      const sy = 2 * Math.round((d.y - this.camY) / 2) + QD_FRONT, h = Math.max(0, d.y - by);
      const s = (qdMod(Math.PI / 2 - rot - qdAng(d, tt)) / QD_SEC) | 0;
      if (d.sec[s] !== 1 && h < 140) { const w = Math.max(6, 20 - Math.round(h / 6)) & ~1; ctx.fillStyle = 'rgba(4,6,10,.45)'; ctx.fillRect(160 - w / 2, sy - 2, w, 4); }
    }
    // turbo: rastro de fogo e linhas de velocidade
    const caindo = !menu && this.ball.vy > 280 && !this.dead;
    if (caindo) {
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      for (let k = 0; k < 4; k++) { const yy = ((k * 47 + Math.floor(t * 600)) % 90); ctx.fillRect(k % 2 ? 132 : 186, feet - 30 - yy, 2, 14); }
    }
    if (this.turbo) {
      const cs = ['#ffffff', '#ffd04a', '#ff9a4a', '#e8443a', '#8a1f1a'];
      for (let j = 0; j < 5; j++) {
        const w = 26 - j * 4 + (Math.floor(t * 30 + j) % 2) * 2, yy = feet - 36 - j * 6;
        ctx.globalAlpha = .9 - j * .14; ctx.fillStyle = cs[j]; ctx.fillRect(160 - w / 2, yy, w, 6);
      }
      ctx.globalAlpha = 1;
    }
    // o IAmiguinho, com contorno para aparecer em cima de qualquer rótulo
    const rows = this.dead ? IA_DIZZY : (t % 3.2 < .12 ? IA_BLINK : IA), fl = this.face < 0;
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) spr(rows, x + ox, feet - 32 + oy, 2, fl, INK);
    drawIA(x, feet - 32, 2, t, { flip: fl, fast: this.turbo, dizzy: this.dead });
    if (this.dead) for (let k = 0; k < 3; k++) { const a = t * 5 + k * 2.1; ctx.fillStyle = '#ffd04a'; ctx.fillRect(Math.round(160 + Math.cos(a) * 14) & ~1, Math.round(feet - 38 + Math.sin(a) * 4) & ~1, 2, 2); }
    // textos que sobem
    ctx.textAlign = 'center';
    for (const p of this.pops) {
      const yy = Math.round(p.y - p.t * 30); ctx.globalAlpha = clamp((.9 - p.t) * 3, 0, 1);
      ctx.font = p.big ? '900 18px Archivo, sans-serif' : '800 14px Archivo, sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = '#07050c';
      ctx.strokeText(p.txt, p.x, yy); ctx.fillStyle = p.c; ctx.fillText(p.txt, p.x, yy);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
    // placa de fase
    if (state === 'play' && this.placa && !this.dead) {
      const f = this.placa.f, T = qdTema(f), lines = [[`FASE ${f}`, F_BIG, T.luz], [T.nome.toUpperCase(), F_MID, '#ffffff']];
      if (f > 1) lines.push([`Novo: ${QD_NOVO[f] || 'ainda mais rápido'}`, F_SM, '#ffd2a8']);
      ctx.globalAlpha = clamp(Math.min(this.placa.t * 6, (2.6 - this.placa.t) * 3), 0, 1); banner(lines, 296); ctx.globalAlpha = 1;
    }
  },
  hud() {
    const n = this.fase * QD_POR - this.next;
    return [`Fase ${this.fase}`, this.score, this.turbo ? 'TURBO!' : this.combo >= 2 ? `queda x${this.combo}` : n <= 0 ? 'disco de ouro!' : `fase ${this.fase + 1} em ${n}`];
  },
  overText() { const T = qdTema(this.fase); return `Parou na fase ${this.fase}, ${T.nome}. Turbos: ${this.turbos} (cada um vale 1 andar extra).`; },
};
ARCADE_NOVOS.push(qdJogo);
