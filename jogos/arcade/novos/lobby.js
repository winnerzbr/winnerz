/* ============================================================ jogo: Lobby dos Bugs */
// Sobrevivência contra hordas, vista de cima. Você só anda: o IAmiguinho ataca sozinho com os poderes que tem.
// Inimigos derrotados soltam cristais de experiência; a cada nível a partida pausa e você escolhe 1 de 3 poderes (cada um sobe até o nível 5).
// Inimigos: bugs (insetos glitch), Amiguinhos zumbis (BOT com cores apagadas), bugs velozes (1:30), zumbis tanque (2:30),
// enxames em anel (0:45, 1:45…) e um chefinho a cada minuto. Meta: aguentar 5 minutos.
// Pontos: 10 por segundo sobrevivido + 1 por inimigo derrotado + 50 por chefinho + 1000 de bônus por chegar aos 5 minutos.
// Controles: setas/WASD ou analógico andam; no celular, arrastar o dedo vira um analógico (o ponto onde encostou é o centro).
// Na escolha de poder: ←/→ (ou analógico) e Espaço/✕ A; no celular, tocar na carta.
Music.define('lobby', {
  bpm: 146,
  lead: bars('G5 . Bb5 . D6 - C6 . Bb5 . A5 . G5 - D5 .', 'Eb5 - G5 . Bb5 . A5 G5 F5 - . D5 F5 . G5 .', 'C5 . Eb5 . G5 - F5 . Eb5 . D5 . C5 - G4 .', 'D5 - F#5 . A5 . C6 . Bb5 . A5 . F#5 - - .'),
  arp: bars(x4('G4 Bb4 D5 Bb4'), x4('Eb4 G4 Bb4 G4'), x4('C4 Eb4 G4 Eb4'), x4('D4 F#4 A4 F#4')),
  bass: bars('G2 . G2 . G3 . G2 . G2 . G2 . G3 . F2 .', 'Eb2 . Eb2 . Eb3 . Eb2 . Eb2 . Eb2 . Eb3 . D2 .', 'C2 . C2 . C3 . C2 . C2 . C2 . C3 . Bb1 .', 'D2 . D2 . D3 . D2 . D2 . F#2 . A2 . D3 .'),
  drums: 'k . h . s . h k k . h . s . h h',
  mix: { arp: .55, lead: .85 },
});
const LB_AW = 1200, LB_AH = 1200, LB_TS = 20, LB_MURO = 16, LB_META = 300, LB_MAXINI = 150;
// sprites: bug glitch (2 quadros), cristais e ícones dos poderes (8×8)
const LB_BUG = [
  ['K.....K', '.LGGGL.', 'L.EGE.L', '.LGgGL.', 'L.GGG.L', '...g...'],
  ['.K...K.', 'L.GGG.L', '.LEGEL.', 'L.GgG.L', '.LGGGL.', '...g...'],
];
const LB_PAL = {
  bug: { G: '#b46cff', g: '#6b3aa8', E: '#7dffea', L: '#4a3570', K: '#ff5fd2' },
  veloz: { G: '#ff5a6a', g: '#a32a3a', E: '#ffe36b', L: '#6a2434', K: '#ffb0b0' },
  zumbi: { ...PAL, O: '#7f8f86', o: '#56635c', D: '#151a18', E: '#d4e08a' },
  zumbi2: { ...PAL, O: '#8f7f88', o: '#5f5560', D: '#18141a', E: '#e0a08a' },
  tanque: { ...PAL, O: '#6f7680', o: '#4a5058', D: '#101318', E: '#ff6a5a' },
  login: { G: '#3fe0c0', g: '#1f7a6a', E: '#ff3a6a', L: '#1d4a44', K: '#ffd04a' },
  afk: { ...PAL, O: '#7c8a9a', o: '#55606c', D: '#0e1218', E: '#9ab0c4' },
  lag: { G: '#ff8a3d', g: '#b35416', E: '#7fdcff', L: '#5a2a10', K: '#ffffff' },
  crash: { ...PAL, O: '#a77bff', o: '#6843bd', D: '#0a0614', E: '#ff3a6a' },
};
// chefinhos: um por minuto
const LB_CHEFES = [
  { at: 60, nome: 'Bug do Login', spr: 'bug', s: 4, hp: 260, sp: 40, r: 13, pal: 'login', hab: 'dash' },
  { at: 120, nome: 'Amiguinho AFK', spr: 'bot', s: 4, hp: 620, sp: 30, r: 15, pal: 'afk', hab: 'afk' },
  { at: 180, nome: 'Lag Supremo', spr: 'bug', s: 4, hp: 980, sp: 42, r: 13, pal: 'lag', hab: 'lag' },
  { at: 240, nome: 'Crash Final', spr: 'bot', s: 4, hp: 2400, sp: 36, r: 15, pal: 'crash', hab: 'crash' },
];
const LB_ENXAMES = [45, 105, 150, 180, 210, 240, 265, 285];
// tipos comuns: raio, vida, velocidade, dano por segundo encostado, experiência que soltam
const LB_TIPOS = {
  bug: { spr: 'bug', s: 2, r: 6, hp: 8, sp: 40, dps: 9, xp: 1, pal: 'bug' },
  zumbi: { spr: 'bot', s: 2, r: 7, hp: 22, sp: 30, dps: 14, xp: 2, pal: 'zumbi' },
  veloz: { spr: 'bug', s: 2, r: 6, hp: 7, sp: 72, dps: 9, xp: 1, pal: 'veloz' },
  tanque: { spr: 'bot', s: 3, r: 11, hp: 85, sp: 24, dps: 22, xp: 5, pal: 'tanque' },
};
const LB_ICO_PAL = { ...PAL, Y: '#ffd04a', R: '#e8443a', G: '#3fbf6a', K: '#0a1016', C: '#efe6d2', D: '#0a1016', T: '#7fdcff', E: '#bfefff', S: '#c3c9cf', s: '#7a8592', O: '#ff6fb0', B: '#2e6fd8', W: '#f6f7f9', X: '#ffffff', M: '#e8443a', p: '#ffb27a' };
const LB_PODERES = [
  { id: 'helice', nome: 'Hélice cortante', cor: '#ffd04a', ico: ['...YY...', '...YY...', '...YY...', 'RRRKKGGG', 'RRRKKGGG', '...YY...', '...YY...', '...YY...'],
    desc: ['Gira em volta e corta quem chega perto', '+1 hélice girando', 'Corta mais forte e mais longe', '+1 hélice girando', '+1 hélice e gira mais rápido'] },
  { id: 'raio', nome: 'Raio do visor', cor: '#7fdcff', ico: ['CCCCC...', 'CDDDC...', 'CDEDCTTT', 'CDDDC...', 'CCCCC.TT', '..C.....', '.CCC.TTT', '........'],
    desc: ['Atira no inimigo mais perto', 'Atira mais rápido', 'Dois raios de uma vez', 'O raio atravessa um inimigo', 'Três raios que atravessam'] },
  { id: 'balde', nome: 'Balde de tinta', cor: '#ff6fb0', ico: ['.S....S.', '..SSSS..', 'SSSSSSSS', 'SOOOOOOS', '.SOOOOS.', '.SssssS.', 'O.SSSS.O', 'OO....OO'],
    desc: ['Poça que queima e atrasa os inimigos', 'Poça maior', 'Duas poças de uma vez', 'Poça mais forte', 'Três poças gigantes'] },
  { id: 'wifi', nome: 'Sinal de Wi-Fi', cor: '#43d17a', ico: ['.TTTTTT.', 'T......T', '..TTTT..', '.T....T.', '...TT...', '..T..T..', '...TT...', '...TT...'],
    desc: ['Onda que dá dano e empurra', 'Onda maior', 'Onda mais frequente', 'Onda mais forte', 'Cinco barras: onda enorme'] },
  { id: 'ima', nome: 'Ímã de XP', cor: '#e8443a', ico: ['WW....WW', 'RR....RR', 'RR....RR', 'RR....RR', 'RR....RR', '.RR..RR.', '..RRRR..', '........'],
    desc: ['Puxa cristais de mais longe', 'Puxa de mais longe', 'Puxa de mais longe', 'Puxa de mais longe', 'Puxa de muito longe'] },
  { id: 'botas', nome: 'Botas rápidas', cor: '#2e6fd8', ico: ['..BBB...', '..BBB...', '..BBB...', '..BBB...', '..BBBBB.', '.BBBBBBB', '.WWWWWWW', '........'],
    desc: ['Anda 10% mais rápido', 'Mais 10% de velocidade', 'Mais 10% de velocidade', 'Mais 10% de velocidade', 'Mais 10% de velocidade'] },
  { id: 'patch', nome: 'Patch', cor: '#3fbf6a', ico: ['...GG...', '...GG...', '.GGGGGG.', 'GGGXXGGG', 'GGGXXGGG', '.GGGGGG.', '...GG...', '...GG...'],
    desc: ['+20 de vida máxima, cura e regenera', 'Mais vida e regenera mais', 'Mais vida e regenera mais', 'Mais vida e regenera mais', 'Mais vida e regenera mais'] },
];
const LB_LANCHE = { id: 'lanche', nome: 'Pizza do lobby', cor: '#ffb27a', ico: ['YYYYYYYY', 'pYRYYRYp', '.pYYYYp.', '.pYRYYp.', '..pYYp..', '..pYRp..', '...pp...', '...pp...'], desc: ['Cura 40 de vida'] };
// números de cada poder por nível (índice 0 = não tem)
const LB_ST = {
  helN: [0, 1, 2, 2, 3, 4], helR: [0, 32, 32, 40, 40, 42], helD: [0, 9, 10, 15, 15, 18], helV: [0, 3.2, 3.2, 3.4, 3.4, 4.4],
  raioCd: [0, .9, .78, .74, .7, .6], raioN: [0, 1, 1, 2, 2, 3], raioD: [0, 10, 12, 13, 15, 18], raioP: [0, 0, 0, 0, 1, 2],
  baldeCd: [0, 3.4, 3.2, 3, 2.7, 2.3], baldeR: [0, 18, 23, 23, 26, 32], baldeN: [0, 1, 1, 2, 2, 3], baldeD: [0, 16, 18, 20, 28, 32],
  wifiCd: [0, 3.2, 3, 2.4, 2.2, 2], wifiR: [0, 58, 72, 74, 80, 104], wifiD: [0, 12, 14, 16, 24, 28],
};
const LB_TINTAS = ['#ff6fb0', '#4fb8ff', '#43d17a', '#ffd23f', '#a77bff', '#ff8a3d'];
// tapetes de "pronto" espalhados pelo lobby (decoração do chão)
const LB_PADS = [[200, 200, '#4fb8ff'], [1000, 200, '#ff6fb0'], [200, 1000, '#43d17a'], [1000, 1000, '#ffd23f'], [600, 260, '#a77bff'], [260, 600, '#ff8a3d'], [940, 600, '#7fdcff'], [600, 940, '#ff5a6a']];
const lbHash = (i, j) => (Math.imul(i + 7, 73856093) ^ Math.imul(j + 3, 19349663)) >>> 0;
// sprites pré-desenhados (com contorno escuro) para desenhar 150 inimigos sem pesar
const LB_CACHE = new Map();
function lbSpr(key, rows, pal, s, flip = false, white = false) {
  const k = `${key}|${s}|${flip ? 1 : 0}|${white ? 1 : 0}`;
  let c = LB_CACHE.get(k); if (c) return c;
  const w = rows[0].length, h = rows.length; c = document.createElement('canvas'); c.width = w * s + 2; c.height = h * s + 2;
  const g = c.getContext('2d');
  for (const pass of [0, 1]) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const ch = rows[j][i]; if (ch === '.') continue;
    const x = (flip ? w - 1 - i : i) * s + 1, y = j * s + 1;
    if (pass === 0) { g.fillStyle = '#07050c'; g.fillRect(x - 1, y - 1, s + 2, s + 2); } else { g.fillStyle = white ? '#ffffff' : pal[ch] || '#ff00ff'; g.fillRect(x, y, s, s); }
  }
  LB_CACHE.set(k, c); return c;
}
function lbWrap(s, maxW) {
  const out = []; let line = '';
  for (const w of s.split(' ')) { const tryL = line ? line + ' ' + w : w; if (ctx.measureText(tryL).width > maxW && line) { out.push(line); line = w; } else line = tryL; }
  if (line) out.push(line); return out;
}
const lbTempo = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const lobbyJogo = {
  id: 'lobby', name: 'Lobby dos Bugs', tag: 'Sobrevivência · 5 minutos', unit: 'pontos', ia: 2140, bestKey: '.v1',
  desc: 'Sobreviva às hordas de bugs no lobby.',
  how: 'Só ande: o IAmiguinho ataca sozinho. Pegue os cristais dos inimigos para subir de nível e escolher 1 de 3 poderes. Aguente 5 minutos de bugs, zumbis e chefinhos.',
  ctl: [['Setas', 'andar', 'pc'], ['Analógico', 'andar', 'pc'], ['← → e Espaço', 'escolher poder', 'pc'], ['✕ / A', 'confirmar poder', 'pc'], ['Arrastar', 'andar', 'touch'], ['Tocar na carta', 'escolher poder', 'touch']],
  pad: null,
  rank: [['@duda', 5460], ['@carol', 4210], ['@rafa', 2890], ['@bia', 1530]],
  nota: 'o servidor caiu bem na minha melhor partida',
  falas: [
    'Eu só ando. A hélice, o visor e o balde trabalham por mim. Isso se chama liderança kkkk',
    'Bug no lobby é normal. Bug que corre atrás de você é recurso premium.',
    'Amiguinho zumbi é quem ficou AFK tempo demais. Respeita, mas foge.',
    'Cristal dá nível, nível dá poder, poder dá mais cristal. Isso é economia, lol.',
    'Cinco minutos no lobby? Já esperei mais que isso na fila da partida, hahaha',
  ],
  init() {
    Object.assign(this, {
      t: 0, clk: 0, x: LB_AW / 2, y: LB_AH / 2, face: false, hp: 100, hpMax: 100, hurtT: 0, hurtS: 0,
      lv: 1, xp: 0, pend: 0, cards: null, axPrev: 0,
      pw: { helice: 0, raio: 1, balde: 0, wifi: 0, ima: 0, botas: 0, patch: 0 },
      ens: [], cris: [], pizzas: [], tiros: [], pocas: [], ondas: [], parts: [],
      cdRaio: .6, cdBalde: 1, cdWifi: 1, helA: 0, spawnT: .8, chefeI: 0, enxI: 0, chefe: null,
      kills: 0, chefes: 0, venceu: false, fim: null, aviso: null, score: 0, sndT: 0, pickT: 0, moving: false,
    });
  },
  need() { return 4 + this.lv * 3 + Math.floor(this.lv * this.lv * .15); },
  vel() { return 66 * (1 + .1 * this.pw.botas); },
  imaR() { return 30 + this.pw.ima * 22; },
  // ---------------------------------------------------------------- inimigos
  novoIni(tipo, x, y, extra) {
    const T = LB_TIPOS[tipo] || extra, k = 1 + this.t / 120 + (this.t / 130) ** 2;
    const e = { k: tipo, spr: T.spr, s: T.s, r: T.r, hp: T.hp * (extra ? 1 : k), sp: T.sp * rand(.9, 1.1) * (extra ? 1 : 1 + this.t / 420), dps: T.dps, xp: T.xp, pal: T.pal, x, y, hitT: 0, kx: 0, ky: 0, slow: 0, hcd: 0, seed: Math.floor(rand(0, 100)), boss: false };
    e.max = e.hp; this.ens.push(e); return e;
  },
  pontoAnel(d0, d1) {
    for (let k = 0; k < 12; k++) {
      const a = rand(0, 6.283), d = rand(d0, d1), x = this.x + Math.cos(a) * d, y = this.y + Math.sin(a) * d;
      if (x > LB_MURO + 10 && y > LB_MURO + 10 && x < LB_AW - LB_MURO - 10 && y < LB_AH - LB_MURO - 10) return [x, y];
    }
    return null;
  },
  tipoAgora() {
    const t = this.t, ws = [['bug', 10], ['zumbi', t >= 25 ? 3 + t / 40 : 0], ['veloz', t >= 90 ? 3 + (t - 90) / 30 : 0], ['tanque', t >= 150 ? 1 + (t - 150) / 60 : 0]];
    let r = Math.random() * ws.reduce((a, [, w]) => a + w, 0);
    for (const [k, w] of ws) { r -= w; if (r <= 0) return k; } return 'bug';
  },
  chamarChefe(C) {
    const p = this.pontoAnel(210, 240) || [clamp(this.x, 80, LB_AW - 80), clamp(this.y - 220, 80, LB_AH - 80)];
    const e = this.novoIni('chefe', p[0], p[1], { spr: C.spr, s: C.s, r: C.r, hp: C.hp, sp: C.sp, dps: 30, xp: 18, pal: C.pal });
    Object.assign(e, { boss: true, nome: C.nome, hab: C.hab, cd: 3, wind: 0, dash: 0, dx: 0, dy: 0, zz: 0 });
    this.chefe = e; this.aviso = { s: `Chefinho: ${C.nome}!`, t: 0, c: '#ff8a8a' };
    beep(90, .5, 'sawtooth', .06, -30); setTimeout(() => beep(70, .5, 'sawtooth', .06, -20), 260); shake = .25;
  },
  enxame() {
    const n = Math.min(52, 18 + this.enxI * 5), R = 200;
    for (let i = 0; i < n && this.ens.length < LB_MAXINI + 40; i++) {
      const a = (i / n) * 6.283, x = this.x + Math.cos(a) * R, y = this.y + Math.sin(a) * R;
      if (x > LB_MURO + 8 && y > LB_MURO + 8 && x < LB_AW - LB_MURO - 8 && y < LB_AH - LB_MURO - 8) this.novoIni(this.t > 150 && i % 3 === 0 ? 'veloz' : 'bug', x, y);
    }
    this.aviso = { s: 'Enxame!', t: 0, c: '#b79cff' }; beep(300, .25, 'square', .03, 500);
  },
  dano(e, d, kx = 0, ky = 0, flash = true) {
    if (e.dead) return;
    e.hp -= d; if (flash) e.hitT = .06;
    if (kx || ky) { const m = e.boss ? .2 : e.k === 'tanque' ? .5 : 1; e.kx += kx * m; e.ky += ky * m; }
    if (e.hp <= 0) this.morre(e);
  },
  morre(e) {
    e.dead = true; this.kills++;
    this.solta(e.x, e.y, e.xp);
    const n = e.boss ? 18 : 4, cor = e.spr === 'bug' ? LB_PAL[e.pal].G : LB_PAL[e.pal].O;
    for (let i = 0; i < n && this.parts.length < 200; i++) { const a = rand(0, 6.283), v = rand(30, e.boss ? 140 : 80); this.parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, d: rand(.25, .5), c: i % 2 ? cor : '#ffffff' }); }
    if (e.boss) { this.chefes++; this.chefe = null; this.pizzas.push({ x: e.x + 14, y: e.y }); this.aviso = { s: `${e.nome} caiu! +50`, t: 0, c: '#8fd3ae' }; sfx.big(); shake = .3; }
    else {
      if (e.k !== 'bug' && e.k !== 'veloz' && Math.random() < .025) this.pizzas.push({ x: e.x, y: e.y });
      if (this.sndT <= 0) { beep(rand(480, 640), .03, 'triangle', .02); this.sndT = .05; }
    }
  },
  solta(x, y, v) {
    // muitos cristais no chão: junta no mais perto (assim não pesa)
    if (this.cris.length > 170) {
      let best = null, bd = this.cris.length > 240 ? 1e9 : 40;
      for (const c of this.cris) { const d = Math.abs(c.x - x) + Math.abs(c.y - y); if (d < bd) { bd = d; best = c; } }
      if (best) { best.v += v; return; }
    }
    this.cris.push({ x: x + rand(-3, 3), y: y + rand(-3, 3), v, pull: false, sp: 0, ph: rand(0, 6) });
  },
  // ---------------------------------------------------------------- cartas de poder
  abrirCartas() {
    const livres = LB_PODERES.filter((p) => this.pw[p.id] < 5).sort(() => Math.random() - .5), disp = livres.slice(0, 3);
    // sempre pelo menos uma arma entre as cartas (senão a horda engole quem só pegou botas e ímã)
    const arma = (p) => ['helice', 'raio', 'balde', 'wifi'].includes(p.id);
    if (!disp.some(arma)) { const a = livres.find(arma); if (a) disp[Math.floor(Math.random() * disp.length)] = a; }
    while (disp.length < 3) disp.push(LB_LANCHE);
    this.cards = { opts: disp, sel: 1, t: 0 }; this.axPrev = inp.ax; sfx.big();
  },
  escolher(i) {
    const C = this.cards; if (!C) return; const P = C.opts[clamp(i, 0, C.opts.length - 1)];
    if (P.id === 'lanche') this.hp = Math.min(this.hpMax, this.hp + 40);
    else {
      this.pw[P.id]++;
      if (P.id === 'patch') { this.hpMax += 20; this.hp = Math.min(this.hpMax, this.hp + 40); }
      if (P.id === 'wifi' && this.pw.wifi === 1) this.cdWifi = .3;
      if (P.id === 'balde' && this.pw.balde === 1) this.cdBalde = .4;
    }
    sfx.coin(); this.pend--; this.cards = null;
    if (this.pend > 0) this.abrirCartas();
  },
  updCartas(dt) {
    const C = this.cards; C.t += dt; if (C.t < .4) { this.axPrev = inp.ax; return; }
    if (inp.ax < -.5 && this.axPrev >= -.5) { C.sel = (C.sel + 2) % 3; beep(700, .03, 'square', .02); }
    if (inp.ax > .5 && this.axPrev <= .5) { C.sel = (C.sel + 1) % 3; beep(700, .03, 'square', .02); }
    this.axPrev = inp.ax;
    if (inp.tap) { const k = this.cartaEm(inp.tap.x, inp.tap.y); if (k >= 0) { this.escolher(k); return; } }
    if (pressedAny('Space', 'Enter', 'KeyZ')) this.escolher(C.sel);
  },
  cartaEm(x, y) { for (let k = 0; k < 3; k++) { const cx = 8 + k * 104; if (x >= cx && x <= cx + 96 && y >= 100 && y <= 276) return k; } return -1; },
  // ---------------------------------------------------------------- laço
  update(dt) {
    this.clk += dt;
    if (this.aviso) { this.aviso.t += dt; if (this.aviso.t > 2) this.aviso = null; }
    for (const p of this.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .9; p.vy *= .9; }
    this.parts = this.parts.filter((p) => p.t < p.d);
    if (this.fim) { this.fim.t += dt; return this.fim.t > (this.fim.win ? 2.8 : 1.8); }
    if (this.cards) { this.updCartas(dt); return false; }
    this.t += dt; this.sndT -= dt; this.pickT -= dt; this.hurtT = Math.max(0, this.hurtT - dt); this.hurtS -= dt;
    // vitória
    if (this.t >= LB_META) {
      this.t = LB_META; this.venceu = true; this.fim = { win: true, t: 0 };
      for (const e of this.ens) for (let i = 0; i < 2 && this.parts.length < 200; i++) this.parts.push({ x: e.x, y: e.y, vx: rand(-60, 60), vy: rand(-60, 60), t: 0, d: rand(.3, .7), c: pick(['#ffffff', '#7fdcff', '#b79cff']) });
      this.ens = []; this.ondas.push({ x: this.x, y: this.y, t: 0, R: 260, d: 0, hit: new Set(), win: true });
      this.calcScore(); sfx.big(); shake = .3; return false;
    }
    // andar: teclado/analógico, ou o dedo como analógico virtual
    let vx = inp.ax, vy = inp.ay;
    if (inp.drag) { const dx = inp.drag.x - inp.drag.x0, dy = inp.drag.y - inp.drag.y0, l = Math.hypot(dx, dy); if (l > 4) { vx = dx / Math.max(l, 28); vy = dy / Math.max(l, 28); } else vx = vy = 0; }
    const l = Math.hypot(vx, vy); if (l > 1) { vx /= l; vy /= l; }
    const sp = this.vel(); this.moving = l > .1;
    this.x = clamp(this.x + vx * sp * dt, LB_MURO + 10, LB_AW - LB_MURO - 10);
    this.y = clamp(this.y + vy * sp * dt, LB_MURO + 16, LB_AH - LB_MURO - 8);
    if (Math.abs(vx) > .15) this.face = vx < 0;
    // patch regenera
    if (this.pw.patch) this.hp = Math.min(this.hpMax, this.hp + this.pw.patch * .6 * dt);
    // nascimento dos inimigos, enxames e chefinhos
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT += 1 / (1.1 + this.t * .02 + (this.t / 100) ** 2 * .5);
      if (this.ens.length < LB_MAXINI) { const p = this.pontoAnel(250, 290); if (p) this.novoIni(this.tipoAgora(), p[0], p[1]); }
    }
    if (this.enxI < LB_ENXAMES.length && this.t >= LB_ENXAMES[this.enxI]) { this.enxame(); this.enxI++; }
    if (this.chefeI < LB_CHEFES.length && this.t >= LB_CHEFES[this.chefeI].at) { this.chamarChefe(LB_CHEFES[this.chefeI]); this.chefeI++; }
    this.armas(dt);
    this.inimigos(dt);
    this.coletar(dt);
    // morreu?
    if (this.hp <= 0) { this.hp = 0; this.fim = { win: false, t: 0 }; sfx.over(); shake = .35; }
    this.calcScore();
    if (this.pend > 0 && !this.fim) this.abrirCartas();
    return false;
  },
  calcScore() { this.score = Math.floor(this.t) * 10 + this.kills + this.chefes * 50 + (this.venceu ? 1000 : 0); },
  maisPerto(n, ja) {
    const out = [];
    for (const e of this.ens) { if (e.dead || (ja && ja.has(e))) continue; const d = (e.x - this.x) ** 2 + (e.y - this.y) ** 2; if (d > 230 * 230) continue; out.push([d, e]); }
    out.sort((a, b) => a[0] - b[0]); return out.slice(0, n).map((o) => o[1]);
  },
  armas(dt) {
    const P = this.pw, S = LB_ST, cx = this.x, cy = this.y - 4;
    // raio do visor
    if (P.raio) {
      this.cdRaio -= dt;
      if (this.cdRaio <= 0) {
        const alvos = this.maisPerto(S.raioN[P.raio]);
        if (alvos.length) {
          this.cdRaio = S.raioCd[P.raio];
          alvos.forEach((e, i) => { const a = Math.atan2(e.y - cy, e.x - cx) + (alvos.length === 1 && S.raioN[P.raio] > 1 ? (i - .5) * .2 : 0); this.tiros.push({ x: cx, y: cy, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, t: 0, d: S.raioD[P.raio], p: S.raioP[P.raio], hit: new Set() }); });
          beep(1250, .035, 'square', .014, -500);
        } else this.cdRaio = .15;
      }
    }
    for (const b of this.tiros) {
      b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt;
      for (const e of this.ens) { if (e.dead || b.hit.has(e)) continue; const r = e.r + 3; if (Math.abs(e.x - b.x) < r && Math.abs(e.y - b.y) < r) { b.hit.add(e); this.dano(e, b.d, b.vx * .05, b.vy * .05); if (b.p-- <= 0) { b.t = 9; break; } } }
    }
    this.tiros = this.tiros.filter((b) => b.t < .9);
    // hélice cortante
    if (P.helice) {
      this.helA += S.helV[P.helice] * dt;
      const n = S.helN[P.helice], R = S.helR[P.helice];
      for (let k = 0; k < n; k++) {
        const a = this.helA + (k / n) * 6.283, bx = cx + Math.cos(a) * R, by = cy + Math.sin(a) * R;
        for (const e of this.ens) { if (e.dead || e.hcd > 0) continue; const r = e.r + 8; if ((e.x - bx) ** 2 + (e.y - by) ** 2 < r * r) { e.hcd = .35; const d = Math.hypot(e.x - cx, e.y - cy) || 1; this.dano(e, S.helD[P.helice], ((e.x - cx) / d) * 30, ((e.y - cy) / d) * 30); } }
      }
    }
    // balde de tinta
    if (P.balde) {
      this.cdBalde -= dt;
      if (this.cdBalde <= 0) {
        this.cdBalde = S.baldeCd[P.balde];
        const alvos = this.maisPerto(8), n = S.baldeN[P.balde];
        for (let k = 0; k < n; k++) {
          const e = alvos.length ? alvos[Math.floor(Math.random() * Math.min(alvos.length, 5))] : null;
          const x = e ? e.x + rand(-8, 8) : this.x + rand(-60, 60), y = e ? e.y + rand(-8, 8) : this.y + rand(-60, 60);
          this.pocas.push({ x, y, r: S.baldeR[P.balde], t: 0, d: 3, dps: S.baldeD[P.balde], c: pick(LB_TINTAS), tick: 0, voo: .25, ox: this.x, oy: this.y - 10 });
        }
        beep(220, .12, 'triangle', .04, -120);
      }
    }
    for (const p of this.pocas) {
      p.t += dt; if (p.voo > 0) { p.voo -= dt; continue; }
      p.tick -= dt; const dmg = p.tick <= 0; if (dmg) p.tick = .25;
      for (const e of this.ens) { if (e.dead) continue; const r = p.r + e.r * .5; if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < r * r) { e.slow = .15; if (dmg) this.dano(e, p.dps * .25, 0, 0, false); } }
    }
    this.pocas = this.pocas.filter((p) => p.t < p.d + .25);
    // sinal de wi-fi
    if (P.wifi) {
      this.cdWifi -= dt;
      if (this.cdWifi <= 0) { this.cdWifi = S.wifiCd[P.wifi]; this.ondas.push({ x: this.x, y: this.y, t: 0, R: S.wifiR[P.wifi], d: S.wifiD[P.wifi], hit: new Set() }); beep(520, .18, 'sine', .035, 700); }
    }
    for (const o of this.ondas) {
      o.t += dt; o.x = this.x; o.y = this.y;
      const r = o.R * Math.min(1, o.t / .45);
      if (!o.win) for (const e of this.ens) { if (e.dead || o.hit.has(e)) continue; const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy) || 1; if (d < r + e.r) { o.hit.add(e); this.dano(e, o.d, (dx / d) * 70, (dy / d) * 70); } }
    }
    this.ondas = this.ondas.filter((o) => o.t < .6);
  },
  inimigos(dt) {
    const px = this.x, py = this.y, es = this.ens;
    let toque = 0;
    for (const e of es) {
      if (e.dead) continue;
      e.hitT -= dt; e.hcd -= dt; e.slow -= dt;
      let dx = px - e.x, dy = py - e.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      // muito longe: reaparece do outro lado, perto de você
      if (d > 430 && !e.boss) { const p = this.pontoAnel(250, 290); if (p) { e.x = p[0]; e.y = p[1]; } continue; }
      if (d > 480 && e.boss) { const p = this.pontoAnel(220, 250); if (p) { e.x = p[0]; e.y = p[1]; } continue; }
      let sp = e.sp * (e.slow > 0 ? .55 : 1);
      if (e.boss) sp = this.habChefe(e, dt, dx, dy, sp);
      if (e.dash > 0) { e.x += e.dx * dt; e.y += e.dy * dt; }
      else { e.x += dx * sp * dt; e.y += dy * sp * dt; }
      e.x += e.kx * dt * 6; e.y += e.ky * dt * 6; e.kx *= Math.pow(.004, dt); e.ky *= Math.pow(.004, dt);
      e.x = clamp(e.x, LB_MURO + 4, LB_AW - LB_MURO - 4); e.y = clamp(e.y, LB_MURO + 4, LB_AH - LB_MURO - 4);
      // encostou em você
      const rr = e.r + 8;
      if (d < rr) { toque += e.dps; const push = (rr - d) * (e.boss ? .2 : .6); e.x -= dx * push; e.y -= dy * push; }
    }
    // um empurra o outro (para a horda não virar um ponto só)
    for (let i = 0; i < es.length; i++) {
      const a = es[i]; if (a.dead) continue;
      for (let j = i + 1; j < es.length; j++) {
        const b = es[j]; if (b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y, r = a.r + b.r - 1; if (dx > r || dx < -r || dy > r || dy < -r) continue;
        const d2 = dx * dx + dy * dy; if (d2 >= r * r || d2 === 0) continue;
        const d = Math.sqrt(d2), o = (r - d) * .5 / d, wa = a.boss ? .1 : b.boss ? 1.9 : 1, wb = 2 - wa;
        a.x -= dx * o * wa * .5; a.y -= dy * o * wa * .5; b.x += dx * o * wb * .5; b.y += dy * o * wb * .5;
      }
    }
    this.ens = es.filter((e) => !e.dead);
    if (toque > 0) {
      this.hp -= toque * dt; this.hurtT = .2;
      if (this.hurtS <= 0) { beep(150, .08, 'sawtooth', .04, -60); this.hurtS = .3; }
    }
  },
  habChefe(e, dt, dx, dy, sp) {
    e.cd -= dt;
    if (e.wind > 0) { e.wind -= dt; if (e.wind <= 0) { e.dash = .5; e.dx = dx * e.sp * 4.2; e.dy = dy * e.sp * 4.2; beep(240, .2, 'square', .03, 300); } return 0; }
    if (e.dash > 0) { e.dash -= dt; return 0; }
    if (e.hab === 'afk' && e.zz > 0) { e.zz -= dt; if (e.zz <= 0) { e.dash = .5; e.dx = dx * e.sp * 4.4; e.dy = dy * e.sp * 4.4; beep(240, .2, 'square', .03, 300); } return 0; }
    if (e.cd <= 0) {
      if (e.hab === 'lag') {
        // trava e reaparece mais perto
        e.cd = 2.6; const j = 46; for (let i = 0; i < 6 && this.parts.length < 200; i++) this.parts.push({ x: e.x + rand(-10, 10), y: e.y + rand(-10, 10), vx: 0, vy: 0, t: 0, d: .3, c: pick(['#7fdcff', '#ff8a3d', '#ffffff']) });
        e.x += dx * j; e.y += dy * j; beep(900, .05, 'square', .03); setTimeout(() => beep(400, .05, 'square', .03), 50);
      } else if (e.hab === 'afk') { e.cd = 5; e.zz = 1.6; }
      else { e.cd = e.hab === 'crash' ? 3.2 : 3.8; e.wind = .6; }
      if (e.hab === 'crash' && Math.random() < .5) for (let i = 0; i < 8 && this.ens.length < LB_MAXINI + 20; i++) { const a = (i / 8) * 6.283; this.novoIni('bug', e.x + Math.cos(a) * 26, e.y + Math.sin(a) * 26); }
      if (e.hab === 'afk' && Math.random() < .6) for (let i = 0; i < 4 && this.ens.length < LB_MAXINI + 20; i++) { const a = (i / 4) * 6.283 + .7; this.novoIni('zumbi', e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30); }
    }
    return sp;
  },
  coletar(dt) {
    const R = this.imaR();
    for (const c of this.cris) {
      const dx = this.x - c.x, dy = this.y - 2 - c.y, d = Math.hypot(dx, dy) || 1;
      if (d < R) c.pull = true;
      if (c.pull) { c.sp = Math.min(320, c.sp + 520 * dt); const s = Math.min(d, c.sp * dt); c.x += (dx / d) * s; c.y += (dy / d) * s; }
      if (d < 9) { c.got = true; this.xp += c.v; if (this.pickT <= 0) { beep(1300 + Math.min(600, c.v * 40), .03, 'square', .018); this.pickT = .04; } }
    }
    this.cris = this.cris.filter((c) => !c.got);
    for (const p of this.pizzas) if (Math.hypot(p.x - this.x, p.y - this.y) < 14) { p.got = true; this.hp = Math.min(this.hpMax, this.hp + 30); sfx.coin(); this.aviso = { s: 'Pizza! +30 de vida', t: 0, c: '#ffb27a' }; }
    this.pizzas = this.pizzas.filter((p) => !p.got);
    while (this.xp >= this.need()) { this.xp -= this.need(); this.lv++; this.pend++; }
  },
  // ---------------------------------------------------------------- desenho
  cam() { return { x: Math.round(clamp(this.x - W / 2, -8, LB_AW - W + 8)), y: Math.round(clamp(this.y - H / 2 + 12, -8, LB_AH - H + 30)) }; },
  drawChao(cx, cy, t) {
    ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
    const TS = LB_TS, i0 = Math.max(0, Math.floor(cx / TS)), i1 = Math.min(LB_AW / TS, Math.ceil((cx + W) / TS)), j0 = Math.max(0, Math.floor(cy / TS)), j1 = Math.min(LB_AH / TS, Math.ceil((cy + H) / TS));
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
      const x = i * TS - cx, y = j * TS - cy, h = lbHash(i, j);
      ctx.fillStyle = (i + j) & 1 ? '#151a29' : '#131724'; ctx.fillRect(x, y, TS, TS);
      ctx.fillStyle = '#1b2134'; ctx.fillRect(x, y, TS, 1); ctx.fillRect(x, y, 1, TS);
      if (h % 29 === 0) { ctx.fillStyle = '#20283d'; ctx.fillRect(x + 6, y + 6, 8, 8); ctx.fillStyle = '#131724'; ctx.fillRect(x + 8, y + 8, 4, 4); }
      else if (h % 17 === 0) { ctx.fillStyle = '#1f2638'; ctx.fillRect(x + 9, y + 9, 2, 2); }
      if (i % 10 === 0) { ctx.fillStyle = '#1b3f55'; ctx.fillRect(x, y, 2, TS); }
      if (j % 10 === 0) { ctx.fillStyle = '#1b3f55'; ctx.fillRect(x, y, TS, 2); }
      if (i % 10 === 0 && j % 10 === 0) { ctx.fillStyle = Math.floor(t * 2 + i * .3 + j * .7) % 3 ? '#2a7fa0' : '#7fdcff'; ctx.fillRect(x - 1, y - 1, 4, 4); }
    }
    // troféu gigante pintado no centro do lobby
    if (!this.trofeuC) { const c = document.createElement('canvas'); c.width = 80; c.height = 80; const g = c.getContext('2d'); for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const ch = TROFEU[j][i]; if (ch === '.') continue; g.fillStyle = PAL[ch]; g.fillRect(i * 10, j * 10, 10, 10); } this.trofeuC = c; }
    ctx.globalAlpha = .09; ctx.drawImage(this.trofeuC, LB_AW / 2 - 40 - cx, LB_AH / 2 - 52 - cy); ctx.globalAlpha = 1;
    // tapetes de "pronto"
    for (const [x0, y0, c] of LB_PADS) {
      const x = x0 - cx - 24, y = y0 - cy - 24; if (x > W || y > H || x < -50 || y < -50) continue;
      const on = Math.floor(t * 1.5 + x0) % 2;
      ctx.fillStyle = c; ctx.fillRect(x + 6, y, 36, 3); ctx.fillRect(x + 6, y + 45, 36, 3); ctx.fillRect(x, y + 6, 3, 36); ctx.fillRect(x + 45, y + 6, 3, 36);
      ctx.fillRect(x + 3, y + 3, 3, 3); ctx.fillRect(x + 42, y + 3, 3, 3); ctx.fillRect(x + 3, y + 42, 3, 3); ctx.fillRect(x + 42, y + 42, 3, 3);
      ctx.globalAlpha = on ? .22 : .12; ctx.fillRect(x + 6, y + 6, 36, 36); ctx.globalAlpha = 1;
      ctx.fillStyle = c; ctx.fillRect(x + 18, y + 22, 4, 4); ctx.fillRect(x + 22, y + 26, 4, 4); ctx.fillRect(x + 26, y + 22, 4, 4); ctx.fillRect(x + 30, y + 18, 4, 4); ctx.fillRect(x + 14, y + 18, 4, 4);
    }
    // muros com faixa de neon
    const M = LB_MURO;
    ctx.fillStyle = '#232a3c'; ctx.fillRect(-cx, -cy, LB_AW, M); ctx.fillRect(-cx, LB_AH - M - cy, LB_AW, M); ctx.fillRect(-cx, -cy, M, LB_AH); ctx.fillRect(LB_AW - M - cx, -cy, M, LB_AH);
    ctx.fillStyle = '#ff6fb0'; ctx.fillRect(M - cx, M - 3 - cy, LB_AW - 2 * M, 2); ctx.fillRect(M - cx, LB_AH - M + 1 - cy, LB_AW - 2 * M, 2);
    ctx.fillStyle = '#7fdcff'; ctx.fillRect(M - 3 - cx, M - cy, 2, LB_AH - 2 * M); ctx.fillRect(LB_AW - M + 1 - cx, M - cy, 2, LB_AH - 2 * M);
    ctx.fillStyle = '#2e3650'; for (let x = M; x < LB_AW - M; x += 24) { const xx = x - cx; if (xx > -10 && xx < W + 10) { ctx.fillRect(xx, -cy + 4, 12, 4); ctx.fillRect(xx, LB_AH - M - cy + 8, 12, 4); } }
  },
  drawIni(e, cx, cy, t) {
    const x = Math.round(e.x - cx), y = Math.round(e.y - cy); if (x < -40 || y < -40 || x > W + 40 || y > H + 40) return;
    const pal = LB_PAL[e.pal], white = e.hitT > 0 || (e.wind > 0 && Math.floor(t * 20) % 2);
    let c, key;
    if (e.spr === 'bug') { const f = Math.floor(t * 8 + e.seed) % 2; key = `bug${f}${e.pal}`; c = lbSpr(key, LB_BUG[f], pal, e.s, false, white); }
    else { key = `bot${e.pal}`; c = lbSpr(key, BOT, pal, e.s, e.x > this.x, white); }
    const bob = e.spr === 'bot' && !(e.zz > 0) ? Math.floor(t * 6 + e.seed) % 2 : 0;
    const dx = x - (c.width >> 1), dy = y - (c.height >> 1) - bob;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - (c.width >> 2), y + (c.height >> 1) - 2, c.width >> 1, 2);
    // glitch: de vez em quando o sprite racha em ciano e rosa
    if (Math.floor(t * 12 + e.seed * 7) % 11 === 0) { ctx.globalAlpha = .55; ctx.drawImage(lbSpr(key + 'c', e.spr === 'bug' ? LB_BUG[0] : BOT, { G: '#3bffe1', g: '#3bffe1', E: '#3bffe1', L: '#3bffe1', K: '#3bffe1', O: '#3bffe1', o: '#3bffe1', D: '#3bffe1' }, e.s), dx + 2, dy); ctx.globalAlpha = 1; ctx.drawImage(c, dx - 1, dy); }
    else ctx.drawImage(c, dx, dy);
    if (e.boss) {
      if (e.zz > 0) { ctx.font = '900 10px Archivo, sans-serif'; ctx.fillStyle = '#bfefff'; ctx.fillText('z', x + 12, y - 16 - Math.floor((e.zz * 8) % 6)); ctx.fillText('Z', x + 18, y - 22 - Math.floor((e.zz * 6) % 6)); }
      if (e.k === 'chefe' && e.hab === 'crash' && Math.floor(t * 10) % 4 === 0) { ctx.fillStyle = '#ff3a6a'; ctx.fillRect(x - 16, y - 4 + Math.floor(rand(-6, 6)), 32, 2); }
    }
  },
  drawCris(c, cx, cy, t) {
    const x = Math.round(c.x - cx), y = Math.round(c.y - cy + (c.pull ? 0 : Math.round(Math.sin(t * 4 + c.ph)))); if (x < -8 || y < -8 || x > W + 8 || y > H + 8) return;
    const [a, b] = c.v >= 15 ? ['#ffd04a', '#fff2ad'] : c.v >= 5 ? ['#b79cff', '#ddcdff'] : c.v >= 2 ? ['#43d17a', '#b8f3cc'] : ['#4fb8ff', '#bfe8ff'];
    const s = c.v >= 15 ? 2 : 1;
    ctx.fillStyle = '#07050c'; ctx.fillRect(x - 2 * s, y - 3 * s, 4 * s, 6 * s); ctx.fillRect(x - 3 * s, y - 2 * s, 6 * s, 4 * s);
    ctx.fillStyle = a; ctx.fillRect(x - s, y - 2 * s, 2 * s, 4 * s); ctx.fillRect(x - 2 * s, y - s, 4 * s, 2 * s);
    ctx.fillStyle = b; ctx.fillRect(x - s, y - 2 * s, s, s);
  },
  draw(t = this.clk) {
    const { x: cx, y: cy } = this.cam();
    ctx.lineJoin = 'round';
    this.drawChao(cx, cy, t);
    // poças de tinta
    for (const p of this.pocas) {
      if (p.voo > 0) { const k = 1 - p.voo / .25, bx = Math.round(p.ox + (p.x - p.ox) * k - cx), by = Math.round(p.oy + (p.y - p.oy) * k - cy - Math.sin(k * Math.PI) * 20); ctx.fillStyle = '#07050c'; ctx.fillRect(bx - 3, by - 3, 6, 6); ctx.fillStyle = p.c; ctx.fillRect(bx - 2, by - 2, 4, 4); continue; }
      const x = Math.round(p.x - cx), y = Math.round(p.y - cy), fade = p.t > p.d ? 1 - (p.t - p.d) / .25 : 1, r = Math.round(p.r * Math.min(1, p.t / .12 + .3));
      ctx.globalAlpha = .55 * fade; ctx.fillStyle = p.c;
      for (let dy = -r; dy < r; dy += 2) { const hw = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)) * (1 + .08 * Math.sin(dy * .7 + p.x))); ctx.fillRect(x - hw, y + dy, hw * 2, 2); }
      ctx.globalAlpha = .9 * fade; ctx.fillStyle = '#ffffff';
      for (let k = 0; k < 3; k++) { const a = k * 2.1 + p.t * 1.3, rr = r * .5; if (Math.floor(p.t * 6 + k) % 3) ctx.fillRect(Math.round(x + Math.cos(a) * rr), Math.round(y + Math.sin(a) * rr * .8), 2, 2); }
      ctx.globalAlpha = 1;
    }
    for (const c of this.cris) this.drawCris(c, cx, cy, t);
    for (const p of this.pizzas) { const x = Math.round(p.x - cx) - 8, y = Math.round(p.y - cy) - 8 + (Math.floor(t * 3) % 2); ctx.drawImage(lbSpr('pizza', LB_LANCHE.ico, LB_ICO_PAL, 2), x, y); }
    // inimigos (de cima para baixo)
    const vis = this.ens.filter((e) => Math.abs(e.x - cx - W / 2) < W / 2 + 40 && Math.abs(e.y - cy - H / 2) < H / 2 + 40).sort((a, b) => a.y - b.y);
    for (const e of vis) this.drawIni(e, cx, cy, t);
    // você
    const px = Math.round(this.x - cx), py = Math.round(this.y - cy);
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(px - 9, py + 12, 18, 3);
    const pisca = this.hurtT > 0 && Math.floor(t * 20) % 2;
    if (!pisca || this.fim) drawIA(px - 14, py - 18 + (this.moving && !this.fim ? Math.floor(t * 8) % 2 : 0), 2, t, { flip: this.face, dizzy: this.fim && !this.fim.win, fast: this.moving });
    // hélices cortantes
    const P = this.pw;
    if (P.helice) {
      const n = LB_ST.helN[P.helice], R = LB_ST.helR[P.helice];
      for (let k = 0; k < n; k++) { const a = this.helA + (k / n) * 6.283, bx = Math.round(px + Math.cos(a) * R), by = Math.round(py - 4 + Math.sin(a) * R); ctx.fillStyle = '#07050c'; ctx.fillRect(bx - 3, by - 3, 6, 6); helice(bx, by - 1, t * 1.6 + k, 2); ctx.fillStyle = '#f6f7f9'; ctx.fillRect(bx - 1, by - 2, 2, 2); }
    }
    // raios
    for (const b of this.tiros) {
      const x = b.x - cx, y = b.y - cy, nx = b.vx / 280, ny = b.vy / 280;
      ctx.fillStyle = '#2a7fa0'; ctx.fillRect(Math.round(x - nx * 8) - 1, Math.round(y - ny * 8) - 1, 2, 2);
      ctx.fillStyle = '#7fdcff'; ctx.fillRect(Math.round(x - nx * 4) - 1, Math.round(y - ny * 4) - 1, 3, 3);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    }
    // ondas de wi-fi (anel de quadradinhos)
    for (const o of this.ondas) {
      const r = o.R * Math.min(1, o.t / .45), n = Math.max(12, Math.round(r * .45)), a0 = o.t * 2;
      ctx.globalAlpha = Math.max(0, 1 - o.t / .6); ctx.fillStyle = o.win ? '#ffffff' : '#43d17a';
      for (let k = 0; k < n; k++) { const a = a0 + (k / n) * 6.283; ctx.fillRect(Math.round(px + Math.cos(a) * r) - 1, Math.round(py - 4 + Math.sin(a) * r) - 1, 3, 3); }
      ctx.fillStyle = '#b8f3cc'; for (let k = 0; k < n; k += 3) { const a = a0 + (k / n) * 6.283; ctx.fillRect(Math.round(px + Math.cos(a) * (r - 5)), Math.round(py - 4 + Math.sin(a) * (r - 5)), 2, 2); }
      ctx.globalAlpha = 1;
    }
    for (const p of this.parts) { ctx.globalAlpha = Math.max(0, 1 - p.t / p.d); ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x - cx), Math.round(p.y - cy), 2, 2); }
    ctx.globalAlpha = 1;
    // levou dano: bordas vermelhas
    if (this.hurtT > 0 && !this.fim) { ctx.fillStyle = 'rgba(232,68,58,.35)'; ctx.fillRect(0, 0, W, 4); ctx.fillRect(0, H - 4, W, 4); ctx.fillRect(0, 0, 4, H); ctx.fillRect(W - 4, 0, 4, H); }
    // analógico virtual do dedo
    if (inp.drag && state === 'play' && !this.cards) {
      const d = inp.drag, dx = d.x - d.x0, dy = d.y - d.y0, l = Math.hypot(dx, dy), k = l > 26 ? 26 / l : 1;
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(Math.round(d.x0), Math.round(d.y0), 26, 0, 6.29); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(Math.round(d.x0 + dx * k) - 7, Math.round(d.y0 + dy * k) - 7, 14, 14);
    }
    this.drawPainel(t);
    if (this.aviso && !this.cards) { const a = this.aviso, al = Math.min(1, (2 - a.t) * 3, a.t * 6); ctx.globalAlpha = Math.max(0, al); ctx.font = '900 15px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#07050c'; ctx.strokeText(a.s.toUpperCase(), W / 2, 74); ctx.fillStyle = a.c || '#ffd04a'; ctx.fillText(a.s.toUpperCase(), W / 2, 74); ctx.textAlign = 'left'; ctx.globalAlpha = 1; }
    if (this.cards) this.drawCartas(t);
    if (this.fim && this.fim.t > .5) {
      if (this.fim.win) banner([['VOCÊ SOBREVIVEU!', F_BIG, '#8fd3ae'], ['5 minutos no Lobby dos Bugs', F_MID, '#ffffff'], [`+1000 de bônus · ${this.kills} derrotados`, F_SM, '#ffd04a']]);
      else banner([['O LOBBY CAIU', F_BIG, '#ff8a8a'], [`Você aguentou ${lbTempo(this.t)}`, F_MID, '#ffffff'], [`${this.kills} derrotados · nível ${this.lv}`, F_SM, '#c3c9cf']]);
    }
    ctx.lineJoin = 'miter';
  },
  drawPainel(t) {
    // embaixo: vida, poderes e barra de experiência
    ctx.fillStyle = 'rgba(5,6,10,.78)'; ctx.fillRect(0, H - 24, W, 24);
    const hx = 18, hy = H - 19, hw = 96, k = clamp(this.hp / this.hpMax, 0, 1);
    ctx.fillStyle = '#e8443a'; ctx.fillRect(5, hy + 1, 3, 3); ctx.fillRect(10, hy + 1, 3, 3); ctx.fillRect(5, hy + 3, 8, 3); ctx.fillRect(7, hy + 6, 4, 2);
    ctx.fillStyle = '#07050c'; ctx.fillRect(hx - 1, hy - 1, hw + 2, 10); ctx.fillStyle = '#2a1418'; ctx.fillRect(hx, hy, hw, 8);
    ctx.fillStyle = k > .5 ? '#43d17a' : k > .25 ? '#ffb25b' : (Math.floor(t * 6) % 2 ? '#e8443a' : '#ff7a6a'); ctx.fillRect(hx, hy, Math.round(hw * k), 8);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(hx, hy, Math.round(hw * k), 2);
    // poderes que você tem, com nível em pontinhos
    let x = 124;
    for (const P of LB_PODERES) {
      const n = this.pw[P.id];
      ctx.globalAlpha = n ? 1 : .18; ctx.drawImage(lbSpr('ico' + P.id, P.ico, LB_ICO_PAL, 1), x, H - 22); ctx.globalAlpha = 1;
      for (let i = 0; i < 5; i++) { ctx.fillStyle = i < n ? P.cor : '#2a3242'; ctx.fillRect(x + 1 + i * 2, H - 11, 1, 2); }
      x += 14;
    }
    ctx.font = '700 10px "IBM Plex Mono", monospace'; ctx.textAlign = 'right'; ctx.fillStyle = '#ffd04a'; ctx.fillText(`Nv ${this.lv}`, W - 6, H - 11); ctx.textAlign = 'left';
    // experiência
    ctx.fillStyle = '#0d1a2a'; ctx.fillRect(0, H - 6, W, 6);
    ctx.fillStyle = '#4fb8ff'; ctx.fillRect(0, H - 5, Math.round(W * clamp(this.xp / this.need(), 0, 1)), 4);
    ctx.fillStyle = '#bfe8ff'; ctx.fillRect(0, H - 5, Math.round(W * clamp(this.xp / this.need(), 0, 1)), 1);
    // vida do chefinho
    const C = this.chefe;
    if (C && !C.dead) {
      const bw = 200, bx = (W - bw) / 2, by = H - 40;
      ctx.font = '800 10px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#07050c'; ctx.strokeText(C.nome.toUpperCase(), W / 2, by - 3); ctx.fillStyle = '#ff8a8a'; ctx.fillText(C.nome.toUpperCase(), W / 2, by - 3); ctx.textAlign = 'left';
      ctx.fillStyle = '#07050c'; ctx.fillRect(bx - 1, by - 1, bw + 2, 7); ctx.fillStyle = '#3a1420'; ctx.fillRect(bx, by, bw, 5); ctx.fillStyle = '#ff3a6a'; ctx.fillRect(bx, by, Math.round(bw * clamp(C.hp / C.max, 0, 1)), 5);
    }
  },
  drawCartas(t) {
    const C = this.cards;
    ctx.fillStyle = 'rgba(4,6,10,.74)'; ctx.fillRect(0, 0, W, H - 24);
    ctx.textAlign = 'center'; ctx.font = F_BIG; ctx.lineWidth = 4; ctx.strokeStyle = '#07050c'; ctx.strokeText('SUBIU DE NÍVEL!', W / 2, 88); ctx.fillStyle = '#ffd04a'; ctx.fillText('SUBIU DE NÍVEL!', W / 2, 88);
    ctx.font = '600 10px "IBM Plex Mono", monospace'; ctx.fillStyle = '#c3c9cf'; ctx.fillText(`Nível ${this.lv - this.pend + 1} · escolha um poder`, W / 2, 102);
    const ok = C.t >= .4;
    C.opts.forEach((P, k) => {
      const sel = k === C.sel, x = 8 + k * 104, y = (sel ? 108 : 112) + Math.round((1 - Math.min(1, C.t / .25)) * 30), w = 96, h = 156;
      const nv = P.id === 'lanche' ? 0 : this.pw[P.id] + 1;
      ctx.globalAlpha = Math.min(1, C.t / .2);
      ctx.fillStyle = '#07050c'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
      ctx.fillStyle = sel ? '#ffd04a' : '#3a4456'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = sel ? '#1c2234' : '#141a28'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.fillStyle = P.cor; ctx.fillRect(x + 1, y + 1, w - 2, 4);
      // ícone
      ctx.fillStyle = '#0d111c'; ctx.fillRect(x + w / 2 - 18, y + 12, 36, 34);
      ctx.drawImage(lbSpr('icoG' + P.id, P.ico, LB_ICO_PAL, 3), x + w / 2 - 13, y + 16 + (sel && ok ? Math.floor(t * 4) % 2 : 0));
      // nível
      ctx.font = '800 10px Archivo, sans-serif'; ctx.fillStyle = nv === 1 ? '#8fd3ae' : '#ffd04a';
      ctx.fillText(P.id === 'lanche' ? 'EXTRA' : nv === 1 ? 'NOVO!' : `NÍVEL ${nv}`, x + w / 2, y + 60);
      if (nv) for (let i = 0; i < 5; i++) { ctx.fillStyle = i < nv - 1 ? P.cor : i === nv - 1 ? (Math.floor(t * 4) % 2 ? '#ffffff' : P.cor) : '#2a3242'; ctx.fillRect(x + w / 2 - 22 + i * 9, y + 66, 7, 4); }
      ctx.font = '900 12px Archivo, sans-serif'; ctx.fillStyle = '#ffffff';
      lbWrap(P.nome, w - 10).forEach((s, i) => ctx.fillText(s, x + w / 2, y + 90 + i * 13));
      ctx.font = '600 10px Archivo, sans-serif'; ctx.fillStyle = '#c3c9cf';
      lbWrap(P.desc[Math.max(0, nv - 1)], w - 12).forEach((s, i) => ctx.fillText(s, x + w / 2, y + 120 + i * 12));
      ctx.globalAlpha = 1;
    });
    ctx.textAlign = 'left';
  },
  demo() {
    // miniatura: o IAmiguinho cercado, com hélices, poça, onda e cristais
    this.t = 75; this.clk = 1.3; this.lv = 6; this.xp = 14; this.hp = 72;
    Object.assign(this.pw, { helice: 2, raio: 2, balde: 1, wifi: 1 });
    const pos = [[-90, -60, 'bug'], [-70, -90, 'bug'], [80, -70, 'zumbi'], [110, -20, 'bug'], [-120, 10, 'zumbi'], [95, 60, 'bug'], [-60, 80, 'bug'], [40, 110, 'zumbi'], [-100, 120, 'bug'], [130, 100, 'bug'], [0, -120, 'bug'], [-140, -40, 'bug'], [60, -110, 'zumbi'], [-20, 135, 'bug']];
    for (const [dx, dy, k] of pos) this.novoIni(k, this.x + dx, this.y + dy);
    const b = this.novoIni('chefe', this.x + 100, this.y - 130, { spr: 'bug', s: 4, r: 13, hp: 200, sp: 30, dps: 30, xp: 18, pal: 'login' }); Object.assign(b, { boss: true, nome: 'Bug do Login', hab: 'dash', cd: 3, wind: 0, dash: 0, zz: 0, hp: 130 }); this.chefe = b;
    for (let i = 0; i < 16; i++) this.cris.push({ x: this.x + rand(-140, 140), y: this.y + rand(-140, 140), v: pick([1, 1, 1, 2, 5]), pull: false, sp: 0, ph: rand(0, 6) });
    this.pocas.push({ x: this.x - 70, y: this.y + 60, r: 20, t: 1, d: 3, dps: 10, c: '#ff6fb0', tick: 0, voo: 0 });
    this.ondas.push({ x: this.x, y: this.y, t: .3, R: 60, d: 0, hit: new Set() });
    this.tiros.push({ x: this.x + 40, y: this.y - 30, vx: 220, vy: -170, t: 0, d: 0, p: 0, hit: new Set() });
    this.helA = .6;
  },
  hud() { return [`${this.score} pts · nível ${this.lv}`, lbTempo(Math.max(0, LB_META - this.t)), `${this.kills} derrotados`]; },
  overText() {
    return this.venceu
      ? `Você aguentou os 5 minutos e derrotou ${this.kills} (${this.chefes} chefinhos). Pontos: 10 por segundo, 1 por inimigo, 50 por chefinho e 1000 de bônus por sobreviver.`
      : `Você aguentou ${lbTempo(this.t)} e derrotou ${this.kills} (${this.chefes} chefinhos). Pontos: 10 por segundo, 1 por inimigo e 50 por chefinho. Chegar aos 5 minutos dá 1000 de bônus.`;
  },
};
ARCADE_NOVOS.push(lobbyJogo);
