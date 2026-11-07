/* ============================================================ jogo: Ladeira do Rolimã */
// O IAmiguinho desce e sobe as ladeiras do bairro à noite num carrinho de rolimã com motorzinho de bateria.
// Física: tábua (corpo rígido) com duas rodinhas presas por molas simples, sobre um chão gerado aos poucos (curvas suaves).
// Acelerar empurra as rodinhas que estão no chão; no ar, acelerar empina (gira para trás) e frear abaixa o bico (gira para a frente).
// Fim: a cabeça do IAmiguinho bate no chão (capotou), o carrinho cai num buraco da obra, ou a bateria zera e o carrinho para.
// Trechos de 300 m que se repetem cada vez mais íngremes: bairro (lombadas), morro de terra (cristas e chão irregular), obra (rampas e buracos).
// Placar: metros + 3 m por ficha + 20 m por mortal no ar. Se o carrinho ficar parado no mesmo lugar por 8 s, atolou.
// Controles: PC → / ← (ou D / A, Espaço acelera) · controle RT / LT, ✕/A acelera, □/X freia, analógico · celular botões na tela ou tocar nas metades da tela.
Music.define('ladeira', {
  bpm: 138,
  lead: bars('D5 . F#5 A5 . F#5 D5 . E5 - . F#5 G5 - F#5 .', 'E5 . G5 B5 . G5 E5 . F#5 - . E5 D5 - - .', 'A5 - . A5 B5 . A5 F#5 G5 - . F#5 E5 . D5 .', 'C#5 - E5 - A5 - - . G5 . F#5 . E5 - - .'),
  arp: bars(x4('D5 F#5 A5 F#5'), x4('E5 G5 B5 G5'), x4('G4 B4 D5 B4'), x4('A4 C#5 E5 C#5')),
  bass: bars('D2 . D3 . . D2 A2 . D2 . D3 . A2 . F#2 .', 'E2 . E3 . . E2 B2 . E2 . E3 . B2 . G2 .', 'G2 . G3 . . G2 D3 . G2 . G3 . D3 . B2 .', 'A2 . A3 . . A2 E3 . A2 . A3 . E3 . C#3 .'),
  drums: 'k . h k s . h . k . h k s . h h',
  mix: { arp: .5, lead: .9 },
});
// mundo: 16 px = 1 metro; trechos de 300 m; o chão é guardado em amostras a cada 4 px
const LD_PXM = 16, LD_SEC = 300 * LD_PXM, LD_DX = 4, LD_X0 = -200, LD_XW = -150;
const LD_TIPOS = ['bairro', 'morro', 'obra'];
const LD_NOMES = { bairro: 'Bairro', morro: 'Morro de terra', obra: 'Obra' };
const LD_CHAO = {
  bairro: { top: '#aab3c0', band: '#2f3542', base: '#151925', dot: '#1f2433', bw: 5 },
  morro: { top: '#5fb552', band: '#3f8a3e', base: '#2e1f15', dot: '#4a3322', bw: 2 },
  obra: { top: '#c3c9cf', band: '#6c727e', base: '#25282f', dot: '#33363f', bw: 4 },
};
// física (px, segundos)
const LD_G = 430, LD_MC = 1, LD_I = 330, LD_MW = .3, LD_KS = 55, LD_CS = 6, LD_KT = 500, LD_CT = 18;
const LD_ACC = 330, LD_VMAX = 330, LD_BRK = 520, LD_VREV = 110, LD_DRAG = .0005, LD_AIR = 13, LD_OMAX = 7.5, LD_R = 5;
const LD_ANC = [[-16, 10], [16, 10]]; // onde as rodinhas ficam presas na tábua
const LD_PTS = [[-23, 1, 2], [22, 1, 2]]; // pontas da tábua
const LD_HEAD = [-3, -19, 8]; // cabeça/visor do IAmiguinho
const LD_GASTO = 4.6; // bateria por segundo acelerando
const LD_FICHA_M = 3; // metros de bônus por ficha
// sprites
const LD_RODA = ['...KKKK...', '.KKSSSSKK.', '.KSWWWWSK.', 'KSWhhhhWSK', 'KSWhkkhWSK', 'KSWhkkhWSK', 'KSWhhhhWSK', '.KSWWWWSK.', '.KKSSSSKK.', '...KKKK...'];
const LD_RODA_PAL = { K: '#07050c', S: '#6b7685', W: '#c3ccd6', h: '#3a4252', k: '#151a22' };
const LD_PILHA = ['..kk..', '.kXXk.', 'kGGGGk', 'kGWGGk', 'kGWGGk', 'kGGGGk', 'kkkkkk', 'kYYYYk', 'kYYYYk', 'kkkkkk'];
const LD_PILHA_PAL = { k: '#07050c', X: '#c3ccd6', G: '#43d17a', W: '#d8ffe4', Y: '#2a3040' };
const LD_FICHA = [
  ['..YYYY..', '.YyyyyY.', 'YyYYYYyY', 'YyYKKYyY', 'YyYKKYyY', 'YyYYYYyY', '.YyyyyY.', '..YYYY..'],
  ['.YYYY.', 'YyyyyY', 'YyYYyY', 'YyKKyY', 'YyKKyY', 'YyYYyY', 'YyyyyY', '.YYYY.'],
  ['.YY.', 'YyyY', 'YyyY', 'YyyY', 'YyyY', 'YyyY', 'YyyY', '.YY.'],
];
const LD_FICHA_PAL = { Y: '#ffd04a', y: '#c99a2a', K: '#07050c' };
const LD_LUZ = ['255,210,122', '255,122,184', '127,220,255'];
const LD_BOTS = [['#e86fa8', '#b24f80'], ['#43d17a', '#21864a'], ['#a77bff', '#6843bd'], ['#ff8a3d', '#b35416'], ['#7fdcff', '#2a74b0']];
const LD_FIM = { capotou: 'Capotou', buraco: 'Caiu num buraco', bateria: 'A bateria acabou', atolou: 'Atolou' };
// o carrinho é desenhado reto num quadro pequeno e depois girado inteiro (sem suavizar, pixels nítidos)
const LD_BUF = document.createElement('canvas'); LD_BUF.width = 64; LD_BUF.height = 64;
const LD_BCTX = LD_BUF.getContext('2d'); LD_BCTX.imageSmoothingEnabled = false;
const LD_OX = 32, LD_OY = 46; // centro da tábua dentro do quadro
const ldHash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function ldLine(x0, y0, x1, y1, c, w = 1) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  ctx.fillStyle = c; for (let k = 0; k <= n; k++) ctx.fillRect(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), w, w);
}
const ladeiraJogo = {
  id: 'ladeira', name: 'Ladeira do Rolimã', tag: 'Física · bairro à noite', unit: 'metros', ia: 480, bestKey: '.v1',
  fmt: (s) => `${s} m`,
  desc: 'Suba e desça as ladeiras sem capotar o carrinho.',
  how: 'Acelere e freie para vencer as ladeiras; no ar, acelerar empina e frear abaixa o bico. Se a cabeça do IAmiguinho bater no chão, acabou: pegue pilhas para a bateria e fichas para ganhar metros extras.',
  ctl: [['→', 'acelerar', 'pc'], ['←', 'frear e dar ré', 'pc'], ['RT / ✕', 'acelerar no controle', 'pc'], ['LT / □', 'frear no controle', 'pc'], ['Botões', 'frear e acelerar', 'touch'], ['Toque', 'metade direita acelera, esquerda freia', 'touch']],
  pad: [['◀ Freio', 'ArrowLeft'], ['Acelera ▶', 'ArrowRight']],
  rank: [['@carol', 1920], ['@duda', 1385], ['@rafa', 940], ['@bia', 615]],
  nota: 'o morro estava mais inclinado que no ensaio',
  falas: [
    'Carrinho de rolimã com bateria. Eu sou o piloto, o motor e o patrocinador.',
    'Freio é opcional. Eu nunca usei e olha onde eu cheguei kkkk',
    'Na obra tem buraco. Na obra sempre tem buraco. É praticamente a definição de obra.',
    'Dei um mortal no ar e a física pediu meu autógrafo.',
    'Capacete? Eu sou o capacete. hahaha',
  ],
  init() {
    Object.assign(this, {
      t: 0, score: 0, dist: 0, fichas: 0, mortais: 0, bonus: 0, bat: 100, mode: 'play', wait: 0, motivo: '', crashed: false,
      th: [0], gx: LD_X0, alt: 0, lastDir: 1, holes: [], hz: [], lastHole: -1e9, items: [], nextPilha: 110 * LD_PXM, nextFicha: 150,
      fx: [], aviso: null, sec: 0, stuckX: 0, stuckT: 0, fall: null, airT: 0, airRot: 0, thud: 0, stallT: 0, tipT: 0, rat: 0, warnT: 0, gas: false, brake: false, touch: false,
    });
    this.gen(1400);
    const y0 = this.surf(0);
    Object.assign(this, { cx: 0, cy: y0 - 13, vx: 0, vy: 0, a: 0, om: 0 });
    this.wh = LD_ANC.map(([lx, ly]) => ({ lx, ly, x: lx, y: y0 - 13 + ly - 4, vx: 0, vy: 0, spin: 0, on: true }));
    this.nearHoles();
    for (let k = 0; k < 150; k++) this.step(1 / 240, false, false);
    this.vx = this.vy = this.om = 0; for (const w of this.wh) w.vx = w.vy = 0;
    this.camX = this.cx - 110; this.camY = this.cy - 225; this.camY0 = this.camY;
  },
  // miniatura: o carrinho dando um pulinho, empinado
  demo() {
    this.bat = 72; this.cy -= 16; this.a = -.28;
    const c = Math.cos(this.a), s = Math.sin(this.a);
    for (const w of this.wh) { w.x = this.cx + w.lx * c - (w.ly - 2) * s; w.y = this.cy + w.lx * s + (w.ly - 2) * c; }
  },
  /* ---------------- chão */
  secAt(x) { return Math.max(0, Math.floor(x / LD_SEC)); },
  tipoAt(x) { return LD_TIPOS[this.secAt(x) % 3]; },
  surf(x) {
    let i = (x - LD_X0) / LD_DX; if (i < 0) i = 0;
    const i0 = Math.floor(i); if (i0 + 1 >= this.th.length) this.gen(x + 800);
    const f = i - i0; return this.th[i0] * (1 - f) + this.th[i0 + 1] * f;
  },
  holeAt(x, m = 0) { for (let k = this.holes.length - 1; k >= 0; k--) { const h = this.holes[k]; if (x > h.a - m && x < h.b + m) return h; if (h.b < x - 600) break; } return null; },
  // escreve um pedaço de chão: f(u, altura inicial) → altura (para cima é positivo)
  put(len, f) {
    const n = Math.max(1, Math.round(len / LD_DX)), a0 = this.alt;
    for (let k = 1; k <= n; k++) this.th.push(-f(k / n, a0));
    this.gx += n * LD_DX; this.alt = -this.th[this.th.length - 1];
  },
  flat(len) { this.put(len, (u, a) => a); },
  pickDir() { if (this.alt > 230) return -1; if (this.alt < -230) return 1; return Math.random() < .68 ? -this.lastDir : this.lastDir; },
  gen(toX) {
    while (this.gx < toX) this.feature();
    // pilhas e fichas: só onde o chão já existe com folga (assim sabemos onde ficam os buracos)
    const lim = this.gx - 300;
    while (this.nextPilha < lim) {
      let x = this.nextPilha; const h = this.holeAt(x, 40); if (h) x = h.b + 60;
      if (x >= lim) break;
      this.items.push({ k: 'pilha', x, y: this.surf(x) - 16 });
      this.nextPilha = x + Math.min(290, 150 + this.secAt(x) * 22) * LD_PXM;
    }
    while (this.nextFicha < lim) {
      const x0 = this.nextFicha, n = Math.random() < .5 ? 4 : 5, w = (n - 1) * 18;
      let h = null; for (let x = x0 - 20; x <= x0 + w + 20; x += 8) { h = this.holeAt(x); if (h) break; }
      if (h) { // arco por cima do buraco
        const top = Math.min(h.ya, h.yb), a = h.a - 14, b = h.b + 14;
        for (let k = 0; k < 5; k++) { const u = k / 4; this.items.push({ k: 'ficha', x: a + (b - a) * u, y: top - 22 - 26 * Math.sin(Math.PI * u) }); }
        this.nextFicha = b + rand(50, 100) * LD_PXM;
      } else {
        for (let k = 0; k < n; k++) { const x = x0 + k * 18; this.items.push({ k: 'ficha', x, y: this.surf(x) - 13 }); }
        this.nextFicha = x0 + w + rand(50, 100) * LD_PXM;
      }
    }
  },
  feature() {
    const x = this.gx;
    if (x < 300) { this.flat(300 - x); return; }
    const sec = this.secAt(x + 2), tipo = LD_TIPOS[sec % 3];
    const maxS = Math.min(.95, (.36 + sec * .1) * (tipo === 'bairro' ? .85 : tipo === 'morro' ? 1.05 : .9));
    const big = Math.min(160, 40 + sec * 13), dir = this.pickDir(), r = Math.random();
    const hill = (d, ext = 1, bump = 0) => {
      const len = Math.max(64, Math.abs(d) * Math.PI / (2 * maxS) * rand(1, 1.35) * ext), k = Math.max(1, Math.round(len / 70));
      this.put(len, (u, a) => a + d * (1 - Math.cos(Math.PI * u)) / 2 + bump * Math.sin(2 * Math.PI * k * u));
      this.lastDir = Math.sign(d) || 1;
    };
    if (tipo === 'bairro') {
      if (r < .2) { this.flat(rand(40, 90)); this.put(40, (u, a) => a + 6 * Math.sin(Math.PI * u) ** 2); } // lombada
      else if (r < .3) this.flat(rand(50, 110));
      else hill(dir * rand(.4, 1) * big);
    } else if (tipo === 'morro') {
      if (r < .22) { const d = rand(.6, 1) * big * .75; hill(d, .85, 1.5); hill(-d * rand(.8, 1.2), .85, 1.5); } // crista: dá para voar
      else hill(dir * rand(.5, 1.1) * big, 1, rand(.8, 2));
    } else {
      if (r < .4 && x - this.lastHole > 300) this.rampHole(sec);
      else if (r < .58 && x - this.lastHole > 200) this.smallHole(sec);
      else if (r < .72) this.flat(rand(40, 100));
      else hill(dir * rand(.4, .9) * big);
    }
  },
  // descida para pegar embalo, rampa e buraco largo
  rampHole(sec) {
    const dd = rand(26, 46); this.put(dd * Math.PI / 1, (u, a) => a - dd * (1 - Math.cos(Math.PI * u)) / 2);
    this.flat(rand(30, 60));
    const hh = rand(14, 20) + Math.min(8, sec), L = 2 * hh / .6;
    this.put(L, (u, a) => a + hh * u * u);
    const w = Math.min(112, rand(44, 58) + sec * 6), drop = rand(6, 22), a0 = this.gx, ya = -this.alt;
    this.put(w, (u, a) => a - drop * u);
    this.holes.push({ a: a0, b: this.gx, ya, yb: -this.alt });
    this.lastHole = this.gx;
    this.flat(16);
    const dn = rand(10, 24); this.put(dn * Math.PI / .7, (u, a) => a - dn * (1 - Math.cos(Math.PI * u)) / 2);
    this.lastDir = -1;
  },
  // vala da obra: um rasgo raso no chão que sacode as rodinhas
  smallHole(sec) {
    this.flat(rand(40, 70));
    const w = rand(26, 34) + Math.min(10, sec * 1.2), dep = rand(9, 13);
    this.put(w, (u, a) => a - dep * Math.min(1, Math.sin(Math.PI * u) * 1.7));
    this.lastHole = this.gx;
    this.flat(rand(40, 70));
  },
  nearHoles() { const x = this.cx; this.hz = this.holes.filter((h) => h.b > x - 400 && h.a < x + 400); },
  // contato de um círculo com o mundo: devolve a normal (para fora do chão) e quanto entrou, ou null
  contact(cx, cy, r) {
    let best = null;
    const take = (nx, ny, pen) => { if (pen > 0 && (!best || pen > best.pen)) best = { nx, ny, pen }; };
    if (cx - r < LD_XW) take(1, 0, LD_XW - (cx - r));
    let over = false;
    for (const h of this.hz) {
      if (cx + r < h.a || cx - r > h.b) continue;
      if (cx > h.a && cx < h.b) over = true;
      if (cx > h.a) { // beirada de cá
        if (cy <= h.ya) { const dx = cx - h.a, dy = cy - h.ya, d = Math.hypot(dx, dy); if (d < r && d > 1e-4) take(dx / d, dy / d, r - d); }
        else if (cx - h.a < r) take(1, 0, r - (cx - h.a));
      }
      if (cx < h.b) { // beirada de lá
        if (cy <= h.yb) { const dx = cx - h.b, dy = cy - h.yb, d = Math.hypot(dx, dy); if (d < r && d > 1e-4) take(dx / d, dy / d, r - d); }
        else if (h.b - cx < r) take(-1, 0, r - (h.b - cx));
      }
    }
    if (!over) {
      const gy = this.surf(cx), s = (this.surf(cx + 2) - this.surf(cx - 2)) / 4, nr = Math.hypot(1, s);
      take(s / nr, -1 / nr, r - (gy - cy) / nr);
    }
    return best;
  },
  /* ---------------- física: um passo pequeno */
  step(h, gas, brake) {
    const bat = this.bat > 0;
    // gravidade e ar
    this.vy += LD_G * h;
    const sp = Math.hypot(this.vx, this.vy); this.vx -= this.vx * sp * LD_DRAG * h; this.vy -= this.vy * sp * LD_DRAG * h;
    const air = this.airT > .06;
    if (!this.crashed && bat) {
      if (air) { if (gas) this.om -= LD_AIR * h; else if (brake) this.om += LD_AIR * h; }
      else if (gas) this.om -= 2.2 * h;
    }
    if (air) this.om *= 1 - .25 * h;
    this.om = clamp(this.om, -LD_OMAX, LD_OMAX);
    // molas das rodinhas
    let c = Math.cos(this.a), s = Math.sin(this.a);
    for (const w of this.wh) {
      w.vy += LD_G * h;
      const rx = w.lx * c - w.ly * s, ry = w.lx * s + w.ly * c;
      const ex = this.cx + rx - w.x, ey = this.cy + ry - w.y, evx = this.vx - this.om * ry - w.vx, evy = this.vy + this.om * rx - w.vy;
      const Fd = LD_KS * (ex * -s + ey * c) + LD_CS * (evx * -s + evy * c), Ff = LD_KT * (ex * c + ey * s) + LD_CT * (evx * c + evy * s);
      const Fx = -s * Fd + c * Ff, Fy = c * Fd + s * Ff;
      w.vx += Fx / LD_MW * h; w.vy += Fy / LD_MW * h;
      this.vx -= Fx / LD_MC * h; this.vy -= Fy / LD_MC * h; this.om -= (rx * Fy - ry * Fx) / LD_I * h;
    }
    // anda
    this.cx += this.vx * h; this.cy += this.vy * h; this.a += this.om * h;
    for (const w of this.wh) { w.x += w.vx * h; w.y += w.vy * h; }
    c = Math.cos(this.a); s = Math.sin(this.a);
    const dX = -s, dY = c;
    // batente da suspensão
    for (const w of this.wh) {
      const rx = w.lx * c - w.ly * s, ry = w.lx * s + w.ly * c;
      const ed = (this.cx + rx - w.x) * dX + (this.cy + ry - w.y) * dY, lim = ed > 7 ? ed - 7 : ed < -6 ? ed + 6 : 0;
      if (!lim) continue;
      this.cx -= dX * lim * .7; this.cy -= dY * lim * .7; w.x += dX * lim * .3; w.y += dY * lim * .3;
      const vrel = (this.vx - this.om * ry - w.vx) * dX + (this.vy + this.om * rx - w.vy) * dY;
      if (lim * vrel > 0) {
        const rd = rx * dY - ry * dX, j = vrel / (1 / LD_MW + 1 / LD_MC + rd * rd / LD_I);
        w.vx += dX * j / LD_MW; w.vy += dY * j / LD_MW; this.vx -= dX * j / LD_MC; this.vy -= dY * j / LD_MC; this.om -= rd * j / LD_I;
      }
    }
    // rodinhas no chão: empurra para fora, tira a velocidade para dentro, tração
    let ground = 0;
    const F = (LD_MC + 2 * LD_MW) / 2 / LD_MW * h;
    for (const w of this.wh) {
      w.on = false;
      const k = this.contact(w.x, w.y, LD_R);
      if (!k) { w.spin += (w.sv || 0) * h; continue; }
      w.x += k.nx * k.pen; w.y += k.ny * k.pen;
      const vn = w.vx * k.nx + w.vy * k.ny;
      if (vn < 0) { if (vn < -150) this.thud = Math.max(this.thud, -vn); w.vx -= k.nx * vn * 1.05; w.vy -= k.ny * vn * 1.05; }
      if (k.ny > -.45) continue; // parede: sem tração
      w.on = true; ground++;
      const tx = -k.ny, ty = k.nx, vt = w.vx * tx + w.vy * ty;
      let dv = 0;
      if (gas && bat) dv = LD_ACC * clamp(1 - vt / LD_VMAX, 0, 1) * F;
      else if (brake) { if (vt > 6) dv = -Math.min(vt, LD_BRK * F); else if (bat && vt > -LD_VREV) dv = -LD_ACC * .5 * F; }
      else dv = -Math.sign(vt) * Math.min(Math.abs(vt), 12 * h);
      w.vx += tx * dv; w.vy += ty * dv;
      w.sv = vt / LD_R; w.spin += w.sv * h;
    }
    // pontas da tábua (e a cabeça, depois de capotar) batem no chão como corpo rígido
    let touch = false;
    const pts = this.crashed ? [...LD_PTS, LD_HEAD] : LD_PTS;
    for (const [lx, ly, rr] of pts) {
      const rx = lx * c - ly * s, ry = lx * s + ly * c, k = this.contact(this.cx + rx, this.cy + ry, rr);
      if (!k) continue;
      touch = true;
      this.cx += k.nx * k.pen; this.cy += k.ny * k.pen;
      const pvx = this.vx - this.om * ry, pvy = this.vy + this.om * rx, vn = pvx * k.nx + pvy * k.ny;
      if (vn >= 0) continue;
      const rn = rx * k.ny - ry * k.nx, j = -1.1 * vn / (1 / LD_MC + rn * rn / LD_I);
      this.vx += k.nx * j / LD_MC; this.vy += k.ny * j / LD_MC; this.om += rn * j / LD_I;
      const tx = -k.ny, ty = k.nx, vt = pvx * tx + pvy * ty, rt = rx * ty - ry * tx;
      const jt = clamp(-vt / (1 / LD_MC + rt * rt / LD_I), -.5 * j, .5 * j);
      this.vx += tx * jt / LD_MC; this.vy += ty * jt / LD_MC; this.om += rt * jt / LD_I;
      if (vn < -150) this.thud = Math.max(this.thud, -vn);
    }
    // a cabeça encostou no chão: capotou
    if (!this.crashed) {
      const [lx, ly, rr] = LD_HEAD, hx = this.cx + lx * c - ly * s, hy = this.cy + lx * s + ly * c;
      if (this.contact(hx, hy, rr)) this.crash();
    }
    this.touch = touch;
    if (ground || touch) { this.airT = 0; } else { this.airT += h; this.airRot += this.om * h; }
    return ground;
  },
  crash() {
    if (this.crashed) return;
    this.crashed = true; sfx.hit(); shake = .35;
    this.burst(this.cx, this.cy - 10, '#efe6d2', 10);
    if (this.mode !== 'fim') this.fim('capotou');
  },
  fim(m) { this.mode = 'fim'; this.motivo = m; this.wait = m === 'capotou' ? 1.6 : 1.5; if (m !== 'capotou') sfx.over(); },
  burst(x, y, c, n) { for (let i = 0; i < n; i++) { const a = rand(-3.1, 0), v = rand(30, 110); this.fx.push({ k: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c, t: 0, life: rand(.3, .6) }); } },
  txt(s, c) { this.fx.push({ k: 't', x: this.cx, y: this.cy - 40, vx: 0, vy: -24, s, c, t: 0, life: 1.2 }); },
  /* ---------------- partida */
  update(dt) {
    this.t += dt;
    for (const f of this.fx) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.k === 'p') f.vy += 300 * dt; }
    this.fx = this.fx.filter((f) => f.t < f.life);
    if (this.aviso) { this.aviso.t += dt; if (this.aviso.t > 2) this.aviso = null; }
    const fim = this.mode === 'fim';
    let gas = false, brake = false;
    if (!fim) {
      const d = inp.drag;
      gas = isHeld('ArrowRight', 'KeyD', 'ArrowUp', 'KeyW', 'Space', 'PadRT') || inp.rt > .25 || inp.ax > .4 || (!!d && d.x >= W / 2);
      brake = !gas && (isHeld('ArrowLeft', 'KeyA', 'ArrowDown', 'KeyS', 'PadLT', 'PadX') || inp.lt > .25 || inp.ax < -.4 || (!!d && d.x < W / 2));
    }
    this.gas = gas && this.bat > 0; this.brake = brake;
    if (!fim) this.bat = Math.max(0, this.bat - dt * (this.gas ? LD_GASTO : brake ? 1.6 : .5));
    // física em passos pequenos (nada atravessa o chão)
    this.gen(this.cx + 1200); this.nearHoles();
    const wasAir = this.airT > .25, n = Math.ceil(dt * 240), h = dt / n;
    let ground = 0;
    for (let k = 0; k < n; k++) ground = this.step(h, this.gas, brake);
    if (this.thud > 0) { if (this.thud > 200) { beep(90 + Math.min(60, this.thud / 10), .07, 'triangle', .06); this.burst(this.cx, this.cy + 14, '#8e969f', 4); } this.thud = 0; }
    // pousou: conta os mortais
    if ((ground || this.touch) && wasAir && !this.crashed) {
      const flips = Math.floor((Math.abs(this.airRot) + .7) / (Math.PI * 2));
      if (flips > 0) { this.mortais += flips; this.bonus += 20 * flips; this.txt(flips > 1 ? `MORTAL ${flips}x! +${20 * flips} m` : 'MORTAL! +20 m', '#7fdcff'); sfx.big(); }
    }
    if (ground || this.touch) this.airRot = 0;
    const speed = Math.hypot(this.vx, this.vy);
    // som das rodinhas de rolimã
    if (ground && !fim) { this.rat += speed * dt; if (this.rat > 44) { this.rat = 0; beep(rand(160, 230), .018, 'square', .012); } }
    // itens
    const c = Math.cos(this.a), s = Math.sin(this.a), hx = this.cx + LD_HEAD[0] * c - LD_HEAD[1] * s, hy = this.cy + LD_HEAD[0] * s + LD_HEAD[1] * c;
    if (!fim) for (const it of this.items) {
      if (it.got || Math.abs(it.x - this.cx) > 40) continue;
      if (Math.hypot(it.x - this.cx, it.y - this.cy) < 16 || Math.hypot(it.x - hx, it.y - hy) < 16) {
        it.got = true;
        if (it.k === 'ficha') { this.fichas++; sfx.coin(); }
        else { this.bat = 100; sfx.big(); this.txt('BATERIA CHEIA', '#8fd3ae'); this.burst(it.x, it.y, '#43d17a', 8); }
      }
    }
    this.items = this.items.filter((it) => !it.got && it.x > this.camX - 80);
    // distância, trecho novo
    this.dist = Math.max(this.dist, this.cx / LD_PXM);
    this.score = Math.floor(this.dist) + this.fichas * LD_FICHA_M + this.bonus;
    const sec = this.secAt(this.cx);
    if (sec > this.sec && !fim) { this.sec = sec; const tp = LD_TIPOS[sec % 3]; this.aviso = { s: LD_NOMES[tp].toUpperCase(), sub: sec >= 3 ? 'mais íngreme' : `${sec * 300} m`, t: 0 }; sfx.point(); }
    // bateria fraca
    if (!fim && this.bat < 20 && this.bat > 0) { this.warnT -= dt; if (this.warnT <= 0) { this.warnT = .6; beep(240, .06, 'square', .03); } }
    // fim de partida
    if (!fim) {
      for (const hl of this.hz) if (this.cx > hl.a && this.cx < hl.b && this.cy > Math.max(hl.ya, hl.yb) + 26) { this.fall = hl; this.fim('buraco'); shake = .25; break; }
      if (this.mode !== 'fim') {
        this.stallT = this.bat <= 0 && speed < 12 ? this.stallT + dt : 0;
        if (this.stallT > 1.2) this.fim('bateria');
        const aw = Math.atan2(Math.sin(this.a), Math.cos(this.a));
        this.tipT = Math.abs(aw) > 1.45 && speed < 25 ? this.tipT + dt : 0;
        if (this.tipT > 1.5) this.crash();
        if (Math.abs(this.cx - this.stuckX) > 10) { this.stuckX = this.cx; this.stuckT = 0; } else if ((this.stuckT += dt) > 8 && this.mode !== 'fim') this.fim('atolou');
      }
    } else this.wait -= dt;
    // câmera
    const look = clamp(this.vx * .25, -30, 70);
    this.camX += (this.cx - 110 + look - this.camX) * Math.min(1, dt * 4);
    this.camX = clamp(this.camX, this.cx - 200, this.cx - 60);
    let ty = this.cy - 225;
    if (this.fall) ty = Math.min(ty, Math.max(this.fall.ya, this.fall.yb) - 150);
    this.camY += (ty - this.camY) * Math.min(1, dt * 3.5);
    if (!this.fall) this.camY = clamp(this.camY, this.cy - 290, this.cy - 90);
    return this.mode === 'fim' && this.wait <= 0;
  },
  /* ---------------- desenho */
  // o carrinho reto: desenhado no canto da tela e copiado para o quadro pequeno
  paintCart(t) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 64, 64);
    const ox = LD_OX, oy = LD_OY, lean = this.gas ? -1 : this.brake ? 1 : 0;
    drawIA(ox - 17 + lean, oy - 32, 2, t, { dizzy: this.crashed, fast: this.gas });
    // corda de puxar a frente
    ldLine(ox + 3 + lean, oy - 6, ox + 17, oy - 1, '#d9c08a');
    // tábua
    ctx.fillStyle = '#07050c'; ctx.fillRect(ox - 24, oy - 2, 48, 6);
    ctx.fillStyle = '#b07a43'; ctx.fillRect(ox - 23, oy - 1, 46, 4);
    ctx.fillStyle = '#e0a868'; ctx.fillRect(ox - 23, oy - 1, 46, 1);
    ctx.fillStyle = '#7a4f2a'; ctx.fillRect(ox - 23, oy + 2, 46, 1); ctx.fillRect(ox - 9, oy, 1, 2); ctx.fillRect(ox + 8, oy, 1, 2);
    // eixos (blocos de madeira embaixo)
    for (const bx of [-19, 13]) { ctx.fillStyle = '#07050c'; ctx.fillRect(ox + bx, oy + 3, 7, 4); ctx.fillStyle = '#6b4423'; ctx.fillRect(ox + bx + 1, oy + 3, 5, 3); }
    // farolzinho e refletor
    ctx.fillStyle = '#07050c'; ctx.fillRect(ox + 21, oy - 5, 4, 4); ctx.fillStyle = '#fff2ad'; ctx.fillRect(ox + 22, oy - 4, 2, 2);
    ctx.fillStyle = '#e8443a'; ctx.fillRect(ox - 24, oy - 1, 1, 2);
    ctx.restore();
    LD_BCTX.clearRect(0, 0, 64, 64); LD_BCTX.drawImage(cv, 0, 0, 64, 64, 0, 0, 64, 64);
  },
  draw(t = this.t) {
    this.paintCart(t);
    const CX = Math.round(this.camX), CY = Math.round(this.camY), dy0 = (this.camY0 ?? CY) - CY;
    // céu
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#060914'); g.addColorStop(.7, '#151330'); g.addColorStop(1, '#1d1533'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    stars(CX * .03, 1, 3);
    // lua
    ctx.fillStyle = 'rgba(242,236,216,.08)'; ctx.beginPath(); ctx.arc(258, 92, 24, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#f2ecd8'; ctx.beginPath(); ctx.arc(258, 92, 13, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#d6cfb8'; ctx.fillRect(252, 86, 4, 3); ctx.fillRect(262, 95, 3, 3); ctx.fillRect(255, 98, 2, 2);
    // morros ao longe
    const fy = clamp(222 + dy0 * .05, 190, 262), P2 = CX * .12;
    ctx.fillStyle = '#0d1022';
    for (let x = 0; x < W; x += 4) { const u = x + P2, hh = 26 + 14 * Math.sin(u / 53) + 8 * Math.sin(u / 21); ctx.fillRect(x, Math.round(fy - hh), 4, H); }
    // camada do meio: casas, árvores, guindastes
    const P = CX * .35, my = clamp(244 + dy0 * .12, 186, 296);
    for (let i = Math.floor((P - 60) / 58); i <= Math.floor((P + W + 20) / 58); i++) {
      const x = Math.round(i * 58 - P + ldHash(i) * 16), tp = LD_TIPOS[this.secAt(i * 58 / .35 + 110) % 3], r = ldHash(i * 3.1);
      if (tp === 'bairro') {
        const bw = 34 + Math.floor(r * 14), bh = 26 + Math.floor(ldHash(i * 7.7) * 30);
        ctx.fillStyle = '#141a2b'; ctx.fillRect(x, my - bh, bw, H);
        ctx.fillStyle = '#10131f'; for (let k = 0; k < 6; k++) ctx.fillRect(x - 2 + k * 2, my - bh - 6 + k, bw + 4 - k * 4, 1);
        for (let wy = 0; wy < 3; wy++) for (let wx = 0; wx < 3; wx++) {
          const hv = ldHash(i * 13 + wx * 5 + wy * 17); if (my - bh + 8 + wy * 12 > my - 6) continue;
          ctx.fillStyle = hv < .45 ? `rgba(${LD_LUZ[Math.floor(hv * 6.6) % 3]},.55)` : '#0c0f19'; ctx.fillRect(x + 5 + wx * 10, my - bh + 8 + wy * 12, 5, 6);
        }
      } else if (tp === 'morro') {
        if (r < .25) { // torre de antena
          ctx.fillStyle = '#121828'; ctx.fillRect(x + 10, my - 80, 3, 80); for (let k = 0; k < 7; k++) ctx.fillRect(x + 6 + (k % 2) * 4, my - 70 + k * 10, 7, 1);
          ctx.fillStyle = Math.floor(t * 1.5 + i) % 2 ? '#ff4a4a' : '#5a1a1a'; ctx.fillRect(x + 10, my - 83, 3, 3);
        } else {
          const rr = 10 + Math.floor(r * 10); ctx.fillStyle = '#0f1a1e'; ctx.fillRect(x + rr - 2, my - 22, 4, 22);
          ctx.beginPath(); ctx.arc(x + rr, my - 26 - rr * .4, rr, 0, 6.29); ctx.fill();
        }
      } else if (r < .4) { // guindaste
        ctx.fillStyle = '#161b2a'; ctx.fillRect(x + 6, my - 96, 5, 96);
        for (let k = 0; k < 9; k++) { ctx.fillStyle = '#1e2436'; ctx.fillRect(x + 6, my - 92 + k * 10, 5, 1); }
        ctx.fillStyle = '#161b2a'; ctx.fillRect(x - 14, my - 98, 70, 4); ctx.fillRect(x + 40, my - 94, 1, 30); ctx.fillRect(x + 37, my - 64, 7, 5);
        ctx.fillStyle = Math.floor(t * 2 + i) % 2 ? '#ff4a4a' : '#4a1414'; ctx.fillRect(x + 54, my - 100, 2, 2);
      } else { // prédio em construção
        const bw = 40, bh = 40 + Math.floor(r * 30); ctx.fillStyle = '#121725'; ctx.fillRect(x, my - bh, bw, H);
        ctx.fillStyle = '#0a0d16'; for (let fy2 = my - bh + 4; fy2 < my; fy2 += 10) for (let k = 0; k < 3; k++) ctx.fillRect(x + 3 + k * 13, fy2, 10, 6);
        ctx.fillStyle = Math.floor(t * 3 + i) % 2 ? 'rgba(255,176,32,.7)' : 'rgba(255,176,32,.25)'; ctx.fillRect(x + 18, my - bh - 3, 3, 3);
      }
    }
    // coisas plantadas no mundo (atrás do chão)
    const x0 = CX - 40, x1 = CX + W + 40, gyAt = (x) => Math.round(this.surf(x)) - CY;
    for (let x = Math.floor(x0 / 208) * 208 + 100; x < x1; x += 208) { // postes do bairro
      if (this.tipoAt(x) !== 'bairro' || this.holeAt(x, 8)) continue;
      const gy = gyAt(x), col = LD_LUZ[Math.floor(ldHash(x) * 3)], sx = x - CX;
      ctx.fillStyle = `rgba(${col},.07)`; ctx.beginPath(); ctx.moveTo(sx + 9, gy - 46); ctx.lineTo(sx - 12, gy); ctx.lineTo(sx + 32, gy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2a3040'; ctx.fillRect(sx, gy - 52, 2, 52); ctx.fillRect(sx, gy - 52, 12, 2);
      ctx.fillStyle = `rgb(${col})`; ctx.fillRect(sx + 6, gy - 50, 6, 2);
    }
    for (let x = Math.floor(x0 / 48) * 48; x < x1; x += 48) { // cerca do morro
      if (this.tipoAt(x) !== 'morro' || this.holeAt(x, 4) || ldHash(x * .7) < .3) continue;
      const gy = gyAt(x), sx = x - CX; ctx.fillStyle = '#4a3624'; ctx.fillRect(sx, gy - 14, 2, 14);
      ctx.fillStyle = '#3a2a1c'; ctx.fillRect(sx - 4, gy - 11, 10, 1); ctx.fillRect(sx - 4, gy - 6, 10, 1);
    }
    for (let x = Math.floor(x0 / 260) * 260 + 130; x < x1; x += 260) { // cavaletes da obra
      if (this.tipoAt(x) !== 'obra' || this.holeAt(x, 30)) continue;
      const gy = gyAt(x), sx = x - CX;
      ctx.fillStyle = '#07050c'; ctx.fillRect(sx - 1, gy - 15, 24, 8); ctx.fillRect(sx + 2, gy - 8, 2, 8); ctx.fillRect(sx + 18, gy - 8, 2, 8);
      for (let k = 0; k < 5; k++) { ctx.fillStyle = k % 2 ? '#07050c' : '#ffb020'; ctx.fillRect(sx + k * 4 + 1, gy - 14, 4, 6); }
      ctx.fillStyle = Math.floor(t * 3 + x) % 2 ? '#ffd04a' : '#6a5010'; ctx.fillRect(sx + 9, gy - 18, 4, 3);
    }
    // placas de distância
    for (let m = Math.max(50, Math.ceil(x0 / LD_PXM / 50) * 50); m * LD_PXM < x1; m += 50) {
      const x = m * LD_PXM; if (m % 300 === 0 || this.holeAt(x, 6)) continue;
      const gy = gyAt(x), sx = x - CX;
      ctx.fillStyle = '#5d6875'; ctx.fillRect(sx, gy - 24, 2, 24);
      ctx.fillStyle = '#07050c'; ctx.fillRect(sx - 14, gy - 37, 30, 14); ctx.fillStyle = '#2e6fd8'; ctx.fillRect(sx - 13, gy - 36, 28, 12);
      ctx.fillStyle = '#f6f7f9'; ctx.font = '700 8px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText(`${m} m`, sx + 1, gy - 27); ctx.textAlign = 'left';
    }
    // placas de trecho, com torcida de Amiguinhos
    for (let k = Math.max(0, Math.floor(x0 / LD_SEC)); k * LD_SEC < x1 + 60; k++) {
      const x = k ? k * LD_SEC : 46, sx = x - CX, gy = gyAt(x), tp = LD_TIPOS[k % 3];
      const cor = { bairro: '#2e6fd8', morro: '#3f8a3e', obra: '#ffb020' }[tp], txt = k ? LD_NOMES[tp].toUpperCase() : 'LARGADA';
      ctx.fillStyle = '#5d6875'; ctx.fillRect(sx - 20, gy - 30, 2, 30); ctx.fillRect(sx + 20, gy - 30, 2, 30);
      ctx.fillStyle = '#07050c'; ctx.fillRect(sx - 34, gy - 52, 70, 24);
      if (k) { ctx.fillStyle = cor; ctx.fillRect(sx - 33, gy - 51, 68, 22); }
      else for (let q = 0; q < 34; q++) { ctx.fillStyle = (q + Math.floor(q / 17)) % 2 ? '#f6f7f9' : '#1a2230'; ctx.fillRect(sx - 33 + (q % 17) * 4, gy - 51 + Math.floor(q / 17) * 11, 4, 11); }
      ctx.font = '900 9px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#07050c';
      const escuro = tp === 'obra' && k;
      if (!escuro) ctx.strokeText(txt, sx + 1, gy - 41);
      ctx.fillStyle = escuro ? '#07050c' : '#ffffff'; ctx.fillText(txt, sx + 1, gy - 41);
      ctx.font = '700 8px "IBM Plex Mono", monospace'; ctx.fillStyle = escuro ? '#07050c' : '#e8ebee'; ctx.fillText(k ? `${k * 300} m` : '0 m', sx + 1, gy - 32); ctx.textAlign = 'left';
      for (let b = 0; b < 2; b++) { const [o1, o2] = LD_BOTS[(k * 2 + b) % LD_BOTS.length], bx = sx + (b ? 30 : -54), hop = Math.floor(t * 4 + b) % 2 ? 2 : 0; spr(BOT, bx, gy - 16 - hop, 2, !!b, { ...PAL, O: o1, o: o2 }); if (tp === 'obra' && k) { ctx.fillStyle = '#ffd04a'; ctx.fillRect(bx + 2, gy - 19 - hop, 12, 3); } }
    }
    // chão, coluna por coluna
    const hv = this.holes.filter((hl) => hl.b > CX - 4 && hl.a < CX + W + 4);
    let hi = 0;
    for (let sx = 0; sx < W; sx++) {
      const x = CX + sx;
      while (hi < hv.length && hv[hi].b < x) hi++;
      const y = Math.round(this.surf(x)) - CY;
      if (y >= H) continue;
      if (hi < hv.length && x > hv[hi].a && x < hv[hi].b) { ctx.fillStyle = '#030408'; ctx.fillRect(sx, y + 2, 1, H - y); continue; }
      const C = LD_CHAO[this.tipoAt(x)];
      ctx.fillStyle = C.base; ctx.fillRect(sx, y, 1, H - y);
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(sx, y + 30, 1, H - y); ctx.fillRect(sx, y + 70, 1, H - y);
      ctx.fillStyle = C.band; ctx.fillRect(sx, y, 1, C.bw + 1);
      ctx.fillStyle = C.top; ctx.fillRect(sx, y, 1, 1);
      const hh = ldHash(x);
      if (hh < .07) { ctx.fillStyle = C.dot; ctx.fillRect(sx, y + 10 + Math.floor(ldHash(x + .5) * 40), 2, 2); }
      if (C === LD_CHAO.morro && hh > .78) { ctx.fillStyle = C.top; ctx.fillRect(sx, y - 1 - Math.floor((hh - .78) * 10), 1, 2); }
      if (C === LD_CHAO.bairro && x % 30 < 14) { ctx.fillStyle = '#4a5162'; ctx.fillRect(sx, y + 3, 1, 1); }
      if (C === LD_CHAO.obra && x % 40 === 0) { ctx.fillStyle = '#1c1f26'; ctx.fillRect(sx, y + 6, 1, H - y); }
    }
    // beiradas dos buracos: faixa de perigo e cones
    for (const hl of hv) for (const [ex, ey, side] of [[hl.a, hl.ya, -1], [hl.b, hl.yb, 1]]) {
      const sx = Math.round(ex) - CX + (side < 0 ? -3 : 0), sy = Math.round(ey) - CY;
      for (let k = 0; k < 7; k++) { ctx.fillStyle = k % 2 ? '#07050c' : '#ffb020'; ctx.fillRect(sx, sy + k * 4, 3, 4); }
      const cx2 = sx + side * 12 + (side < 0 ? -2 : 0);
      ctx.fillStyle = '#07050c'; ctx.fillRect(cx2 - 1, sy - 11, 8, 11); ctx.fillStyle = '#ff7a2a'; ctx.fillRect(cx2, sy - 10, 6, 10); ctx.fillStyle = '#ffffff'; ctx.fillRect(cx2 + 1, sy - 6, 4, 2);
      ctx.fillStyle = '#ff7a2a'; ctx.fillRect(cx2 + 2, sy - 13, 2, 3);
    }
    // pilhas e fichas
    for (const it of this.items) {
      const sx = Math.round(it.x) - CX, sy = Math.round(it.y + Math.sin(t * 4 + it.x * .05) * 1.5) - CY;
      if (sx < -20 || sx > W + 20) continue;
      if (it.k === 'pilha') {
        ctx.fillStyle = `rgba(67,209,122,${.12 + .06 * Math.sin(t * 5)})`; ctx.beginPath(); ctx.arc(sx, sy, 14, 0, 6.29); ctx.fill();
        spr(LD_PILHA, sx - 6, sy - 10, 2, false, LD_PILHA_PAL);
      } else { const f = LD_FICHA[[0, 1, 2, 1][Math.floor(t * 8 + it.x * .02) % 4]]; spr(f, sx - f[0].length, sy - 8, 2, false, LD_FICHA_PAL); }
    }
    // carrinho: farol, eixos, tábua com o IAmiguinho (girada junto), rodinhas
    const c = Math.cos(this.a), s = Math.sin(this.a), wx = (lx, ly) => this.cx + lx * c - ly * s - CX, wy = (lx, ly) => this.cy + lx * s + ly * c - CY;
    ctx.fillStyle = 'rgba(255,242,173,.07)'; ctx.beginPath(); ctx.moveTo(wx(23, -3), wy(23, -3)); ctx.lineTo(wx(120, -26), wy(120, -26)); ctx.lineTo(wx(120, 22), wy(120, 22)); ctx.closePath(); ctx.fill();
    for (const w of this.wh) ldLine(wx(w.lx, 5), wy(w.lx, 5), w.x - CX, w.y - CY, '#3a2a1c', 2);
    ctx.save(); ctx.translate(Math.round(this.cx - CX), Math.round(this.cy - CY)); ctx.rotate(this.a); ctx.drawImage(LD_BUF, -LD_OX, -LD_OY); ctx.restore();
    for (const w of this.wh) {
      const sx = Math.round(w.x - CX), sy = Math.round(w.y - CY);
      spr(LD_RODA, sx - 5, sy - 5, 1, false, LD_RODA_PAL);
      ctx.fillStyle = '#f6f7f9'; ctx.fillRect(sx - 1 + Math.round(Math.cos(w.spin) * 3), sy - 1 + Math.round(Math.sin(w.spin) * 3), 2, 2);
    }
    // efeitos
    for (const f of this.fx) {
      ctx.globalAlpha = Math.max(0, 1 - f.t / f.life);
      if (f.k === 'p') { ctx.fillStyle = f.c; ctx.fillRect(Math.round(f.x - CX), Math.round(f.y - CY), 2, 2); }
      else { ctx.font = '900 12px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#07050c'; ctx.strokeText(f.s, Math.round(f.x - CX), Math.round(f.y - CY)); ctx.fillStyle = f.c; ctx.fillText(f.s, Math.round(f.x - CX), Math.round(f.y - CY)); ctx.textAlign = 'left'; }
    }
    ctx.globalAlpha = 1;
    // bateria
    const bx = 10, by = H - 26, bw = 64, low = this.bat < 20 && Math.floor(t * 6) % 2;
    ctx.font = '600 8px "IBM Plex Mono", monospace'; ctx.fillStyle = '#8e969f'; ctx.fillText('BATERIA', bx, by - 4);
    ctx.fillStyle = '#07050c'; ctx.fillRect(bx - 2, by - 2, bw + 4, 14); ctx.fillRect(bx + bw + 2, by + 2, 3, 6);
    ctx.fillStyle = '#1a2029'; ctx.fillRect(bx, by, bw, 10);
    const fw = Math.round(bw * this.bat / 100);
    ctx.fillStyle = this.bat < 20 ? (low ? '#ff5a5a' : '#b33b3b') : this.bat < 45 ? '#ffb25b' : '#43d17a'; ctx.fillRect(bx, by, fw, 10);
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(bx, by, fw, 2);
    ctx.fillStyle = '#07050c'; for (let k = 1; k < 4; k++) ctx.fillRect(bx + k * 16, by, 1, 10);
    if (state !== 'play') return;
    // aviso do trecho novo
    if (this.aviso && this.mode !== 'fim') {
      const a = this.aviso, al = Math.max(0, Math.min(1, (2 - a.t) * 3, a.t * 6)); ctx.globalAlpha = al; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#0a1016';
      ctx.font = '900 18px Archivo, sans-serif'; ctx.strokeText(a.s, W / 2, 86); ctx.fillStyle = '#ffd04a'; ctx.fillText(a.s, W / 2, 86);
      ctx.font = F_SM; ctx.lineWidth = 3; ctx.strokeText(a.sub, W / 2, 102); ctx.fillStyle = '#ffffff'; ctx.fillText(a.sub, W / 2, 102);
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
    if (this.mode === 'fim') banner([[{ capotou: 'CAPOTOU!', buraco: 'CAIU NO BURACO', bateria: 'BATERIA ACABOU', atolou: 'ATOLOU' }[this.motivo] || 'FIM', F_BIG, '#ff8a8a'], [`${Math.floor(this.dist)} m · ${this.fichas} fichas`, F_SM, '#ffffff']], 150);
  },
  hud() { return ['Metros', this.score, `${this.fichas} fichas · ${LD_NOMES[this.tipoAt(this.cx)]}`]; },
  overText() {
    const onde = { bairro: 'no bairro', morro: 'no morro de terra', obra: 'na obra' }[this.tipoAt(this.cx)];
    const extra = this.fichas * LD_FICHA_M + this.bonus;
    return `${LD_FIM[this.motivo] || 'Parou'} ${onde} aos ${Math.floor(this.dist)} m.${extra ? ` Bônus: +${extra} m (${this.fichas} fichas${this.mortais ? `, ${this.mortais} mortal${this.mortais > 1 ? 's' : ''}` : ''}).` : ''}`;
  },
};
ARCADE_NOVOS.push(ladeiraJogo);
