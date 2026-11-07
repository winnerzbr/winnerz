/* ============================================================ jogo: Derruba o Backlog */
// O IAmiguinho (boné bem apertado) é lançado de um estilingue feito de cabo de controle contra torres de caixas de jogo,
// tábuas e blocos de metal. Os alvos são os "jogos parados" do backlog: Amiguinhos dormindo e caixas de jogo com cara de tédio.
// 3 lançamentos por fase. Derrubou todos os alvos: fase zerada, e cada lançamento que sobrou vira 1000 de bônus.
// Não derrubou com 3: fim. 10 fases desenhadas e depois fases aleatórias, cada vez maiores.
// Física 2D própria (caixas com rotação, contatos com atrito, impulsos acumulados) com corpos que dormem quando param:
// a fase começa toda dormindo e só acorda o que for tocado, então nada treme à toa.
// Dano por impacto: quanto mais forte a batida, mais estraga. Alvo cai se quebrar, tombar de lado ou sair da tela.
Music.define('derruba', {
  bpm: 120,
  lead: bars('F5 . A5 . C6 - A5 . G5 . . E5 F5 - . .', 'D5 . F5 . A5 - F5 . E5 . . C5 D5 - . .', 'Bb4 . D5 . F5 - D5 . C5 . E5 . G5 - Bb5 -', 'A5 - G5 - F5 - E5 - F5 - - - . . . .'),
  arp: bars(x4('F4 A4 C5 A4'), x4('D4 F4 A4 F4'), x4('Bb3 D4 F4 D4'), x4('C4 E4 G4 E4')),
  bass: bars('F2 . . F3 . . C3 . F2 . . F3 . C3 . .', 'D2 . . D3 . . A2 . D2 . . D3 . A2 . .', 'Bb1 . . Bb2 . . F2 . Bb1 . . Bb2 . F2 . .', 'C2 . . C3 . . G2 . C2 . C3 . E2 . G2 .'),
  drums: 'k . h . s . h k . k h . s . h h',
  mix: { arp: .6, drums: .85 },
});
// chão, estilingue (ponto de descanso do IAmiguinho), raio do IAmiguinho, velocidades de lançamento, gravidade, passo da física
const DB_GY = 330, DB_SL = { x: 46, y: 268 }, DB_R = 14, DB_V0 = 120, DB_V1 = 400, DB_GRAV = 420, DB_DT = 1 / 180, DB_IT = 9;
const DB_SLOP = .4, DB_BETA = .2, DB_TH = 85, DB_WAKE = 8, DB_ALVO_PTS = 500, DB_BONUS = 1000;
const DB_MAT = {
  ia: { dens: 2.4, fr: .5, e: .3, hp: Infinity },
  chao: { dens: 0, fr: .8, e: 0, hp: Infinity },
  caixa: { dens: .8, fr: .6, e: .05, hp: 110, pts: 40, cores: ['#e8443a', '#2e6fd8', '#ffd04a', '#3fbf6a'] },
  tabua: { dens: 1, fr: .7, e: .05, hp: 150, pts: 60, cores: ['#9a6a3c', '#b8844e', '#5a3a1e'] },
  metal: { dens: 3, fr: .5, e: .02, hp: 420, pts: 150, cores: ['#5b667a', '#8b97ab', '#2a3040'] },
  bot: { dens: .8, fr: .6, e: .1, hp: 60, alvo: true },
  jogo: { dens: .8, fr: .6, e: .05, hp: 70, alvo: true },
};
// capas das caixas de jogo: [capa, lombada, detalhe] (arte abstrata, nada de jogo de verdade)
const DB_CAPAS = [['#e8443a', '#9a2a22', '#ffb0a0'], ['#2e6fd8', '#1c4a99', '#a8c8ff'], ['#3fbf6a', '#21864a', '#b8f3cc'], ['#ffd04a', '#b08a12', '#fff2ad'], ['#a77bff', '#6843bd', '#ddcdff'], ['#ff8a3d', '#b35416', '#ffcda8'], ['#3fc9c0', '#21807a', '#c0f4ef']];
const DB_BOTCOR = [['#e86fa8', '#b24f80'], ['#43d17a', '#21864a'], ['#ff8a3d', '#b35416'], ['#a77bff', '#6843bd'], ['#3fc9c0', '#21807a'], ['#ffd23f', '#b08a12']];
// Amiguinho dormindo (olhos fechados) e o controle que serve de bolsa do estilingue
const DB_DORME = ['..OOOO..', '.OOOOOO.', 'OODDDDOO', 'ODDDDDDO', 'OEEDDEEO', 'oOOOOOOo', '.o....o.', '.o....o.'];
const DB_PAD = ['..KKKKKKKKKK..', '.KSSSSSSSSSSK.', 'KSSKSSSSSSRSSK', 'KSKKKSSSSGSYSK', 'KSSKSSSSSSBSSK', 'KSSSSKKKKSSSSK', '.KSSK....KSSK.', '..KK......KK..'];
const DB_PADPAL = { K: '#07050c', S: '#b8c0cc', R: '#e8443a', G: '#3fbf6a', Y: '#ffd04a', B: '#2e6fd8' };
const DB_Z = ['ZZZZ', '..Z.', '.Z..', 'ZZZZ'];
const DB_ZERA = ['ZERADO!', 'SAIU DO BACKLOG!', 'PLATINOU!', 'ACORDOU!', 'JOGADO!'];
const dbNorm = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
const dbTri = (x) => { const p = x % 2; return p < 1 ? p : 2 - p; };

/* ---------- física: corpos, colisão caixa-caixa (recorte de arestas), caixa-bola e solver de impulsos */
let dbNid = 1;
function dbCorpo(k, x, y, w, h) {
  const M = DB_MAT[k], circ = k === 'ia', st = k === 'chao';
  const m = st ? 0 : (circ ? Math.PI * DB_R * DB_R : w * h) * M.dens, I = circ ? m * DB_R * DB_R / 2 : m * (w * w + h * h) / 12;
  const sd = (Math.random() * 1e4) | 0;
  return { id: dbNid++, k, x, y, ang: 0, vx: 0, vy: 0, av: 0, hw: circ ? DB_R : w / 2, hh: circ ? DB_R : h / 2, circ, st, m, im: st ? 0 : 1 / m, iI: st ? 0 : 1 / I, fr: M.fr, e: M.e, hp: M.hp, hp0: M.hp, alvo: !!M.alvo, sleep: !circ && !st, slT: 0, nc: 0, sd, dead: false };
}
const dbFixo = (b) => b.st || b.sleep;
function dbClip(vi, nx, ny, off, edge) {
  const out = [], d0 = nx * vi[0].x + ny * vi[0].y - off, d1 = nx * vi[1].x + ny * vi[1].y - off;
  if (d0 <= 0) out.push(vi[0]);
  if (d1 <= 0) out.push(vi[1]);
  if (d0 * d1 < 0) {
    const u = d0 / (d0 - d1), v = { x: vi[0].x + u * (vi[1].x - vi[0].x), y: vi[0].y + u * (vi[1].y - vi[0].y), f: null };
    if (d0 > 0) { v.f = vi[0].f.slice(); v.f[0] = edge; v.f[2] = 0; } else { v.f = vi[1].f.slice(); v.f[1] = edge; v.f[3] = 0; }
    out.push(v);
  }
  return out;
}
function dbIncid(hx, hy, b, nx, ny) {
  const c = Math.cos(b.ang), s = Math.sin(b.ang), n1 = -(c * nx + s * ny), n2 = -(-s * nx + c * ny);
  let v;
  if (Math.abs(n1) > Math.abs(n2)) v = n1 >= 0 ? [[hx, -hy, 3, 4], [hx, hy, 4, 1]] : [[-hx, hy, 1, 2], [-hx, -hy, 2, 3]];
  else v = n2 >= 0 ? [[hx, hy, 4, 1], [-hx, hy, 1, 2]] : [[-hx, -hy, 2, 3], [hx, -hy, 3, 4]];
  return v.map(([lx, ly, ie, oe]) => ({ x: b.x + c * lx - s * ly, y: b.y + s * lx + c * ly, f: [0, 0, ie, oe] }));
}
function dbCaixaCaixa(A, B) {
  const cA = Math.cos(A.ang), sA = Math.sin(A.ang), cB = Math.cos(B.ang), sB = Math.sin(B.ang);
  const dpx = B.x - A.x, dpy = B.y - A.y;
  const dAx = cA * dpx + sA * dpy, dAy = -sA * dpx + cA * dpy, dBx = cB * dpx + sB * dpy, dBy = -sB * dpx + cB * dpy;
  const a11 = Math.abs(cA * cB + sA * sB), a12 = Math.abs(-cA * sB + sA * cB), a21 = Math.abs(-sA * cB + cA * sB), a22 = Math.abs(sA * sB + cA * cB);
  const fAx = Math.abs(dAx) - A.hw - (a11 * B.hw + a12 * B.hh), fAy = Math.abs(dAy) - A.hh - (a21 * B.hw + a22 * B.hh);
  if (fAx > 0 || fAy > 0) return null;
  const fBx = Math.abs(dBx) - (a11 * A.hw + a21 * A.hh) - B.hw, fBy = Math.abs(dBy) - (a12 * A.hw + a22 * A.hh) - B.hh;
  if (fBx > 0 || fBy > 0) return null;
  let axis = 0, sep = fAx, nx = dAx > 0 ? cA : -cA, ny = dAx > 0 ? sA : -sA;
  if (fAy > .95 * sep + .01 * A.hh) { axis = 1; sep = fAy; nx = dAy > 0 ? -sA : sA; ny = dAy > 0 ? cA : -cA; }
  if (fBx > .95 * sep + .01 * B.hw) { axis = 2; sep = fBx; nx = dBx > 0 ? cB : -cB; ny = dBx > 0 ? sB : -sB; }
  if (fBy > .95 * sep + .01 * B.hh) { axis = 3; sep = fBy; nx = dBy > 0 ? -sB : sB; ny = dBy > 0 ? cB : -cB; }
  let fnx, fny, front, snx, sny, neg, pos, ne, pe, inc;
  if (axis === 0) { fnx = nx; fny = ny; front = A.x * fnx + A.y * fny + A.hw; snx = -sA; sny = cA; const sd = A.x * snx + A.y * sny; neg = -sd + A.hh; pos = sd + A.hh; ne = 3; pe = 1; inc = dbIncid(B.hw, B.hh, B, fnx, fny); }
  else if (axis === 1) { fnx = nx; fny = ny; front = A.x * fnx + A.y * fny + A.hh; snx = cA; sny = sA; const sd = A.x * snx + A.y * sny; neg = -sd + A.hw; pos = sd + A.hw; ne = 2; pe = 4; inc = dbIncid(B.hw, B.hh, B, fnx, fny); }
  else if (axis === 2) { fnx = -nx; fny = -ny; front = B.x * fnx + B.y * fny + B.hw; snx = -sB; sny = cB; const sd = B.x * snx + B.y * sny; neg = -sd + B.hh; pos = sd + B.hh; ne = 3; pe = 1; inc = dbIncid(A.hw, A.hh, A, fnx, fny); }
  else { fnx = -nx; fny = -ny; front = B.x * fnx + B.y * fny + B.hh; snx = cB; sny = sB; const sd = B.x * snx + B.y * sny; neg = -sd + B.hw; pos = sd + B.hw; ne = 2; pe = 4; inc = dbIncid(A.hw, A.hh, A, fnx, fny); }
  const c1 = dbClip(inc, -snx, -sny, neg, ne); if (c1.length < 2) return null;
  const c2 = dbClip(c1, snx, sny, pos, pe); if (c2.length < 2) return null;
  const out = [];
  for (const v of c2) {
    const s = fnx * v.x + fny * v.y - front;
    if (s > 0) continue;
    const f = axis >= 2 ? [v.f[2], v.f[3], v.f[0], v.f[1]] : v.f;
    out.push({ nx, ny, sep: s, px: v.x - s * fnx, py: v.y - s * fny, key: f[0] | (f[1] << 4) | (f[2] << 8) | (f[3] << 12), Pn: 0, Pt: 0 });
  }
  return out.length ? out : null;
}
// A é caixa, B é a bola (o IAmiguinho); a normal aponta da caixa para a bola
function dbCaixaBola(A, B) {
  const c = Math.cos(A.ang), s = Math.sin(A.ang), dx = B.x - A.x, dy = B.y - A.y, lx = c * dx + s * dy, ly = -s * dx + c * dy;
  let qx = clamp(lx, -A.hw, A.hw), qy = clamp(ly, -A.hh, A.hh), nx, ny, sep;
  if (qx === lx && qy === ly) {
    const ex = A.hw - Math.abs(lx), ey = A.hh - Math.abs(ly);
    if (ex < ey) { nx = lx < 0 ? -1 : 1; ny = 0; qx = nx * A.hw; } else { nx = 0; ny = ly < 0 ? -1 : 1; qy = ny * A.hh; }
    sep = -Math.min(ex, ey) - B.hw;
  } else {
    const ddx = lx - qx, ddy = ly - qy, d = Math.hypot(ddx, ddy);
    if (d > B.hw) return null;
    nx = ddx / d; ny = ddy / d; sep = d - B.hw;
  }
  return [{ nx: c * nx - s * ny, ny: s * nx + c * ny, sep, px: A.x + c * qx - s * qy, py: A.y + s * qx + c * qy, key: 1, Pn: 0, Pt: 0 }];
}
function dbCaixa(b) { if (b.circ) return [b.x - b.hw, b.y - b.hh, b.x + b.hw, b.y + b.hh]; const c = Math.abs(Math.cos(b.ang)), s = Math.abs(Math.sin(b.ang)), ex = c * b.hw + s * b.hh, ey = s * b.hw + c * b.hh; return [b.x - ex, b.y - ey, b.x + ex, b.y + ey]; }
const dbVel = (b) => Math.hypot(b.vx, b.vy) + Math.abs(b.av) * Math.max(b.hw, b.hh);

/* ---------- montagem das fases: cada peça cai em cima do que já estiver embaixo dela (encaixe exato, sem tremer) */
function dbMonta(fn) {
  const P = [];
  const topo = (x0, x1) => { let y = DB_GY; for (const p of P) if (x0 < p.x + p.w / 2 - .01 && x1 > p.x - p.w / 2 + .01) y = Math.min(y, p.y - p.h / 2); return y; };
  const put = (k, x, w, h) => { P.push({ k, x, w, h, y: topo(x - w / 2, x + w / 2) - h / 2 }); };
  const B = {
    c: (x) => put('caixa', x, 16, 20), // caixa de jogo em pé
    d: (x) => put('caixa', x, 20, 16), // caixa de jogo deitada
    p: (x, h = 36) => put('tabua', x, 6, h), // tábua em pé
    t: (x, w = 48) => put('tabua', x, w, 6), // tábua deitada
    m: (x, s = 18) => put('metal', x, s, s), // bloco de metal
    a: (x) => put('bot', x, 16, 16), // alvo: Amiguinho dormindo
    j: (x) => put('jogo', x, 16, 20), // alvo: caixa de jogo com cara de tédio
    q: (x, h = 36) => put('metal', x, 6, h), // viga de metal em pé
    topo,
  };
  fn(B);
  return P;
}
const DB_FASES = [
  ['Comprei e nunca abri', ({ c, a }) => { c(214); c(214); a(214); a(266); }],
  ['Lista do ano passado', ({ c, p, t, a, j }) => { p(196); p(236); a(216); t(216, 52); a(216); c(278); j(278); }],
  ['Jogos de 100 horas', ({ c, p, t, a }) => { p(214); p(250); a(232); t(232, 44); p(218); p(246); a(232); t(232, 36); p(220); p(244); a(232); t(232, 32); a(232); c(292); c(292); }],
  ['Promoção relâmpago', ({ c, p, t, m, a, j }) => { p(172); p(196); a(184); t(184, 36); a(184); m(230); a(230); p(264); p(292); j(278); t(278, 40); c(278); }],
  ['Edição de colecionador', ({ c, t, m, a, j }) => { m(214); m(250); a(232); t(232, 60); c(216); c(248); t(232, 50); a(232); c(292); j(292); }],
  ['Pilha da estante', ({ c, p, a, j }) => { c(184); c(200); c(216); c(232); c(192); c(208); c(224); c(200); c(216); a(208); p(258, 40); a(278); j(298); }],
  ['Acesso antecipado', ({ c, p, t, m, a, j }) => { m(194); m(194); m(194); p(236); p(266); a(251); t(251, 40); c(243); c(259); a(251); j(298); }],
  ['Remasterizados', ({ c, p, t, m, a, j }) => { m(170); c(170); a(170); p(204); p(256); a(220); j(240); t(230, 60); p(214); p(246); a(230); t(230, 40); m(292); m(292); a(292); }],
  ['Fila de lançamentos', ({ c, p, t, a }) => { p(168, 44); p(184, 44); t(176, 24); a(176); p(204, 44); p(222, 44); p(238, 44); t(230, 24); a(230); p(258, 44); p(276, 44); c(298); a(298); }],
  ['A torre da vergonha', ({ c, p, t, m, a, j }) => {
    m(170); a(188); m(206); a(224); m(242); a(260); m(278);
    t(188, 52); t(224, 20); t(260, 52);
    p(166); p(210); a(188); t(188, 50); p(238); p(282); a(260); t(260, 50);
    t(224, 60); c(224); j(224);
  }],
];
// fases depois da 10: módulos sorteados lado a lado, mais altos e com mais metal a cada fase
function dbAleatoria(n) {
  return dbMonta((B) => {
    const { c, p, t, m, a, j, q } = B, lv = n - 10;
    let x = 156 + Math.floor(rand(0, 10)), alvos = 0; const centros = [];
    const al = (xx) => { (Math.random() < .5 ? a : j)(xx); alvos++; };
    let guard = 0;
    while (x < 290 && guard++ < 8) {
      const tipo = pick(lv < 2 ? ['portal', 'piramide', 'pilha', 'bunker'] : ['portal', 'portal', 'piramide', 'pilha', 'bunker', 'muro']);
      let w;
      if (tipo === 'portal') {
        const fl = Math.min(3, 1 + Math.floor(rand(0, 1.6 + lv * .3))); w = 2 * Math.floor(rand(18, 24)) + 0;
        if (x + w > 312) break;
        const cx = x + w / 2;
        for (let i = 0; i < fl; i++) { const hx = w / 2 - 3 - 2 * i; const mt = Math.random() < Math.min(.6, lv * .08); (mt ? q : p)(cx - hx); (mt ? q : p)(cx + hx); if (Math.random() < .7) al(cx); t(cx, w - 4 * i + 2); }
        if (Math.random() < .7) al(cx); else { c(cx); }
      } else if (tipo === 'piramide') {
        const r = Math.random() < .5 ? 3 : 4; w = r * 16; if (x + w > 312) break;
        for (let k = 0; k < r; k++) for (let i = 0; i < r - k; i++) c(x + 8 + k * 8 + i * 16);
        al(x + w / 2);
      } else if (tipo === 'pilha') {
        w = 18; if (x + w > 312) break; const cx = x + 9, n2 = 1 + Math.floor(rand(0, 3));
        for (let i = 0; i < n2; i++) (Math.random() < .3 + lv * .05 ? m : c)(cx);
        al(cx);
      } else if (tipo === 'bunker') {
        w = 54; if (x + w > 312) break; const cx = x + 27;
        m(cx - 18); m(cx + 18); al(cx); t(cx, 54);
        if (Math.random() < .6) { c(cx - 10); c(cx + 10); t(cx, 40); al(cx); } else al(cx);
      } else {
        w = 18; if (x + w > 312) break; const cx = x + 9;
        for (let i = 0; i < 2 + Math.floor(rand(0, 2)); i++) m(cx);
      }
      centros.push(x + w / 2); x += w + Math.floor(rand(6, 14));
    }
    while (alvos < 2) { a(centros.length ? pick(centros) : 230); alvos++; }
  });
}

const dbJogo = {
  id: 'derruba', name: 'Derruba o Backlog', tag: 'Física · estilingue e torres', unit: 'pontos', ia: 4800, bestKey: '.v1',
  desc: 'Lance o IAmiguinho e derrube a pilha de jogos parados.',
  how: 'Puxe o IAmiguinho para trás no estilingue e solte para derrubar os jogos parados do backlog. Derrube todos com 3 lançamentos: cada lançamento que sobrar vira bônus.',
  ctl: [['↑ ↓ / analógico', 'mirar', 'pc'], ['Espaço / ✕', 'segure para a força, solte para lançar', 'pc'], ['Mouse', 'arraste para trás e solte', 'pc'], ['Esc', 'pausa', 'pc'],
    ['Arrastar', 'puxe para trás e solte', 'touch']],
  pad: null,
  rank: [['@carol', 26800], ['@duda', 19400], ['@rafa', 12300], ['@bia', 6900]],
  nota: 'o boné voou mais longe que eu',
  falas: [
    'Meu backlog tem 300 jogos. Eu resolvo do jeito certo: na voadora.',
    'Boné bem apertado, cabo de controle esticado. Física? Eu sou a física.',
    'Jogo parado só acorda no impacto. E o impacto sou eu kkkk',
    'Sobrou lançamento? Vira bônus. Eu nunca sobro, eu transbordo hahaha',
    'Não é bagunça, é speedrun de demolição.',
  ],
  init() {
    Object.assign(this, { t: 0, pt: 0, score: 0, ang: -.6, fase: 1, zerados: 0, fx: [], pops: [], acc: 0, calmT: 0, somT: 0 });
    this.carrega(1); this.pt = 1;
  },
  demo() { this.carrega(10); this.ang = -.5; this.pow = .8; this.kb = true; this.pt = 1; },
  carrega(n) {
    const def = n <= DB_FASES.length ? DB_FASES[n - 1] : null;
    const P = def ? dbMonta(def[1]) : dbAleatoria(n);
    this.nome = def ? def[0] : `Backlog sem fim ${n - DB_FASES.length}`;
    this.fase = n; this.left = 3; this.arbs = new Map(); this.ia = null; this.nomeT = 0;
    this.bs = [dbCorpo('chao', 160, DB_GY + 30, 640, 60)];
    for (const q of P) { const b = dbCorpo(q.k, q.x, q.y, q.w, q.h); if (b.alvo) b.hp = b.hp0 = b.hp0 + Math.min(50, (n - 1) * 5); this.bs.push(b); }
    this.ang = this.ang ?? -.6;
    this.prepara();
  },
  prepara() { Object.assign(this, { ph: 'mira', pt: 0, pow: 0, kb: false, kp: 0, drag: null, dragOk: !inp.drag, calmT: 0, limpoT: 0 }); },
  alvos() { let n = 0; for (const b of this.bs) if (b.alvo && !b.dead) n++; return n; },
  // posição do IAmiguinho puxado no estilingue
  puxado() { const d = 6 + this.pow * 30; return { x: DB_SL.x - Math.cos(this.ang) * d, y: DB_SL.y - Math.sin(this.ang) * d }; },
  vel() { return DB_V0 + this.pow * (DB_V1 - DB_V0); },
  lanca() {
    const p = this.puxado(), v = this.vel(), ia = dbCorpo('ia', p.x, p.y, 0, 0);
    ia.vx = Math.cos(this.ang) * v; ia.vy = Math.sin(this.ang) * v; ia.av = 3 + this.pow * 5;
    this.bs.push(ia); this.ia = ia; this.left--;
    this.ph = 'voo'; this.pt = 0; this.calmT = 0; this.kb = false; this.drag = null;
    beep(170, .22, 'square', .05, 520); setTimeout(() => beep(620, .08, 'triangle', .03, -200), 90);
  },
  // ---------- passo da física
  fisica(dt) {
    const bs = this.bs, inv = 1 / dt, arbs = new Map();
    for (const b of bs) { b.nc = 0; b.bb = dbCaixa(b); }
    // acorda quem está encostando em algo que se mexe (antes dos contatos, para o corpo acordado já ter apoio neste passo)
    for (const A of bs) {
      if (dbFixo(A) || dbVel(A) < DB_WAKE) continue;
      const a = A.bb;
      for (const B of bs) { if (!B.sleep) continue; const b = B.bb; if (a[0] <= b[2] + 2 && b[0] <= a[2] + 2 && a[1] <= b[3] + 2 && b[1] <= a[3] + 2) this.acorda(B); }
    }
    for (let i = 0; i < bs.length; i++) for (let k = i + 1; k < bs.length; k++) {
      let A = bs[i], B = bs[k];
      if (dbFixo(A) && dbFixo(B)) continue;
      const a = A.bb, b = B.bb;
      if (a[0] > b[2] + 1 || b[0] > a[2] + 1 || a[1] > b[3] + 1 || b[1] > a[3] + 1) continue;
      if (A.circ) [A, B] = [B, A];
      const cs = B.circ ? dbCaixaBola(A, B) : dbCaixaCaixa(A, B);
      if (!cs) continue;
      const key = A.id + ':' + B.id, old = this.arbs.get(key);
      if (old) for (const c of cs) { const o = old.cs.find((q) => q.key === c.key); if (o) { c.Pn = o.Pn; c.Pt = o.Pt; } }
      arbs.set(key, { b1: A, b2: B, cs, fr: Math.sqrt(A.fr * B.fr), e: Math.max(A.e, B.e) });
      A.nc += cs.length; B.nc += cs.length;
    }
    this.arbs = arbs;
    for (const b of bs) if (!dbFixo(b)) b.vy += DB_GRAV * dt;
    // pré-passo: massas efetivas, bias, impacto (dano) e partida morna com os impulsos do passo anterior
    const lista = [];
    for (const a of arbs.values()) {
      const { b1, b2 } = a, im1 = dbFixo(b1) ? 0 : b1.im, iI1 = dbFixo(b1) ? 0 : b1.iI, im2 = dbFixo(b2) ? 0 : b2.im, iI2 = dbFixo(b2) ? 0 : b2.iI;
      if (im1 + im2 === 0) continue;
      Object.assign(a, { im1, iI1, im2, iI2 }); lista.push(a);
      let imp = 0;
      for (const c of a.cs) {
        const r1x = c.px - b1.x, r1y = c.py - b1.y, r2x = c.px - b2.x, r2y = c.py - b2.y, nx = c.nx, ny = c.ny, tx = ny, ty = -nx;
        Object.assign(c, { r1x, r1y, r2x, r2y });
        const rn1 = r1x * nx + r1y * ny, rn2 = r2x * nx + r2y * ny, rt1 = r1x * tx + r1y * ty, rt2 = r2x * tx + r2y * ty;
        c.mn = 1 / (im1 + im2 + iI1 * (r1x * r1x + r1y * r1y - rn1 * rn1) + iI2 * (r2x * r2x + r2y * r2y - rn2 * rn2));
        c.mt = 1 / (im1 + im2 + iI1 * (r1x * r1x + r1y * r1y - rt1 * rt1) + iI2 * (r2x * r2x + r2y * r2y - rt2 * rt2));
        c.bias = Math.min(90, -DB_BETA * inv * Math.min(0, c.sep + DB_SLOP));
        const dvx = b2.vx - b2.av * r2y - b1.vx + b1.av * r1y, dvy = b2.vy + b2.av * r2x - b1.vy - b1.av * r1x, vn = dvx * nx + dvy * ny;
        if (vn < -60) c.bias = Math.max(c.bias, -a.e * vn);
        imp = Math.max(imp, -vn);
        const Px = c.Pn * nx + c.Pt * tx, Py = c.Pn * ny + c.Pt * ty;
        b1.vx -= im1 * Px; b1.vy -= im1 * Py; b1.av -= iI1 * (r1x * Py - r1y * Px);
        b2.vx += im2 * Px; b2.vy += im2 * Py; b2.av += iI2 * (r2x * Py - r2y * Px);
      }
      if (imp > DB_TH) this.impacto(a, imp);
    }
    for (let it = 0; it < DB_IT; it++) for (const a of lista) {
      const { b1, b2, im1, iI1, im2, iI2 } = a;
      for (const c of a.cs) {
        const { r1x, r1y, r2x, r2y, nx, ny } = c, tx = ny, ty = -nx;
        let dvx = b2.vx - b2.av * r2y - b1.vx + b1.av * r1y, dvy = b2.vy + b2.av * r2x - b1.vy - b1.av * r1x;
        let d = c.mn * (-(dvx * nx + dvy * ny) + c.bias); const p0 = c.Pn; c.Pn = Math.max(p0 + d, 0); d = c.Pn - p0;
        let Px = d * nx, Py = d * ny;
        b1.vx -= im1 * Px; b1.vy -= im1 * Py; b1.av -= iI1 * (r1x * Py - r1y * Px);
        b2.vx += im2 * Px; b2.vy += im2 * Py; b2.av += iI2 * (r2x * Py - r2y * Px);
        dvx = b2.vx - b2.av * r2y - b1.vx + b1.av * r1y; dvy = b2.vy + b2.av * r2x - b1.vy - b1.av * r1x;
        const mx = a.fr * c.Pn, t0 = c.Pt; c.Pt = clamp(t0 + c.mt * -(dvx * tx + dvy * ty), -mx, mx); d = c.Pt - t0;
        Px = d * tx; Py = d * ty;
        b1.vx -= im1 * Px; b1.vy -= im1 * Py; b1.av -= iI1 * (r1x * Py - r1y * Px);
        b2.vx += im2 * Px; b2.vy += im2 * Py; b2.av += iI2 * (r2x * Py - r2y * Px);
      }
    }
    for (const b of bs) {
      if (dbFixo(b)) continue;
      const sp = Math.hypot(b.vx, b.vy); if (sp > 900) { b.vx *= 900 / sp; b.vy *= 900 / sp; }
      b.av = clamp(b.av, -30, 30);
      if (b.circ && b.nc) { b.av *= 1 - 4 * dt; b.vx *= 1 - 1.4 * dt; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.ang += b.av * dt;
      // adormece quem ficou parado apoiado em alguma coisa
      if (b.nc && b.vx * b.vx + b.vy * b.vy < 36 && Math.abs(b.av) < .15) { b.slT += dt; if (b.slT > .45) { b.sleep = true; b.vx = b.vy = b.av = 0; } } else b.slT = 0;
    }
  },
  acorda(b) { if (b.st || !b.sleep) return; b.sleep = false; b.slT = 0; },
  impacto(a, s) {
    const { b1, b2 } = a, m1 = b1.st ? Infinity : b1.m, m2 = b2.st ? Infinity : b2.m, d = s - DB_TH;
    if (!b1.st) b1.hp -= d * (m2 === Infinity ? 1 : Math.min(1, 2 * m2 / (m1 + m2)));
    if (!b2.st) b2.hp -= d * (m1 === Infinity ? 1 : Math.min(1, 2 * m1 / (m1 + m2)));
    for (const b of [b1, b2]) if (b.k === 'ia' && s > 110) b.tonto = true;
    if (s > 130 && this.t - this.somT > .07) {
      this.somT = this.t; const k = b1.k === 'metal' || b2.k === 'metal' ? 'metal' : b1.k === 'tabua' || b2.k === 'tabua' ? 'tabua' : 'caixa', v = Math.min(.06, .015 + s / 9000);
      if (k === 'metal') beep(rand(480, 560), .07, 'square', v * .7, -220); else if (k === 'tabua') beep(rand(150, 190), .08, 'triangle', v * 1.4, -60); else beep(rand(230, 270), .05, 'square', v * .7, -90);
      if (s > 260) shake = Math.max(shake, .12);
    }
  },
  // tira um corpo do mundo e acorda quem estava encostado nele
  tira(b) {
    b.dead = true;
    for (const [k, a] of this.arbs) if (a.b1 === b || a.b2 === b) { this.acorda(a.b1 === b ? a.b2 : a.b1); this.arbs.delete(k); }
  },
  cacos(b, cores, n) { for (let i = 0; i < n; i++) this.fx.push({ x: b.x + rand(-b.hw, b.hw), y: b.y + rand(-b.hh, b.hh), vx: rand(-90, 90) + b.vx * .3, vy: rand(-150, -30) + b.vy * .2, c: pick(cores), s: pick([2, 2, 3]), t: 0, life: rand(.5, .9), g: 420 }); },
  poof(x, y, n = 10) { for (let i = 0; i < n; i++) { const a = rand(0, 6.28), v = rand(30, 80); this.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, c: pick(['#f6f7f9', '#d9dfe6', '#bfefff']), s: pick([3, 4]), t: 0, life: rand(.35, .6), g: -40 }); } },
  pop(x, y, s, c, big) { this.pops.push({ x, y, s, c, t: 0, big }); },
  quebra(b) {
    this.tira(b); const M = DB_MAT[b.k]; this.score += M.pts;
    this.cacos(b, b.k === 'caixa' ? [DB_CAPAS[b.sd % 7][0], DB_CAPAS[b.sd % 7][1], '#07050c'] : M.cores, b.k === 'metal' ? 14 : 10);
    this.pop(b.x, b.y - 4, `+${M.pts}`, '#e8f0ff');
    if (b.k === 'metal') { beep(900, .08, 'square', .04, -500); setTimeout(() => beep(300, .12, 'sawtooth', .04, -150), 50); } else beep(rand(120, 170), .14, 'sawtooth', .045, -70);
  },
  derrubaAlvo(b) {
    this.tira(b); this.score += DB_ALVO_PTS; this.zerados++;
    this.poof(b.x, b.y, 14);
    const c = b.k === 'bot' ? DB_BOTCOR[b.sd % DB_BOTCOR.length] : ['#d9d2c0', '#8a826e'];
    this.cacos(b, [c[0], c[1], '#ffd04a'], 6);
    this.pop(b.x, b.y - 14, pick(DB_ZERA), '#ffd04a', true); this.pop(b.x, b.y + 2, `+${DB_ALVO_PTS}`, '#f6f7f9');
    sfx.coin();
  },
  limpa() {
    for (const b of this.bs) {
      if (b.st || b.dead) continue;
      const fora = b.y > H + 40 || b.x < -40 || b.x > W + 40;
      if (b.k === 'ia') { if (fora) { this.tira(b); this.ia = null; } continue; }
      if (b.alvo) { if (b.hp <= 0 || fora || Math.abs(dbNorm(b.ang)) > 1.05) this.derrubaAlvo(b); continue; }
      if (b.hp <= 0) this.quebra(b); else if (fora) this.tira(b);
    }
    if (this.bs.some((b) => b.dead)) this.bs = this.bs.filter((b) => !b.dead);
  },
  // ---------- laço do jogo
  update(dt) {
    this.t += dt; this.pt += dt; this.nomeT += dt;
    this.acc += dt; let n = 0;
    while (this.acc >= DB_DT && n < 6) { this.fisica(DB_DT); this.acc -= DB_DT; n++; }
    if (n >= 6) this.acc = 0;
    this.limpa();
    let calmo = true;
    for (const b of this.bs) if (!dbFixo(b) && (Math.hypot(b.vx, b.vy) > 14 || Math.abs(b.av) > .5)) { calmo = false; break; }
    this.calmT = calmo ? this.calmT + dt : 0;
    for (const f of this.fx) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += f.g * dt; }
    this.fx = this.fx.filter((f) => f.t < f.life);
    for (const p of this.pops) p.t += dt;
    this.pops = this.pops.filter((p) => p.t < (p.big ? 1.3 : .9));
    const ph = this.ph;
    if (ph === 'mira') { this.upMira(dt); return false; }
    if (ph === 'voo') {
      if (!this.alvos()) { this.limpoT += dt; if (this.limpoT > 1.6 || (this.calmT > .3 && this.limpoT > .6)) this.zera(); return false; }
      if ((this.pt > .9 && this.calmT > .35) || this.pt > 8) this.fimTurno();
      return false;
    }
    if (ph === 'zerou') {
      const T0 = .9;
      if (this.bonus > 0 && this.pt > T0 + (this.left - this.bonus) * .45) { this.bonus--; this.score += DB_BONUS; this.pop(DB_SL.x + 6, DB_SL.y - 30, `+${DB_BONUS}`, '#ffd04a', true); sfx.coin(); }
      const fim = T0 + this.left * .45 + .6;
      if (this.pt > fim + 2 || (this.pt > fim && (pressedAny('Space', 'Enter') || inp.tap))) { this.carrega(this.fase + 1); sfx.start(); }
      return false;
    }
    if (ph === 'perdeu') return this.pt > 2.2;
    return false;
  },
  upMira(dt) {
    const btn = ['Space', 'Enter', 'KeyJ', 'KeyZ'];
    if (!inp.drag) this.dragOk = true;
    if (!this.drag) this.ang = clamp(this.ang + inp.ay * 1.1 * dt, -1.45, .35);
    if (inp.drag && this.dragOk && !this.kb) {
      const d = inp.drag, dx = d.x - d.x0, dy = d.y - d.y0, L = Math.hypot(dx, dy);
      this.drag = { L };
      if (L > 6) { this.ang = clamp(Math.atan2(-dy, -dx), -1.5, .5); this.pow = clamp((L - 6) / 52, 0, 1); }
      return;
    }
    if (this.drag) { const L = this.drag.L; this.drag = null; if (L > 14) this.lanca(); else this.pow = 0; return; }
    if (!this.kb && pressedAny(...btn)) { this.kb = true; this.kp = 0; }
    if (this.kb) {
      this.kp += dt; this.pow = dbTri(this.kp / 1.15);
      if (!isHeld(...btn)) this.lanca();
    }
  },
  fimTurno() {
    if (this.ia && !this.ia.dead) { this.poof(this.ia.x, this.ia.y); this.tira(this.ia); this.bs = this.bs.filter((b) => !b.dead); }
    this.ia = null;
    if (this.left > 0) { this.prepara(); return; }
    this.ph = 'perdeu'; this.pt = 0; sfx.hit();
  },
  zera() {
    if (this.ia && !this.ia.dead) { this.poof(this.ia.x, this.ia.y); this.tira(this.ia); this.bs = this.bs.filter((b) => !b.dead); }
    this.ia = null; this.ph = 'zerou'; this.pt = 0; this.bonus = this.left;
    sfx.big(); Music.jingle(JINGLE.comeco);
  },
  // ---------- desenho
  fundo(t) {
    const g = ctx.createLinearGradient(0, 0, 0, DB_GY); g.addColorStop(0, '#0a0e1b'); g.addColorStop(1, '#171c30'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, DB_GY);
    ctx.fillStyle = '#121729'; for (let x = 20; x < W; x += 40) ctx.fillRect(x, 50, 1, DB_GY - 58);
    // fita de LED que muda de cor e o brilho dela na parede
    const led = ['#ff5fa2', '#b07cff', '#5fd0ff', '#5fffc0'];
    for (let x = 0; x < W; x += 8) { ctx.fillStyle = led[(Math.floor(x / 8 + t * 3)) % 4]; ctx.fillRect(x, 46, 8, 2); }
    const gl = ctx.createLinearGradient(0, 48, 0, 100); gl.addColorStop(0, 'rgba(176,124,255,.16)'); gl.addColorStop(1, 'rgba(176,124,255,0)'); ctx.fillStyle = gl; ctx.fillRect(0, 48, W, 52);
    // janela com a cidade à noite
    ctx.fillStyle = '#07050c'; ctx.fillRect(10, 62, 84, 82); ctx.fillStyle = '#262d44'; ctx.fillRect(11, 63, 82, 80);
    const jg = ctx.createLinearGradient(0, 66, 0, 140); jg.addColorStop(0, '#0b1433'); jg.addColorStop(1, '#251d4a'); ctx.fillStyle = jg; ctx.fillRect(14, 66, 76, 74);
    ctx.fillStyle = '#e8ecf6'; for (const [sx, sy] of [[22, 72], [40, 80], [70, 70], [58, 90], [84, 84], [30, 96]]) ctx.fillRect(sx, sy, 1, 1);
    ctx.fillStyle = '#f2ecd0'; ctx.fillRect(72, 74, 8, 8); ctx.fillStyle = '#0b1433'; ctx.fillRect(75, 73, 6, 6);
    ctx.fillStyle = '#121633'; for (const [bx, bw, bh] of [[14, 12, 22], [26, 10, 32], [36, 14, 18], [50, 10, 28], [60, 16, 14], [76, 14, 26]]) ctx.fillRect(bx, 140 - bh, bw, bh);
    ctx.fillStyle = 'rgba(255,214,140,.55)'; for (const [wx, wy] of [[17, 122], [29, 112], [29, 124], [53, 118], [79, 120], [83, 128], [41, 130]]) ctx.fillRect(wx, wy, 2, 2);
    ctx.fillStyle = '#262d44'; ctx.fillRect(51, 66, 2, 74); ctx.fillRect(14, 102, 76, 2);
    ctx.fillStyle = '#2f3752'; ctx.fillRect(8, 144, 88, 4);
    // quadro com troféu
    ctx.fillStyle = '#07050c'; ctx.fillRect(108, 66, 38, 46); ctx.fillStyle = '#3a2c5c'; ctx.fillRect(110, 68, 34, 42); ctx.fillStyle = '#2a1f3f'; ctx.fillRect(113, 71, 28, 36);
    spr(TROFEU, 119, 79, 2);
    // prateleiras com caixas de jogo apagadas
    ctx.globalAlpha = .34;
    for (const [sy, n0] of [[100, 0], [146, 3]]) {
      let x = 172;
      for (let i = 0; i < 16 && x < 306; i++) { const k = (i * 5 + n0) % 7, w = 5 + ((i + n0) % 3), h = 22 - ((i * 3 + n0) % 4) * 2; ctx.fillStyle = DB_CAPAS[k][1]; ctx.fillRect(x, sy - h, w, h); ctx.fillStyle = DB_CAPAS[k][0]; ctx.fillRect(x + 1, sy - h + 3, w - 2, 2); x += w + 1; }
      ctx.fillStyle = '#5a4630'; ctx.fillRect(166, sy, 146, 3);
    }
    ctx.globalAlpha = 1;
    // rodapé e chão de tacos
    ctx.fillStyle = '#10131e'; ctx.fillRect(0, DB_GY - 8, W, 8); ctx.fillStyle = 'rgba(176,124,255,.18)'; ctx.fillRect(0, DB_GY - 8, W, 1);
    ctx.fillStyle = '#1d2233'; ctx.fillRect(0, DB_GY, W, H - DB_GY); ctx.fillStyle = '#2c3448'; ctx.fillRect(0, DB_GY, W, 1);
    ctx.fillStyle = '#151a28'; ctx.fillRect(0, DB_GY + 15, W, 1);
    for (let x = 0; x < W; x += 26) { ctx.fillRect(x, DB_GY + 1, 1, 14); ctx.fillRect(x + 13, DB_GY + 16, 1, 14); }
  },
  // linhas de rachadura (sempre as mesmas para cada peça)
  racha(b, w, h, x0, y0, k) {
    const r = (i) => { const v = Math.sin(b.sd * 12.9898 + i * 78.233) * 43758.5453; return v - Math.floor(v); };
    ctx.fillStyle = 'rgba(7,5,12,.85)';
    for (let q = 0; q < k; q++) {
      const lng = w >= h;
      let u = Math.floor(r(q * 7 + 1) * ((lng ? w : h) - 4)) + 2, v = lng ? (q ? h - 2 : 1) : (q ? w - 2 : 1);
      const L = Math.min(lng ? h : w, 9) + 3;
      for (let i = 0; i < L; i++) {
        if (lng) ctx.fillRect(x0 + u, y0 + v, 1, 1); else ctx.fillRect(x0 + v, y0 + u, 1, 1);
        u += r(q * 13 + i) < .5 ? -1 : 1; v += q ? -1 : 1;
        if (v < 1 || v > (lng ? h : w) - 2) break;
      }
    }
  },
  corpo(b, t) {
    const w = b.hw * 2, h = b.hh * 2, x0 = -b.hw, y0 = -b.hh, ang = dbNorm(b.ang);
    ctx.save();
    if (Math.abs(ang) < .03) ctx.translate(Math.round(b.x), Math.round(b.y)); else { ctx.translate(b.x, b.y); ctx.rotate(ang); }
    const R = (x, y, ww, hh, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, ww, hh); };
    if (b.k === 'caixa') {
      const [cc, cd, cl] = DB_CAPAS[b.sd % 7], v = b.sd % 3;
      R(x0, y0, w, h, '#07050c'); R(x0 + 1, y0 + 1, w - 2, h - 2, cc);
      if (h >= w) { R(x0 + 1, y0 + 1, 2, h - 2, cd); R(x0 + 4, y0 + 2, w - 6, 2, cl); R(x0 + 5, y0 + 6, w - 7, h - 10, cd); R(x0 + 6 + v, y0 + 8, 3, 3, cl); R(x0 + 6, y0 + h - 7, w - 9, 2, cc); }
      else { R(x0 + 1, y0 + 1, w - 2, 2, cd); R(x0 + 2, y0 + 4, 2, h - 6, cl); R(x0 + 6, y0 + 5, w - 9, h - 7, cd); R(x0 + 8 + v, y0 + 7, 3, 3, cl); }
      R(x0 + w - 3, y0 + 2, 1, 1, '#ffffff');
    } else if (b.k === 'tabua') {
      R(x0, y0, w, h, '#2a1a0e'); R(x0 + 1, y0 + 1, w - 2, h - 2, '#9a6a3c');
      if (w >= h) { R(x0 + 1, y0 + 1, w - 2, 1, '#b8844e'); R(x0 + 3 + (b.sd % 5), y0 + 3, Math.floor(w / 3), 1, '#7a4f2a'); R(x0 + Math.floor(w / 2) + 2, y0 + 2, Math.floor(w / 4), 1, '#7a4f2a'); R(x0 + 2, y0 + 2, 1, 1, '#d8dde4'); R(x0 + w - 3, y0 + 2, 1, 1, '#d8dde4'); }
      else { R(x0 + 1, y0 + 1, 1, h - 2, '#b8844e'); R(x0 + 3, y0 + 3 + (b.sd % 5), 1, Math.floor(h / 3), '#7a4f2a'); R(x0 + 2, y0 + Math.floor(h / 2) + 2, 1, Math.floor(h / 4), '#7a4f2a'); R(x0 + 2, y0 + 2, 1, 1, '#d8dde4'); R(x0 + 2, y0 + h - 3, 1, 1, '#d8dde4'); }
    } else if (b.k === 'metal') {
      R(x0, y0, w, h, '#07050c'); R(x0 + 1, y0 + 1, w - 2, h - 2, '#5b667a'); R(x0 + 1, y0 + 1, w - 2, 1, '#8b97ab'); R(x0 + 1, y0 + 1, 1, h - 2, '#8b97ab');
      R(x0 + 1, y0 + h - 2, w - 2, 1, '#3a4254'); R(x0 + w - 2, y0 + 1, 1, h - 2, '#3a4254');
      for (const [rx, ry] of [[2, 2], [w - 4, 2], [2, h - 4], [w - 4, h - 4]]) R(x0 + rx + 1, y0 + ry + 1, 1, 1, '#c3ccd8');
      if (w >= 12 && h >= 12) for (let i = 0; i < 3; i++) R(x0 + 5, y0 + Math.floor(h / 2) - 3 + i * 3, w - 10, 1, '#2a3040');
    } else if (b.k === 'bot') {
      const [o1, o2] = DB_BOTCOR[b.sd % DB_BOTCOR.length];
      spr(b.hp < b.hp0 ? BOT : DB_DORME, x0, y0, 2, false, { ...PAL, O: o1, o: o2 });
    } else if (b.k === 'jogo') {
      R(x0, y0, w, h, '#07050c'); R(x0 + 1, y0 + 1, w - 2, h - 2, '#d9d2c0'); R(x0 + 1, y0 + 1, 2, h - 2, '#8a826e'); R(x0 + 4, y0 + 2, w - 6, 3, '#7a8aa8');
      R(x0 + w - 5, y0 + 2, 1, 3, '#f6f7f9'); R(x0 + w - 3, y0 + 2, 1, 3, '#f6f7f9');
      const acordado = b.hp < b.hp0;
      R(x0 + 5, y0 + 9, 3, acordado ? 2 : 1, '#1a2230'); R(x0 + 10, y0 + 9, 3, acordado ? 2 : 1, '#1a2230');
      R(x0 + 5, y0 + 8, 3, 1, '#a89f88'); R(x0 + 10, y0 + 8, 3, 1, '#a89f88');
      R(x0 + 7, y0 + 14, 4, 1, '#1a2230'); R(x0 + 11, y0 + 13, 1, 1, '#1a2230');
    }
    if (b.hp < b.hp0 * .7 && b.hp0 < Infinity && !b.alvo) this.racha(b, w, h, x0, y0, b.hp < b.hp0 * .35 ? 2 : 1);
    ctx.restore();
  },
  estilingue(frente, px, py) {
    const pal = { K: '#07050c', S: '#2a2f3d', s: '#454c5e', P: '#c3ccd8', p: '#7a8496' };
    const cabo = (ax, ay) => {
      ctx.strokeStyle = '#07050c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(px, py); ctx.stroke();
      ctx.strokeStyle = '#262b36'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(px, py); ctx.stroke();
      const L = Math.hypot(px - ax, py - ay), n = Math.floor(L / 3); ctx.fillStyle = '#5a6278';
      for (let i = 1; i < n; i++) ctx.fillRect(Math.round(ax + (px - ax) * i / n), Math.round(ay + (py - ay) * i / n) - 1, 1, 1);
    };
    if (!frente) {
      // haste em Y com pontas de plugue
      ctx.fillStyle = pal.K; ctx.fillRect(42, 295, 9, 35); ctx.fillRect(35, 287, 23, 10); ctx.fillRect(35, 259, 8, 32); ctx.fillRect(50, 259, 8, 32);
      ctx.fillStyle = pal.S; ctx.fillRect(43, 296, 7, 34); ctx.fillRect(36, 288, 21, 8); ctx.fillRect(36, 264, 6, 26); ctx.fillRect(51, 264, 6, 26);
      ctx.fillStyle = pal.s; ctx.fillRect(43, 296, 2, 34); ctx.fillRect(36, 264, 2, 26); ctx.fillRect(51, 264, 2, 26);
      ctx.fillStyle = pal.P; ctx.fillRect(36, 260, 6, 4); ctx.fillRect(51, 260, 6, 4); ctx.fillStyle = pal.p; ctx.fillRect(38, 261, 2, 2); ctx.fillRect(53, 261, 2, 2);
      cabo(54, 264);
      spr(DB_PAD, Math.round(px - 7), Math.round(py - 4), 1, false, DB_PADPAL);
    } else cabo(39, 264);
  },
  draw(t = this.t) {
    this.fundo(t);
    const bs = this.bs || [];
    for (const b of bs) if (!b.st && b.k !== 'ia' && !b.dead) this.corpo(b, t);
    // Zzz dos jogos parados
    for (const b of bs) if (b.alvo && !b.dead && b.hp >= b.hp0) for (let k = 0; k < 2; k++) {
      const f = (t * .5 + (b.sd % 100) / 100 + k * .5) % 1;
      ctx.globalAlpha = Math.min(1, (1 - f) * 1.6); spr(DB_Z, Math.round(b.x + 6 + f * 8), Math.round(b.y - b.hh - 6 - f * 16), f > .45 ? 2 : 1, false, { Z: '#bfefff' });
    }
    ctx.globalAlpha = 1;
    // estilingue e IAmiguinho
    const mira = this.ph === 'mira', p = mira ? this.puxado() : DB_SL;
    const ent = mira ? clamp(this.pt / .3, 0, 1) : 1, py = p.y - (1 - ent) * (1 - ent) * 46;
    const bx = mira ? p.x - Math.cos(this.ang) * 10 : DB_SL.x, by = mira ? py - Math.sin(this.ang) * 10 + 6 : DB_SL.y + 4;
    this.estilingue(false, bx, by);
    this.estilingue(true, bx, by);
    if (mira) drawIA(Math.round(p.x - 14), Math.round(py - 16), 2, t, { fast: this.pow > .6 });
    if (this.ia && !this.ia.dead) { ctx.save(); ctx.translate(this.ia.x, this.ia.y); ctx.rotate(this.ia.ang); drawIA(-14, -16, 2, t, { dizzy: this.ia.tonto, fast: true }); ctx.restore(); }
    // trajetória curta (só enquanto mira)
    if (mira && ent >= 1) {
      const ativo = this.kb || (this.drag && this.drag.L > 6), pw = ativo ? this.pow : .55, v = DB_V0 + pw * (DB_V1 - DB_V0), q = { x: DB_SL.x - Math.cos(this.ang) * (6 + pw * 30), y: DB_SL.y - Math.sin(this.ang) * (6 + pw * 30) };
      for (let k = 1; k <= 12; k++) {
        const tt = k * .04, x = q.x + Math.cos(this.ang) * v * tt, y = q.y + Math.sin(this.ang) * v * tt + .5 * DB_GRAV * tt * tt;
        ctx.fillStyle = ativo ? `rgba(246,247,249,${1 - k / 14})` : `rgba(191,239,255,${.45 - k / 34})`; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
      }
      // barra de força (some quando não está puxando)
      if (ativo) {
        const fx = 22, fy = DB_GY + 12; ctx.fillStyle = '#07050c'; ctx.fillRect(fx - 1, fy - 1, 50, 6); ctx.fillStyle = '#1a2230'; ctx.fillRect(fx, fy, 48, 4);
        const ww = Math.round(this.pow * 48); ctx.fillStyle = this.pow > .8 ? '#e8443a' : this.pow > .45 ? '#ffd04a' : '#3fbf6a'; ctx.fillRect(fx, fy, ww, 4);
      }
    }
    for (const f of this.fx || []) { ctx.globalAlpha = Math.max(0, 1 - f.t / f.life); ctx.fillStyle = f.c; ctx.fillRect(Math.round(f.x), Math.round(f.y), f.s, f.s); }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#07050c'; ctx.lineJoin = 'round';
    for (const q of this.pops || []) {
      const L = q.big ? 1.3 : .9; ctx.globalAlpha = Math.min(1, (L - q.t) * 3); ctx.font = q.big ? '900 12px Archivo, sans-serif' : F_SM;
      const yy = Math.round(q.y - q.t * 22); ctx.strokeText(q.s, Math.round(q.x), yy); ctx.fillStyle = q.c; ctx.fillText(q.s, Math.round(q.x), yy);
    }
    ctx.globalAlpha = 1;
    // nome da fase no começo
    if (state === 'play' && this.ph === 'mira' && this.nomeT < 2.4 && this.left === 3) {
      ctx.globalAlpha = Math.min(1, (2.4 - this.nomeT) * 2); ctx.font = '900 13px Archivo, sans-serif'; ctx.strokeStyle = '#07050c'; ctx.lineWidth = 4;
      const s = `FASE ${this.fase} · ${this.nome.toUpperCase()}`; ctx.strokeText(s, W / 2, 70); ctx.fillStyle = '#ffd04a'; ctx.fillText(s, W / 2, 70); ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left'; ctx.lineJoin = 'miter';
    if (this.ph === 'zerou' && this.pt > .5) {
      const linhas = [[`FASE ${this.fase} ZERADA`, F_BIG, '#ffd04a']];
      if (this.left) linhas.push([`Bônus: ${this.left} × ${DB_BONUS}`, F_MID, '#e8f0ff']); else linhas.push(['Sem lançamento sobrando', F_MID, '#e8f0ff']);
      banner(linhas, 170);
    }
    if (this.ph === 'perdeu' && this.pt > .3) { const n = this.alvos(); banner([['O BACKLOG VENCEU', F_BIG, '#ff8a8a'], [`${n} ${n === 1 ? 'jogo parado ficou' : 'jogos parados ficaram'} na pilha`, F_MID, '#e8f0ff']], 170); }
  },
  hud() { return ['Pontos', this.score, `Fase ${this.fase} · ${this.left} ${this.left === 1 ? 'lançamento' : 'lançamentos'}`]; },
  overText() { return `Você chegou à fase ${this.fase} e derrubou ${this.zerados} ${this.zerados === 1 ? 'jogo parado' : 'jogos parados'}. Cada um vale ${DB_ALVO_PTS}, e cada lançamento que sobra numa fase zerada vale ${DB_BONUS}.`; },
};
ARCADE_NOVOS.push(dbJogo);
