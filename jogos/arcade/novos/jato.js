/* ============================================================ jogo: Jato de Refri */
// O IAmiguinho voa pelo depósito de uma loja de games à noite com uma garrafa de 2 L sacudida nas costas: a espuma é o jato.
// Segure para subir, solte para cair; teto e chão limitam e, no chão, ele corre. O corredor anda sozinho e acelera.
// Obstáculos liberam por distância: leitor de código fixo (0 m) · caixa caindo (120 m) · empilhadeira (260 m) · drone de entrega (420 m)
// · leitor girando (600 m) · fila de drones (850 m) · leitor duplo e dupla de drones (1100 m). Drones e empilhadeiras avisam piscando na borda.
// Caixa "?" dá um veículo por 15 s: carrinho de mercado (pula) ou controle gigante (pula alto e plana segurando). Bateu com veículo, perde só ele.
// Pontos: 1 por metro + 5 por ficha.
// Controles: PC Espaço/↑/W/clique segurado · controle ✕/A segurado (ou analógico para cima) · celular: segurar o dedo na tela.
Music.define('jato', {
  bpm: 150,
  lead: bars('E5 . G5 . B5 . E6 - D6 . B5 . G5 . A5 .', 'G5 - E5 . C5 . E5 . G5 . A5 - G5 . E5 .', 'F#5 . A5 . D6 . A5 . F#5 . D5 . E5 . F#5 .', 'G5 - - . F#5 . E5 . D#5 - - - B4 - . .'),
  arp: bars(x4('E4 G4 B4 G4'), x4('C4 E4 G4 E4'), x4('D4 F#4 A4 F#4'), x4('B3 D#4 F#4 D#4')),
  bass: bars('E2 . E3 . E2 . E3 . E2 . E3 . D3 . B2 .', 'C2 . C3 . C2 . C3 . C2 . C3 . G2 . C3 .', 'D2 . D3 . D2 . D3 . D2 . D3 . A2 . D3 .', 'B1 . B2 . B1 . B2 . F#2 . B2 . D#3 . F#2 .'),
  drums: 'k . h . s . h k k . h . s . h o',
  mix: { arp: .55, lead: .85 },
});
const JT_TETO = 56, JT_CHAO = 322, JT_PX = 78, JT_FICHA_PTS = 5, JT_VEIC_T = 15;
// [tipo, metros para liberar, peso]
const JT_TIPOS = [['laser', 0, 4], ['caixa', 120, 2.2], ['empi', 260, 2], ['drone', 420, 2.6], ['gira', 600, 2.6], ['fila', 850, 1.6], ['zigue', 1100, 1.6], ['cerco', 1100, 1.4]];
const JT_NOME = { caixa: 'Caixa caindo!', empi: 'Empilhadeira!', drone: 'Drone de entrega!', gira: 'Leitor girando!', fila: 'Fila de drones!', zigue: 'Leitor duplo!', cerco: 'Drones em dupla!', carrinho: 'Carrinho de mercado!', controle: 'Controle gigante!' };
const JT_CAUSA = { laser: 'num leitor de código', gira: 'num leitor girando', caixa: 'numa caixa', empi: 'numa empilhadeira', drone: 'num drone de entrega' };
// garrafa de 2 L de cabeça para baixo (tampa embaixo): a espuma sai pela tampa
const JT_GARRAFA = [
  '..LLLLLL..', '.LlLlLlLL.', 'LFFFFFFFFL', 'LFFFFFFFFL', 'LOOOOOOOOL', 'LOOOOOOWOL', 'LOOOOOOWOL', 'LBBBBBBBBL', 'LBBBBYBBBL', 'LBBBYYBBBL', 'LBBBYBBBBL', 'LBBYBBBBBL',
  'LOOOOOOWOL', 'LOOOOOOWOL', 'LoOOOOOOoL', '.LoOOOOoL.', '..LoOOoL..', '...LOOL...', '...LOOL...', '...GGGG...', '...GGGG...', '....gg....',
];
const JT_GARRAFA_PAL = { L: '#cfe9f0', l: '#8fb3bf', F: '#fff4dc', O: '#ff9a2e', o: '#c8641a', W: '#ffe0b0', B: '#2e6fd8', Y: '#ffd04a', G: '#3fbf6a', g: '#21864a' };
// ficha de fliperama girando (3 quadros)
const JT_FICHA = [
  ['.yyyy.', 'yXYYYy', 'yYKKYy', 'yYKKYy', 'yYYYYy', '.yyyy.'],
  ['.yy.', 'yXYy', 'yKKy', 'yKKy', 'yYYy', '.yy.'],
  ['yy', 'YY', 'KK', 'KK', 'YY', 'yy'],
];
const JT_FICHA_PAL = { y: '#a8781a', Y: '#ffd04a', K: '#7a5410', X: '#fff6c0' };
const JT_BOTCOR = [['#e86fa8', '#b24f80'], ['#7fdcff', '#3f9cc0'], ['#a77bff', '#6843bd'], ['#43d17a', '#21864a'], ['#ff8a3d', '#b35416']];
const JT_ESPUMA = ['#fff8ec', '#fff1d6', '#ffe2b0', '#ffc47a'];
function jtPick(list, m) { const ok = list.filter(([, from]) => m >= from), tot = ok.reduce((a, [, , w]) => a + w, 0); let r = Math.random() * tot; for (const [k, , w] of ok) { r -= w; if (r <= 0) return k; } return ok[0][0]; }
// distância de um ponto até um segmento
function jtSeg(px, py, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1, u = clamp(((px - ax) * vx + (py - ay) * vy) / l2, 0, 1); return Math.hypot(px - ax - vx * u, py - ay - vy * u); }
// círculo encostando num retângulo
function jtCR(c, x, y, w, h) { const dx = Math.max(x - c.x, 0, c.x - (x + w)), dy = Math.max(y - c.y, 0, c.y - (y + h)); return dx * dx + dy * dy < c.r * c.r; }
// retângulo com contorno escuro
function jtRet(x, y, w, h, cor, ol = '#07050c') { ctx.fillStyle = ol; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, w + 2, h + 2); ctx.fillStyle = cor; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
function jtHash(i) { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

const jatoJogo = {
  id: 'jato', name: 'Jato de Refri', tag: 'Voo · segure para subir', unit: 'pontos', ia: 640, bestKey: '.v1',
  desc: 'Voe pelo depósito com uma garrafa de refri sacudida.',
  how: 'Segure para o jato de refri subir e solte para cair; desvie de leitores, caixas, empilhadeiras e drones e pegue as fichas. A caixa "?" dá um veículo: aperte para pular, e ele aguenta uma batida.',
  ctl: [['Espaço / ↑', 'segurar para subir', 'pc'], ['✕ / A', 'o mesmo no controle', 'pc'], ['Clique', 'segurado também vale', 'pc'], ['Esc', 'pausa', 'pc'], ['Segurar', 'o dedo na tela para subir', 'touch']],
  pad: null,
  rank: [['@carol', 2480], ['@duda', 1960], ['@rafa', 1370], ['@bia', 860]],
  nota: 'o refri era sem gás, reclama com a fábrica',
  falas: [
    'Refri de 2 litros bem sacudido é mais forte que foguete. Fiz o teste. O teto do depósito confirmou kkkk',
    'Leitor de código não machuca, só apita e te cobra. Mesmo assim, desvia.',
    'O carrinho de mercado é meu carro oficial. A roda torta é de fábrica, chama estilo.',
    'Os drones entregam a encomenda direto na sua cara. Pontualidade impecável lol',
    'A loja fecha às dez. Eu entro às dez e um. Ninguém nunca percebeu hahaha',
  ],
  init() {
    Object.assign(this, {
      t: 0, sc: 0, dist: 0, spd: 140, y: JT_CHAO, vy: 0, ground: true, fichas: 0, score: 0, dead: false, deadT: 0, ang: 0, causa: '',
      obs: [], coins: [], pu: null, puT: 12, veic: null, buf: 0, inv: 0, gap: 120, fx: [], aviso: null, seen: {}, jetOn: false,
      espAcc: 0, fizzT: 0, poeiraT: 0, garrafa: null, tetoT: 0,
    });
  },
  demo() {
    this.y = 196; this.ground = false; this.jetOn = true; this.sc = 420;
    this.obs = [{ k: 'laser', x: 212, cy: 128, a: Math.PI / 4, h: 54, w: 0 }, { k: 'drone', st: 'aviso', t: .3, wait: 0, y: 262, x: W + 20, cor: JT_BOTCOR[0] }];
    this.coins = []; for (let i = 0; i < 9; i++) this.coins.push({ x: 128 + i * 16, y: 250 - Math.sin(i * .7) * 22, i });
  },
  held() { return isHeld('Space', 'ArrowUp', 'KeyW') || !!inp.drag || inp.ay < -.5; },
  topo() { return this.veic ? (this.veic.k === 'carrinho' ? 46 : 54) : 32; },
  // círculos de colisão do IAmiguinho (com ou sem veículo); y é a altura dos pés
  corpo() {
    const x = JT_PX, y = this.y;
    if (!this.veic) return [{ x, y: y - 23, r: 10 }, { x, y: y - 10, r: 9 }];
    if (this.veic.k === 'carrinho') return [{ x, y: y - 33, r: 10 }, { x: x - 7, y: y - 11, r: 11 }, { x: x + 8, y: y - 11, r: 11 }];
    return [{ x, y: y - 37, r: 10 }, { x: x - 13, y: y - 10, r: 10 }, { x: x + 13, y: y - 10, r: 10 }];
  },
  meio() { return this.y - (this.veic ? (this.veic.k === 'carrinho' ? 24 : 28) : 16); },
  avisar(k) { if (this.seen[k] || !JT_NOME[k]) return; this.seen[k] = true; this.aviso = { s: JT_NOME[k], t: 0 }; },
  // um leitor de código: x é o centro, a é o ângulo, h é meio comprimento, w gira
  novoLaser(m, o = {}) {
    const tipo = o.tipo || pick(m < 60 ? ['v', 'h', 'v'] : ['v', 'v', 'h', 'd', 'd']);
    let a = Math.PI / 2, h = rand(44, 64 + Math.min(14, m / 40));
    if (tipo === 'h') { a = 0; h = rand(46, 60); } else if (tipo === 'd') { a = Math.PI / 4 * (Math.random() < .5 ? 1 : -1); h = rand(50, 66); }
    if (o.gira) h = rand(50, 62 + Math.min(8, m / 200));
    const ey = o.gira ? h : Math.abs(Math.sin(a)) * h, ex = o.gira ? h : Math.abs(Math.cos(a)) * h;
    let cy = o.cy ?? rand(JT_TETO + ey + 8, JT_CHAO - ey - 8);
    // às vezes o leitor vertical encosta no teto ou no chão: obriga a passar do outro lado
    if (!o.gira && o.cy === undefined && tipo === 'v' && Math.random() < .4) cy = Math.random() < .5 ? JT_TETO + h + 2 : JT_CHAO - h - 2;
    if (o.h) h = o.h;
    const L = { k: o.gira ? 'gira' : 'laser', x: W + 24 + ex + (o.dx || 0), cy, a: o.gira ? rand(0, 3.14) : a, h, w: o.gira ? (1.25 + Math.min(1, m / 2200)) * (Math.random() < .5 ? 1 : -1) : 0 };
    this.obs.push(L);
    return ex * 2 + 24 + (o.dx || 0);
  },
  novoDrone(wait = 0, off = 0) { this.obs.push({ k: 'drone', st: 'aviso', t: 0, wait, off, y: clamp(this.meio() + off, JT_TETO + 18, JT_CHAO - 22), x: W + 20, cor: pick(JT_BOTCOR) }); },
  novasFichas() {
    const tipo = pick(['linha', 'onda', 'onda', 'escada', 'bloco']), x0 = W + 16, out = [];
    if (tipo === 'linha') { const n = 8 + Math.floor(rand(0, 5)), y = rand(JT_TETO + 24, JT_CHAO - 16); for (let i = 0; i < n; i++) out.push([i * 16, y]); }
    else if (tipo === 'onda') { const n = 12, cy = rand(JT_TETO + 60, JT_CHAO - 56), a = rand(30, 44); for (let i = 0; i < n; i++) out.push([i * 15, cy - Math.sin(i * .62) * a]); }
    else if (tipo === 'escada') { const n = 10, up = Math.random() < .5, y0 = up ? JT_CHAO - 20 : JT_TETO + 24; for (let i = 0; i < n; i++) out.push([i * 15, y0 + (up ? -1 : 1) * i * 18]); }
    else { const cy = rand(JT_TETO + 40, JT_CHAO - 40); for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) out.push([i * 16, cy + (j - 1) * 16]); }
    out.forEach(([dx, y], i) => this.coins.push({ x: x0 + dx, y, i }));
    return out[out.length - 1][0] + 30;
  },
  // escolhe e cria o próximo trecho; devolve quanto falta (em pixels) até o seguinte
  novoTrecho(m) {
    const dens = Math.max(.52, 1 - m / 3400), folga = rand(140, 220) * dens;
    if (this.t < 2.4 || Math.random() < (m < 300 ? .32 : .22)) return this.novasFichas() + folga * .6;
    let k = jtPick(JT_TIPOS, m);
    // leitor duplo ou girando com drone ainda passando ficaria sem saída: vira um leitor simples
    const drones = this.obs.some((o) => o.k === 'drone' && o.x > JT_PX - 30);
    if (drones && (k === 'zigue' || k === 'gira')) k = 'laser';
    this.avisar(k);
    // depois de 1300 m, às vezes um drone vem junto com o leitor ou a caixa
    if (m > 1300 && (k === 'laser' || k === 'caixa') && Math.random() < Math.min(.45, (m - 1300) / 1600)) this.novoDrone(rand(.2, .6));
    if (k === 'laser') return this.novoLaser(m) + folga;
    if (k === 'gira') return this.novoLaser(m, { gira: true, cy: rand(JT_TETO + 70, JT_CHAO - 70) }) + folga + 20;
    if (k === 'zigue') {
      const topo = Math.random() < .5, h = 64;
      this.novoLaser(m, { tipo: 'v', h, cy: topo ? JT_TETO + h + 1 : JT_CHAO - h - 1 });
      return this.novoLaser(m, { tipo: 'v', h, cy: topo ? JT_CHAO - h - 1 : JT_TETO + h + 1, dx: 170 }) + folga;
    }
    if (k === 'caixa') {
      // a caixa sempre aterrissa um pouco antes de chegar no IAmiguinho; depois de 700 m vêm em fileira ou em pilha
      const n = m > 700 ? pick([1, 2, 2, 3]) : m > 350 ? pick([1, 2]) : 1, pilha = n > 1 && Math.random() < .45;
      for (let i = 0; i < n; i++) this.obs.push({ k: 'caixa', st: 'espera', x: W + 20 + (pilha ? 0 : i * 64), y: JT_TETO - 20, vy: 0, D: pilha ? 1.25 + i * .32 : rand(.75, 1.05) });
      return 40 + (pilha ? 1 : n) * 64 + folga;
    }
    if (k === 'empi') { this.obs.push({ k: 'empi', st: 'aviso', t: 0, x: W + 30, cor: pick(JT_BOTCOR) }); return 220 + folga; }
    if (k === 'drone') { this.novoDrone(); return 90 + folga * .7; }
    if (k === 'fila') { for (let i = 0; i < 3; i++) this.novoDrone(i * .3); return 160 + folga; }
    if (k === 'cerco') { const alto = this.meio() < (JT_TETO + JT_CHAO) / 2; this.novoDrone(0, 0); this.novoDrone(0, alto ? 96 : -96); return 120 + folga; }
    return folga;
  },
  update(dt) {
    this.t += dt;
    for (const f of this.fx) {
      f.t += dt; f.vy += (f.g || 0) * dt; f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.k === 'espuma' && f.y > JT_CHAO - 1) { f.y = JT_CHAO - 1; f.vy = -Math.abs(f.vy) * .15; f.vx = -this.spd * .8 + rand(-25, 25); f.g = 0; }
    }
    this.fx = this.fx.filter((f) => f.t < f.life);
    if (this.aviso) { this.aviso.t += dt; if (this.aviso.t > 1.6) this.aviso = null; }
    if (this.dead) {
      this.deadT += dt; this.spd = Math.max(0, this.spd * (1 - 2.2 * dt)); const dx = this.spd * dt; this.sc += dx; this.mover(dx, dt);
      this.vy += 1100 * dt; this.y += this.vy * dt; if (!this.ground) this.ang += dt * 9;
      if (this.y >= JT_CHAO) { this.y = JT_CHAO; if (this.vy > 120) { this.vy = -this.vy * .35; shake = .08; } else { this.vy = 0; this.ground = true; this.ang = Math.PI / 2; } }
      const g = this.garrafa;
      if (g) {
        g.vy += 900 * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.a += g.va * dt;
        if (g.y > JT_CHAO - 6) { g.y = JT_CHAO - 6; g.vy = -Math.abs(g.vy) * .4; g.vx *= .6; g.va *= .6; }
        if (this.deadT < 1) for (let k = 0; k < 2; k++) this.fx.push({ k: 'espuma', x: g.x, y: g.y, vx: rand(-60, 60) - Math.cos(g.a) * 80, vy: rand(-40, 60) - Math.sin(g.a) * 80, g: 300, t: 0, life: rand(.3, .6), c: pick(JT_ESPUMA), s: pick([2, 2, 3]) });
      }
      return this.deadT > 1.6;
    }
    const m = this.dist / 10;
    this.spd = Math.min(290, 135 + m * .09);
    const dx = this.spd * dt; this.dist += dx; this.sc += dx;
    this.inv = Math.max(0, this.inv - dt);
    const held = this.held();
    // ---- o IAmiguinho
    if (!this.veic) {
      this.vy += (held ? -1500 : 1050) * dt; this.vy = clamp(this.vy, -290, 380);
    } else {
      const v = this.veic; v.t -= dt; v.sq = Math.max(0, (v.sq || 0) - dt);
      if (inp.act || pressedAny('ArrowUp', 'KeyW')) this.buf = .15; else this.buf = Math.max(0, this.buf - dt);
      if (this.buf > 0 && this.ground) { this.vy = v.k === 'carrinho' ? -540 : -700; this.buf = 0; v.sq = .12; beep(v.k === 'carrinho' ? 380 : 260, .12, 'square', .04, 420); }
      let g = 1400;
      if (v.k === 'carrinho' && !held && this.vy < 0) g = 2700;
      if (v.k === 'controle') { g = 1300; if (held && this.vy > 0) g = 380; if (!held && this.vy < 0) g = 2300; }
      this.vy = Math.min(520, this.vy + g * dt);
      if (v.t <= 0) { this.poof(); this.veic = null; this.inv = .6; beep(600, .1, 'triangle', .04, -300); }
    }
    this.y += this.vy * dt;
    const wasGround = this.ground; this.ground = false;
    if (this.y >= JT_CHAO) { if (!wasGround && this.vy > 200) { for (let k = 0; k < 5; k++) this.fx.push({ k: 'poeira', x: JT_PX + rand(-12, 12), y: JT_CHAO - 2, vx: rand(-60, 30) - this.spd * .3, vy: rand(-40, -10), t: 0, life: .4, c: '#5d6875', s: 2 }); } this.y = JT_CHAO; this.vy = 0; this.ground = true; }
    const top = this.topo();
    if (this.y - top < JT_TETO) { this.y = JT_TETO + top; if (this.vy < 0) { if (this.vy < -150 && this.tetoT <= 0) { beep(180, .05, 'square', .03); this.tetoT = .3; } this.vy = 0; } }
    this.tetoT -= dt;
    // ---- espuma do jato
    this.jetOn = held && !this.veic;
    const nx = JT_PX - 19, ny = this.y - 7;
    if (this.jetOn) {
      this.espAcc += dt * 75;
      while (this.espAcc >= 1) { this.espAcc--; this.fx.push({ k: 'espuma', x: nx + rand(-2, 2), y: ny + rand(0, 4), vx: rand(-40, 14) - this.spd * .3, vy: rand(150, 250), g: 200, t: 0, life: rand(.25, .5), c: pick(JT_ESPUMA), s: pick([2, 2, 3]) }); }
      this.fizzT -= dt; if (this.fizzT <= 0) { this.fizzT = .07; beep(rand(900, 1500), .03, 'square', .006); }
    } else this.espAcc = 0;
    if (this.ground && !this.veic) { this.poeiraT -= dt; if (this.poeiraT <= 0) { this.poeiraT = .09; this.fx.push({ k: 'poeira', x: JT_PX - 6, y: JT_CHAO - 2, vx: -this.spd * .5, vy: rand(-26, -8), t: 0, life: .3, c: '#4a5670', s: 2 }); } }
    // ---- trechos novos e power-up
    this.gap -= dx; if (this.gap <= 0) this.gap = this.novoTrecho(m);
    this.puT -= dt;
    if (this.puT <= 0 && !this.pu && !this.veic && m > 70) { this.pu = { x: W + 20, y: rand(JT_TETO + 50, JT_CHAO - 50), t: 0 }; this.puT = rand(17, 24); }
    this.mover(dx, dt);
    // ---- colisões
    const C = this.corpo();
    if (this.inv <= 0) {
      const bate = this.bateu(C);
      if (bate) { if (this.veic) this.perdeVeic(); else this.die(bate); }
    }
    for (const c of this.coins) if (!c.got && C.some((b) => Math.hypot(b.x - c.x, b.y - c.y) < b.r + 7)) {
      c.got = true; this.fichas++; sfx.coin();
      for (let k = 0; k < 3; k++) this.fx.push({ k: 'brilho', x: c.x, y: c.y, vx: rand(-50, 50), vy: rand(-60, 10), t: 0, life: .3, c: '#fff6c0', s: 2 });
    }
    this.coins = this.coins.filter((c) => !c.got && c.x > -20);
    if (this.pu && C.some((b) => Math.hypot(b.x - this.pu.x, b.y - this.pu.y) < b.r + 11)) {
      const k = pick(['carrinho', 'controle']); this.veic = { k, t: JT_VEIC_T, sq: 0 }; this.pu = null; this.inv = Math.max(this.inv, .4);
      this.seen[k] = false; this.avisar(k); sfx.big();
      for (let n = 0; n < 10; n++) this.fx.push({ k: 'brilho', x: JT_PX, y: this.y - 20, vx: rand(-110, 110), vy: rand(-110, 60), t: 0, life: .45, c: pick(['#ff6fb0', '#7fdcff', '#ffd04a', '#3fbf6a']), s: 2 });
    }
    this.score = Math.floor(this.dist / 10) + this.fichas * JT_FICHA_PTS;
    return false;
  },
  // move tudo o que está no mundo (também depois da batida, enquanto desacelera)
  mover(dx, dt) {
    for (const o of this.obs) {
      if (o.k === 'laser' || o.k === 'gira') { o.x -= dx; o.a += o.w * dt; }
      else if (o.k === 'caixa') {
        o.x -= dx;
        if (o.st === 'espera' && o.x < JT_PX + this.spd * o.D && !this.dead) { o.st = 'cai'; beep(240, .08, 'square', .03, -80); }
        if (o.st === 'cai') {
          // cai em cima de outra caixa que já está no mesmo lugar (pilha)
          const base = this.obs.reduce((b, c) => (c !== o && c.k === 'caixa' && c.st === 'chao' && Math.abs(c.x - o.x) < 4 ? Math.min(b, c.y) : b), JT_CHAO);
          o.vy += 1400 * dt; o.y += o.vy * dt; if (o.y + 20 >= base) { o.y = base - 20; o.st = 'chao'; shake = Math.max(shake, .06); beep(120, .1, 'triangle', .05); for (let k = 0; k < 6; k++) this.fx.push({ k: 'poeira', x: o.x + rand(-12, 12), y: JT_CHAO - 2, vx: rand(-50, 50) - this.spd * .4, vy: rand(-50, -10), t: 0, life: .45, c: '#8a6a44', s: 2 }); } }
      } else if (o.k === 'empi') {
        if (o.st === 'aviso') { o.t += dt; if (o.t > .9) { o.st = 'vai'; beep(520, .06, 'square', .03); setTimeout(() => beep(520, .06, 'square', .03), 120); } }
        else o.x -= dx + 80 * dt;
      } else if (o.k === 'drone') {
        if (o.st === 'aviso') {
          o.t += dt;
          if (o.t < .65 && !this.dead) o.y += (clamp(this.meio() + (o.off || 0), JT_TETO + 18, JT_CHAO - 22) - o.y) * Math.min(1, dt * 8);
          if (o.t > 1.15 + (o.wait || 0)) { o.st = 'voa'; beep(700, .08, 'sawtooth', .025, -300); }
        } else o.x -= dx + 210 * dt;
      }
    }
    this.obs = this.obs.filter((o) => o.x > -90);
    for (const c of this.coins) c.x -= dx;
    if (this.pu) { this.pu.x -= dx; this.pu.t += dt; if (this.pu.x < -20) this.pu = null; }
  },
  pontas(o) { const ca = Math.cos(o.a) * o.h, sa = Math.sin(o.a) * o.h; return [o.x - ca, o.cy - sa, o.x + ca, o.cy + sa]; },
  // devolve o tipo do que encostou (ou null)
  bateu(C) {
    for (const o of this.obs) {
      if (o.x < -60 || o.x > W + 60) continue;
      if (o.k === 'laser' || o.k === 'gira') { const [ax, ay, bx, by] = this.pontas(o); if (C.some((c) => jtSeg(c.x, c.y, ax, ay, bx, by) < c.r + 1)) return o.k; }
      else if (o.k === 'caixa') { if (o.st !== 'espera' && C.some((c) => jtCR(c, o.x - 11, o.y, 22, 20))) return 'caixa'; }
      else if (o.k === 'empi') { if (o.st === 'vai' && C.some((c) => jtCR(c, o.x + 1, JT_CHAO - 34, 24, 34) || jtCR(c, o.x + 22, JT_CHAO - 70, 6, 70) || jtCR(c, o.x + 28, JT_CHAO - 62, 38, 62))) return 'empi'; }
      else if (o.k === 'drone') { if (o.st === 'voa' && C.some((c) => Math.hypot(c.x - o.x, c.y - o.y) < c.r + 10 || jtCR(c, o.x - 6, o.y + 14, 12, 10))) return 'drone'; }
    }
    return null;
  },
  poof() { for (let n = 0; n < 12; n++) this.fx.push({ k: 'brilho', x: JT_PX + rand(-16, 16), y: this.y - rand(0, 20), vx: rand(-80, 80), vy: rand(-90, 20), t: 0, life: .4, c: '#c3c9cf', s: 2 }); },
  perdeVeic() {
    const cor = this.veic.k === 'carrinho' ? ['#9aa7b4', '#e8443a', '#5d6875'] : ['#3a4456', '#ffd04a', '#3fbf6a', '#e8443a'];
    for (let n = 0; n < 14; n++) this.fx.push({ k: 'peca', x: JT_PX + rand(-16, 16), y: this.y - rand(4, 20), vx: rand(-160, 60), vy: rand(-260, -60), g: 900, t: 0, life: .9, c: pick(cor), s: pick([2, 3, 4]) });
    this.veic = null; this.vy = -280; this.inv = 1.3; sfx.hit(); shake = .2;
  },
  die(k) {
    if (this.dead) return;
    this.dead = true; this.deadT = 0; this.causa = JT_CAUSA[k] || ''; this.vy = -240; this.ground = false; this.jetOn = false; sfx.hit(); shake = .3;
    this.garrafa = { x: JT_PX - 19, y: this.y - 18, vx: -70, vy: -300, a: 0, va: 12 };
  },
  // ---------------------------------------------------------------- desenho
  fundo(t, sc) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#090c17'); g.addColorStop(1, '#141a2b'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // estantes do fundo, bem escuras
    const P1 = 96, o1 = sc * .2, i1 = Math.floor(o1 / P1);
    for (let k = -1; k < 5; k++) {
      const idx = i1 + k, x = Math.round(k * P1 - (o1 % P1));
      ctx.fillStyle = '#0f1524'; ctx.fillRect(x, JT_TETO, 82, JT_CHAO - JT_TETO);
      for (let yy = JT_TETO + 34; yy < JT_CHAO; yy += 46) {
        ctx.fillStyle = '#18203a'; ctx.fillRect(x, yy, 82, 3);
        let bx = x + 3;
        for (let n = 0; n < 6; n++) { const r = jtHash(idx * 17 + n + yy), bw = 8 + Math.floor(r * 10), bh = 12 + Math.floor(jtHash(idx * 7 + n * 3 + yy) * 18); if (bx + bw > x + 80) break; ctx.fillStyle = r < .33 ? '#161d33' : r < .66 ? '#1a1b33' : '#14213a'; ctx.fillRect(bx, yy - bh, bw, bh); bx += bw + 2; }
      }
    }
    // empilhadeiras paradas lá no fundo, com a luz de giro piscando
    const P2 = 560, o2 = sc * .35, i2 = Math.floor(o2 / P2);
    for (let k = -1; k < 2; k++) {
      const x = Math.round(k * P2 - (o2 % P2) + 230 + jtHash(i2 + k) * 120), y = JT_CHAO;
      ctx.fillStyle = '#0c111d'; ctx.fillRect(x, y - 44, 4, 44); ctx.fillRect(x - 14, y - 6, 16, 3); ctx.fillRect(x + 4, y - 22, 30, 16); ctx.fillRect(x + 8, y - 38, 20, 3); ctx.fillRect(x + 8, y - 38, 2, 16); ctx.fillRect(x + 26, y - 38, 2, 16); ctx.fillRect(x + 6, y - 8, 9, 8); ctx.fillRect(x + 24, y - 8, 9, 8);
      const on = Math.floor(t * 3 + k) % 2;
      ctx.fillStyle = on ? '#ff9a2e' : '#5a3410'; ctx.fillRect(x + 16, y - 41, 4, 3);
      if (on) { ctx.fillStyle = 'rgba(255,154,46,.12)'; ctx.fillRect(x + 6, y - 50, 24, 18); }
    }
    // estantes da frente: colunas azuis, vigas laranja e caixas de jogo
    // caixas: papelão (a maioria) e caixas de jogo coloridas, tudo apagado para não brigar com os obstáculos
    const P3 = 150, o3 = sc * .5, i3 = Math.floor(o3 / P3), cores = ['#4a2840', '#1f3a50', '#4a4020', '#1f4434', '#36284e', '#4a3020'], brilho = ['#ff6fb0', '#7fdcff', '#ffd04a', '#43d17a', '#b79cff', '#ff8a3d'];
    for (let k = -1; k < 3; k++) {
      const idx = i3 + k, x = Math.round(k * P3 - (o3 % P3));
      for (const lv of [JT_CHAO - 70, JT_CHAO - 150]) {
        let bx = x + 7;
        for (let n = 0; n < 6; n++) {
          const r = jtHash(idx * 31 + n * 5 + lv), bw = 18 + Math.floor(r * 12), bh = 16 + Math.floor(jtHash(idx * 13 + n + lv * 3) * 14); if (bx + bw > x + 118) break;
          const c = Math.floor(jtHash(idx * 5 + n * 11 + lv) * cores.length), papelao = jtHash(idx * 7 + n * 2 + lv) < .55;
          if (r < .18) { bx += bw + 2; continue; }
          ctx.fillStyle = '#07050c'; ctx.fillRect(bx - 1, lv - bh - 1, bw + 2, bh + 1);
          ctx.fillStyle = papelao ? '#3a2e24' : cores[c]; ctx.fillRect(bx, lv - bh, bw, bh);
          ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(bx, lv - bh, bw, 2);
          if (papelao) { ctx.fillStyle = '#4a3c2e'; ctx.fillRect(bx + Math.floor(bw / 2) - 1, lv - bh, 3, bh); }
          else { ctx.fillStyle = brilho[c]; ctx.globalAlpha = .3; ctx.fillRect(bx + 3, lv - bh + 4, bw - 6, 2); ctx.fillRect(bx + 3, lv - 6, 5, 2); ctx.globalAlpha = 1; }
          // segunda caixa empilhada, às vezes
          if (jtHash(idx * 3 + n + lv * 7) < .35 && bh < 24) { const h2 = 10 + Math.floor(r * 8), w2 = bw - 6; ctx.fillStyle = '#07050c'; ctx.fillRect(bx + 2, lv - bh - h2 - 1, w2 + 2, h2 + 1); ctx.fillStyle = '#33281f'; ctx.fillRect(bx + 3, lv - bh - h2, w2, h2); }
          bx += bw + 2;
        }
        ctx.fillStyle = '#07050c'; ctx.fillRect(x, lv, 124, 5); ctx.fillStyle = '#6a4220'; ctx.fillRect(x, lv + 1, 124, 3);
      }
      for (const px of [x, x + 120]) { ctx.fillStyle = '#07050c'; ctx.fillRect(px - 1, JT_TETO + 4, 6, JT_CHAO - JT_TETO - 4); ctx.fillStyle = '#1d3052'; ctx.fillRect(px, JT_TETO + 4, 4, JT_CHAO - JT_TETO - 4); ctx.fillStyle = '#0d1424'; for (let yy = JT_TETO + 10; yy < JT_CHAO; yy += 8) ctx.fillRect(px + 1, yy, 2, 2); }
      // placa de neon em algumas estantes
      if (jtHash(idx * 3) < .3) {
        const nx = x + 40, ny = JT_TETO + 22, on = !(jtHash(idx) < .5 && Math.sin(t * 23 + idx) > .85);
        ctx.font = '900 11px Archivo, sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = on ? 'rgba(255,111,176,.25)' : 'rgba(0,0,0,0)'; ctx.strokeText('GAMES', nx, ny); ctx.fillStyle = on ? '#ff8cc4' : '#5a2a44'; ctx.fillText('GAMES', nx, ny);
      }
    }
    // lâmpadas penduradas e o cone de luz
    for (let k = -1; k < 3; k++) {
      const idx = i3 + k, x = Math.round(k * P3 - (o3 % P3) + 60), pisca = idx % 5 === 3 && Math.sin(t * 31 + idx) > .6;
      ctx.fillStyle = '#1c2436'; ctx.fillRect(x, 0, 1, JT_TETO + 6);
      ctx.fillStyle = '#07050c'; ctx.fillRect(x - 8, JT_TETO + 5, 17, 6); ctx.fillStyle = '#3a4456'; ctx.fillRect(x - 7, JT_TETO + 6, 15, 4);
      ctx.fillStyle = pisca ? '#5a5030' : '#fff2c0'; ctx.fillRect(x - 3, JT_TETO + 10, 7, 3);
      if (!pisca) {
        ctx.fillStyle = 'rgba(255,214,140,.055)'; ctx.beginPath(); ctx.moveTo(x - 6, JT_TETO + 12); ctx.lineTo(x + 7, JT_TETO + 12); ctx.lineTo(x + 56, JT_CHAO); ctx.lineTo(x - 55, JT_CHAO); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,214,140,.05)'; ctx.beginPath(); ctx.moveTo(x - 3, JT_TETO + 12); ctx.lineTo(x + 4, JT_TETO + 12); ctx.lineTo(x + 30, JT_CHAO); ctx.lineTo(x - 29, JT_CHAO); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,230,170,.35)'; ctx.fillRect(x - 5, JT_TETO + 13, 11, 1);
      }
    }
  },
  teto(sc) {
    ctx.fillStyle = '#080a12'; ctx.fillRect(0, 0, W, JT_TETO);
    const off = sc % 24;
    ctx.fillStyle = '#1c2538'; ctx.fillRect(0, JT_TETO - 16, W, 2); ctx.fillRect(0, JT_TETO - 4, W, 4);
    ctx.fillStyle = '#2b3650';
    for (let x = -24; x < W + 24; x += 24) { const xx = Math.round(x - off); for (let k = 0; k < 12; k++) { ctx.fillRect(xx + k, JT_TETO - 14 + k, 2, 1); ctx.fillRect(xx + 23 - k, JT_TETO - 14 + k, 1, 1); } ctx.fillRect(xx, JT_TETO - 14, 2, 10); }
    ctx.fillStyle = '#3a4560'; ctx.fillRect(0, JT_TETO - 1, W, 1);
  },
  chao(sc) {
    ctx.fillStyle = '#151b29'; ctx.fillRect(0, JT_CHAO, W, H - JT_CHAO);
    ctx.fillStyle = '#1a2132'; for (let x = -40; x < W + 40; x += 26) { const xx = x - (sc % 26); ctx.beginPath(); ctx.moveTo(xx, JT_CHAO); ctx.lineTo(xx + 10, JT_CHAO); ctx.lineTo(xx + 10 - 38 * SK, H); ctx.lineTo(xx - 38 * SK, H); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#4a5670'; ctx.fillRect(0, JT_CHAO, W, 2);
    ctx.fillStyle = '#b8901a'; for (let x = -24; x < W + 24; x += 24) ctx.fillRect(Math.round(x - (sc % 24)), JT_CHAO + 12, 14, 3);
  },
  emissor(x, y, t) {
    jtRet(x - 6, y - 6, 12, 12, '#2a3140');
    ctx.fillStyle = '#3a4456'; ctx.fillRect(Math.round(x) - 6, Math.round(y) - 6, 12, 2);
    ctx.fillStyle = '#f6f7f9'; ctx.fillRect(Math.round(x) - 5, Math.round(y) + 3, 10, 2); ctx.fillStyle = '#0a1016'; for (const d of [-4, -2, 1, 3]) ctx.fillRect(Math.round(x) + d, Math.round(y) + 3, 1, 2);
    ctx.fillStyle = Math.floor(t * 8) % 2 ? '#ff3b55' : '#ff7a8a'; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 3, 4, 4);
  },
  desenhaLaser(o, t) {
    const [ax, ay, bx, by] = this.pontas(o);
    ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(255,40,70,.3)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = Math.floor(t * 20) % 3 ? '#ff3b55' : '#ff5a70'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = '#ffd6dc'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    const u = (t * 1.6 + o.cy * .01) % 1; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(ax + (bx - ax) * u) - 1, Math.round(ay + (by - ay) * u) - 1, 3, 3);
    this.emissor(ax, ay, t); this.emissor(bx, by, t);
    if (o.k === 'gira') { jtRet(o.x - 4, o.cy - 4, 8, 8, '#3a4456'); ctx.fillStyle = '#ffd04a'; ctx.fillRect(Math.round(o.x) - 1, Math.round(o.cy) - 1, 2, 2); }
  },
  caixa(x, y) {
    const X = Math.round(x) - 11, Y = Math.round(y);
    jtRet(X, Y, 22, 20, '#a8845a');
    ctx.fillStyle = '#c49a68'; ctx.fillRect(X, Y, 22, 4); ctx.fillStyle = '#5a4428'; ctx.fillRect(X, Y + 4, 22, 1);
    ctx.fillStyle = '#d8c39a'; ctx.fillRect(X + 9, Y, 4, 20);
    ctx.fillStyle = '#5a4428'; ctx.fillRect(X + 3, Y + 9, 1, 6); ctx.fillRect(X + 2, Y + 10, 3, 1); ctx.fillRect(X + 17, Y + 9, 1, 6); ctx.fillRect(X + 16, Y + 10, 3, 1);
  },
  empilhadeira(o, t) {
    const x = Math.round(o.x), y = JT_CHAO;
    // farol
    ctx.fillStyle = 'rgba(255,240,180,.1)'; ctx.beginPath(); ctx.moveTo(x + 28, y - 26); ctx.lineTo(x - 50, y - 44); ctx.lineTo(x - 50, y); ctx.lineTo(x + 28, y - 18); ctx.closePath(); ctx.fill();
    // palete com caixas de jogo
    jtRet(x, y - 8, 26, 5, '#7a5a3a'); ctx.fillStyle = '#8a95a3'; ctx.fillRect(x, y - 3, 26, 2);
    jtRet(x + 1, y - 22, 11, 13, '#e86fa8'); jtRet(x + 13, y - 22, 11, 13, '#4fb8ff'); jtRet(x + 5, y - 34, 14, 11, '#ffd04a');
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + 1, y - 22, 11, 2); ctx.fillRect(x + 13, y - 22, 11, 2); ctx.fillRect(x + 5, y - 34, 14, 2);
    // torre
    jtRet(x + 22, y - 70, 6, 70, '#3a4456'); ctx.fillStyle = '#5d6875'; ctx.fillRect(x + 22, y - 70, 2, 70); ctx.fillStyle = '#0a1016'; for (let k = 0; k < 9; k++) ctx.fillRect(x + 25, y - 66 + k * 7, 2, 3);
    // cabine com um Amiguinho dirigindo
    ctx.fillStyle = '#07050c'; ctx.fillRect(x + 29, y - 63, 30, 6); ctx.fillRect(x + 29, y - 63, 5, 34); ctx.fillRect(x + 54, y - 63, 5, 34);
    ctx.fillStyle = '#2a3140'; ctx.fillRect(x + 30, y - 62, 28, 4); ctx.fillStyle = '#5d6875'; ctx.fillRect(x + 31, y - 58, 3, 29); ctx.fillRect(x + 55, y - 58, 3, 29);
    spr(BOT, x + 37, y - 46, 2, false, { ...PAL, O: o.cor[0], o: o.cor[1] });
    jtRet(x + 28, y - 30, 38, 22, '#e8a72a'); ctx.fillStyle = '#ffd06a'; ctx.fillRect(x + 28, y - 30, 38, 3); ctx.fillStyle = '#b07a18'; ctx.fillRect(x + 28, y - 13, 38, 5);
    jtRet(x + 58, y - 40, 9, 32, '#b07a18');
    ctx.fillStyle = '#07050c'; for (let k = 0; k < 5; k++) ctx.fillRect(x + 31 + k * 5, y - 24, 3, 3);
    ctx.fillStyle = '#fff2c0'; ctx.fillRect(x + 27, y - 26, 2, 4);
    // rodas girando
    for (const wx of [x + 30, x + 52]) { jtRet(wx, y - 12, 12, 12, '#1a2230'); ctx.fillStyle = '#8a95a3'; const r = Math.floor(t * 12) % 2; ctx.fillRect(wx + 4, y - 8, 4, 4); ctx.fillStyle = '#3a4456'; ctx.fillRect(wx + (r ? 1 : 9), y - 7, 2, 2); }
    // luz de giro
    const on = Math.floor(t * 6) % 2; ctx.fillStyle = '#07050c'; ctx.fillRect(x + 40, y - 68, 8, 6); ctx.fillStyle = on ? '#ff9a2e' : '#7a4410'; ctx.fillRect(x + 41, y - 67, 6, 4);
    if (on) { ctx.fillStyle = 'rgba(255,154,46,.2)'; ctx.fillRect(x + 34, y - 74, 20, 14); }
  },
  drone(o, t) {
    const x = Math.round(o.x), y = Math.round(o.y);
    if (o.st === 'voa') for (let k = 0; k < 3; k++) { ctx.fillStyle = `rgba(200,220,255,${.35 - k * .1})`; ctx.fillRect(x + 14 + k * 9, y - 6 + k * 5, 7, 1); }
    ctx.fillStyle = '#c3c9cf'; ctx.fillRect(x, y + 11, 1, 4);
    this.caixaMini(x - 6, y + 14);
    sprO(BOT, x - 12, y - 12, 3, { ...PAL, O: o.cor[0], o: o.cor[1] });
    helice(x, y - 16, t * 1.8, 2);
  },
  caixaMini(x, y) { jtRet(x, y, 12, 9, '#a8845a'); ctx.fillStyle = '#d8c39a'; ctx.fillRect(x + 5, y, 2, 9); ctx.fillStyle = '#c49a68'; ctx.fillRect(x, y, 12, 2); },
  alerta(x, y, t, cor) {
    if (Math.floor(t * 10) % 2) return;
    const X = Math.round(x), Y = Math.round(y);
    ctx.fillStyle = '#07050c'; for (let k = 0; k < 10; k++) ctx.fillRect(X - k - 1, Y - 10 + k, 2 * k + 3, 1), ctx.fillRect(X - k - 1, Y + 10 - k, 2 * k + 3, 1);
    ctx.fillStyle = cor; for (let k = 0; k < 9; k++) ctx.fillRect(X - k, Y - 9 + k, 2 * k + 1, 1), ctx.fillRect(X - k, Y + 9 - k, 2 * k + 1, 1);
    ctx.fillStyle = '#07050c'; ctx.fillRect(X - 1, Y - 5, 3, 6); ctx.fillRect(X - 1, Y + 3, 3, 2);
  },
  carrinho(y, t) {
    const x = JT_PX, Y = Math.round(y);
    // alça e rodinhas
    ctx.fillStyle = '#07050c'; ctx.fillRect(x - 25, Y - 37, 4, 14); ctx.fillStyle = '#9aa7b4'; ctx.fillRect(x - 24, Y - 36, 2, 12); ctx.fillStyle = '#e8443a'; ctx.fillRect(x - 27, Y - 38, 6, 3);
    for (const wx of [x - 14, x + 9]) { jtRet(wx, Y - 6, 6, 6, '#1a2230'); ctx.fillStyle = '#8a95a3'; ctx.fillRect(wx + 2, Y - 4, 2, 2); }
    ctx.fillStyle = '#07050c'; ctx.fillRect(x - 17, Y - 9, 34, 4); ctx.fillStyle = '#9aa7b4'; ctx.fillRect(x - 16, Y - 8, 32, 2);
    // fundo da cesta, o IAmiguinho sentado e a grade da frente
    ctx.fillStyle = 'rgba(154,167,180,.14)'; ctx.fillRect(x - 19, Y - 27, 38, 18);
    drawIA(x - 14, Y - 44, 2, t, { fast: true });
    ctx.fillStyle = '#07050c'; ctx.fillRect(x - 20, Y - 28, 40, 3); ctx.fillRect(x - 20, Y - 12, 40, 3);
    ctx.fillStyle = '#c3c9cf'; ctx.fillRect(x - 19, Y - 27, 38, 1); ctx.fillRect(x - 19, Y - 11, 38, 1);
    for (let k = 0; k <= 9; k++) { ctx.fillStyle = '#9aa7b4'; ctx.fillRect(x - 19 + k * 4 + (k > 4 ? 1 : 0) - Math.round(k * .2), Y - 26, 1, 15); }
    ctx.fillStyle = 'rgba(154,167,180,.7)'; ctx.fillRect(x - 19, Y - 20, 38, 1);
  },
  controle(y, t) {
    const x = JT_PX, sq = this.veic && this.veic.sq > 0 ? 3 : 0, Y = Math.round(y), top = Y - 20 + sq;
    // pegadores, corpo claro, direcional, analógicos e quatro botões coloridos
    jtRet(x - 26, Y - 10, 15, 10, '#b9c0c9'); jtRet(x + 11, Y - 10, 15, 10, '#b9c0c9');
    jtRet(x - 26, top, 52, Y - 8 - top, '#e8ebee');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 26, top, 52, 2); ctx.fillStyle = '#b9c0c9'; ctx.fillRect(x - 26, Y - 10, 52, 2);
    ctx.fillStyle = '#2a3140'; ctx.fillRect(x - 21, top + 5, 9, 3); ctx.fillRect(x - 18, top + 2, 3, 9);
    ctx.fillStyle = '#ffd04a'; ctx.fillRect(x + 16, top + 2, 3, 3); ctx.fillStyle = '#3fbf6a'; ctx.fillRect(x + 20, top + 5, 3, 3); ctx.fillStyle = '#e8443a'; ctx.fillRect(x + 12, top + 5, 3, 3); ctx.fillStyle = '#2e6fd8'; ctx.fillRect(x + 16, top + 8, 3, 3);
    ctx.fillStyle = '#07050c'; ctx.fillRect(x - 9, top + 4, 6, 6); ctx.fillRect(x + 3, top + 4, 6, 6); ctx.fillStyle = '#3a4456'; ctx.fillRect(x - 8, top + 5, 4, 4); ctx.fillRect(x + 4, top + 5, 4, 4);
    ctx.fillStyle = Math.floor(t * 4) % 2 ? '#7fdcff' : '#2a5fc0'; ctx.fillRect(x - 2, top + 1, 4, 2);
    // cabo balançando atrás
    ctx.fillStyle = '#2a3140'; for (let k = 0; k < 8; k++) ctx.fillRect(x - 27 - k * 3, Y - 14 + Math.round(Math.sin(t * 8 + k * .8) * 2) + k, 3, 2);
    drawIA(x - 14, top - 32, 2, t, { fast: this.vy < 0 });
  },
  jato(t, x, y) {
    // espuma saindo da tampa (desenho contínuo, além das gotas soltas)
    for (let k = 0; k < 14; k++) {
      const yy = y + 1 + k * 3 + Math.floor((t * 90) % 3), abre = 1 + k * .5, xx = x - k * 1.4 + Math.sin(k * 2.3 + t * 40) * abre;
      ctx.fillStyle = JT_ESPUMA[Math.min(3, Math.floor(k / 4))]; const s = k < 3 ? 3 : 2; ctx.fillRect(Math.round(xx) - 1, Math.round(yy), s, s);
      if (k > 4 && k % 2) ctx.fillRect(Math.round(xx + abre * 1.4), Math.round(yy + 1), 2, 2);
    }
  },
  ia(t, y, live) {
    const x = JT_PX, held = this.jetOn || !live, sh = held && Math.floor(t * 30) % 2 ? 1 : 0;
    const bob = this.ground && live && !this.jetOn ? Math.floor(t * 12) % 2 : 0, Y = Math.round(y) - bob;
    if (held) this.jato(t, x - 19 + sh, Y - 8);
    spr(JT_GARRAFA, x - 24 + sh, Y - 30 + (sh ? -1 : 0), 1, false, JT_GARRAFA_PAL);
    ctx.fillStyle = '#07050c'; ctx.fillRect(x - 15, Y - 21, 4, 3); ctx.fillStyle = '#2a3140'; ctx.fillRect(x - 15, Y - 20, 3, 1);
    drawIA(x - 14, Y - 32, 2, t, { fast: held });
    // pezinhos correndo
    if (this.ground && live && !this.jetOn) { ctx.fillStyle = '#2e6fd8'; const f = Math.floor(t * 12) % 2; ctx.fillRect(x - 6 + (f ? 2 : -2), Y, 4, 2); ctx.fillRect(x + 4 + (f ? -2 : 2), Y, 4, 2); }
  },
  draw(t = this.t) {
    const live = state !== 'menu', sc = this.sc || t * 50;
    this.fundo(t, sc);
    this.teto(sc);
    // alçapões das caixas que ainda vão cair
    for (const o of this.obs) if (o.k === 'caixa' && o.st === 'espera' && o.x < W + 30) {
      const X = Math.round(o.x); ctx.fillStyle = '#030408'; ctx.fillRect(X - 14, JT_TETO - 10, 28, 10);
      for (let k = 0; k < 7; k++) { ctx.fillStyle = k % 2 ? '#07050c' : '#ffb020'; ctx.fillRect(X - 14 + k * 4, JT_TETO - 2, 4, 2); }
      this.caixa(o.x, JT_TETO - 22 + (Math.floor(t * 14) % 2));
      ctx.fillStyle = Math.floor(t * 8) % 2 ? '#ff3b55' : '#5a1a22'; ctx.fillRect(X + 16, JT_TETO - 8, 4, 4);
    }
    this.chao(sc);
    // linha de queda: mostra onde a caixa vai descer
    for (const o of this.obs) if (o.k === 'caixa' && o.st !== 'chao' && o.x < W + 14) {
      const X = Math.round(o.x), y0 = o.st === 'espera' ? JT_TETO : Math.round(o.y) + 22;
      ctx.fillStyle = Math.floor(t * 8) % 2 ? 'rgba(255,59,85,.32)' : 'rgba(255,59,85,.18)';
      for (let y = y0 + ((Math.floor(t * 60)) % 8); y < JT_CHAO; y += 8) ctx.fillRect(X - 1, y, 2, 4);
    }
    for (const o of this.obs) if (o.k === 'caixa' && o.st === 'cai') { const k = clamp((o.y - JT_TETO) / (JT_CHAO - JT_TETO), 0, 1), w = Math.round(10 + 14 * k); ctx.fillStyle = `rgba(0,0,0,${.2 + .3 * k})`; ctx.fillRect(Math.round(o.x) - w, JT_CHAO, w * 2, 3); }
    // fichas
    for (const c of this.coins) {
      const f = [0, 1, 2, 1][Math.floor(t * 9 + c.i * .45) % 4], fr = JT_FICHA[f];
      spr(fr, Math.round(c.x) - 6 + [0, 2, 4][f], Math.round(c.y) - 6, 2, false, JT_FICHA_PAL);
    }
    for (const o of this.obs) if (o.k === 'laser' || o.k === 'gira') this.desenhaLaser(o, t);
    for (const o of this.obs) if (o.k === 'caixa' && o.st !== 'espera') this.caixa(o.x, o.y);
    for (const o of this.obs) if (o.k === 'empi' && o.st === 'vai') this.empilhadeira(o, t);
    // caixa de power-up
    if (this.pu) {
      const p = this.pu, X = Math.round(p.x) - 10, Y = Math.round(p.y + Math.sin(t * 4) * 3) - 10, cor = ['#ff6fb0', '#7fdcff', '#ffd04a', '#3fbf6a'][Math.floor(t * 6) % 4];
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(X - 4, Y - 4, 28, 28);
      jtRet(X, Y, 20, 20, cor); ctx.fillStyle = '#1a2236'; ctx.fillRect(X + 2, Y + 2, 16, 16);
      ctx.font = '900 14px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.fillText('?', X + 10, Y + 15); ctx.textAlign = 'left';
      if (Math.floor(t * 5) % 3 === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(X + 21, Y - 3, 2, 6); ctx.fillRect(X + 19, Y - 1, 6, 2); }
    }
    // espuma solta (atrás do IAmiguinho)
    for (const f of this.fx) if (f.k === 'espuma' || f.k === 'poeira') { ctx.globalAlpha = Math.max(0, 1 - (f.t / f.life) * .8); ctx.fillStyle = f.c; ctx.fillRect(Math.round(f.x), Math.round(f.y), f.s, f.s); }
    ctx.globalAlpha = 1;
    // o IAmiguinho (no menu ele flutua no jato)
    if (this.dead) {
      ctx.save(); ctx.translate(JT_PX, Math.round(this.y) - 16); ctx.rotate(this.ang); drawIA(-14, -16, 2, t, { dizzy: true }); ctx.restore();
      const g = this.garrafa; if (g) { ctx.save(); ctx.translate(Math.round(g.x), Math.round(g.y)); ctx.rotate(g.a); spr(JT_GARRAFA, -5, -11, 1, false, JT_GARRAFA_PAL); ctx.restore(); }
    } else if (!(this.inv > 0 && live && Math.floor(t * 16) % 2)) {
      const y = live ? this.y : 200 + Math.round(Math.sin(t * 2.2) * 12);
      if (this.veic && !(this.veic.t < 3 && Math.floor(t * 8) % 2 && live)) { if (this.veic.k === 'carrinho') this.carrinho(y, t); else this.controle(y, t); }
      else if (this.veic) drawIA(JT_PX - 14, Math.round(y) - this.topo(), 2, t);
      else this.ia(t, y, live);
    }
    for (const o of this.obs) if (o.k === 'drone' && o.st === 'voa') this.drone(o, t);
    // avisos piscando na borda direita
    for (const o of this.obs) {
      if (o.k === 'drone' && o.st === 'aviso') { this.alerta(W - 14, o.y, t, o.t > .65 ? '#ff3b55' : '#ffd04a'); if (o.t > .65 && Math.floor(t * 10) % 2 === 0) { ctx.fillStyle = 'rgba(255,59,85,.35)'; ctx.fillRect(W - 40, Math.round(o.y), 20, 1); } }
      if (o.k === 'empi' && o.st === 'aviso') this.alerta(W - 14, JT_CHAO - 22, t, '#ff9a2e');
    }
    for (const f of this.fx) if (f.k === 'brilho' || f.k === 'peca') { ctx.globalAlpha = Math.max(0, 1 - f.t / f.life); ctx.fillStyle = f.c; ctx.fillRect(Math.round(f.x), Math.round(f.y), f.s, f.s); }
    ctx.globalAlpha = 1;
    if (this.aviso && !this.dead && live) {
      const a = this.aviso, al = Math.min(1, (1.6 - a.t) * 3, a.t * 6); ctx.globalAlpha = Math.max(0, al);
      ctx.font = '900 16px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#0a1016'; ctx.strokeText(a.s.toUpperCase(), W / 2, 86); ctx.fillStyle = '#ffd04a'; ctx.fillText(a.s.toUpperCase(), W / 2, 86); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
  },
  hud() { const m = Math.floor(this.dist / 10); return ['Pontos', this.score, `${m} m · ${this.fichas} ${this.fichas === 1 ? 'ficha' : 'fichas'}`]; },
  overText() { const m = Math.floor(this.dist / 10); return `Voou ${m} m e pegou ${this.fichas} ${this.fichas === 1 ? 'ficha' : 'fichas'}${this.causa ? `. Bateu ${this.causa}.` : '.'}`; },
};
ARCADE_NOVOS.push(jatoJogo);
