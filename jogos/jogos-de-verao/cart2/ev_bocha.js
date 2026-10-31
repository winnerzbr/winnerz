/* ============================================================ prova nova: Bocha na areia (30/10/2026)
   Vista de cima, na Vila dos Pescadores. IAmiguinho (bolas azuis) contra Amiguinho (bolas rosa), 4 bolas para cada lado.
   Quem começa a rodada joga o bolim (a bolinha laranja); depois joga sempre quem está mais longe dele.
   ▲ ▼ miram. Segurar ✕ enche a força e soltar ROLA a bola; segurar ○ e soltar joga PELO ALTO: a bola voa, cai e quase para
   (cair em cima de outra bola tira ela do lugar). A força sobe e desce enquanto segura.
   Areia: atrito forte (a bola freia mais rápido devagar no fim), montinhos e buracos desviam, areia fofa freia muito,
   conchas são obstáculos e pegadas entortam um pouco a bola. Bolas batem umas nas outras (o bolim é mais leve).
   Tábuas baixas em volta da cancha: a bola bate e volta fraquinha; só sai a bola que cai fora pelo alto. Se o bolim sair, a rodada é anulada.
   Fim da rodada: cada bola mais perto do bolim que a melhor do outro lado vale 1 ponto. Quem fizer 7 vence.
   Arte provisória: tudo desenhado pelo jogo; os personagens são os desenhos do vôlei. */
const BC = { x0: 50, x1: 386, y0: 70, y1: 190, sx: 58, sy: 130, rb: 6, rj: 3.5, fc: 62, fv: .5, G: 1150, meter: 1.05 };
BC.L = BC.x1 - BC.sx;
if (typeof Music !== 'undefined' && Music.songs.embaixadinha) Music.songs.bocha = Music.songs.embaixadinha;
FALA.intro.bocha = [
  'Bocha na Vila dos Pescadores. Os pescadores jogam aqui desde antes de eu existir. E olha que eu sou atualizado.',
  'Olha os montinhos e as pegadas antes de rolar. A areia sempre tem uma opinião.',
  'Se a bola dele está colada no bolim, joga pelo alto e tira ela de lá. Com carinho.',
];
FALA.bcBoa = ['Encostou no bolim! Pode medir, eu espero.', 'Essa ficou de beijinho no bolim.', 'Tirei a dele! Desculpa, Amiguinho. Mentira, não desculpa.'];
FALA.bcRuim = ['A areia desviou. Foi a pegada do pescador, eu vi.', 'Forte demais. O bolim tá lá, não na jangada.', 'Ele encostou de novo. Esse Amiguinho treina escondido.'];
const bocha = {
  id: 'bocha', name: 'Bocha na areia', tag: 'Vila dos Pescadores · até 7', wide: true, hi: true, paint: true, two2: true, two: false, dur: 0,
  med: [400, 1500, 1900], medText: ['fazer 4 pontos', 'vencer', 'vencer por 4 ou mais'], medShort: ['Fazer 4 pontos', 'Vencer', 'Vencer por 4+'],
  menu2: [['Modo', '2 jogadores'], ['Placar', 'até 7'], ['Bolas', '4 para cada lado'], ['Pódio', 'não conta']], ia: 1800, nota: 'a bola caiu dentro da jangada',
  desc: 'Role ou jogue pelo alto até o bolim. A areia tem montinhos, conchas e pegadas.',
  steps: () => [
    'Primeiro vai o bolim, a bolinha laranja. Depois joga sempre quem está mais longe dele. Cada lado tem 4 bolas.',
    `▲ ▼ miram. Segure ${actName()} para rolar ou ${touch ? '“Alto”' : 'X'} para jogar pelo alto: a força sobe e desce enquanto segura, e soltar lança.`,
    'Pelo alto, a bola cai e quase para, e tira do lugar a bola em que cair. Montinhos, areia fofa, conchas e pegadas desviam. Quem fizer 7 vence.',
  ],
  hint: () => '',
  gp: 'Controle: ▲ ▼ miram · segure ✕ para rolar ou ○ para jogar pelo alto · Start pausa. Dois jogadores: um de cada vez, nos mesmos botões.',
  ctl: [['▲ ▼', 'mirar'], ['Espaço', 'segure: rolar', 'kb'], ['X', 'segure: pelo alto', 'kb'], ['Rolar', 'segure: rolar', 'touch'], ['Alto', 'segure: pelo alto', 'touch'], ['Esc', 'pausa', 'kb']],
  pad: { dirs: 'ud', a: 'Rolar', b: 'Alto' }, bannerY: 40,
  init() {
    Object.assign(this, {
      t: 0, score: 0, sc: [0, 0], round: 0, jackBy: 0, balls: [], jack: null, state: 'aim', st: 0, who: 0, kind: null, ang: 0, m: 0, mDir: 1, charging: false,
      left: [4, 4], fx: [], over: false, overT: 0, mood: 0, encostos: 0, tiradas: 0, nullT: 0, res: null, ai: {}, prev: { a: false, b: false }, lastThrow: -1, jackTries: 0,
    });
    this.terrain(); this.newRound(0);
  },
  // ---------- terreno: montinhos e buracos, areia fofa, conchas e um rastro de pegadas (sorteados por partida)
  terrain() {
    const R0 = (a, b) => a + Math.random() * (b - a), T = { mounds: [], soft: [], shells: [], prints: [] };
    const free = (x, y, d) => x > BC.sx + 40 && [...T.mounds, ...T.soft, ...T.shells].every((o) => Math.hypot(o.x - x, o.y - y) > d);
    for (let k = 0, n = 0; k < 3 && n < 60; n++) { const x = R0(BC.sx + 70, BC.x1 - 30), y = R0(BC.y0 + 18, BC.y1 - 18); if (free(x, y, 50)) { T.mounds.push({ x, y, r: R0(17, 28), h: (k === 2 ? -1 : 1) * R0(.75, 1.2) }); k++; } }
    for (let k = 0, n = 0; k < 2 && n < 60; n++) { const x = R0(BC.sx + 80, BC.x1 - 30), y = R0(BC.y0 + 16, BC.y1 - 16); if (free(x, y, 36)) { T.soft.push({ x, y, rx: R0(20, 32), ry: R0(11, 17), a: R0(-.6, .6) }); k++; } }
    for (let k = 0, n = 0; k < 5 && n < 80; n++) { const x = R0(BC.sx + 60, BC.x1 - 12), y = R0(BC.y0 + 8, BC.y1 - 8); if (free(x, y, 18)) { T.shells.push({ x, y, r: 2.4, a: R0(0, TAU), c: ['#fbe3d2', '#f4c7d8', '#fff2e0'][k % 3] }); k++; } }
    let px = R0(BC.sx + 70, BC.sx + 140), py = Math.random() < .5 ? BC.y0 + 4 : BC.y1 - 4; const dy = py < BC.sy ? 1 : -1, dx = R0(.25, .7);
    for (let k = 0; k < 14; k++) { const d = Math.hypot(dx, 1); px += dx / d * 9; py += dy / d * 9; if (py < BC.y0 || py > BC.y1) break; T.prints.push({ x: px + (k % 2 ? 2.4 : -2.4) * dy / d, y: py - (k % 2 ? 2.4 : -2.4) * dx / d * dy, a: (k % 2 ? 1 : -1) * R0(.05, .1), ang: Math.atan2(dy, dx) }); }
    this.T = T;
  },
  newRound(by) {
    this.round++; this.jackBy = by; this.balls = []; this.jack = null; this.left = [4, 4]; this.who = by; this.toss = 'jack'; this.jackTries = 0;
    this.state = 'aim'; this.st = 0; this.ang = 0; this.m = 0; this.charging = false; this.res = null; this.lastThrow = -1; this.ai = {}; this.prev = { a: false, b: false };
  },
  accNow() { const m = this.mood || 0; return clamp(.72 + .16 * m, .5, .9); },
  hud() {
    const n = this.two ? ['Jogador 1', 'Jogador 2'] : ['Você', 'Amiguinho'];
    return [[n[0], String(this.sc[0])], [n[1], String(this.sc[1])], ['Vez', this.state === 'aim' ? n[this.who] : '…', this.state === 'aim' && this.who === 0], ['Bolas', `${this.left[0]} × ${this.left[1]}`]];
  },
  stats() { return [`Placar ${this.sc[0]} a ${this.sc[1]} em ${this.round} rodadas`, `${this.encostos} bolas encostadas no bolim · ${this.tiradas} bolas do Amiguinho tiradas`]; },
  finalScore() { const [a, b] = this.sc; return a > b ? 1500 + 100 * Math.min(7, a - b) : 100 * Math.min(a, 7); },
  // ---------- física (a mesma para o jogo e para o Amiguinho pensar)
  heightGrad(x, y) {
    let gx = 0, gy = 0;
    for (const m of this.T.mounds) { const dx = x - m.x, dy = y - m.y, e = m.h * Math.exp(-(dx * dx + dy * dy) / (m.r * m.r)); gx += e * -2 * dx / (m.r * m.r); gy += e * -2 * dy / (m.r * m.r); }
    return [gx, gy];
  },
  softAt(x, y) { for (const s of this.T.soft) { const c = Math.cos(-s.a), si = Math.sin(-s.a), dx = x - s.x, dy = y - s.y, u = (dx * c - dy * si) / s.rx, v = (dx * si + dy * c) / s.ry; if (u * u + v * v < 1) return true; } return false; },
  collide(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), md = a.r + b.r; if (d >= md || d < .001) return false;
    const nx = dx / d, ny = dy / d, rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny, ia = 1 / a.m, ib = 1 / b.m;
    const push = (md - d) / (ia + ib); a.x -= nx * push * ia; a.y -= ny * push * ia; b.x += nx * push * ib; b.y += ny * push * ib;
    if (rel <= 0) return false;
    const J = (1 + .78) * rel / (ia + ib); a.vx -= J * ia * nx; a.vy -= J * ia * ny; b.vx += J * ib * nx; b.vy += J * ib * ny; a.mv = b.mv = true; return rel;
  },
  // um passo de tudo: bolas rolando (atrito, rampa, areia fofa, pegadas, conchas), bola voando, batidas
  world(W0, dt, live) {
    const all = W0.list;
    for (const b of all) {
      if (!b.alive) continue;
      if (b.fly) {
        const F = b.fly; F.t += dt; const u = Math.min(1, F.t / F.T);
        b.x = F.x0 + (F.x1 - F.x0) * u; b.y = F.y0 + (F.y1 - F.y0) * u; b.z = 4 * F.h * u * (1 - u);
        if (u >= 1) {
          b.z = 0; b.fly = null;
          if (b.x > BC.x1 - b.r || b.x < BC.x0 + b.r || b.y < BC.y0 + b.r || b.y > BC.y1 - b.r) { b.alive = false; b.mv = false; b.out = true; if (live) { this.fx.push({ k: 'puff', x: b.x, y: b.y, t: 0 }); beep(120, .06, 'triangle', .05, -40); } continue; }
          const vx = (F.x1 - F.x0) / F.T, vy = (F.y1 - F.y0) / F.T; b.vx = vx; b.vy = vy; b.mv = true;
          let hitAny = false;
          for (const o of all) if (o !== b && o.alive && !o.fly && Math.hypot(o.x - b.x, o.y - b.y) < b.r + o.r + 1.5) { const r = this.collide(b, o); if (r) { hitAny = true; if (live) this.hitFx(b, o, r); } }
          b.vx *= hitAny ? .3 : .26; b.vy *= hitAny ? .3 : .26;
          if (live) { this.fx.push({ k: 'puff', x: b.x, y: b.y, t: 0 }); beep(hitAny ? 300 : 120, .06, 'triangle', .05, -40); }
        }
        continue;
      }
      if (!b.mv) continue;
      const sp = Math.hypot(b.vx, b.vy), [gx, gy] = this.heightGrad(b.x, b.y), soft = this.softAt(b.x, b.y);
      const fr = (BC.fc + BC.fv * sp) * (soft ? 2.6 : 1) * (b.jack ? 1.15 : 1);
      const ax = -BC.G * gx, ay = -BC.G * gy;
      if (sp < 5 && Math.hypot(ax, ay) < BC.fc * 1.4) { b.vx = b.vy = 0; b.mv = false; continue; }
      const dec = sp > 0 ? Math.min(sp, fr * dt) / sp : 0;
      b.vx = b.vx * (1 - dec) + ax * dt; b.vy = b.vy * (1 - dec) + ay * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.roll = (b.roll || 0) + sp * dt / b.r;
      // pegadas: entortam um pouco, uma vez por pegada
      for (const [k, p] of this.T.prints.entries()) {
        if (Math.hypot(p.x - b.x, p.y - b.y) < 4 && !(b.pr & (1 << k))) { b.pr = (b.pr || 0) | (1 << k); const c = Math.cos(p.a), s = Math.sin(p.a); [b.vx, b.vy] = [(b.vx * c - b.vy * s) * .95, (b.vx * s + b.vy * c) * .95]; }
      }
      // conchas: obstáculos parados
      for (const s of this.T.shells) {
        const dx = b.x - s.x, dy = b.y - s.y, d = Math.hypot(dx, dy), md = b.r + s.r;
        if (d < md && d > .001) { const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny; b.x = s.x + nx * md; b.y = s.y + ny * md; if (vn < 0) { b.vx -= 1.45 * vn * nx; b.vy -= 1.45 * vn * ny; if (live && vn < -20) beep(1200, .03, 'square', .02, 0); } }
      }
      // tábuas em volta da cancha: a bola bate e volta fraquinha (só sai quem cai fora pelo alto)
      const lo = [BC.x0 + b.r, BC.y0 + b.r], hi = [BC.x1 - b.r, BC.y1 - b.r];
      if (b.x > hi[0] && b.vx > 0) { b.x = hi[0]; b.vx *= -.35; b.vy *= .8; if (live) this.board(b); }
      if (b.x < lo[0] && b.vx < 0) { b.x = lo[0]; b.vx *= -.35; b.vy *= .8; if (live) this.board(b); }
      if (b.y > hi[1] && b.vy > 0) { b.y = hi[1]; b.vy *= -.35; b.vx *= .8; if (live) this.board(b); }
      if (b.y < lo[1] && b.vy < 0) { b.y = lo[1]; b.vy *= -.35; b.vx *= .8; if (live) this.board(b); }
    }
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j]; if (!a.alive || !b.alive || a.fly || b.fly || (!a.mv && !b.mv)) continue;
      const r = this.collide(a, b); if (r && live) this.hitFx(a, b, r);
    }
  },
  board(b) { const sp = Math.hypot(b.vx, b.vy); if (sp > 15) beep(180, .04, 'triangle', .03 + Math.min(sp, 150) / 5000, -20); },
  hitFx(a, b, r) { this.fx.push({ k: 'hit', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: 0 }); beep(380 + Math.min(r, 200), .04, 'square', .04 + Math.min(r, 200) / 4000, -60); },
  moving(list) { return list.some((b) => b.alive && (b.mv || b.fly)); },
  // velocidade para a bola rolar d px na areia lisa
  v0For(d) {
    let lo = 0, hi = 700;
    for (let k = 0; k < 24; k++) { const v = (lo + hi) / 2, s = v / BC.fv - BC.fc / (BC.fv * BC.fv) * Math.log(1 + BC.fv * v / BC.fc); if (s < d) lo = v; else hi = v; }
    return (lo + hi) / 2;
  },
  // cria a bola lançada: força 0..1 (passando de 1 sai da cancha), ângulo em graus
  launch(side, isJack, kind, power, deg) {
    const a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), b = { side, jack: isJack, r: isJack ? BC.rj : BC.rb, m: isJack ? .35 : 1, x: BC.sx, y: BC.sy, vx: 0, vy: 0, z: 0, alive: true, mv: true, fly: null, roll: 0, pr: 0 };
    if (kind === 'alto') { const d = BC.L * (.06 + .96 * power); b.fly = { t: 0, T: .55 + .5 * d / BC.L, x0: BC.sx, y0: BC.sy, x1: BC.sx + d * ca, y1: BC.sy + d * sa, h: 16 + 26 * d / BC.L }; b.mv = false; }
    else { const v = this.v0For(BC.L * (.04 + 1.04 * power)); b.vx = v * ca; b.vy = v * sa; }
    return b;
  },
  // ---------- distâncias e quem joga
  dist(b) { return b && b.alive && this.jack && this.jack.alive ? Math.hypot(b.x - this.jack.x, b.y - this.jack.y) - b.r - this.jack.r : Infinity; },
  bestOf(side, balls = this.balls) { let m = Infinity; for (const b of balls) if (b.side === side && b.alive) m = Math.min(m, this.dist(b)); return m; },
  nextTurn() {
    const L = this.left;
    if (!L[0] && !L[1]) return this.endRound();
    if (!L[0]) return this.turn(1); if (!L[1]) return this.turn(0);
    const b0 = this.bestOf(0), b1 = this.bestOf(1);
    if (b0 === Infinity && b1 === Infinity) return this.turn(this.lastThrow < 0 ? this.jackBy : 1 - this.lastThrow);
    this.turn(b0 > b1 ? 0 : 1);
  },
  turn(w) { this.who = w; this.toss = 'ball'; this.state = 'aim'; this.st = 0; this.m = 0; this.mDir = 1; this.charging = false; this.ai = {}; this.prev = { a: false, b: false }; this.ang = clamp(this.ang, -26, 26); },
  endRound() {
    const b0 = this.bestOf(0), b1 = this.bestOf(1);
    this.state = 'score'; this.st = 0;
    if (!this.jack || !this.jack.alive || (b0 === Infinity && b1 === Infinity)) { this.res = { w: -1, n: 0, list: [] }; pop('Ninguém pontua', W / 2, 46, '#fff6d6', true); return; }
    const w = b0 < b1 ? 0 : 1, other = w ? b0 : b1, list = this.balls.filter((b) => b.side === w && b.alive && this.dist(b) < other);
    this.res = { w, n: list.length, list }; this.sc[w] += list.length;
    const names = this.two ? ['Jogador 1', 'Jogador 2'] : ['você', 'o Amiguinho'];
    pop(`+${list.length} para ${names[w]}`, W / 2, 46, w ? '#ffb3c8' : '#bfefff', true);
    if (!this.two) { if (w === 0) { sfx.point(); talk(FALA.bcBoa, .3); } else { sfx.whiff(); talk(FALA.bcRuim, .3); } const d = this.sc[1] - this.sc[0]; this.mood = clamp(d <= -2 ? this.mood + .4 : d >= 2 ? this.mood - .35 : this.mood * .6, -1, 1); }
    else sfx.point();
  },
  // ---------- quadro a quadro
  update(dt, I) {
    this.t += dt; this.st += dt;
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < .8);
    if (this.over) { this.overT += dt; return this.overT > 2; }
    if (this.state === 'aim') {
      const human = this.two || this.who === 0;
      if (human) this.aimHuman(dt, I); else this.aimAI(dt);
    } else if (this.state === 'roll') {
      const list = [...this.balls, ...(this.jack ? [this.jack] : [])], n = 3;
      for (let k = 0; k < n; k++) this.world({ list }, dt / n, true);
      this.rollT = (this.rollT || 0) + dt;
      if (this.rollT > 14) for (const b of list) { b.mv = false; b.vx = b.vy = 0; if (b.fly) { b.fly = null; b.z = 0; } }   // segurança: nada rola para sempre
      if (this.moving(list)) this.st = 0;
      else if (this.st > .55) this.settled();
    } else if (this.state === 'score') {
      if (this.st > 2.6) {
        if (this.sc[0] >= 7 || this.sc[1] >= 7) { this.over = true; this.overT = 0; this.score = this.two ? 0 : this.finalScore(); if (!this.two) talk(this.sc[0] > this.sc[1] ? FALA.bcBoa : FALA.bcRuim, 1); return false; }
        this.newRound(this.res && this.res.w >= 0 ? this.res.w : this.jackBy);
      }
    } else if (this.state === 'null') { if (this.st > 1.8) this.newRound(this.jackBy); }
    return false;
  },
  aimHuman(dt, I) {
    const ay = (I.u ? -1 : 0) + (I.d ? 1 : 0) || (Math.abs(I.ay || 0) > .25 ? Math.sign(I.ay) : 0);
    if (!this.charging) this.ang = clamp(this.ang + ay * 22 * dt * (this.st < .2 ? 0 : 1), -30, 30);
    if (!this.charging && (I.a || I.b) && !(this.prev.a || this.prev.b)) { this.charging = true; this.kind = I.b ? 'alto' : 'rolar'; this.m = 0; this.mDir = 1; }
    if (this.charging) {
      this.m += this.mDir * dt / BC.meter; if (this.m >= 1.08) { this.m = 1.08; this.mDir = -1; } if (this.m <= 0) { this.m = 0; this.mDir = 1; }
      const held = this.kind === 'alto' ? I.b : I.a;
      if (!held) this.release(this.m);
    }
    this.prev = { a: I.a, b: I.b };
  },
  release(power) {
    const who = this.who, isJack = this.toss === 'jack', b = this.launch(who, isJack, this.kind, power, this.ang);
    if (isJack) this.jack = b; else { this.balls.push(b); this.left[who]--; }
    this.lastThrow = who; this.state = 'roll'; this.st = 0; this.rollT = 0; this.charging = false; this.throwT = this.t; this.throwBy = who;
    this.before = this.jack ? this.bestOf(1 - who) : Infinity;
    beep(this.kind === 'alto' ? 520 : 330, .05, 'triangle', .04, 60);
  },
  settled() {
    if (this.toss === 'jack') {
      const j = this.jack, ok = j.alive && j.x > BC.sx + .42 * BC.L && j.x < BC.x1 - 16 && j.y > BC.y0 + 8 && j.y < BC.y1 - 8;
      if (!ok) {
        this.jackTries++;
        if (this.jackTries >= 2) { Object.assign(j, { x: BC.sx + .7 * BC.L, y: BC.sy, alive: true, out: false, vx: 0, vy: 0, mv: false }); pop('Bolim no meio', W / 2, 46, '#fff6d6', true); }
        else { pop('Bolim fora: vez do outro lado', W / 2, 46, '#fff6d6', true); this.jack = null; this.turn(1 - this.who); this.toss = 'jack'; return; }
      }
      this.turn(this.jackBy); return;
    }
    if (!this.jack.alive) { this.state = 'null'; this.st = 0; pop('O bolim saiu: rodada anulada', W / 2, 46, '#fff6d6', true); sfx.whiff(); return; }
    const me = this.throwBy, last = this.balls[this.balls.length - 1], d = this.dist(last), meHuman = this.two || me === 0;
    if (last.alive && d < 1.6) { pop('Encostou!', last.x, last.y - 12, me ? '#ffb3c8' : '#bfefff'); if (meHuman) this.encostos++; }
    // tirou: a melhor bola do outro lado ficou bem mais longe do bolim depois desta jogada
    if (this.before < Infinity && this.bestOf(1 - me) > this.before + 12) { pop('Tirou!', last.x, last.y - 20, '#fff6d6'); if (meHuman && !this.two) this.tiradas++; }
    this.nextTurn();
  },
  // ---------- o Amiguinho: testa várias jogadas com a mesma física, escolhe a melhor e erra um pouco conforme a dificuldade
  value(side, list, jack) {
    if (!jack.alive) return -150;   // tirar o bolim anula a rodada: o Amiguinho evita
    const dd = (b) => (b.alive ? Math.hypot(b.x - jack.x, b.y - jack.y) - b.r - jack.r : Infinity);
    let mine = Infinity, theirs = Infinity; for (const b of list) if (b.alive && !b.jack) { const d = dd(b); if (b.side === side) mine = Math.min(mine, d); else theirs = Math.min(theirs, d); }
    if (mine === Infinity) return -200;
    if (mine < theirs) { let n = 0; for (const b of list) if (b.alive && !b.jack && b.side === side && dd(b) < theirs) n++; return 100 + 40 * n - mine * .3; }
    return -(mine - theirs);
  },
  *thinker(side, acc) {
    const isJack = this.toss === 'jack', base = this.balls.map((b) => ({ ...b })), jack = this.jack ? { ...this.jack } : null;
    let best = null, k = 0;
    const kinds = isJack ? ['rolar'] : ['rolar', 'alto'];
    for (const kind of kinds) for (let a = -26; a <= 26; a += 1.5) for (let p = .02; p <= 1.02; p += .025) {
      if (++k % 110 === 0) yield null;
      if (isJack) { const tx = BC.sx + BC.L * (.72 + .1 * Math.sin(side * 3 + this.round)); const b = this.launch(side, true, kind, p, a); const lst = [b]; for (let s = 0; s < 360 && this.moving(lst); s++) this.world({ list: lst }, 1 / 60, false); if (!b.alive) continue; const v = -Math.hypot(b.x - tx, b.y - BC.sy); if (!best || v > best.v) best = { v, kind, a, p }; continue; }
      const lst = base.map((b) => ({ ...b })), j = { ...jack }; const nb = this.launch(side, false, kind, p, a); lst.push(nb, j);
      for (let s = 0; s < 420 && this.moving(lst); s++) this.world({ list: lst }, 1 / 60, false);
      const v = this.value(side, lst, j) - (kind === 'alto' ? 2 : 0);
      if (!best || v > best.v) best = { v, kind, a, p };
    }
    // erro de mão: força e mira, conforme o acerto
    const e = 1 - acc; best.a += ppGauss() * e * 4.2; best.p = clamp(best.p + ppGauss() * e * .07, 0, 1.08);
    return best;
  },
  aimAI(dt) {
    const A = this.ai;
    if (!A.gen) { A.gen = this.thinker(this.who, this.who === 0 && this.botAcc ? this.botAcc : this.two ? .8 : this.accNow()); A.plan = null; }
    if (!A.plan) { const r = A.gen.next(); if (r.done) { A.plan = r.value; A.wait = rand(.3, .6); } return; }
    if (this.st < .7) return;
    const P = A.plan, da = P.a - this.ang;
    if (Math.abs(da) > .3) { this.ang += clamp(da, -24 * dt, 24 * dt); return; }
    A.wait -= dt; if (A.wait > 0) return;
    if (!this.charging) { this.charging = true; this.kind = P.kind; this.m = 0; this.mDir = 1; }
    this.m += dt / BC.meter;
    if (this.m >= P.p) this.release(P.p);
  },
  demo() { this.state = 'roll'; this.jack = this.launch(0, true, 'rolar', .7, 2); this.jack.x = BC.sx + .7 * BC.L; this.jack.mv = false; this.jack.vx = this.jack.vy = 0; this.toss = 'ball'; this.balls = [this.launch(0, false, 'rolar', .66, 3)]; this.throwBy = 0; this.before = 0; },
  // ---------- desenho (provisório): vila de pescadores vista de cima, cancha de areia batida, bolas pintadas pelo jogo
  draw(tt) {
    // casinhas coloridas no alto (telhados vistos de cima), mar embaixo
    R(0, 0, W, H, '#e7c98f');
    for (let i = 0; i < 9; i++) { const x = i * 46 - 8, c = ['#e85d5d', '#4fb3c9', '#f2b84b', '#7cc47f', '#d97bb6'][i % 5]; R(x, 0, 40, 30, c); R(x, 14, 40, 2, 'rgba(0,0,0,.2)'); R(x + 3, 3, 34, 9, 'rgba(255,255,255,.18)'); ctx.strokeStyle = NAVY; ctx.lineWidth = 1; ctx.strokeRect(x + .5, .5, 40, 30); }
    R(0, 30, W, 6, 'rgba(120,80,40,.25)');
    // redes estendidas e uma jangada
    ctx.strokeStyle = 'rgba(230,120,60,.85)'; ctx.lineWidth = .7; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(250 + i * 6, 40); ctx.lineTo(262 + i * 6, 62); ctx.stroke(); ctx.beginPath(); ctx.moveTo(250, 40 + i * 4); ctx.lineTo(296, 42 + i * 4); ctx.stroke(); }
    const sea = ctx.createLinearGradient(0, 200, 0, H); sea.addColorStop(0, '#5fc9d6'); sea.addColorStop(1, '#2f8fb3'); ctx.fillStyle = sea; ctx.fillRect(0, 203, W, H - 203);
    for (let i = 0; i < 8; i++) R(((i * 61 + tt * 8) % (W + 40)) - 20, 206 + (i % 3) * 5, 14, 1, 'rgba(255,255,255,.55)');
    R(0, 200, W, 3, '#f3e2b8');
    ctx.save(); ctx.translate(330, 210); ctx.fillStyle = '#5b8fd9'; ctx.beginPath(); ctx.ellipse(0, 0, 26, 6, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = NAVY; ctx.stroke(); R(-1, -16, 2, 16, '#6b4a2a'); ctx.fillStyle = '#fff4e0'; ctx.beginPath(); ctx.moveTo(1, -16); ctx.lineTo(14, -4); ctx.lineTo(1, -2); ctx.fill(); ctx.restore();
    // cancha
    const g = ctx.createLinearGradient(0, BC.y0, 0, BC.y1); g.addColorStop(0, '#dcb879'); g.addColorStop(1, '#cfa86a'); ctx.fillStyle = g; ctx.fillRect(BC.x0, BC.y0, BC.x1 - BC.x0, BC.y1 - BC.y0);
    for (let i = 0; i < 260; i++) { const x = BC.x0 + ((i * 97.3) % (BC.x1 - BC.x0)), y = BC.y0 + ((i * 53.7) % (BC.y1 - BC.y0)); R(x, y, 1, 1, i % 3 ? 'rgba(120,80,40,.18)' : 'rgba(255,245,220,.3)'); }
    for (const s of this.T.soft) { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a); ctx.fillStyle = 'rgba(245,225,180,.75)'; ctx.beginPath(); ctx.ellipse(0, 0, s.rx, s.ry, 0, 0, TAU); ctx.fill(); for (let k = 0; k < 18; k++) R(Math.cos(k * 2.4) * s.rx * .8 * ((k % 5) / 5), Math.sin(k * 2.4) * s.ry * .8 * ((k % 7) / 7), 1.4, 1, 'rgba(160,120,70,.3)'); ctx.restore(); }
    for (const m of this.T.mounds) {
      const up = m.h > 0, gr = ctx.createRadialGradient(m.x + (up ? -m.r * .3 : m.r * .3), m.y + (up ? -m.r * .3 : m.r * .3), 1, m.x, m.y, m.r * 1.15);
      gr.addColorStop(0, up ? 'rgba(255,240,205,.55)' : 'rgba(110,70,30,.35)'); gr.addColorStop(.6, up ? 'rgba(255,240,205,.12)' : 'rgba(110,70,30,.1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 1.15, 0, TAU); ctx.fill();
      const sh = ctx.createRadialGradient(m.x + (up ? m.r * .35 : -m.r * .35), m.y + (up ? m.r * .35 : -m.r * .35), 1, m.x, m.y, m.r); sh.addColorStop(0, up ? 'rgba(110,70,30,.25)' : 'rgba(255,240,205,.3)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.fill();
    }
    for (const p of this.T.prints) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang); ctx.fillStyle = 'rgba(120,80,40,.35)'; ctx.beginPath(); ctx.ellipse(0, 0, 2.6, 1.3, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(2.4, 0, .9, .9, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    for (const s of this.T.shells) { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a); ctx.fillStyle = s.c; ctx.strokeStyle = NAVY; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(0, 2); ctx.arc(0, 2, 3.2, Math.PI * 1.15, Math.PI * 1.85); ctx.closePath(); ctx.fill(); ctx.stroke(); for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(k * 1.8, -.6); ctx.stroke(); } ctx.restore(); }
    // corda da cancha, linha de lançamento e gravetos a cada quarto
    for (const [x, y, w, h] of [[BC.x0 - 4, BC.y0 - 4, BC.x1 - BC.x0 + 8, 4], [BC.x0 - 4, BC.y1, BC.x1 - BC.x0 + 8, 4], [BC.x0 - 4, BC.y0, 4, BC.y1 - BC.y0], [BC.x1, BC.y0, 4, BC.y1 - BC.y0]]) { R(x, y, w, h, '#a8784a'); R(x, y, w, 1, '#d9a873'); ctx.strokeStyle = NAVY; ctx.lineWidth = .6; ctx.strokeRect(x, y, w, h); }
    R(BC.sx + 6, BC.y0, 1, BC.y1 - BC.y0, 'rgba(255,250,235,.7)');
    for (let q = 1; q <= 3; q++) { const x = BC.sx + BC.L * q / 4; for (const y of [BC.y0 - 3, BC.y1]) R(x, y, 1.4, 3, '#7a5233'); }
    // bolas (sombras primeiro)
    const all = [...this.balls, ...(this.jack ? [this.jack] : [])];
    for (const b of all) if (b.alive || (b.out && this.state === 'roll')) { ctx.fillStyle = 'rgba(60,35,15,.3)'; ctx.beginPath(); ctx.ellipse(b.x + 1.5, b.y + 2, b.r * (1 - Math.min(.4, b.z / 60)), b.r * .75, 0, 0, TAU); ctx.fill(); }
    // medida no fim da rodada
    if (this.state === 'score' && this.res && this.res.list.length && this.jack) for (const b of this.res.list) { ctx.strokeStyle = this.res.w ? '#ff7fb0' : '#7fd6ff'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(this.jack.x, this.jack.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]); }
    for (const b of all.filter((b) => !b.fly).concat(all.filter((b) => b.fly))) if (b.alive || (b.out && this.state === 'roll' && this.t - this.throwT < 3)) this.drawBall(b);
    for (const f of this.fx) {
      const k = f.t / .8; ctx.globalAlpha = 1 - k;
      if (f.k === 'puff') { ctx.fillStyle = '#f6e3b8'; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * (4 + k * 9), f.y + Math.sin(a) * (3 + k * 6), 1.6 * (1 - k) + .4, 0, TAU); ctx.fill(); } }
      else if (f.k === 'hit') { ctx.strokeStyle = '#fff6d6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(f.x, f.y, 2 + k * 8, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    this.drawPeople(tt);
    // mira e força
    if (this.state === 'aim') {
      const a = this.ang * Math.PI / 180, me = this.who, col = me ? '#ff8fbf' : '#8fdcff';
      ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(BC.sx + Math.cos(a) * 9, BC.sy + Math.sin(a) * 9); ctx.lineTo(BC.sx + Math.cos(a) * 40, BC.sy + Math.sin(a) * 40); ctx.stroke(); ctx.setLineDash([]);
      const nb = this.toss === 'jack' ? { jack: true, r: BC.rj, side: -1, x: BC.sx, y: BC.sy, z: 0, roll: 0 } : { side: me, r: BC.rb, x: BC.sx, y: BC.sy, z: 0, roll: 0 }; this.drawBall(nb);
      if (this.charging) {
        const x = 10, y = BC.y0 + 8, h = 70; R(x - 1, y - 1, 8, h + 2, NAVY); R(x, y, 6, h, '#3b2f4a'); const v = clamp(this.m / 1.08, 0, 1);
        R(x, y + h * (1 - v), 6, h * v, this.kind === 'alto' ? '#ffd166' : col); R(x - 2, y + h * (1 - 1 / 1.08), 10, 1, '#ffffff');
        ctx.fillStyle = '#fff6d6'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(this.kind === 'alto' ? 'ALTO' : 'ROLAR', x + 3, y + h + 9); ctx.textAlign = 'left';
      }
    }
    const s = `${this.sc[0]}  ×  ${this.sc[1]}`; R(W / 2 - 26, 40, 52, 14, 'rgba(60,40,30,.85)'); ctx.strokeStyle = NAVY; ctx.lineWidth = 1; ctx.strokeRect(W / 2 - 26, 40, 52, 14);
    ctx.fillStyle = '#fff6d6'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(s, W / 2, 51); ctx.textAlign = 'left';
  },
  drawBall(b) {
    const k = 1 + Math.min(.5, (b.z || 0) / 40), r = b.r * k, x = b.x, y = b.y - (b.z || 0) * .6;
    ctx.save(); if (!b.alive && b.out) ctx.globalAlpha = .45;
    const base = b.jack ? '#ff9a3d' : b.side ? '#ec5f9e' : '#3f7fe0', light = b.jack ? '#ffd7a8' : b.side ? '#ffc2dc' : '#bfe0ff';
    const gr = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r); gr.addColorStop(0, light); gr.addColorStop(.55, base); gr.addColorStop(1, b.jack ? '#b65a14' : b.side ? '#9b2e63' : '#1f4a9a');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    if (!b.jack) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip(); const off = Math.sin(b.roll || 0) * r * .8; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(x + off * .2, y, Math.abs(Math.cos(b.roll || 0)) * r * .9 + .3, r, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
    ctx.strokeStyle = NAVY; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.restore();
  },
  drawPeople(tt) {
    // quem joga fica na linha de lançamento; quem espera, no canto
    const fr = window.__fr || {};
    for (const i of [0, 1]) {
      const active = this.state === 'aim' || this.state === 'roll' ? (this.state === 'aim' ? this.who : this.throwBy) === i : false;
      const x = active ? 30 : 18 + i * 0, y = active ? BC.sy + 14 : (i === 0 ? BC.y1 + 8 : BC.y0 + 2), f = fr[i ? 'bl' : 'ia'];
      ctx.save(); ctx.translate(x, y); ctx.scale(.52, .52);
      let an = 'ready', k = Math.floor(tt * 8) % 8, ex = 0;
      if (this.over) { const won = this.sc[i] > this.sc[1 - i]; an = won ? 'party' : 'sad'; k = Math.min(15, Math.floor(this.overT * 12)); }
      else if (this.state === 'score' && this.res && this.res.w >= 0) { an = this.res.w === i ? 'party' : 'sad'; k = Math.min(15, Math.floor(this.st * 12)); }
      else if (active && this.state === 'aim' && this.charging) { an = 'bump'; k = 2 + Math.floor(clamp(this.m, 0, 1) * 4); ex = 5; }
      else if (active && this.state === 'roll' && this.t - this.throwT < .45) { an = 'bump'; k = Math.min(15, 7 + Math.floor((this.t - this.throwT) / .45 * 9)); ex = 5; }
      else if (!active) { an = 'idle'; k = Math.floor(tt * 6) % 16; }
      try { if (f) f(an, k, 'g', ex, false); } catch { /* carregando */ }
      ctx.restore();
      // bolas que faltam
      const left = this.left[i]; for (let n = 0; n < left; n++) { const bx = (active ? 40 : 30) + n * 5, by = y + 4; ctx.fillStyle = i ? '#ec5f9e' : '#3f7fe0'; ctx.strokeStyle = NAVY; ctx.lineWidth = .6; ctx.beginPath(); ctx.arc(bx, by, 2, 0, TAU); ctx.fill(); ctx.stroke(); }
    }
  },
};
