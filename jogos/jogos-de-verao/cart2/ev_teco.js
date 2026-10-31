/* ============================================================ prova nova: Voo do teco-teco (31/10/2026, 3ª versão: 2D com voo livre)
   Vista de lado, com a costa passando embaixo. O dono reprovou a física de estol (difícil subir) e depois descartou o 3D:
   pediu 2D com movimentação livre. A tela anda sozinha para a direita e o avião se move livre dentro dela:
   ▲ ▼ sobem e descem, ◀ ▶ vão para trás e para a frente na tela. ✕ turbo curto (a tela anda mais rápido; recarrega sozinho).
   ○ looping (com ▼ segurado lá no alto, looping invertido): vale pontos se terminar sem bater.
   Pontos: argolas (em sequência, multiplicam até ×8), balões (o dourado vale mais), rasantes por cima dos marcos (farol, viaduto,
   cesta da laje, roda-gigante), e passar por baixo do viaduto. Bater faz o avião rodopiar, sem acabar a prova.
   A decolagem da pista é automática. Arte provisória: tudo desenhado pelo jogo. */
const AV = { V: 120, Vt: 195, vy: 150, vx: 115, acc: 650, ga: 10, turbo: 1.2, recarga: 4, dur: 90, XL: 14000, top: 520, loopR: 34, loopT: 1.25 };
if (typeof Music !== 'undefined' && Music.songs.surfe) Music.songs.teco = Music.songs.surfe;
FALA.intro.teco = [
  'Teco-teco abastecido, hélice girando e eu de piloto. O que pode dar errado? Não responde.',
  'Agora o avião vai para onde eu mandar. Para cima, para baixo, para a frente. Para dentro da gaivota não, por favor.',
  'Passa raspando no farol que vale ponto. Raspando por cima, tá? Por cima.',
];
FALA.tcBoa = ['Looping! Meu estômago ficou lá atrás.', 'Por baixo do viaduto! Os skatistas aplaudiram.', 'Argola atrás de argola. Eu sou um piloto de verdade.'];
FALA.tcRuim = ['Bati. O avião tá bem, eu tô tonto.', 'O mar apareceu do nada. Ele sempre faz isso.', 'A gaivota tinha preferência, eu acho.'];
const teco = {
  id: 'teco', name: 'Voo do teco-teco', tag: 'Aeroclube da Restinga · 90 s', wide: true, hi: true, paint: true, two: false, dur: AV.dur,
  med: [8000, 18000, 28000], ia: 22000, nota: 'deu um looping em cima da roda-gigante',
  desc: 'Voe pela costa: argolas, balões, rasantes nos marcos e loopings.',
  steps: () => [
    'A decolagem é automática. No ar, o avião vai para onde você mandar: ▲ ▼ sobem e descem, ◀ ▶ vão para trás e para a frente.',
    `Passe por dentro das argolas: em sequência, elas multiplicam os pontos. Estoure os balões. ${actName()} dá um turbo curto, que recarrega sozinho.`,
    `Passe raspando por cima do farol, do viaduto, da laje e da roda-gigante, ou por baixo do viaduto. ${touch ? '“Looping”' : 'X'} faz um looping. Bater faz o avião rodopiar.`,
  ],
  hint: () => '',
  gp: 'Controle: analógico ou direcional pilota · ✕ turbo · ○ looping · Start pausa',
  ctl: [['▲ ▼', 'subir / descer'], ['◀ ▶', 'para trás / para a frente'], ['Espaço', 'turbo', 'kb'], ['X', 'looping', 'kb'], ['Turbo', 'turbo', 'touch'], ['Looping', 'looping', 'touch'], ['Esc', 'pausa', 'kb']],
  pad: { dirs: 'lrud', a: 'Turbo', b: 'Looping' }, bannerY: 40,
  init() {
    Object.assign(this, {
      t: 0, left: AV.dur, score: 0, x: 70, sx: 70, a: AV.ga, V: 0, vr: 0, va: 0, th: 0, loop: null, ground: true, spin: 0, spinA: 0, turboT: 0, tank: 1,
      combo: 0, best: 0, rings: 0, ringsAll: 0, balloons: 0, loops: 0, rasantes: 0, crashes: 0, fx: [], trail: [], camX: 0, camA: 0, lmIn: null, over: false, overT: 0,
    });
    this.course();
  },
  // ---------- percurso: marcos a cada ~2.400 px e, entre eles, argolas, balões e gaivotas
  course() {
    const R0 = (a, b) => a + Math.random() * (b - a), C = { lm: [], rings: [], balloons: [], birds: [], clouds: [] };
    const kinds = ['farol', 'viaduto', 'laje', 'roda'];
    for (let k = 0, x = 1700; x < AV.XL - 600; k++, x += R0(2200, 2600)) C.lm.push(this.landmark(kinds[k % 4], x));
    const near = (x, d) => C.lm.some((l) => x > l.x0 - d && x < l.x1 + d);
    let x = 650, chain = 0;
    while (x < AV.XL - 300) {
      if (near(x, 160)) { x += 140; continue; }
      const r = Math.random();
      if (r < .55) {
        const n = 4 + Math.floor(Math.random() * 3), sp = R0(78, 96), A = R0(90, 300), type = Math.floor(Math.random() * 4), id = ++chain;
        for (let i = 0; i < n; i++) { const xx = x + i * sp; if (near(xx, 120)) break; const a = clamp(type === 0 ? A : type === 1 ? A + i * 20 : type === 2 ? A - i * 20 : A + 38 * Math.sin(i * .9), 60, 380); C.rings.push({ x: xx, a, r: 15, id, done: 0 }); }
        x += n * sp + R0(140, 260);
      } else if (r < .8) {
        const A = R0(110, 330), loop = Math.random() < .45 && A > 170;
        if (loop) { for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU; C.balloons.push({ x: x + 50 + Math.cos(ang) * 44, a: A + 44 + Math.sin(ang) * 44, r: 6, c: i % 4, gold: i === 2, ph: Math.random() * TAU, pop: 0 }); } x += 220; }
        else { const n = 5 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) C.balloons.push({ x: x + i * R0(30, 46), a: clamp(A + R0(-40, 40), 50, 400), r: 6, c: i % 4, gold: Math.random() < .12, ph: Math.random() * TAU, pop: 0 }); x += n * 40 + 160; }
      } else { const A = R0(130, 320), n = 3 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) C.birds.push({ x: x + 120 + i * 14, a: A + (i % 2 ? 9 : -3) * (i + 1) * .5, ph: Math.random() * TAU, hit: false }); x += 260; }
    }
    for (let i = 0; i < 60; i++) C.clouds.push({ x: Math.random() * AV.XL * .5, a: R0(160, 520), w: R0(30, 80), k: R0(.35, .6) });
    this.C = C; this.ringsAll = C.rings.length;
  },
  // marcos: partes sólidas (retângulos e círculos, altura para cima) e a faixa do rasante
  landmark(kind, x) {
    if (kind === 'farol') return { kind, x, x0: x, x1: x + 230, solid: [{ r: [x, 0, 230, 46] }, { r: [x + 150, 46, 18, 70] }, { r: [x + 146, 116, 26, 12] }], top: (q) => (q >= x + 146 && q <= x + 172 ? 128 : q >= x && q <= x + 230 ? 46 : 0), mark: [x + 140, x + 180] };
    if (kind === 'viaduto') return { kind, x, x0: x, x1: x + 240, solid: [{ r: [x + 20, 0, 16, 64] }, { r: [x + 204, 0, 16, 64] }, { r: [x, 64, 240, 12] }, { r: [x + 100, 0, 40, 14] }], top: (q) => (q >= x && q <= x + 240 ? 76 : 0), mark: [x, x + 240], uz: [x + 40, x + 200, 16, 60] };
    if (kind === 'laje') return { kind, x, x0: x, x1: x + 110, solid: [{ r: [x, 0, 110, 78] }, { r: [x + 78, 78, 4, 34] }, { r: [x + 70, 104, 3, 22] }], top: (q) => (q >= x + 68 && q <= x + 82 ? 126 : q >= x && q <= x + 110 ? 78 : 0), mark: [x + 50, x + 100] };
    return { kind, x, x0: x, x1: x + 150, solid: [{ c: [x + 75, 80, 58] }, { r: [x + 40, 0, 8, 40] }, { r: [x + 102, 0, 8, 40] }], top: (q) => { const d = q - (x + 75); return Math.abs(d) < 58 ? 80 + Math.sqrt(58 * 58 - d * d) : 0; }, mark: [x + 35, x + 115], cx: x + 75, ca: 80, cr: 58 };
  },
  hud() { return [['Pontos', nf(this.score)], ['Tempo', `${Math.ceil(this.left)}s`, this.left <= 10], ['Sequência', this.combo ? `×${Math.min(this.combo, 8)}` : '—', this.combo >= 3], ['Turbo', this.turboT > 0 ? 'ligado' : this.tank >= 1 ? 'pronto' : `${Math.floor(this.tank * 100)}%`, this.tank >= 1]]; },
  stats() { return [`${this.rings} de ${this.ringsAll} argolas · melhor sequência ×${this.best}`, `${this.balloons} balões · ${this.loops} loopings · ${this.rasantes} rasantes`, `${this.crashes} batidas`]; },
  demo() { this.camX = 780; this.sx = 120; this.x = 900; this.a = 180; this.V = AV.V; this.va = 0; this.ground = false; this.camA = this.a - 100; },
  add(p, txt, x, a, col = '#fff6d6') { this.score += p; pop(`${txt} +${nf(p)}`, x - this.camX, this.sy(a) - 14, col); },
  sy(a) { return H - 16 - (a - this.camA); },
  // ---------- quadro a quadro
  update(dt, I) {
    this.t += dt; this.left = Math.max(0, AV.dur - this.t);
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < (f.life || .8));
    if (this.over) { this.overT += dt; this.fly(dt, 0, 0, false); return this.overT > 1.5; }
    if (this.left <= 0) { this.over = true; this.overT = 0; talk(this.loops ? FALA.tcBoa : FALA.tcRuim, .8); return false; }
    let ix = I.ax || 0, iy = (I.u ? 1 : 0) - (I.d ? 1 : 0) || (Math.abs(I.ay || 0) > .2 ? -I.ay : 0);
    if (I.pa && this.tank >= 1 && !this.spin && !this.ground) { this.turboT = AV.turbo; this.tank = 0; beep(180, .25, 'sawtooth', .04, 260); }
    if (this.turboT > 0) this.turboT -= dt; else this.tank = Math.min(1, this.tank + dt / AV.recarga);
    if (I.pb && !this.loop && !this.spin && !this.ground && this.a > 40) { const inv = iy < -.5 && this.a > 110; this.loop = { t: 0, dir: inv ? -1 : 1, sx: this.sx, a: this.a }; beep(500, .2, 'triangle', .03, inv ? -300 : 300); }
    for (let k = 0; k < 2; k++) this.fly(dt / 2, ix, iy, true);
    this.camA += (clamp(this.a - 100, -4, AV.top - 150) - this.camA) * Math.min(1, dt * 3);
    this.trail.push([this.x, this.a]); if (this.trail.length > 60) this.trail.shift();
    return false;
  },
  // voo livre: a tela anda para a direita e o avião se move dentro dela
  fly(dt, ix, iy, live) {
    // decolagem automática: corre na pista e sobe sozinho
    if (this.ground) {
      this.V = Math.min(AV.V, this.V + 110 * dt); this.camX += this.V * dt; this.x = this.camX + this.sx;
      if (this.V > 80) { this.ground = false; this.va = 60; }
      this.th = 0; if (live) this.checks(); return;
    }
    const want = this.turboT > 0 ? AV.Vt : AV.V; this.V += clamp(want - this.V, -200 * dt, 200 * dt);
    this.camX += this.V * dt * (this.over ? .7 : 1);
    if (this.spin > 0) {
      // rodopio depois da batida: sem controle, o avião gira, fica para trás na tela e sobe se estiver baixo
      this.spin -= dt; this.spinA += dt * 13; this.vr = -40; this.va += ((this.a < 60 ? 50 : -15) - this.va) * dt * 3;
      if (this.spin <= 0) this.spinA = 0;
    } else if (this.loop) {
      // looping: um círculo de pé, enquanto a tela continua andando
      const L = this.loop; L.t += dt; const u = Math.min(1, L.t / AV.loopT), ph = u * TAU * L.dir;
      this.sx = L.sx + AV.loopR * Math.sin(Math.abs(ph)); this.a = L.a + L.dir * AV.loopR * (1 - Math.cos(ph)); this.th = ph; this.va = 0; this.vr = 0;
      if (u >= 1) { this.loop = null; this.th = 0; this.loops++; const inv = L.dir < 0; if (live) { this.add(inv ? 700 : 450, inv ? 'Looping invertido!' : 'Looping!', this.x, this.a + 20, '#ffd166'); sfx.big(); if (this.loops === 1) talk(FALA.tcBoa, .5); } }
    } else if (!this.over) {
      this.vr += clamp(clamp(ix, -1, 1) * AV.vx - this.vr, -AV.acc * dt, AV.acc * dt);
      this.va += clamp(clamp(iy, -1, 1) * AV.vy - this.va, -AV.acc * dt, AV.acc * dt);
    }
    if (!this.loop) { this.sx += this.vr * dt; this.a += this.va * dt; }
    this.sx = clamp(this.sx, 26, W - 60); if (this.a > AV.top) { this.a = AV.top; this.va = Math.min(0, this.va); }
    this.x = this.camX + this.sx;
    if (!this.loop) { const tgt = Math.atan2(this.va, this.V + this.vr) * .9; this.th += (tgt - this.th) * Math.min(1, dt * 10); }
    if (live) this.checks();
  },
  // ---------- batidas e pontos
  crash(why) {
    if (this.spin > 0) return;
    this.spin = 1.0; this.spinA = 0; this.crashes++; this.combo = 0; this.loop = null; this.va = this.a < 60 ? 70 : 10; if (this.a < 14) this.a = 14;
    shake = .3; sfx.crash(); this.fx.push({ k: 'boom', x: this.x, a: this.a, t: 0 }); if (this.lmIn) this.lmIn.hit = true;
    pop(why, W / 2, 50, '#ffb3c8', true); if (Math.random() < .5) talk(FALA.tcRuim, .5);
  },
  pts() { const c = Math.cos(this.th), s = Math.sin(this.th); return [[11, 0], [-12, 2], [0, -5], [-4, 6], [6, -3]].map(([u, v]) => [this.x + 1.3 * (u * c - v * s), this.a + 1.3 * (u * s + v * c)]); },
  inSolid(px, pa) {
    for (const l of this.C.lm) { if (px < l.x0 - 70 || px > l.x1 + 70) continue; for (const s of l.solid) { if (s.r) { const [x, y, w, h] = s.r; if (px > x && px < x + w && pa > y && pa < y + h) return l; } else { const [cx, ca, r] = s.c; if (Math.hypot(px - cx, pa - ca) < r) return l; } } }
    return null;
  },
  checks() {
    const P = this.pts();
    if (this.ground) return;
    if (P.some(([, pa]) => pa < 0)) { if (this.x < 520) { this.a = Math.max(this.a, AV.ga + 2); this.va = Math.max(this.va, 0); } else return this.crash('Caiu na água!'); }
    for (const [px, pa] of P) if (this.inSolid(px, pa)) return this.crash('Bateu!');
    // argolas
    const px = this.trail.length ? this.trail[this.trail.length - 1][0] : this.x;
    for (const r of this.C.rings) {
      if (r.done || r.x > this.x + 2 || r.x < this.x - 60) continue;
      if (px < r.x && this.x >= r.x) {
        const d = Math.abs(this.a - r.a);
        if (d < r.r - 1.5) { r.done = 1; this.combo++; this.best = Math.max(this.best, this.combo); this.rings++; const m = Math.min(this.combo, 8); this.add(100 * m, m > 1 ? `×${m}` : 'Argola', r.x, r.a, '#bfefff'); beep(660 + Math.min(this.combo, 10) * 60, .07, 'square', .04, 120); this.fx.push({ k: 'ring', x: r.x, a: r.a, t: 0 }); }
        else if (d < r.r + 3) { r.done = 2; if (this.combo) pop('Raspou! Sequência perdida', W / 2, 50, '#fff6d6'); else pop('Raspou!', r.x - this.camX, this.sy(r.a) - 20, '#fff6d6'); this.combo = 0; beep(200, .05, 'triangle', .04, -60); }
        else { r.done = 2; if (this.combo) pop('Sequência perdida', W / 2, 50, '#fff6d6'); this.combo = 0; }
      }
    }
    for (const b of this.C.balloons) {
      if (b.pop || Math.abs(b.x - this.x) > 20) continue;
      const ba = b.a + Math.sin(this.t * 2 + b.ph) * 3;
      if (P.some(([qx, qa]) => Math.hypot(qx - b.x, qa - ba) < b.r + 2)) { b.pop = this.t; this.balloons++; this.add(b.gold ? 250 : 50, b.gold ? 'Dourado' : 'Balão', b.x, ba, b.gold ? '#ffd166' : '#fff6d6'); beep(b.gold ? 1300 : 900, .05, 'square', .04, -300); this.fx.push({ k: 'pop', x: b.x, a: ba, t: 0, c: b.c, gold: b.gold }); }
    }
    for (const b of this.C.birds) {
      if (b.hit) continue; const bx = b.x - this.t * 18, ba = b.a + Math.sin(this.t * 3 + b.ph) * 4;
      if (Math.abs(bx - this.x) < 16 && P.some(([qx, qa]) => Math.hypot(qx - bx, qa - ba) < 6)) { b.hit = true; this.crash('Gaivota!'); }
    }
    // marcos: rasante (passar perto por cima), por baixo do viaduto, por dentro do aro da cesta
    const L = this.C.lm.find((l) => this.x >= l.x0 && this.x <= l.x1);
    if (L && this.lmIn !== L) { this.lmIn = L; L.min = Infinity; L.hit = false; L.wentUnder = false; }
    if (L) {
      if (this.x >= L.mark[0] && this.x <= L.mark[1]) L.min = Math.min(L.min, this.a - 5 - L.top(this.x));
      if (L.uz && this.x > L.uz[0] + 40 && this.x < L.uz[1] - 40 && this.a > L.uz[2] && this.a < L.uz[3]) L.wentUnder = true;
    }
    if (this.lmIn && this.x > this.lmIn.x1) {
      const l = this.lmIn; this.lmIn = null;
      if (!l.hit) {
        if (l.wentUnder) { this.add(900, 'Por baixo do viaduto!', this.x, this.a + 10, '#ffd166'); this.rasantes++; sfx.big(); talk(FALA.tcBoa, .4); }
        else if (l.min < 34) { const p = Math.round((200 + (34 - Math.max(0, l.min)) * 20) / 10) * 10; this.add(p, 'Rasante!', this.x, this.a + 10, '#bfefff'); this.rasantes++; sfx.point(); }
      }
    }
  },
  // ---------- desenho (provisório)
  draw(tt) {
    const cx = this.camX, sy = (a) => this.sy(a);
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#5fa8e8'); sky.addColorStop(1, '#bfe4fb'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // nuvens altas e a costa ao longe (paralaxe)
    for (const c of this.C.clouds) { const x = ((c.x - cx * c.k * .4) % (W + 160) + W + 160) % (W + 160) - 80, y = sy(c.a) * .6 + 20; ctx.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(x + i * c.w * .25, y + (i % 2) * 3, c.w * .3, 6 + (i % 2) * 3, 0, 0, TAU); ctx.fill(); } }
    const hz = sy(0) - 34 + this.camA * .25;
    ctx.fillStyle = '#8fbf8a'; ctx.beginPath(); ctx.moveTo(0, hz + 6); for (let x = 0; x <= W; x += 10) ctx.lineTo(x, hz - 6 - 8 * Math.sin((x + cx * .2) * .02) - 5 * Math.sin((x + cx * .2) * .057)); ctx.lineTo(W, hz + 6); ctx.fill();
    ctx.fillStyle = '#4fa3c7'; ctx.fillRect(0, hz + 4, W, Math.max(0, sy(0) - hz));
    // chão: pista, praia e mar
    const g0 = sy(0);
    if (g0 < H + 20) {
      R(0, g0, W, H - g0 + 2, '#3d8fc0');
      for (let i = 0; i < 14; i++) { const x = ((i * 53 - cx) % (W + 60) + W + 60) % (W + 60) - 30; R(x, g0 + 3 + (i % 3) * 4, 12, 1, 'rgba(255,255,255,.55)'); }
      if (cx < 560) { R(-cx - 40, g0, 560 + 40, H, '#76b65a'); R(-cx + 10, g0, 500, 4, '#9a9a8a'); for (let x = 30; x < 500; x += 26) R(x - cx, g0 + 1.5, 10, 1, '#ffffff'); R(60 - cx, g0 - 24, 40, 24, '#e8e2d2'); R(56 - cx, g0 - 28, 48, 5, '#c94a3a'); ctx.strokeStyle = NAVY; ctx.lineWidth = .8; ctx.strokeRect(60 - cx, g0 - 24, 40, 24); R(120 - cx, g0 - 40, 1.4, 40, '#666'); ctx.fillStyle = '#f08a2a'; ctx.beginPath(); ctx.moveTo(121 - cx, g0 - 40); ctx.lineTo(132 - cx, g0 - 37 + Math.sin(tt * 4)); ctx.lineTo(121 - cx, g0 - 34); ctx.fill(); }
      for (const l of this.C.lm) if (l.x1 > cx - 80 && l.x0 < cx + W + 80) { R(l.x0 - 60 - cx, g0, l.x1 - l.x0 + 120, H, '#f0d9a0'); R(l.x0 - 60 - cx, g0, l.x1 - l.x0 + 120, 2, '#fff2c8'); }
    }
    for (const l of this.C.lm) if (l.x1 > cx - 80 && l.x0 < cx + W + 80) this.drawLandmark(l, tt);
    // argolas: metade de trás antes do avião, metade da frente depois
    const rings = this.C.rings.filter((r) => r.x > cx - 20 && r.x < cx + W + 20);
    for (const r of rings) this.drawRing(r, true);
    for (const b of this.C.balloons) if (!b.pop && b.x > cx - 20 && b.x < cx + W + 20) this.drawBalloon(b, tt);
    for (const b of this.C.birds) { if (b.hit) continue; const bx = b.x - this.t * 18; if (bx < cx - 20 || bx > cx + W + 20) continue; const y = sy(b.a + Math.sin(this.t * 3 + b.ph) * 4), w = Math.sin(tt * 12 + b.ph) * 3; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(bx - cx - 5, y - w); ctx.quadraticCurveTo(bx - cx - 2, y - 2, bx - cx, y); ctx.quadraticCurveTo(bx - cx + 2, y - 2, bx - cx + 5, y - w); ctx.stroke(); ctx.strokeStyle = NAVY; ctx.lineWidth = .5; ctx.stroke(); }
    // faixa puxada atrás
    const tr = this.trail; if (tr.length > 20) { const pts = []; for (let i = tr.length - 8; i >= tr.length - 40 && i >= 0; i -= 4) pts.push([tr[i][0] - cx, sy(tr[i][1])]); ctx.strokeStyle = 'rgba(40,40,60,.6)'; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(this.x - 12 - cx, sy(this.a)); ctx.lineTo(pts[0][0], pts[0][1]); ctx.stroke(); ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.strokeStyle = '#fff6d6'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1, 6)) ctx.lineTo(p[0], p[1]); ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = '#e8484a'; ctx.stroke(); ctx.lineJoin = 'miter'; }
    for (const f of this.fx) {
      const k = f.t / (f.life || .8), x = f.x - cx, y = sy(f.a); ctx.globalAlpha = 1 - k;
      if (f.k === 'ring') { ctx.strokeStyle = '#bfefff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, 3 + k * 6, 16 + k * 10, 0, 0, TAU); ctx.stroke(); }
      else if (f.k === 'pop') { ctx.fillStyle = f.gold ? '#ffd166' : ['#ff6b6b', '#ffd166', '#6bcBff', '#9be37a'][f.c]; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; R(x + Math.cos(a) * (3 + k * 12), y + Math.sin(a) * (3 + k * 12), 2, 2, ctx.fillStyle); } }
      else if (f.k === 'boom') { ctx.fillStyle = '#fff1c4'; ctx.beginPath(); ctx.arc(x, y, 4 + k * 14, 0, TAU); ctx.fill(); }
      else if (f.k === 'smoke') { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 2 + k * 5, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    this.drawPlane(tt);
    for (const r of rings) this.drawRing(r, false);
    if (this.turboT > 0 && Math.random() < .6) this.fx.push({ k: 'smoke', x: this.x - 13 * Math.cos(this.th), a: this.a - 13 * Math.sin(this.th), t: 0, life: .6 });
  },
  drawRing(r, back) {
    const x = r.x - this.camX, y = this.sy(r.a), col = r.done === 1 ? 'rgba(191,239,255,.35)' : r.done === 2 ? 'rgba(255,255,255,.3)' : '#ffd166';
    ctx.strokeStyle = col; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.ellipse(x, y, 5, r.r, 0, back ? Math.PI * .5 : -Math.PI * .5, back ? Math.PI * 1.5 : Math.PI * .5); ctx.stroke();
    ctx.strokeStyle = 'rgba(27,31,79,.6)'; ctx.lineWidth = .6; ctx.stroke();
  },
  drawBalloon(b, tt) {
    const x = b.x - this.camX, y = this.sy(b.a + Math.sin(this.t * 2 + b.ph) * 3), c = b.gold ? '#ffd166' : ['#ff6b6b', '#ffb347', '#6bcbff', '#9be37a'][b.c];
    ctx.strokeStyle = 'rgba(40,40,60,.5)'; ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(x, y + b.r); ctx.quadraticCurveTo(x + 2, y + b.r + 5, x, y + b.r + 10); ctx.stroke();
    const gr = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, b.r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.3, c); gr.addColorStop(1, c); ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y, b.r * .9, b.r, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = .7; ctx.stroke();
  },
  drawLandmark(l, tt) {
    const cx = this.camX, sy = (a) => this.sy(a), rect = (x, a, w, h, c) => { R(x - cx, sy(a + h), w, h, c); ctx.strokeStyle = NAVY; ctx.lineWidth = .8; ctx.strokeRect(x - cx, sy(a + h), w, h); };
    const x = l.x;
    if (l.kind === 'farol') {
      ctx.fillStyle = '#b98a5a'; ctx.beginPath(); ctx.moveTo(x - cx, sy(0)); ctx.lineTo(x + 8 - cx, sy(46)); ctx.lineTo(x + 222 - cx, sy(46)); ctx.lineTo(x + 230 - cx, sy(0)); ctx.fill(); ctx.strokeStyle = NAVY; ctx.stroke(); R(x + 8 - cx, sy(46), 214, 3, '#79b65a');
      for (let i = 0; i < 5; i++) rect(x + 150, 46 + i * 14, 18, 14, i % 2 ? '#ffffff' : '#e0453c');
      rect(x + 146, 116, 26, 12, '#2d3350'); ctx.fillStyle = `rgba(255,230,120,${.6 + .4 * Math.sin(tt * 3)})`; ctx.fillRect(x + 150 - cx, sy(126), 18, 7); rect(x + 144, 128, 30, 4, '#e0453c');
    } else if (l.kind === 'viaduto') {
      rect(x + 20, 0, 16, 64, '#9aa0b0'); rect(x + 204, 0, 16, 64, '#9aa0b0'); rect(x, 64, 240, 12, '#b9bfcc'); for (let i = 0; i < 12; i++) R(x + 6 + i * 20 - cx, sy(70), 8, 1, '#e8e8f0');
      ctx.fillStyle = '#d07ad6'; ctx.beginPath(); ctx.moveTo(x + 100 - cx, sy(0)); ctx.quadraticCurveTo(x + 104 - cx, sy(14), x + 100 - cx, sy(14)); ctx.lineTo(x + 140 - cx, sy(14)); ctx.quadraticCurveTo(x + 136 - cx, sy(14), x + 140 - cx, sy(0)); ctx.fill(); ctx.strokeStyle = NAVY; ctx.stroke();
      ctx.fillStyle = '#ff7ab8'; ctx.font = 'bold 7px sans-serif'; ctx.fillText('SK8', x + 110 - cx, sy(40));
    } else if (l.kind === 'laje') {
      rect(x, 0, 110, 78, '#f2c14e'); for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) rect(x + 10 + c * 24, 12 + r * 22, 12, 12, '#6fb7d9');
      rect(x + 78, 78, 4, 34, '#555a6a'); rect(x + 72, 104, 14, 22, '#ffffff'); ctx.strokeStyle = '#ff6a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x + 64 - cx, sy(108), 2, 9, 0, 0, TAU); ctx.stroke();
    } else {
      const c = [x + 75 - cx, sy(80)];
      ctx.strokeStyle = '#7a7f95'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 44 - cx, sy(0)); ctx.lineTo(c[0], c[1]); ctx.lineTo(x + 106 - cx, sy(0)); ctx.stroke();
      ctx.strokeStyle = '#e04a8a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c[0], c[1], 58, 0, TAU); ctx.stroke(); ctx.strokeStyle = NAVY; ctx.lineWidth = .7; ctx.beginPath(); ctx.arc(c[0], c[1], 59.5, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,120,150,.8)'; ctx.lineWidth = .8; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + tt * .3; ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[0] + Math.cos(a) * 58, c[1] + Math.sin(a) * 58); ctx.stroke(); }
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + tt * .3, gx = c[0] + Math.cos(a) * 58, gy = c[1] + Math.sin(a) * 58; R(gx - 4, gy, 8, 6, ['#6bcbff', '#ffd166', '#9be37a', '#ff6b6b'][i % 4]); ctx.strokeStyle = NAVY; ctx.strokeRect(gx - 4, gy, 8, 6); }
    }
  },
  drawPlane(tt) {
    const x = this.x - this.camX, y = this.sy(this.a), ang = this.spin > 0 ? this.th + this.spinA : this.th;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-ang); ctx.scale(1.35, 1.35);
    // fuselagem, asa alta, cauda, rodas, hélice e o IAmiguinho na janela
    R(-12, 4, 2, 4, '#555'); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(2, 8.5, 2, 0, TAU); ctx.arc(-11, 6, 1.2, 0, TAU); ctx.fill(); ctx.strokeStyle = '#555'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(2, 7); ctx.lineTo(0, 2); ctx.stroke();
    ctx.fillStyle = '#d8333a'; ctx.beginPath(); ctx.moveTo(11, -1); ctx.quadraticCurveTo(12, 4, 6, 5); ctx.lineTo(-13, 3); ctx.lineTo(-15, -1); ctx.lineTo(-13, -2); ctx.lineTo(4, -4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = .8; ctx.stroke();
    R(-13, 0, 22, 1.4, '#ffffff');
    ctx.fillStyle = '#d8333a'; ctx.beginPath(); ctx.moveTo(-11, -2); ctx.lineTo(-15, -9); ctx.lineTo(-12, -9); ctx.lineTo(-7, -2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a92a30'; ctx.fillRect(-16, -1.5, 7, 1.6);
    ctx.fillStyle = '#9fd6f0'; ctx.beginPath(); ctx.moveTo(4, -4); ctx.lineTo(-3, -4); ctx.lineTo(-3, -1); ctx.lineTo(6, -1); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f4efe6'; ctx.beginPath(); ctx.arc(0, -3.6, 2.4, 0, TAU); ctx.fill(); R(-2.2, -6.4, 4.4, 1.6, '#3b6fd6'); R(-.4, -7.6, .8, 1.3, '#555'); R(-2, -8, 4, .6, '#7fdcff');
    ctx.fillStyle = '#b52a30'; ctx.fillRect(-6, -6, 16, 2.2); ctx.strokeRect(-6, -6, 16, 2.2); ctx.strokeStyle = '#555'; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(2, -4); ctx.lineTo(-2, 2); ctx.stroke();
    ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(11.5, 1, 1.3, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(230,230,240,.55)'; ctx.beginPath(); ctx.ellipse(12.4, 1, 1, 7 * Math.abs(Math.sin(tt * 40)) + 2, 0, 0, TAU); ctx.fill();
    ctx.restore();
  },
};
