/* ============================================================ jogo: Fuga do Spoiler */
// Corrida sem fim vista de trás, numa rua de três faixas em noite de lançamento. O IAmiguinho corre sozinho;
// você troca de faixa, pula e abaixa. Atrás vem um Amiguinho com megafone querendo contar o final do jogo.
// Um tropeço: ele cola atrás de você por alguns segundos. Outro tropeço nesse tempo: ele alcança e solta o spoiler.
// Obstáculos: cavalete e caixas (pular), faixa de LANÇAMENTO (abaixar), carrinho de pipoca e fila de Amiguinhos (trocar de faixa),
// Amiguinho atravessando a rua (pular ou desviar). A velocidade cresce e padrões novos aparecem a cada quarteirão.
// Visão em perspectiva: a rua converge para o horizonte e tudo cresce ao chegar perto (projeção simples, z = distância à frente).
Music.define('spoiler', {
  bpm: 156,
  lead: bars('A5 . E5 . A5 . C6 . B5 . G5 . E5 - . .', 'F5 . A5 . C6 . F6 . E6 - D6 - C6 - . .', 'G5 . B5 . D6 . G6 . F6 . E6 . D6 . B5 .', 'C6 - B5 - A5 - G#5 - E5 - - - . . E5 G#5'),
  arp: bars('A4 . E5 A5 . E5 C5 . A4 . E5 A5 . E5 C5 .', 'F4 . C5 F5 . C5 A4 . F4 . C5 F5 . C5 A4 .', 'G4 . D5 G5 . D5 B4 . G4 . D5 G5 . D5 B4 .', 'E4 . B4 E5 . B4 G#4 . E4 . B4 E5 . B4 G#4 .'),
  bass: bars('A2 A2 . A3 A2 . A3 . A2 A2 . A3 A2 . G2 .', 'F2 F2 . F3 F2 . F3 . F2 F2 . F3 F2 . E2 .', 'G2 G2 . G3 G2 . G3 . G2 G2 . G3 G2 . A2 .', 'E2 E2 . E3 E2 . E3 . E2 . E2 . G#2 . B2 .'),
  drums: 'k . h k s . h . k k h . s . h s',
  mix: { arp: .55, lead: .9 },
});

// câmera: horizonte, distância focal, recuo e altura (o IAmiguinho fica em z = 0, pés em y ≈ 292)
const SP_HY = 112, SP_F = 187, SP_C = 2.6, SP_CH = 2.5, SP_FAR = 60, SP_RUA = 1.5, SP_CAL = 2.55, SP_SEG = 6;
const SP_K0 = SP_F / SP_C; // pixels por unidade em z = 0 (uma faixa ≈ 72 px)
const SP_PH = .9, SP_PH_BAIXO = .52, SP_G = 28, SP_PULO = 8.6;
// w: largura · d: profundidade · h: altura (baixo = dá para pular) · hb: altura da borda de baixo (alto = abaixar) · bloco: só desviando
const SP_TIPO = {
  cav: { w: .9, d: .3, h: .52, baixo: true },
  cx: { w: .8, d: .7, h: .5, baixo: true },
  placa: { w: .98, d: .25, hb: .66, alto: true },
  pip: { w: .82, d: 1.1, h: 1.5, bloco: true },
  fila: { w: .72, d: 3.1, h: .8, bloco: true },
  amg: { w: .62, d: .45, h: .74, baixo: true },
};
const SP_CORES = [['#ff8a3d', '#b85a1e'], ['#43d17a', '#238a4a'], ['#a77bff', '#6a45c0'], ['#4fb8ff', '#2a74b0'], ['#ffd23f', '#b8901e'], ['#ff6fb0', '#b24f80'], ['#e8ebee', '#8e969f'], ['#3bffe1', '#1f9a8a']];
const SP_PALS = SP_CORES.map(([a, b]) => ({ ...PAL, O: a, o: b, E: '#eef6ff' }));
const SP_PERSEG = { ...PAL, O: '#ff4d4d', o: '#a82a2a' };
// IAmiguinho de costas: correndo (dois passos), no ar e abaixado
const SP_IA_PE = [IA_COSTAS.slice(0, 15).concat(['....bb........']), IA_COSTAS.slice(0, 15).concat(['........bb....'])];
const SP_IA_AR = IA_COSTAS.slice(0, 14).concat(['...bCCCCCCb...', '...bb....bb...']);
const SP_IA_BAIXO = [0, 1, 2, 3, 4, 5, 7, 9, 11, 13, 15].map((i) => IA_COSTAS[i]);
// megafone visto de trás, com a boca virada para a frente (para cima na tela)
const SP_MEGA = ['.WWWWWW.', 'WRRRRRRW', '.WRRRRW.', '..WRRW..', '...RR...', '...KK...', '...KK...'];
const SP_MEGA_PAL = { ...PAL, W: '#f6f7f9', R: '#ff3d3d', K: '#1a2230' };
// ficha do fliperama girando (três larguras)
const SP_FICHA = [
  ['..YYY..', '.YyyyY.', 'YyYXYyY', 'YyXXXyY', 'YyYXYyY', '.YyyyY.', '..YYY..'],
  ['.YYY.', 'YyyyY', 'YyXyY', 'YXXXY', 'YyXyY', 'YyyyY', '.YYY.'],
  ['.Y.', 'YyY', 'YXY', 'YXY', 'YXY', 'YyY', '.Y.'],
];
const SP_FICHA_PAL = { ...PAL, Y: '#ffd23f', y: '#c27a1a', X: '#fff6c8' };
const SP_GRITOS = ['O FINAL É...', 'ESCUTA SÓ!', 'NO ÚLTIMO CHEFÃO...', 'SPOILER EM 3, 2...', 'ESPERA AÍ!', 'SABE QUEM SOME?', 'NA ÚLTIMA FASE...'];
const SP_SPOILERS = ['A última fase era o tutorial!', 'No fim, era tudo sonho do NPC!', 'O chefão é a lojinha de poção!', 'Tem cena pós-créditos. De 40 min!', 'O mapa inteiro era o menu!', 'No final, o save apaga sozinho!'];
const SP_LETREIROS = ['GAMES', 'FLIPER', 'LAN', 'PIXEL', 'ARCADE', 'CONSOLE'];
const SP_VIT = ['#7fdcff', '#ff6fb0', '#ffd23f', '#43d17a', '#a77bff', '#ff8a3d'];
function spH(k) { const s = Math.sin(k * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
const spFog = (z) => clamp((SP_FAR - z) / 14, 0, 1);

const spJogo = {
  id: 'spoiler', name: 'Fuga do Spoiler', tag: 'Corrida · 3 faixas', unit: 'pontos', ia: 950, bestKey: '.v1',
  desc: 'Corra na noite de lançamento sem ouvir o final.',
  how: 'Fuja do Amiguinho do megafone, que quer contar o final do jogo: troque de faixa, pule, abaixe e pegue as fichas. Um tropeço deixa ele colado em você; outro logo em seguida e é spoiler.',
  ctl: [['← →', 'trocar de faixa', 'pc'], ['↑ / Espaço', 'pular', 'pc'], ['↓', 'abaixar', 'pc'], ['Controle', 'direcional, ✕/A pula, ○/B abaixa', 'pc'],
    ['Deslizar', '← → faixa, ↑ pula, ↓ abaixa', 'touch'], ['Botões', 'na tela', 'touch']],
  pad: [['◀', 'ArrowLeft'], ['Pular', 'ArrowUp'], ['Abaixar', 'ArrowDown'], ['▶', 'ArrowRight']],
  rank: [['@duda', 4120], ['@carol', 3360], ['@rafa', 2580], ['@bia', 1490]],
  nota: 'eu já sabia o final, corri por esporte',
  falas: ['Noite de lançamento, fila dobrando a esquina e um Amiguinho de megafone querendo contar o final. Corre!', 'Eu nunca levo spoiler. Eu conto o final antes, aí ninguém me alcança kkkk', 'Tropeçou uma vez, ele cola. Tropeçou de novo, adeus surpresa. Eu nem ligo, já sei todos os finais lol', 'Faixa de LANÇAMENTO se passa por baixo. Cavalete se pula. Carrinho de pipoca se respeita.', 'Fone com cancelamento de ruído? Não. Perna com cancelamento de spoiler, hahaha'],

  init() {
    Object.assign(this, { t: 0, score: 0, dist: 0, vel: 11, px: 0, lane: 0, laneDe: 0, py: 0, vy: 0, duck: 0, jb: 0, inv: 0, slow: 0, tonto: 0, fichas: 0,
      perto: 0, pego: -1, frase: '', ck: 0, chx: 200, lado: 1, gritos: [], gritoT: .3, blaT: 0, nivel: 0, lvT: 0, obs: [], coins: [], fx: [],
      nextWz: 26, pax: 0, pay: 0, pdown: false, swObj: null, swDone: false, cam: 0, tropecos: 0, flash: 0 });
    while (this.nextWz < SP_FAR) this.padrao();
  },
  demo() {
    this.dist = 3; this.obs = []; this.coins = [];
    this.obs.push({ tp: 'cav', x: -1, wz: 6.2 }, { tp: 'placa', x: 1, wz: 8.5 }, { tp: 'pip', x: 0, wz: 13 }, { tp: 'fila', x: 1, wz: 17, cs: [2, 5, 1, 4] }, { tp: 'cx', x: -1, wz: 21 });
    for (let i = 0; i < 5; i++) this.coins.push({ x: 0, wz: 4.6 + i * 1.6, y: .35 });
    this.perto = 5; this.ck = 1; this.lado = 1; this.chx = 236;
    this.gritos = [{ s: 'O FINAL É...', t: .5, x: 236 }];
  },

  /* ---------- mundo */
  pj(x, y, z) { const s = SP_F / Math.max(.25, z + SP_C); return { s, x: W / 2 + (x - this.cam) * s, y: SP_HY + (SP_CH - y) * s }; },
  padrao() {
    const L = this.nivel, v = Math.max(11, Math.min(26, this.vel + 1)), Z = this.nextWz;
    const gap = v * Math.max(.62, 1.05 - L * .045), step = v * Math.max(.52, .72 - L * .02);
    const add = (tp, x, dz, o = {}) => { const ob = { tp, x, wz: Z + dz, ...o }; if (tp === 'fila') ob.cs = [0, 1, 2, 3].map(() => Math.floor(Math.random() * SP_CORES.length)); if (tp === 'amg') ob.c = Math.floor(Math.random() * SP_CORES.length); this.obs.push(ob); };
    const linha = (x, dz, n, sp = 1.5) => { for (let i = 0; i < n; i++) this.coins.push({ x, wz: Z + dz + i * sp, y: .35 }); };
    const arco = (x, dz) => { for (let i = 0; i < 6; i++) this.coins.push({ x, wz: Z + dz - 3.2 + i * 1.3, y: .35 + 1.05 * Math.sin(Math.PI * i / 5) }); };
    const lanes = () => [-1, 0, 1].sort(() => Math.random() - .5);
    const lista = [['um', 0, 3], ['dois', 0, 2.2], ['placa', 1, 2.4], ['fila', 2, 2], ['muro', 3, 2], ['tres', 3, 1.2], ['atravessa', 4, 1.8], ['zigue', 5, 1.6], ['corredor', 5, 1.2], ['combo', 6, 1.4]].filter(([, lv]) => L >= lv);
    let r = Math.random() * lista.reduce((a, [, , w]) => a + w, 0), k = lista[0][0];
    for (const [nm, , w] of lista) { r -= w; if (r <= 0) { k = nm; break; } }
    let len = 1.2;
    const [a, b, c] = lanes();
    if (k === 'um') { const tp = pick(['cav', 'cx', 'pip', 'cav']); add(tp, a, 0); if (tp === 'cav' && Math.random() < .5) arco(a, 0); else if (Math.random() < .7) linha(b, -2, 5); }
    else if (k === 'dois') { add(pick(['cav', 'cx', 'pip']), a, 0); add(pick(['pip', 'cx', 'cav']), b, Math.random() < .5 ? 0 : 1.5); if (Math.random() < .75) linha(c, -2, 6); len = 2.6; }
    else if (k === 'placa') { add('placa', a, 0); if (Math.random() < .5) add(L >= 3 ? 'placa' : 'pip', b, 0); if (Math.random() < .6) linha(c, -1, 5); else for (let i = 0; i < 4; i++) this.coins.push({ x: a, wz: Z - 2 + i * 1.3, y: .2 }); }
    else if (k === 'fila') { add('fila', a, 0); if (Math.random() < .5) add(pick(['cav', 'cx', 'fila']), b, Math.random() * 2); linha(c, 0, 5); len = 3.4; }
    else if (k === 'muro') { add(pick(['pip', 'fila']), a, 0); add(pick(['pip', 'fila', 'pip']), b, 0); const tp = pick(['cav', 'cx', 'placa']); add(tp, c, 0); if (tp === 'cav') arco(c, 0); len = 3.2; }
    else if (k === 'tres') { const tp = pick(['cav', 'placa', 'misto']); for (const x of [-1, 0, 1]) add(tp === 'misto' ? pick(['cav', 'cx', 'placa']) : tp, x, 0); if (tp === 'cav') arco(pick([-1, 0, 1]), 0); }
    else if (k === 'atravessa') { const x0 = pick([-1.2, 1.2]); add('amg', x0, 0, { vx: -Math.sign(x0) * rand(1.4, 2.1) }); if (Math.random() < .5) add('cx', pick([-1, 1]), step); linha(0, -3, 4); len = step + 1; }
    else if (k === 'zigue') {
      let f = pick([-1, 0, 1]); const n = 3 + (L >= 8 ? 1 : 0);
      for (let i = 0; i < n; i++) { for (const x of [-1, 0, 1]) if (x !== f) add(pick(['pip', 'cx', 'cav', 'pip']), x, i * step); this.coins.push({ x: f, wz: Z + i * step + .3, y: .35 }); f = f === 0 ? pick([-1, 1]) : 0; }
      len = (n - 1) * step + 1.2;
    }
    else if (k === 'corredor') { add('fila', a, 0); add('fila', a, 3.3); add('fila', b, 1); add('fila', b, 4.3); add('cx', c, 1); add('placa', c, 1 + v * .9); linha(c, 2.4, 3, 1.2); len = 7.6; }
    else if (k === 'combo') { const dz2 = v * .9; add('cav', a, 0); add('placa', a, dz2); add('fila', b, 0); add('pip', c, .5); add('fila', c, dz2 - 1); arco(a, 0); len = dz2 + 1; }
    this.nextWz = Z + len + gap;
  },
  tropeca() {
    if (this.inv > 0) return;
    this.inv = .55; this.slow = 1; this.tonto = .7; this.tropecos++; shake = .25; sfx.hit();
    if (this.perto > 0) { this.pego = 0; this.frase = pick(SP_SPOILERS); this.gritos = []; shake = .45; this.flash = 1; beep(196, .6, 'sawtooth', .07, 60); setTimeout(() => beep(150, .5, 'square', .05, -60), 160); }
    else { this.perto = 7; this.gritos.push({ s: 'ACHEI VOCÊ!', t: 0, x: this.chx }); this.gritoT = 1.2; }
  },

  /* ---------- entrada: teclado, controle, botões da tela e deslizar o dedo */
  entrada() {
    let L = pressedAny('ArrowLeft', 'KeyA', 'PadLB') || (inp.ax < -.5 && this.pax >= -.5);
    let R = pressedAny('ArrowRight', 'KeyD', 'PadRB') || (inp.ax > .5 && this.pax <= .5);
    let U = pressedAny('Space', 'ArrowUp', 'KeyW') || (inp.ay < -.5 && this.pay >= -.5);
    let D = pressedAny('ArrowDown', 'KeyS', 'PadB') || (inp.ay > .5 && this.pay <= .5) || (inp.down && !this.pdown);
    this.pax = inp.ax; this.pay = inp.ay; this.pdown = !!inp.down;
    const d = inp.drag;
    if (d && d !== this.swObj) { this.swObj = d; this.swDone = false; }
    if (d && !this.swDone) {
      const dx = d.x - d.x0, dy = d.y - d.y0;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 14) { this.swDone = true; if (Math.abs(dx) > Math.abs(dy)) { if (dx < 0) L = true; else R = true; } else if (dy < 0) U = true; else D = true; }
    }
    const segura = keys.has('ArrowDown') || keys.has('KeyS') || !!inp.down;
    return { L, R, U, D, segura };
  },
  update(dt) {
    this.t += dt;
    for (const f of this.fx) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 300 * dt; }
    this.fx = this.fx.filter((f) => f.t < f.life);
    for (const g of this.gritos) g.t += dt;
    this.gritos = this.gritos.filter((g) => g.t < 1.2);
    for (const o of this.obs) if (o.hit) o.kT += dt;
    this.flash = Math.max(0, this.flash - dt * 1.5);
    // alcançou: o mundo para, o Amiguinho chega do lado e conta o final
    if (this.pego >= 0) {
      this.pego += dt; this.vel *= Math.pow(.03, dt); this.dist += this.vel * dt;
      this.ck = Math.min(1.7, this.ck + dt * 2); this.chx += (clamp(this.sx() + this.lado * 46, 40, 280) - this.chx) * Math.min(1, dt * 6);
      this.py = Math.max(0, this.py + this.vy * dt); this.vy -= SP_G * dt;
      return this.pego > 2.8;
    }
    const nv = Math.floor(this.t / 14);
    if (nv > this.nivel) { this.nivel = nv; this.lvT = 1.8; sfx.point(); }
    this.lvT = Math.max(0, this.lvT - dt);
    this.slow = Math.max(0, this.slow - dt / 1.4);
    this.vel = Math.min(26, 11 + this.t * .1) * (1 - .4 * this.slow);
    const dz = this.vel * dt; this.dist += dz;
    this.inv = Math.max(0, this.inv - dt); this.tonto = Math.max(0, this.tonto - dt);
    // entrada
    const c = this.entrada();
    if (c.L || c.R) {
      const alvo = this.lane + (c.L ? -1 : 1);
      if (alvo < -1 || alvo > 1) { shake = .06; beep(140, .06, 'square', .03); }
      else { this.laneDe = this.lane; this.lane = alvo; beep(620, .04, 'triangle', .03, 120); }
    }
    if (c.U) this.jb = .15; else this.jb = Math.max(0, this.jb - dt);
    const noChao = this.py <= 0;
    if (c.D) { if (!noChao) this.vy = Math.min(this.vy, -16); this.duck = .62; this.jb = 0; if (noChao) beep(300, .05, 'triangle', .03, -120); }
    if (c.segura && this.duck > 0) this.duck = Math.max(this.duck, .12);
    if (this.jb > 0 && noChao) { this.vy = SP_PULO; this.duck = 0; this.jb = 0; sfx.flap(); }
    this.duck = Math.max(0, this.duck - dt);
    this.vy -= SP_G * dt; this.py += this.vy * dt; if (this.py <= 0) { this.py = 0; this.vy = 0; }
    const px0 = this.px; this.px += clamp(this.lane - this.px, -10 * dt, 10 * dt);
    // perseguidor
    this.perto = Math.max(0, this.perto - dt);
    const perto = this.perto > 0 || this.t < 2.2;
    this.ck += ((perto ? 1 : 0) - this.ck) * Math.min(1, dt * (perto ? 5 : 1.6));
    const lado = this.lane > 0 ? -1 : this.lane < 0 ? 1 : this.lado; this.lado = lado;
    this.chx += (clamp(this.sx() + lado * 70, 34, 286) - this.chx) * Math.min(1, dt * 4);
    if (this.t < .05 && !this.gritos.length) this.gritos.push({ s: 'EI! QUER SABER O FINAL?', t: 0, x: this.chx });
    if (this.perto > 0) {
      this.gritoT -= dt; if (this.gritoT <= 0) { this.gritoT = 1.3; this.gritos.push({ s: pick(SP_GRITOS), t: 0, x: this.chx }); }
      this.blaT -= dt; if (this.blaT <= 0) { this.blaT = .22; beep(rand(170, 260), .07, 'square', .018); }
    }
    // pista
    while (this.nextWz < this.dist + SP_FAR) this.padrao();
    for (const o of this.obs) if (o.tp === 'amg' && !o.hit) { o.x += o.vx * dt; if (Math.abs(o.x) > 1.25) { o.x = Math.sign(o.x) * 1.25; o.vx = -o.vx; } }
    // batidas
    const ph = this.duck > 0 ? SP_PH_BAIXO : SP_PH;
    if (this.inv <= 0) for (const o of this.obs) {
      if (o.hit) continue;
      const T = SP_TIPO[o.tp], z0 = o.wz - this.dist, z1 = z0 + T.d;
      if (z0 > .32 || z1 < -.32 || Math.abs(this.px - o.x) > T.w / 2 + .2) continue;
      const bate = T.bloco || (T.baixo && this.py < T.h - .04) || (T.alto && this.py + ph > T.hb);
      if (!bate) continue;
      const lateral = z0 + dz < .32 && Math.abs(px0 - o.x) > T.w / 2 + .2;
      if (lateral && this.laneDe !== this.lane) { this.lane = this.laneDe; }
      else { o.hit = true; o.kT = 0; o.kd = this.px > o.x ? -1 : 1; }
      this.tropeca();
      for (let n = 0; n < 10; n++) this.fx.push({ x: this.sx() + rand(-10, 10), y: 270 + rand(-20, 10), vx: rand(-90, 90), vy: rand(-160, -60), t: 0, life: rand(.4, .7), c: pick(['#ffd04a', '#ffffff', '#ff6fb0']) });
      break;
    }
    if (this.pego >= 0) return false;
    // fichas
    for (const k of this.coins) {
      if (k.got) continue;
      const z = k.wz - this.dist;
      if (Math.abs(z) < .5 && Math.abs(this.px - k.x) < .45 && k.y > this.py - .2 && k.y < this.py + ph + .1) {
        k.got = true; this.fichas++; sfx.coin();
        for (let n = 0; n < 4; n++) this.fx.push({ x: this.sx() + rand(-12, 12), y: 262 - this.py * SP_K0, vx: rand(-40, 40), vy: rand(-120, -60), t: 0, life: .4, c: '#ffd23f' });
      }
    }
    this.obs = this.obs.filter((o) => o.wz + SP_TIPO[o.tp].d - this.dist > -3);
    this.coins = this.coins.filter((k) => !k.got && k.wz - this.dist > -2);
    this.score = Math.floor(this.dist) + this.fichas * 10;
    return false;
  },
  sx() { return W / 2 + (this.px - this.px * .45) * SP_K0; },

  /* ---------- desenho */
  poly(pts, col) { ctx.fillStyle = col; ctx.beginPath(); pts.forEach(([x, y, z], i) => { const p = this.pj(x, y, z); if (i) ctx.lineTo(Math.round(p.x), Math.round(p.y)); else ctx.moveTo(Math.round(p.x), Math.round(p.y)); }); ctx.fill(); },
  // retângulo de frente para a câmera (x0..x1, y0..y1 no mundo, na profundidade z)
  rect(x0, x1, y0, y1, z, col) { const a = this.pj(x0, y1, z), b = this.pj(x1, y0, z); const l = Math.round(a.x), tp = Math.round(a.y); ctx.fillStyle = col; ctx.fillRect(l, tp, Math.max(1, Math.round(b.x) - l), Math.max(1, Math.round(b.y) - tp)); return { l, t: tp, r: Math.round(b.x), b: Math.round(b.y), s: a.s }; },
  caixa(x, z, w, d, h, y0, cF, cT, cS) {
    const xl = x - w / 2, xr = x + w / 2, yt = y0 + h, zb = z + d;
    if (xl > this.cam) this.poly([[xl, y0, z], [xl, yt, z], [xl, yt, zb], [xl, y0, zb]], cS);
    if (xr < this.cam) this.poly([[xr, y0, z], [xr, yt, z], [xr, yt, zb], [xr, y0, zb]], cS);
    if (yt < SP_CH) this.poly([[xl, yt, z], [xr, yt, z], [xr, yt, zb], [xl, yt, zb]], cT);
    return this.rect(xl, xr, y0, yt, z, cF);
  },
  // sprite em pé no chão do mundo, com escala inteira (vira um bloquinho quando está longe)
  boneco(rows, x, z, hW, pal, cor, yOff = 0, flip = false) {
    const p = this.pj(x, yOff, z), raw = (hW * p.s) / rows.length;
    if (raw < .8) { const w = Math.max(1, Math.round(rows[0].length * raw)), h = Math.max(1, Math.round(rows.length * raw)); ctx.fillStyle = cor; ctx.fillRect(Math.round(p.x - w / 2), Math.round(p.y - h), w, h); return; }
    const si = Math.max(1, Math.round(raw)), w = rows[0].length * si;
    spr(rows, Math.round(p.x - w / 2), Math.round(p.y - rows.length * si), si, flip, pal);
  },
  ceu(t) {
    const g = ctx.createLinearGradient(0, 0, 0, SP_HY); g.addColorStop(0, '#07061a'); g.addColorStop(1, '#2b1446'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, SP_HY + 1);
    stars(t, 1, 7);
    // holofotes do lançamento varrendo o céu
    for (const [bx, ph, col] of [[96, 0, 'rgba(127,220,255,.07)'], [226, 2.1, 'rgba(255,111,176,.07)']]) {
      const a = Math.sin(t * .6 + ph) * .55, hx = bx - this.cam * 6, tx = hx + Math.sin(a) * 160, ty = SP_HY - Math.cos(a) * 160;
      const nx = Math.cos(a) * 16, ny = Math.sin(a) * 16;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(hx - 2, SP_HY - 20); ctx.lineTo(hx + 2, SP_HY - 20); ctx.lineTo(tx + nx, ty + ny); ctx.lineTo(tx - nx, ty - ny); ctx.fill();
    }
    // prédios ao longe
    const off = this.cam * 10;
    for (let i = -4; i < 60; i++) {
      const x = Math.round(i * 7 - off), h = 10 + Math.floor(spH(i * 3.1) * 30) + (Math.abs(x - 160) < 50 ? 8 : 0);
      ctx.fillStyle = '#120d26'; ctx.fillRect(x, SP_HY - h, 7, h);
      for (let wy = SP_HY - h + 3; wy < SP_HY - 3; wy += 4) for (let wx = 1; wx < 6; wx += 3) if (spH(i * 17 + wy * 1.3 + wx) > .78) { ctx.fillStyle = spH(i + wy) > .5 ? 'rgba(255,208,74,.55)' : 'rgba(127,220,255,.45)'; ctx.fillRect(x + wx, wy, 1, 1); }
    }
    // a loja do lançamento no fim da rua
    const lx = Math.round(W / 2 - this.cam * 2.6), pis = Math.floor(t * 2) % 2;
    ctx.fillStyle = '#1b1236'; ctx.fillRect(lx - 30, SP_HY - 30, 60, 30);
    ctx.fillStyle = pis ? '#ff6fb0' : '#ff8fc4'; ctx.fillRect(lx - 34, SP_HY - 42, 68, 12);
    ctx.fillStyle = '#07050c'; ctx.fillRect(lx - 33, SP_HY - 41, 66, 10);
    ctx.font = '800 8px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = pis ? '#ff6fb0' : '#ffd23f'; ctx.fillText('LANÇAMENTO', lx, SP_HY - 33); ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,208,74,.5)'; ctx.fillRect(lx - 24, SP_HY - 22, 48, 18);
    ctx.fillStyle = 'rgba(255,111,176,.12)'; ctx.fillRect(lx - 60, SP_HY - 50, 120, 50);
  },
  rua() {
    const d = this.dist;
    for (let y = SP_HY + 1; y < H; y++) {
      const s = (y - SP_HY) / SP_CH, z = SP_F / s - SP_C, wz = z + d, cx = W / 2 - this.cam * s, perto = z < 32;
      const band = perto ? Math.floor(wz / 2) & 1 : 0;
      ctx.fillStyle = band ? '#272342' : '#211d3a'; ctx.fillRect(0, y, W, 1);
      const r0 = Math.round(cx - SP_RUA * s), r1 = Math.round(cx + SP_RUA * s);
      ctx.fillStyle = band ? '#17182d' : '#131427'; ctx.fillRect(r0, y, r1 - r0, 1);
      const cw = Math.max(1, Math.round(.08 * s));
      ctx.fillStyle = perto && (Math.floor(wz) & 1) ? '#e8ebee' : '#ff5fa2'; ctx.fillRect(r0 - cw, y, cw, 1); ctx.fillRect(r1, y, cw, 1);
      if (!perto || (Math.floor(wz / 1.6) & 1) === 0) { const lw = Math.max(1, Math.round(.05 * s)); ctx.fillStyle = perto ? '#8a8fb0' : '#3a3c5a'; for (const lx of [-.5, .5]) ctx.fillRect(Math.round(cx + lx * s - lw / 2), y, lw, 1); }
    }
    // neblina perto do horizonte
    const g = ctx.createLinearGradient(0, SP_HY, 0, SP_HY + 30); g.addColorStop(0, 'rgba(43,20,70,1)'); g.addColorStop(1, 'rgba(43,20,70,0)'); ctx.fillStyle = g; ctx.fillRect(0, SP_HY, W, 30);
  },
  predios(t) {
    const d = this.dist, k0 = Math.floor((d - 2) / SP_SEG), k1 = Math.floor((d + SP_FAR + 8) / SP_SEG);
    for (let k = k1; k >= k0; k--) for (const sd of [-1, 1]) {
      const z0 = Math.max(-1.6, k * SP_SEG - d), z1 = (k + 1) * SP_SEG - d; if (z1 <= z0) continue;
      const id = k * 2 + (sd > 0 ? 1 : 0), r = spH(id), h = 3.2 + r * 2.6, X = sd * SP_CAL, zz = k * SP_SEG - d;
      ctx.globalAlpha = spFog(z0 + 2);
      this.poly([[X, 0, z0], [X, h, z0], [X, h, z1], [X, 0, z1]], ['#1d1733', '#231a3d', '#191a33', '#24173a'][Math.floor(r * 4)]);
      // vitrine acesa
      const vc = SP_VIT[Math.floor(spH(id + .5) * SP_VIT.length)], v0 = Math.max(z0, zz + .6), v1 = zz + SP_SEG - .6;
      if (v1 > v0) {
        ctx.globalAlpha *= .55; this.poly([[X, .12, v0], [X, 1.3, v0], [X, 1.3, v1], [X, .12, v1]], vc); ctx.globalAlpha = spFog(z0 + 2);
        // caixilhos e a porta da loja
        for (let q = zz + 1.7; q < v1 - .1; q += 1.15) if (q > z0) this.poly([[X, .12, q], [X, 1.3, q], [X, 1.3, q + .09], [X, .12, q + .09]], '#120d26');
        this.poly([[X, 1.26, v0], [X, 1.34, v0], [X, 1.34, v1], [X, 1.26, v1]], '#120d26');
        this.poly([[X, 1.42, Math.max(z0, zz + .2)], [X, 1.62, Math.max(z0, zz + .2)], [X, 1.62, zz + SP_SEG - .2], [X, 1.42, zz + SP_SEG - .2]], vc);
      }
      // janelas de cima
      for (let fy = 2.1; fy < h - .4; fy += .8) for (let wi = 0; wi < 4; wi++) {
        const a = zz + .6 + wi * 1.35, b = a + .6; if (b <= z0) continue;
        if (spH(id * 7 + wi + fy * 3) < .45) continue;
        ctx.fillStyle = spH(id + wi + fy) > .5 ? 'rgba(255,208,74,.35)' : 'rgba(127,220,255,.25)';
        this.poly([[X, fy, Math.max(z0, a)], [X, fy + .36, Math.max(z0, a)], [X, fy + .36, b], [X, fy, b]], ctx.fillStyle);
      }
    }
    ctx.globalAlpha = 1;
  },
  draw(t = this.t) {
    this.cam = this.px * .45;
    const d = this.dist;
    this.ceu(t); this.rua(); this.predios(t);
    const L = [];
    // decoração das calçadas: postes, letreiros e filas de fãs
    const m0 = Math.floor((d - 2) / 9), m1 = Math.floor((d + SP_FAR) / 9);
    for (let m = m0; m <= m1; m++) for (const sd of [-1, 1]) {
      const z = m * 9 + (sd > 0 ? 4.5 : 0) - d; if (z < -1.4 || z > SP_FAR) continue;
      L.push({ z, f: () => this.poste(sd, z, t) });
    }
    const k0 = Math.floor((d - 2) / SP_SEG), k1 = Math.floor((d + SP_FAR) / SP_SEG);
    for (let k = k0; k <= k1; k++) for (const sd of [-1, 1]) {
      const id = k * 2 + (sd > 0 ? 1 : 0), zz = k * SP_SEG - d;
      if (spH(id * 3.3) < .5) { const z = zz + 1.2, txt = spH(id * 5.1) < .35 ? 'LANÇAMENTO' : SP_LETREIROS[Math.floor(spH(id * 2.7) * SP_LETREIROS.length)]; if (z > -1.4 && z < SP_FAR) L.push({ z, f: () => this.letreiro(sd, z, txt, id, t) }); }
      if (spH(id * 9.7) < .45) for (let n = 0; n < 5; n++) { const z = zz + 1.6 + n * .85; if (z < -1.4 || z > SP_FAR) continue; const ci = Math.floor(spH(id * 11 + n) * SP_CORES.length), bob = Math.floor(t * 3 + n + id) % 4 === 0 ? .03 : 0; L.push({ z, f: () => { ctx.globalAlpha = spFog(z); this.boneco(BOT_COSTAS, sd * 2.12, z, .56, SP_PALS[ci], SP_CORES[ci][1], bob); ctx.globalAlpha = 1; } }); }
    }
    // pista
    for (const o of this.obs) {
      const z = o.wz - d; if (z > SP_FAR || z + SP_TIPO[o.tp].d < -1.5) continue;
      if (o.tp === 'fila') { for (let n = 0; n < 4; n++) { const zn = z + .2 + n * .9; if (zn > -1.5) L.push({ z: zn, f: () => this.membroFila(o, n, zn, t) }); } }
      else L.push({ z: z + (o.tp === 'placa' ? 0 : SP_TIPO[o.tp].d * .5), f: () => this.obstaculo(o, z, t) });
      // sombra
      if (!o.hit && z > -1 && z < 40) { const T = SP_TIPO[o.tp]; ctx.globalAlpha = spFog(z) * .5; this.poly([[o.x - T.w / 2 - .05, 0, z - .05], [o.x + T.w / 2 + .05, 0, z - .05], [o.x + T.w / 2 + .05, 0, z + T.d + .1], [o.x - T.w / 2 - .05, 0, z + T.d + .1]], '#07050c'); ctx.globalAlpha = 1; }
    }
    for (const k of this.coins) { const z = k.wz - d; if (z > -.6 && z < SP_FAR - 10) L.push({ z, f: () => this.ficha(k, z, t) }); }
    L.push({ z: 0.01, f: () => this.ia(t) });
    L.sort((a, b) => b.z - a.z);
    for (const e of L) e.f();
    ctx.globalAlpha = 1;
    // faíscas
    for (const f of this.fx) { ctx.globalAlpha = clamp((f.life - f.t) * 3, 0, 1); ctx.fillStyle = f.c; ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2); }
    ctx.globalAlpha = 1;
    this.perseguidor(t);
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,40,60,${this.flash * .35})`; ctx.fillRect(0, 0, W, H); }
    if (state !== 'play') return;
    if (this.lvT > 0 && this.pego < 0) {
      ctx.globalAlpha = Math.min(1, this.lvT * 2); ctx.textAlign = 'center'; ctx.font = F_MID; ctx.lineWidth = 4; ctx.strokeStyle = '#07050c';
      const s = `QUARTEIRÃO ${this.nivel + 1}`; ctx.strokeText(s, W / 2, 150); ctx.fillStyle = '#ffd23f'; ctx.fillText(s, W / 2, 150); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
    if (this.pego > .35) {
      ctx.fillStyle = `rgba(120,10,30,${Math.min(.35, (this.pego - .35) * .6)})`; ctx.fillRect(0, 0, W, H);
      banner([['SPOILER!', '900 34px Archivo, sans-serif', '#ff4d4d'], [this.frase.toUpperCase(), F_SM, '#ffffff'], [`${Math.floor(this.dist)} m · quarteirão ${this.nivel + 1}`, F_SM, '#c3c9cf']], 168);
    }
  },
  poste(sd, z, t) {
    ctx.globalAlpha = spFog(z);
    const X = sd * 1.85;
    this.rect(X - .04, X + .04, 0, 2.6, z, '#3a3f58');
    this.rect(X - (sd > 0 ? .42 : -.02), X + (sd > 0 ? .02 : .42), 2.52, 2.6, z, '#3a3f58');
    const hx = X - sd * .38, r = this.rect(hx - .12, hx + .12, 2.44, 2.54, z, '#fff1b8');
    if (r.s > 8) { ctx.fillStyle = 'rgba(255,230,160,.12)'; ctx.fillRect(r.l - 6, r.t - 4, r.r - r.l + 12, r.b - r.t + 10); }
    ctx.globalAlpha = 1;
  },
  letreiro(sd, z, txt, id, t) {
    ctx.globalAlpha = spFog(z);
    const X = sd * (SP_CAL - .5), w = txt.length > 6 ? .9 : .6, col = SP_VIT[Math.floor(spH(id * 4.4) * SP_VIT.length)], on = (Math.floor(t * 2 + id) % 7) !== 0;
    this.rect(X - w / 2 - .03, X + w / 2 + .03, 1.98, 2.5, z, '#07050c');
    const r = this.rect(X - w / 2, X + w / 2, 2.01, 2.47, z, on ? col : '#2a2440');
    if (r.r - r.l > 3) { ctx.fillStyle = '#0d0a1c'; ctx.fillRect(r.l + 1, r.t + 1, r.r - r.l - 2, r.b - r.t - 2); }
    const fs = Math.floor((r.r - r.l) / (txt.length * .66));
    if (fs >= 6) { ctx.font = `800 ${Math.min(fs, 22)}px Archivo, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = on ? col : '#3a3352'; ctx.fillText(txt, Math.round((r.l + r.r) / 2), Math.round((r.t + r.b) / 2 + Math.min(fs, 22) * .36)); ctx.textAlign = 'left'; }
    ctx.globalAlpha = 1;
  },
  membroFila(o, n, z, t) {
    ctx.globalAlpha = spFog(z);
    let x = o.x, y = 0;
    if (o.hit) { const k = Math.min(1, o.kT * 2.2); x += o.kd * k * (.6 + n * .25); y = Math.sin(k * Math.PI) * .5; ctx.globalAlpha *= 1 - Math.max(0, o.kT - .5) * 2; if (o.kT > 1) { ctx.globalAlpha = 1; return; } }
    const ci = o.cs[n], hop = !o.hit && (Math.floor(t * 4 + n * 1.7 + o.wz) % 5 === 0) ? .04 : 0;
    this.boneco(BOT, x, z, SP_TIPO.fila.h, SP_PALS[ci], SP_CORES[ci][0], y + hop);
    ctx.globalAlpha = 1;
  },
  ficha(k, z, t) {
    ctx.globalAlpha = spFog(z + 10);
    const fr = [0, 1, 2, 1][Math.floor(t * 8 + k.wz * .7) % 4];
    this.boneco(SP_FICHA[fr], k.x, z, .32, SP_FICHA_PAL, '#ffd23f', k.y + Math.sin(t * 5 + k.wz) * .03);
    ctx.globalAlpha = 1;
  },
  obstaculo(o, z, t) {
    ctx.save(); ctx.globalAlpha = spFog(z);
    let x = o.x, y0 = 0;
    if (o.hit) {
      const k = Math.min(1, o.kT * 2.4); x += o.kd * k * .9; y0 = Math.sin(k * Math.PI) * .6;
      ctx.globalAlpha *= clamp(1 - (o.kT - .4) * 2.5, 0, 1); if (o.kT > .8) { ctx.restore(); return; }
    }
    const T = SP_TIPO[o.tp], hw = T.w / 2, pisca = Math.floor(t * 4 + o.wz) % 2;
    if (o.tp === 'cav') {
      this.rect(x - hw + .04, x - hw + .1, y0, y0 + .3, z, '#4a3a2a'); this.rect(x + hw - .1, x + hw - .04, y0, y0 + .3, z, '#4a3a2a');
      const r = this.rect(x - hw, x + hw, y0 + .26, y0 + .5, z, '#07050c');
      const n = 6, wpx = (r.r - r.l) / n; if (wpx >= 1) for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? '#f6f7f9' : '#ff7a1a'; ctx.fillRect(Math.round(r.l + i * wpx), r.t + 1, Math.max(1, Math.round(wpx)), Math.max(1, r.b - r.t - 2)); }
      const l = this.rect(x - .05, x + .05, y0 + .5, y0 + .58, z, pisca ? '#ffd04a' : '#8a6a1a');
      if (pisca && l.s > 10) { ctx.fillStyle = 'rgba(255,208,74,.18)'; ctx.fillRect(l.l - 5, l.t - 5, l.r - l.l + 10, l.b - l.t + 10); }
    } else if (o.tp === 'cx') {
      const r = this.caixa(x, z, T.w, T.d, T.h, y0, '#a8794a', '#c99a62', '#7a5634');
      const fx = Math.round((r.l + r.r) / 2), tw = Math.max(1, Math.round((r.r - r.l) * .12));
      ctx.fillStyle = '#d8c39a'; ctx.fillRect(fx - Math.floor(tw / 2), r.t, tw, r.b - r.t);
      if (r.s > 20) { ctx.fillStyle = '#5a4428'; const u = Math.round(r.s * .08); ctx.fillRect(r.l + u, r.t + u, u * 2, u); ctx.fillRect(r.l + u * 1.5, r.t + u * 2, u, u * 2); }
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(r.l, r.b - Math.max(1, Math.round(r.s * .04)), r.r - r.l, Math.max(1, Math.round(r.s * .04)));
    } else if (o.tp === 'placa') {
      this.rect(x - hw, x - hw + .06, y0, y0 + 1.3, z, '#5d6875'); this.rect(x + hw - .06, x + hw, y0, y0 + 1.3, z, '#5d6875');
      const r = this.rect(x - hw, x + hw, y0 + T.hb, y0 + 1.22, z, pisca ? '#ffd04a' : '#ff9a4a');
      const b = Math.max(1, Math.round(r.s * .03));
      ctx.fillStyle = '#c0245e'; ctx.fillRect(r.l + b, r.t + b, r.r - r.l - b * 2, r.b - r.t - b * 2);
      const fs = Math.floor((r.r - r.l - b * 4) / 7.4);
      if (fs >= 5) { ctx.font = `900 ${fs}px Archivo, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe9a0'; ctx.fillText('LANÇAMENTO', Math.round((r.l + r.r) / 2), Math.round((r.t + r.b) / 2 + fs * .36)); ctx.textAlign = 'left'; }
      else { ctx.fillStyle = '#ffe9a0'; ctx.fillRect(r.l + b * 2, Math.round((r.t + r.b) / 2), Math.max(1, r.r - r.l - b * 4), 1); }
      if (r.s > 14) { ctx.fillStyle = 'rgba(255,111,176,.16)'; ctx.fillRect(r.l - 4, r.t - 4, r.r - r.l + 8, r.b - r.t + 8); }
    } else if (o.tp === 'pip') {
      const base = this.caixa(x, z, T.w, T.d, .62, y0 + .12, '#d8343a', '#b02a30', '#8a1f24');
      const n = 5, wpx = (base.r - base.l) / n; if (wpx >= 2) for (let i = 1; i < n; i += 2) { ctx.fillStyle = '#f6f7f9'; ctx.fillRect(Math.round(base.l + i * wpx), base.t, Math.max(1, Math.round(wpx)), base.b - base.t); }
      const vid = this.caixa(x, z + .1, T.w - .12, T.d - .2, .55, y0 + .74, '#ffe27a', '#fff1b8', '#d8b850');
      if (vid.s > 12) { const u = Math.max(1, Math.round(vid.s * .05)); for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 3 ? '#fff6dc' : '#f0c040'; ctx.fillRect(Math.round(vid.l + spH(o.wz + i) * (vid.r - vid.l - u)), Math.round(vid.b - u - spH(o.wz * 2 + i) * (vid.b - vid.t) * .55), u, u); } }
      ctx.fillStyle = '#8a1f24'; ctx.fillRect(vid.l, vid.t, vid.r - vid.l, Math.max(1, Math.round(vid.s * .03)));
      const teto = this.caixa(x, z - .05, T.w + .1, T.d + .1, .14, y0 + 1.3, '#f6f7f9', '#e8443a', '#b02a30');
      const tn = 6, tw = (teto.r - teto.l) / tn; if (tw >= 1) for (let i = 0; i < tn; i += 2) { ctx.fillStyle = '#e8443a'; ctx.fillRect(Math.round(teto.l + i * tw), teto.t, Math.max(1, Math.round(tw)), teto.b - teto.t); }
      for (const wx of [x - hw + .14, x + hw - .14]) this.rect(wx - .08, wx + .08, y0, y0 + .14, z, '#07050c');
      if (vid.s > 22) { const fs = Math.floor(vid.s * .13); ctx.font = `900 ${fs}px Archivo, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.fillText('PIPOCA', Math.round((base.l + base.r) / 2), Math.round(base.t + (base.b - base.t) * .62)); ctx.textAlign = 'left'; }
    } else if (o.tp === 'amg') {
      const ci = o.c ?? 0, passo = !o.hit && Math.floor(t * 8) % 2 ? .04 : 0;
      this.boneco(BOT, x, z, T.h, SP_PALS[ci], SP_CORES[ci][0], y0 + passo, o.vx < 0);
      const p = this.pj(x + (o.vx > 0 ? .3 : -.3), y0 + .5, z);
      if (p.s > 10) { const u = Math.max(1, Math.round(p.s * .05)); ctx.fillStyle = '#2e6fd8'; ctx.fillRect(Math.round(p.x - u * 2), Math.round(p.y - u * 3), u * 4, u * 5); ctx.fillStyle = '#f6f7f9'; ctx.fillRect(Math.round(p.x - u), Math.round(p.y - u * 2), u * 2, u); }
    }
    ctx.restore();
  },
  ia(t) {
    const x = Math.round(this.sx()), chao = Math.round(SP_HY + SP_CH * SP_K0), y = chao - Math.round(this.py * SP_K0);
    // sombra
    const sw = Math.max(8, 26 - this.py * 10); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x - Math.round(sw), chao - 2, Math.round(sw * 2), 4);
    let rows, s = 4, jx = 0;
    if (this.tonto > 0) jx = Math.round(Math.sin(t * 40) * 2);
    const run = state === 'play' && this.pego < 0;
    if (this.py > 0) rows = SP_IA_AR;
    else if (this.duck > 0 && this.pego < 0) rows = SP_IA_BAIXO;
    else rows = run ? SP_IA_PE[Math.floor(t * 10) % 2] : IA_COSTAS;
    const bob = run && this.py <= 0 && this.duck <= 0 ? (Math.floor(t * 10) % 2) * 2 : 0;
    const top = y - rows.length * s - bob;
    // rastro de velocidade
    if (run && this.vel > 15) for (let k = 0; k < 4; k++) { ctx.fillStyle = `rgba(191,239,255,${.22 - k * .05})`; ctx.fillRect(x - 34 - k * 5, top + 14 + k * 9, 2, 8 + ((Math.floor(t * 20) + k) % 3) * 3); ctx.fillRect(x + 32 + k * 5, top + 18 + k * 9, 2, 8 + ((Math.floor(t * 20) + k + 1) % 3) * 3); }
    sprO(rows, x - 28 + jx, top, s, PAL, false, 2);
    helice(x + jx, top - s, t * (run ? 2 : 1), s);
    if (this.tonto > 0 || this.pego >= 0) for (let k = 0; k < 3; k++) { const a = t * 6 + k * 2.1; ctx.fillStyle = k % 2 ? '#ffd04a' : '#ffffff'; ctx.fillRect(Math.round(x + Math.cos(a) * 22), Math.round(top - 10 + Math.sin(a) * 5), 3, 3); }
  },
  perseguidor(t) {
    const k = this.ck; if (k < .03) return;
    const x = Math.round(this.chx), y = Math.round(H + 8 - k * 64 + (Math.floor(t * 9) % 2) * 2);
    sprO(BOT_COSTAS, x - 24, y, 6, SP_PERSEG, false, 2);
    // megafone na mão do lado do IAmiguinho
    const mx = x - this.lado * 22, my = y - 14 + Math.round(Math.sin(t * 9) * 1.5);
    sprO(SP_MEGA, mx - 12, my, 3, SP_MEGA_PAL, false, 1);
    // ondas de som saindo do megafone
    if (this.perto > 0 || this.t < 2.2 || this.pego >= 0 || state !== 'play') for (let n = 0; n < 3; n++) {
      const r = ((t * 46 + n * 12) % 36) + 6, a = 1 - r / 42; ctx.fillStyle = `rgba(255,230,120,${a * .8})`;
      for (let q = -2; q <= 2; q++) ctx.fillRect(Math.round(mx + q * r * .28) - 1, Math.round(my - 2 - r + Math.abs(q) * r * .12), 3, 2);
    }
    // o que ele grita sobe e some
    ctx.font = F_SM; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = '#07050c';
    for (const g of this.gritos) {
      const gy = Math.round(my - 8 - g.t * 26), half = Math.ceil(ctx.measureText(g.s).width / 2) + 4, gx = clamp(Math.round(mx + this.lado * 30), half, W - half);
      ctx.globalAlpha = clamp((1.2 - g.t) * 3, 0, 1); ctx.strokeText(g.s, gx, gy); ctx.fillStyle = '#ffe27a'; ctx.fillText(g.s, gx, gy);
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.lineJoin = 'miter';
  },
  hud() { return ['Pontos', this.score, `${Math.floor(this.dist)} m · fichas ${this.fichas}`]; },
  overText() { return `O Amiguinho do megafone te alcançou no quarteirão ${this.nivel + 1} e contou: "${this.frase}"`; },
};
ARCADE_NOVOS.push(spJogo);
