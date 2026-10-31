/* ============================================================ prova nova: Pingue-pongue no quiosque (2ª versão, 30/10/2026)
   Vista de lado, IAmiguinho contra Amiguinho, até 11 (com 2 de vantagem).
   ANDAR LIVRE: ◀ ▶ andam (pode ir até a rede ou bem para trás da mesa).
   BATER: aperte o golpe ANTES da bola chegar: o personagem prepara a raquete e bate sozinho quando a bola passa pelo ponto bom
   (na frente do corpo, na altura do peito). Preparar com antecedência deixa a batida mais forte; preparado, anda mais devagar.
   Golpes: ✕ rebater (topspin) · ○ cortada (forte, só presta com a bola alta) · □ efeito (cortada por baixo, quica baixo)
           △ toque curto (cai perto da rede). ▲ segurado: funda (lá de trás da mesa vira balão) · ▼ segurado: curta.
   Bola: gravidade, resistência do ar e efeito (topspin mergulha e acelera no quique; efeito por baixo flutua e freia no quique).
   Bola com efeito por baixo devolvida com rebatida tende a cair (rede); bola com topspin devolvida com efeito tende a subir.
   Regras: saque de trás da mesa, quicando primeiro do seu lado; rede no saque repete. A bola tem que quicar uma vez do outro lado.
   Arte provisória: personagens pintados do vôlei e raquete desenhada pelo jogo; o quiosque é desenhado pelo jogo. */
const PP = {
  g: 520, k: .0011, cm: .8, r: 2, tx0: 120, tx1: 280, nx: 200, netH: 9, half: 80,
  sweet: 14, reachF: 30, reachB: -8, hMin: 6, hMax: 78, spd: 135, armSpd: 78, accel: 1000, ts: .85, home: [94, 306], arm: 1.15, sw: .3,
};
// teclas do 2 jogadores: guarda o aperto até o quadro seguinte (um toque rápido não se perde)
const ppLatch = {};
addEventListener('keydown', (e) => { if (!e.repeat) ppLatch[e.code] = true; });
const ppGauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
if (typeof Music !== 'undefined' && Music.songs.volei) Music.songs.pingue = Music.songs.volei;
FALA.intro.pingue = [
  'Pingue-pongue no quiosque: quem perder paga a água de coco. Eu já tô devendo três.',
  'Prepara a raquete cedo e deixa a bola vir. Correr com a raquete armada é que é o problema.',
  'Amiguinho lá atrás? Toque curtinho. Ele grudado na mesa? Manda funda. É xadrez com raquete.',
];
FALA.ppPonto = ['Ponto! O quiosque inteiro aplaudiu. Tá, foram dois coqueiros.', 'Essa nem o Amiguinho viu passar.', 'Curtinha na rede e ele lá no fundo. Lindo.'];
FALA.ppLevou = ['Bateu na rede. A rede tá do lado dele, só pode.', 'Saiu longa. A mesa encolheu, eu juro.', 'Essa veio com efeito de novela.', 'Passou por cima de mim! Eu tava muito colado na mesa.'];
const pingue = {
  id: 'pingue', name: 'Pingue-pongue', tag: 'Quiosque do Coqueiral · até 11', wide: true, hi: true, paint: true, two2: true, two: false, dur: 0,
  med: [800, 1500, 2000], medText: ['fazer 8 pontos', 'vencer', 'vencer por 5 ou mais'], medShort: ['Fazer 8 pontos', 'Vencer', 'Vencer por 5+'],
  menu2: [['Modo', '2 jogadores'], ['Placar', 'até 11'], ['Saque', 'troca a cada 2'], ['Pódio', 'não conta']], ia: 1700, nota: 'a bolinha caiu no copo de açaí',
  desc: 'Ande pela mesa, prepare a raquete antes da bola chegar e escolha a jogada.',
  steps: () => [
    `Ande com ◀ ▶ e aperte ${actName()} antes da bola chegar: a raquete fica pronta e a batida sai quando a bola passa na sua frente. Preparar cedo deixa a bola mais forte.`,
    `${touch ? 'Cortada' : 'X'}: cortada na bola alta. ${touch ? 'Efeito' : 'C'}: bola cortada por baixo, que quica baixo. ${touch ? 'Toque' : 'V'}: toque curtinho perto da rede.`,
    'Segure ▲ para mandar funda (lá de trás da mesa, vira balão) e ▼ para mandar curta. Até 11, com 2 de vantagem.',
  ],
  hint: () => '',
  gp: 'Controle: analógico anda · ✕ rebate · ○ cortada · □ efeito · △ toque curto · Start pausa. Dois jogadores: A D W S com Espaço, E, Q, R; J L I K com Enter, O, U, P (ou dois controles).',
  ctl: [['◀ ▶', 'andar'], ['▲ ▼', 'funda / curta'], ['Espaço', 'rebater (e sacar)', 'kb'], ['X', 'cortada', 'kb'], ['C', 'efeito', 'kb'], ['V', 'toque curto', 'kb'],
    ['Rebater', 'rebater (e sacar)', 'touch'], ['Cortada', 'cortada', 'touch'], ['Efeito', 'efeito', 'touch'], ['Toque', 'toque curto', 'touch'], ['Esc', 'pausa', 'kb']],
  pad: { dirs: 'lrud', a: 'Rebater', b: 'Cortada', c: 'Efeito', e: 'Toque' }, bannerY: 60,
  init() {
    const gy = H - 22;
    Object.assign(this, {
      t: 0, score: 0, sc: [0, 0], gy, ty: gy - 36, P: [this.newP(0), this.newP(1)], b: null, state: 'serve', st: 0, server: 0, nServ: 0,
      fx: [], longest: 0, hits: 0, cortadas: 0, curtas: 0, perfeitas: 0, flash: 0, flashW: 0, k2: {}, gp2: {}, mood: 0, over: false, overT: 0, lastW: 0, ballId: 0,
    });
    this.resetServe();
  },
  newP(i) { return { i, f: i ? -1 : 1, x: PP.home[i], vx: 0, arm: null, sw: null, cool: 0, ph: 0, ex: 0, exT: 0, aim: 0, mvT: 0, ai: {}, plan: null }; },
  demo() {
    this.state = 'rally'; const b = this.b; Object.assign(b, { held: false, toss: false, x: 150, y: this.ty - 20, vx: 330, vy: -120, s: .7, last: 0, side: -1, nb: 0 });
    this.P[0].sw = { t: .08, kind: 'rebater' }; this.P[1].x = 330; this.P[1].arm = { kind: 'rebater', t: .3 };
  },
  hud() {
    const n = this.two ? ['Jogador 1', 'Jogador 2'] : ['Você', 'Amiguinho'];
    return [[n[0], String(this.sc[0])], [n[1], String(this.sc[1])], ['Saque', this.server ? n[1] : n[0], this.state === 'serve'], ['Maior troca', String(this.longest)]];
  },
  stats() { return [`Placar ${this.sc[0]} a ${this.sc[1]}`, `${this.perfeitas} batidas perfeitas · ${this.cortadas} cortadas · ${this.curtas} toques curtos`, `Maior troca: ${this.longest} batidas`]; },
  finalScore() { const [a, b] = this.sc; return a > b ? 1500 + 100 * Math.min(10, a - b) : 100 * Math.min(a, 12); },
  accNow() { const m = this.mood || 0; return clamp(.74 + (m > 0 ? .14 * m : .14 * m), .55, .9); },
  resetServe() {
    this.state = 'serve'; this.st = 0; this.hits = 0; this.ballId++;
    for (const p of this.P) { p.arm = null; p.sw = null; p.cool = 0; p.plan = null; p.ai = {}; p.pend = null; }
    const s = this.P[this.server]; s.x = clamp(s.x, s.i ? PP.tx1 + 8 : 14, s.i ? W - 14 : PP.tx0 - 8);
    this.b = { x: s.x + s.f * 10, y: this.gy - 40, vx: 0, vy: 0, s: 0, last: -1, side: -1, nb: 0, held: true, toss: false, serve: 0, let: false, why: '', tr: [] };
  },
  // ---------- física da bola (unidades do jogo: px e segundos)
  step(c, dt) {
    const sp = Math.hypot(c.vx, c.vy), u = Math.sign(c.vx) || 1;
    const ax = -PP.k * sp * c.vx + PP.cm * c.s * u * -c.vy, ay = PP.g - PP.k * sp * c.vy + PP.cm * c.s * u * c.vx;
    c.vx += ax * dt; c.vy += ay * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.s *= 1 - .25 * dt;
  },
  // quique na mesa: topspin sai baixo e acelera; efeito por baixo sai alto e freia (pode até parar)
  bounceT(c) {
    const u = Math.sign(c.vx) || 1, s = c.s;
    c.y = this.ty - PP.r; c.vy = -Math.abs(c.vy) * (s >= 0 ? .82 - .12 * s : .86 + .05 * -s); c.vx = c.vx * .86 + u * s * 60; c.s = s * .45;
  },
  // avança e conta o que aconteceu: mesa (lado), rede (fita?) ou chão
  move(c, dt) {
    const px = c.x, py = c.y; this.step(c, dt);
    const top = this.ty - PP.netH - PP.r;
    if ((px - PP.nx) * (c.x - PP.nx) <= 0 && px !== c.x && c.y > top && py < this.ty + 3) return { k: 'net', fita: c.y < top + 2.2 };
    if (c.vy > 0 && c.y >= this.ty - PP.r && py < this.ty - PP.r + 1 && c.x > PP.tx0 && c.x < PP.tx1) return { k: 'table', side: c.x < PP.nx ? 0 : 1 };
    if (c.y >= this.gy - PP.r || c.x < -14 || c.x > W + 14) return { k: 'floor' };
    return null;
  },
  // ---------- mira: acha o ângulo que leva a bola ao ponto pedido (com ar e efeito), passando a rede com folga
  simShot(x0, y0, f, V, deg, s, serve, margin) {
    const a = deg * Math.PI / 180, c = { x: x0, y: y0, vx: f * V * Math.cos(a), vy: -V * Math.sin(a), s }, my = f > 0 ? 0 : 1, dt = 1 / 150;
    let stage = 0;
    for (let t = 0; t < 2.6; t += dt) {
      const px = c.x, ev = this.move(c, dt);
      if ((px - PP.nx) * (c.x - PP.nx) <= 0 && px !== c.x && c.y > this.ty - PP.netH - PP.r - margin) return null;
      if (!ev) continue;
      if (ev.k !== 'table') return null;
      // longe das beiradas (bola na quina é sorte, não mira)
      if (c.x < PP.tx0 + 5 || c.x > PP.tx1 - 5 || Math.abs(c.x - PP.nx) < 5) return null;
      if (serve && stage === 0) { if (ev.side !== my) return null; stage = 1; this.bounceT(c); continue; }
      return ev.side === my ? null : c.x;
    }
    return null;
  },
  solve(x0, y0, f, V, s, xt, serve, prefHigh, margin) {
    for (const kv of prefHigh ? [1, 1.15] : [1, 1.12, 1.25]) {
      const res = [];
      for (let a = serve ? -55 : -22; a <= (serve ? 22 : 74); a += 1.5) { const r = this.simShot(x0, y0, f, V * kv, a, s, serve, margin); if (r !== null) res.push([a, Math.abs(r - xt)]); }
      if (!res.length) continue;
      const m = Math.min(...res.map((q) => q[1])), ok = res.filter((q) => q[1] <= m + 5);
      if (m < 22 || kv === (prefHigh ? 1.15 : 1.25)) return { a: prefHigh ? ok[ok.length - 1][0] : ok[0][0], V: V * kv };
    }
    return { a: serve ? -10 : 14, V };
  },
  // ---------- comandos de cada lado: andar (-1..1), mirar (▲ 1, ▼ -1) e golpe apertado neste quadro
  readPad2() {
    const ps = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [], p = ps[1];
    if (!p) return null;
    const bt = (i) => !!p.buttons[i]?.pressed, ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    return { dir: bt(14) ? -1 : bt(15) ? 1 : Math.abs(ax) > .15 ? ax : 0, aim: ay < -.4 || bt(12) ? 1 : ay > .4 || bt(13) ? -1 : 0, a: bt(0), b: bt(1), c: bt(2), e: bt(3) || bt(7) };
  },
  controls(I, dt) {
    const one = { dir: I.ax || 0, aim: I.u ? 1 : I.d ? -1 : 0, shot: I.pb ? 'cortada' : I.pc ? 'efeito' : I.pe ? 'toque' : I.pa ? 'rebater' : null };
    if (!this.two) return [one, this.brain(1, dt, this.accNow())];
    const k = (c) => !!codeHeld[c], e = (c) => { const v = !!ppLatch[c]; ppLatch[c] = false; return v; };
    // jogador 1: o de sempre (setas ou WASD, Espaço X C V, 1º controle) e também E Q R; jogador 2: J L I K com Enter O U P, ou 2º controle
    if (e('KeyE')) one.shot = 'cortada'; else if (e('KeyQ')) one.shot = 'efeito'; else if (e('KeyR')) one.shot = 'toque';
    const g = this.readPad2() || {}, gp = (n) => { const v = !!g[n], was = this.gp2[n]; this.gp2[n] = v; return v && !was; };
    const two = { dir: ((k('KeyL') ? 1 : 0) - (k('KeyJ') ? 1 : 0)) || g.dir || 0, aim: k('KeyI') ? 1 : k('KeyK') ? -1 : g.aim || 0, shot: null };
    const sh = [['cortada', e('KeyO') || gp('b')], ['efeito', e('KeyU') || gp('c')], ['toque', e('KeyP') || gp('e')], ['rebater', e('Enter') || e('NumpadEnter') || gp('a')]];
    two.shot = (sh.find((q) => q[1]) || [null])[0];
    return [one, two];
  },
  update(dt, I) {
    this.t += dt; this.flash = Math.max(0, this.flash - dt);
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < .7);
    if (this.over) { this.overT += dt; for (const p of this.P) this.walk(p, 0, dt); return this.overT > 1.8; }
    const C = this.controls(I, dt); if (!this.two) for (const c in ppLatch) ppLatch[c] = false;
    for (const p of this.P) { p.exT = Math.max(0, p.exT - dt); if (!p.exT) p.ex = 0; p.cool = Math.max(0, p.cool - dt); if (p.sw) { p.sw.t += dt; if (p.sw.t > PP.sw) p.sw = null; } }
    if (this.state === 'point') { this.st += dt; for (const p of this.P) this.walk(p, 0, dt); this.stepBallDead(dt); if (this.st > 1.4) this.nextPoint(); return false; }
    const b = this.b;
    if (this.state === 'serve') {
      this.st += dt; const s = this.P[this.server];
      C.forEach((c, i) => { this.walk(this.P[i], c.dir, dt); this.P[i].aim = c.aim; });
      b.x = s.x + s.f * 10; b.y = this.gy - 40;
      const want = C[this.server].shot || (this.st > 10 ? 'rebater' : null);
      if (want && this.st > .3) { this.state = 'rally'; b.held = false; b.toss = true; b.vy = -235; b.vx = 0; s.arm = { kind: want, t: 0, serve: true }; }
      return false;
    }
    // golpes: apertar prepara a raquete (até 1,15 s); apertar outro troca o golpe
    C.forEach((c, i) => {
      const p = this.P[i]; p.aim = c.aim;
      if (c.shot) { p.pend = c.shot; p.pendT = .35; } if (p.pend) p.pendT -= dt; if (p.pendT <= 0) p.pend = null;
      if (p.pend && !p.cool && !(b.toss && i === this.server)) { if (p.arm) p.arm.kind = p.pend; else p.arm = { kind: p.pend, t: 0 }; p.pend = null; }
      if (p.arm) { p.arm.t += dt; if (p.arm.t > PP.arm && !p.arm.serve) { p.sw = { t: 0, kind: p.arm.kind, miss: true }; p.arm = null; p.cool = .25; } }
      this.walk(p, c.dir, dt, b.toss && i === this.server);
    });
    // bola em 3 passos por quadro, conferindo a batida a cada passo
    const n = 3, h = dt / n;
    for (let k = 0; k < n && this.state === 'rally'; k++) {
      for (let i = 0; i < 2; i++) if (this.tryHit(i, h)) break;
      const ev = this.move(b, h * PP.ts); if (ev) this.event(ev);
    }
    b.tr.push([b.x, b.y]); if (b.tr.length > 7) b.tr.shift();
    return false;
  },
  stepBallDead(dt) { const b = this.b; if (!b || b.held || b.dead) return; this.step(b, dt * PP.ts); if (b.y > this.gy - PP.r) { b.y = this.gy - PP.r; b.vy *= -.45; b.vx *= .7; if (Math.abs(b.vy) < 20) b.dead = true; } },
  walk(p, dir, dt, frozen) {
    const lo = p.i ? PP.nx + 10 : 10, hi = p.i ? W - 10 : PP.nx - 10;
    let vmax = (p.arm ? PP.armSpd : p.sw ? PP.spd * .45 : PP.spd) * clamp(dir, -1, 1); if (frozen) vmax = 0;
    if (this.state === 'serve' && p.i === this.server) { vmax *= .8; }
    const dv = vmax - p.vx; p.vx += Math.sign(dv) * Math.min(Math.abs(dv), PP.accel * dt); p.x += p.vx * dt;
    let mlo = lo, mhi = hi;
    if (this.state === 'serve' && p.i === this.server) { if (p.i) mlo = PP.tx1 + 8; else mhi = PP.tx0 - 8; }
    if (p.x < mlo) { p.x = mlo; p.vx = Math.max(0, p.vx); } if (p.x > mhi) { p.x = mhi; p.vx = Math.min(0, p.vx); }
    p.ph += Math.abs(p.vx) * dt * .11; if (Math.abs(p.vx) > 25) p.mvT = .12; else p.mvT = Math.max(0, p.mvT - dt);
  },
  // ---------- batida: com a raquete pronta, sai quando a bola passa pelo ponto bom (na frente, na altura do peito)
  sweetH(kind, serve) { return serve ? 54 : kind === 'cortada' ? 64 : kind === 'toque' ? 44 : 52; },
  zone(p, x, y, kind, serve) {
    const dx = (x - p.x) * p.f, h = this.gy - y;
    if (dx < PP.reachB || dx > PP.reachF || h < PP.hMin || h > PP.hMax) return null;
    return Math.hypot(dx - PP.sweet, (h - this.sweetH(kind, serve)) * .8);
  },
  tryHit(i, h) {
    const p = this.P[i], b = this.b;
    if (!p.arm || b.held) return false;
    const serving = b.toss && i === this.server;
    if (serving ? b.vy <= 0 : (b.toss || b.last === i || b.side !== i || b.nb !== 1)) return false;
    const d = this.zone(p, b.x, b.y, p.arm.kind, serving); if (d === null) return false;
    const dn = this.zone(p, b.x + b.vx * h * PP.ts, b.y + b.vy * h * PP.ts, p.arm.kind, serving);
    if (dn !== null && dn < d - .02) return false;   // ainda vai chegar mais perto do ponto bom
    this.hit(i, d, serving); return true;
  },
  hit(i, d, serving) {
    const p = this.P[i], b = this.b, A = p.arm, kind = A.kind, f = p.f, aim = p.aim;
    const inSp = Math.hypot(b.vx, b.vy), sIn = b.s, back = i ? p.x - PP.tx1 : PP.tx0 - p.x, hAbove = this.ty - b.y;
    // qualidade: posição na hora (ponto bom), tempo de preparo, bola que chega forte, correr na hora
    const qPos = clamp(1 - d / 30, 0, 1), ta = A.t, qArm = ta < .06 ? .5 : ta < .2 ? .5 + (ta - .06) / .14 * .5 : 1, charge = clamp((ta - .2) / .35, 0, 1);
    const qIn = 1 - clamp((inSp - 360) / 600, 0, .45), qMove = 1 - clamp(Math.abs(p.vx) / 150, 0, 1) * .25;
    let Q = (.35 + .65 * qPos) * qArm * qIn * qMove + .2 * charge * qPos;
    if (!this.two && i === 1) Q *= .8 + .25 * this.accNow();
    if (p.qMul) Q *= p.qMul;
    let V, s, depth, prefHigh = false, err = 1, margin = 4, label = kind;
    if (serving) {
      ({ V, s, depth } = { rebater: { V: 300, s: .5, depth: .8 }, efeito: { V: 240, s: -.8, depth: .4 }, toque: { V: 200, s: -.6, depth: .18 }, cortada: { V: 380, s: .3, depth: .92 } }[kind]);
      depth = clamp(depth + aim * .15, .1, .95); margin = 2; err = .5; Q = Math.max(Q, .8);
    } else if (kind === 'rebater' && aim > 0 && back > 46) { V = 330; s = .45; depth = .85; prefHigh = true; label = 'balão'; err = .8; }
    else if (kind === 'rebater') { V = 400 * (.9 + .3 * charge); s = .75; depth = aim > 0 ? .86 : aim < 0 ? .42 : .68; }
    else if (kind === 'cortada') { V = 640 * (.92 + .2 * charge); s = .3; depth = aim > 0 ? .92 : aim < 0 ? .55 : .78; margin = 3; if (hAbove < 20) err += (20 - hAbove) / 20 * 1.6; }
    else if (kind === 'efeito') { V = 290; s = -.85; depth = aim > 0 ? .85 : aim < 0 ? .3 : .55; err = .7; margin = 3; }
    else { V = 170; s = -.7; depth = aim > 0 ? .3 : aim < 0 ? .08 : .14; margin = 2; err = 1 + clamp(back / 40, 0, 1.5); }
    const xt = PP.nx + f * depth * PP.half + ppGauss() * (1.3 - Math.min(Q, 1.3)) * 8, sol = this.solve(b.x, b.y, f, V, s, xt, serving, prefHigh, margin);
    const eq = 1.3 - Math.min(Q, 1.3); let a = sol.a + ppGauss() * (.5 + eq * 3.4) * err; V = sol.V * (1 + ppGauss() * (.03 + eq * .05));
    // efeito que vem: bola cortada por baixo devolvida com rebatida cai; topspin devolvido com efeito sobe
    if (!serving) { if (kind === 'rebater' || kind === 'cortada') a += 3.2 * Math.min(0, sIn) * (1 - .5 * Math.min(1, Q)); else a += 2.6 * Math.max(0, sIn) * (1 - .5 * Math.min(1, Q)); }
    const ar = a * Math.PI / 180;
    Object.assign(b, { vx: f * V * Math.cos(ar), vy: -V * Math.sin(ar), s, last: i, side: -1, nb: 0, toss: false, serve: serving ? 1 : 0, let: false, why: '' });
    p.arm = null; p.sw = { t: 0, kind }; p.cool = .12; this.hits++; this.longest = Math.max(this.longest, this.hits);
    const me = i === 0 || this.two;
    if (me && Q >= 1) { this.perfeitas++; pop('Perfeita!', b.x, b.y - 16, '#bfefff'); }
    if (me && kind === 'cortada' && !serving) this.cortadas++; if (me && kind === 'toque' && !serving) this.curtas++;
    if (kind === 'cortada') shake = .1;
    p.ex = Q >= 1 || kind === 'cortada' ? 2 : 0; p.exT = .5; p.lastQ = Q;
    this.fx.push({ x: b.x, y: b.y, t: 0, k: kind === 'cortada' ? 'corte' : Q >= 1 ? 'perfeita' : 'bate' });
    beep(kind === 'cortada' ? 220 : kind === 'toque' ? 900 : 520 + (Q >= 1 ? 140 : 0), .05, 'square', .045, kind === 'cortada' ? -60 : 80);
    if (label === 'balão' && me) pop('Balão!', b.x, b.y - 16, '#fff6d6');
  },
  // ---------- regras
  event(ev) {
    const b = this.b;
    if (ev.k === 'net') {
      if (b.serve) b.let = true;
      if (ev.fita && Math.random() < .35) { b.vx *= .35; b.vy = -Math.abs(b.vy) * .2 - 40; b.y = this.ty - PP.netH - PP.r - .6; b.x += Math.sign(b.vx) * 2.5; pop('Na fita!', PP.nx, this.ty - 26, '#fff6d6'); }
      else { b.x = PP.nx - (Math.sign(b.vx) || 1) * (PP.r + 1.2); b.vx *= -.15; b.vy = Math.max(b.vy, 0) * .3; b.s *= .3; b.why = 'na rede'; }
      this.fx.push({ x: b.x, y: b.y, t: 0, k: 'rede' }); beep(140, .06, 'triangle', .04, -30); return;
    }
    if (ev.k === 'floor') return this.floor();
    // mesa
    const side = ev.side; this.fx.push({ x: b.x, y: this.ty, t: 0, k: 'quique' }); beep(side ? 700 : 760, .03, 'square', .03, 0);
    if (b.toss || b.last < 0) { this.bounceT(b); return; }
    const L = b.last, R = 1 - L;
    if (b.serve === 1) { if (side === L) { b.serve = 2; this.bounceT(b); return; } return this.point(R, 'o saque tem que quicar do seu lado'); }
    if (b.serve === 2) {
      if (side === L) return this.point(R, 'saque errado');
      if (b.let) { this.flash = .6; pop('Rede no saque: repete', W / 2, 44, '#fff6d6', true); this.state = 'point'; this.st = .6; this.noPoint = true; return; }
      b.serve = 0; b.side = side; b.nb = 1; this.bounceT(b); return;
    }
    if (side === L) return this.point(R, b.why === 'na rede' ? 'na rede' : 'quicou do próprio lado');
    if (b.side === side) return this.point(L, this.P[R].plan && this.P[R].plan.far ? 'não alcançou' : 'quicou duas vezes');
    b.side = side; b.nb = 1; this.bounceT(b);
  },
  floor() {
    const b = this.b;
    if (b.toss) return this.point(1 - this.server, 'saque perdido');
    const L = b.last;
    if (b.side === 1 - L && b.nb === 1) return this.point(L, 'não devolveu');
    this.point(1 - L, b.why === 'na rede' ? 'na rede' : 'fora da mesa');
  },
  point(w, why) {
    if (this.state !== 'rally') return;
    this.sc[w]++; this.state = 'point'; this.st = 0; this.flash = 1; this.flashW = w; this.lastW = w; this.nServ++; this.noPoint = false;
    if (!this.two) {
      if (w === 0) { sfx.point(); talk(FALA.ppPonto, .25); } else { sfx.whiff(); talk(FALA.ppLevou, .25); }
      const d = this.sc[1] - this.sc[0]; this.mood = clamp(d <= -2 ? this.mood + .35 : d >= 2 ? this.mood - .3 : this.mood * .6, -1, 1);
    } else sfx.point();
    pop(why === 'não devolveu' ? 'Ponto!' : why[0].toUpperCase() + why.slice(1), W / 2, 44, w === 0 ? '#bfefff' : '#ffb3c8', true);
    for (const p of this.P) { p.arm = null; }
    this.P[w].ex = 2; this.P[w].exT = 1.2; this.P[1 - w].ex = 4; this.P[1 - w].exT = 1.2;
  },
  nextPoint() {
    if (this.noPoint) { this.noPoint = false; this.resetServe(); return; }
    const [a, b] = this.sc;
    if ((a >= 11 || b >= 11) && Math.abs(a - b) >= 2) { this.over = true; this.overT = 0; this.score = this.two ? 0 : this.finalScore(); if (!this.two) talk(a > b ? FALA.ppPonto : FALA.ppLevou, 1); return; }
    const deuce = a >= 10 && b >= 10;
    if (deuce || this.nServ >= 2) { this.server = 1 - this.server; this.nServ = 0; }
    this.resetServe();
  },
  // ---------- previsão: onde a bola vai estar depois de quicar do lado de i (para o Amiguinho e para os testes)
  predict(i) {
    const b = this.b, c = { x: b.x, y: b.y, vx: b.vx, vy: b.vy, s: b.s }, out = [], dt = 1 / 120;
    let side = b.side, nb = b.nb, serve = b.serve, ok = b.side === i && b.nb === 1 && b.last !== i;
    if (b.last === i || b.held || b.toss) return null;
    for (let t = dt; t < 2.4; t += dt) {
      const ev = this.move(c, dt);
      if (ev) {
        if (ev.k === 'net' || ev.k === 'floor') break;
        if (serve === 1) { if (ev.side === b.last) { serve = 2; this.bounceT(c); continue; } break; }
        if (ev.side !== i) break;
        if (ok) break;
        ok = true; serve = 0; this.bounceT(c); continue;
      }
      if (ok && (out.length === 0 || t / PP.ts - out[out.length - 1].t > .015)) out.push({ t: t / PP.ts, x: c.x, y: c.y, vy: c.vy });
    }
    return ok || out.length ? out : null;
  },
  planContact(i, acc) {
    const p = this.P[i], pts = this.predict(i); if (!pts || !pts.length) return null;
    const lo = p.i ? PP.nx + 10 : 10, hi = p.i ? W - 10 : PP.nx - 10;
    let best = null, near = null;
    for (const q of pts) {
      const h = this.gy - q.y; if (h < PP.hMin + 3 || h > PP.hMax - 3) continue;
      const stand = clamp(q.x - p.f * PP.sweet, lo, hi), tNeed = Math.abs(stand - p.x) / (PP.spd * .92) + .04;
      const high = h > 66 && acc > .6;
      const sc = -Math.abs(h - (high ? 64 : 52)) * 1.1 - q.t * 22 + (high ? 6 : 0);
      if (tNeed <= q.t - .06) { if (!best || sc > best.sc) best = { ...q, h, stand, sc, far: false }; }
      else if (!near || tNeed - q.t < near.gap) near = { ...q, h, stand, gap: tNeed - q.t, far: true };
    }
    return best || near;
  },
  // ---------- o Amiguinho (e o jogador automático dos testes): anda até a bola, prepara cedo e escolhe a jogada
  brain(i, dt, acc) {
    const p = this.P[i], b = this.b, A = p.ai, out = { dir: 0, aim: 0, shot: null }, home = PP.home[i];
    const goto = (x, slow) => { const dx = x - p.x; out.dir = Math.abs(dx) < 2.5 ? 0 : clamp(dx / (slow ? 26 : 9), -1, 1); };
    if (this.state === 'serve') {
      if (this.server === i) {
        if (A.sv !== this.ballId) { A.sv = this.ballId; A.svT = rand(.7, 1.4); const r = Math.random(); A.svK = r < .45 ? 'rebater' : r < .75 ? 'efeito' : r < .9 ? 'toque' : 'cortada'; A.svA = Math.random() < .5 ? 0 : Math.random() < .5 ? 1 : -1; }
        A.svT -= dt; goto(i ? PP.tx1 + 20 : PP.tx0 - 20, true); if (A.svT <= 0) { out.shot = A.svK; out.aim = A.svA; out.dir = 0; }
      } else goto(home, true);
      return out;
    }
    if (this.state !== 'rally' || b.toss) return out;
    if (b.last === i || b.last < 0) { p.plan = null; goto(home, true); return out; }
    const ev = `${this.ballId}:${this.hits}`;
    if (A.ev !== ev) {
      A.ev = ev; A.react = .1 + (1 - acc) * .35 * Math.random(); A.posErr = ppGauss() * (1 - acc) * 14 + (Math.random() < (1 - acc) * .4 ? (Math.random() < .5 ? -1 : 1) * rand(10, 22) : 0);
      A.lead = Math.random() < acc ? rand(.22, .42) : rand(.0, .1); A.kind = null; A.n = 0; p.plan = null;
    }
    if (A.react > 0) { A.react -= dt; out.dir = clamp(p.vx / PP.spd, -1, 1) * .5; return out; }
    if (!p.plan || ++A.n % 5 === 0) { const pl = this.planContact(i, acc); if (pl) { p.plan = pl; p.plan.t0 = this.t; } else if (!p.plan) { goto(home, true); return out; } }
    const pl = p.plan, left = pl.t - (this.t - pl.t0);
    goto(pl.stand + A.posErr);
    if (!p.arm && !p.sw && left <= A.lead + .02) {
      if (!A.kind) this.pickShot(i, pl, acc);
      out.shot = A.kind; out.aim = A.aim;
    }
    out.aim = A.aim || 0;
    return out;
  },
  pickShot(i, pl, acc) {
    const p = this.P[i], A = p.ai, o = this.P[1 - i], oBack = i ? PP.tx0 - o.x : o.x - PP.tx1, myBack = i ? p.x - PP.tx1 : PP.tx0 - p.x;
    const hAbove = this.ty - pl.y, r = Math.random();
    A.aim = 0;
    if (hAbove > 18 && r < .4 + .5 * acc) { A.kind = 'cortada'; A.aim = oBack < 10 ? 1 : 0; }
    else if (myBack > 50) { A.kind = 'rebater'; A.aim = 1; }
    else if (oBack > 34 && myBack < 26 && r < .45) { A.kind = 'toque'; }
    else if (this.b.s < -.35 && hAbove < 10 && r < .65) { A.kind = 'efeito'; A.aim = Math.random() < .5 ? 0 : -1; }
    else if (oBack > 38 && r < .7) { A.kind = 'rebater'; A.aim = -1; }
    else { A.kind = 'rebater'; const q = Math.random(); A.aim = oBack < 20 ? (q < .6 ? 1 : q < .8 ? 0 : -1) : (q < .35 ? 1 : q < .7 ? 0 : -1); }
  },
  drawScene(tt) {
    const gy = this.gy, hz = 100;
    const sky = ctx.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, '#141743'); sky.addColorStop(1, '#3a3577'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz);
    for (let i = 0; i < 40; i++) { const x = (i * 97) % W, y = (i * 53) % (hz - 30), a = .4 + .4 * Math.sin(tt * 2 + i); R(x, y, 1, 1, `rgba(255,255,255,${a})`); }
    ctx.fillStyle = '#fff6d6'; ctx.beginPath(); ctx.arc(330, 26, 9, 0, TAU); ctx.fill(); ctx.fillStyle = '#141743'; ctx.beginPath(); ctx.arc(334, 23, 8, 0, TAU); ctx.fill();
    const sea = ctx.createLinearGradient(0, hz, 0, hz + 26); sea.addColorStop(0, '#26407e'); sea.addColorStop(1, '#1d2f5c'); ctx.fillStyle = sea; ctx.fillRect(0, hz, W, 26);
    for (let i = 0; i < 10; i++) R(((i * 71 + tt * 6) % (W + 40)) - 20, hz + 5 + (i % 3) * 6, 12, 1, 'rgba(255,240,200,.35)');
    const sand = ctx.createLinearGradient(0, hz + 26, 0, H); sand.addColorStop(0, '#7d6a63'); sand.addColorStop(1, '#5b4b4c'); ctx.fillStyle = sand; ctx.fillRect(0, hz + 26, W, H - hz - 26);
    // coqueiros em silhueta
    for (const [x, h, s] of [[30, 92, 1], [372, 100, -1], [350, 70, -1]]) {
      ctx.strokeStyle = '#2a2140'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, gy - 6); ctx.quadraticCurveTo(x + s * 10, gy - h * .6, x + s * 4, gy - h); ctx.stroke();
      ctx.fillStyle = '#2a2140'; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; ctx.beginPath(); ctx.ellipse(x + s * 4 + Math.cos(a) * 11, gy - h + Math.sin(a) * 5 + 3, 13, 3, a, 0, TAU); ctx.fill(); }
    }
    // quiosque de palha atrás da mesa
    R(150, 84, 100, 3, '#3b2a2a'); ctx.fillStyle = '#b98a4a'; ctx.beginPath(); ctx.moveTo(140, 86); ctx.lineTo(200, 64); ctx.lineTo(260, 86); ctx.fill();
    ctx.strokeStyle = NAVY; ctx.lineWidth = 1; ctx.stroke(); for (let x = 146; x < 256; x += 6) R(x, 85, 1, 4, '#8a6230');
    R(158, 87, 3, 40, '#5a3d2a'); R(240, 87, 3, 40, '#5a3d2a'); R(166, 112, 70, 14, '#7a5636'); R(166, 112, 70, 2, '#a07448');
    // varal de lampadinhas
    ctx.strokeStyle = 'rgba(30,25,40,.8)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(0, 70); ctx.quadraticCurveTo(100, 92, 200, 70); ctx.quadraticCurveTo(300, 92, W, 70); ctx.stroke();
    for (let i = 0; i <= 20; i++) {
      const x = i * W / 20, u = (x % 200) / 200, y = 70 + 4 * 22 * u * (1 - u) * 1.1 + 2, on = .65 + .35 * Math.sin(tt * 3 + i * 1.7);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,200,90,${.25 * on})`; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); ctx.restore();
      R(x - 1, y - 1, 2, 3, ['#ffd66b', '#ff9a6b', '#9df0ff', '#ffb3e6'][i % 4]);
    }
    // luz quente sobre a mesa
    const lg = ctx.createRadialGradient(200, this.ty, 10, 200, this.ty, 150); lg.addColorStop(0, 'rgba(255,210,140,.22)'); lg.addColorStop(1, 'rgba(255,210,140,0)'); ctx.fillStyle = lg; ctx.fillRect(40, 40, 320, H - 40);
  },
  drawTable() {
    const ty = this.ty, x0 = PP.tx0, x1 = PP.tx1, gy = this.gy;
    for (const x of [x0 + 10, x1 - 12]) { R(x, ty + 4, 3, gy - ty - 4, '#2b2f5e'); R(x - 3, gy - 2, 9, 2, '#2b2f5e'); }
    R(x0, ty, x1 - x0, 5, '#1f6b5a'); R(x0, ty, x1 - x0, 1, '#ffffff'); R(x0, ty + 4, x1 - x0, 1, NAVY);
    ctx.strokeStyle = NAVY; ctx.lineWidth = 1; ctx.strokeRect(x0, ty, x1 - x0, 5);
    R(PP.nx - 2, ty - PP.netH, 4, PP.netH, 'rgba(235,240,250,.55)'); R(PP.nx - 2.5, ty - PP.netH - 1.5, 5, 2, '#ffffff');
    for (let y = ty - PP.netH + 1.5; y < ty; y += 1.6) R(PP.nx - 2, y, 4, .5, 'rgba(30,30,60,.55)');
    R(PP.nx - .5, ty - PP.netH - 1.5, 1, PP.netH + 1.5, 'rgba(30,30,60,.6)');
  },
  // raquete desenhada pelo jogo: atrás quando preparada (no alto para a cortada), arco no golpe, na frente esperando
  racketPos(p) {
    const gy = this.gy, f = p.f;
    if (p.sw) {
      const q = clamp(p.sw.t / .22, 0, 1), k = p.sw.kind;
      const pts = k === 'cortada' ? [[-8, 66], [18, 52], [16, 30]] : k === 'efeito' || k === 'toque' ? [[-4, 50], [16, 40], [18, 32]] : [[-10, 26], [16, 46], [10, 64]];
      const [a, m, c] = pts, u = 1 - q, x = u * u * a[0] + 2 * u * q * m[0] + q * q * c[0], y = u * u * a[1] + 2 * u * q * m[1] + q * q * c[1];
      return { x: p.x + f * x, y: gy - y, rot: k === 'cortada' ? 1.2 + q * 1.4 : k === 'rebater' ? .3 + q * 1.4 : .9 + q * .8 };
    }
    if (p.arm) { const k = p.arm.kind, ch = clamp(p.arm.t / .2, 0, 1); const [x, y] = k === 'cortada' ? [-8, 62] : k === 'rebater' ? [-10, 28] : [-4, 48]; return { x: p.x + f * (x * ch + 8 * (1 - ch)), y: gy - (y * ch + 32 * (1 - ch)), rot: k === 'cortada' ? .8 : .1 }; }
    return { x: p.x + f * 10, y: gy - 30 + Math.sin(this.t * 5 + p.i) * .6, rot: 1.1 };
  },
  drawRacket(p) {
    const R0 = this.racketPos(p);
    ctx.save(); ctx.translate(R0.x, R0.y); ctx.rotate(p.f * (R0.rot - .2)); if (p.f < 0) ctx.scale(-1, 1);
    ctx.fillStyle = '#7b4a2a'; ctx.fillRect(-1, 2, 2, 5);
    ctx.fillStyle = p.i ? '#2e5bd6' : '#d8333a'; ctx.strokeStyle = NAVY; ctx.lineWidth = .9; ctx.beginPath(); ctx.ellipse(0, -1.5, 4, 4.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
    if (p.arm && p.arm.t > .2 && !p.arm.serve) { ctx.globalAlpha = .45 + .3 * Math.sin(this.t * 18); ctx.strokeStyle = '#fff6d6'; ctx.beginPath(); ctx.ellipse(0, -1.5, 6, 6.6, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.restore();
  },
  drawChar(p, tt) {
    const fr = window.__fr && window.__fr[p.i ? 'bl' : 'ia'];
    ctx.fillStyle = 'rgba(20,10,20,.3)'; ctx.beginPath(); ctx.ellipse(p.x, this.gy + 1, 15, 3, 0, 0, TAU); ctx.fill();
    if (!fr) { R(p.x - 8, this.gy - 40, 16, 40, p.i ? '#e86fa8' : '#f4efe6'); this.drawRacket(p); return; }
    let an = 'ready', k = Math.floor(tt * 8) % 8, ex = p.ex;
    const moving = p.mvT > 0, fwd = p.vx * p.f > 0, cyc = ((p.ph / TAU) % 1 + 1) % 1;
    if (this.state === 'point' && this.st > .3 && !this.noPoint) { an = this.lastW === p.i ? 'party' : 'sad'; k = Math.min(15, Math.floor((this.st - .3) * 14)); }
    else if (this.over) { const won = this.sc[p.i] > this.sc[1 - p.i]; an = won ? 'party' : 'sad'; k = Math.min(15, Math.floor(this.overT * 12)); }
    else if (p.sw) { an = 'gnd'; k = Math.min(15, 6 + Math.floor(p.sw.t / PP.sw * 10)); ex = 5; }
    else if (p.arm) { ex = 5; if (moving) { an = 'gndw'; k = (fwd ? 0 : 8) + Math.floor(cyc * 8) % 8; } else { an = 'gnd'; k = Math.min(4, 2 + Math.floor(p.arm.t * 12)); } }
    else if (moving) { if (fwd) { an = 'run'; k = Math.floor(cyc * 16) % 16; } else { an = 'back'; k = Math.floor(cyc * 8) % 8; } }
    ctx.save(); ctx.translate(p.x, this.gy); try { fr(an, k, 'g', ex, p.f < 0); } catch { /* carregando */ } ctx.restore();
    this.drawRacket(p);
  },
  draw(tt) {
    this.drawScene(tt);
    const b = this.b;
    if (b) { const onT = b.x > PP.tx0 && b.x < PP.tx1 && b.y < this.ty, sy = onT ? this.ty : this.gy; ctx.fillStyle = 'rgba(10,10,30,.35)'; ctx.beginPath(); ctx.ellipse(b.x, sy, 2.6, .9, 0, 0, TAU); ctx.fill(); }
    this.drawTable();
    for (const p of this.P) this.drawChar(p, tt);
    for (const f of this.fx) {
      const k = f.t / .7; ctx.globalAlpha = 1 - k;
      if (f.k === 'quique') R(f.x - 3 - k * 4, f.y - 1, 6 + k * 8, 1, '#ffffff');
      else { ctx.strokeStyle = f.k === 'corte' ? '#ffd04a' : f.k === 'perfeita' ? '#9df0ff' : '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(f.x, f.y, 3 + k * 9, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    if (b && !(b.held && this.state === 'serve' && false)) {
      // rastro: laranja com topspin, azul com efeito por baixo
      const sp = Math.hypot(b.vx, b.vy), col = b.s > .15 ? '255,170,80' : b.s < -.15 ? '120,200,255' : '255,245,220';
      if (b.tr.length > 1 && sp > 120 && !b.held) for (let j = 1; j < b.tr.length; j++) { const a = j / b.tr.length; ctx.strokeStyle = `rgba(${col},${a * .5})`; ctx.lineWidth = 1.6 * a; ctx.beginPath(); ctx.moveTo(b.tr[j - 1][0], b.tr[j - 1][1]); ctx.lineTo(b.tr[j][0], b.tr[j][1]); ctx.stroke(); }
      ctx.fillStyle = '#fff4e0'; ctx.strokeStyle = NAVY; ctx.lineWidth = .7; ctx.beginPath(); ctx.arc(b.x, b.y, PP.r + .3, 0, TAU); ctx.fill(); ctx.stroke();
    }
    const s = `${this.sc[0]}  ×  ${this.sc[1]}`; R(W / 2 - 26, 6, 52, 14, 'rgba(60,40,30,.85)'); ctx.strokeStyle = NAVY; ctx.strokeRect(W / 2 - 26, 6, 52, 14);
    ctx.fillStyle = this.flash > 0 ? (this.flashW ? '#ffb3c8' : '#bfefff') : '#fff6d6'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(s, W / 2, 17); ctx.textAlign = 'left';
  },
};
