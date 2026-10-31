/* ============================================================ prova nova: Voo do teco-teco, em 3D (31/10/2026, 2ª versão)
   O dono achou a 1ª versão (de lado, com física de estol) difícil de subir e pediu movimentação livre, em 3D.
   Voo livre sobre a Costa WinnerZ, com câmera atrás do avião (three.js r160, carregado do jsDelivr; o jogo desenha a cena 3D
   numa tela à parte e copia para a tela do jogo, e os avisos 2D vão por cima).
   ◀ ▶ fazem a curva (o avião inclina), ▲ sobe e ▼ desce; soltando, ele volta a voar reto e nivelado. ✕ turbo (recarrega),
   ○ giro de 360°. Segurar ▲ subindo por quase 1 s faz um looping (▼ lá no alto faz o looping invertido).
   Sem a faixa puxada atrás: em 3D ela ficava entre a câmera e o avião.
   Percurso: argolas em circuito (a próxima brilha e uma seta na borda aponta para ela; em sequência multiplicam até ×8,
   e uma volta completa vale bônus), balões, gaivotas, e os marcos: farol na falésia, viaduto do skatepark (dá para passar por
   baixo), laje com a cesta e roda-gigante. Rasante perto do topo de um marco vale bônus. Bater rodopia o avião sem acabar.
   Arte provisória: tudo feito pelo jogo em formas simples com contorno escuro. */
const TC = { dur: 90, v: 30, vt: 48, turbo: 1.2, recarga: 4, yaw: 1.25, pitch: .6, ceil: 220, R: 1150 };
if (typeof Music !== 'undefined' && Music.songs.surfe) Music.songs.teco = Music.songs.surfe;
FALA.intro.teco = [
  'Teco-teco abastecido, hélice girando e eu de piloto. Agora em 3D, que é para eu me perder em todas as direções.',
  'A argola que brilha é a próxima. A seta na borda mostra onde ela está. Fácil. Eu acho.',
  'Dá para passar por baixo do viaduto. Eu não recomendo. Eu recomendo muito.',
];
FALA.tcBoa = ['Looping! Meu estômago ficou lá atrás.', 'Por baixo do viaduto! Os skatistas aplaudiram.', 'Argola atrás de argola. Eu sou um piloto de verdade.'];
FALA.tcRuim = ['Bati. O avião tá bem, eu tô tonto.', 'A gaivota tinha preferência, eu acho.', 'O chão apareceu do nada. Ele sempre faz isso.'];
const tcCoast = (x) => -40 + 35 * Math.sin(x / 170) + 18 * Math.sin(x / 61 + 1);
const TC_RUN = { x0: -110, x1: 110, z: -160 };
const TC_ISL = [[620, 260, 55], [230, 330, 38], [-420, 280, 46], [-860, 210, 30]];
// altura do chão (o mesmo para o desenho e para as batidas): mar abaixo de 0, praia, morros para dentro e ilhotas
function tcGround(x, z) {
  if (z > TC_RUN.z - 14 && z < TC_RUN.z + 14 && x > TC_RUN.x0 - 20 && x < TC_RUN.x1 + 20) return 2;
  const d = tcCoast(x) - z;
  if (d < 0) { let h = -4; for (const [cx, cz, r] of TC_ISL) { const q = Math.hypot(x - cx, z - cz); if (q < r) h = Math.max(h, (1 - q / r) * 14 - 1.5); } return h; }
  if (d < 25) return d / 25 * 1.6;
  const k = clamp((d - 60) / 160, 0, 1), n = Math.sin(x / 47) * Math.cos(z / 39) + .6 * Math.sin((x + z) / 23) + .4 * Math.cos(x / 13 - z / 29);
  return 1.6 + (d - 25) * .05 + k * (18 + 14 * n);
}
const teco = {
  id: 'teco', name: 'Voo do teco-teco', tag: 'Aeroclube da Restinga · 90 s · 3D', wide: true, hi: true, paint: true, two: false, dur: TC.dur,
  med: [5000, 11000, 17000], ia: 13000, nota: 'deu um looping em cima da roda-gigante',
  desc: 'Voo livre em 3D pela costa: argolas, balões, rasantes nos marcos e loopings.',
  steps: () => [
    `Voo livre: ◀ ▶ fazem a curva, ▲ sobe e ▼ desce. Soltando, o avião volta a voar reto. ${actName()} dá um turbo curto, que recarrega sozinho.`,
    'Siga as argolas: a próxima brilha, e a seta na borda da tela aponta para ela. Em sequência, elas multiplicam os pontos. Estoure os balões.',
    `Passe raspando pelo farol, pelo viaduto (dá para passar por baixo!), pela laje e pela roda-gigante. Segure ▲ para fazer um looping. ${touch ? 'Giro' : 'X'} dá um giro. Bater faz o avião rodopiar.`,
  ],
  hint: () => '',
  gp: 'Controle: analógico ou direcional pilota · ✕ turbo · ○ giro · Start pausa',
  ctl: [['◀ ▶', 'curva'], ['▲ ▼', 'subir / descer'], ['Espaço', 'turbo', 'kb'], ['X', 'giro', 'kb'], ['Turbo', 'turbo', 'touch'], ['Giro', 'giro', 'touch'], ['Esc', 'pausa', 'kb']],
  pad: { dirs: 'lrud', a: 'Turbo', b: 'Giro' }, bannerY: 40,
  init() {
    Object.assign(this, {
      t: 0, left: TC.dur, score: 0, p: { x: TC_RUN.x0 + 10, y: 2.6, z: TC_RUN.z }, yaw: 0, th: 0, bank: 0, roll: 0, rollT: 0, spd: 16, takeoff: 2.2,
      upT: 0, dnT: 0, loop: 0, loopDir: 1, loopA: 0, spin: 0, spinA: 0, turboT: 0, tank: 1, combo: 0, best: 0, next: 0, lastRing: 0, laps: 0,
      rings: 0, balloons: 0, loops: 0, giros: 0, rasantes: 0, crashes: 0, fx: [], trail: [], lmT: {}, over: false, overT: 0, warnT: 0,
    });
    this.course();
    this.no3d = !window.THREE; if (!this.no3d) { try { this.build3d(); this.reset3d(); } catch (e) { this.no3d = true; } }
  },
  // ---------- percurso: argolas em circuito, balões, gaivotas, marcos e as partes sólidas
  course() {
    if (this.C) { for (const r of this.C.rings) r.done = false; for (const b of this.C.balloons) b.pop = false; for (const g of this.C.gulls) g.hit = false; return; }
    const c = tcCoast, zr = TC_RUN.z;
    const WP = [[230, 24, zr + 4], [260, 30, c(260) - 30], [350, 42, c(350) - 8], [470, 64, c(470) + 6], [570, 44, c(570) - 22], [690, 40, c(690) - 50], [800, 46, c(800) - 66],
      [900, 32, c(900) - 20], [960, 24, c(960) + 70], [880, 16, 210], [740, 13, 300], [580, 28, 330], [420, 58, 300], [250, 88, 250], [90, 100, 190], [-60, 78, 140],
      [-210, 48, 90], [-300, 28, c(-300) + 10], [-390, 9, c(-390) - 45], [-480, 22, c(-480) - 30], [-610, 34, c(-610) - 4], [-700, 30, c(-760) + 14], [-830, 50, c(-830) + 40],
      [-760, 70, 90], [-560, 60, 60], [-380, 44, 30], [-230, 34, c(-230) - 60], [-80, 26, zr + 6]];
    const rings = WP.map(([x, y, z], i) => ({ x, y: i === 18 ? y : Math.max(y, tcGround(x, z) + 10), z, i }));
    for (let i = 0; i < rings.length; i++) { const a = rings[(i - 1 + rings.length) % rings.length], b = rings[(i + 1) % rings.length], dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L = Math.hypot(dx, dy, dz); Object.assign(rings[i], { nx: dx / L, ny: dy / L * .6, nz: dz / L, r: 7, done: false }); const n = Math.hypot(rings[i].nx, rings[i].ny, rings[i].nz); rings[i].nx /= n; rings[i].ny /= n; rings[i].nz /= n; }
    const balloons = [], R0 = (a, b) => a + Math.random() * (b - a);
    for (let k = 0; k < 11; k++) {
      const a = rings[(k * 5 + 2) % rings.length], b = rings[(k * 5 + 3) % rings.length], cx = (a.x + b.x) / 2 + R0(-40, 40), cz = (a.z + b.z) / 2 + R0(-40, 40), cy = Math.max((a.y + b.y) / 2 + R0(-10, 20), tcGround(cx, cz) + 12);
      const n = 4 + Math.floor(Math.random() * 3); for (let j = 0; j < n; j++) balloons.push({ x: cx + R0(-12, 12), y: cy + R0(-6, 8), z: cz + R0(-12, 12), c: j % 4, gold: Math.random() < .12, ph: Math.random() * TAU, pop: false });
    }
    const gulls = []; for (const [gx, gy, gz] of [[330, 50, 120], [-150, 60, 200], [820, 40, 120], [-650, 45, 140], [100, 70, 40]]) for (let j = 0; j < 5; j++) gulls.push({ cx: gx, cy: gy + j * 1.5, cz: gz, r: 18 + j * 3, ph: j * 1.3, w: .5 + Math.random() * .2, hit: false });
    // marcos (com as partes sólidas e o lugar do rasante)
    const fx = 420, fz = c(420) + 4, vx = -390, vz = c(-390) - 45, lx = 790, lz = c(790) - 62, rx = -760, rz = c(-760) - 12;
    const lm = [
      { kind: 'farol', x: fx, z: fz, top: 56, rad: 16, solid: [{ cyl: [fx, fz, 18, -5, 22] }, { cyl: [fx, fz, 3.8, 22, 56] }] },
      { kind: 'viaduto', x: vx, z: vz, top: 21, rad: 60, solid: [{ box: [vx - 58, 17.5, vz - 5, vx + 58, 21, vz + 5] }, { box: [vx - 50, -2, vz - 3, vx - 44, 17.5, vz + 3] }, { box: [vx + 44, -2, vz - 3, vx + 50, 17.5, vz + 3] }, { box: [vx - 10, -2, vz - 6, vx + 10, 3, vz + 6] }], under: [vx - 42, 4, vz - 6, vx + 42, 17, vz + 6] },
      { kind: 'laje', x: lx, z: lz, top: 32, rad: 18, solid: [{ box: [lx - 11, -2, lz - 11, lx + 11, 26, lz + 11] }, { box: [lx - .6, 26, lz + 6, lx + .6, 32, lz + 7.5] }] },
      { kind: 'roda', x: rx, z: rz, top: 56, rad: 26, solid: [{ wheel: [rx, 30, rz, 25, 2.5] }, { box: [rx - 12, -2, rz - 4, rx + 12, 6, rz + 4] }] },
      { kind: 'hangar', x: -40, z: zr - 30, top: 12, rad: 0, solid: [{ box: [-56, 0, zr - 40, -24, 11, zr - 20] }] },
    ];
    this.C = { rings, balloons, gulls, lm };
  },
  hud() { return [['Pontos', nf(this.score)], ['Tempo', `${Math.ceil(this.left)}s`, this.left <= 10], ['Sequência', this.combo ? `×${Math.min(this.combo, 8)}` : '—', this.combo >= 3], ['Turbo', this.turboT > 0 ? 'ligado' : this.tank >= 1 ? 'pronto' : `${Math.floor(this.tank * 100)}%`, this.tank >= 1]]; },
  stats() { return [`${this.rings} argolas · melhor sequência ×${Math.min(this.best, 8)}${this.laps ? ` · ${this.laps} volta${this.laps > 1 ? 's' : ''}` : ''}`, `${this.balloons} balões · ${this.loops} loopings · ${this.giros} giros · ${this.rasantes} rasantes`, `${this.crashes} batidas`]; },
  demo() { Object.assign(this, { takeoff: 0, spd: TC.v }); const r = this.C.rings[2]; Object.assign(this.p, { x: r.x - r.nx * 60, y: r.y - r.ny * 60, z: r.z - r.nz * 60 }); this.yaw = Math.atan2(r.nz, r.nx); },
  fwd() { const c = Math.cos(this.th); return [Math.cos(this.yaw) * c, Math.sin(this.th), Math.sin(this.yaw) * c]; },
  add(p, txt, pos, col = '#fff6d6') { this.score += p; const s = this.toScreen(pos); pop(`${txt} +${nf(p)}`, s ? s[0] : W / 2, s ? s[1] - 12 : 60, col); },
  // ---------- quadro a quadro
  update(dt, I) {
    this.t += dt; this.left = Math.max(0, TC.dur - this.t);
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < .8);
    if (this.over) { this.overT += dt; this.move(dt, 0, 0); if (!this.no3d) this.camStep(Math.min(1, dt * 5)); return this.overT > 1.6; }
    if (this.left <= 0) { this.over = true; this.overT = 0; talk(this.loops ? FALA.tcBoa : FALA.tcRuim, .8); return false; }
    let ix = I.ax || 0, iy = (I.u ? 1 : 0) - (I.d ? 1 : 0) || (Math.abs(I.ay || 0) > .2 ? -I.ay : 0);
    if (I.pa && this.tank >= 1 && !this.spin) { this.turboT = TC.turbo; this.tank = 0; beep(180, .25, 'sawtooth', .04, 260); }
    if (I.pb && !this.rollT && !this.spin && !this.loop && this.takeoff <= 0) { this.rollT = .65; this.rollDir = ix >= 0 ? 1 : -1; this.giros++; this.add(150, 'Giro', this.p, '#bfefff'); beep(700, .12, 'triangle', .03, 400); }
    if (this.turboT > 0) this.turboT -= dt; else this.tank = Math.min(1, this.tank + dt / TC.recarga);
    if (this.takeoff > 0) { this.takeoff -= dt; ix = 0; iy = this.takeoff < 1.6 ? .7 : 0; }
    this.move(dt, ix, iy);
    this.checks(dt);
    this.trail.push([this.p.x, this.p.y, this.p.z]); if (this.trail.length > 40) this.trail.shift();
    if (!this.no3d) this.camStep(Math.min(1, dt * 5));
    return false;
  },
  move(dt, ix, iy) {
    const want = (this.turboT > 0 ? TC.vt : TC.v) - 6 * Math.sin(this.th);
    this.spd += (want - this.spd) * Math.min(1, dt * (this.takeoff > 0 ? 1.4 : 1.8));
    if (this.spin > 0) {
      // rodopio depois da batida: gira, perde embalo e sobe um pouco para sair do chão
      this.spin -= dt; this.spinA += dt * 14; this.spd = Math.max(16, this.spd * (1 - dt)); this.th += (.25 - this.th) * dt * 3; ix = iy = 0;
      if (this.spin <= 0) this.spinA = 0;
    } else if (this.loop) {
      // looping: o nariz dá a volta inteira num círculo de pé
      const w = 2.7 * this.loopDir; this.th += w * dt; this.loopA += Math.abs(w) * dt;
      if (this.loopA >= TAU - .05) { this.th = 0; this.loop = 0; this.loops++; const inv = this.loopDir < 0; this.add(inv ? 700 : 450, inv ? 'Looping invertido!' : 'Looping!', this.p, '#ffd166'); sfx.big(); if (this.loops === 1) talk(FALA.tcBoa, .5); }
    } else {
      this.yaw += ix * TC.yaw * dt;
      this.th += (clamp(iy, -1, 1) * TC.pitch - this.th) * Math.min(1, dt * 2.6);
      if (this.p.y > TC.ceil) this.th = Math.min(this.th, -.15);
      // looping: segurar ▲ já subindo; invertido: segurar ▼ lá no alto
      this.upT = iy > .6 && this.th > .5 ? this.upT + dt : 0; this.dnT = iy < -.6 && this.th < -.5 && this.p.y > 70 ? this.dnT + dt : 0;
      if (this.upT > .8 && this.takeoff <= 0) { this.loop = 1; this.loopDir = 1; this.loopA = this.th; this.upT = 0; }
      if (this.dnT > .8) { this.loop = 1; this.loopDir = -1; this.loopA = -this.th; this.dnT = 0; }
      // longe demais: o avião faz a curva de volta sozinho
      const d = Math.hypot(this.p.x, this.p.z - 60);
      if (d > TC.R) { const back = Math.atan2(60 - this.p.z, -this.p.x); let e = back - this.yaw; e = Math.atan2(Math.sin(e), Math.cos(e)); this.yaw += clamp(e, -1, 1) * dt * 1.4; ix = Math.sign(e); if (this.warnT <= 0) { pop('Volte para a costa', W / 2, 60, '#fff6d6', true); this.warnT = 3; } }
    }
    this.warnT -= dt;
    this.bank += (-ix * .75 - this.bank) * Math.min(1, dt * 4);
    if (this.rollT > 0) { this.rollT -= dt; this.roll = this.rollDir * (1 - Math.max(0, this.rollT) / .65) * TAU; if (this.rollT <= 0) { this.rollT = 0; this.roll = 0; } }
    const f = this.fwd(); this.p.x += f[0] * this.spd * dt; this.p.y += f[1] * this.spd * dt; this.p.z += f[2] * this.spd * dt;
    if (this.takeoff > 0 && this.th <= 0) this.p.y = Math.max(this.p.y, 2.6);
  },
  // ---------- batidas e pontos
  crash(why) {
    if (this.spin > 0 || this.takeoff > 0) return;
    this.spin = 1.1; this.spinA = 0; this.crashes++; this.combo = 0; this.loop = 0; this.rollT = 0; this.roll = 0;
    const g = tcGround(this.p.x, this.p.z); if (this.p.y < g + 6) this.p.y = Math.max(g, 0) + 6; this.th = .3;
    shake = .3; sfx.crash(); this.fx.push({ k: 'boom', p: { ...this.p }, t: 0 });
    pop(why, W / 2, 50, '#ffb3c8', true); if (Math.random() < .5) talk(FALA.tcRuim, .5);
  },
  solidHit(x, y, z, pad) {
    for (const l of this.C.lm) for (const s of l.solid) {
      if (s.box) { const [a, b, c, d, e, f] = s.box; if (x > a - pad && x < d + pad && y > b - pad && y < e + pad && z > c - pad && z < f + pad) return l; }
      else if (s.cyl) { const [cx, cz, r, y0, y1] = s.cyl; if (y > y0 - pad && y < y1 + pad && Math.hypot(x - cx, z - cz) < r + pad) return l; }
      else if (s.wheel) { const [cx, cy, cz, r, th] = s.wheel; if (Math.abs(z - cz) < th + pad && Math.hypot(x - cx, y - cy) < r + pad) return l; }
    }
    return null;
  },
  checks(dt) {
    if (this.spin > 0 || this.takeoff > 0) return;
    const P = this.p, g = tcGround(P.x, P.z);
    if (P.y < Math.max(g, 0) + 1.2) return this.crash(g < 0 ? 'Caiu na água!' : 'Bateu no chão!');
    if (this.solidHit(P.x, P.y, P.z, 1.4)) return this.crash('Bateu!');
    // argolas: atravessar o plano da argola por dentro
    const prev = this.trail.length ? this.trail[this.trail.length - 1] : [P.x, P.y, P.z], rings = this.C.rings;
    for (const r of rings) {
      if (r.done) continue;
      const s0 = (prev[0] - r.x) * r.nx + (prev[1] - r.y) * r.ny + (prev[2] - r.z) * r.nz, s1 = (P.x - r.x) * r.nx + (P.y - r.y) * r.ny + (P.z - r.z) * r.nz;
      if (s0 * s1 > 0 || Math.abs(s1) > 6) continue;
      const k = s0 / (s0 - s1 || 1), q = [prev[0] + (P.x - prev[0]) * k - r.x, prev[1] + (P.y - prev[1]) * k - r.y, prev[2] + (P.z - prev[2]) * k - r.z], d = Math.hypot(...q);
      if (d < r.r - .6) {
        r.done = true; const inSeq = r.i === this.next && this.t - this.lastRing < 12; this.combo = inSeq || !this.rings ? this.combo + 1 : 1; this.best = Math.max(this.best, this.combo); this.rings++; this.lastRing = this.t;
        const m = Math.min(this.combo, 8); this.add(100 * m, m > 1 ? `×${m}` : 'Argola', r, '#bfefff'); beep(660 + Math.min(this.combo, 10) * 60, .07, 'square', .04, 120); this.fx.push({ k: 'ring', p: { x: r.x, y: r.y, z: r.z }, t: 0 });
        this.next = (r.i + 1) % rings.length;
        if (rings.every((q) => q.done)) { this.laps++; this.add(1000, 'Volta completa!', P, '#ffd166'); sfx.big(); for (const q of rings) q.done = false; }
      } else if (d < r.r + 1.6) { pop('Raspou!', W / 2, 60, '#fff6d6'); this.combo = 0; beep(200, .05, 'triangle', .04, -60); }
    }
    if (this.t - this.lastRing > 12 && this.combo) { this.combo = 0; pop('Sequência perdida', W / 2, 60, '#fff6d6'); }
    for (const b of this.C.balloons) { if (b.pop) continue; const by = b.y + Math.sin(this.t * 2 + b.ph) * .8; if (Math.hypot(b.x - P.x, by - P.y, b.z - P.z) < 3.2) { b.pop = true; this.balloons++; this.add(b.gold ? 250 : 50, b.gold ? 'Dourado' : 'Balão', b, b.gold ? '#ffd166' : '#fff6d6'); beep(b.gold ? 1300 : 900, .05, 'square', .04, -300); this.fx.push({ k: 'pop', p: { x: b.x, y: by, z: b.z }, t: 0, c: b.c, gold: b.gold }); } }
    for (const q of this.C.gulls) { if (q.hit) continue; const a = this.t * q.w + q.ph, gx = q.cx + Math.cos(a) * q.r, gz = q.cz + Math.sin(a) * q.r; if (Math.hypot(gx - P.x, q.cy - P.y, gz - P.z) < 2.4) { q.hit = true; return this.crash('Gaivota!'); } }
    // marcos: rasante perto do topo e por baixo do viaduto (uma vez a cada 8 s por marco)
    for (const l of this.C.lm) {
      if (!l.rad || (this.lmT[l.kind] || 0) > this.t) continue;
      if (l.under) { const [a, b, c, d, e, f] = l.under; if (P.x > a && P.x < d && P.y > b && P.y < e && P.z > c && P.z < f) { this.lmT[l.kind] = this.t + 8; this.rasantes++; this.add(900, 'Por baixo do viaduto!', P, '#ffd166'); sfx.big(); talk(FALA.tcBoa, .4); continue; } }
      const hd = Math.hypot(P.x - l.x, P.z - l.z), cl = P.y - l.top;
      if (hd < l.rad + 6 && cl > 0 && cl < 12) { this.lmT[l.kind] = this.t + 8; this.rasantes++; const p = Math.round((200 + (12 - cl) * 50) / 10) * 10; this.add(p, 'Rasante!', P, '#bfefff'); sfx.point(); }
    }
  },
  // ---------- 3D
  build3d() {
    if (teco.G) return;
    const T = THREE, G = {}, cv = document.createElement('canvas');
    G.r = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); G.r.setPixelRatio(1); G.r.setSize(960, 540, false); G.cv = cv;
    G.s = new T.Scene(); G.s.background = new T.Color(0x8fd0f5); G.s.fog = new T.Fog(0xc4e8fb, 320, 1500);
    G.cam = new T.PerspectiveCamera(66, 16 / 9, .5, 2600);
    G.s.add(new T.HemisphereLight(0xdff3ff, 0x8a7a55, 1.6)); const sun = new T.DirectionalLight(0xfff1d6, 2.4); sun.position.set(300, 500, 250); G.s.add(sun);
    const grad = new T.DataTexture(new Uint8Array([110, 185, 255]), 3, 1, T.RedFormat); grad.minFilter = grad.magFilter = T.NearestFilter; grad.needsUpdate = true;
    const toon = (c, o = {}) => new T.MeshToonMaterial({ color: c, gradientMap: grad, ...o }), ink = new T.MeshBasicMaterial({ color: 0x1b1f4f, side: T.BackSide });
    const mk = (geo, c, line = .06, o) => { const g = new T.Group(), m = new T.Mesh(geo, typeof c === 'number' ? toon(c, o) : c); g.add(m); if (line) { const e = new T.Mesh(geo, ink); e.scale.setScalar(1 + line); g.add(e); } return g; };
    G.toon = toon; G.mk = mk;
    // mar e chão
    const sea = new T.Mesh(new T.PlaneGeometry(7000, 7000), new T.MeshLambertMaterial({ color: 0x3fb7d2 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -.2; G.s.add(sea);
    const N = 170, S = 2600, geo = new T.PlaneGeometry(S, S, N, N); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), cc = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = tcGround(x, z); pos.setY(i, h);
      if (h < .3) cc.set(0x6fd3d8); else if (h < 1.8) cc.set(0xf0d9a0); else if (h < 8) cc.set(0x8fcf63); else if (h < 26) cc.set(0x6cb355); else cc.set(0x4f9a4a);
      if (Math.abs(z - TC_RUN.z) < 9 && x > TC_RUN.x0 && x < TC_RUN.x1) cc.set(0xa7a49a);
      col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.computeVertexNormals();
    G.s.add(new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
    for (let x = TC_RUN.x0 + 10; x < TC_RUN.x1; x += 16) { const m = new T.Mesh(new T.PlaneGeometry(7, .7), new T.MeshBasicMaterial({ color: 0xffffff })); m.rotation.x = -Math.PI / 2; m.position.set(x, 2.08, TC_RUN.z); G.s.add(m); }
    // marcos
    const at = (o, x, y, z) => { o.position.set(x, y, z); G.s.add(o); return o; };
    for (const l of this.C.lm) {
      if (l.kind === 'farol') {
        at(mk(new T.CylinderGeometry(17, 19, 27, 10), 0xc59a62, .03), l.x, 8.5, l.z); at(mk(new T.CylinderGeometry(17.2, 17.2, 1.2, 10), 0x7cc35a, .02), l.x, 22.4, l.z);
        for (let i = 0; i < 6; i++) at(mk(new T.CylinderGeometry(3.5 - i * .15, 3.8 - i * .15, 5.6, 14), i % 2 ? 0xffffff : 0xe0453c, .04), l.x, 25.3 + i * 5.6, l.z);
        at(mk(new T.CylinderGeometry(3.4, 3.4, 4, 12), 0x2d3350, .05), l.x, 59.5 - 1, l.z); l.lamp = at(new T.Mesh(new T.SphereGeometry(2.2, 12, 8), new T.MeshBasicMaterial({ color: 0xfff1a0 })), l.x, 58.5, l.z); at(mk(new T.ConeGeometry(4.2, 3.4, 12), 0xe0453c, .05), l.x, 62.2, l.z);
      } else if (l.kind === 'viaduto') {
        at(mk(new T.BoxGeometry(116, 3.5, 10), 0xb9bfcc, .02), l.x, 19.25, l.z); for (const dx of [-47, 47]) at(mk(new T.BoxGeometry(6, 19.5, 6), 0x9aa0b0, .03), l.x + dx, 7.75, l.z);
        at(mk(new T.BoxGeometry(20, 5, 12), 0xd07ad6, .04), l.x, 0.5, l.z); for (let i = -5; i <= 5; i++) at(new T.Mesh(new T.BoxGeometry(4, .1, .5), new T.MeshBasicMaterial({ color: 0xffffff })), l.x + i * 10, 21.05, l.z);
      } else if (l.kind === 'laje') {
        at(mk(new T.BoxGeometry(22, 28, 22), 0xf2c14e, .02), l.x, 12, l.z); for (let r = 0; r < 3; r++) for (let c = -1; c <= 1; c++) for (const s of [-1, 1]) { const w = at(new T.Mesh(new T.PlaneGeometry(4, 4), toon(0x6fb7d9)), l.x + c * 6.5, 6 + r * 7.5, l.z + s * 11.05); if (s < 0) w.rotation.y = Math.PI; }
        at(mk(new T.BoxGeometry(1.2, 7, 1.2), 0x555a6a, .06), l.x, 29.5, l.z + 6.8); at(mk(new T.BoxGeometry(6, 4, .5), 0xffffff, .06), l.x, 33, l.z + 6.8); const hoop = at(mk(new T.TorusGeometry(1.3, .18, 8, 18), 0xff6a2a, 0), l.x, 31.6, l.z + 5); hoop.rotation.x = Math.PI / 2;
        at(mk(new T.CylinderGeometry(2.4, 2.4, 3, 10), 0x3b6fd6, .05), l.x - 6, 27.5, l.z - 5);
      } else if (l.kind === 'roda') {
        const w = new T.Group(); w.position.set(l.x, 30, l.z); G.s.add(w); l.wheel = w;
        w.add(mk(new T.TorusGeometry(25, .9, 8, 40), 0xe04a8a, .08)); for (let i = 0; i < 8; i++) { const sp = new T.Mesh(new T.BoxGeometry(50, .35, .35), toon(0x9aa0b0)); sp.rotation.z = i / 8 * Math.PI; w.add(sp); }
        l.gond = []; for (let i = 0; i < 8; i++) { const g = mk(new T.BoxGeometry(3.2, 3, 3), [0x6bcbff, 0xffd166, 0x9be37a, 0xff6b6b][i % 4], .06); G.s.add(g); l.gond.push(g); }
        for (const s of [-1, 1]) { const leg = at(mk(new T.BoxGeometry(1.4, 34, 1.4), 0xf4efe6, .05), l.x + s * 9, 14, l.z + 2.4); leg.rotation.z = s * .3; const leg2 = at(mk(new T.BoxGeometry(1.4, 34, 1.4), 0xf4efe6, .05), l.x + s * 9, 14, l.z - 2.4); leg2.rotation.z = s * .3; }
        at(mk(new T.BoxGeometry(24, 6, 8), 0x8a6b4a, .03), l.x, 3, l.z);
      } else if (l.kind === 'hangar') { at(mk(new T.BoxGeometry(32, 11, 20), 0xe8e2d2, .02), -40, 5.5, l.z); at(mk(new T.BoxGeometry(34, 1.6, 22), 0xc94a3a, .03), -40, 11.6, l.z); }
    }
    // argolas, balões, gaivotas e nuvens
    G.rings = this.C.rings.map((r) => { const g = new T.Group(), m = new T.Mesh(new T.TorusGeometry(r.r, .7, 10, 36), toon(0xffd166, { emissive: 0x000000 })); g.add(m); const e = new T.Mesh(m.geometry, ink); e.scale.setScalar(1.05); g.add(e); g.position.set(r.x, r.y, r.z); g.lookAt(r.x + r.nx, r.y + r.ny, r.z + r.nz); G.s.add(g); g.userData.m = m; return g; });
    const bcol = [0xff6b6b, 0xffb347, 0x6bcbff, 0x9be37a];
    G.balloons = this.C.balloons.map((b) => { const g = mk(new T.SphereGeometry(1.5, 12, 10), b.gold ? 0xffd166 : bcol[b.c], .07); g.scale.set(1, 1.15, 1); g.position.set(b.x, b.y, b.z); G.s.add(g); return g; });
    G.gulls = this.C.gulls.map(() => { const g = new T.Group(); const body = new T.Mesh(new T.SphereGeometry(.45, 8, 6), toon(0xffffff)); body.scale.set(2, .8, .8); g.add(body); for (const s of [-1, 1]) { const w = new T.Mesh(new T.BoxGeometry(.8, .08, 2.2), toon(0xf4f4f4)); w.position.z = s * 1.1; g.add(w); g.userData[s < 0 ? 'l' : 'r'] = w; } G.s.add(g); return g; });
    const cloudM = new T.MeshLambertMaterial({ color: 0xffffff, emissive: 0xc9d6e6, flatShading: true });
    for (let i = 0; i < 46; i++) { const g = new T.Group(); for (let j = 0; j < 5; j++) { const s = new T.Mesh(new T.IcosahedronGeometry(6 + Math.random() * 6, 1), cloudM); s.position.set(j * 7 - 14, Math.random() * 3, Math.random() * 6 - 3); g.add(s); } g.position.set(Math.random() * 2400 - 1200, 110 + Math.random() * 90, Math.random() * 2000 - 1100); G.s.add(g); }
    // avião (teco-teco vermelho de asa alta) com o IAmiguinho na cabine
    const P = new T.Group(), body = new T.Group(); P.add(body);
    const fus = mk(new T.CylinderGeometry(.55, .95, 6.4, 10), 0xd8333a, .05); fus.rotation.z = Math.PI / 2; body.add(fus);
    const nose = mk(new T.CylinderGeometry(.95, .9, 1, 10), 0xf4efe6, .05); nose.rotation.z = Math.PI / 2; nose.position.x = 3.6; body.add(nose);
    const stripe = new T.Mesh(new T.BoxGeometry(6, .18, 1.95), toon(0xffffff)); stripe.position.set(-.2, .05, 0); body.add(stripe);
    const wing = mk(new T.BoxGeometry(1.7, .2, 10.5), 0xb52a30, .06); wing.position.set(.6, 1.15, 0); body.add(wing);
    for (const s of [-1, 1]) { const st = new T.Mesh(new T.BoxGeometry(.12, 1.6, .12), toon(0x555a6a)); st.position.set(.4, .4, s * 2.6); st.rotation.x = s * .9; body.add(st); }
    const fin = mk(new T.BoxGeometry(1.3, 1.5, .15), 0xd8333a, .07); fin.position.set(-3.1, .85, 0); body.add(fin);
    const stab = mk(new T.BoxGeometry(1.1, .12, 3.6), 0xb52a30, .07); stab.position.set(-3.1, .1, 0); body.add(stab);
    const win = new T.Mesh(new T.BoxGeometry(1.6, .7, 1.75), toon(0x9fd6f0)); win.position.set(1.1, .55, 0); body.add(win);
    for (const s of [-1, 1]) { const wh = mk(new T.CylinderGeometry(.38, .38, .25, 10), 0x222222, .05); wh.rotation.x = Math.PI / 2; wh.position.set(1.4, -1.25, s * 1.1); body.add(wh); const lg = new T.Mesh(new T.BoxGeometry(.1, 1, .1), toon(0x555a6a)); lg.position.set(1.4, -.75, s * .8); lg.rotation.x = s * -.5; body.add(lg); }
    const head = new T.Group(); head.position.set(.6, 1.0, 0); body.add(head);
    head.add(mk(new T.SphereGeometry(.55, 14, 10), 0xf4efe6, .07)); const face = new T.Mesh(new T.SphereGeometry(.42, 12, 8, -.9, 1.8, .7, 1.6), new T.MeshBasicMaterial({ color: 0x141a3a })); face.position.x = .12; head.add(face);
    const eye = new T.MeshBasicMaterial({ color: 0x7fe8ff }); for (const s of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(.07, 6, 4), eye); e.position.set(.52, .08, s * .14); head.add(e); }
    const cap = mk(new T.SphereGeometry(.58, 14, 8, 0, TAU, 0, 1.2), 0x3b6fd6, .07); cap.position.y = .05; head.add(cap); const bill = new T.Mesh(new T.BoxGeometry(.5, .06, .6), toon(0x3b6fd6)); bill.position.set(.55, .28, 0); head.add(bill);
    const prop = new T.Group(); prop.position.set(4.15, 0, 0); body.add(prop); const blade = new T.Mesh(new T.BoxGeometry(.12, 3.4, .3), toon(0x333333)); prop.add(blade); const disc = new T.Mesh(new T.CircleGeometry(1.75, 20), new T.MeshBasicMaterial({ color: 0xe6e6ee, transparent: true, opacity: .25, side: T.DoubleSide })); disc.rotation.y = Math.PI / 2; prop.add(disc);
    const cprop = new T.Group(); cprop.position.set(0, .7, 0); head.add(cprop); cprop.add(new T.Mesh(new T.BoxGeometry(.6, .05, .12), toon(0xffd166)));
    G.s.add(P); G.plane = P; G.body = body; G.prop = prop; G.cprop = cprop;
    teco.G = G;
  },
  // câmera atrás e acima do avião, suavizada a cada passo do jogo
  camStep(k) {
    const G = this.G; if (!G) return; const P = this.p, f = this.fwd(), hb = [Math.cos(this.yaw), Math.sin(this.yaw)], loopK = this.loop ? .5 : 1;
    const want = new THREE.Vector3(P.x - hb[0] * 15 * loopK - f[0] * 2, P.y + 5 - f[1] * 6, P.z - hb[1] * 15 * loopK - f[2] * 2);
    if (!G.camP) G.camP = want.clone(); else G.camP.lerp(want, k);
    const gC = tcGround(G.camP.x, G.camP.z); if (G.camP.y < Math.max(gC, 0) + 2) G.camP.y = Math.max(gC, 0) + 2;
  },
  reset3d() { const G = this.G; for (const g of G.balloons) g.visible = true; for (const g of G.gulls) g.visible = true; G.camP = null; },
  toScreen(p) {
    if (!this.G) return null; const v = new THREE.Vector3(p.x, p.y, p.z).project(this.G.cam);
    if (v.z > 1) return null; return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H];
  },
  draw(tt) {
    if (this.no3d || !this.G) {
      R(0, 0, W, H, '#8fd0f5'); ctx.fillStyle = NAVY; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Este aparelho não conseguiu abrir o 3D.', W / 2, H / 2 - 6); ctx.font = '10px sans-serif'; ctx.fillText('Tente atualizar a página ou usar outro navegador.', W / 2, H / 2 + 10); ctx.textAlign = 'left'; return;
    }
    const T = THREE, G = this.G, P = this.p, f = this.fwd();
    // avião
    G.plane.position.set(P.x, P.y, P.z); G.plane.rotation.set(0, 0, 0, 'YXZ');
    const q = new T.Quaternion().setFromEuler(new T.Euler(0, -this.yaw, 0, 'YXZ')), qp = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), this.th), qr = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), this.bank + this.roll + (this.spin > 0 ? this.spinA : 0));
    G.plane.quaternion.copy(q).multiply(qp).multiply(qr);
    G.prop.rotation.x = tt * 50; G.cprop.rotation.y = tt * 30;
    if (!G.camP) this.camStep(1);
    G.cam.position.copy(G.camP); G.cam.lookAt(P.x + f[0] * 12, P.y + f[1] * 12 + 1.5, P.z + f[2] * 12);
    G.cam.fov = 66 + (this.turboT > 0 ? 8 : 0); G.cam.updateProjectionMatrix();
    // argolas: a próxima brilha
    this.C.rings.forEach((r, i) => { const g = G.rings[i], m = g.userData.m; g.visible = !r.done; const nx = i === this.next; m.material.emissive.setHex(nx ? 0xffb020 : 0x000000); m.material.emissiveIntensity = nx ? .45 + .35 * Math.sin(tt * 6) : 0; m.material.color.setHex(nx ? 0xffe27a : 0xe0b84a); });
    this.C.balloons.forEach((b, i) => { const g = G.balloons[i]; g.visible = !b.pop; g.position.y = b.y + Math.sin(this.t * 2 + b.ph) * .8; });
    this.C.gulls.forEach((q, i) => { const g = G.gulls[i]; g.visible = !q.hit; const a = this.t * q.w + q.ph; g.position.set(q.cx + Math.cos(a) * q.r, q.cy, q.cz + Math.sin(a) * q.r); g.rotation.y = -a - Math.PI; const fl = Math.sin(tt * 10 + i) * .5; g.userData.l.rotation.x = fl; g.userData.r.rotation.x = -fl; });
    for (const l of this.C.lm) { if (l.wheel) { l.wheel.rotation.z = tt * .25; l.gond.forEach((g, i) => { const a = tt * .25 + i / 8 * TAU; g.position.set(l.x + Math.cos(a) * 25, 30 + Math.sin(a) * 25 - 2.2, l.z); }); } if (l.lamp) l.lamp.material.color.setHSL(.14, 1, .7 + .2 * Math.sin(tt * 3)); }
    G.r.render(G.s, G.cam);
    ctx.drawImage(G.cv, 0, 0, W, H);
    // efeitos e a seta para a próxima argola (2D por cima)
    for (const fx of this.fx) {
      const s = this.toScreen(fx.p); if (!s) continue; const k = fx.t / .8; ctx.globalAlpha = 1 - k;
      if (fx.k === 'ring') { ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s[0], s[1], 8 + k * 30, 0, TAU); ctx.stroke(); }
      else if (fx.k === 'pop') { const c = fx.gold ? '#ffd166' : ['#ff6b6b', '#ffb347', '#6bcbff', '#9be37a'][fx.c]; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; R(s[0] + Math.cos(a) * (3 + k * 16), s[1] + Math.sin(a) * (3 + k * 16), 2, 2, c); } }
      else if (fx.k === 'boom') { ctx.fillStyle = '#fff1c4'; ctx.beginPath(); ctx.arc(s[0], s[1], 6 + k * 20, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    const nr = this.C.rings[this.next], v = new T.Vector3(nr.x, nr.y, nr.z).project(G.cam), behind = v.z > 1;
    let sx = (v.x + 1) / 2 * W, sy = (1 - v.y) / 2 * H; if (behind) { sx = W - sx; sy = H - sy; }
    const on = !behind && sx > 14 && sx < W - 14 && sy > 14 && sy < H - 14;
    if (on) { const b = Math.sin(tt * 6) * 2; ctx.fillStyle = '#ffe27a'; ctx.strokeStyle = NAVY; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, sy - 16 + b); ctx.lineTo(sx - 5, sy - 24 + b); ctx.lineTo(sx + 5, sy - 24 + b); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else { const cx = W / 2, cy = H / 2, a = Math.atan2(sy - cy, sx - cx), k = Math.min((W / 2 - 18) / Math.abs(Math.cos(a) || 1e-3), (H / 2 - 18) / Math.abs(Math.sin(a) || 1e-3)), ex = cx + Math.cos(a) * k, ey = cy + Math.sin(a) * k;
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = '#ffe27a'; ctx.strokeStyle = NAVY; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -8); ctx.lineTo(-2, 0); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    // altímetro discreto e turbo
    const alt = Math.round(P.y); ctx.fillStyle = 'rgba(27,31,79,.55)'; ctx.fillRect(6, H - 20, 54, 14); ctx.fillStyle = '#fff6d6'; ctx.font = 'bold 9px sans-serif'; ctx.fillText(`${alt} m`, 12, H - 10);
  },
};
