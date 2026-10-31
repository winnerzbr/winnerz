/* ============================================================ prova nova: Corrida de bugue (31/10/2026)
   Dunas Brancas, vista de cima, 3 voltas contra 5 Amiguinhos de bugue, com mecânicas de corrida de kart.
   ✕ acelera e ○ freia (no celular acelera sozinho), ◀ ▶ viram, R1 (ou L1, □) segurado na curva derrapa: quanto mais tempo derrapando,
   maior o turbo ao soltar (faísca azul, depois laranja). R2 usa o item (RT no Xbox, ZR no Switch; V no teclado).
   2ª versão (31/10): pista mais larga, com muretas em toda a volta; bater de lado perde pouco, de frente perde muito.
   Largada com turbo: acelerar bem no "Vai!". Pulos nas dunas: pousar alinhado dá um turbo curto.
   A lagoa é um atalho por um corredor de água (lento sem turbo).
   Caixas de item: quem está mais atrás ganha itens melhores. Itens: bola de praia (quica reto e acerta quem está na frente),
   balão d'água teleguiado (persegue quem está logo à frente), protetor solar (poça escorregadia atrás), água de coco (turbo),
   guarda-sol (escudo contra um ataque) e onda (rara, só para os últimos: deixa os três primeiros lentos).
   Quem é acertado rodopia e perde velocidade, mas continua na corrida.
   Arte provisória: tudo desenhado pelo jogo (bugues de cima, com o IAmiguinho e os Amiguinhos de capacete). */
const BG = { voltas: 3, hw: 62, r: 8, vmax: 190, water: 74, boostV: 80, acc: 240, turn: 2.55, sw: 36, Z: .82 };
if (typeof Music !== 'undefined' && Music.songs.patins) Music.songs.bugue = Music.songs.patins;
FALA.intro.bugue = [
  'Corrida de bugue nas Dunas Brancas! Cinco Amiguinhos, três voltas e uma lagoa no meio do caminho.',
  'Derrapa na curva, segura até a faísca ficar laranja e solta. É o segredo dos campeões. E agora é seu também.',
  'Ficou para trás? Os itens melhoram. A onda é minha favorita.',
];
FALA.bgBoa = ['Turbo laranja! Senti o vento no boné.', 'Acertei a bola de praia! Desculpa, Amiguinho.', 'Primeiro lugar! A duna é minha casa.'];
FALA.bgRuim = ['Balão d\'água na nuca. Refrescante, pelo menos.', 'Escorreguei no protetor solar. Pelo menos não vou me queimar.', 'Caí na areia fofa. Ela abraçou o bugue.'];
// pista: a linha do meio (fechada), alisada
const BG_PTS = [[520, 1320], [1050, 1330], [1700, 1300], [2030, 1110], [2070, 760], [1870, 450], [1520, 380], [1260, 520], [1060, 760], [800, 820], [610, 660], [600, 400], [440, 240], [250, 380], [195, 800], [265, 1150]];
const BG_LINE = (() => {
  const P = BG_PTS, n = P.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    for (let k = 0; k < 24; k++) { const t = k / 24, t2 = t * t, t3 = t2 * t; out.push([0, 1].map((j) => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
  }
  let L = 0; out[0].s = 0; for (let i = 1; i < out.length; i++) { L += Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]); out[i].s = L; }
  out.L = L + Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]);
  return out;
})();
// atalho da lagoa: um corredor reto cortando por dentro a curva da direita (água: só compensa com turbo)
const BG_SC = { a: 52, b: 92 };
const bgWrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const BG_LAGOA = (() => { const A = BG_LINE[BG_SC.a], B = BG_LINE[BG_SC.b]; return { x: (A[0] + B[0]) / 2, y: (A[1] + B[1]) / 2, rx: 105, ry: 31, ang: Math.atan2(B[1] - A[1], B[0] - A[0]), A, B }; })();
const BG_RAMPS = [{ i: 26 }, { i: 345 }];
const BG_BOXES = [120, 210, 300, 372];
const bugue = {
  id: 'bugue', name: 'Corrida de bugue', tag: 'Dunas Brancas · 3 voltas', wide: true, hi: true, paint: true, two: false, dur: 0,
  med: [1600, 2200, 3000], medText: ['chegar em 3º', 'chegar em 2º', 'vencer'], medShort: ['3º lugar', '2º lugar', '1º lugar'], ia: 2200, nota: 'chegou em 2º, mas com estilo',
  desc: '3 voltas contra 5 Amiguinhos: derrapagem com turbo, pulos nas dunas e itens de praia.',
  steps: () => [
    touch ? 'O bugue acelera sozinho; “Freio” freia. ◀ ▶ viram. Acelere bem no “Vai!” para largar com turbo.' : 'Espaço acelera e X freia; ◀ ▶ viram. Acelere bem no “Vai!” para largar com turbo.',
    `Na curva, segure ${touch ? '“Derrapa”' : 'C'} para derrapar: a faísca fica azul e depois laranja; soltando, vem o turbo. Pousar alinhado depois de um pulo também dá turbo.`,
    `Pegue as caixas e use o item com ${touch ? '“Item”' : 'V (R2 no controle)'}. Quem está atrás ganha itens melhores. As muretas seguram o bugue, mas bater de frente perde muito: tire o pé ou derrape nas curvas. A lagoa é um atalho que só compensa com turbo.`,
  ],
  hint: () => '',
  gp: 'Controle: analógico vira · ✕ acelera · ○ freia · R1 (ou L1, □) derrapa · R2 usa o item · Start pausa',
  ctl: [['◀ ▶', 'virar'], ['Espaço', 'acelerar', 'kb'], ['X', 'frear', 'kb'], ['C', 'derrapar (segure)', 'kb'], ['V', 'usar item', 'kb'], ['Freio', 'frear', 'touch'], ['Derrapa', 'derrapar (segure)', 'touch'], ['Item', 'usar item', 'touch'], ['Esc', 'pausa', 'kb']],
  pad: { dirs: 'lr', a: 'Freio', b: 'Derrapa', c: 'Item' }, bannerY: 40,
  init() {
    const st = BG_LINE[30], nx = BG_LINE[32][0] - BG_LINE[28][0], ny = BG_LINE[32][1] - BG_LINE[28][1], nl = Math.hypot(nx, ny), h = Math.atan2(ny, nx);
    const cols = [null, '#ff6ba8', '#6bcbff', '#9be37a', '#ffb347', '#b88cff'], names = ['Você', 'Rosa', 'Azul', 'Verde', 'Laranja', 'Roxo'];
    this.K = [0, 1, 2, 3, 4, 5].map((i) => { const row = Math.floor(i / 2), side = i % 2 ? 1 : -1, back = (5 - i) * 0 + row * 34 + 20; return { i, me: i === 5, x: st[0] - nx / nl * back + -ny / nl * side * 17, y: st[1] - ny / nl * back + nx / nl * side * 17, h, d: h, s: 0, lap: 0, seg: 26, prog: 0, cp: 0, drift: 0, dsg: 0, chg: 0, boost: 0, air: 0, spin: 0, shield: 0, item: null, roll: 0, slow: 0, fin: 0, col: cols[i] || '#3b6fd6', name: names[i] || 'Você', ai: { skill: .93 + i * .016, lane: (Math.random() - .5) * 46, hold: 0 }, pud: {} }; });
    // o jogador larga em último (como num kart), os Amiguinhos na frente
    this.me = this.K[5]; this.me.col = '#3b6fd6'; this.me.name = 'Você';
    Object.assign(this, { t: 0, score: 0, race: -3.2, started: false, fx: [], proj: [], puds: [], boxes: BG_BOXES.map((i) => ({ i, t: 0 })), wave: 0, done: false, doneT: 0, order: [], camX: this.me.x, camY: this.me.y, turbos: 0, laranjas: 0, acertos: 0, levou: 0, startOk: null, rank: 6 });
  },
  hud() {
    const m = this.me; const IT = { bola: 'Bola de praia', balao: 'Balão d\'água', protetor: 'Protetor', coco: 'Água de coco', guarda: 'Guarda-sol', onda: 'Onda' };
    return [['Posição', `${this.rank}º`, this.rank === 1], ['Volta', `${Math.min(BG.voltas, m.lap + 1)} de ${BG.voltas}`], ['Item', m.item ? (m.item.roll > 0 ? '…' : IT[m.item.k]) : '—', !!m.item && !(m.item.roll > 0)], ['Tempo', this.started ? `${Math.floor(this.race / 60)}:${String(Math.floor(this.race % 60)).padStart(2, '0')}` : '—']];
  },
  stats() { return [`Chegou em ${this.rank}º lugar em ${Math.floor(this.race / 60)}:${String(Math.floor(this.race % 60)).padStart(2, '0')}`, `${this.turbos} turbos de derrapagem (${this.laranjas} laranja) · ${this.acertos} acertos com itens`, `Foi acertado ${this.levou} vez${this.levou === 1 ? '' : 'es'}`]; },
  demo() { this.started = true; this.race = 5; for (const k of this.K) { k.s = 150; } },
  // ---------- pista: ponto mais perto da linha do meio (procura perto do último)
  near(k) {
    const L = BG_LINE, n = L.length; let best = k.seg, bd = Infinity;
    for (let j = -14; j <= 14; j++) { const i = (k.seg + j + n) % n, d = Math.hypot(L[i][0] - k.x, L[i][1] - k.y); if (d < bd) { bd = d; best = i; } }
    if (bd > 120) for (let i = 0; i < n; i += 3) { const d = Math.hypot(L[i][0] - k.x, L[i][1] - k.y); if (d < bd) { bd = d; best = i; } }
    return [best, bd];
  },
  inWater(x, y) { const L = BG_LAGOA, c = Math.cos(-L.ang), sn = Math.sin(-L.ang), dx = x - L.x, dy = y - L.y, u = (dx * c - dy * sn) / L.rx, v = (dx * sn + dy * c) / L.ry; return u * u + v * v < 1; },
  ord() { return [...this.K].sort((a, b) => (b.fin ? 1e9 - b.fin : b.lap * BG_LINE.L + b.prog) - (a.fin ? 1e9 - a.fin : a.lap * BG_LINE.L + a.prog)); },
  update(dt, I) {
    this.t += dt;
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < (f.life || .6));
    if (this.done) { this.doneT += dt; this.race += dt; this.stepAll(dt, null); return this.doneT > 3.2; }
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
    for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) { const A = this.K[a], B = this.K[b]; if (A.air || B.air) continue; const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy); if (d < 15 && d > .01) { const p = (15 - d) / 2, nx = dx / d, ny = dy / d; A.x -= nx * p; A.y -= ny * p; B.x += nx * p; B.y += ny * p; } }
    this.items(dt);
    if (this.wave > 0) this.wave -= dt;
  },
  // controle: ✕ acelera, ○ freia, R1/L1 (ou □) derrapa, R2 usa o item (RT no Xbox, ZR no Switch: o mesmo botão 7 do padrão)
  gamepad() { const ps = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [], g = ps[0]; if (!g) return {}; const bt = (i) => !!g.buttons[i]?.pressed || (g.buttons[i]?.value || 0) > .4; return { r2: bt(7), sh: bt(5) || bt(4) || bt(2) }; },
  ctlOf(I) {
    const g = this.gamepad(), r2 = !!g.r2, item = (r2 && !this.r2was) || !!codeHeld.KeyV && !this.vwas || (touch && I.pc); this.r2was = r2; this.vwas = !!codeHeld.KeyV;
    // a direção vem suavizada: tocar ◀ ▶ no teclado não dá tranco
    const raw = I.ax || 0; this.st = (this.st || 0) + clamp(raw - (this.st || 0), -6 * DT, 6 * DT);
    return { steer: Math.abs(raw) < .05 && Math.abs(this.st) < .2 ? 0 : this.st, acc: touch ? !I.a : I.a, brake: touch ? I.a : I.b, drift: touch ? I.b : (!!codeHeld.KeyC || !!g.sh), use: item };
  },
  // ---------- dirigir
  drive(k, c, dt) {
    const [seg, dist] = this.near(k); k.seg = seg;
    // progresso na volta (com pontos de controle para não valer cortar caminho por fora)
    const sNow = BG_LINE[seg].s, q = Math.floor(sNow / BG_LINE.L * 8);
    if (k.prog > BG_LINE.L * .85 && sNow < BG_LINE.L * .15 && k.cp === 7) { k.lap++; k.cp = 0; if (k.me && k.lap < BG.voltas) { pop(k.lap === BG.voltas - 1 ? 'Última volta!' : `Volta ${k.lap + 1}`, W / 2, 70, '#fff6d6', true); sfx.point(); } if (k.lap >= BG.voltas && !k.fin) this.finish(k); }
    else if (q === (k.cp + 1) % 8 && q !== 0) k.cp = q;
    k.prog = sNow;
    const water = !k.air && this.inWater(k.x, k.y);
    if (k.spin > 0) { k.spin -= dt; k.h += dt * 14; k.s *= 1 - 2.2 * dt; c = { steer: 0, acc: false, brake: false, drift: false }; }
    k.boost = Math.max(0, k.boost - dt); k.slow = Math.max(0, k.slow - dt); k.shield = Math.max(0, k.shield - dt);
    let vmax = BG.vmax * (k.me ? 1 : k.ai.skill * (k.ai.rubber || 1)); if (water) vmax = k.boost > 0 ? 170 : BG.water;
    if (k.boost > 0 && !water) vmax += BG.boostV; if (k.slow > 0 || (this.wave > 0 && k.pos <= 3 && !k.me && this.waveBy !== k)) vmax *= .45;
    if (this.wave > 0 && k.me && k.pos <= 3 && this.waveBy !== k) vmax *= .45;
    if (c.acc) k.s += (k.boost > 0 ? BG.acc * 2 : BG.acc) * dt; else if (c.brake) k.s -= 380 * dt; else k.s -= 80 * dt;
    if (k.s > vmax) k.s = Math.max(vmax, k.s - 300 * dt); k.s = Math.max(c.brake ? -50 : 0, k.s);
    // virar e derrapar
    if (!k.air) {
      const sf = clamp(Math.abs(k.s) / 90, .35, 1) * (1 - .12 * clamp((k.s - 170) / 60, 0, 1));
      if (c.drift && !k.drift && Math.abs(c.steer) > .3 && k.s > 100) { k.drift = 1; k.dsg = Math.sign(c.steer); k.chg = 0; k.hop = .18; }
      if (k.drift && (!c.drift || k.s < 70)) {
        if (k.chg >= 1.7) { k.boost = Math.max(k.boost, 1.1); if (k.me) { this.turbos++; this.laranjas++; pop('Turbo laranja!', W / 2, 90, '#ffb347'); talk(FALA.bgBoa, .15); } }
        else if (k.chg >= .85) { k.boost = Math.max(k.boost, .55); if (k.me) { this.turbos++; pop('Turbo!', W / 2, 90, '#8fdcff'); } }
        k.drift = 0; k.chg = 0;
      }
      if (k.drift) { k.chg += dt; k.h += (k.dsg * (1.9 + .9 * c.steer * k.dsg)) * BG.turn * .6 * dt; k.d += bgWrap(k.h - k.dsg * .45 - k.d) * Math.min(1, dt * 3.2); }
      else { k.h += c.steer * BG.turn * sf * dt * (c.brake ? 1.2 : 1); k.d += bgWrap(k.h - k.d) * Math.min(1, dt * 11); }
    } else {
      k.air -= dt; k.h += c.steer * .8 * dt;
      if (k.air <= 0) { k.air = 0; const off2 = Math.abs(Math.atan2(Math.sin(k.h - k.d), Math.cos(k.h - k.d))); if (off2 < .3) { k.boost = Math.max(k.boost, .45); if (k.me) { this.turbos++; pop('Pouso alinhado!', W / 2, 90, '#8fdcff'); } } else { k.s *= .7; } this.fx.push({ k: 'pó', x: k.x, y: k.y, t: 0, life: .5 }); }
    }
    k.hop = Math.max(0, (k.hop || 0) - dt);
    k.x += Math.cos(k.d) * k.s * dt; k.y += Math.sin(k.d) * k.s * dt; k.roll += k.s * dt;
    this.walls(k);
    // pulos nas dunas
    if (!k.air && k.s > 95) for (const r of BG_RAMPS) if (Math.abs(seg - r.i) <= 1 && dist < BG.hw - 4) { k.air = k.air0 = .5 + (k.s - 95) / 400; k.drift = 0; break; }
    // poeira
    if (k.s > 80 && !k.air && Math.random() < (k.drift ? .7 : .25)) this.fx.push({ k: water ? 'água' : 'pó', x: k.x - Math.cos(k.d) * 9, y: k.y - Math.sin(k.d) * 9, t: 0, life: .5 });
    if (k.drift && k.chg >= .85 && Math.random() < .6) this.fx.push({ k: k.chg >= 1.7 ? 'faísca2' : 'faísca', x: k.x - Math.cos(k.h) * 8 + (Math.random() - .5) * 8, y: k.y - Math.sin(k.h) * 8 + (Math.random() - .5) * 8, t: 0, life: .25 });
    if (c.use && k.item && !(k.item.roll > 0)) this.useItem(k);
    if (k.item && k.item.roll > 0) { k.item.roll -= dt; if (k.item.roll <= 0 && k.me) beep(990, .06, 'square', .04); }
  },
  // bordas: a pista (e o corredor da lagoa) tem muretas; bater de lado perde pouco, bater de frente perde muito
  segDist(px, py, A, B) { const vx = B[0] - A[0], vy = B[1] - A[1], t = clamp(((px - A[0]) * vx + (py - A[1]) * vy) / (vx * vx + vy * vy), 0, 1), qx = A[0] + vx * t, qy = A[1] + vy * t; return [Math.hypot(px - qx, py - qy), qx, qy]; },
  walls(k) {
    if (k.air) return;
    const [seg, d] = this.near(k), L = BG_LINE[seg], lim = BG.hw - BG.r, [ds, qx, qy] = this.segDist(k.x, k.y, BG_LAGOA.A, BG_LAGOA.B), lim2 = BG.sw - BG.r;
    if (d <= lim || ds <= lim2) return;
    const useMain = d - lim < ds - lim2, cx = useMain ? L[0] : qx, cy = useMain ? L[1] : qy, lm = useMain ? lim : lim2;
    const dx = k.x - cx, dy = k.y - cy, dd = Math.hypot(dx, dy) || 1, nx = dx / dd, ny = dy / dd;
    k.x = cx + nx * lm; k.y = cy + ny * lm;
    let vx = Math.cos(k.d) * k.s, vy = Math.sin(k.d) * k.s; const vn = vx * nx + vy * ny;
    if (vn > 0) {
      vx -= 1.25 * vn * nx; vy -= 1.25 * vn * ny; const loss = .06 + .55 * clamp(vn / Math.max(1, k.s), 0, 1);
      k.s = Math.hypot(vx, vy) * (1 - loss); k.d += bgWrap(Math.atan2(vy, vx) - k.d); k.h += bgWrap(k.d - k.h) * .6; k.drift = 0;
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
    const L = BG_LINE, n = L.length, A = k.ai, look = 8 + Math.floor(k.s / 22), t = L[(k.seg + look) % n], t2 = L[(k.seg + look + 2) % n];
    const nx = -(t2[1] - t[1]), ny = t2[0] - t[0], nl = Math.hypot(nx, ny) || 1, lane = A.lane + Math.sin(this.t * .3 + k.i) * 8;
    const tx = t[0] + nx / nl * clamp(lane, -BG.hw + 18, BG.hw - 18), ty = t[1] + ny / nl * clamp(lane, -BG.hw + 18, BG.hw - 18);
    let e = Math.atan2(ty - k.y, tx - k.x) - k.h; e = Math.atan2(Math.sin(e), Math.cos(e));
    // curva forte à frente: derrapa
    const a1 = L[(k.seg + 10) % n], a2 = L[(k.seg + 22) % n], a3 = L[(k.seg + 34) % n], turn = Math.atan2(Math.sin(Math.atan2(a3[1] - a2[1], a3[0] - a2[0]) - Math.atan2(a2[1] - a1[1], a2[0] - a1[0])), Math.cos(Math.atan2(a3[1] - a2[1], a3[0] - a2[0]) - Math.atan2(a2[1] - a1[1], a2[0] - a1[0])));
    if (!A.dr && Math.abs(turn) > .35 && k.s > 120 && Math.random() < .03) A.dr = 1.0 + Math.random() * .9;
    if (A.dr) A.dr = Math.max(0, A.dr - dt);
    // equilíbrio: quem dispara na frente do jogador alivia um pouco; quem fica muito para trás aperta
    const me = this.me, gap = (k.lap * BG_LINE.L + k.prog) - (me.lap * BG_LINE.L + me.prog);
    A.rubber = gap > 500 ? .93 : gap < -500 ? 1.06 : 1;
    // item: segura um pouco e usa quando faz sentido
    let use = false;
    if (k.item && !(k.item.roll > 0)) {
      A.hold += dt; const it = k.item.k, front = this.K.find((q) => q.pos === k.pos - 1), back = this.K.find((q) => q.pos === k.pos + 1);
      if (it === 'guarda' || it === 'onda' || it === 'coco' && Math.abs(turn) < .2) use = A.hold > .5;
      else if (it === 'bola') use = front && Math.hypot(front.x - k.x, front.y - k.y) < 220 && Math.abs(Math.atan2(Math.sin(Math.atan2(front.y - k.y, front.x - k.x) - k.h), Math.cos(Math.atan2(front.y - k.y, front.x - k.x) - k.h))) < .35;
      else if (it === 'balao') use = A.hold > 1 && !!front;
      else if (it === 'protetor') use = back && Math.hypot(back.x - k.x, back.y - k.y) < 120;
      if (A.hold > 8) use = true;
      if (use) A.hold = 0;
    }
    return { steer: clamp(e * 2.6, -1, 1), acc: true, brake: false, drift: A.dr > 0 && Math.abs(e) > .05, use };
  },
  // ---------- itens
  items(dt) {
    for (const b of this.boxes) { if (b.t > 0) { b.t -= dt; continue; } const L = BG_LINE[b.i], L2 = BG_LINE[(b.i + 2) % BG_LINE.length], nx = -(L2[1] - L[1]), ny = L2[0] - L[0], nl = Math.hypot(nx, ny);
      for (let j = -2; j <= 2; j++) { const bx = L[0] + nx / nl * j * 22, by = L[1] + ny / nl * j * 22; for (const k of this.K) if (!k.item && !k.air && Math.hypot(k.x - bx, k.y - by) < 12) { k.item = { k: this.rollItem(k), roll: .8 }; b.t = 2; if (k.me) beep(660, .05, 'square', .04, 300); this.fx.push({ k: 'caixa', x: bx, y: by, t: 0 }); } } }
    for (const p of this.proj) {
      p.t += dt;
      if (p.k === 'balao' && p.tg && !p.tg.fin) { const a = Math.atan2(p.tg.y - p.y, p.tg.x - p.x); p.vx += (Math.cos(a) * 250 - p.vx) * dt * 3; p.vy += (Math.sin(a) * 250 - p.vy) * dt * 3; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === 'bola') { const [sg, d] = this.near(p); p.seg = sg; const [ds] = this.segDist(p.x, p.y, BG_LAGOA.A, BG_LAGOA.B); if (d > BG.hw - 5 && ds > BG.sw - 5) { const L = BG_LINE[sg], nx = p.x - L[0], ny = p.y - L[1], nl = Math.hypot(nx, ny) || 1, vn = (p.vx * nx + p.vy * ny) / nl; if (vn > 0) { p.vx -= 2 * vn * nx / nl; p.vy -= 2 * vn * ny / nl; } p.x = L[0] + nx / nl * (BG.hw - 5); p.y = L[1] + ny / nl * (BG.hw - 5); } }
      for (const k of this.K) if (k !== p.by || p.t > .35) if (!k.fin && Math.hypot(k.x - p.x, k.y - p.y) < 12) { this.hit(k, p.by, p.k === 'bola' ? 'bola de praia' : 'balão d\'água'); p.dead = true; this.fx.push({ k: p.k === 'balao' ? 'água' : 'pó', x: p.x, y: p.y, t: 0, life: .5 }); break; }
      if (p.t > (p.k === 'balao' ? 4.5 : 3.5)) p.dead = true;
    }
    this.proj = this.proj.filter((p) => !p.dead);
    for (const u of this.puds) { u.t += dt; for (const k of this.K) if (!k.air && !u.used && Math.hypot(k.x - u.x, k.y - u.y) < 13 && (k !== u.by || u.t > 1)) { u.used = true; this.hit(k, u.by, 'protetor solar'); } }
    this.puds = this.puds.filter((u) => !u.used && u.t < 25);
  },
  rollItem(k) {
    const r = Math.random(), pos = k.pos || 6;
    if (pos <= 1) return r < .4 ? 'bola' : r < .8 ? 'protetor' : 'guarda';
    if (pos <= 3) return r < .3 ? 'bola' : r < .5 ? 'protetor' : r < .7 ? 'guarda' : r < .85 ? 'coco' : 'balao';
    if (pos >= 5 && r < .1) return 'onda';
    return r < .4 ? 'coco' : r < .7 ? 'balao' : r < .85 ? 'bola' : 'guarda';
  },
  useItem(k) {
    const it = k.item.k; k.item = null;
    if (it === 'coco') { k.boost = Math.max(k.boost, 1.3); if (k.me) pop('Água de coco!', W / 2, 90, '#9be37a'); beep(300, .2, 'sawtooth', .04, 300); }
    else if (it === 'guarda') { k.shield = 9; beep(700, .1, 'triangle', .04, 200); }
    else if (it === 'protetor') { this.puds.push({ x: k.x - Math.cos(k.h) * 16, y: k.y - Math.sin(k.h) * 16, t: 0, by: k }); beep(200, .1, 'triangle', .04, -100); }
    else if (it === 'bola') { const v = Math.max(k.s, 0) + 210; this.proj.push({ k: 'bola', x: k.x + Math.cos(k.h) * 12, y: k.y + Math.sin(k.h) * 12, vx: Math.cos(k.h) * v, vy: Math.sin(k.h) * v, t: 0, by: k, seg: k.seg }); beep(500, .08, 'square', .04, -100); }
    else if (it === 'balao') { const tg = this.K.find((q) => q.pos === k.pos - 1) || null; this.proj.push({ k: 'balao', x: k.x, y: k.y, vx: Math.cos(k.h) * (k.s + 80), vy: Math.sin(k.h) * (k.s + 80), t: 0, by: k, tg, seg: k.seg }); beep(800, .12, 'triangle', .04, -200); }
    else if (it === 'onda') { this.wave = 2.2; this.waveBy = k; pop('Onda!', W / 2, 70, '#6bcbff', true); beep(150, .5, 'sawtooth', .05, -60); }
  },
  hit(k, by, what) {
    if (k.shield > 0) { k.shield = 0; this.fx.push({ k: 'escudo', x: k.x, y: k.y, t: 0, life: .5 }); return; }
    k.spin = .9; k.drift = 0; k.s *= .4;
    if (k.me) { this.levou++; pop(`Acertado: ${what}!`, W / 2, 90, '#ffb3c8'); sfx.crash(); talk(FALA.bgRuim, .3); }
    else if (by && by.me) { this.acertos++; pop('Acertou!', W / 2, 90, '#bfefff'); sfx.point(); }
  },
  // ---------- desenho (provisório)
  draw(tt) {
    const Z = BG.Z, vw = W / Z, vh = H / Z;
    // dunas brancas com sombras compridas de fim de tarde
    R(0, 0, W, H, '#f4ecd8');
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(Z, Z); ctx.translate(-this.camX, -this.camY);
    for (let gx = Math.floor((this.camX - vw) / 120) * 120; gx < this.camX + vw; gx += 120) for (let gy = Math.floor((this.camY - vh) / 100) * 100; gy < this.camY + vh; gy += 100) {
      const hsh = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453, r = hsh - Math.floor(hsh);
      ctx.fillStyle = 'rgba(190,160,120,.22)'; ctx.beginPath(); ctx.ellipse(gx + r * 60 + 14, gy + r * 40 + 8, 34 + r * 20, 12 + r * 8, -.4, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,250,.6)'; ctx.beginPath(); ctx.ellipse(gx + r * 60, gy + r * 40, 30 + r * 18, 10 + r * 7, -.4, 0, TAU); ctx.fill();
      if (r > .55) { ctx.fillStyle = '#7fb069'; for (let j = 0; j < 5; j++) R(gx + 70 + j * 3 - r * 10, gy + 60 + Math.sin(j) * 3, 2, 3 + (j % 2), '#7fb069'); }
    }
    // pista: muretas (zebras vermelhas e brancas), areia batida, marcas de pneu
    const off = (d) => { ctx.beginPath(); BG_LINE.forEach((p, i) => { const q = BG_LINE[(i + 1) % BG_LINE.length], nx = -(q[1] - p[1]), ny = q[0] - p[0], nl = Math.hypot(nx, ny) || 1, x = p[0] + nx / nl * d, y = p[1] + ny / nl * d; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); };
    const path = () => off(0);
    ctx.lineJoin = 'round'; path(); ctx.strokeStyle = 'rgba(120,90,50,.25)'; ctx.lineWidth = BG.hw * 2 + 22; ctx.stroke();
    path(); ctx.strokeStyle = '#dcc596'; ctx.lineWidth = BG.hw * 2; ctx.stroke();
    for (const d of [-22, 22]) { off(d); ctx.strokeStyle = 'rgba(140,110,70,.16)'; ctx.lineWidth = 3; ctx.stroke(); }
    path(); ctx.strokeStyle = 'rgba(150,120,80,.22)'; ctx.lineWidth = 1.2; ctx.setLineDash([10, 8]); ctx.stroke(); ctx.setLineDash([]);
    for (const d of [-BG.hw - 3, BG.hw + 3]) { off(d); ctx.strokeStyle = NAVY; ctx.lineWidth = 7; ctx.stroke(); off(d); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.stroke(); off(d); ctx.strokeStyle = '#e8484a'; ctx.setLineDash([9, 9]); ctx.stroke(); ctx.setLineDash([]); }
    // atalho da lagoa: corredor de areia com a água no meio e muretas dos dois lados
    { const LG = BG_LAGOA, A = LG.A, B = LG.B, ang = Math.atan2(B[1] - A[1], B[0] - A[0]), len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      ctx.save(); ctx.translate(A[0], A[1]); ctx.rotate(ang); R(0, -BG.sw, len, BG.sw * 2, '#dcc596'); ctx.restore();
      const lg = ctx.createRadialGradient(LG.x, LG.y, 5, LG.x, LG.y, LG.rx); lg.addColorStop(0, '#2f8fd0'); lg.addColorStop(1, '#6fd0e0'); ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(LG.x, LG.y, LG.rx, LG.ry, ang, 0, TAU); ctx.fill();
      for (let i = 0; i < 6; i++) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(LG.x + Math.cos(i * 1.7) * 40, LG.y + Math.sin(i * 2.3) * 28, 4 + ((tt * 6 + i * 3) % 8), 0, TAU); ctx.stroke(); }
      // muretas do corredor só onde ele sai da pista principal
      if (!this.scW) { this.scW = []; for (const y of [-BG.sw - 3, BG.sw + 3]) for (let x = 0; x < len; x += 9) { const wx = A[0] + Math.cos(ang) * x - Math.sin(ang) * y, wy = A[1] + Math.sin(ang) * x + Math.cos(ang) * y; let md = Infinity; for (const q of BG_LINE) md = Math.min(md, Math.hypot(q[0] - wx, q[1] - wy)); if (md > BG.hw + 4) this.scW.push([x, y]); } }
      ctx.save(); ctx.translate(A[0], A[1]); ctx.rotate(ang); for (const [x, y] of this.scW) { R(x, y - 3.5, 9.5, 7, NAVY); R(x, y - 2.5, 9.5, 5, (x / 9) % 2 < 1 ? '#e8484a' : '#ffffff'); } ctx.restore(); }
    // estacas com bandeirinhas atrás das muretas (a cada tanto)
    for (let i = 0; i < BG_LINE.length; i += 12) { const p = BG_LINE[i], q = BG_LINE[(i + 1) % BG_LINE.length], nx = -(q[1] - p[1]), ny = q[0] - p[0], nl = Math.hypot(nx, ny) || 1; for (const sd of [-1, 1]) { const x = p[0] + nx / nl * sd * (BG.hw + 14), y = p[1] + ny / nl * sd * (BG.hw + 14); if (Math.abs(x - this.camX) > vw / 2 + 20 || Math.abs(y - this.camY) > vh / 2 + 20) continue; R(x - .8, y - 6, 1.6, 6, '#7a5233'); ctx.fillStyle = (i / 12) % 2 ? '#e8484a' : '#ffffff'; ctx.beginPath(); ctx.moveTo(x + .8, y - 6); ctx.lineTo(x + 6, y - 4.5); ctx.lineTo(x + .8, y - 3); ctx.fill(); } }
    // largada (quadriculado) e rampas
    { const p = BG_LINE[0], q = BG_LINE[1], a = Math.atan2(q[1] - p[1], q[0] - p[0]); ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(a); for (let j = -5; j < 5; j++) for (let r = 0; r < 2; r++) R(r * 4 - 4, j * BG.hw / 5, 4, BG.hw / 5, (j + r) % 2 ? '#ffffff' : '#1b1f4f'); ctx.restore(); }
    for (const r of BG_RAMPS) { const p = BG_LINE[r.i], q = BG_LINE[r.i + 1], a = Math.atan2(q[1] - p[1], q[0] - p[0]); ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(a); const g = ctx.createLinearGradient(-10, 0, 10, 0); g.addColorStop(0, '#c9a46a'); g.addColorStop(1, '#fff6e0'); ctx.fillStyle = g; ctx.fillRect(-10, -BG.hw + 4, 20, BG.hw * 2 - 8); ctx.strokeStyle = NAVY; ctx.lineWidth = .6; ctx.strokeRect(-10, -BG.hw + 4, 20, BG.hw * 2 - 8); ctx.restore(); }
    // caixas, poças, projéteis
    for (const b of this.boxes) { if (b.t > 0) continue; const L = BG_LINE[b.i], L2 = BG_LINE[(b.i + 2) % BG_LINE.length], nx = -(L2[1] - L[1]), ny = L2[0] - L[0], nl = Math.hypot(nx, ny);
      for (let j = -2; j <= 2; j++) { const x = L[0] + nx / nl * j * 22, y = L[1] + ny / nl * j * 22; ctx.save(); ctx.translate(x, y); ctx.rotate(tt * 1.5 + j); R(-5, -5, 10, 10, `hsl(${(tt * 120 + j * 60) % 360},80%,65%)`); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.strokeRect(-5, -5, 10, 10); ctx.fillStyle = '#ffffff'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', 0, 3); ctx.textAlign = 'left'; ctx.restore(); } }
    for (const u of this.puds) { ctx.fillStyle = 'rgba(255,250,235,.85)'; ctx.beginPath(); ctx.ellipse(u.x, u.y, 12, 8, .3, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,200,80,.8)'; ctx.lineWidth = 1; ctx.stroke(); R(u.x - 2, u.y - 6, 4, 6, '#ffb347'); }
    for (const p of this.proj) { if (p.k === 'bola') { ctx.save(); ctx.translate(p.x, p.y - Math.abs(Math.sin(p.t * 9)) * 6); ctx.rotate(p.t * 8); for (let i = 0; i < 4; i++) { ctx.fillStyle = ['#ff6b6b', '#ffffff', '#6bcbff', '#ffd166'][i]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 5, i * Math.PI / 2, (i + 1) * Math.PI / 2); ctx.fill(); } ctx.restore(); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 3, 5, 2, 0, 0, TAU); ctx.fill(); } else { ctx.fillStyle = '#6bcbff'; ctx.beginPath(); ctx.arc(p.x, p.y - 4, 5, 0, TAU); ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = .7; ctx.stroke(); R(p.x - .5, p.y + 1, 1, 4, '#ffffff'); } }
    // efeitos de chão
    for (const f of this.fx) { const k = f.t / (f.life || .6); ctx.globalAlpha = 1 - k;
      if (f.k === 'pó') { ctx.fillStyle = '#fff8ea'; ctx.beginPath(); ctx.arc(f.x, f.y, 2 + k * 6, 0, TAU); ctx.fill(); }
      else if (f.k === 'água') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(f.x, f.y, 2 + k * 7, 0, TAU); ctx.stroke(); }
      else if (f.k === 'faísca' || f.k === 'faísca2') R(f.x - 1, f.y - 1, 2, 2, f.k === 'faísca' ? '#6bd8ff' : '#ffa53a');
      else if (f.k === 'batida') { ctx.fillStyle = '#fff6d6'; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; R(f.x + Math.cos(a) * (2 + k * 8), f.y + Math.sin(a) * (2 + k * 8), 2, 2, '#fff6d6'); } }
      else if (f.k === 'caixa' || f.k === 'escudo') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(f.x, f.y, 4 + k * 14, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1; }
    // bugues (os que estão no ar por cima)
    for (const k of [...this.K].sort((a, b) => (a.air ? 1 : 0) - (b.air ? 1 : 0))) this.drawBuggy(k, tt);
    ctx.restore();
    if (this.wave > 0) { ctx.fillStyle = `rgba(107,203,255,${Math.min(.35, this.wave * .2)})`; ctx.fillRect(0, 0, W, H); }
    this.minimap();
    // item na mão (com a roleta) e a posição grande
    const m = this.me; R(W - 34, H - 34, 26, 26, 'rgba(27,31,79,.6)'); ctx.strokeStyle = '#fff6d6'; ctx.lineWidth = 1; ctx.strokeRect(W - 34, H - 34, 26, 26);
    if (m.item) this.drawItemIcon(m.item.roll > 0 ? ['bola', 'balao', 'coco', 'guarda', 'protetor'][Math.floor(tt * 14) % 5] : m.item.k, W - 21, H - 21);
    ctx.fillStyle = this.rank === 1 ? '#ffd166' : '#fff6d6'; ctx.font = 'bold 18px sans-serif'; ctx.strokeStyle = NAVY; ctx.lineWidth = 3; ctx.strokeText(`${this.rank}º`, 10, H - 12); ctx.fillText(`${this.rank}º`, 10, H - 12);
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
    const z = k.air ? Math.sin(Math.PI * clamp(1 - k.air / (k.air0 || 1), 0, 1)) * 10 : k.hop ? Math.sin(k.hop / .18 * Math.PI) * 3 : 0;
    ctx.fillStyle = 'rgba(80,60,30,.25)'; ctx.beginPath(); ctx.ellipse(k.x + 2, k.y + 3, 12 - z * .3, 8 - z * .2, k.h, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(k.x, k.y - z); ctx.rotate(k.h); const sc = 1 + z / 30; ctx.scale(sc, sc);
    for (const [wx, wy] of [[6, -6], [6, 6], [-6, -7], [-6, 7]]) R(wx - 3, wy - 2, 6, 4, '#2a2a33');
    ctx.fillStyle = k.col; ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(10, 4); ctx.lineTo(-8, 6); ctx.lineTo(-9, -6); ctx.closePath(); ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = .9; ctx.stroke();
    ctx.strokeStyle = '#555a6a'; ctx.lineWidth = 1.1; ctx.strokeRect(-6, -5, 9, 10);
    if (k.me) { ctx.fillStyle = '#f4efe6'; ctx.beginPath(); ctx.arc(-1, 0, 3.6, 0, TAU); ctx.fill(); R(-3.5, -3.2, 5, 6.4, '#3b6fd6'); R(-1.5, -.6, 4, 1.2, '#ffffff'); ctx.fillStyle = '#7fdcff'; ctx.beginPath(); ctx.arc(-1, 3.6, .9, 0, TAU); ctx.arc(-1, -3.6, .9, 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = k.col; ctx.beginPath(); ctx.arc(-1, 0, 3.8, 0, TAU); ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = .6; ctx.stroke(); R(1, -2, 1.6, 4, '#1b1f4f'); }
    ctx.restore();
    if (k.shield > 0) { ctx.strokeStyle = `rgba(255,107,107,${.5 + .3 * Math.sin(tt * 8)})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(k.x, k.y - z, 14, 0, TAU); ctx.stroke(); }
    if (k.me) { ctx.fillStyle = '#fff6d6'; ctx.beginPath(); ctx.moveTo(k.x, k.y - z - 15); ctx.lineTo(k.x - 3, k.y - z - 20); ctx.lineTo(k.x + 3, k.y - z - 20); ctx.fill(); }
  },
  minimap() {
    const s = .041, x0 = W - 90, y0 = 6; R(x0 - 4, y0 - 3, 88, 54, 'rgba(27,31,79,.45)');
    ctx.strokeStyle = '#fff6d6'; ctx.lineWidth = 2; ctx.beginPath(); BG_LINE.forEach((p, i) => { const x = x0 + (p[0] - 180) * s, y = y0 + (p[1] - 230) * s; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.stroke();
    for (const k of this.K) { ctx.fillStyle = k.me ? '#3b6fd6' : k.col; ctx.beginPath(); ctx.arc(x0 + (k.x - 180) * s, y0 + (k.y - 230) * s, k.me ? 2.6 : 1.8, 0, TAU); ctx.fill(); if (k.me) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = .8; ctx.stroke(); } }
  },
};
