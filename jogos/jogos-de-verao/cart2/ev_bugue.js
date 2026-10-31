/* ============================================================ prova nova: Corrida de bugue (31/10/2026)
   Dunas Brancas, vista de cima, 3 voltas contra 5 Amiguinhos de bugue, com mecânicas de corrida de kart.
   ✕ acelera e ○ freia (no celular acelera sozinho), ◀ ▶ viram, R1 (ou L1, □) segurado na curva derrapa: quanto mais tempo derrapando,
   maior o turbo ao soltar (faísca azul, depois laranja). R2 usa o item (RT no Xbox, ZR no Switch; V no teclado).
   2ª versão (31/10): pista mais larga, com muretas em toda a volta; bater de lado perde pouco, de frente perde muito.
   3ª versão (31/10): física de carro (motor que perde força perto do máximo, freio, arrasto, pneus com limite de aderência
   que deixam escorregar de lado, giro com inércia, volante que vira menos em alta, pulo com gravidade, batidas com impulso
   e torção), caixas de item que somem uma a uma, até 2 itens guardados e esteiras de turbo na pista.
   Largada com turbo: acelerar bem no "Vai!". Pulos nas dunas: pousar alinhado dá um turbo curto.
   A lagoa é um atalho por um corredor de água (lento sem turbo).
   Caixas de item: quem está mais atrás ganha itens melhores. Itens: bola de praia (quica reto e acerta quem está na frente),
   balão d'água teleguiado (persegue quem está logo à frente), protetor solar (poça escorregadia atrás), água de coco (turbo),
   guarda-sol (escudo contra um ataque) e onda (rara, só para os últimos: deixa os três primeiros lentos).
   Quem é acertado rodopia e perde velocidade, mas continua na corrida.
   Copa das Dunas (31/10): 3 pistas (Lagoa Azul; Duna do Farol, com grampos e areia fofa por dentro deles e atalho de areia fofa;
   Desce-Duna, com descidas que embalam, subidas que seguram e atalho com salto por cima da duna). No menu: Corrida (na pista
   escolhida no botão "Pista") ou Copa das Dunas (as 3 seguidas, pontos 10, 8, 6, 4, 2 e 1; classificação entre as corridas).
   31/10 (ajustes do dono): bugues 15% mais rápidos; as 3 pistas com o dobro do tamanho, mais elaboradas (chicane, grampos, laços,
   dois atalhos na Lagoa Azul e no Desce-Duna); vácuo atrás dos adversários (mais velocidade e, com 1,5 s, um turbo curto).
   31/10 (ajustes do dono, 2ª rodada): volante mais suave (vira aos poucos, menos em alta); itens para trás (↓ + item; no celular, "Atrás");
   projéteis que passam por quem está invencível não acertam e o balão segue para quem estiver na frente; batida na mureta quica.
   Arte provisória: tudo desenhado pelo jogo (bugues de cima, com o IAmiguinho e os Amiguinhos de capacete). */
// 31/10: velocidade +15% a pedido do dono (era vmax 200, motor 330, freio 560, aderência 760/340, turbo +80)
// 31/10: pista mais larga a pedido do dono, +20% duas vezes (meia largura de 62 para 74 e depois 89)
const BG = { voltas: 3, hw: 89, r: 8, vmax: 230, eng: 380, brake: 640, grip: 900, gripD: 400, wb: 22, water: 1.9, boostV: 92, sw: 36, Z: .82, g: 900 };
if (typeof Music !== 'undefined' && Music.songs.patins) Music.songs.bugue = Music.songs.patins;
FALA.intro.bugue = [
  'Corrida de bugue nas Dunas Brancas! Cinco Amiguinhos, três voltas e uma lagoa no meio do caminho.',
  'Derrapa na curva, segura até a faísca ficar laranja e solta. É o segredo dos campeões. E agora é seu também.',
  'Ficou para trás? Os itens melhoram. A onda é minha favorita.',
];
FALA.bgBoa = ['Turbo laranja! Senti o vento no boné.', 'Acertei a bola de praia! Desculpa, Amiguinho.', 'Primeiro lugar! A duna é minha casa.'];
FALA.bgRuim = ['Balão d\'água na nuca. Refrescante, pelo menos.', 'Escorreguei no protetor solar. Pelo menos não vou me queimar.', 'Caí na areia fofa. Ela abraçou o bugue.'];
// pistas da Copa das Dunas: a linha do meio (fechada), alisada. Cada pista tem um atalho (corredor reto por dentro de uma curva),
// rampas, fileiras de caixas e esteiras de turbo. Índices contam pontos da linha alisada (24 por ponto do desenho).
const bgLine = (P) => {
  const n = P.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    for (let k = 0; k < 24; k++) { const t = k / 24, t2 = t * t, t3 = t2 * t; out.push([0, 1].map((j) => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
  }
  let L = 0; out[0].s = 0; for (let i = 1; i < out.length; i++) { L += Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]); out[i].s = L; }
  out.L = L + Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]);
  return out;
};
const BG_TRACKS = [
  // Lagoa Azul (2ª versão, o dobro do tamanho): chicane na reta de baixo, curvão da direita, laço de cima, o S do meio e dois atalhos pela água
  { id: 'lagoa', name: 'Lagoa Azul', fala: 'Lagoa Azul: duas lagoas no caminho. Com turbo, corta por dentro da água.',
    pts: [[492,  2050],  [1148,  2066],  [1763,  2025],  [2091,  1911],  [2378,  2034],  [2665,  1911],  [2993,  1984],  [3280,  1804],  [3346,  1476],  [3157,  1189],  [3198,  861],  [3321,  533],  [3132,  246],  [2747,  262],  [2583,  533],  [2337,  722],  [1968,  672],  [1763,  426],  [1435,  312],  [1066,  385],  [918,  697],  [1132,  968],  [1517,  1066],  [1927,  1189],  [2009,  1517],  [1722,  1681],  [1271,  1624],  [820,  1476],  [451,  1410],  [213,  1599],  [246,  1911]],
    sc: [{ a: 540, b: 624, kind: 'agua' }, { a: 250, b: 330, kind: 'agua' }], ramps: [40,  215,  640], boxes: [165,  250,  352,  455,  598,  700],
    pads: [{ i: 10, o: 0 }, { i: 100, o: -22 }, { i: 190, o: 20 }, { i: 280, o: -18 }, { i: 395, o: 24 }, { i: 520, o: -20 }, { i: 610, o: 18 }, { i: 690, o: 0 }], fofa: [], slopes: [] },
  // Duna do Farol (2ª versão): cinco grampos, o farol entre as colunas, o mar ao norte; areia fofa por dentro dos grampos e um atalho de areia fofa
  { id: 'farol', name: 'Duna do Farol', fala: 'Duna do Farol: cinco grampos. Por dentro tem areia fofa, então nada de cortar caminho.',
    pts: [[800,  2300],  [1700,  2320],  [2700,  2300],  [3450,  2250],  [3800,  1950],  [3750,  1500],  [3750,  900],  [3650,  550],  [3400,  400],  [3150,  550],  [3100,  900],  [3100,  1400],  [2950,  1700],  [2700,  1750],  [2500,  1550],  [2450,  1000],  [2400,  600],  [2150,  350],  [1600,  320],  [1100,  380],  [880,  680],  [1150,  1000],  [1700,  1150],  [1880,  1500],  [1550,  1800],  [1000,  1780],  [650,  1500],  [400,  1700],  [420,  2100]],
    sc: [{ a: 264, b: 348, kind: 'fofa' }], ramps: [40,  365,  440], boxes: [70,  150,  240,  400,  505,  600],
    pads: [{ i: 10, o: 0 }, { i: 120, o: -22 }, { i: 175, o: 20 }, { i: 250, o: -18 }, { i: 330, o: 24 }, { i: 420, o: -20 }, { i: 530, o: 18 }, { i: 650, o: 0 }], fofa: [192,  312,  480,  552,  624], slopes: [], farol: [2780, 900] },
  // Desce-Duna (2ª versão): retas longas com descidas que embalam e subidas que seguram; um atalho de areia fofa e um salto por cima da duna
  { id: 'desce', name: 'Desce-Duna', fala: 'Desce-Duna: na descida o bugue voa, na subida ele sofre. E tem um salto por cima da duna.',
    pts: [[600,  2700],  [1800,  2760],  [3100,  2720],  [4000,  2560],  [4450,  2150],  [4350,  1650],  [4550,  1150],  [4400,  650],  [3900,  350],  [3200,  380],  [2700,  650],  [2150,  450],  [1550,  320],  [950,  420],  [650,  850],  [950,  1250],  [1650,  1200],  [2300,  1400],  [2450,  1900],  [2000,  2200],  [1300,  2150],  [700,  1950],  [350,  2150],  [380,  2500]],
    sc: [{ a: 318, b: 362, kind: 'fofa' }, { a: 390, b: 465, kind: 'fofa', ramp: true }], ramps: [36,  140,  290,  470], boxes: [60,  180,  250,  340,  420,  530],
    pads: [{ i: 12, o: 0 }, { i: 110, o: -22 }, { i: 160, o: 20 }, { i: 232, o: -18 }, { i: 300, o: 24 }, { i: 380, o: -20 }, { i: 450, o: 18 }, { i: 520, o: 0 }], fofa: [],
    slopes: [{ a: 0, b: 60, s: 1 }, { a: 75, b: 125, s: -1 }, { a: 145, b: 170, s: -1 }, { a: 192, b: 215, s: 1 }, { a: 265, b: 310, s: 1 }, { a: 385, b: 410, s: -1 }, { a: 455, b: 505, s: 1 }] },
];
// ângulo máximo das rodas: em alta o volante vira bem menos (era .62 parado e .32 em alta)
const bgDmax = (sp) => .56 - .34 * clamp(sp / 230, 0, 1);
const bgWrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
let BG_T, BG_LINE, BG_SCS, BG_RAMPS, BG_BOXES, BG_PADS, BG_FOFA, BG_SLOPE;
function bgLoad(ti) {
  const T = BG_TRACKS[ti]; if (BG_T === T) return; BG_T = T;
  T.line = T.line || bgLine(T.pts); BG_LINE = T.line; BG_RAMPS = T.ramps.map((i) => ({ i })); BG_BOXES = T.boxes; BG_PADS = T.pads;
  const n = BG_LINE.length;
  // os atalhos: corredores retos com lagoa (água) ou areia fofa no meio
  BG_SCS = T.sc.map((c) => { const A = BG_LINE[c.a], B = BG_LINE[c.b], len = Math.hypot(B[0] - A[0], B[1] - A[1]); return { ...c, A, B, len, x: (A[0] + B[0]) / 2, y: (A[1] + B[1]) / 2, rx: len / 2 - 40, ry: 30, ang: Math.atan2(B[1] - A[1], B[0] - A[0]), walls: c.walls }; });
  // areia fofa por dentro das curvas: o lado de dentro sai do sentido da virada
  BG_FOFA = T.fofa.map((i) => { const p = BG_LINE[(i - 8 + n) % n], q = BG_LINE[i], r = BG_LINE[(i + 8) % n], cr = (q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0]), a = Math.atan2(r[1] - p[1], r[0] - p[0]), sd = cr > 0 ? 1 : -1; return { x: q[0] - Math.sin(a) * BG.hw * .65 * sd, y: q[1] + Math.cos(a) * BG.hw * .65 * sd, r: 24, i, sd }; });
  BG_SLOPE = new Int8Array(n); for (const z of T.slopes) for (let i = z.a; i <= z.b; i++) BG_SLOPE[i % n] = z.s;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const q of BG_LINE) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
  T.box = { x0, y0, s: Math.min(80 / (x1 - x0), 46 / (y1 - y0)) };
}
bgLoad(0);
const BG_PTSC = [10, 8, 6, 4, 2, 1]; // pontos da Copa por posição
const bugue = {
  id: 'bugue', name: 'Corrida de bugue', tag: 'Dunas Brancas · 3 voltas', wide: true, hi: true, paint: true, two: false, dur: 0,
  med: [1600, 2200, 3000], medText: ['chegar em 3º', 'chegar em 2º', 'vencer'], medShort: ['3º lugar', '2º lugar', '1º lugar'], ia: 2200, nota: 'chegou em 2º, mas com estilo',
  desc: '3 voltas contra 5 Amiguinhos: derrapagem com turbo, pulos nas dunas e itens de praia. Corrida avulsa em 3 pistas ou a Copa das Dunas.',
  steps: () => [
    touch ? 'O bugue acelera sozinho; “Freio” freia. ◀ ▶ viram. Acelere bem no “Vai!” para largar com turbo.' : 'Espaço acelera e X freia; ◀ ▶ viram. Acelere bem no “Vai!” para largar com turbo.',
    `Na curva, segure ${touch ? '“Derrapa”' : 'C'} para derrapar: a faísca fica azul e depois laranja; soltando, vem o turbo. Pousar alinhado depois de um pulo também dá turbo. Colado atrás de outro bugue, você pega o vácuo: fica mais rápido e, segurando ali, sai com um turbo.`,
    `Pegue as caixas e use o item com ${touch ? '“Item” (ou “Atrás”, para jogar para trás)' : 'V (R2 no controle); com ↓ apertado, o item vai para trás'}. Quem está atrás ganha itens melhores. As muretas seguram o bugue, mas bater de frente perde muito: tire o pé ou derrape nas curvas. Cada pista tem um atalho que só compensa com turbo.`,
    'Copa das Dunas: Lagoa Azul, Duna do Farol e Desce-Duna em seguida. Cada chegada vale pontos (10, 8, 6, 4, 2 e 1), e quem somar mais leva a Copa.',
  ],
  hint: () => '',
  gp: 'Controle: analógico vira · ✕ acelera · ○ freia · R1 (ou L1, □) derrapa · R2 usa o item (analógico para baixo + R2 joga para trás) · Start pausa',
  ctl: [['◀ ▶', 'virar'], ['Espaço', 'acelerar', 'kb'], ['X', 'frear', 'kb'], ['C', 'derrapar (segure)', 'kb'], ['V', 'usar item', 'kb'], ['↓ + V', 'item para trás', 'kb'], ['Freio', 'frear', 'touch'], ['Derrapa', 'derrapar (segure)', 'touch'], ['Item', 'usar item', 'touch'], ['Atrás', 'item para trás', 'touch'], ['Esc', 'pausa', 'kb']],
  pad: { dirs: 'lr', a: 'Freio', b: 'Derrapa', c: 'Item', e: 'Atrás' }, bannerY: 40,
  trackSel: 0, cup: null, cupNew: false,
  init() {
    if (this.cupNew) { this.cupNew = false; this.cup = { i: 0, pts: [0, 0, 0, 0, 0, 0], res: [] }; }
    if (!this.cup || this.cup.i === 0) this.cupRes = null;
    bgLoad(this.cup ? this.cup.i : this.trackSel); this.tag = `Dunas Brancas · ${BG_T.name}`;
    const st = BG_LINE[30], nx = BG_LINE[32][0] - BG_LINE[28][0], ny = BG_LINE[32][1] - BG_LINE[28][1], nl = Math.hypot(nx, ny), h = Math.atan2(ny, nx);
    const cols = ['#ffd84a', '#ff6ba8', '#6bcbff', '#9be37a', '#ffb347', '#3b6fd6'], names = ['Amarelo', 'Rosa', 'Azul', 'Verde', 'Laranja', 'Você'];
    this.K = [0, 1, 2, 3, 4, 5].map((i) => { const row = Math.floor(i / 2), side = i % 2 ? 1 : -1, back = (5 - i) * 0 + row * 34 + 20; return { i, me: i === 5, x: st[0] - nx / nl * back + -ny / nl * side * 17, y: st[1] - ny / nl * back + nx / nl * side * 17, h, d: h, s: 0, vx: 0, vy: 0, w: 0, z: 0, vz: 0, lean: 0, slip: 0, padT: 0, lap: 0, seg: 26, prog: 0, cp: 0, drift: 0, dsg: 0, chg: 0, boost: 0, air: 0, spin: 0, shield: 0, items: [], roll: 0, slow: 0, fin: 0, col: cols[i] || '#3b6fd6', name: names[i] || 'Você', ai: { skill: .93 + i * .016, lane: (Math.random() - .5) * 67, hold: 0 }, pud: {} }; });
    // o jogador larga em último (como num kart), os Amiguinhos na frente
    this.me = this.K[5]; this.me.col = '#3b6fd6'; this.me.name = 'Você';
    Object.assign(this, { t: 0, score: 0, race: -3.2, started: false, fx: [], proj: [], puds: [], boxes: BG_BOXES.flatMap((i) => [-2, -1, 0, 1, 2].map((j) => ({ i, j, t: 0 }))), skids: [], wave: 0, done: false, doneT: 0, inter: null, order: [], camX: this.me.x, camY: this.me.y, turbos: 0, laranjas: 0, acertos: 0, levou: 0, vacuos: 0, startOk: null, rank: 6 });
  },
  hud() {
    const m = this.me; const IT = { bola: 'Bola de praia', balao: 'Balão d\'água', protetor: 'Protetor', coco: 'Água de coco', guarda: 'Guarda-sol', onda: 'Onda' };
    return [['Posição', `${this.rank}º`, this.rank === 1], ['Volta', `${Math.min(BG.voltas, m.lap + 1)} de ${BG.voltas}`], ['Itens', m.items.length ? m.items.map((q) => (q.roll > 0 ? '…' : IT[q.k])).join(' + ') : '—', m.items.length > 0 && !(m.items[0].roll > 0)], this.cup ? ['Copa', `${this.cup.i + 1} de 3 · ${this.cup.pts[5]} pts`] : ['Tempo', this.started ? `${Math.floor(this.race / 60)}:${String(Math.floor(this.race % 60)).padStart(2, '0')}` : '—']];
  },
  stats() {
    if (this.cupRes) { const c = this.cupRes; return [`Copa das Dunas: ${c.pos}º lugar com ${c.pts} pontos`, `Corridas: ${c.res.map((r, i) => `${BG_TRACKS[i].name} ${r}º`).join(' · ')}`, `${this.turbos} turbos de derrapagem (${this.laranjas} laranja) · ${this.acertos} acertos com itens · acertado ${this.levou}×`]; }
    return [`Chegou em ${this.rank}º lugar em ${Math.floor(this.race / 60)}:${String(Math.floor(this.race % 60)).padStart(2, '0')}`, `${this.turbos} turbos de derrapagem (${this.laranjas} laranja) · ${this.vacuos} no vácuo · ${this.acertos} acertos com itens`, `Foi acertado ${this.levou} vez${this.levou === 1 ? '' : 'es'}`]; },
  demo() { if (this.cup) { this.cup = null; this.init(); } this.started = true; this.race = 5; for (const k of this.K) { k.vx = Math.cos(k.h) * 150; k.vy = Math.sin(k.h) * 150; } },
  menuDOM() {
    const ev = this;
    setButtons(['Corrida', () => { ev.cupNew = false; ev.cup = null; start(); }], ['Copa das Dunas', () => { ev.cupNew = true; start(); say('Copa das Dunas! Três pistas seguidas e pontos em cada chegada. Começa na Lagoa Azul.'); }]);
    const b2 = $('b-alt2'); b2.hidden = false; b2.textContent = `Pista: ${BG_TRACKS[ev.trackSel].name}`;
    actAlt2 = () => { ev.trackSel = (ev.trackSel + 1) % BG_TRACKS.length; ev.init(); ev.demo(); showTitle(); renderHud(); say(BG_TRACKS[ev.trackSel].fala); setTimeout(() => $('b-alt2').focus({ preventScroll: true }), 0); };
    return true;
  },
  // ---------- pista: ponto mais perto da linha do meio (procura perto do último)
  near(k) {
    const L = BG_LINE, n = L.length; let best = k.seg, bd = Infinity;
    for (let j = -14; j <= 14; j++) { const i = (k.seg + j + n) % n, d = Math.hypot(L[i][0] - k.x, L[i][1] - k.y); if (d < bd) { bd = d; best = i; } }
    if (bd > 120) for (let i = 0; i < n; i += 3) { const d = Math.hypot(L[i][0] - k.x, L[i][1] - k.y); if (d < bd) { bd = d; best = i; } }
    return [best, bd];
  },
  inPool(L, x, y) { const c = Math.cos(-L.ang), sn = Math.sin(-L.ang), dx = x - L.x, dy = y - L.y, u = (dx * c - dy * sn) / L.rx, v = (dx * sn + dy * c) / L.ry; return u * u + v * v < 1; },
  // corredor de atalho mais perto: [distância até a linha do meio dele, ponto mais perto, o corredor]
  scNear(x, y) { let best = [Infinity, 0, 0, null]; for (const c of BG_SCS) { const r = this.segDist(x, y, c.A, c.B); if (r[0] < best[0]) best = [r[0], r[1], r[2], c]; } return best; },
  ground(x, y) { for (const c of BG_SCS) if (this.inPool(c, x, y)) return c.kind; for (const f of BG_FOFA) if (Math.hypot(x - f.x, y - f.y) < f.r) return 'fofa'; return null; },
  ord() { return [...this.K].sort((a, b) => (b.fin ? 1e9 - b.fin : b.lap * BG_LINE.L + b.prog) - (a.fin ? 1e9 - a.fin : a.lap * BG_LINE.L + a.prog)); },
  update(dt, I) {
    this.t += dt;
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < (f.life || .6));
    if (this.inter) return this.interStep(dt, I);
    if (this.done) {
      this.doneT += dt; this.race += dt; this.stepAll(dt, null);
      if (this.doneT > 3.2 && this.cup) { this.cupScore(); return false; }
      return this.doneT > 3.2;
    }
    // contagem: 3, 2, 1, Vai! (acelerar no Vai dá turbo; cedo demais, o motor afoga)
    if (!this.started) {
      const was = this.race; this.race += dt;
      for (const n of [-3, -2, -1]) if (was < n && this.race >= n) { pop(String(-n), W / 2, 80, '#fff6d6', true); beep(440, .12, 'square', .05); }
      const acc = touch ? !I.a : I.a;
      if (acc && this.startOk === null && this.race > -.5) this.startOk = this.race;
      if (acc && this.startOk === null && this.race > -1.6 && this.race <= -.5) this.startOk = 'cedo';
      if (this.race >= 0) {
        this.started = true; this.race = 0; pop('Vai!', W / 2, 80, '#ffd166', true); beep(880, .3, 'square', .06);
        if (typeof this.startOk === 'number') { this.me.boost = .9; this.turbos++; pop('Largada com turbo!', W / 2, 100, '#ffd166'); }
        else if (this.startOk === 'cedo') { this.me.slow = .8; pop('Afogou!', W / 2, 100, '#ffb3c8'); }
        for (const k of this.K) if (!k.me && Math.random() < .5) k.boost = .6;
      }
      this.cam(dt); return false;
    }
    this.race += dt;
    this.stepAll(dt, I);
    this.cam(dt);
    return false;
  },
  // pontos da corrida que acabou (quem não chegou conta pela posição na pista)
  cupScore() {
    const c = this.cup, o = this.ord(), add = [0, 0, 0, 0, 0, 0];
    o.forEach((k, r) => { add[k.i] = BG_PTSC[r]; c.pts[k.i] += BG_PTSC[r]; }); c.res.push(this.rank);
    const tab = [...this.K].sort((a, b) => c.pts[b.i] - c.pts[a.i] || o.indexOf(a) - o.indexOf(b));
    this.inter = { t: 0, add, tab, last: c.i === BG_TRACKS.length - 1 };
    if (this.inter.last) { const pos = tab.indexOf(this.me) + 1; this.cupRes = { pos, pts: c.pts[5], res: c.res.slice() }; this.score = [3000, 2200, 1600, 1100, 700, 400][pos - 1]; this.rank = pos; }
    sfx.point();
  },
  interStep(dt, I) {
    const it = this.inter; it.t += dt;
    const go = it.t > 1 && (I.pa || I.pb || I.pc || I.pe || (touch && I.a && !this.interA)); this.interA = !!I.a;
    if (!go) return false;
    if (it.last) { this.cup = null; this.cupNew = true; this.inter = null; return true; } // “Jogar de novo” começa outra Copa
    const keep = { pts: this.cup.pts, t: [this.turbos, this.laranjas, this.acertos, this.levou, this.vacuos] };
    this.cup.i++; this.init(); [this.turbos, this.laranjas, this.acertos, this.levou, this.vacuos] = keep.t; say(BG_T.fala);
    return false;
  },
  cam(dt) { const m = this.me, la = 34; this.camX += (m.x + Math.cos(m.d) * la * clamp(m.s / 150, 0, 1) - this.camX) * Math.min(1, dt * 6); this.camY += (m.y + Math.sin(m.d) * la * clamp(m.s / 150, 0, 1) - this.camY) * Math.min(1, dt * 6); },
  stepAll(dt, I) {
    const ordered = this.ord();
    ordered.forEach((k, r) => { k.pos = r + 1; });
    this.rank = this.me.fin ? this.rank : this.me.pos;
    for (const k of this.K) {
      const c = k.me && I && !k.fin ? this.ctlOf(I) : this.aiCtl(k, dt);
      this.drive(k, c, dt);
    }
    // bugues se empurram
    for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) {
      const A = this.K[a], B = this.K[b]; if (A.z > 4 || B.z > 4) continue; const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
      if (d < 16 && d > .01) { const p = (16 - d) / 2, nx = dx / d, ny = dy / d; A.x -= nx * p; A.y -= ny * p; B.x += nx * p; B.y += ny * p;
        const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny; if (rv < 0) { const j = -1.5 * rv / 2; A.vx -= j * nx; A.vy -= j * ny; B.vx += j * nx; B.vy += j * ny; const tw = j * .012; A.w -= tw * Math.sign(Math.cos(A.h) * ny - Math.sin(A.h) * nx); B.w += tw * Math.sign(Math.cos(B.h) * ny - Math.sin(B.h) * nx); if ((A.me || B.me) && j > 25) beep(220, .05, 'square', .03, -40); } }
    }
    this.items(dt);
    if (this.wave > 0) this.wave -= dt;
  },
  // controle: ✕ acelera, ○ freia, R1/L1 (ou □) derrapa, R2 usa o item (RT no Xbox, ZR no Switch: o mesmo botão 7 do padrão)
  gamepad() { const ps = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [], g = ps[0]; if (!g) return {}; const bt = (i) => !!g.buttons[i]?.pressed || (g.buttons[i]?.value || 0) > .4; return { r2: bt(7), sh: bt(5) || bt(4) || bt(2) }; },
  ctlOf(I) {
    const g = this.gamepad(), r2 = !!g.r2, item = (r2 && !this.r2was) || !!codeHeld.KeyV && !this.vwas || (touch && (I.pc || I.pe)); this.r2was = r2; this.vwas = !!codeHeld.KeyV;
    // volante (31/10, pedido do dono: curvas leves viravam demais): o volante vai virando aos poucos enquanto ◀ ▶ estão apertados
    // (um toque curto mexe pouco) e volta rápido ao soltar; a resposta é suave no começo (curva |x|^1,6), boa para o analógico
    const raw = I.ax || 0, st0 = this.st || 0, grow = Math.sign(raw) === Math.sign(st0 || raw) && Math.abs(raw) > Math.abs(st0);
    this.st = st0 + clamp(raw - st0, -(grow ? 3.2 : 7) * DT, (grow ? 3.2 : 7) * DT);
    const sv = Math.sign(this.st) * Math.pow(Math.abs(this.st), 1.6);
    return { steer: Math.abs(raw) < .05 && Math.abs(this.st) < .1 ? 0 : sv, acc: touch ? !I.a : I.a, brake: touch ? I.a : I.b, drift: touch ? I.b : (!!codeHeld.KeyC || !!g.sh), use: item, dir: (touch ? I.pe : I.d || (I.ay || 0) > .5) ? -1 : (!touch && (I.u || (I.ay || 0) < -.5)) ? 1 : 0 };
  },
  // ---------- dirigir: física de carro (motor, arrasto, aderência lateral dos pneus, giro com inércia, pulo com gravidade)
  drive(k, c, dt) {
    const [seg, dist] = this.near(k); k.seg = seg;
    // progresso na volta (com pontos de controle para não valer cortar caminho por fora)
    const sNow = BG_LINE[seg].s, q = Math.floor(sNow / BG_LINE.L * 8);
    if (k.prog > BG_LINE.L * .85 && sNow < BG_LINE.L * .15 && k.cp === 7) { k.lap++; k.cp = 0; if (k.me && k.lap < BG.voltas) { pop(k.lap === BG.voltas - 1 ? 'Última volta!' : `Volta ${k.lap + 1}`, W / 2, 70, '#fff6d6', true); sfx.point(); } if (k.lap >= BG.voltas && !k.fin) this.finish(k); }
    else if (q !== 0 && q > k.cp && q - k.cp <= 2) k.cp = q;
    k.prog = sNow;
    const air = k.z > 0 || k.vz > 0, gnd = air ? null : this.ground(k.x, k.y), water = gnd === 'agua', fofa = gnd === 'fofa', slope = BG_SLOPE[seg];
    k.gnd = gnd;
    k.boost = Math.max(0, k.boost - dt); k.slow = Math.max(0, k.slow - dt); k.shield = Math.max(0, k.shield - dt); k.padT = Math.max(0, k.padT - dt);
    k.inv = Math.max(0, (k.inv || 0) - dt); k.wallT = Math.max(0, (k.wallT || 0) - dt); k.bnc = Math.max(0, (k.bnc || 0) - dt);
    // direção certa da pista aqui (para a recuperação e para sair da mureta)
    const T0 = BG_LINE[seg], T1 = BG_LINE[(seg + 3) % BG_LINE.length], tang = Math.atan2(T1[1] - T0[1], T1[0] - T0[0]);
    if (k.spin > 0) { k.spin -= dt; c = { steer: 0, acc: false, brake: false, drift: false, use: c.use }; if (k.spin <= 0) k.rec = .85; }
    // recuperação depois do rodopio: o bugue se endireita sozinho para a frente da pista e acelera (sem poder ser acertado)
    if (k.rec > 0) {
      k.rec -= dt; const A = BG_LINE[(seg + 10) % BG_LINE.length], want = Math.atan2(A[1] - k.y, A[0] - k.x);
      k.h += clamp(bgWrap(want - k.h), -7 * dt, 7 * dt); k.w = 0; c = { steer: 0, acc: true, brake: false, drift: false, use: false };
      const sp0 = Math.hypot(k.vx, k.vy); k.vx = Math.cos(k.h) * sp0; k.vy = Math.sin(k.h) * sp0;
    }
    // encostado na mureta ou de costas para a pista, devagar: acelerar já vira o bugue para a frente da pista (o lado escolhido ajuda)
    const back = Math.abs(bgWrap(tang - k.h)) > 1.9;
    if (!(k.rec > 0) && c.acc && Math.hypot(k.vx, k.vy) < 70 && (k.wallT > 0 || back) && !(k.z > 0)) {
      const P = BG_LINE[(seg + 8) % BG_LINE.length], aim = Math.atan2(P[1] - k.y, P[0] - k.x); k.h += clamp(bgWrap(aim + c.steer * .5 - k.h), -3.2 * dt, 3.2 * dt); k.w *= .5;
      if (k.wallT > 0 && k.wn) { k.vx -= k.wn[0] * 60 * dt; k.vy -= k.wn[1] * 60 * dt; }
    }
    // eixos do bugue: para a frente (f) e para o lado (r)
    const fx = Math.cos(k.h), fy = Math.sin(k.h), rx = -fy, ry = fx;
    let vl = k.vx * fx + k.vy * fy, vt = k.vx * rx + k.vy * ry; const sp = Math.hypot(k.vx, k.vy);
    let vmax = BG.vmax * (k.me ? 1 : k.ai.skill * (k.ai.rubber || 1)); if (k.boost > 0) vmax += BG.boostV;
    if (k.slow > 0 || (this.wave > 0 && k.pos <= 3 && this.waveBy !== k)) vmax *= .45;
    // vácuo: logo atrás de outro bugue, andando na mesma direção, o ar fica mais leve. Quanto mais tempo no vácuo, mais rápido;
    // depois de 1,5 s, o bugue sai com um turbo curto (o estilingue)
    let lead = null;
    if (!air && sp > 110) for (const o of this.K) { if (o === k || o.z > 4 || o.s < 80) continue; const dx = o.x - k.x, dy = o.y - k.y, d = Math.hypot(dx, dy); if (d < 20 || d > 140) continue; if (Math.abs(bgWrap(Math.atan2(dy, dx) - k.d)) < .2 + 6 / d && Math.cos(o.d - k.d) > .8) { lead = o; break; } }
    k.draft = lead ? Math.min(1.5, (k.draft || 0) + dt) : Math.max(0, (k.draft || 0) - dt * 2.5);
    const dft = clamp((k.draft - .2) / .6, 0, 1); vmax *= 1 + .14 * dft;
    if (lead && k.draft >= 1.5) { k.boost = Math.max(k.boost, .6); k.draft = .4; this.fx.push({ k: 'vento', x: k.x, y: k.y, a: k.d, t: 0, life: .5 }); if (k.me) { this.vacuos++; pop('Vácuo!', W / 2, 90, '#e8f6ff'); beep(260, .25, 'sawtooth', .03, 500); } }
    // ladeira: na descida o bugue embala, na subida o motor sofre
    if (slope > 0) vmax *= 1.13; else if (slope < 0) vmax *= .86;
    if (!air) {
      // motor e freio (o motor perde força perto da velocidade máxima)
      if (c.acc) vl += BG.eng * (k.boost > 0 ? 1.8 : 1) * (slope > 0 ? 1.25 : 1) * (1 + .3 * dft) * clamp(1 - vl / vmax, -1.5, 1) * dt;
      else if (c.brake) vl -= (vl > 0 ? BG.brake : 160) * dt;
      else vl -= Math.sign(vl) * Math.min(Math.abs(vl), (slope > 0 ? 15 : 70 - 40 * dft) * dt);
      vl = Math.max(-60, vl);
      if (water && k.boost <= 0) { vl *= 1 - BG.water * dt; vt *= 1 - BG.water * dt; }
      if (fofa && k.boost <= 0) { vl *= 1 - 3.6 * dt; vt *= 1 - 2 * dt; }
      // pneus: seguram o escorregão de lado até o limite de aderência (derrapando ou rodopiando, seguram menos)
      const grip = (k.spin > 0 ? 200 : k.drift ? BG.gripD : BG.grip) * (water ? .4 : 1), cut = clamp(vt, -grip * dt, grip * dt);
      k.slide = Math.abs(vt) > grip * dt * 1.6; vt -= cut; k.lean += (cut / dt / BG.grip * -2.2 - k.lean) * Math.min(1, dt * 8);
      // direção: o volante vira menos em alta; o giro desejado é limitado pela aderência (sai de frente se entrar rápido demais)
      const dmax = bgDmax(sp);
      let wt;
      if (c.drift && !k.drift && Math.abs(c.steer) > .3 && vl > 115) { k.drift = 1; k.dsg = Math.sign(c.steer); k.chg = 0; k.vz = 70; k.z = .01; }
      if (k.drift && (!c.drift || vl < 70)) {
        if (k.chg >= 1.7) { k.boost = Math.max(k.boost, 1.1); if (k.me) { this.turbos++; this.laranjas++; pop('Turbo laranja!', W / 2, 90, '#ffb347'); talk(FALA.bgBoa, .15); } }
        else if (k.chg >= .85) { k.boost = Math.max(k.boost, .55); if (k.me) { this.turbos++; pop('Turbo!', W / 2, 90, '#8fdcff'); } }
        k.drift = 0; k.chg = 0;
      }
      if (k.spin > 0) wt = k.spinDir * 11;
      else if (k.drift) { wt = k.dsg * (vl / 106) * (1 + .6 * c.steer * k.dsg); if (Math.abs(k.slip) > .12) k.chg += dt; }
      else { const vs = Math.sign(vl || 1) * Math.max(Math.abs(vl), c.acc || c.brake ? 38 : 0); wt = vs * Math.tan(c.steer * dmax) / BG.wb; const lim = grip * 1.1 / Math.max(40, sp); wt = clamp(wt, -lim, lim); }
      k.w += (wt - k.w) * Math.min(1, dt * (k.spin > 0 ? 6 : k.drift ? 4.5 : 10));
    } else {
      // no ar: sem pneu nem motor; dá para girar um pouco
      k.w += (c.steer * 1.2 - k.w) * Math.min(1, dt * 2);
    }
    k.h += k.w * dt;
    k.vx = fx * vl + rx * vt; k.vy = fy * vl + ry * vt;
    k.x += k.vx * dt; k.y += k.vy * dt; k.s = Math.hypot(k.vx, k.vy); k.d = k.s > 1 ? Math.atan2(k.vy, k.vx) : k.h; k.roll += vl * dt;
    k.slip = k.s > 30 ? bgWrap(k.d - k.h) : 0;
    // pulo: altura com gravidade; pousar alinhado dá turbo, torto perde embalo
    if (k.z > 0 || k.vz > 0) {
      k.vz -= BG.g * dt; k.z += k.vz * dt;
      if (k.z <= 0) { k.z = 0; const big = k.vz < -200; k.vz = 0; k.sq = .25; if (big) { if (Math.abs(k.slip) < .25) { k.boost = Math.max(k.boost, .45); if (k.me) { this.turbos++; pop('Pouso alinhado!', W / 2, 90, '#8fdcff'); } } else { k.vx *= .72; k.vy *= .72; } this.fx.push({ k: 'pó', x: k.x, y: k.y, t: 0, life: .5 }); } }
    }
    k.sq = Math.max(0, (k.sq || 0) - dt);
    this.walls(k);
    // rampas nas dunas e esteiras de turbo
    for (const sc of BG_SCS) if (!air && k.s > 95 && sc.ramp) { const R = this.scRamp(sc), dx = k.x - R.x, dy = k.y - R.y, u = dx * Math.cos(R.a) + dy * Math.sin(R.a), v = -dx * Math.sin(R.a) + dy * Math.cos(R.a); if (Math.abs(u) < 9 && Math.abs(v) < BG.sw && Math.cos(k.d - R.a) > .5) { k.vz = (160 + (k.s - 95) * .9) * 1.3; k.z = .01; k.drift = 0; } }
    if (!air && k.s > 95) for (const r of BG_RAMPS) if (Math.abs(seg - r.i) <= 1 && dist < BG.hw - 4) { k.vz = 160 + (k.s - 95) * .9; k.z = .01; k.drift = 0; break; }
    if (!air && !k.padT) for (const pd of BG_PADS) { const P = this.padPos(pd), dx = k.x - P.x, dy = k.y - P.y, u = dx * Math.cos(P.a) + dy * Math.sin(P.a), v = -dx * Math.sin(P.a) + dy * Math.cos(P.a); if (Math.abs(u) < 17 && Math.abs(v) < 11) { k.boost = Math.max(k.boost, .8); k.padT = .6; if (k.me) beep(520, .12, 'sawtooth', .04, 400); this.fx.push({ k: 'caixa', x: P.x, y: P.y, t: 0, life: .4 }); } }
    // poeira, marcas de pneu e faíscas da derrapagem
    if (k.s > (fofa ? 20 : 70) && !air && Math.random() < (k.drift || k.slide || fofa ? .7 : .22)) this.fx.push({ k: water ? 'água' : fofa ? 'fofa' : 'pó', x: k.x - fx * 9, y: k.y - fy * 9, t: 0, life: .5 });
    if (!air && (k.drift || k.slide) && k.s > 60) for (const sd of [-1, 1]) this.skids.push([k.x - fx * 7 + rx * sd * 6, k.y - fy * 7 + ry * sd * 6, this.t]);
    if (this.skids.length > 900) this.skids.splice(0, this.skids.length - 900);
    if (k.drift && k.chg >= .85 && Math.random() < .6) this.fx.push({ k: k.chg >= 1.7 ? 'faísca2' : 'faísca', x: k.x - fx * 8 + (Math.random() - .5) * 8, y: k.y - fy * 8 + (Math.random() - .5) * 8, t: 0, life: .25 });
    // itens: até dois; usa o primeiro
    if (c.use && k.items.length && !(k.items[0].roll > 0)) this.useItem(k, c.dir || 0);
    for (const it of k.items) if (it.roll > 0) { it.roll -= dt; if (it.roll <= 0 && k.me) beep(990, .06, 'square', .04); }
  },
  scRamp(L) { return { x: L.A[0] + Math.cos(L.ang) * (BG.hw + 22), y: L.A[1] + Math.sin(L.ang) * (BG.hw + 22), a: L.ang }; },
  padPos(pd) { const p = BG_LINE[pd.i % BG_LINE.length], q = BG_LINE[(pd.i + 2) % BG_LINE.length], a = Math.atan2(q[1] - p[1], q[0] - p[0]); return { x: p[0] - Math.sin(a) * pd.o, y: p[1] + Math.cos(a) * pd.o, a }; },
  // bordas: a pista (e o corredor da lagoa) tem muretas; bater de lado perde pouco, bater de frente perde muito
  segDist(px, py, A, B) { const vx = B[0] - A[0], vy = B[1] - A[1], t = clamp(((px - A[0]) * vx + (py - A[1]) * vy) / (vx * vx + vy * vy), 0, 1), qx = A[0] + vx * t, qy = A[1] + vy * t; return [Math.hypot(px - qx, py - qy), qx, qy]; },
  walls(k) {
    if (k.z > 6) return;
    const [seg, d] = this.near(k), L = BG_LINE[seg], lim = BG.hw - BG.r, [ds, qx, qy, scC] = this.scNear(k.x, k.y), lim2 = BG.sw - BG.r;
    if (d <= lim || ds <= lim2) return;
    const useMain = d - lim < ds - lim2, cx = useMain ? L[0] : qx, cy = useMain ? L[1] : qy, lm = useMain ? lim : lim2;
    const dx = k.x - cx, dy = k.y - cy, dd = Math.hypot(dx, dy) || 1, nx = dx / dd, ny = dy / dd;
    k.x = cx + nx * lm; k.y = cy + ny * lm; k.wallT = .2; k.wn = [nx, ny];
    const vn = k.vx * nx + k.vy * ny;
    if (vn > 0) {
      // batida (31/10, pedido do dono: o bugue travava na mureta): o bugue quica para longe da mureta, perde velocidade conforme
      // o ângulo (de raspão perde pouco, de frente até metade) e sai alinhado com a pista, sem precisar virar
      const sp0 = Math.hypot(k.vx, k.vy), sn = clamp(vn / Math.max(1, sp0), 0, 1), tx = -ny, ty = nx;
      // “para a frente” é o sentido da pista ou, dentro do atalho, o sentido do corredor
      const T0 = BG_LINE[seg], T1 = BG_LINE[(seg + 3) % BG_LINE.length], trk = useMain || !scC ? [T1[0] - T0[0], T1[1] - T0[1]] : [Math.cos(scC.ang), Math.sin(scC.ang)], hd = [Math.cos(k.h), Math.sin(k.h)];
      const dh = hd[0] * tx + hd[1] * ty, sg = Math.abs(dh) > .5 ? Math.sign(dh) : Math.sign(trk[0] * tx + trk[1] * ty || 1);
      const beta = .22 + .3 * sn, dx2 = tx * sg * Math.cos(beta) - nx * Math.sin(beta), dy2 = ty * sg * Math.cos(beta) - ny * Math.sin(beta);
      const sp1 = k.bnc > 0 ? Math.max(Math.abs(k.vx * tx + k.vy * ty), 40) : Math.max(60, sp0 * (1 - .5 * sn));
      k.vx = dx2 * sp1; k.vy = dy2 * sp1;
      if (!(k.bnc > 0)) { const want = Math.atan2(dy2, dx2); k.h += bgWrap(want - k.h) * .75; k.w = bgWrap(want - k.h) * 3; k.sq = .18; k.bnc = .3; }
      k.x -= nx * 1.5; k.y -= ny * 1.5; k.drift = 0; k.slip = 0;
      k.s = Math.hypot(k.vx, k.vy); k.d = Math.atan2(k.vy, k.vx);
      if (vn > 35) { this.fx.push({ k: 'batida', x: k.x + nx * BG.r, y: k.y + ny * BG.r, t: 0, life: .35 }); if (k.me) { shake = Math.min(.25, vn / 400); beep(150, .06, 'triangle', .04 + Math.min(.04, vn / 4000), -40); } }
    }
  },
  finish(k) {
    k.fin = this.race + .0001;
    if (k.me) {
      this.rank = 1 + this.K.filter((q) => q.fin && q !== k).length; this.done = true; this.doneT = 0;
      this.score = [3000, 2200, 1600, 1100, 700, 400][this.rank - 1];
      pop(`Chegou em ${this.rank}º!`, W / 2, 70, this.rank === 1 ? '#ffd166' : '#fff6d6', true); if (this.rank === 1) { sfx.big(); talk(FALA.bgBoa, .8); } else { sfx.point(); talk(this.rank > 3 ? FALA.bgRuim : FALA.bgBoa, .5); }
    }
  },
  // ---------- Amiguinhos: seguem a linha da pista com uma faixa própria, derrapam nas curvas e usam itens
  aiCtl(k, dt) {
    const L = BG_LINE, n = L.length, A = k.ai, sl = L.L / n, look = Math.round((8 + k.s / 22) * 14.7 / sl), t = L[(k.seg + look) % n], t2 = L[(k.seg + look + 2) % n];
    const nx = -(t2[1] - t[1]), ny = t2[0] - t[0], nl = Math.hypot(nx, ny) || 1; let lane = A.lane + Math.sin(this.t * .3 + k.i) * 8;
    // areia fofa por dentro da curva que vem: abre por fora
    for (const f of BG_FOFA) { const ds = (f.i - k.seg + n) % n; if (ds < 260 / sl) lane = -f.sd * 30; }
    let tx = t[0] + nx / nl * clamp(lane, -BG.hw + 18, BG.hw - 18), ty = t[1] + ny / nl * clamp(lane, -BG.hw + 18, BG.hw - 18);
    for (const f of BG_FOFA) { const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy) || 1; if (d < f.r + 18) { tx += dx / d * (f.r + 18 - d); ty += dy / d * (f.r + 18 - d); } }
    // no corredor da lagoa: segue até a saída dele
    const [dm] = this.near(k).slice(1), [dsc, , , cIn] = this.scNear(k.x, k.y), inSc = dm > BG.hw - 4 && dsc < BG.sw;
    // com turbo (ou água de coco na mão), às vezes entra no atalho
    let dA = 99;
    for (const c of BG_SCS) { const d = (c.a - k.seg + n) % n; if (d > 3 && d < 16 && A.scAt !== c.a + k.lap * 1e4) { A.scAt = c.a + k.lap * 1e4; A.sc = (k.boost > .3 || k.items.some((q) => q.k === 'coco' && !(q.roll > 0))) && Math.random() < .7 ? c : null; } }
    if (A.sc) { dA = (A.sc.a - k.seg + n) % n; if (((k.seg - A.sc.b + n) % n) < 60 || dA > 20) A.sc = null; }
    const scGo = !!A.sc && !inSc && dA < 16, tg = inSc ? cIn : A.sc;
    // indo para o atalho: mira primeiro a boca do corredor (direto no fim dele, raspava na quina da mureta); dentro, a saída
    let gx = tx, gy = ty;
    if (inSc && tg) { gx = tg.B[0]; gy = tg.B[1]; }
    else if (scGo && tg) { const ex = tg.A[0] + Math.cos(tg.ang) * (BG.hw + 40), ey = tg.A[1] + Math.sin(tg.ang) * (BG.hw + 40); gx = ex; gy = ey; }
    if (scGo && dA < 6 && k.boost <= 0 && k.items[0] && k.items[0].k === 'coco' && !(k.items[0].roll > 0)) A.hold = 99;
    let e = Math.atan2(gy - k.y, gx - k.x) - k.h; e = Math.atan2(Math.sin(e), Math.cos(e));
    // fora da faixa (cortando a curva por dentro ou abrindo demais): corrige de volta para ela
    if (!inSc && !scGo) { const P0 = L[k.seg], P1 = L[(k.seg + 2) % n], qx = -(P1[1] - P0[1]), qy = P1[0] - P0[0], ql = Math.hypot(qx, qy) || 1, cur = ((k.x - P0[0]) * qx + (k.y - P0[1]) * qy) / ql;
      e -= clamp((cur - clamp(lane, -BG.hw + 18, BG.hw - 18)) / BG.hw, -1, 1) * .45; }
    // preso (parado de cara na mureta): dá ré virando para o outro lado
    if (k.s < 22 && k.spin <= 0 && this.started) A.stuck = (A.stuck || 0) + dt; else A.stuck = 0;
    if (A.stuck > .6 && !A.rev) A.rev = .9;
    if (A.rev > 0) { A.rev -= dt; return { steer: -Math.sign(e || 1), acc: false, brake: true, drift: false, use: false }; }
    // curva forte à frente: derrapa
    const a1 = L[(k.seg + 10) % n], a2 = L[(k.seg + 22) % n], a3 = L[(k.seg + 34) % n], turn = Math.atan2(Math.sin(Math.atan2(a3[1] - a2[1], a3[0] - a2[0]) - Math.atan2(a2[1] - a1[1], a2[0] - a1[0])), Math.cos(Math.atan2(a3[1] - a2[1], a3[0] - a2[0]) - Math.atan2(a2[1] - a1[1], a2[0] - a1[0])));
    if (!A.dr && Math.abs(turn) > .35 && k.s > 120 && Math.random() < .03) A.dr = 1.0 + Math.random() * .9;
    if (A.dr) A.dr = Math.max(0, A.dr - dt);
    // equilíbrio: quem dispara na frente do jogador alivia um pouco; quem fica muito para trás aperta
    const me = this.me, gap = (k.lap * BG_LINE.L + k.prog) - (me.lap * BG_LINE.L + me.prog);
    A.rubber = gap > 500 ? .93 : gap < -500 ? 1.06 : 1;
    // item: segura um pouco e usa quando faz sentido
    let use = false, dir = 0;
    if (k.items.length && !(k.items[0].roll > 0)) {
      A.hold += dt; const it = k.items[0].k, front = this.K.find((q) => q.pos === k.pos - 1), back = this.K.find((q) => q.pos === k.pos + 1);
      if (it === 'guarda' || it === 'onda' || it === 'coco' && Math.abs(turn) < .2) use = A.hold > .5;
      else if (it === 'bola') use = front && Math.hypot(front.x - k.x, front.y - k.y) < 220 && Math.abs(Math.atan2(Math.sin(Math.atan2(front.y - k.y, front.x - k.x) - k.h), Math.cos(Math.atan2(front.y - k.y, front.x - k.x) - k.h))) < .35;
      else if (it === 'balao') use = A.hold > 1 && !!(front || back);
      // para trás: bola em quem vem colado logo atrás; balão no de trás quando não há ninguém na frente
      if (!use && it === 'bola' && back && Math.hypot(back.x - k.x, back.y - k.y) < 170 && Math.abs(bgWrap(Math.atan2(back.y - k.y, back.x - k.x) - k.h - Math.PI)) < .35) { use = true; dir = -1; }
      if (use && it === 'balao' && !front) dir = -1;
      else if (it === 'protetor') use = back && Math.hypot(back.x - k.x, back.y - k.y) < 120;
      if (A.hold > 8) use = true;
      if (A.hold >= 99) use = it === 'coco';
      if (use) A.hold = 0;
    }
    // velocidade para a curva que vem (raio estimado pela virada da pista à frente)
    let vt = BG.vmax + 40;
    for (let j = 6; j <= 60; j += 6) { const o = Math.round(j * 14.7 / sl), b1 = L[(k.seg + o) % n], b2 = L[(k.seg + o + 12) % n], b3 = L[(k.seg + o + 24) % n];
      const tw = Math.abs(bgWrap(Math.atan2(b3[1] - b2[1], b3[0] - b2[0]) - Math.atan2(b2[1] - b1[1], b2[0] - b1[0]))), R = Math.hypot(b3[0] - b1[0], b3[1] - b1[1]) / 2 / Math.max(.02, tw);
      const need = Math.atan(BG.wb / R), vs = need >= .56 ? 60 : clamp((.56 - need) / .34, 0, 1.4) * 230, vc = Math.min(Math.sqrt(BG.grip * .9 * R), vs * 1.05 + (A.dr ? 40 : 0)) * (A.dr ? 1.12 : 1), d = Math.max(0, j * 14.7 - 30); vt = Math.min(vt, Math.sqrt(vc * vc + 2 * 380 * d)); }
    return { steer: clamp(e * 2.4 - k.w * .12, -1, 1), acc: k.s < vt + 6, brake: k.s > vt + 45, drift: A.dr > 0 && Math.abs(e) > .05, use, dir };
  },
  // ---------- itens
  items(dt) {
    for (const b of this.boxes) {
      if (b.t > 0) { b.t -= dt; continue; }
      const L = BG_LINE[b.i], L2 = BG_LINE[(b.i + 2) % BG_LINE.length], nx = -(L2[1] - L[1]), ny = L2[0] - L[0], nl = Math.hypot(nx, ny), bx = L[0] + nx / nl * b.j * 31, by = L[1] + ny / nl * b.j * 31;
      for (const k of this.K) if (k.z < 6 && Math.hypot(k.x - bx, k.y - by) < 12) { b.t = 2.5; if (k.items.length < 2) { k.items.push({ k: this.rollItem(k), roll: .8 }); if (k.me) beep(660, .05, 'square', .04, 300); } this.fx.push({ k: 'caixa', x: bx, y: by, t: 0 }); break; }
    }
    for (const p of this.proj) {
      p.t += dt;
      if (p.k === 'balao' && p.tg && !p.tg.fin) { const a = Math.atan2(p.tg.y - p.y, p.tg.x - p.x); p.vx += (Math.cos(a) * 250 - p.vx) * dt * 3; p.vy += (Math.sin(a) * 250 - p.vy) * dt * 3; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === 'bola') { const [sg, d] = this.near(p); p.seg = sg; const [ds] = this.scNear(p.x, p.y); if (d > BG.hw - 5 && ds > BG.sw - 5) { const L = BG_LINE[sg], nx = p.x - L[0], ny = p.y - L[1], nl = Math.hypot(nx, ny) || 1, vn = (p.vx * nx + p.vy * ny) / nl; if (vn > 0) { p.vx -= 2 * vn * nx / nl; p.vy -= 2 * vn * ny / nl; } p.x = L[0] + nx / nl * (BG.hw - 5); p.y = L[1] + ny / nl * (BG.hw - 5); } }
      if (p.k === 'balao' && p.tg && (p.tg.fin || (p.pass && p.pass.has(p.tg)))) p.tg = null;
      for (const k of this.K) if (k !== p.by || p.t > .35) if (!k.fin && Math.hypot(k.x - p.x, k.y - p.y) < 12) {
        if (k.inv > 0 || k.rec > 0 || k.spin > 0 || (p.pass && p.pass.has(k))) {
          if (!p.pass) p.pass = new Set(); if (!p.pass.has(k) && p.k === 'balao' && p.tg === k) { p.tg = this.K.find((q) => q.pos === k.pos - 1 && q !== p.by && !q.fin) || null; p.t = Math.min(p.t, 1.5); }
          p.pass.add(k); continue;
        } this.hit(k, p.by, p.k === 'bola' ? 'bola de praia' : 'balão d\'água'); p.dead = true; this.fx.push({ k: p.k === 'balao' ? 'água' : 'pó', x: p.x, y: p.y, t: 0, life: .5 }); break; }
      if (p.t > (p.k === 'balao' ? 4.5 : 3.5)) p.dead = true;
    }
    this.proj = this.proj.filter((p) => !p.dead);
    for (const u of this.puds) { u.t += dt; for (const k of this.K) if (k.z < 4 && !u.used && !(k.inv > 0 || k.rec > 0 || k.spin > 0) && Math.hypot(k.x - u.x, k.y - u.y) < 13 && (k !== u.by || u.t > 1)) { u.used = true; this.hit(k, u.by, 'protetor solar'); } }
    this.puds = this.puds.filter((u) => !u.used && u.t < 25);
  },
  rollItem(k) {
    const r = Math.random(), pos = k.pos || 6;
    if (pos <= 1) return r < .4 ? 'bola' : r < .8 ? 'protetor' : 'guarda';
    if (pos <= 3) return r < .3 ? 'bola' : r < .5 ? 'protetor' : r < .7 ? 'guarda' : r < .85 ? 'coco' : 'balao';
    if (pos >= 5 && r < .1) return 'onda';
    return r < .4 ? 'coco' : r < .7 ? 'balao' : r < .85 ? 'bola' : 'guarda';
  },
  useItem(k, dir = 0) {
    const it = k.items.shift().k, c = Math.cos(k.h), sn = Math.sin(k.h);
    if (it === 'coco') { k.boost = Math.max(k.boost, 1.3); if (k.me) pop('Água de coco!', W / 2, 90, '#9be37a'); beep(300, .2, 'sawtooth', .04, 300); }
    else if (it === 'guarda') { k.shield = 9; beep(700, .1, 'triangle', .04, 200); }
    // protetor: cai atrás; com ↑, é jogado longe para a frente
    else if (it === 'protetor') { const f = dir > 0 ? 110 : -16; this.puds.push({ x: k.x + c * f, y: k.y + sn * f, t: 0, by: k }); beep(200, .1, 'triangle', .04, -100); }
    // bola: para a frente quica reto; para trás sai rolando contra quem vem atrás
    else if (it === 'bola') { const v = dir < 0 ? -170 : Math.max(k.s, 0) + 210; this.proj.push({ k: 'bola', x: k.x + c * 12 * (dir < 0 ? -1 : 1), y: k.y + sn * 12 * (dir < 0 ? -1 : 1), vx: c * v, vy: sn * v, t: 0, by: k, seg: k.seg }); beep(500, .08, 'square', .04, -100); }
    // balão: persegue quem está logo à frente; para trás, persegue quem vem logo atrás
    else if (it === 'balao') { const tg = this.K.find((q) => q.pos === k.pos + (dir < 0 ? 1 : -1)) || null, v = dir < 0 ? -90 : k.s + 80; this.proj.push({ k: 'balao', x: k.x - (dir < 0 ? c * 12 : 0), y: k.y - (dir < 0 ? sn * 12 : 0), vx: c * v, vy: sn * v, t: 0, by: k, tg, seg: k.seg }); beep(800, .12, 'triangle', .04, -200); }
    else if (it === 'onda') { this.wave = 2.2; this.waveBy = k; pop('Onda!', W / 2, 70, '#6bcbff', true); beep(150, .5, 'sawtooth', .05, -60); }
  },
  hit(k, by, what) {
    if (k.inv > 0 || k.rec > 0 || k.spin > 0) return;
    if (k.shield > 0) { k.shield = 0; this.fx.push({ k: 'escudo', x: k.x, y: k.y, t: 0, life: .5 }); return; }
    k.spin = .9; k.spinDir = Math.random() < .5 ? -1 : 1; k.drift = 0; k.vx *= .45; k.vy *= .45; k.inv = .9 + .85 + .6;
    if (k.me) { this.levou++; pop(`Acertado: ${what}!`, W / 2, 90, '#ffb3c8'); sfx.crash(); talk(FALA.bgRuim, .3); }
    else if (by && by.me) { this.acertos++; pop('Acertou!', W / 2, 90, '#bfefff'); sfx.point(); }
  },
  // ---------- desenho (provisório)
  draw(tt) {
    const Z = BG.Z, vw = W / Z, vh = H / Z;
    // dunas brancas com sombras compridas de fim de tarde
    const TH = { lagoa: '#f4ecd8', farol: '#f1e6cf', desce: '#f6e7cc' }[BG_T.id];
    R(0, 0, W, H, TH);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(Z, Z); ctx.translate(-this.camX, -this.camY);
    if (BG_T.id === 'farol') this.drawSea(tt, vw, vh);
    for (let gx = Math.floor((this.camX - vw) / 120) * 120; gx < this.camX + vw; gx += 120) for (let gy = Math.floor((this.camY - vh) / 100) * 100; gy < this.camY + vh; gy += 100) {
      const hsh = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453, r = hsh - Math.floor(hsh);
      if (BG_T.id === 'farol' && gy < BG_T.box.y0 - 76) continue;
      const big = BG_T.id === 'desce' ? 1.7 : 1;
      ctx.fillStyle = 'rgba(190,160,120,.22)'; ctx.beginPath(); ctx.ellipse(gx + r * 60 + 14 * big, gy + r * 40 + 8 * big, (34 + r * 20) * big, (12 + r * 8) * big, -.4, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,250,.6)'; ctx.beginPath(); ctx.ellipse(gx + r * 60, gy + r * 40, (30 + r * 18) * big, (10 + r * 7) * big, -.4, 0, TAU); ctx.fill();
      if (r > .55) { ctx.fillStyle = '#7fb069'; for (let j = 0; j < 5; j++) R(gx + 70 + j * 3 - r * 10, gy + 60 + Math.sin(j) * 3, 2, 3 + (j % 2), '#7fb069'); }
    }
    // pista: muretas (zebras vermelhas e brancas), areia batida, marcas de pneu
    const off = (d) => { ctx.beginPath(); BG_LINE.forEach((p, i) => { const q = BG_LINE[(i + 1) % BG_LINE.length], nx = -(q[1] - p[1]), ny = q[0] - p[0], nl = Math.hypot(nx, ny) || 1, x = p[0] + nx / nl * d, y = p[1] + ny / nl * d; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); };
    const path = () => off(0);
    ctx.lineJoin = 'round'; path(); ctx.strokeStyle = 'rgba(120,90,50,.25)'; ctx.lineWidth = BG.hw * 2 + 22; ctx.stroke();
    path(); ctx.strokeStyle = '#dcc596'; ctx.lineWidth = BG.hw * 2; ctx.stroke();
    for (const d of [-22, 22]) { off(d); ctx.strokeStyle = 'rgba(140,110,70,.16)'; ctx.lineWidth = 3; ctx.stroke(); }
    path(); ctx.strokeStyle = 'rgba(150,120,80,.22)'; ctx.lineWidth = 1.2; ctx.setLineDash([10, 8]); ctx.stroke(); ctx.setLineDash([]);
    this.drawSlopes(tt);
    for (const f of BG_FOFA) this.drawFofa(f.x, f.y, f.r, f.r, 0, tt);
    for (const d of [-BG.hw - 3, BG.hw + 3]) { off(d); ctx.strokeStyle = NAVY; ctx.lineWidth = 7; ctx.stroke(); off(d); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.stroke(); off(d); ctx.strokeStyle = '#e8484a'; ctx.setLineDash([9, 9]); ctx.stroke(); ctx.setLineDash([]); }
    // atalho da lagoa: corredor de areia com a água no meio e muretas dos dois lados
    for (const LG of BG_SCS) { const A = LG.A, B = LG.B, ang = Math.atan2(B[1] - A[1], B[0] - A[0]), len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      ctx.save(); ctx.translate(A[0], A[1]); ctx.rotate(ang); R(0, -BG.sw, len, BG.sw * 2, '#dcc596'); ctx.restore();
      if (LG.kind === 'agua') { const lg = ctx.createRadialGradient(LG.x, LG.y, 5, LG.x, LG.y, LG.rx); lg.addColorStop(0, '#2f8fd0'); lg.addColorStop(1, '#6fd0e0'); ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(LG.x, LG.y, LG.rx, LG.ry, ang, 0, TAU); ctx.fill();
        for (let i = 0; i < 6; i++) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(LG.x + Math.cos(i * 1.7) * 40, LG.y + Math.sin(i * 2.3) * 28, 4 + ((tt * 6 + i * 3) % 8), 0, TAU); ctx.stroke(); } }
      else this.drawFofa(LG.x, LG.y, LG.rx, LG.ry, ang, tt);
      if (LG.ramp) { const RP = this.scRamp(LG); ctx.save(); ctx.translate(RP.x, RP.y); ctx.rotate(RP.a); const g = ctx.createLinearGradient(-12, 0, 12, 0); g.addColorStop(0, '#c9a46a'); g.addColorStop(1, '#fff6e0'); ctx.fillStyle = g; ctx.fillRect(-12, -BG.sw + 3, 24, BG.sw * 2 - 6); ctx.strokeStyle = NAVY; ctx.lineWidth = .8; ctx.strokeRect(-12, -BG.sw + 3, 24, BG.sw * 2 - 6); ctx.restore(); }
      // muretas do corredor só onde ele sai da pista principal
      if (!LG.walls) { LG.walls = []; for (const y of [-BG.sw - 3, BG.sw + 3]) for (let x = 0; x < len; x += 9) { const wx = A[0] + Math.cos(ang) * x - Math.sin(ang) * y, wy = A[1] + Math.sin(ang) * x + Math.cos(ang) * y; let md = Infinity; for (const q of BG_LINE) md = Math.min(md, Math.hypot(q[0] - wx, q[1] - wy)); if (md > BG.hw + 4) LG.walls.push([x, y]); } }
      ctx.save(); ctx.translate(A[0], A[1]); ctx.rotate(ang); for (const [x, y] of LG.walls) { R(x, y - 3.5, 9.5, 7, NAVY); R(x, y - 2.5, 9.5, 5, (x / 9) % 2 < 1 ? '#e8484a' : '#ffffff'); } ctx.restore(); }
    if (BG_T.farol) this.drawFarol(BG_T.farol[0], BG_T.farol[1], tt);
    // estacas com bandeirinhas atrás das muretas (a cada tanto)
    for (let i = 0; i < BG_LINE.length; i += 12) { const p = BG_LINE[i], q = BG_LINE[(i + 1) % BG_LINE.length], nx = -(q[1] - p[1]), ny = q[0] - p[0], nl = Math.hypot(nx, ny) || 1; for (const sd of [-1, 1]) { const x = p[0] + nx / nl * sd * (BG.hw + 14), y = p[1] + ny / nl * sd * (BG.hw + 14); if (Math.abs(x - this.camX) > vw / 2 + 20 || Math.abs(y - this.camY) > vh / 2 + 20) continue; R(x - .8, y - 6, 1.6, 6, '#7a5233'); ctx.fillStyle = (i / 12) % 2 ? '#e8484a' : '#ffffff'; ctx.beginPath(); ctx.moveTo(x + .8, y - 6); ctx.lineTo(x + 6, y - 4.5); ctx.lineTo(x + .8, y - 3); ctx.fill(); } }
    // marcas de pneu (somem devagar)
    ctx.fillStyle = 'rgba(110,80,45,.28)'; for (const [x, y, t0] of this.skids) { if (this.t - t0 > 6) continue; R(x - 1.2, y - 1.2, 2.4, 2.4, `rgba(110,80,45,${.3 * (1 - (this.t - t0) / 6)})`); }
    // esteiras de turbo (setas andando)
    for (const pd of BG_PADS) { const P = this.padPos(pd); ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.a); R(-17, -11, 34, 22, '#2d3350'); ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1; ctx.strokeRect(-17, -11, 34, 22);
      for (let i = 0; i < 3; i++) { const x = -13 + ((tt * 40 + i * 11) % 30), a = .4 + .6 * ((tt * 40 + i * 11) % 30) / 30; ctx.strokeStyle = `rgba(255,${180 + i * 20},80,${a})`; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x - 4, -7); ctx.lineTo(x + 2, 0); ctx.lineTo(x - 4, 7); ctx.stroke(); } ctx.restore(); }
    // largada (quadriculado) e rampas
    { const p = BG_LINE[0], q = BG_LINE[1], a = Math.atan2(q[1] - p[1], q[0] - p[0]); ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(a); for (let j = -5; j < 5; j++) for (let r = 0; r < 2; r++) R(r * 4 - 4, j * BG.hw / 5, 4, BG.hw / 5, (j + r) % 2 ? '#ffffff' : '#1b1f4f'); ctx.restore(); }
    for (const r of BG_RAMPS) { const p = BG_LINE[r.i], q = BG_LINE[r.i + 1], a = Math.atan2(q[1] - p[1], q[0] - p[0]); ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(a); const g = ctx.createLinearGradient(-10, 0, 10, 0); g.addColorStop(0, '#c9a46a'); g.addColorStop(1, '#fff6e0'); ctx.fillStyle = g; ctx.fillRect(-10, -BG.hw + 4, 20, BG.hw * 2 - 8); ctx.strokeStyle = NAVY; ctx.lineWidth = .6; ctx.strokeRect(-10, -BG.hw + 4, 20, BG.hw * 2 - 8); ctx.restore(); }
    // caixas, poças, projéteis
    for (const b of this.boxes) { if (b.t > 0) continue; const L = BG_LINE[b.i], L2 = BG_LINE[(b.i + 2) % BG_LINE.length], nx = -(L2[1] - L[1]), ny = L2[0] - L[0], nl = Math.hypot(nx, ny), x = L[0] + nx / nl * b.j * 31, y = L[1] + ny / nl * b.j * 31;
      ctx.save(); ctx.translate(x, y); ctx.rotate(tt * 1.5 + b.j); R(-5, -5, 10, 10, `hsl(${(tt * 120 + b.j * 60) % 360},80%,65%)`); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.strokeRect(-5, -5, 10, 10); ctx.fillStyle = '#ffffff'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', 0, 3); ctx.textAlign = 'left'; ctx.restore(); }
    for (const u of this.puds) { ctx.fillStyle = 'rgba(255,250,235,.85)'; ctx.beginPath(); ctx.ellipse(u.x, u.y, 12, 8, .3, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,200,80,.8)'; ctx.lineWidth = 1; ctx.stroke(); R(u.x - 2, u.y - 6, 4, 6, '#ffb347'); }
    for (const p of this.proj) { if (p.k === 'bola') { ctx.save(); ctx.translate(p.x, p.y - Math.abs(Math.sin(p.t * 9)) * 6); ctx.rotate(p.t * 8); for (let i = 0; i < 4; i++) { ctx.fillStyle = ['#ff6b6b', '#ffffff', '#6bcbff', '#ffd166'][i]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 5, i * Math.PI / 2, (i + 1) * Math.PI / 2); ctx.fill(); } ctx.restore(); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 3, 5, 2, 0, 0, TAU); ctx.fill(); } else { ctx.fillStyle = '#6bcbff'; ctx.beginPath(); ctx.arc(p.x, p.y - 4, 5, 0, TAU); ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = .7; ctx.stroke(); R(p.x - .5, p.y + 1, 1, 4, '#ffffff'); } }
    // efeitos de chão
    for (const f of this.fx) { const k = f.t / (f.life || .6); ctx.globalAlpha = 1 - k;
      if (f.k === 'pó') { ctx.fillStyle = '#fff8ea'; ctx.beginPath(); ctx.arc(f.x, f.y, 2 + k * 6, 0, TAU); ctx.fill(); }
      else if (f.k === 'vento') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(f.x, f.y, 8 + k * 16, f.a + sd * 1.2 - .5, f.a + sd * 1.2 + .5); ctx.stroke(); } }
      else if (f.k === 'fofa') { ctx.fillStyle = '#c9a46a'; ctx.beginPath(); ctx.arc(f.x, f.y, 2 + k * 7, 0, TAU); ctx.fill(); }
      else if (f.k === 'água') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(f.x, f.y, 2 + k * 7, 0, TAU); ctx.stroke(); }
      else if (f.k === 'faísca' || f.k === 'faísca2') R(f.x - 1, f.y - 1, 2, 2, f.k === 'faísca' ? '#6bd8ff' : '#ffa53a');
      else if (f.k === 'batida') { ctx.fillStyle = '#fff6d6'; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; R(f.x + Math.cos(a) * (2 + k * 8), f.y + Math.sin(a) * (2 + k * 8), 2, 2, '#fff6d6'); } }
      else if (f.k === 'caixa' || f.k === 'escudo') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(f.x, f.y, 4 + k * 14, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1; }
    // bugues (os que estão no ar por cima)
    for (const k of [...this.K].sort((a, b) => a.z - b.z)) this.drawBuggy(k, tt);
    ctx.restore();
    if (this.wave > 0) { ctx.fillStyle = `rgba(107,203,255,${Math.min(.35, this.wave * .2)})`; ctx.fillRect(0, 0, W, H); }
    this.minimap();
    // item na mão (com a roleta) e a posição grande
    const m = this.me; R(W - 34, H - 34, 26, 26, 'rgba(27,31,79,.6)'); ctx.strokeStyle = '#fff6d6'; ctx.lineWidth = 1; ctx.strokeRect(W - 34, H - 34, 26, 26);
    R(W - 62, H - 30, 22, 22, 'rgba(27,31,79,.45)'); ctx.strokeRect(W - 62, H - 30, 22, 22);
    m.items.forEach((q, n) => { const [x, y, sc] = n ? [W - 51, H - 19, .7] : [W - 21, H - 21, 1]; ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); this.drawItemIcon(q.roll > 0 ? ['bola', 'balao', 'coco', 'guarda', 'protetor'][Math.floor(tt * 14 + n * 2) % 5] : q.k, 0, 0); ctx.restore(); });
    ctx.fillStyle = this.rank === 1 ? '#ffd166' : '#fff6d6'; ctx.font = 'bold 18px sans-serif'; ctx.strokeStyle = NAVY; ctx.lineWidth = 3; ctx.strokeText(`${this.rank}º`, 10, H - 12); ctx.fillText(`${this.rank}º`, 10, H - 12);
    if (this.inter) this.drawInter(tt);
  },
  // areia fofa: mais escura, com ondinhas de vento
  drawFofa(x, y, rx, ry, a, tt) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = 'rgba(176,132,78,.42)'; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(160,118,66,.35)'; ctx.beginPath(); ctx.ellipse(0, 0, rx * .72, ry * .7, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,210,.55)'; ctx.lineWidth = 1;
    for (let j = -2; j <= 2; j++) { const yy = j * ry * .32, w = rx * Math.sqrt(Math.max(0, 1 - (yy / ry) ** 2)) * .8; ctx.beginPath(); for (let xx = -w; xx <= w; xx += 4) { const q = yy + Math.sin(xx * .25 + j) * 1.6; xx === -w ? ctx.moveTo(xx, q) : ctx.lineTo(xx, q); } ctx.stroke(); }
    ctx.restore();
  },
  // ladeiras do Desce-Duna: descida com setas claras, subida mais escura
  drawSlopes(tt) {
    const n = BG_LINE.length; if (!BG_T.slopes.length) return;
    for (const z of BG_T.slopes) {
      ctx.beginPath(); for (let i = z.a; i <= z.b; i++) { const p = BG_LINE[i % n]; i === z.a ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); }
      ctx.strokeStyle = z.s > 0 ? 'rgba(255,255,245,.22)' : 'rgba(120,80,40,.16)'; ctx.lineWidth = BG.hw * 2 - 6; ctx.lineCap = 'butt'; ctx.stroke();
      for (let i = z.a + 4; i < z.b - 2; i += 9) { const p = BG_LINE[i % n], q = BG_LINE[(i + 2) % n], a = Math.atan2(q[1] - p[1], q[0] - p[0]); ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(a);
        ctx.strokeStyle = z.s > 0 ? 'rgba(255,255,255,.55)' : 'rgba(110,75,40,.28)'; ctx.lineWidth = 3; for (const o of [-34, 0, 34]) { ctx.beginPath(); ctx.moveTo(-5, o - 8); ctx.lineTo(z.s > 0 ? 3 : -1, o); ctx.lineTo(-5, o + 8); ctx.stroke(); } ctx.restore(); }
    }
  },
  // mar ao norte da Duna do Farol
  drawSea(tt, vw, vh) {
    const oy = BG_T.box.y0 - 146; // a beira do mar fica 90 px acima da pista mais alta
    if (this.camY - oy - vh / 2 > 60) return;
    ctx.save(); ctx.translate(0, oy);
    const x0 = this.camX - vw / 2 - 20, x1 = this.camX + vw / 2 + 20, y0 = this.camY - oy - vh / 2 - 20, xs = Math.floor(x0 / 10) * 10;
    R(x0, y0, x1 - x0, 56 - y0, '#4fbad0'); R(x0, 20, x1 - x0, 36, '#8fdde6');
    ctx.fillStyle = '#e9dcc0'; ctx.beginPath(); ctx.moveTo(x0, 70); for (let x = xs; x < x1; x += 10) ctx.lineTo(x, 50 + Math.sin(x * .02 + tt * 1.2) * 3); ctx.lineTo(x1, 70); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2;
    for (let w = 0; w < 3; w++) { ctx.beginPath(); for (let x = xs; x < x1; x += 10) { const y = 44 - w * 28 + Math.sin(x * .03 + tt * 1.6 + w) * 4 - (tt * 5 + w * 9) % 10; x === xs ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
    ctx.restore();
  },
  // o farol visto de cima: torre listrada e o facho girando
  drawFarol(x, y, tt) {
    const a = tt * .9;
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 420); g.addColorStop(0, 'rgba(255,240,170,.42)'); g.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 420, a - .16, a + .16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(80,60,30,.25)'; ctx.beginPath(); ctx.ellipse(10, 8, 46, 40, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e4d3ae'; ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = 1.2; ctx.stroke();
    for (const [r, c] of [[34, '#e8484a'], [27, '#ffffff'], [20, '#e8484a'], [13, '#ffffff']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.fillStyle = '#ffe58a'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill(); ctx.strokeStyle = NAVY; ctx.stroke();
    ctx.restore();
  },
  // classificação da Copa entre uma corrida e outra
  drawInter(tt) {
    const it = this.inter, c = this.cup, w = 250, h = 168, x = (W - w) / 2, y = (H - h) / 2 - 12;
    ctx.fillStyle = 'rgba(27,31,79,.55)'; ctx.fillRect(0, 0, W, H);
    R(x, y, w, h, '#fff6d6'); ctx.strokeStyle = NAVY; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h); R(x, y, w, 26, '#ffd166'); ctx.strokeRect(x, y, w, 26);
    ctx.fillStyle = NAVY; ctx.textAlign = 'center'; ctx.font = 'bold 12px sans-serif'; ctx.fillText(it.last ? 'Copa das Dunas: resultado' : `Copa das Dunas · corrida ${c.i + 1} de 3`, W / 2, y + 17);
    ctx.textAlign = 'left';
    it.tab.forEach((k, r) => { const yy = y + 45 + r * 20, me = k.me; if (me) R(x + 8, yy - 13, w - 16, 18, 'rgba(59,111,214,.18)');
      ctx.font = `${me ? 'bold ' : ''}11px sans-serif`; ctx.fillStyle = NAVY; ctx.fillText(`${r + 1}º`, x + 14, yy);
      ctx.fillStyle = k.me ? '#3b6fd6' : k.col; ctx.beginPath(); ctx.arc(x + 42, yy - 4, 5, 0, TAU); ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = NAVY; ctx.fillText(k.me ? 'Você' : `Amiguinho ${k.name}`, x + 54, yy);
      ctx.textAlign = 'right'; ctx.fillStyle = '#2f8a4f'; ctx.fillText(`+${it.add[k.i]}`, x + w - 56, yy); ctx.fillStyle = NAVY; ctx.fillText(`${c.pts[k.i]} pts`, x + w - 12, yy); ctx.textAlign = 'left'; });
    if (it.t > 1 && Math.floor(tt * 2) % 2 === 0) { ctx.textAlign = 'center'; ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#fff6d6'; ctx.strokeStyle = NAVY; ctx.lineWidth = 3;
      const tx = it.last ? (touch ? 'Toque para ver o resultado' : 'Aperte Espaço (✕) para ver o resultado') : `${touch ? 'Toque' : 'Aperte Espaço (✕)'} para a próxima pista: ${BG_TRACKS[c.i + 1].name}`;
      ctx.strokeText(tx, W / 2, y + h + 16); ctx.fillText(tx, W / 2, y + h + 16); ctx.textAlign = 'left'; }
  },
  drawItemIcon(k, x, y) {
    ctx.save(); ctx.translate(x, y);
    if (k === 'bola') for (let i = 0; i < 4; i++) { ctx.fillStyle = ['#ff6b6b', '#ffffff', '#6bcbff', '#ffd166'][i]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 8, i * Math.PI / 2, (i + 1) * Math.PI / 2); ctx.fill(); }
    else if (k === 'balao') { ctx.fillStyle = '#6bcbff'; ctx.beginPath(); ctx.arc(0, -2, 7, 0, TAU); ctx.fill(); R(-.5, 4, 1, 5, '#ffffff'); }
    else if (k === 'coco') { ctx.fillStyle = '#7a5233'; ctx.beginPath(); ctx.arc(0, 1, 7, 0, TAU); ctx.fill(); R(-1, -9, 2, 6, '#ff6ba8'); }
    else if (k === 'guarda') { ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.arc(0, 0, 8, Math.PI, 0); ctx.fill(); R(-.6, 0, 1.2, 8, '#7a5233'); }
    else if (k === 'protetor') { R(-4, -8, 8, 15, '#ffb347'); R(-2, -10, 4, 3, '#ffffff'); }
    else if (k === 'onda') { ctx.strokeStyle = '#6bcbff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(-2, 4, 8, Math.PI, Math.PI * 1.9); ctx.stroke(); }
    ctx.restore();
  },
  drawBuggy(k, tt) {
    const z = k.z * .12;
    ctx.fillStyle = 'rgba(80,60,30,.25)'; ctx.beginPath(); ctx.ellipse(k.x + 2, k.y + 3, 12 - z * .3, 8 - z * .2, k.h, 0, TAU); ctx.fill();
    const blink = k.inv > 0 && !(k.spin > 0) && Math.floor(tt * 16) % 2 === 0;
    ctx.save(); if (blink) ctx.globalAlpha = .35; ctx.translate(k.x, k.y - z); ctx.rotate(k.h); const sc = 1 + z / 30; ctx.scale(sc * (1 + (k.sq || 0) * .4), sc * (1 - (k.sq || 0) * .3));
    for (const [wx, wy] of [[6, -6], [6, 6], [-6, -7], [-6, 7]]) R(wx - 3, wy - 2, 6, 4, '#2a2a33');
    ctx.translate(0, clamp(k.lean, -2.2, 2.2));
    ctx.fillStyle = k.col; ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(10, 4); ctx.lineTo(-8, 6); ctx.lineTo(-9, -6); ctx.closePath(); ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = .9; ctx.stroke();
    ctx.strokeStyle = '#555a6a'; ctx.lineWidth = 1.1; ctx.strokeRect(-6, -5, 9, 10);
    if (k.me) { ctx.fillStyle = '#f4efe6'; ctx.beginPath(); ctx.arc(-1, 0, 3.6, 0, TAU); ctx.fill(); R(-3.5, -3.2, 5, 6.4, '#3b6fd6'); R(-1.5, -.6, 4, 1.2, '#ffffff'); ctx.fillStyle = '#7fdcff'; ctx.beginPath(); ctx.arc(-1, 3.6, .9, 0, TAU); ctx.arc(-1, -3.6, .9, 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = k.col; ctx.beginPath(); ctx.arc(-1, 0, 3.8, 0, TAU); ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = .6; ctx.stroke(); R(1, -2, 1.6, 4, '#1b1f4f'); }
    ctx.restore();
    if (k.draft > .2 && !(k.z > 0)) { const a = Math.min(1, (k.draft - .2) / .6), c = Math.cos(k.d), sn = Math.sin(k.d); ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const ph = ((tt * 3.2 + i * .19) % 1), side = i % 2 ? 1 : -1, off = side * (10 + (i % 3) * 3), along = 18 - ph * 40, x = k.x + c * along - sn * off, y = k.y - z + sn * along + c * off;
        for (const [st, lw] of [[`rgba(27,31,79,${.35 * a * (1 - ph)})`, 3], [`rgba(235,248,255,${a * (1 - ph * .6)})`, 1.6]]) { ctx.strokeStyle = st; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - c * 15, y - sn * 15); ctx.stroke(); } }
      ctx.lineCap = 'butt'; }
    if (k.shield > 0) { ctx.strokeStyle = `rgba(255,107,107,${.5 + .3 * Math.sin(tt * 8)})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(k.x, k.y - z, 14, 0, TAU); ctx.stroke(); }
    if (k.me) { ctx.fillStyle = '#fff6d6'; ctx.beginPath(); ctx.moveTo(k.x, k.y - z - 15); ctx.lineTo(k.x - 3, k.y - z - 20); ctx.lineTo(k.x + 3, k.y - z - 20); ctx.fill(); }
  },
  minimap() {
    const B = BG_T.box, s = B.s, x0 = W - 90, y0 = 6, X = (x) => x0 + (x - B.x0) * s, Y = (y) => y0 + 1 + (y - B.y0) * s; R(x0 - 4, y0 - 3, 88, 54, 'rgba(27,31,79,.45)');
    ctx.strokeStyle = '#fff6d6'; ctx.lineWidth = 2; ctx.beginPath(); BG_LINE.forEach((p, i) => { const x = X(p[0]), y = Y(p[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.stroke();
    for (const k of this.K) { ctx.fillStyle = k.me ? '#3b6fd6' : k.col; ctx.beginPath(); ctx.arc(X(k.x), Y(k.y), k.me ? 2.6 : 1.8, 0, TAU); ctx.fill(); if (k.me) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = .8; ctx.stroke(); } }
  },
};
