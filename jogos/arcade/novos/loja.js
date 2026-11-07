/* ============================================================ jogo: Rumo à Loja */
// Madrugada de lançamento: o IAmiguinho atravessa a cidade, um quadradinho por vez, até a loja de games.
// O mundo é uma pilha infinita de faixas horizontais geradas conforme ele sobe:
//   calçada (segura; postes, bancos, lixeiras e fliperamas bloqueiam) · avenida (carros, motos de entrega, ônibus)
//   trilho (o sinal pisca antes do trem) · canal (caixas de jogo boiando levam você; cair na água acaba)
//   fila de Amiguinhos (andam devagar e bloqueiam, mas esperam você passar) · galeria (lojas erradas, só passa pelas portas)
// As novidades entram aos poucos (motos, fila, ônibus, trilho, canal) e o tráfego fica mais rápido e cheio com a distância.
// A câmera da live sobe sozinha cada vez mais rápido: ficou para trás da tela, acabou.
// Placar: quarteirões avançados (faixas) + 2 por ficha.
// Controles: PC setas/WASD (um passo), Espaço/Enter = frente · controle direcional/analógico, ✕/A = frente · celular toque = frente, deslizar = direção.
Music.define('loja', {
  bpm: 138,
  lead: bars('F#5 . A5 . C#6 - B5 A5 . . F#5 . E5 F#5 - .', 'D5 . F#5 . A5 - G#5 F#5 . . D5 . C#5 D5 - .', 'E5 . G#5 . B5 - A5 G#5 . . E5 . F#5 G#5 - .', 'C#6 - - . B5 . G#5 . F5 - - . G#5 - - .'),
  arp: bars(x4('F#4 A4 C#5 A4'), x4('D4 F#4 A4 F#4'), x4('E4 G#4 B4 G#4'), x4('C#4 F4 G#4 F4')),
  bass: bars('F#2 . F#3 . F#2 . F#3 . F#2 . F#3 . C#3 . F#3 .', 'D2 . D3 . D2 . D3 . D2 . D3 . A2 . D3 .', 'E2 . E3 . E2 . E3 . E2 . E3 . B2 . E3 .', 'C#2 . C#3 . C#2 . C#3 . G#2 . G#2 . C#3 . C#3 .'),
  drums: 'k h . h s h . h k h k h s h o .',
  mix: { arp: .6, lead: .85, drums: .85 },
});
const RL_TS = 32, RL_COLS = 10, RL_ROWS = H / RL_TS, RL_START = 2, RL_HOP = .09;
// carros: [lataria, lado escuro, teto claro]
const RL_CORES = [['#e8443a', '#a52d26', '#ff8a80'], ['#2e6fd8', '#1d4a99', '#7fb0ff'], ['#3fbf6a', '#2a8a4a', '#9ae8b4'], ['#ffd04a', '#c99a2a', '#fff0a8'], ['#b79cff', '#7a5fc0', '#e0d4ff'], ['#e9ecf2', '#9aa3b0', '#ffffff'], ['#ff8a3d', '#b35416', '#ffcda8']];
// caixas de jogo: [capa, lado, arte]
const RL_CAIXAS = [['#2e6fd8', '#1d4a99', '#0f2350'], ['#3fbf6a', '#2a8a4a', '#103a22'], ['#e8443a', '#a52d26', '#4a1310'], ['#b79cff', '#7a5fc0', '#2c2052'], ['#ffd04a', '#c99a2a', '#4a3608']];
// Amiguinhos: cores do corpo (O) e da sombra (o)
const RL_BOTS = [['#e86fa8', '#b24f80'], ['#3fbf6a', '#2a8a4a'], ['#ffd04a', '#c99a2a'], ['#7fdcff', '#3a9ac0'], ['#b79cff', '#7a5fc0'], ['#ff8a3d', '#b35416']].map(([O, o]) => ({ ...PAL, O, o }));
const RL_LUZ = ['#ffd27a', '#7fdcff', '#e86fa8', '#b79cff'];
const RL_FICHA = [
  ['..YYYY..', '.YyyyyY.', 'YyYYYYyY', 'YyYXXYyY', 'YyYXXYyY', 'YyYYYYyY', '.YyyyyY.', '..YYYY..'],
  ['...YY...', '..YyyY..', '..YyXY..', '..YyXY..', '..YyXY..', '..YyXY..', '..YyyY..', '...YY...'],
  ['...Yy...', '...Yy...', '...Yy...', '...Yy...', '...Yy...', '...Yy...', '...Yy...', '...Yy...'],
];
const RL_NOVO = { moto: 'Motos de entrega!', fila: 'Fila de Amiguinhos!', onibus: 'Ônibus!', trilho: 'Trilho de trem!', rio: 'Canal!' };
// quando cada novidade entra (em faixas); a primeira vez é garantida
const RL_SEG = [['avenida', 0, 5], ['fila', 9, 1.2], ['trilho', 24, 1.5], ['rio', 34, 2.3]];
const RL_LOJAS = ['CAPINHAS', 'CABOS & CIA', 'PASTELARIA', 'CELULARES', 'XEROX 24H', 'CHIPS & MAIS'];
const RL_ERRADA = ['Loja errada!', 'Essa só vende capinha', 'Ainda não é essa', 'Fechada. Próxima!', 'Quase. Só que não.'];
const RL_MOTIVO = {
  carro: 'O carro tinha preferência. Na cabeça dele.',
  moto: 'A entrega chegou. Em você.',
  onibus: 'O ônibus não para fora do ponto.',
  trem: 'O trem avisou. Piscando, inclusive.',
  agua: 'Caixa de jogo boia. Você, nem tanto.',
  corre: 'A correnteza levou você para outro bairro.',
  camera: 'Ficou para trás da câmera e a live seguiu sem você.',
};
const RL_BOOM = { carro: 'PLAFT!', moto: 'PLAFT!', onibus: 'PLOFT!', trem: 'FIUUUM!', agua: 'TCHIBUM!', corre: 'TCHIBUM!', camera: 'FORA DA LIVE!' };
const rlHash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const rlPadStick = { on: false };
function rlStick() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  const p = pads[0]; if (!p) { rlPadStick.on = false; return null; }
  const ax = p.axes[0] || 0, ay = p.axes[1] || 0, m = Math.max(Math.abs(ax), Math.abs(ay));
  if (m < .3) { rlPadStick.on = false; return null; }
  if (rlPadStick.on || m < .6) return null;
  rlPadStick.on = true;
  return Math.abs(ax) > Math.abs(ay) ? [Math.sign(ax), 0] : [0, ay < 0 ? 1 : -1];
}

const rlJogo = {
  id: 'loja', name: 'Rumo à Loja', tag: 'Travessia · sem fim', unit: 'quarteirões', ia: 38, bestKey: '.v1',
  desc: 'Atravesse a cidade de madrugada até a loja de games.',
  how: 'Avance um passo por vez por avenidas, trilhos e canais: pule nas caixas de jogo (a água não perdoa) e pegue fichas. Não enrole, a câmera da live sobe sozinha e quem fica para trás da tela está fora.',
  ctl: [['Setas', 'um passo', 'pc'], ['Espaço', 'para frente', 'pc'], ['✕ / A', 'para frente', 'pc'], ['Direcional', 'um passo', 'pc'], ['Toque', 'para frente', 'touch'], ['Deslizar', 'para o lado ou para trás', 'touch'], ['Esc', 'pausa', 'pc']],
  pad: null,
  rank: [['@carol', 141], ['@duda', 112], ['@rafa', 86], ['@bia', 57]],
  nota: 'parei pra pegar ficha e o ônibus não parou pra mim',
  falas: [
    'Lançamento à meia-noite e eu atravessando a cidade a pé. A hélice tá carregada, relaxa.',
    'O trem pisca antes de passar. Eu também pisco, mas é só charme.',
    'Caixa de jogo boia, sabia? Descobri do jeito molhado kkkk',
    'A fila de Amiguinhos é educada e espera você passar. Os carros, nem tanto.',
    'Se você enrolar, a câmera da live te larga pra trás. Igualzinho ao algoritmo hahaha',
  ],
  init() { this.reset(null); },
  demo() { this.reset(['avenida', 'rio', 'trilho']); this.p.row = 5; this.p.cx = 5.5; const r5 = this.rows[5]; if (r5.obs) r5.obs[5] = null; r5.ficha = 7; },
  reset(script) {
    Object.assign(this, {
      t: 0, score: 0, fichas: 0, maxRow: RL_START, camY: 0, rows: {}, gen: 0, nextLoja: 42, made: {}, seen: {}, script: script ? [...script] : null,
      p: { row: RL_START, cx: 4.5, flip: false, hop: null, bump: null }, buf: null, tch: null, dead: null, fx: [], aviso: null, ding: 0, warnBeep: 0, passou: {}, lojaN: 0,
    });
    rlPadStick.on = true; // não anda sozinho se o analógico já estiver inclinado
    this.genUntil(Math.ceil(RL_ROWS) + 4);
  },

  /* ---------- geração das faixas ---------- */
  genUntil(r) { while (this.gen <= r) this.segmento(); },
  add(lane) { lane.r = this.gen; this.rows[this.gen] = lane; this.gen++; this.popula(lane); return lane; },
  segmento() {
    const L = this.gen;
    if (L <= RL_START) { this.calcada(L === RL_START ? 'inicio' : 'borda'); return; }
    if (L >= this.nextLoja && !this.script) { this.calcada('limpa'); this.loja(); this.calcada('limpa'); this.nextLoja += 40; return; }
    let k;
    if (this.script) k = this.script.shift() || 'avenida';
    else {
      const ok = RL_SEG.filter(([, from]) => L >= from), novo = ok.find(([nm]) => !this.made[nm]);
      if (novo) k = novo[0];
      else { let r = Math.random() * ok.reduce((a, [, , w]) => a + w, 0); k = ok[0][0]; for (const [nm, , w] of ok) { r -= w; if (r <= 0) { k = nm; break; } } }
      if (k === this.lastSeg && k !== 'avenida' && Math.random() < .6) k = 'avenida';
    }
    this.made[k] = true; this.lastSeg = k;
    const f = Math.min(1, L / 150), m = 1 + f * .9;
    if (k === 'avenida') {
      const n = this.script ? 2 : 1 + Math.floor(rand(0, 1 + Math.min(3.2, L / 20)));
      let dir = pick([-1, 1]);
      for (let i = 0; i < n; i++) {
        if (i) dir = Math.random() < .7 ? -dir : dir;
        const opts = ['carro', 'carro'];
        if (L >= 12) opts.push('moto'); if (L >= 20) opts.push('onibus');
        let v = pick(opts);
        if (L >= 12 && !this.made.moto) v = 'moto'; else if (L >= 20 && !this.made.onibus) v = 'onibus';
        this.made[v] = true;
        const g = 1.15 - f * .45;
        const cfg = { carro: [rand(1.3, 2.1), rand(2.3, 5) * g, 1.6], moto: [rand(3.1, 4), rand(5, 9) * g, .9], onibus: [rand(1, 1.45), rand(3, 5.5) * g, 3.2] }[v];
        this.add({ k: 'avenida', veh: v, dir, sp: cfg[0] * m, gapR: [Math.max(1.7, cfg[1] * .8), Math.max(2.2, cfg[1] * 1.25)], vw: cfg[2], ents: [], ficha: Math.random() < .14 ? Math.floor(rand(0, RL_COLS)) : -1, feat: v === 'carro' ? null : v });
      }
    } else if (k === 'rio') {
      const n = 2 + (L >= 60 && Math.random() < .5 ? 1 : 0) + (L >= 100 && Math.random() < .4 ? 1 : 0);
      let dir = pick([-1, 1]); const g = Math.min(1, Math.max(0, (L - 34) / 110));
      for (let i = 0; i < n; i++, dir = -dir) this.add({ k: 'rio', dir, sp: rand(.8, 1.3) * (1 + g * .7), wr: g > .5 ? [2, 3] : [2, 4], gapR: [1 + g * .4, 2 + g * .6], ents: [], feat: 'rio' });
    } else if (k === 'trilho') {
      const n = L >= 70 && Math.random() < .35 ? 2 : 1;
      for (let i = 0; i < n; i++) this.add({ k: 'trilho', dir: pick([-1, 1]), sp: 15 * (1 + f * .3), len: Math.floor(rand(9, 14)), st: 'wait', tm: rand(.8, 4), warnDur: 1.35 - f * .3, train: null, feat: 'trilho' });
    } else if (k === 'fila') {
      this.add({ k: 'fila', dir: pick([-1, 1]), sp: rand(.55, .85), ents: [], grp: 0, feat: 'fila' });
    }
    this.calcada(Math.random() < (L < 30 ? .45 : .25) ? 'dupla' : 'normal');
  },
  calcada(modo) {
    const L = this.gen, obs = Array(RL_COLS).fill(null), prev = this.rows[L - 1];
    const prevObs = prev && prev.k === 'calcada' ? prev.obs : null;
    let n = modo === 'limpa' || modo === 'inicio' ? 0 : modo === 'borda' ? 2 : Math.floor(rand(0, 2.3 + Math.min(1.6, L / 50)));
    for (let tries = 0; n > 0 && tries < 40; tries++) {
      const c = modo === 'borda' ? pick([0, 1, RL_COLS - 2, RL_COLS - 1]) : Math.floor(rand(0, RL_COLS));
      // obstáculos sempre com 2 casas livres entre eles e nunca em cima de outro da calçada anterior: sempre há passagem
      if (obs.some((o, i) => o && Math.abs(i - c) < 3) || (prevObs && prevObs[c])) continue;
      obs[c] = pick(['poste', 'poste', 'poste', 'banco', 'banco', 'lixeira', 'hidrante', 'fliper']); n--;
    }
    if (modo === 'inicio') { obs[0] = 'poste'; obs[RL_COLS - 1] = 'fliper'; }
    const free = obs.map((o, i) => (o ? -1 : i)).filter((i) => i >= 0);
    const lane = this.add({ k: 'calcada', obs, ficha: L > RL_START && Math.random() < .16 ? pick(free) : -1, luz: Math.floor(rlHash(L, 7) * 4) });
    if (modo === 'dupla') this.calcada('normal');
    return lane;
  },
  loja() {
    const obs = Array(RL_COLS).fill('vitrine'), doors = [];
    while (doors.length < 3) { const c = 1 + Math.floor(rand(0, RL_COLS - 2)); if (!doors.some((d) => Math.abs(d - c) < 2)) doors.push(c); }
    for (const d of doors) obs[d] = null;
    this.add({ k: 'loja', obs, nome: RL_LOJAS[this.lojaN++ % RL_LOJAS.length], ficha: -1 });
  },
  // enche a faixa como se ela já estivesse rodando há um tempo
  popula(lane) {
    if (lane.k === 'avenida' || lane.k === 'rio' || lane.k === 'fila') {
      const T = (RL_COLS + 8) / lane.sp + rand(0, 3);
      for (let s = 0; s < T; s += .1) this.passo(lane, .1, false);
    }
  },
  larg(lane) { return lane.k === 'avenida' ? lane.vw : lane.k === 'rio' ? Math.floor(rand(lane.wr[0], lane.wr[1] + 1)) : 1; },
  vao(lane) {
    if (lane.k === 'fila') { if (lane.grp > 0) { lane.grp--; return .15; } lane.grp = Math.floor(rand(1, 4)); return rand(2.2, 3.6); }
    return rand(lane.gapR[0], lane.gapR[1]);
  },
  // move tudo o que anda numa faixa (carros, caixas, Amiguinhos, trem)
  passo(lane, dt, vivo) {
    if (!lane.ents && lane.k !== 'trilho') return;
    if (lane.k === 'trilho') {
      if (lane.st === 'wait') { lane.tm -= dt; if (lane.tm <= 0) { lane.st = 'warn'; lane.tm = lane.warnDur; } }
      else if (lane.st === 'warn') { lane.tm -= dt; if (lane.tm <= 0) { lane.st = 'go'; lane.train = { x: lane.dir > 0 ? -lane.len - .5 : RL_COLS + .5, w: lane.len }; if (vivo && Math.abs(lane.r - this.p.row) < 8) beep(130, .6, 'sawtooth', .045, -50); } }
      else { lane.train.x += lane.dir * lane.sp * dt; if (lane.train.x > RL_COLS + 1 || lane.train.x + lane.train.w < -1) { lane.st = 'wait'; lane.train = null; lane.tm = rand(2.2, 5.5) / (1 + Math.min(1, lane.r / 150) * .6); } }
      return;
    }
    const d = lane.dir, ents = lane.ents, p = this.p;
    if (lane.k === 'fila') {
      // a fila anda devagar e para atrás de quem estiver na frente (inclusive você)
      const here = vivo && !this.dead && p.row === lane.r, pl = p.cx - .5;
      for (let i = 0; i < ents.length; i++) {
        const e = ents[i], ahead = ents[i - 1];
        let nx = e.x + d * lane.sp * dt;
        if (d > 0) { if (ahead) nx = Math.min(nx, ahead.x - 1.12); if (here && pl >= e.x + .3) nx = Math.min(nx, pl - 1.02); e.walk = nx > e.x; e.x = Math.max(e.x, nx); }
        else { if (ahead) nx = Math.max(nx, ahead.x + 1.12); if (here && pl <= e.x - .3) nx = Math.max(nx, pl + 1.02); e.walk = nx < e.x; e.x = Math.min(e.x, nx); }
      }
    } else for (const e of ents) e.x += d * lane.sp * dt;
    lane.ents = ents.filter((e) => e.x < RL_COLS + 5 && e.x + e.w > -5);
    const last = lane.last, tr = last ? Math.abs(last.x - last.x0) : Infinity;
    if (!last || tr >= last.w + lane.gapNext) {
      const w = this.larg(lane), x0 = d > 0 ? -w - .5 : RL_COLS + .5;
      const e = { x: x0, x0, w, c: Math.floor(Math.random() * 7), s: rand(0, 6.28) };
      lane.ents.push(e); lane.last = e; lane.gapNext = this.vao(lane);
    }
  },

  /* ---------- regras ---------- */
  bloqueado(lane, c) {
    if (!lane) return true;
    if (lane.obs && lane.obs[c]) return true;
    if (lane.k === 'fila') return lane.ents.some((e) => e.x < c + .92 && e.x + 1 > c + .08);
    return false;
  },
  mover([dx, dy]) {
    const p = this.p, from = this.rows[p.row];
    const nr = p.row + dy, to = this.rows[nr];
    if (dy < 0 && nr < this.camY - .35) return this.batida(dx, dy);
    let cx = p.cx + dx;
    if (to && to.k !== 'rio') cx = clamp(Math.round(cx - .5), 0, RL_COLS - 1) + .5;
    if (!to || cx < .5 - .01 && from.k !== 'rio' || cx > RL_COLS - .5 + .01 && from.k !== 'rio') return this.batida(dx, dy);
    if (to.k !== 'rio' && this.bloqueado(to, Math.floor(cx))) return this.batida(dx, dy);
    if (dx) p.flip = dx < 0;
    p.hop = { fx: p.cx, fr: p.row, t: 0 };
    p.row = nr; p.cx = cx;
    beep(dy > 0 ? 700 : 560, .035, 'square', .022, 160);
    if (to.ficha >= 0 && to.k !== 'rio' && Math.floor(cx) === to.ficha) {
      to.ficha = -1; this.fichas++; sfx.coin();
      this.fx.push({ k: 'txt', s: '+2', x: cx * RL_TS, y: this.yOf(nr) + 4, t: 0, life: .8, c: '#ffd04a' });
    }
    if (nr > this.maxRow) this.maxRow = nr;
    if (to.k === 'loja' && !this.passou[nr]) {
      this.passou[nr] = true;
      this.fx.push({ k: 'txt', s: pick(RL_ERRADA), x: W / 2, y: this.yOf(nr) - 6, t: 0, life: 1.6, c: '#ff9ccf', big: true });
    }
    this.score = this.maxRow - RL_START + this.fichas * 2;
  },
  batida(dx, dy) { this.p.bump = { dx, dy, t: 0 }; beep(150, .05, 'square', .03); },
  morrer(k) {
    if (this.dead) return;
    this.dead = { k, t: 0 }; this.p.hop = null;
    if (k === 'agua' || k === 'corre') { beep(320, .3, 'triangle', .06, -220); setTimeout(() => beep(180, .25, 'sine', .05, -80), 120); for (let i = 0; i < 14; i++) this.fx.push({ k: 'gota', x: this.p.cx * RL_TS + rand(-6, 6), y: this.yOf(this.p.row) + 18, vx: rand(-60, 60), vy: rand(-140, -60), t: 0, life: .7 }); }
    else if (k === 'camera') { sfx.over(); }
    else { sfx.hit(); shake = k === 'trem' || k === 'onibus' ? .45 : .3; }
  },
  yOf(r) { return Math.round(H - (r + 1 - this.camY) * RL_TS); },

  update(dt) {
    this.t += dt;
    for (const f of this.fx) { f.t += dt; if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 420 * dt; } }
    this.fx = this.fx.filter((f) => f.t < f.life);
    if (this.aviso) { this.aviso.t += dt; if (this.aviso.t > 1.7) this.aviso = null; }
    const p = this.p;
    // o mundo continua andando, até depois do fim
    const lo = Math.floor(this.camY) - 2;
    for (let r = lo; r < this.gen; r++) { const ln = this.rows[r]; if (ln) this.passo(ln, dt, true); }
    if (this.dead) { this.dead.t += dt; if (this.dead.k === 'camera') this.camY += .9 * dt; return this.dead.t > 1.4; }

    // entrada: teclado e direcional (um passo por toque), analógico, toque/deslizar
    let mv = null;
    const P = (...c) => c.some((k) => inp.press.has(k));
    if (P('ArrowUp', 'KeyW', 'Space', 'Enter')) mv = [0, 1];
    else if (P('ArrowDown', 'KeyS')) mv = [0, -1];
    else if (P('ArrowLeft', 'KeyA')) mv = [-1, 0];
    else if (P('ArrowRight', 'KeyD')) mv = [1, 0];
    const st = rlStick(); if (!mv && st) mv = st;
    if (inp.tap) { if (inp.drag) this.tch = { x0: inp.tap.x, y0: inp.tap.y, done: false }; else if (!mv) mv = [0, 1]; }
    if (this.tch) {
      if (inp.drag && !this.tch.done) {
        const ddx = inp.drag.x - this.tch.x0, ddy = inp.drag.y - this.tch.y0;
        if (Math.max(Math.abs(ddx), Math.abs(ddy)) > 14) { this.tch.done = true; if (!mv) mv = Math.abs(ddx) > Math.abs(ddy) ? [Math.sign(ddx), 0] : [0, ddy < 0 ? 1 : -1]; }
      } else if (!inp.drag) { if (!this.tch.done && !mv) mv = [0, 1]; this.tch = null; }
    }
    if (mv) { if (p.hop) this.buf = mv; else this.mover(mv); }
    if (p.bump) { p.bump.t += dt; if (p.bump.t > .12) p.bump = null; }
    if (p.hop) {
      p.hop.t += dt;
      if (p.hop.t >= RL_HOP) { p.hop = null; if (this.buf) { const b = this.buf; this.buf = null; this.pousar(); if (!this.dead) this.mover(b); } else this.pousar(); }
    }
    if (this.dead) return false;
    const lane = this.rows[p.row];
    // em cima da caixa: vai junto com a correnteza
    if (lane.k === 'rio' && !p.hop) {
      p.cx += lane.dir * lane.sp * dt;
      if (p.cx < .15 || p.cx > RL_COLS - .15) return this.morrer('corre'), false;
    }
    // atropelamento e trem
    const x0 = p.cx - .3, x1 = p.cx + .3;
    if (lane.k === 'avenida' && lane.ents.some((e) => e.x + .1 < x1 && e.x + e.w - .1 > x0)) this.morrer(lane.veh);
    if (lane.k === 'trilho' && lane.train && lane.train.x < x1 && lane.train.x + lane.train.w > x0) this.morrer('trem');

    // câmera da live: segue você e sobe sozinha, cada vez mais rápido
    const alvo = p.row - 3;
    if (alvo > this.camY) this.camY += (alvo - this.camY) * Math.min(1, dt * 5);
    if (this.t > 2.5) this.camY += Math.min(1.1, .22 + this.maxRow * .0055) * dt;
    if (p.row < this.camY - .45) this.morrer('camera');
    // aviso de perigo: bip quando estiver quase saindo da tela
    if (p.row < this.camY + 1.1) { this.warnBeep -= dt; if (this.warnBeep <= 0) { beep(990, .05, 'square', .03); this.warnBeep = .35; } } else this.warnBeep = 0;
    // sinal do trem tocando
    this.ding -= dt;
    if (this.ding <= 0) for (let r = Math.floor(this.camY); r < this.camY + RL_ROWS; r++) { const ln = this.rows[r]; if (ln && ln.k === 'trilho' && ln.st === 'warn') { beep(1250, .07, 'square', .025); this.ding = .3; break; } }
    // novidade entrando na tela
    for (let r = Math.floor(this.camY); r < this.camY + RL_ROWS - 1; r++) {
      const ln = this.rows[r]; if (!ln) continue;
      const ft = ln.feat;
      if (ft && !this.seen[ft]) { this.seen[ft] = true; this.aviso = { s: RL_NOVO[ft], t: 0 }; }
    }
    this.genUntil(Math.ceil(this.camY + RL_ROWS) + 3);
    for (const k of Object.keys(this.rows)) if (+k < this.camY - 4) delete this.rows[k];
    return false;
  },
  // aterrissou: no canal, tem que ter uma caixa embaixo
  pousar() {
    const p = this.p, lane = this.rows[p.row];
    if (lane && lane.k === 'rio' && !lane.ents.some((e) => p.cx > e.x - .12 && p.cx < e.x + e.w + .12)) this.morrer('agua');
  },
  hud() { return ['Quarteirões', this.score, this.fichas ? `fichas ${this.fichas}` : '']; },
  overText() { const q = this.maxRow - RL_START; return `${RL_MOTIVO[this.dead?.k] || ''} ${q} ${q === 1 ? 'quarteirão' : 'quarteirões'} e ${this.fichas} ficha${this.fichas === 1 ? '' : 's'} (cada uma vale 2).`.trim(); },

  /* ---------- desenho ---------- */
  draw(t = this.t) {
    t = t || 0;
    const lights = [];
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#0b0f17'; ctx.fillRect(0, 0, W, H);
    const r0 = Math.floor(this.camY) - 1, r1 = Math.ceil(this.camY + RL_ROWS) + 1;
    for (let r = r0; r <= r1; r++) { const ln = this.rows[r]; if (ln) this.chao(ln, this.yOf(r), t); }
    // de trás para a frente: o que está mais embaixo na tela fica por cima
    for (let r = r1; r >= r0; r--) {
      const ln = this.rows[r]; if (!ln) continue;
      const y = this.yOf(r);
      this.coisas(ln, y, t, lights);
      if (r === this.p.row) this.ia(t, lights);
    }
    // luzes: postes, faróis, vitrines, sinal do trem
    ctx.globalCompositeOperation = 'lighter';
    for (const L of lights) {
      if (!L.c || !Number.isFinite(L.x + L.y)) continue;
      if (L.cone) { const g = ctx.createLinearGradient(L.x, 0, L.x + L.d * 52, 0); g.addColorStop(0, L.c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(L.x, L.y - 4); ctx.lineTo(L.x + L.d * 52, L.y - 13); ctx.lineTo(L.x + L.d * 52, L.y + 13); ctx.lineTo(L.x, L.y + 4); ctx.closePath(); ctx.fill(); continue; }
      const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r); g.addColorStop(0, L.c); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    // efeitos
    for (const f of this.fx) {
      const a = Math.max(0, 1 - f.t / f.life);
      if (f.k === 'gota') { ctx.fillStyle = `rgba(160,215,255,${a})`; ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2); continue; }
      ctx.globalAlpha = Math.min(1, a * 2); ctx.font = f.big ? F_MID : '900 14px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#07050c';
      const yy = Math.round(f.y - f.t * 22); ctx.strokeText(f.s, f.x, yy); ctx.fillStyle = f.c; ctx.fillText(f.s, f.x, yy); ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }
    this.live(t);
    if (this.aviso && !this.dead) { const a = this.aviso, al = Math.min(1, (1.7 - a.t) * 3, a.t * 6); ctx.globalAlpha = Math.max(0, al); ctx.font = '900 16px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#0a1016'; ctx.strokeText(a.s.toUpperCase(), W / 2, 78); ctx.fillStyle = '#ffd04a'; ctx.fillText(a.s.toUpperCase(), W / 2, 78); ctx.textAlign = 'left'; ctx.globalAlpha = 1; }
    if (this.dead && this.dead.t > .15) {
      const s = RL_BOOM[this.dead.k], k = Math.min(1, (this.dead.t - .15) * 6), y = this.dead.k === 'camera' ? H / 2 : clamp(this.yOf(this.p.row) - 14, 96, H - 40);
      ctx.save(); ctx.translate(W / 2, y); ctx.scale(.6 + .4 * k, .6 + .4 * k); ctx.font = F_BIG; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = '#07050c'; ctx.strokeText(s, 0, 0); ctx.fillStyle = this.dead.k === 'camera' ? '#ff5a6a' : '#ffffff'; ctx.fillText(s, 0, 0); ctx.restore(); ctx.textAlign = 'left';
    }
    ctx.lineJoin = 'miter';
  },
  // borda da "câmera da live": REC piscando, e vermelho quando você está ficando para trás
  live(t) {
    const p = this.p, perto = clamp(1 - (p.row - this.camY) / 1.6, 0, 1), dead = this.dead && this.dead.k === 'camera';
    if (perto > 0 || dead) {
      const a = ((dead ? .6 : perto * .5) * (.6 + .4 * Math.sin(t * 16))).toFixed(3);
      const g = ctx.createLinearGradient(0, H - 70, 0, H); g.addColorStop(0, 'rgba(232,68,58,0)'); g.addColorStop(1, `rgba(232,68,58,${a})`);
      ctx.fillStyle = g; ctx.fillRect(0, H - 70, W, 70);
      if (Math.floor(t * 6) % 2) { ctx.fillStyle = '#ff5a6a'; ctx.fillRect(0, H - 3, W, 3); ctx.fillRect(0, 0, 3, H); ctx.fillRect(W - 3, 0, 3, H); }
      // setas avisando para subir
      if (!dead) { ctx.fillStyle = `rgba(255,255,255,${.5 + .5 * Math.sin(t * 14)})`; for (const x of [W / 2 - 40, W / 2 + 34]) { ctx.fillRect(x + 2, H - 30, 2, 10); ctx.fillRect(x, H - 28, 6, 2); ctx.fillRect(x + 1, H - 29, 4, 1); } }
    }
    // cantinhos de câmera e REC
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (const [x, y, sx, sy] of [[6, H - 6, 1, -1], [W - 6, H - 6, -1, -1]]) { ctx.fillRect(x, y, 12 * sx, 2 * sy); ctx.fillRect(x, y, 2 * sx, 12 * sy); }
    const on = Math.floor(t * 2) % 2 === 0 || perto > 0;
    ctx.fillStyle = 'rgba(7,5,12,.6)'; ctx.fillRect(12, H - 24, 38, 13);
    if (on) { ctx.fillStyle = '#ff3b3b'; ctx.fillRect(15, H - 21, 6, 6); ctx.fillStyle = '#ffd0d6'; ctx.fillRect(16, H - 20, 2, 2); }
    ctx.font = '700 9px "IBM Plex Mono", monospace'; ctx.fillStyle = '#ffffff'; ctx.fillText('REC', 24, H - 14);
  },
  chao(ln, y, t) {
    const k = ln.k, up = this.rows[ln.r + 1], dn = this.rows[ln.r - 1];
    if (k === 'calcada' || k === 'fila') {
      ctx.fillStyle = k === 'fila' ? '#1f1b2e' : '#1c212c'; ctx.fillRect(0, y, W, RL_TS);
      ctx.fillStyle = k === 'fila' ? '#29243c' : '#252b38';
      for (let x = 0; x < W; x += 32) { ctx.fillRect(x + 1, y + 1, 30, 14); ctx.fillRect(x - 15, y + 17, 30, 14); }
      for (let i = 0; i < 6; i++) { const h = rlHash(ln.r, i); ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(Math.floor(h * W), y + 2 + Math.floor(rlHash(i, ln.r) * 26), 3, 2); }
      if (k === 'fila') { ctx.fillStyle = 'rgba(255,208,74,.22)'; for (let x = 16; x < W; x += 64) { const xx = ln.dir > 0 ? x : x + 6; for (let j = 0; j < 4; j++) { ctx.fillRect(xx + (ln.dir > 0 ? j : 3 - j), y + 12 + j, 2, 1); ctx.fillRect(xx + (ln.dir > 0 ? j : 3 - j), y + 19 - j, 2, 1); } } }
      if (dn && (dn.k === 'avenida' || dn.k === 'trilho')) { ctx.fillStyle = '#4a5366'; ctx.fillRect(0, y + RL_TS - 3, W, 3); ctx.fillStyle = '#5f6a80'; ctx.fillRect(0, y + RL_TS - 3, W, 1); }
      if (up && (up.k === 'avenida' || up.k === 'trilho')) { ctx.fillStyle = '#5f6a80'; ctx.fillRect(0, y, W, 2); }
      if (dn && dn.k === 'rio') { ctx.fillStyle = '#3a4456'; ctx.fillRect(0, y + RL_TS - 4, W, 4); ctx.fillStyle = '#56627a'; ctx.fillRect(0, y + RL_TS - 4, W, 1); }
      if (up && up.k === 'rio') { ctx.fillStyle = '#3a4456'; ctx.fillRect(0, y, W, 3); }
    } else if (k === 'avenida') {
      ctx.fillStyle = '#141923'; ctx.fillRect(0, y, W, RL_TS);
      for (let i = 0; i < 10; i++) { const h = rlHash(ln.r * 3, i); ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(Math.floor(h * W), y + 1 + Math.floor(rlHash(i, ln.r * 5) * 29), 2, 1); }
      if (up && up.k === 'avenida') { ctx.fillStyle = up.dir === ln.dir ? 'rgba(220,225,235,.35)' : '#8a7a3a'; for (let x = 4; x < W; x += 40) ctx.fillRect(x, y - 1, 20, 2); }
      else { ctx.fillStyle = 'rgba(220,225,235,.45)'; ctx.fillRect(0, y + 2, W, 1); }
      if (!dn || dn.k !== 'avenida') { ctx.fillStyle = 'rgba(220,225,235,.45)'; ctx.fillRect(0, y + RL_TS - 3, W, 1); }
    } else if (k === 'trilho') {
      ctx.fillStyle = '#1b181e'; ctx.fillRect(0, y, W, RL_TS);
      for (let i = 0; i < 26; i++) { ctx.fillStyle = i % 2 ? '#26222a' : '#2e2a31'; ctx.fillRect(Math.floor(rlHash(ln.r, i) * W), y + 2 + Math.floor(rlHash(i, ln.r) * 28), 2, 2); }
      for (let x = 2; x < W; x += 16) { ctx.fillStyle = '#3a2b23'; ctx.fillRect(x, y + 4, 8, 24); ctx.fillStyle = '#4d3a2f'; ctx.fillRect(x, y + 4, 8, 2); }
      for (const ry of [8, 21]) { ctx.fillStyle = '#5d6875'; ctx.fillRect(0, y + ry, W, 3); ctx.fillStyle = '#b9c2cf'; ctx.fillRect(0, y + ry, W, 1); }
      if (ln.st !== 'wait' && Math.floor(t * 7) % 2) { ctx.fillStyle = 'rgba(232,68,58,.14)'; ctx.fillRect(0, y, W, RL_TS); }
    } else if (k === 'rio') {
      ctx.fillStyle = '#0a2140'; ctx.fillRect(0, y, W, RL_TS);
      ctx.fillStyle = '#0d2a4f'; ctx.fillRect(0, y + 10, W, 12);
      for (let i = 0; i < 9; i++) {
        const sp = ln.sp * ln.dir * 32, x = (((i * 61 + ln.r * 37) + t * sp * .6) % (W + 40) + W + 40) % (W + 40) - 20, yy = y + 4 + (i * 7 + ln.r * 3) % 24;
        ctx.fillStyle = i % 4 === 0 ? 'rgba(232,111,168,.28)' : i % 4 === 1 ? 'rgba(127,220,255,.25)' : 'rgba(140,190,255,.16)';
        ctx.fillRect(Math.round(x), yy, 8 + (i % 3) * 4, 1);
      }
    } else if (k === 'loja') {
      ctx.fillStyle = '#15111f'; ctx.fillRect(0, y, W, RL_TS);
      ctx.fillStyle = '#221b33'; ctx.fillRect(0, y, W, 9);
    }
  },
  coisas(ln, y, t, lights) {
    const k = ln.k;
    if (ln.obs) for (let c = 0; c < RL_COLS; c++) if (ln.obs[c]) this.obj(ln.obs[c], c * RL_TS, y, t, lights, ln.r * 13 + c);
    if (k === 'loja') {
      // portas abertas: chão aceso e batente claro
      for (let c = 0; c < RL_COLS; c++) if (!ln.obs[c]) {
        const X = c * RL_TS;
        ctx.fillStyle = '#4a4068'; ctx.fillRect(X + 2, y + 9, 28, 23); ctx.fillStyle = '#5c5080'; ctx.fillRect(X + 2, y + 9, 28, 3);
        ctx.fillStyle = '#07050c'; ctx.fillRect(X, y + 7, 3, 25); ctx.fillRect(X + 29, y + 7, 3, 25);
        ctx.fillStyle = '#9aa7b4'; ctx.fillRect(X + 1, y + 8, 1, 24); ctx.fillRect(X + 30, y + 8, 1, 24);
        ctx.fillStyle = '#ffd04a'; ctx.fillRect(X + 8, y + 27, 16, 2);
        lights.push({ x: X + 16, y: y + 22, r: 22, c: 'rgba(255,220,150,.22)' });
      }
      ctx.font = '800 9px Archivo, sans-serif'; ctx.textAlign = 'center';
      const on = Math.floor(t * 3 + ln.r) % 11 !== 0;
      ctx.fillStyle = on ? '#ff9ccf' : '#6a3a55'; ctx.fillText(ln.nome, W / 2, y + 8); ctx.textAlign = 'left';
      if (on) lights.push({ x: W / 2, y: y + 4, r: 44, c: 'rgba(232,111,168,.22)' });
    }
    if (ln.ficha >= 0) {
      const fr = RL_FICHA[[0, 1, 2, 1][Math.floor(t * 8 + ln.r) % 4]], X = ln.ficha * RL_TS + 8, Y = y + 7 + Math.round(Math.sin(t * 5 + ln.r) * 1.5);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(X + 2, y + 25, 12, 3);
      sprO(fr, X, Y, 2, PAL); lights.push({ x: X + 8, y: Y + 8, r: 16, c: 'rgba(255,208,74,.25)' });
    }
    if (k === 'avenida') for (const e of ln.ents) this.veiculo(ln, e, y, t, lights);
    else if (k === 'rio') for (const e of ln.ents) this.caixa(e, y, t);
    else if (k === 'fila') for (const e of ln.ents) {
      const X = Math.round(e.x * RL_TS + 4), bob = e.walk ? Math.floor(t * 8 + e.s) % 2 : 0;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(X + 2, y + 26, 20, 3);
      sprO(BOT, X, y + 3 - bob, 3, RL_BOTS[e.c % RL_BOTS.length], ln.dir < 0);
    } else if (k === 'trilho') {
      const lit = ln.st !== 'wait', blink = Math.floor(t * 7) % 2;
      for (const sx of [3, W - 13]) {
        ctx.fillStyle = '#07050c'; ctx.fillRect(sx, y - 2, 10, 8); ctx.fillStyle = '#2a2f3a'; ctx.fillRect(sx + 1, y - 1, 8, 6);
        ctx.fillStyle = lit && blink ? '#ff3b3b' : '#4a1c1c'; ctx.fillRect(sx + 2, y, 2, 3);
        ctx.fillStyle = lit && !blink ? '#ff3b3b' : '#4a1c1c'; ctx.fillRect(sx + 6, y, 2, 3);
        if (lit) lights.push({ x: sx + (blink ? 3 : 7), y: y + 1, r: 18, c: 'rgba(255,60,60,.45)' });
      }
      if (ln.train) this.trem(ln, y, t, lights);
    }
  },
  obj(kind, X, y, t, lights, seed) {
    const K = '#07050c';
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    if (kind === 'poste') {
      ctx.fillRect(X + 10, y + 24, 14, 4);
      ctx.fillStyle = K; ctx.fillRect(X + 11, y + 20, 10, 8); ctx.fillRect(X + 13, y + 1, 6, 21); ctx.fillRect(X + 8, y - 4, 16, 7);
      ctx.fillStyle = '#5d6875'; ctx.fillRect(X + 12, y + 21, 8, 6); ctx.fillStyle = '#8a95a3'; ctx.fillRect(X + 14, y + 2, 4, 20); ctx.fillStyle = '#c4ccd6'; ctx.fillRect(X + 14, y + 2, 1, 20);
      const c = RL_LUZ[seed % RL_LUZ.length];
      ctx.fillStyle = '#3a4252'; ctx.fillRect(X + 9, y - 3, 14, 4); ctx.fillStyle = c; ctx.fillRect(X + 10, y + 1, 12, 1);
      lights.push({ x: X + 16, y: y + 12, r: 40, c: c + '38' }, { x: X + 16, y: y, r: 12, c: c + '88' });
    } else if (kind === 'banco') {
      ctx.fillRect(X + 4, y + 24, 26, 4);
      ctx.fillStyle = K; ctx.fillRect(X + 2, y + 8, 28, 18);
      for (let j = 0; j < 3; j++) { ctx.fillStyle = '#8a5a3a'; ctx.fillRect(X + 3, y + 9 + j * 5, 26, 4); ctx.fillStyle = '#b07a52'; ctx.fillRect(X + 3, y + 9 + j * 5, 26, 1); }
      ctx.fillStyle = '#3a4252'; ctx.fillRect(X + 5, y + 23, 3, 3); ctx.fillRect(X + 24, y + 23, 3, 3);
    } else if (kind === 'lixeira') {
      ctx.fillRect(X + 9, y + 25, 16, 4);
      ctx.fillStyle = K; ctx.fillRect(X + 8, y + 6, 16, 21); ctx.fillStyle = '#2a7a4a'; ctx.fillRect(X + 9, y + 11, 14, 15); ctx.fillStyle = '#3fbf6a'; ctx.fillRect(X + 9, y + 7, 14, 5); ctx.fillStyle = '#9ae8b4'; ctx.fillRect(X + 9, y + 7, 14, 1);
      ctx.fillStyle = '#1d5a36'; ctx.fillRect(X + 12, y + 14, 2, 9); ctx.fillRect(X + 18, y + 14, 2, 9);
    } else if (kind === 'hidrante') {
      ctx.fillRect(X + 10, y + 25, 13, 4);
      ctx.fillStyle = K; ctx.fillRect(X + 10, y + 7, 12, 20); ctx.fillRect(X + 7, y + 14, 18, 6);
      ctx.fillStyle = '#e8443a'; ctx.fillRect(X + 11, y + 8, 10, 18); ctx.fillRect(X + 8, y + 15, 16, 4); ctx.fillStyle = '#ff8a80'; ctx.fillRect(X + 11, y + 8, 10, 2); ctx.fillStyle = '#a52d26'; ctx.fillRect(X + 11, y + 22, 10, 4);
    } else if (kind === 'fliper') {
      ctx.fillRect(X + 6, y + 25, 22, 4);
      ctx.fillStyle = K; ctx.fillRect(X + 5, y - 2, 22, 30);
      ctx.fillStyle = '#4a2a7a'; ctx.fillRect(X + 6, y - 1, 20, 28); ctx.fillStyle = '#6a46a8'; ctx.fillRect(X + 6, y - 1, 20, 2);
      const fl = (Math.floor((t || 0) * 4 + seed) % 3 + 3) % 3 || 0;
      ctx.fillStyle = '#07050c'; ctx.fillRect(X + 8, y + 3, 16, 11); ctx.fillStyle = ['#7fdcff', '#3fbf6a', '#e86fa8'][fl]; ctx.fillRect(X + 9, y + 4, 14, 9);
      ctx.fillStyle = '#07050c'; ctx.fillRect(X + 11 + fl * 3, y + 7, 3, 3);
      ctx.fillStyle = '#2c1a4c'; ctx.fillRect(X + 7, y + 16, 18, 6); ctx.fillStyle = '#e8443a'; ctx.fillRect(X + 10, y + 18, 2, 2); ctx.fillStyle = '#ffd04a'; ctx.fillRect(X + 16, y + 18, 2, 2); ctx.fillRect(X + 20, y + 18, 2, 2);
      lights.push({ x: X + 16, y: y + 8, r: 26, c: ['rgba(127,220,255,.28)', 'rgba(63,191,106,.28)', 'rgba(232,111,168,.28)'][fl] });
    } else if (kind === 'vitrine') {
      const c = RL_LUZ[seed % RL_LUZ.length];
      ctx.fillStyle = '#2a2240'; ctx.fillRect(X, y + 9, RL_TS, 23);
      ctx.fillStyle = K; ctx.fillRect(X + 3, y + 11, 26, 17); ctx.fillStyle = c + '55'; ctx.fillRect(X + 4, y + 12, 24, 15);
      for (let j = 0; j < 3; j++) { ctx.fillStyle = RL_CAIXAS[(seed + j) % RL_CAIXAS.length][0]; ctx.fillRect(X + 6 + j * 7, y + 17, 5, 8); }
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(X + 4, y + 12, 24, 1); ctx.fillStyle = '#3a3350'; ctx.fillRect(X, y + 29, RL_TS, 3);
      lights.push({ x: X + 16, y: y + 22, r: 24, c: c + '30' });
    }
  },
  veiculo(ln, e, y, t, lights) {
    const d = ln.dir, X = Math.round(e.x * RL_TS), L = Math.round(e.w * RL_TS), K = '#07050c', front = d > 0 ? X + L : X;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(X + 2, y + 25, L - 2, 4);
    if (ln.veh === 'moto') {
      const pal = RL_BOTS[e.c % RL_BOTS.length], back = d > 0 ? X : X + L - 11;
      ctx.fillStyle = K; ctx.fillRect(X, y + 17, L, 8); ctx.fillStyle = '#2b3340'; ctx.fillRect(X + 1, y + 18, L - 2, 6); ctx.fillStyle = '#5d6875'; ctx.fillRect(X + 1, y + 18, L - 2, 1);
      ctx.fillStyle = K; ctx.fillRect(back - 1, y + 5, 13, 13); ctx.fillStyle = '#e8443a'; ctx.fillRect(back, y + 6, 11, 11); ctx.fillStyle = '#ffd04a'; ctx.fillRect(back, y + 10, 11, 2); ctx.fillStyle = '#ff8a80'; ctx.fillRect(back, y + 6, 11, 1);
      sprO(BOT, d > 0 ? X + 11 : X + 2, y + 4, 2, pal, d < 0);
      ctx.fillStyle = '#fff3c4'; ctx.fillRect(d > 0 ? front - 2 : front, y + 19, 2, 3);
      lights.push({ cone: true, x: front, y: y + 20, d, c: 'rgba(255,235,170,.2)' }, { x: front, y: y + 20, r: 8, c: 'rgba(255,240,190,.6)' });
      return;
    }
    if (ln.veh === 'onibus') {
      ctx.fillStyle = K; ctx.fillRect(X - 1, y + 3, L + 2, 25);
      ctx.fillStyle = '#2a5fc0'; ctx.fillRect(X, y + 4, L, 18); ctx.fillStyle = '#1d4a99'; ctx.fillRect(X, y + 22, L, 5); ctx.fillStyle = '#5f8ee0'; ctx.fillRect(X, y + 4, L, 2);
      ctx.fillStyle = '#e9ecf2'; ctx.fillRect(X + 4, y + 12, L - 8, 3);
      for (let k = 0; k < Math.floor((L - 20) / 13); k++) { ctx.fillStyle = (k + e.c) % 4 ? '#ffe9a8' : '#4a5468'; ctx.fillRect(X + (d > 0 ? 6 : 16) + k * 13, y + 6, 9, 5); }
      ctx.fillStyle = '#ff9a3a'; ctx.fillRect(d > 0 ? front - 7 : front + 1, y + 6, 6, 5);
      ctx.fillStyle = '#fff3c4'; ctx.fillRect(d > 0 ? front - 2 : front, y + 17, 2, 4);
      ctx.fillStyle = '#ff3b3b'; ctx.fillRect(d > 0 ? X : X + L - 2, y + 17, 2, 4);
      lights.push({ cone: true, x: front, y: y + 18, d, c: 'rgba(255,235,170,.2)' }, { x: front, y: y + 18, r: 9, c: 'rgba(255,240,190,.55)' });
      return;
    }
    const [b, s, l] = RL_CORES[e.c % RL_CORES.length];
    ctx.fillStyle = K; ctx.fillRect(X - 1, y + 6, L + 2, 22);
    ctx.fillStyle = b; ctx.fillRect(X, y + 7, L, 16); ctx.fillStyle = s; ctx.fillRect(X, y + 23, L, 4);
    const c0 = X + Math.round(L * (d > 0 ? .22 : .3)), cw = Math.round(L * .48);
    ctx.fillStyle = '#1a2638'; ctx.fillRect(c0, y + 9, cw, 12); ctx.fillStyle = l; ctx.fillRect(c0 + 4, y + 10, cw - 8, 10);
    ctx.fillStyle = '#6f86a6'; ctx.fillRect(d > 0 ? c0 + cw - 2 : c0 + 1, y + 9, 1, 12);
    ctx.fillStyle = '#fff3c4'; const hx = d > 0 ? front - 2 : front; ctx.fillRect(hx, y + 8, 2, 3); ctx.fillRect(hx, y + 19, 2, 3);
    ctx.fillStyle = '#ff3b3b'; const tx = d > 0 ? X : X + L - 2; ctx.fillRect(tx, y + 8, 2, 3); ctx.fillRect(tx, y + 19, 2, 3);
    lights.push({ cone: true, x: front, y: y + 15, d, c: 'rgba(255,235,170,.2)' }, { x: front, y: y + 10, r: 7, c: 'rgba(255,240,190,.5)' }, { x: front, y: y + 20, r: 7, c: 'rgba(255,240,190,.5)' }, { x: tx + 1, y: y + 15, r: 9, c: 'rgba(255,50,50,.22)' });
  },
  trem(ln, y, t, lights) {
    const tr = ln.train, d = ln.dir, X = Math.round(tr.x * RL_TS), L = Math.round(tr.w * RL_TS), K = '#07050c', car = 96;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(X, y + 26, L, 4);
    for (let cx = 0; cx < L; cx += car) {
      const x = X + cx, w = Math.min(car - 3, L - cx);
      ctx.fillStyle = K; ctx.fillRect(x - 1, y + 1, w + 2, 27);
      ctx.fillStyle = '#4a5466'; ctx.fillRect(x, y + 2, w, 20); ctx.fillStyle = '#323a48'; ctx.fillRect(x, y + 22, w, 5); ctx.fillStyle = '#8a95a3'; ctx.fillRect(x, y + 2, w, 2);
      ctx.fillStyle = '#e86fa8'; ctx.fillRect(x, y + 17, w, 2);
      for (let k = 6; k < w - 8; k += 14) { ctx.fillStyle = '#bfefff'; ctx.fillRect(x + k, y + 7, 8, 6); }
    }
    const front = d > 0 ? X + L : X;
    ctx.fillStyle = '#ffd04a'; ctx.fillRect(d > 0 ? front - 10 : front, y + 2, 10, 25); ctx.fillStyle = '#fff3c4'; ctx.fillRect(d > 0 ? front - 3 : front, y + 8, 3, 3); ctx.fillRect(d > 0 ? front - 3 : front, y + 18, 3, 3);
    lights.push({ cone: true, x: front, y: y + 14, d, c: 'rgba(255,240,190,.32)' }, { x: front, y: y + 14, r: 22, c: 'rgba(255,240,190,.5)' });
  },
  // caixas de jogo boiando lado a lado (uma por casa), presas na mesma correnteza
  caixa(e, y, t) {
    const X0 = Math.round(e.x * RL_TS), n = Math.round(e.w), [b, s, a] = RL_CAIXAS[e.c % RL_CAIXAS.length];
    ctx.fillStyle = 'rgba(170,215,255,.22)'; ctx.fillRect(X0 - 2, y + 26, n * RL_TS + 4, 2);
    for (let k = 0; k < n; k++) {
      const X = X0 + k * RL_TS + 2, bob = Math.round(Math.sin(t * 3 + e.s + k * 1.7));
      ctx.fillStyle = '#07050c'; ctx.fillRect(X - 1, y + 3 + bob, 30, 24);
      ctx.fillStyle = b; ctx.fillRect(X, y + 4 + bob, 28, 17); ctx.fillStyle = s; ctx.fillRect(X, y + 21 + bob, 28, 5);
      ctx.fillStyle = '#f6f7f9'; ctx.fillRect(X, y + 4 + bob, 28, 3); ctx.fillStyle = s; ctx.fillRect(X + 2, y + 5 + bob, 8, 1);
      ctx.fillStyle = a; ctx.fillRect(X + 3, y + 8 + bob, 22, 11);
      // capa genérica: montanha, lua e estrelinhas, variando por caixa
      const v = (e.c + k) % 3, mx = X + 4 + v * 3;
      ctx.fillStyle = b; ctx.fillRect(mx + 5, y + 12 + bob, 2, 1); ctx.fillRect(mx + 4, y + 13 + bob, 4, 1); ctx.fillRect(mx + 2, y + 14 + bob, 8, 1); ctx.fillRect(mx, y + 15 + bob, 12, 4);
      ctx.fillStyle = '#ffd04a'; ctx.fillRect(X + 19 - v * 2, y + 10 + bob, 3, 3);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(X + 6 + v * 5, y + 10 + bob, 1, 1); ctx.fillRect(X + 22, y + 15 + bob, 1, 1);
    }
  },
  ia(t, lights) {
    const p = this.p, dead = this.dead;
    let vx = p.cx, vr = p.row, arc = 0;
    if (p.hop) { const k = clamp(p.hop.t / RL_HOP, 0, 1); vx = p.hop.fx + (p.cx - p.hop.fx) * k; vr = p.hop.fr + (p.row - p.hop.fr) * k; arc = Math.sin(k * Math.PI) * 7; }
    if (p.bump) { const k = Math.sin((p.bump.t / .12) * Math.PI) * .12; vx += p.bump.dx * k; vr += p.bump.dy * k; }
    const X = Math.round(vx * RL_TS - 14), Y = Math.round(H - (vr + 1 - this.camY) * RL_TS) - Math.round(arc);
    const groundY = Math.round(H - (vr + 1 - this.camY) * RL_TS);
    if (dead && (dead.k === 'agua' || dead.k === 'corre')) {
      const s = Math.min(26, dead.t * 50);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, groundY + 20); ctx.clip(); drawIA(X, Y + Math.round(s), 2, t, { flip: p.flip, dizzy: true }); ctx.restore();
      const rr = Math.round(6 + dead.t * 26); ctx.fillStyle = `rgba(190,230,255,${Math.max(0, .7 - dead.t * .5)})`; ctx.fillRect(X + 14 - rr, groundY + 19, rr * 2, 2);
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(X + 4, groundY + 27, 20, 4);
    if (dead && dead.k !== 'camera') {
      // atropelado: achatado, com estrelinhas
      ctx.save(); ctx.translate(X + 14, groundY + 30); ctx.scale(1.25, .55); drawIA(-14, -32, 2, t, { flip: p.flip, dizzy: true }); ctx.restore();
      for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.fillStyle = '#ffd04a'; ctx.fillRect(Math.round(X + 14 + Math.cos(a) * 14), Math.round(groundY + 8 + Math.sin(a) * 4), 2, 2); }
      return;
    }
    drawIA(X, Y, 2, t, { flip: p.flip, fast: !!p.hop, dizzy: dead && dead.k === 'camera' });
    lights.push({ x: X + 14, y: Y + 14, r: 20, c: 'rgba(127,220,255,.12)' });
  },
};
ARCADE_NOVOS.push(rlJogo);
