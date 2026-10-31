/* ============================================================ prova nova: Pingue-pongue no quiosque (30/10/2026)
   Vista de lado, IAmiguinho contra Amiguinho, até 11 (com 2 de vantagem). Como no Wii, o personagem anda sozinho até a bola:
   quem joga decide QUANDO bater e QUE bola mandar.
   ✕ rebate: no tempo certo sai rápida e baixa; cedo sai alta e longa (pode sair da mesa); tarde sai baixa (pode bater na rede).
   ○ (ou ↑ + ✕) cortada: fortíssima, mas só com a bola alta; com a bola baixa vai na rede.
   □ (ou ↓ + ✕) bola com efeito: curtinha, quica baixo e morre perto da rede.
   Segurar ▶ (para a frente) manda a bola funda; segurar ◀ manda curta.
   Regras: a bola tem que quicar uma vez do outro lado; quem não devolve, ou manda fora, perde o ponto. O saque troca a cada 2 pontos.
   Arte provisória: personagens pintados do vôlei e raquete desenhada pelo jogo; o quiosque é desenhado pelo jogo. */
const PP = { g: 560, tx0: 112, tx1: 288, nx: 200, netH: 9, r: 2.3, fwd: 14, sw: .26, hitT: .12, win: .1, perf: .03, mv: 170 };
if (typeof Music !== 'undefined' && Music.songs.volei) Music.songs.pingue = Music.songs.volei;
FALA.intro.pingue = [
  'Pingue-pongue no quiosque: quem perder paga a água de coco. Eu já tô devendo três.',
  'Eu ando sozinho até a bola. Você só precisa bater na hora certa. Parece fácil, né? kkkk',
  'Bola alta? Cortada. Amiguinho lá atrás? Bola curtinha com efeito. É xadrez com raquete.',
];
FALA.ppPonto = ['Ponto! O quiosque inteiro aplaudiu. Tá, foram dois coqueiros.', 'Essa nem o Amiguinho viu passar.'];
FALA.ppLevou = ['Bateu na rede. A rede tá do lado dele, só pode.', 'Saiu longa. A mesa encolheu, eu juro.', 'Essa veio com efeito de novela.'];
const pingue = {
  id: 'pingue', name: 'Pingue-pongue', tag: 'Quiosque do Coqueiral · até 11', wide: true, hi: true, paint: true, two2: true, two: false, dur: 0,
  med: [800, 1500, 2000], medText: ['fazer 8 pontos', 'vencer', 'vencer por 5 ou mais'], medShort: ['Fazer 8 pontos', 'Vencer', 'Vencer por 5+'],
  menu2: [['Modo', '2 jogadores'], ['Placar', 'até 11'], ['Saque', 'troca a cada 2'], ['Pódio', 'não conta']], ia: 1700, nota: 'a bolinha caiu no copo de açaí',
  desc: 'Bata na hora certa e escolha a bola: rápida, cortada ou com efeito.',
  steps: () => [`Você anda sozinho até a bola: ${actName()} rebate quando ela chegar. Na hora certa, sai rápida e baixa.`, `${touch ? 'Cortada' : 'X (ou ↑ + Espaço)'} corta a bola alta. ${touch ? 'Efeito' : 'C (ou ↓ + Espaço)'} manda uma curtinha com efeito.`, 'Segure ▶ para mandar funda e ◀ para mandar curta. Até 11, com 2 de vantagem.'],
  hint: () => '',
  gp: 'Controle: ✕ rebate · ○ cortada · □ efeito · ◀ ▶ curta e funda · Start pausa',
  ctl: [['Espaço', 'rebater (e sacar)', 'kb'], ['X', 'cortada', 'kb'], ['C', 'bola com efeito', 'kb'], ['◀ ▶', 'curta / funda'], ['Rebater', 'rebater (e sacar)', 'touch'], ['Cortada', 'cortada', 'touch'], ['Efeito', 'bola com efeito', 'touch'], ['Esc', 'pausa', 'kb']],
  pad: { dirs: 'lr', a: 'Rebater', b: 'Cortada', c: 'Efeito' }, bannerY: 60,
  init() {
    const gy = H - 22;
    Object.assign(this, {
      t: 0, score: 0, sc: [0, 0], gy, ty: gy - 35, P: [this.newP(0), this.newP(1)], b: null, state: 'serve', st: 0, server: 0, nServ: 0,
      fx: [], longest: 0, hits: 0, cortadas: 0, efeitos: 0, perfeitas: 0, flash: 0, flashW: 0, k2: {}, mood: 0, over: false, overT: 0, lastWhy: '',
    });
    this.resetServe();
  },
  newP(i) { return { i, f: i ? -1 : 1, x: i ? 336 : 64, vx: 0, sw: null, ph: 0, ex: 0, exT: 0, tx: i ? 336 : 64, cy: 0, pl: null, ai: {} }; },
  demo() { this.state = 'rally'; this.b = { x: 170, y: this.ty - 26, vx: 210, vy: -60, spin: 0, last: 0, side: -1, nb: 0 }; this.P[0].sw = { t: .13, hit: true, kind: 'normal' }; },
  hud() {
    const n = this.two ? ['Jogador 1', 'Jogador 2'] : ['Você', 'Amiguinho'];
    return [[n[0], String(this.sc[0])], [n[1], String(this.sc[1])], ['Saque', this.server ? n[1] : n[0], this.state === 'serve'], ['Maior troca', String(this.longest)]];
  },
  stats() { return [`Placar ${this.sc[0]} a ${this.sc[1]}`, `${this.perfeitas} batidas na hora certa · ${this.cortadas} cortadas · ${this.efeitos} com efeito`, `Maior troca: ${this.longest} batidas`]; },
  finalScore() { const [a, b] = this.sc; return a > b ? 1500 + 100 * Math.min(10, a - b) : 100 * Math.min(a, 12); },
  acc() { const m = this.mood || 0; return clamp(.78 + (m > 0 ? .1 * m : .12 * m), .55, .92); },
  resetServe() {
    this.state = 'serve'; this.st = 0; this.hits = 0;
    for (const p of this.P) { p.sw = null; p.vx = 0; p.x = p.tx = p.i ? 336 : 64; }
    const s = this.P[this.server]; this.b = { x: s.x + s.f * PP.fwd, y: this.ty - 22, vx: 0, vy: 0, spin: 0, last: -1, side: -1, nb: 0, held: true };
  },
  // raquete (só desenho): passa pelo ponto de contato no meio do giro; normal sobe, cortada e efeito descem
  racket(p, q, kind) {
    const u = q - PP.hitT / PP.sw, cy = p.cy || this.ty - 8, cx = p.x + p.f * PP.fwd;
    const dy = kind === 'normal' ? -u * 34 : u * 36;
    return { x: cx + p.f * u * 52, y: cy + dy + u * u * 30, ph: kind === 'normal' ? .9 + u * 2.2 : 1.9 + u * 2 };
  },
  input(I) {
    if (!this.two) {
      const aim = (I.r ? 1 : 0) - (I.l ? 1 : 0) || (Math.abs(I.ax || 0) > .5 ? Math.sign(I.ax) : 0);
      const kind = I.pb || (I.pa && I.u) ? 'cortada' : I.pc || (I.pa && I.d) ? 'efeito' : I.pa ? 'normal' : null;
      return [{ kind, aim }, null];
    }
    const k = (c) => !!codeHeld[c], e = (c) => { const v = k(c), was = this.k2[c]; this.k2[c] = v; return v && !was; };
    const f = e('KeyF'), r = e('KeyR'), v = e('KeyV'), en = e('Enter') || e('NumpadEnter');
    const k0 = r || (f && k('KeyW')) ? 'cortada' : v || (f && k('KeyS')) ? 'efeito' : f ? 'normal' : null;
    const k1 = en && k('ArrowUp') ? 'cortada' : en && k('ArrowDown') ? 'efeito' : en ? 'normal' : null;
    return [{ kind: k0, aim: (k('KeyD') ? 1 : 0) - (k('KeyA') ? 1 : 0) }, { kind: k1, aim: -((k('ArrowLeft') ? 1 : 0) - (k('ArrowRight') ? 1 : 0)) }];
  },
  update(dt, I) {
    this.t += dt; this.flash = Math.max(0, this.flash - dt);
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < .6);
    if (this.over) { this.overT += dt; return this.overT > 1.6; }
    const [c0, c1x] = this.input(I), c1 = c1x || this.brain(dt), C = [c0, c1];
    for (const p of this.P) { p.exT = Math.max(0, p.exT - dt); if (!p.exT) p.ex = 0; }
    if (this.state === 'point') { this.st += dt; this.moveAll(dt, true); if (this.st > 1.3) this.nextPoint(); return false; }
    const b = this.b;
    if (this.state === 'serve') {
      this.st += dt; const s = this.P[this.server]; b.x = s.x + s.f * 18; b.y = this.ty - 22 + Math.sin(this.t * 4) * 1.5;
      const want = C[this.server].kind || (this.st > 6 ? 'normal' : null);
      if (want && this.st > .35) { this.state = 'rally'; b.held = false; b.vy = -170; b.vx = 0; b.toss = true; s.sw = null; this.serveKind = want === 'cortada' ? 'normal' : want; this.serveAim = C[this.server].aim; }
      this.moveAll(dt, true); return false;
    }
    // quem rebate: na hora do arco em que a raquete encontra a bola
    C.forEach((c, i) => {
      const p = this.P[i];
      if (b.toss && i === this.server && !p.sw && b.vy > 0 && b.y > this.ty - 10) { p.cy = b.y; p.sw = { t: PP.hitT, hit: false, kind: this.serveKind, aim: this.serveAim, auto: true }; }
      if (c.kind && !p.sw && !(b.toss && i === this.server)) p.sw = { t: 0, hit: false, kind: c.kind, aim: c.aim };
      if (p.sw) { p.sw.t += dt; if (p.sw.t > PP.sw) p.sw = null; }
    });
    this.moveAll(dt, false);
    // bola: gravidade, mesa, rede e chão
    const px = b.x, py = b.y;
    b.vy += PP.g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    for (let i = 0; i < 2; i++) if (this.tryHit(i)) return false;
    const onTable = b.x > PP.tx0 && b.x < PP.tx1;
    if (onTable && b.vy > 0 && b.y >= this.ty - PP.r && py < this.ty - PP.r + 1) this.bounce();
    if (this.state !== 'rally') return false;
    if (Math.abs(b.x - PP.nx) < 2 + PP.r && b.y > this.ty - PP.netH - PP.r && b.y < this.ty && Math.sign(px - PP.nx) !== Math.sign(b.x - PP.nx)) {
      b.x = PP.nx - Math.sign(b.vx) * (2 + PP.r); b.vx *= -.15; b.vy = Math.max(0, b.vy) * .3; this.fx.push({ x: b.x, y: b.y, t: 0, k: 'rede' }); beep(140, .06, 'triangle', .04, -30);
      if (b.last >= 0) { this.lastWhy = 'na rede'; }
    }
    if (b.y >= this.gy - PP.r || b.x < -8 || b.x > W + 8) this.floor();
    return false;
  },
  // anda sozinho até onde a bola vai estar boa de bater (depois de quicar do seu lado)
  moveAll(dt, idle) {
    for (const p of this.P) {
      let tx = p.i ? 336 : 64;
      if (!idle && this.b && !this.b.held) {
        const pl = p.pl = this.plan(p);
        if (pl) { tx = pl.stand; p.cy = pl.y; } else if (this.b.last === p.i) tx = p.i ? 330 : 70;
      } else { p.pl = null; if (this.state === 'serve' && this.server === p.i) tx = p.x; }
      p.tx = tx;
      const spd = PP.mv * (p.i && !this.two ? .92 + .2 * this.acc() : 1), dx = p.tx - p.x;
      const target = Math.abs(dx) < 2 ? 0 : clamp(dx / 12, -1, 1) * spd, dv = target - p.vx;
      p.vx += Math.sign(dv) * Math.min(Math.abs(dv), (Math.abs(target) > Math.abs(p.vx) ? 1300 : 1800) * dt); p.x += p.vx * dt;
      p.x = p.i ? clamp(p.x, PP.nx + 24, W - 14) : clamp(p.x, 14, PP.nx - 24);
      p.ph += Math.abs(p.vx) * dt * .11;
    }
  },
  // onde ficar para bater: no ponto mais alto do quique do seu lado (a bola para de subir). Se esse ponto passa de 22 acima da mesa,
  // é bola alta: cabe cortada.
  plan(p) {
    const b = this.b; if (b.last === p.i || b.held || b.toss || b.last < 0) return null;
    const c = { ...b }; let bounced = b.side === p.i && b.nb === 1, pk = null;
    for (let t = 0; t < 1.8; t += DT) {
      const vy0 = c.vy; c.vy += PP.g * DT; c.x += c.vx * DT; c.y += c.vy * DT;
      if (!bounced) {
        if (c.x > PP.tx0 && c.x < PP.tx1 && c.vy > 0 && c.y >= this.ty - PP.r) { if ((c.x < PP.nx ? 0 : 1) !== p.i) return null; bounced = true; this.bounceV(c); }
        if (c.y > this.gy) return null;
        continue;
      }
      if (vy0 <= 0 && c.vy > 0) { pk = { t, x: c.x, y: c.y }; break; }
    }
    if (!pk) return null;
    pk.stand = pk.x - p.f * PP.fwd;
    pk.stand = p.i ? clamp(pk.stand, PP.nx + 22, W - 14) : clamp(pk.stand, 14, PP.nx - 22); return pk;
  },
  peakOf(c) { return c.y - c.vy * c.vy / (2 * PP.g) * (c.vy < 0 ? 1 : 0); },
  bounceV(c) { const k = c.spin < 0 ? .4 : c.spin > 0 ? .62 : .56; c.vy = -c.vy * k; c.vx *= c.spin < 0 ? .5 : c.spin > 0 ? .95 : .85; c.y = this.ty - PP.r; },
  bounce() {
    const b = this.b, side = b.x < PP.nx ? 0 : 1;
    this.fx.push({ x: b.x, y: this.ty, t: 0, k: 'quique' }); beep(side ? 700 : 760, .03, 'square', .03, 0);
    if (b.last < 0) { this.bounceV(b); return; }
    if (side === b.last) return this.point(1 - b.last, this.lastWhy === 'na rede' ? 'na rede' : 'quicou do próprio lado');
    if (b.side === side) return this.point(b.last, 'quicou duas vezes');
    b.side = side; b.nb = 1; this.bounceV(b);
  },
  floor() {
    const b = this.b;
    if (b.last < 0) return this.point(1 - this.server, 'saque perdido');
    if (b.side === 1 - b.last && b.nb === 1) return this.point(b.last, 'não devolveu');
    this.point(1 - b.last, this.lastWhy === 'na rede' ? 'na rede' : 'fora da mesa');
  },
  tryHit(i) {
    const p = this.P[i], b = this.b;
    if (!p.sw || p.sw.hit || b.held) return false;
    const serving = b.toss && i === this.server;
    if (!serving && (b.last === i || b.last < 0 || b.side !== i || b.nb !== 1)) return false;
    const dtq = p.sw.t - PP.hitT; if (Math.abs(dtq) > PP.win) return false;   // >0: apertou cedo; <0: apertou tarde
    const hx = p.x + p.f * PP.fwd;
    const d = (b.x - hx) * p.f;   // >0: a bola ainda não chegou no ponto de contato
    if (!serving && (d > 2 || d < -12 || Math.abs(b.y - (p.cy || this.ty - 8)) > 16)) return false;
    p.sw.hit = true; b.toss = false; this.hits++; this.longest = Math.max(this.longest, this.hits);
    let kind = p.sw.kind; const perfect = Math.abs(dtq) < PP.perf;
    // cortada só sai com a bola alta; baixa, ela vai na rede
    const high = b.y < this.ty - 21;
    const o = i ? -1 : 1, aim = p.sw.aim || 0;
    let depth = kind === 'efeito' ? .22 : aim > 0 ? .86 : aim < 0 ? .34 : .66;
    depth += dtq * 2.6;                        // cedo: mais longa; tarde: mais curta
    const half = PP.tx1 - PP.nx, tx = PP.nx + o * clamp(depth, -.2, 1.35) * half;
    const sp = kind === 'cortada' ? (high ? 420 : 300) : kind === 'efeito' ? 165 : perfect ? 285 : 225;
    const dx = tx - b.x, T = Math.max(.22, Math.abs(dx) / sp);
    b.vx = dx / T; b.vy = (this.ty - PP.r - b.y - .5 * PP.g * T * T) / T;
    b.vy += -dtq * 520 + (kind === 'cortada' && !high ? 150 : 0);  // cedo: sai mais alta; tarde: mais baixa (rede); cortada de bola baixa: rede
    // folga mínima sobre a rede quando a batida foi boa (o jogo não pune a batida certa)
    if (perfect || (kind !== 'cortada' && Math.abs(dtq) < .05)) {
      const tn = (PP.nx - b.x) / b.vx, yn = b.y + b.vy * tn + .5 * PP.g * tn * tn;
      if (tn > 0 && yn > this.ty - PP.netH - 6) b.vy -= (yn - (this.ty - PP.netH - 6)) / tn;
    }
    b.spin = kind === 'efeito' ? -1 : kind === 'cortada' ? 1 : 0; b.last = i; b.side = -1; b.nb = 0; this.lastWhy = '';
    if (perfect) this.perfeitas += i === 0 || this.two ? 1 : 0;
    if (kind === 'cortada') { this.cortadas += i === 0 || this.two ? 1 : 0; shake = .1; } if (kind === 'efeito') this.efeitos += i === 0 || this.two ? 1 : 0;
    p.ex = perfect || kind === 'cortada' ? 2 : 0; p.exT = .5;
    this.fx.push({ x: b.x, y: b.y, t: 0, k: kind === 'cortada' ? 'corte' : perfect ? 'perfeita' : 'bate' });
    if ((i === 0 || this.two) && perfect && kind === 'normal') pop('Na hora!', b.x, b.y - 16, '#bfefff');
    beep(kind === 'cortada' ? 220 : 520 + (perfect ? 140 : 0), .05, 'square', .045, kind === 'cortada' ? -60 : 80);
    return false;
  },
  point(w, why) {
    if (this.state !== 'rally') return;
    this.sc[w]++; this.state = 'point'; this.st = 0; this.flash = 1; this.flashW = w; this.nServ++;
    if (!this.two) {
      if (w === 0) { sfx.point(); talk(FALA.ppPonto, .25); } else { sfx.whiff(); talk(FALA.ppLevou, .25); }
      // dificuldade que se adapta: se você está na frente, ele se concentra; se ele está na frente, relaxa um pouco
      const d = this.sc[1] - this.sc[0]; this.mood = clamp(d <= -2 ? this.mood + .4 : d >= 2 ? this.mood - .3 : this.mood * .6, -1, 1);
    } else sfx.point();
    pop(why === 'não devolveu' ? 'Ponto!' : why[0].toUpperCase() + why.slice(1), W / 2, 44, w === 0 ? '#bfefff' : '#ffb3c8', true);
    this.P[w].ex = 2; this.P[w].exT = 1; this.P[1 - w].ex = 4; this.P[1 - w].exT = 1;
  },
  nextPoint() {
    const [a, b] = this.sc;
    if ((a >= 11 || b >= 11) && Math.abs(a - b) >= 2) { this.over = true; this.overT = 0; this.score = this.two ? 0 : this.finalScore(); if (!this.two) talk(a > b ? FALA.ppPonto : FALA.ppLevou, 1); return; }
    const deuce = a >= 10 && b >= 10;
    if (deuce || this.nServ >= 2) { this.server = 1 - this.server; this.nServ = 0; }
    this.resetServe();
  },
  // o Amiguinho: decide QUANDO bater (com erro conforme a assertividade) e QUE bola mandar
  brain(dt) {
    const p = this.P[1], b = this.b, A = p.ai, out = { kind: null, aim: 0 }, acc = this.acc();
    if (this.state === 'serve') {
      if (this.server === 1) { if (A.sv !== this.sc.join()) { A.sv = this.sc.join(); A.svT = rand(.6, 1.2); A.svK = Math.random() < .3 * acc ? 'efeito' : 'normal'; A.svA = Math.random() < .5 ? 1 : -1; } A.svT -= dt; if (A.svT <= 0) { out.kind = A.svK; out.aim = A.svA; } }
      return out;
    }
    if (this.state !== 'rally' || b.last !== 0 || p.sw) return out;
    const ev = `${this.sc.join()}:${this.hits}`;
    if (A.ev !== ev) {
      A.ev = ev; const good = Math.random() < acc;
      A.err = good ? rand(-1, 1) * .02 : (Math.random() < .5 ? -1 : 1) * rand(.04, .13);
      const me = this.P[0], deep = me.x < 50;
      A.kind = 'normal'; A.aim = deep ? -1 : 1;
      if (Math.random() < .25 * acc && deep) A.kind = 'efeito';
      A.cut = Math.random() < acc * .85;
      // contra bola rápida (cortada) ou com efeito, quem é bom acerta mais; quem é fraco erra mais
      if (b.spin !== 0 && Math.random() > acc) A.err += (Math.random() < .5 ? -1 : 1) * .06;
    }
    // aperta quando falta o tempo do giro até o contato (com o erro sorteado para esta jogada)
    const pl = p.pl; if (!pl) return out;
    const k2 = pl.y < this.ty - 21 && A.cut ? 'cortada' : A.kind;
    if (pl.t <= PP.hitT + A.err) { out.kind = k2; out.aim = A.aim; }
    return out;
  },
  // ---------- desenho: quiosque à noite (provisório, desenhado pelo jogo) e os personagens pintados do vôlei
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
  drawRacket(p) {
    const kind = p.sw ? p.sw.kind : 'normal', q = p.sw ? p.sw.t / PP.sw : null, Rk = q === null ? { x: p.x + p.f * 12, y: this.gy - 20, ph: 1.2 } : this.racket(p, q, kind);
    ctx.save(); ctx.translate(Rk.x, Rk.y); ctx.rotate(p.f * (Rk.ph - .2));
    ctx.fillStyle = '#7b4a2a'; ctx.fillRect(-1, 2, 2, 5);
    ctx.fillStyle = p.i ? '#2e5bd6' : '#d8333a'; ctx.strokeStyle = NAVY; ctx.lineWidth = .9; ctx.beginPath(); ctx.ellipse(0, -1.5, 4, 4.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  },
  drawChar(p, tt) {
    const fr = window.__fr && window.__fr[p.i ? 'bl' : 'ia'];
    ctx.fillStyle = 'rgba(20,10,20,.3)'; ctx.beginPath(); ctx.ellipse(p.x, this.gy + 1, 15, 3, 0, 0, TAU); ctx.fill();
    if (!fr) { R(p.x - 8, this.gy - 40, 16, 40, p.i ? '#e86fa8' : '#f4efe6'); return; }
    let an = 'ready', k = Math.floor(tt * 8) % 8;
    if (p.sw) { an = 'gnd'; k = Math.min(15, Math.floor(3 + p.sw.t / PP.sw * 12)); }
    else if (Math.abs(p.vx) > 30) { an = 'run'; k = Math.floor(((p.ph / (2 * TAU)) % 1) * 16) % 16; }
    ctx.save(); ctx.translate(p.x, this.gy); try { fr(an, k, 'g', p.sw ? 5 : p.ex, p.f < 0); } catch { /* carregando */ } ctx.restore();
    this.drawRacket(p);
  },
  draw(tt) {
    this.drawScene(tt);
    const b = this.b;
    // sombra da bola na mesa ou no chão
    if (b) { const onT = b.x > PP.tx0 && b.x < PP.tx1, sy = onT ? this.ty : this.gy; ctx.fillStyle = 'rgba(10,10,30,.35)'; ctx.beginPath(); ctx.ellipse(b.x, sy, 2.6, .9, 0, 0, TAU); ctx.fill(); }
    this.drawTable();
    for (const p of this.P) this.drawChar(p, tt);
    for (const f of this.fx) {
      const k = f.t / .6; ctx.globalAlpha = 1 - k;
      if (f.k === 'quique') { R(f.x - 3 - k * 4, f.y - 1, 6 + k * 8, 1, '#ffffff'); }
      else { ctx.strokeStyle = f.k === 'corte' ? '#ffd04a' : f.k === 'perfeita' ? '#9df0ff' : '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(f.x, f.y, 3 + k * 9, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    if (b) {
      if (Math.hypot(b.vx, b.vy) > 330) { ctx.strokeStyle = 'rgba(255,240,180,.5)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * .03, b.y - b.vy * .03); ctx.stroke(); }
      ctx.fillStyle = '#fff4e0'; ctx.strokeStyle = NAVY; ctx.lineWidth = .7; ctx.beginPath(); ctx.arc(b.x, b.y, PP.r, 0, TAU); ctx.fill(); ctx.stroke();
    }
    // placar de madeira pequeno no alto (o HUD da página mostra o resto)
    const s = `${this.sc[0]}  ×  ${this.sc[1]}`; R(W / 2 - 26, 6, 52, 14, 'rgba(60,40,30,.85)'); ctx.strokeStyle = NAVY; ctx.strokeRect(W / 2 - 26, 6, 52, 14);
    ctx.fillStyle = this.flash > 0 ? (this.flashW ? '#ffb3c8' : '#bfefff') : '#fff6d6'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(s, W / 2, 17); ctx.textAlign = 'left';
  },
};
