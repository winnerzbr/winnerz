/* ============================================================ jogo: Torre do Backlog */
// O IAmiguinho quica sozinho e sobe a pilha infinita de jogos não zerados. Você só controla os lados; sair por um lado da tela entra pelo outro.
// As caixas novas aparecem com a altura: normal, que anda, rachada (quebra ao pisar, sem quicar), de demo (some depois de um pulo),
// mola ZEREI! (pulo enorme) e bugs voadores (Amiguinhos com antena glitch: de lado matam, pisar em cima elimina).
// Item: hélice turbo (o boné gira forte e sobe sozinho por um tempo). Cair abaixo da tela acaba a partida.
// Fundo por altura: quarto → prédio → céu → espaço, com marcas de metros. Placar: a maior altura em metros.
Music.define('torre', {
  bpm: 150,
  lead: bars('D5 . F5 . Bb5 - . A5 . F5 . D5 F5 - . .', 'Eb5 . G5 . C6 - . Bb5 . G5 . Eb5 G5 - . .', 'F5 . A5 . C6 - . D6 . C6 . A5 F5 - G5 A5', 'Bb5 - - - D6 - - - F6 - - - . . . .'),
  arp: bars(x4('Bb4 D5 F5 D5'), x4('Eb5 G5 Bb5 G5'), x4('F4 A4 C5 A4'), x4('Bb4 D5 F5 Bb5')),
  bass: bars('Bb2 . Bb3 . Bb2 . Bb3 . Bb2 . Bb3 . F2 . A2 .', 'Eb2 . Eb3 . Eb2 . Eb3 . Eb2 . Eb3 . Bb2 . G2 .', 'F2 . F3 . F2 . F3 . F2 . F3 . C3 . A2 .', 'Bb2 . Bb3 . F2 . F3 . Bb2 . D3 . F3 . Bb3 .'),
  drums: 'k . h . s . h k . k h . s . h o',
  mix: { arp: .6, lead: .85 },
});
const TB_PX = 20; // pixels por metro
const TB_G = 900, TB_PULO = 440, TB_MOLA = 920, TB_TURBO = 560, TB_VMAX = 620, TB_VX = 205, TB_CAM = 150, TB_BH = 10;
const TB_ZONAS = [['Quarto', 0], ['Prédio', 100], ['Céu', 250], ['Espaço', 450]];
// tipos novos: [tipo, metros em que libera, aviso na tela]
const TB_NOVO = { mola: [15, 'Mola ZEREI!'], move: [35, 'Caixa que anda!'], quebra: [60, 'Caixa rachada!'], turbo: [80, 'Hélice turbo!'], some: [110, 'Caixa de demo!'], bug: [140, 'Bug voador!'] };
// capas inventadas: [capa, escuro, claro]
const TB_CORES = [
  ['#e8443a', '#9a2a22', '#ff9a8a'], ['#2e6fd8', '#1a3f86', '#8fbaff'], ['#3fbf6a', '#21864a', '#a8f0c0'], ['#a77bff', '#6843bd', '#dccbff'],
  ['#ff8a3d', '#b35416', '#ffcaa0'], ['#3fc9c0', '#21807a', '#b0f2ec'], ['#e86fa8', '#a8467a', '#ffc4de'], ['#f2f4f6', '#8a95a3', '#ffffff'],
];
const TB_RACHADA = ['#8a7f74', '#4f463f', '#b4a99c'];
const TB_ICONES = [
  ['..X..', 'XXXXX', '.XXX.', '.X.X.', 'X...X'], ['..XX.', '.XX..', 'XXXX.', '..XX.', '.XX..'], ['.XXX.', 'X...X', 'X...X', 'X...X', '.XXX.'],
  ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'], ['..X..', '.XXX.', 'XXXXX', '.XXX.', '..X..'], ['X...X', '.X.X.', '..X..', '.X.X.', 'X...X'],
];
const TB_BONE = ['....BWWB....', '..BBBWWBBB..', '.BBWWBBWWBB.', '.BBBBBBBBBB.', 'hBBBBBBBBBBB', '.....hhhhhhh'];
const TB_CARTUCHO = ['.SSSSSS.', 'SSSSSSSS', 'SWWWWWWS', 'SWYYYYWS', 'SWWWWWWS', 'SSSSSSSS', 'SsSsSsSs'];
const tbHash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const tbWrap = (x) => ((x % W) + W) % W;
function tbTexto(s, x, y, font, cor, borda = 3) { ctx.font = font; ctx.lineWidth = borda; ctx.strokeStyle = '#07050c'; ctx.strokeText(s, x, y); ctx.fillStyle = cor; ctx.fillText(s, x, y); }
// repete um enfeite de fundo a cada S pixels, com rolagem mais lenta (k) que a câmera
function tbRepete(cam, k, S, fn) { const base = cam * k, n0 = Math.floor(base / S) - 1, n1 = Math.floor((base + H) / S) + 1; for (let n = n0; n <= n1; n++) fn(n * S - base, n); }

const tbJogo = {
  id: 'torre', name: 'Torre do Backlog', tag: 'Pulo · subida infinita', unit: 'metros', ia: 312, bestKey: '.v1',
  desc: 'Quique de caixa em caixa na pilha infinita de jogos.',
  how: 'O IAmiguinho quica sozinho: mova para os lados e suba a pilha infinita de jogos não zerados (saindo por um lado, volta pelo outro). Pise nos bugs por cima, nunca de lado, e não caia lá embaixo.',
  ctl: [['← →', 'mover', 'pc'], ['A D', 'mover', 'pc'], ['Analógico', 'mover no controle', 'pc'], ['Esc', 'pausa', 'pc'], ['Segurar', 'lado esquerdo ou direito da tela', 'touch'], ['◀ ▶', 'botões embaixo', 'touch']],
  pad: [['◀', 'ArrowLeft'], ['▶', 'ArrowRight']],
  rank: [['@carol', 1184], ['@duda', 846], ['@bia', 527], ['@rafa', 268]],
  nota: 'parei pra jogar um da pilha',
  falas: [
    'Essa torre é meu backlog. Cada caixa é um jogo que eu vou zerar. Um dia. Talvez kkkk',
    'Caixa rachada é jogo que comprei na promoção e nunca abri. Pisou, quebrou.',
    'Achou a mola ZEREI!? Aproveita, é a única coisa zerada nessa torre inteira.',
    'Lá em cima tem bug voando. Pisa na cabeça dele. Funciona melhor que patch hahaha',
    'O backlog nunca acaba. Cheguei no espaço e tinha mais caixa lá. Com DLC.',
  ],
  init() {
    Object.assign(this, {
      t: 0, x: 160, y: 0, vx: 0, vy: -TB_PULO, face: 1, camY: -(H - 40), minY: 0, score: 0, dead: null, deadT: 0, turbo: 0, isDemo: false,
      plats: [{ k: 'chao', x: 0, y: 0, w: W }], bugs: [], items: [], fx: [], topY: 0, lastBugY: 0, lastTurboM: -99, seen: {}, aviso: null, zona: 0,
    });
    this.gen();
  },
  demo() {
    this.isDemo = true; this.camY = -2700; const c = this.camY;
    const P = (k, x, y, w, extra = {}) => this.plats.push({ k, x, y: c + y, w, c: (x * 7 + y) % TB_CORES.length, ic: (x + y) % TB_ICONES.length, vx: 30, ...extra });
    this.plats = [];
    P('normal', 24, 320, 46); P('move', 196, 278, 44); P('quebra', 70, 226, 44); P('normal', 214, 178, 46, { spring: true, sx: 18 }); P('some', 40, 126, 44); P('normal', 150, 84, 44); P('normal', 240, 330, 44);
    this.bugs = [{ x0: 112, x: 112, y: c + 150, amp: 0, w: 1, ph: 0, pal: { ...PAL, O: '#7be86a', o: '#3c9a3e' } }];
    this.items = [{ x: 260, y: c + 112 }];
    this.x = 118; this.y = c + 262; this.vy = -120; this.face = 1;
  },
  dif(m) {
    const k = clamp(m / 600, 0, 1), k2 = clamp((m - 600) / 900, 0, 1);
    return {
      gmin: 26 + 26 * k, gmax: 52 + 36 * k + 2 * k2, w: Math.round(50 - 14 * k - 4 * k2),
      wNormal: 10 - 6 * k, wMove: m >= TB_NOVO.move[0] ? 2 + 4 * k : 0, wSome: m >= TB_NOVO.some[0] ? 1.5 + 3 * k + 2 * k2 : 0,
      mola: m >= TB_NOVO.mola[0] ? .085 : 0, crack: m >= TB_NOVO.quebra[0] ? .22 + .3 * k : 0, turbo: m >= TB_NOVO.turbo[0] ? .04 : 0,
      bug: m >= TB_NOVO.bug[0] ? .1 + .16 * k + .1 * k2 : 0, bugGap: 260 - 110 * k - 40 * k2, mv: 30 + 50 * k + 30 * k2,
    };
  },
  novo(tipo) { if (this.seen[tipo]) return; this.seen[tipo] = true; this.aviso = { s: TB_NOVO[tipo][1], t: 0 }; },
  // gera a pilha para cima até um pouco acima da tela; sempre existe um caminho de caixas seguras
  gen() {
    while (this.topY > this.camY - 90) {
      const m = -this.topY / TB_PX, D = this.dif(m), gap = rand(D.gmin, D.gmax), y = Math.round(this.topY - gap);
      const tot = D.wNormal + D.wMove + D.wSome; let r = Math.random() * tot;
      const k = (r -= D.wNormal) < 0 ? 'normal' : (r -= D.wMove) < 0 ? 'move' : 'some';
      const w = D.w, x = Math.round(rand(4, W - w - 4));
      const p = { k, x, y, w, c: Math.floor(Math.random() * TB_CORES.length), ic: Math.floor(Math.random() * TB_ICONES.length), vx: (Math.random() < .5 ? -1 : 1) * D.mv * rand(.8, 1.2) };
      if (k === 'normal' && Math.random() < D.mola) { p.spring = true; p.sx = Math.round(rand(8, w - 16)); this.novo('mola'); }
      if (k === 'move') this.novo('move'); if (k === 'some') this.novo('some');
      this.plats.push(p);
      // caixa rachada de enfeite (nunca é o único caminho)
      if (Math.random() < D.crack && gap > 34) { const cw = Math.max(34, w - 4); this.plats.push({ k: 'quebra', x: Math.round(rand(4, W - cw - 4)), y: Math.round(y + gap * rand(.4, .6)), w: cw, c: 0, ic: 0 }); this.novo('quebra'); }
      // hélice turbo em cima de uma caixa normal
      if (k === 'normal' && !p.spring && m - this.lastTurboM > 45 && Math.random() < D.turbo) { this.items.push({ x: x + w / 2, y: y - 16 }); this.lastTurboM = m; this.novo('turbo'); }
      // bug voador no meio do caminho
      this.topY = y;
      // bug voador: ganha um andar só dele, longe das caixas de cima e de baixo
      if (Math.random() < D.bug && y < this.lastBugY - D.bugGap) {
        const amp = rand(24, 110), x0 = rand(amp + 14, W - amp - 14), cor = pick([['#7be86a', '#3c9a3e'], ['#ff6be0', '#a8338c'], ['#ffd04a', '#b08a12'], ['#ff8a3d', '#b35416']]);
        this.bugs.push({ x0, x: x0, y: y - 36, amp, w: rand(1.1, 2.1), ph: rand(0, 6.28), pal: { ...PAL, O: cor[0], o: cor[1] } });
        this.topY = y - 72 + Math.round(rand(0, 12)) - Math.round(D.gmin * .2); this.lastBugY = y; this.novo('bug');
        const w2 = D.w, x2 = Math.round(rand(4, W - w2 - 4));
        this.plats.push({ k: 'normal', x: x2, y: this.topY, w: w2, c: Math.floor(Math.random() * TB_CORES.length), ic: Math.floor(Math.random() * TB_ICONES.length), vx: 0 });
      }
    }
  },
  zonaDe(m) { let z = 0; TB_ZONAS.forEach(([, b], i) => { if (m >= b) z = i; }); return z; },
  die(como) { if (this.dead) return; this.dead = como; this.deadT = 0; this.turbo = 0; if (como === 'bug') { this.vy = -170; sfx.hit(); shake = .3; } else beep(620, .7, 'triangle', .05, -480); },
  update(dt) {
    this.t += dt;
    for (const f of this.fx) { f.t += dt; f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt; if (f.g) f.vy += f.g * dt; }
    this.fx = this.fx.filter((f) => f.t < f.life);
    if (this.aviso) { this.aviso.t += dt; if (this.aviso.t > 1.8) this.aviso = null; }
    if (this.dead) { this.deadT += dt; if (this.dead === 'bug') { this.vy = Math.min(TB_VMAX, this.vy + TB_G * dt); this.y += this.vy * dt; } return this.deadT > 1.6; }
    // lados: setas, analógico, botões da tela ou segurar um lado da tela
    let ax = inp.ax;
    if (inp.drag) ax = inp.drag.x < W / 2 ? -1 : 1;
    this.vx += (ax * TB_VX - this.vx) * Math.min(1, dt * 12);
    if (Math.abs(ax) > .2) this.face = ax < 0 ? -1 : 1;
    this.x = tbWrap(this.x + this.vx * dt);
    for (const p of this.plats) {
      if (p.k === 'move') { p.x += p.vx * dt; if (p.x < 2) { p.x = 2; p.vx = Math.abs(p.vx); } if (p.x > W - p.w - 2) { p.x = W - p.w - 2; p.vx = -Math.abs(p.vx); } }
      if (p.gone) p.gone += dt; if (p.sprT > 0) p.sprT -= dt;
    }
    const y0 = this.y;
    if (this.turbo > 0) {
      this.turbo -= dt; this.vy = -TB_TURBO;
      if (Math.random() < dt * 30) this.fx.push({ k: 'vento', x: this.x + rand(-8, 8), y: this.y + 2, vy: 160, t: 0, life: .35 });
      if (this.turbo <= 0) this.vy = -380;
    } else this.vy = Math.min(TB_VMAX, this.vy + TB_G * dt);
    this.y += this.vy * dt;
    // pousar numa caixa (só caindo, com os pés passando pela tampa)
    if (this.vy > 0 && this.turbo <= 0) {
      for (const p of this.plats) {
        if (p.dead || p.gone || y0 > p.y || this.y < p.y) continue;
        if (![0, W, -W].some((o) => this.x + o + 8 > p.x && this.x + o - 8 < p.x + p.w)) continue;
        if (p.k === 'quebra') { this.quebra(p); continue; }
        this.y = p.y;
        if (p.spring) { this.vy = -TB_MOLA; p.sprT = .3; this.fx.push({ k: 'txt', s: 'ZEREI!', x: p.x + p.sx + 4, y: p.y - 14, vy: -40, t: 0, life: 1, cor: '#ffd04a' }); beep(392, .08, 'square', .05); setTimeout(() => beep(784, .16, 'square', .05, 400), 70); }
        else { this.vy = -TB_PULO; beep(300 + Math.min(500, -this.y / 40), .06, 'square', .03, 260); }
        if (p.k === 'some') p.gone = .001;
        for (let n = 0; n < 4; n++) this.fx.push({ k: 'po', x: this.x + rand(-8, 8), y: p.y - 1, vx: rand(-40, 40), vy: rand(-30, -8), t: 0, life: .3 });
        break;
      }
    }
    // hélice turbo
    for (const it of this.items) if (!it.got && Math.abs(tbWrap(this.x - it.x + W / 2) - W / 2) < 16 && Math.abs(this.y - 14 - it.y) < 20) {
      it.got = true; this.turbo = 2.4; sfx.big(); this.fx.push({ k: 'txt', s: 'TURBO!', x: this.x, y: this.y - 40, vy: -30, t: 0, life: .9, cor: '#7fdcff' });
    }
    // bugs voadores: de lado mata, por cima elimina
    for (const b of this.bugs) {
      if (b.dead) continue;
      b.x = b.x0 + Math.sin(this.t * b.w + b.ph) * b.amp;
      const by = b.y + Math.sin(this.t * 3 + b.ph) * 3, dx = Math.abs(tbWrap(this.x - b.x + W / 2) - W / 2);
      if (dx < 18 && this.y > by - 12 && this.y - 28 < by + 11) {
        if (this.turbo > 0 || (this.vy > 0 && y0 <= by - 4)) {
          b.dead = true; sfx.coin(); this.fx.push({ k: 'bug', x: b.x, y: by, vx: rand(-30, 30), vy: -80, g: 700, t: 0, life: 1.2, pal: b.pal });
          this.fx.push({ k: 'txt', s: pick(['BUG CORRIGIDO', 'PATCH!', 'ESMAGADO']), x: b.x, y: by - 18, vy: -30, t: 0, life: .9, cor: '#8fd3ae' });
          if (this.turbo <= 0) { this.y = by - 12; this.vy = -TB_PULO * 1.08; }
        } else this.die('bug');
      }
    }
    if (this.dead) return false;
    if (this.y - this.camY < TB_CAM) this.camY = this.y - TB_CAM;
    this.minY = Math.min(this.minY, this.y); this.score = Math.max(this.score, Math.floor(-this.minY / TB_PX));
    const z = this.zonaDe(this.score); if (z > this.zona) { this.zona = z; this.aviso = { s: `${TB_ZONAS[z][0]} · ${TB_ZONAS[z][1]} m`, t: 0, zona: true }; sfx.point(); }
    this.gen();
    const lim = this.camY + H + 60;
    this.plats = this.plats.filter((p) => p.y < lim && !p.dead && !(p.gone > .3));
    this.bugs = this.bugs.filter((b) => b.y < lim && !b.dead); this.items = this.items.filter((i) => i.y < lim && !i.got);
    if (this.y - this.camY > H + 30) this.die('queda');
    return false;
  },
  quebra(p) {
    p.dead = true; beep(200, .16, 'sawtooth', .05, -120); setTimeout(() => beep(140, .12, 'square', .03, -60), 50);
    const h = Math.round(p.w / 2);
    for (const [dx, w, vx] of [[0, h, -40], [h, p.w - h, 40]]) this.fx.push({ k: 'caco', x: p.x + dx, y: p.y, w, vx: vx + rand(-15, 15), vy: rand(-40, 0), g: 800, t: 0, life: 1 });
  },
  // ------------------------------------------------------------ desenho
  fundo(z, cam, t) {
    if (z === 0) { // quarto
      ctx.fillStyle = '#151026'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#19132e'; for (let x = 0; x < W; x += 20) ctx.fillRect(x, 0, 10, H);
      tbRepete(cam, .5, 150, (y, n) => {
        const h = tbHash(n), lado = n % 2 ? 18 : 214;
        if (h < .34) { // prateleira com caixas em pé
          ctx.fillStyle = '#2a2140'; ctx.fillRect(lado, y + 40, 88, 4);
          for (let i = 0; i < 6; i++) { const c = TB_CORES[Math.floor(tbHash(n * 9 + i) * 8)]; ctx.fillStyle = c[1]; ctx.fillRect(lado + 4 + i * 13, y + 22 - (i % 3) * 2, 9, 18 + (i % 3) * 2); ctx.fillStyle = c[0]; ctx.fillRect(lado + 6 + i * 13, y + 25, 2, 10); }
        } else if (h < .67) { // pôster inventado
          ctx.fillStyle = '#07050c'; ctx.fillRect(lado + 14, y + 6, 52, 66); ctx.fillStyle = '#231a3c'; ctx.fillRect(lado + 16, y + 8, 48, 62);
          ctx.fillStyle = '#e86fa8'; ctx.beginPath(); ctx.arc(lado + 40, y + 32, 13, 0, 6.29); ctx.fill(); ctx.fillStyle = '#231a3c'; ctx.fillRect(lado + 16, y + 34, 48, 2);
          ctx.fillStyle = '#3a2b5c'; ctx.fillRect(lado + 16, y + 46, 48, 24); ctx.fillStyle = '#ffd04a'; ctx.fillRect(lado + 22, y + 52, 36, 3); ctx.fillRect(lado + 28, y + 58, 24, 2);
        } else { // janela à noite
          ctx.fillStyle = '#07050c'; ctx.fillRect(lado + 10, y + 6, 64, 58); ctx.fillStyle = '#0b1430'; ctx.fillRect(lado + 12, y + 8, 60, 54);
          for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(220,230,255,.7)'; ctx.fillRect(lado + 14 + Math.floor(tbHash(n + i * 3) * 56), y + 10 + Math.floor(tbHash(n * 2 + i) * 30), 1, 1); }
          ctx.fillStyle = '#18213e'; ctx.fillRect(lado + 12, y + 46, 60, 16); ctx.fillStyle = 'rgba(255,214,140,.45)'; for (let i = 0; i < 5; i++) ctx.fillRect(lado + 16 + i * 11, y + 50, 3, 3);
          ctx.fillStyle = '#07050c'; ctx.fillRect(lado + 41, y + 8, 2, 54); ctx.fillRect(lado + 12, y + 33, 60, 2);
        }
      });
    } else if (z === 1) { // prédio
      ctx.fillStyle = '#0b1120'; ctx.fillRect(0, 0, W, H);
      tbRepete(cam, .2, 40, (y, n) => { for (let i = 0; i < 10; i++) if (tbHash(n * 13 + i) < .35) { ctx.fillStyle = 'rgba(255,214,140,.18)'; ctx.fillRect(48 + i * 23, Math.round(y + tbHash(n + i) * 30), 2, 3); } });
      for (const [x0, w] of [[0, 40], [W - 40, 40]]) {
        ctx.fillStyle = '#141d33'; ctx.fillRect(x0, 0, w, H); ctx.fillStyle = '#0d1426'; ctx.fillRect(x0 === 0 ? w - 3 : x0, 0, 3, H);
        tbRepete(cam, .65, 28, (y, n) => { ctx.fillStyle = '#1c2742'; ctx.fillRect(x0, Math.round(y), w, 2); for (let i = 0; i < 3; i++) { const on = tbHash(n * 7 + i + x0) < .45; ctx.fillStyle = on ? 'rgba(255,208,120,.55)' : '#0c1222'; ctx.fillRect(x0 + 6 + i * 11, Math.round(y + 9), 6, 10); } });
      }
    } else if (z === 2) { // céu
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0e1636'); g.addColorStop(1, '#1b2852'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 24; i++) { ctx.fillStyle = 'rgba(220,230,255,.4)'; ctx.fillRect(Math.floor(tbHash(i) * W), Math.floor((tbHash(i + 50) * H - cam * .05) % H + H) % H, 1, 1); }
      ctx.fillStyle = 'rgba(255,240,200,.08)'; ctx.beginPath(); ctx.arc(250, 92, 30, 0, 6.29); ctx.fill(); ctx.fillStyle = '#e9e2c8'; ctx.beginPath(); ctx.arc(250, 92, 16, 0, 6.29); ctx.fill(); ctx.fillStyle = '#c9c0a2'; ctx.fillRect(244, 86, 4, 4); ctx.fillRect(254, 96, 3, 3);
      tbRepete(cam, .45, 70, (y, n) => {
        const x = Math.round(((tbHash(n) * 380 + t * 6) % 380) - 60), yy = Math.round(y);
        ctx.fillStyle = '#23345f'; ctx.fillRect(x, yy + 8, 70, 10); ctx.fillRect(x + 12, yy + 2, 30, 8); ctx.fillRect(x + 36, yy + 4, 22, 6);
        ctx.fillStyle = '#2c3f72'; ctx.fillRect(x + 12, yy + 2, 30, 2); ctx.fillRect(x, yy + 8, 12, 2);
      });
    } else { // espaço
      ctx.fillStyle = '#05060d'; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 70; i++) { const sp = .1 + (i % 3) * .08, yy = Math.floor(((tbHash(i + 7) * H - cam * sp) % H + H) % H); ctx.fillStyle = i % 6 ? 'rgba(200,215,255,.5)' : (Math.floor(t * 3 + i) % 4 ? '#ffffff' : '#7fdcff'); ctx.fillRect(Math.floor(tbHash(i) * W), yy, 1, i % 9 ? 1 : 2); }
      tbRepete(cam, .1, 520, (y, n) => {
        const x = n % 2 ? 70 : 238, yy = Math.round(y + 120), c = TB_CORES[Math.abs(n) % 8];
        ctx.fillStyle = c[1]; ctx.beginPath(); ctx.arc(x, yy, 24, 0, 6.29); ctx.fill(); ctx.fillStyle = c[0]; ctx.beginPath(); ctx.arc(x - 4, yy - 4, 18, 0, 6.29); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x - 40, yy, 80, 2); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x - 46, yy + 2, 92, 1);
      });
      tbRepete(cam, .3, 190, (y, n) => { const x = Math.round(30 + tbHash(n * 3) * 250 + Math.sin(t * .6 + n) * 6); spr(TB_CARTUCHO, x, Math.round(y + 40 + Math.cos(t * .8 + n) * 4), 2, false, { S: '#3a4456', s: '#ffd04a', W: '#5d6875', Y: TB_CORES[Math.abs(n) % 8][0] }); });
    }
  },
  draw(t = this.t) {
    const cam = this.camY, mid = Math.max(0, -(cam + H / 2) / TB_PX);
    // fundo: a zona de baixo inteira e a de cima aparecendo por cima, na transição
    let z0 = 0; for (let i = 1; i < TB_ZONAS.length; i++) if (mid - TB_ZONAS[i][1] + 25 >= 50) z0 = i;
    this.fundo(z0, cam, t);
    if (z0 + 1 < TB_ZONAS.length) { const f = clamp((mid - TB_ZONAS[z0 + 1][1] + 25) / 50, 0, 1); if (f > 0) { ctx.globalAlpha = f; this.fundo(z0 + 1, cam, t); ctx.globalAlpha = 1; } }
    // a torre de verdade, gigante e apagada, lá atrás
    const k = .3, base = H - 40 + (-(H - 40)) * k;
    ctx.globalAlpha = .11;
    for (let n = Math.max(0, Math.floor((base - cam * k - H) / 20) - 2), end = n + 24; n < end; n++) {
      const y = Math.round(base - (n + 1) * 20 - cam * k); if (y > H || y < -24) continue;
      const w = Math.round(96 + tbHash(n) * 64), x = Math.round(160 - w / 2 + (tbHash(n + 99) - .5) * 18), c = TB_CORES[Math.floor(tbHash(n * 5) * 8)];
      ctx.fillStyle = c[0]; ctx.fillRect(x, y, w, 19); ctx.fillStyle = c[1]; ctx.fillRect(x, y, 10, 19); ctx.fillRect(x, y + 17, w, 2);
    }
    ctx.globalAlpha = 1;
    // marcas de altura e o seu recorde
    ctx.textAlign = 'right';
    const mTop = Math.floor(-(cam) / TB_PX / 25) * 25 + 25, mBot = Math.max(0, Math.floor(-(cam + H) / TB_PX / 25) * 25);
    for (let m = mBot; m <= mTop; m += 25) {
      if (m === 0) continue; const y = Math.round(-m * TB_PX - cam);
      if (m % 100 === 0) { ctx.fillStyle = 'rgba(232,235,238,.14)'; for (let x = 0; x < W; x += 8) ctx.fillRect(x, y, 4, 1); ctx.font = '700 9px "IBM Plex Mono", monospace'; ctx.fillStyle = 'rgba(232,235,238,.55)'; ctx.fillText(`${m} m`, W - 6, y - 3); }
      else { ctx.fillStyle = 'rgba(232,235,238,.3)'; ctx.fillRect(W - 8, y, 8, 1); ctx.font = '600 8px "IBM Plex Mono", monospace'; ctx.fillStyle = 'rgba(232,235,238,.32)'; ctx.fillText(`${m}`, W - 10, y + 3); }
    }
    const rec = best[this.id] || 0;
    if (rec > 0 && !this.isDemo) { const y = Math.round(-rec * TB_PX - cam); if (y > -10 && y < H + 10) { ctx.fillStyle = 'rgba(255,178,91,.6)'; for (let x = 0; x < W; x += 6) ctx.fillRect(x, y, 3, 2); ctx.font = '700 9px "IBM Plex Mono", monospace'; ctx.fillStyle = '#ffb25b'; ctx.textAlign = 'left'; ctx.fillText(`recorde ${rec} m`, 6, y - 4); } }
    ctx.textAlign = 'left';
    // chão do quarto e a mesa do IAmiguinho
    const fy = Math.round(-cam);
    if (fy < H + 60) {
      ctx.fillStyle = '#07050c'; ctx.fillRect(222, fy - 46, 86, 5); ctx.fillStyle = '#3b2f2a'; ctx.fillRect(223, fy - 45, 84, 3); ctx.fillStyle = '#2a211d'; ctx.fillRect(228, fy - 41, 5, 41); ctx.fillRect(297, fy - 41, 5, 41);
      ctx.fillStyle = '#07050c'; ctx.fillRect(240, fy - 84, 50, 36); ctx.fillRect(261, fy - 48, 8, 3); ctx.fillStyle = '#0d1a1f'; ctx.fillRect(243, fy - 81, 44, 30);
      ctx.fillStyle = '#7fdcff'; ctx.fillRect(247, fy - 77, 36, 2); ctx.fillStyle = 'rgba(127,220,255,.45)'; for (let i = 0; i < 4; i++) ctx.fillRect(247, fy - 72 + i * 5, 12 + ((i * 11) % 22), 2);
      ctx.fillStyle = 'rgba(127,220,255,.06)'; ctx.fillRect(226, fy - 96, 78, 50);
      for (let i = 0; i < 4; i++) { const c = TB_CORES[(i * 3) % 8]; ctx.fillStyle = '#07050c'; ctx.fillRect(18 + i * 3, fy - 11 - i * 11, 52 - i * 6, 11); ctx.fillStyle = c[0]; ctx.fillRect(19 + i * 3, fy - 10 - i * 11, 50 - i * 6, 9); ctx.fillStyle = c[1]; ctx.fillRect(19 + i * 3, fy - 10 - i * 11, 4, 9); }
      ctx.fillStyle = '#2a1c18'; ctx.fillRect(0, fy, W, Math.max(0, H - fy)); ctx.fillStyle = '#3a2820'; for (let y = fy + 8; y < H; y += 12) ctx.fillRect(0, y, W, 2);
      ctx.fillStyle = '#4b342a'; for (let x = 0; x < W; x += 46) for (let y = fy; y < H; y += 24) ctx.fillRect(x + ((y - fy) / 24 % 2 ? 23 : 0), y + 2, 2, 8);
      ctx.fillStyle = '#e8ebee'; ctx.fillRect(0, fy, W, 2);
    }
    // caixas de jogo
    for (const p of this.plats) if (p.k !== 'chao') { const y = Math.round(p.y - cam); if (y > -20 && y < H + 10) this.caixa(p, Math.round(p.x), y, t); }
    // hélices turbo
    for (const it of this.items) {
      const x = Math.round(it.x), y = Math.round(it.y - cam + Math.sin(t * 4 + it.x) * 2);
      ctx.fillStyle = `rgba(127,220,255,${.12 + .08 * Math.sin(t * 6)})`; ctx.beginPath(); ctx.arc(x, y + 3, 15, 0, 6.29); ctx.fill();
      sprO(TB_BONE, x - 12, y, 2, PAL); helice(x, y - 3, t * 2.2, 2);
    }
    // bugs voadores
    for (const b of this.bugs) { const by = b.y + Math.sin((this.t || t) * 3 + b.ph) * 3; this.bug(b.x, Math.round(by - cam), t, b.pal, false); }
    // efeitos de trás
    for (const f of this.fx) {
      const a = 1 - f.t / f.life, y = Math.round(f.y - cam);
      if (f.k === 'caco') { ctx.globalAlpha = a; ctx.fillStyle = '#07050c'; ctx.fillRect(Math.round(f.x) - 1, y - 1, f.w + 2, TB_BH + 2); ctx.fillStyle = TB_RACHADA[0]; ctx.fillRect(Math.round(f.x), y, f.w, TB_BH); ctx.fillStyle = TB_RACHADA[1]; ctx.fillRect(Math.round(f.x), y + TB_BH - 2, f.w, 2); }
      else if (f.k === 'bug') { ctx.globalAlpha = a; this.bug(f.x, y, t, f.pal, true); }
      else if (f.k === 'po') { ctx.globalAlpha = a; ctx.fillStyle = '#e8ebee'; ctx.fillRect(Math.round(f.x), y, 2, 2); }
      else if (f.k === 'vento') { ctx.globalAlpha = a * .8; ctx.fillStyle = '#bfefff'; ctx.fillRect(Math.round(f.x), y, 1, 6); }
    }
    ctx.globalAlpha = 1;
    // o IAmiguinho (com cópia do outro lado quando está atravessando a borda)
    let py = this.y - cam;
    if (state === 'menu' && !this.isDemo) py -= Math.abs(Math.sin(t * 3.1)) * 62;
    const fast = this.turbo > 0 || this.vy < 0;
    const xs = [this.x]; if (this.x < 16) xs.push(this.x + W); if (this.x > W - 16) xs.push(this.x - W);
    for (const xx of xs) {
      const x = Math.round(xx);
      if (this.turbo > 0) { ctx.fillStyle = `rgba(127,220,255,${.16 + .06 * Math.sin(t * 20)})`; ctx.beginPath(); ctx.arc(x, Math.round(py - 18), 24, 0, 6.29); ctx.fill(); helice(x, Math.round(py - 38), t * 3, 3); ctx.fillStyle = 'rgba(127,220,255,.25)'; ctx.fillRect(x - 16, Math.round(py - 36), 32, 1); }
      drawIA(x - 14, Math.round(py - 32), 2, t * (this.turbo > 0 ? 2 : 1), { flip: this.face < 0, fast, dizzy: this.dead === 'bug' });
    }
    // textos que sobem
    for (const f of this.fx) if (f.k === 'txt') { ctx.globalAlpha = Math.min(1, (1 - f.t / f.life) * 2); ctx.textAlign = 'center'; tbTexto(f.s, Math.round(f.x), Math.round(f.y - cam), '900 12px Archivo, sans-serif', f.cor); ctx.textAlign = 'left'; }
    ctx.globalAlpha = 1;
    // aviso de caixa nova ou de zona nova
    if (this.aviso && !this.dead && state === 'play') {
      const a = this.aviso, al = Math.max(0, Math.min(1, (1.8 - a.t) * 3, a.t * 6)); ctx.globalAlpha = al; ctx.textAlign = 'center';
      tbTexto(a.s.toUpperCase(), W / 2, 74, '900 16px Archivo, sans-serif', a.zona ? '#7fdcff' : '#ffd04a', 4); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
    if (this.dead && this.deadT > .35 && state === 'play') banner([[this.dead === 'bug' ? 'PEGOU UM BUG' : 'CAIU DA PILHA', F_BIG, '#ff8a8a'], [`${this.score} m de jogos não zerados`, F_SM, '#ffffff'], ['e o backlog continua lá em cima', F_SM, '#c3c9cf']], 190);
  },
  caixa(p, x, y, t) {
    if (p.k === 'some') { const f = p.gone ? clamp(1 - p.gone / .3, 0, 1) : 1; ctx.globalAlpha = (.55 + .12 * Math.sin(t * 5 + p.x)) * f; }
    const c = p.k === 'quebra' ? TB_RACHADA : TB_CORES[p.c], gold = p.spring;
    const cover = gold ? '#ffd04a' : c[0], dark = gold ? '#c99a2a' : c[1], light = gold ? '#fff2ad' : c[2];
    // mola em cima
    if (p.spring) {
      const sx = x + p.sx, ext = p.sprT > 0 ? 6 : 0;
      ctx.fillStyle = '#07050c'; ctx.fillRect(sx - 1, y - 9 - ext, 10, 10 + ext);
      for (let i = 0; i < 3 + (ext ? 2 : 0); i++) { ctx.fillStyle = i % 2 ? '#9aa7b4' : '#e8ebee'; ctx.fillRect(sx + 1, y - 6 - ext + i * (ext ? 1.4 : 2) | 0, 6, 2); }
      ctx.fillStyle = '#e8443a'; ctx.fillRect(sx, y - 9 - ext, 8, 3);
    }
    ctx.fillStyle = '#07050c'; ctx.fillRect(x - 1, y - 1, p.w + 2, TB_BH + 2);
    ctx.fillStyle = cover; ctx.fillRect(x, y, p.w, TB_BH);
    ctx.fillStyle = dark; ctx.fillRect(x, y, 5, TB_BH); ctx.fillRect(x + 5, y + TB_BH - 1, p.w - 5, 1);
    ctx.fillStyle = light; ctx.fillRect(x + 5, y, p.w - 5, 1); ctx.fillRect(x + 1, y + 2, 3, 1); ctx.fillRect(x + 1, y + 6, 3, 1);
    if (gold) { ctx.font = '900 8px Archivo, sans-serif'; ctx.fillStyle = '#3a2a06'; ctx.fillText('ZEREI!', x + 7, y + 8); }
    else if (p.k === 'quebra') {
      ctx.fillStyle = '#07050c'; const cx = x + Math.round(p.w * .55);
      for (let j = 0; j < TB_BH; j++) ctx.fillRect(cx + [0, 1, 2, 1, 0, -1, 0, 1, 2, 1][j], y + j, 1, 1);
      ctx.fillRect(cx - 6, y + 4, 6, 1); ctx.fillRect(cx + 2, y + 7, 5, 1);
    } else {
      const ico = TB_ICONES[p.ic], ic = p.c === 7 ? '#07050c' : '#ffffff';
      ctx.fillStyle = ic; for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) if (ico[j][i] === 'X') ctx.fillRect(x + 8 + i, y + 2 + j, 1, 1);
      ctx.fillStyle = light; ctx.fillRect(x + 16, y + 3, Math.min(p.w - 26, 16), 2); ctx.fillRect(x + 16, y + 6, Math.min(p.w - 30, 8), 1);
      ctx.fillStyle = '#f6f7f9'; ctx.fillRect(x + p.w - 7, y + 2, 5, 6); ctx.fillStyle = dark; ctx.fillRect(x + p.w - 6, y + 3, 3, 2);
    }
    if (p.k === 'move') { ctx.fillStyle = '#7fdcff'; for (const [ax, d] of [[x - 3, -1], [x + p.w + 2, 1]]) { ctx.fillRect(ax, y + 4, 1, 3); ctx.fillRect(ax + d, y + 5, 1, 1); } }
    if (p.k === 'some') { ctx.fillStyle = '#e8ebee'; for (let i = 0; i < p.w; i += 4) { ctx.fillRect(x + i, y - 2, 2, 1); ctx.fillRect(x + i, y + TB_BH + 1, 2, 1); } }
    ctx.globalAlpha = 1;
  },
  // Amiguinho bug: antena com ponta glitch, asinhas e linhas que escorregam de vez em quando
  bug(cx, cy, t, pal, morto) {
    const x0 = Math.round(cx - 12), y0 = Math.round(cy - 12), gl = Math.floor(t * 9 + cx * .1) % 7 === 0;
    const flap = Math.floor(t * 14) % 2;
    ctx.fillStyle = 'rgba(232,235,238,.55)';
    if (!morto) { ctx.fillRect(x0 - 6, y0 + 4 + flap * 3, 6, 3); ctx.fillRect(x0 + 24, y0 + 4 + flap * 3, 6, 3); }
    const rows = morto ? [...BOT].reverse() : BOT;
    if (gl) { ctx.globalAlpha *= .6; spr(rows, x0 - 2, y0, 3, false, { ...pal, O: '#ff3df0', o: '#ff3df0', D: '#ff3df0', E: '#ff3df0' }); spr(rows, x0 + 2, y0, 3, false, { ...pal, O: '#3dfff0', o: '#3dfff0', D: '#3dfff0', E: '#3dfff0' }); ctx.globalAlpha /= .6; }
    for (let j = 0; j < rows.length; j++) spr([rows[j]], x0 + (gl && j % 3 === 1 ? 2 : 0), y0 + j * 3, 3, false, pal);
    // antena
    const ay = morto ? y0 + 24 : y0 - 7;
    ctx.fillStyle = '#07050c'; ctx.fillRect(x0 + 11, ay, 2, 7);
    ctx.fillStyle = Math.floor(t * 8) % 2 ? '#ff3df0' : '#3dfff0'; ctx.fillRect(x0 + 9 + (gl ? 2 : 0), morto ? ay + 6 : ay - 3, 6, 4);
  },
  hud() { return ['Altura', `${this.score} m`, this.turbo > 0 ? 'Hélice turbo!' : TB_ZONAS[this.zona][0]]; },
  overText() { return `Subiu ${this.score} m e parou no ${TB_ZONAS[this.zona][0].toLowerCase()}. O backlog nunca acaba: lá em cima sempre tem mais caixa.`; },
};
ARCADE_NOVOS.push(tbJogo);
