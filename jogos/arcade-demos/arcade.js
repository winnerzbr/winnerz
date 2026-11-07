/* Arcade do IAmiguinho — base comum das demos.
 * Cada jogo é uma página .html que carrega este arquivo e chama A.game({...}).
 * Aqui ficam: tela que se ajusta à janela, controles (teclado, controle e toque), sons feitos em código,
 * o IAmiguinho e os Amiguinhos desenhados em vetor, telas de início e de resultado e o recorde da semana.
 */
(function () {
  'use strict';
  const A = (window.A = {});

  // ---------- Cores do Arcade ----------
  A.C = {
    bg: '#07080a', bg2: '#101318', bg3: '#181c22', line: '#262b33',
    ink: '#f2f4f6', ink2: '#c9ced4', muted: '#8e959e',
    now: '#ffb25b', nowHi: '#ffd59e', gold: '#d9b45a',
    blue: '#2f6fe0', blueHi: '#5b93ff', cream: '#f1e6cf', creamSh: '#d6c6a6',
    visor: '#14171c', light: '#8be9ff', red: '#ff5a5f', green: '#5fdc8a', pink: '#ff7ab8', out: '#0b0d10',
  };

  // ---------- Utilidades ----------
  A.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  A.lerp = (a, b, t) => a + (b - a) * t;
  A.rand = (a, b) => a + Math.random() * (b - a);
  A.pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];
  A.rng = function (seed) {
    let s = seed >>> 0;
    return function () { s += 0x6d2b79f5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  A.hash = function (str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  /** Semana atual (segunda a domingo, horário de Brasília), no formato 2026-S45. */
  A.week = function () {
    const d = new Date(Date.now() - 3 * 3600e3);
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const wk = Math.ceil(((t - y0) / 864e5 + 1) / 7);
    return t.getUTCFullYear() + '-S' + String(wk).padStart(2, '0');
  };
  A.weekSeed = (id) => A.hash(id + ':' + A.week());
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento: segue sem recorde */ } },
  };
  A.store = store;

  // ---------- Tela ----------
  let cv, ctx, W = 960, H = 540, scale = 1, offX = 0, offY = 0, dpr = 1;
  /** 8 bits: cada pixel de arte vale A.PIX unidades do jogo (960x540 vira 320x180). */
  A.PIX = 3;
  let buf, bctx, BW = 320, BH = 180;
  function fit() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth, vh = window.innerHeight;
    scale = Math.min(vw / W, vh / H);
    const cw = Math.round(W * scale), ch = Math.round(H * scale);
    offX = Math.round((vw - cw) / 2); offY = Math.round((vh - ch) / 2);
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    cv.style.left = offX + 'px'; cv.style.top = offY + 'px';
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  }
  function makeCanvas(w, h) {
    W = w; H = h; A.W = W; A.H = H;
    const st = document.createElement('style');
    st.textContent = 'html,body{margin:0;height:100%;background:#07080a;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}canvas{position:absolute;display:block;image-rendering:auto}';
    document.head.appendChild(st);
    cv = document.createElement('canvas');
    document.body.appendChild(cv);
    ctx = cv.getContext('2d');
    BW = Math.round(W / A.PIX); BH = Math.round(H / A.PIX);
    buf = document.createElement('canvas'); buf.width = BW; buf.height = BH;
    bctx = buf.getContext('2d', { willReadFrequently: true });
    A.ctx = bctx; A.canvas = cv;
    fit();
    window.addEventListener('resize', fit);
  }

  // ---------- Texto ----------
  // Fonte pixelada. Texto chamado sobre a tela de baixa resolução entra numa fila e é desenhado nítido,
  // por cima, na tela grande (mesma posição, mesma câmera).
  // Letra própria em pixels (5x7, só maiúsculas, com acentos), igual em qualquer aparelho e sem internet.
  // size = altura da letra em unidades do jogo (cada pixel da letra = size/8).
  const GLYPHS = {
    A: '.###.|#...#|#...#|#####|#...#|#...#|#...#', B: '####.|#...#|#...#|####.|#...#|#...#|####.', C: '.###.|#...#|#....|#....|#....|#...#|.###.',
    D: '####.|#...#|#...#|#...#|#...#|#...#|####.', E: '#####|#....|#....|####.|#....|#....|#####', F: '#####|#....|#....|####.|#....|#....|#....',
    G: '.###.|#...#|#....|#.###|#...#|#...#|.####', H: '#...#|#...#|#...#|#####|#...#|#...#|#...#', I: '.###.|..#..|..#..|..#..|..#..|..#..|.###.',
    J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..', K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', L: '#....|#....|#....|#....|#....|#....|#####',
    M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', N: '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#', O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
    P: '####.|#...#|#...#|####.|#....|#....|#....', Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
    S: '.####|#....|#....|.###.|....#|....#|####.', T: '#####|..#..|..#..|..#..|..#..|..#..|..#..', U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
    V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..', W: '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.', X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
    Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', Z: '#####|....#|...#.|..#..|.#...|#....|#####',
    0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.', 1: '..#..|.##..|..#..|..#..|..#..|..#..|.###.', 2: '.###.|#...#|....#|...#.|..#..|.#...|#####',
    3: '####.|....#|....#|.###.|....#|....#|####.', 4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.', 5: '#####|#....|####.|....#|....#|#...#|.###.',
    6: '..##.|.#...|#....|####.|#...#|#...#|.###.', 7: '#####|....#|...#.|..#..|.#...|.#...|.#...', 8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
    9: '.###.|#...#|#...#|.####|....#|...#.|.##..',
    '.': '.....|.....|.....|.....|.....|.##..|.##..', ',': '.....|.....|.....|.....|.##..|..#..|.#...', ':': '.....|.##..|.##..|.....|.##..|.##..|.....',
    ';': '.....|.##..|.##..|.....|.##..|..#..|.#...', '!': '..#..|..#..|..#..|..#..|..#..|.....|..#..', '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
    "'": '..#..|..#..|.#...|.....|.....|.....|.....', '"': '.#.#.|.#.#.|.....|.....|.....|.....|.....', '-': '.....|.....|.....|.###.|.....|.....|.....',
    '+': '.....|..#..|..#..|#####|..#..|..#..|.....', '=': '.....|.....|#####|.....|#####|.....|.....', '/': '....#|....#|...#.|..#..|.#...|#....|#....',
    '(': '...#.|..#..|.#...|.#...|.#...|..#..|...#.', ')': '.#...|..#..|...#.|...#.|...#.|..#..|.#...', '%': '##..#|##..#|...#.|..#..|.#...|#..##|#..##',
    '<': '...#.|..#..|.#...|#....|.#...|..#..|...#.', '>': '.#...|..#..|...#.|....#|...#.|..#..|.#...', '*': '.....|..#..|#.#.#|.###.|#.#.#|..#..|.....',
    '#': '.#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.', _: '.....|.....|.....|.....|.....|.....|#####', '×': '.....|#...#|.#.#.|..#..|.#.#.|#...#|.....',
    '·': '.....|.....|.....|.##..|.##..|.....|.....', '@': '.###.|#...#|#.###|#.#.#|#.###|#....|.####', '&': '.##..|#..#.|#.#..|.#...|#.#.#|#..#.|.##.#',
    '[': '.###.|.#...|.#...|.#...|.#...|.#...|.###.', ']': '.###.|...#.|...#.|...#.|...#.|...#.|.###.', '$': '..#..|.####|#.#..|.###.|..#.#|####.|..#..',
    '°': '.##..|#..#.|.##..|.....|.....|.....|.....', '…': '.....|.....|.....|.....|.....|.....|#.#.#',
    '▲': '.....|..#..|.###.|#####|#####|.....|.....', '▼': '.....|#####|#####|.###.|..#..|.....|.....',
    '▶': '#....|##...|###..|####.|###..|##...|#....', '◀': '....#|...##|..###|.####|..###|...##|....#',
    '→': '.....|..#..|...#.|#####|...#.|..#..|.....', '←': '.....|..#..|.#...|#####|.#...|..#..|.....',
    '↑': '..#..|.###.|#.#.#|..#..|..#..|..#..|.....', '↓': '.....|..#..|..#..|..#..|#.#.#|.###.|..#..', '♥': '.....|.#.#.|#####|#####|.###.|..#..|.....',
  };
  const MARKS = { '́': ['...#.', '..#..'], '̀': ['.#...', '..#..'], '̂': ['..#..', '.#.#.'], '̃': ['.##.#', '#..#.'], '̈': ['.....', '.#.#.'] };
  const BITS = {};
  for (const k in GLYPHS) { const rows = GLYPHS[k].split('|'); const px = []; rows.forEach((r, y) => { for (let x = 0; x < 5; x++) if (r[x] === '#') px.push(x, y); }); BITS[k] = px; }
  const MARKBITS = {};
  for (const k in MARKS) { const px = []; MARKS[k].forEach((r, y) => { for (let x = 0; x < 5; x++) if (r[x] === '#') px.push(x, y - 2); }); MARKBITS[k] = px; }
  MARKBITS['̧'] = [2, 7, 1, 8, 2, 8];
  /** Converte o texto em lista de pixels da letra: [x, y, ...] em pixels de letra, e a quantidade de letras. */
  function layout(str) {
    const s = String(str).toUpperCase().normalize('NFD');
    const px = []; let n = 0;
    for (const ch of s) {
      if (MARKBITS[ch]) { const m = MARKBITS[ch], ox = (n - 1) * 6; for (let i = 0; i < m.length; i += 2) px.push(ox + m[i], m[i + 1]); continue; }
      const g = BITS[ch];
      if (g) { const ox = n * 6; for (let i = 0; i < g.length; i += 2) px.push(ox + g[i], g[i + 1]); }
      n++;
    }
    return { px, n };
  }
  let textQueue = null;
  function drawTextNow(c, str, x, y, o) {
    const size = o.size || 18, fp = size / 8;
    const L = layout(str);
    const w = Math.max(0, L.n * 6 - 1) * fp;
    let x0 = x; if (o.align === 'center') x0 = x - w / 2; else if (o.align === 'right') x0 = x - w;
    const base = o.base || 'alphabetic';
    let y0 = y - 7 * fp; if (base === 'middle') y0 = y - 3.5 * fp; else if (base === 'top') y0 = y;
    const m = c.getTransform();
    const axis = Math.abs(m.b) < 1e-6 && Math.abs(m.c) < 1e-6;
    let X0, Y0, P;
    if (axis) { P = fp * m.a; X0 = m.a * x0 + m.e; Y0 = m.d * y0 + m.f; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); }
    else { P = fp; X0 = x0; Y0 = y0; c.save(); }
    // cada pixel da letra cai em pixels inteiros da tela (bordas arredondadas), sem mudar a largura total
    const R = axis ? Math.round : (v) => v;
    const run = (color, dx, dy, grow) => {
      c.fillStyle = color;
      for (let i = 0; i < L.px.length; i += 2) {
        const gx = L.px[i] + dx, gy = L.px[i + 1] + dy;
        const xa = R(X0 + (gx - grow) * P), xb = R(X0 + (gx + 1 + grow) * P), ya = R(Y0 + (gy - grow) * P), yb = R(Y0 + (gy + 1 + grow) * P);
        c.fillRect(xa, ya, Math.max(1, xb - xa), Math.max(1, yb - ya));
      }
    };
    if (o.stroke) run(o.stroke, 0, 0, 1);
    else if (o.shadow !== false) run(A.C.out, 1, 1, 0);
    run(o.color || A.C.ink, 0, 0, 0);
    c.restore();
  }
  /** Escreve texto com a letra de pixels. wide: título (maiúsculas já são o padrão). Devolve a largura. */
  A.text = function (c, str, x, y, o = {}) {
    str = String(str);
    const w = A.measure(c, str, o);
    if (c === bctx && textQueue) {
      const alpha = c.globalAlpha * (o.alpha == null ? 1 : o.alpha);
      if (alpha > 0.02) textQueue.push({ str, x, y, o, m: c.getTransform(), alpha });
    } else {
      c.save(); c.globalAlpha *= o.alpha == null ? 1 : o.alpha; drawTextNow(c, str, x, y, o); c.restore();
    }
    return w;
  };
  A.measure = function (c, str, o = {}) { const n = layout(str).n; return Math.max(0, n * 6 - 1) * (o.size || 18) / 8; };

  // ---------- Paleta de 8 bits ----------
  // Paleta do NES mais os tons do WinnerZ (fundos escuros, âmbar, dourado, creme do IAmiguinho).
  const PAL_HEX = ['7c7c7c','0000fc','0000bc','4428bc','940084','a80020','a81000','881400','503000','007800','006800','005800','004058','000000',
    'bcbcbc','0078f8','0058f8','6844fc','d800cc','e40058','f83800','e45c10','ac7c00','00b800','00a800','00a844','008888',
    'f8f8f8','3cbcfc','6888fc','9878f8','f878f8','f85898','f87858','fca044','f8b800','b8f818','58d854','58f898','00e8d8','787878',
    'fcfcfc','a4e4fc','b8b8f8','d8b8f8','f8b8f8','f8a4c0','f0d0b0','fce0a8','f8d878','d8f878','b8f8b8','b8f8d8','00fcfc','f8d8f8',
    '07080a','101318','181c22','262b33','ffb25b','d9b45a','f1e6cf','d6c6a6','2f6fe0','ff5a5f','8be9ff','14171c','3a2a1a','5a3a20'];
  const PAL = PAL_HEX.map((h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]);
  const palCache = new Map();
  function nearest(r, g, b) {
    const key = (r << 16) | (g << 8) | b;
    let v = palCache.get(key);
    if (v !== undefined) return v;
    let best = 0, bd = 1e9;
    for (let i = 0; i < PAL.length; i++) { const p = PAL[i]; const dr = r - p[0], dg = g - p[1], db = b - p[2]; const d = dr * dr * 3 + dg * dg * 4 + db * db * 2; if (d < bd) { bd = d; best = i; } }
    v = PAL[best]; if (palCache.size > 60000) palCache.clear(); palCache.set(key, v);
    return v;
  }
  A.quantize = true;
  function quantizeBuf(keepAlpha) {
    if (!A.quantize) return;
    const img = bctx.getImageData(0, 0, BW, BH), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const al = d[i + 3];
      if (al === 0) continue;
      if (!keepAlpha) { if (al < 110) { d[i + 3] = 0; continue; } d[i + 3] = 255; }
      // cor sem a mistura do alfa (o canvas guarda pré-multiplicado na leitura? não: já vem desfeito)
      const p = nearest(d[i], d[i + 1], d[i + 2]);
      d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2];
    }
    bctx.putImageData(img, 0, 0);
  }
  /** Começa uma camada: limpa a tela pequena e prepara a fila de textos. */
  function beginLayer() {
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, BW, BH);
    bctx.setTransform(1 / A.PIX, 0, 0, 1 / A.PIX, 0, 0);
    bctx.globalAlpha = 1;
    textQueue = [];
  }
  /** Fecha a camada: puxa as cores para a paleta, amplia sem suavizar e escreve os textos por cima. */
  function commitLayer(keepAlpha) {
    quantizeBuf(keepAlpha);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, cv.width, cv.height);
    const k = dpr * scale * A.PIX;
    for (const q of textQueue) {
      const m = q.m;
      ctx.setTransform(m.a * k, m.b * k, m.c * k, m.d * k, m.e * k, m.f * k);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = q.alpha;
      drawTextNow(ctx, q.str, q.x, q.y, q.o);
    }
    ctx.globalAlpha = 1;
    textQueue = null;
  }

  // ---------- Formas ----------
  A.rr = function (c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  };
  /** Peça "Fresta": retângulo com o canto cortado na inclinação do Z (22°). */
  A.cut = function (c, x, y, w, h, cut) {
    cut = cut == null ? h * 0.4 : cut;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w - cut, y + h); c.lineTo(x, y + h); c.closePath();
  };
  /** Balão de fala do IAmiguinho: caixa com o canto cortado e uma ponta. */
  A.bubble = function (c, x, y, str, o = {}) {
    const size = o.size || 12, pad = 12;
    const lines = String(str).split('\n');
    const w = Math.max(...lines.map((l) => A.measure(c, l, { size }))) + pad * 2 + 10;
    const h = lines.length * (size + 6) + pad * 2 - 6;
    let bx = o.align === 'right' ? x - w + 20 : o.align === 'center' ? x - w / 2 : x - 20;
    bx = A.clamp(bx, 8, W - w - 8);
    const by = y - h - 14;
    c.save();
    c.globalAlpha = o.alpha == null ? 1 : o.alpha;
    c.fillStyle = o.bg || A.C.ink;
    c.beginPath(); c.moveTo(A.clamp(x - 8, bx + 6, bx + w - 30), by + h - 1); c.lineTo(x, y); c.lineTo(A.clamp(x + 10, bx + 16, bx + w - 20), by + h - 1); c.fill();
    A.cut(c, bx, by, w, h, 12); c.fill();
    lines.forEach((l, i) => A.text(c, l, bx + pad, by + pad + size - 1 + i * (size + 6), { size, color: o.color || A.C.bg, shadow: false }));
    c.restore();
  };

  // ---------- IAmiguinho ----------
  /**
   * Desenha o IAmiguinho. x = centro, y = chão (pés). s = escala (1 ≈ 96 px de altura com boné).
   * o.pose: 'idle' | 'run' | 'jump' | 'duck' | 'cheer' | 'fall'; o.t: tempo (s); o.face: 'smile' | 'wow' | 'sad' | 'smug' | 'angry';
   * o.flip: olhando para a esquerda; o.noCap: sem boné; o.spin: velocidade da hélice (voltas/s).
   */
  A.drawIAmiguinho = function (c, x, y, s, o = {}) {
    const C = A.C, t = o.t || 0, pose = o.pose || 'idle';
    const lw = 3 / Math.max(s, 0.6);
    c.save();
    c.translate(Math.round(x / A.PIX) * A.PIX, Math.round(y / A.PIX) * A.PIX); c.scale(o.flip ? -s : s, s);
    if (o.rot) c.rotate(o.rot);
    c.lineJoin = 'miter'; c.lineCap = 'square';
    const out = C.out;
    let bob = 0, legA = 0, legB = 0, armA = 0, armB = 0, squash = 1;
    if (pose === 'idle') { bob = Math.sin(t * 3) * 1.5; armA = Math.sin(t * 3) * 0.08; armB = -armA; }
    if (pose === 'run') { const p = t * 14; legA = Math.sin(p) * 0.7; legB = -legA; armA = -legA * 0.9; armB = -armA; bob = Math.abs(Math.cos(p)) * -4; }
    if (pose === 'jump') { legA = -0.5; legB = 0.4; armA = 2.5; armB = -2.2; bob = -2; }
    if (pose === 'cheer') { armA = 2.7 + Math.sin(t * 12) * 0.25; armB = -2.7 - Math.sin(t * 12) * 0.25; bob = -Math.abs(Math.sin(t * 8)) * 5; }
    if (pose === 'fall') { armA = 2.6; armB = -2.4; legA = 0.8; legB = -0.6; }
    if (pose === 'duck') { squash = 0.62; armA = 0.9; armB = 0.6; }
    c.lineWidth = lw;
    // pernas e botas
    const leg = (ang, dx) => {
      c.save(); c.translate(dx, -22 * squash); c.rotate(ang);
      c.fillStyle = C.creamSh; c.strokeStyle = out; A.rr(c, -4, 0, 8, 16 * squash + 2, 3); c.fill(); c.stroke();
      c.fillStyle = C.blue; A.rr(c, -7, 14 * squash, 15, 9, 4); c.fill(); c.stroke();
      c.restore();
    };
    c.save(); c.translate(0, bob);
    leg(legB, 7); leg(legA, -7);
    // braço de trás
    const arm = (ang, dx, back) => {
      c.save(); c.translate(dx, -48 * squash + (pose === 'duck' ? 6 : 0)); c.rotate(ang);
      c.fillStyle = back ? C.creamSh : C.cream; c.strokeStyle = out;
      A.rr(c, -4, 0, 8, 20, 4); c.fill(); c.stroke();
      c.beginPath(); c.arc(0, 22, 5.5, 0, Math.PI * 2); c.fill(); c.stroke();
      c.restore();
    };
    arm(armB, 13, true);
    // corpo
    c.fillStyle = C.cream; c.strokeStyle = out;
    A.rr(c, -14, -52 * squash, 28, 32 * squash, 9); c.fill(); c.stroke();
    c.fillStyle = C.creamSh; A.rr(c, -10, -30 * squash, 20, 6 * squash, 3); c.fill();
    // cabeça
    const hy = -52 * squash - 34 + (pose === 'duck' ? 4 : 0);
    c.save(); c.translate(0, hy);
    if (pose === 'run') c.rotate(0.06);
    // fones
    c.fillStyle = C.blue; c.strokeStyle = out;
    A.rr(c, -26, 8, 9, 18, 4); c.fill(); c.stroke();
    A.rr(c, 17, 8, 9, 18, 4); c.fill(); c.stroke();
    c.strokeStyle = C.light; c.lineWidth = lw * 0.8; c.beginPath(); c.arc(-21.5, 17, 3, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(21.5, 17, 3, 0, Math.PI * 2); c.stroke();
    c.lineWidth = lw; c.strokeStyle = out;
    c.fillStyle = C.cream; A.rr(c, -20, 0, 40, 34, 13); c.fill(); c.stroke();
    // visor
    c.fillStyle = C.visor; A.rr(c, -15, 7, 31, 20, 8); c.fill();
    const face = o.face || 'smile';
    c.strokeStyle = C.light; c.fillStyle = C.light; c.lineWidth = 2.6;
    const blink = (Math.floor(t * 10) % 37) === 0;
    if (face === 'wow') { c.fillRect(-7, 9, 5, 6); c.fillRect(6, 9, 5, 6); c.fillRect(-1, 18, 6, 6); c.fillStyle = C.visor; c.fillRect(1, 20, 2, 2); c.fillStyle = C.light; }
    else if (face === 'sad') { c.fillRect(-7, 12, 6, 3); c.fillRect(5, 12, 6, 3); c.fillRect(-3, 20, 10, 3); c.fillRect(-6, 23, 3, 3); c.fillRect(7, 23, 3, 3); }
    else if (face === 'angry') { c.fillRect(-7, 10, 3, 3); c.fillRect(-4, 13, 3, 3); c.fillRect(8, 10, 3, 3); c.fillRect(5, 13, 3, 3); c.fillRect(-4, 21, 12, 3); }
    else if (face === 'smug') { c.fillRect(-7, 13, 6, 3); c.fillRect(6, 10, 5, 6); c.fillRect(0, 21, 9, 3); c.fillRect(9, 18, 3, 3); }
    else {
      if (blink) { c.fillRect(-7, 13, 6, 3); c.fillRect(5, 13, 6, 3); }
      else { c.fillRect(-7, 10, 5, 6); c.fillRect(6, 10, 5, 6); }
      c.fillRect(-6, 20, 3, 3); c.fillRect(7, 20, 3, 3); c.fillRect(-3, 22, 10, 3);
    }
    c.lineWidth = lw; c.strokeStyle = out;
    // boné com hélice
    if (!o.noCap) {
      c.fillStyle = C.blue;
      c.beginPath(); c.moveTo(-21, 4); c.quadraticCurveTo(-21, -16, 0, -17); c.quadraticCurveTo(21, -16, 21, 4); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffffff';
      c.beginPath(); c.moveTo(-4, -16.6); c.quadraticCurveTo(-6, -6, -5, 3.5); c.lineTo(5, 3.5); c.quadraticCurveTo(6, -6, 4, -16.6); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-21, 4); c.quadraticCurveTo(-21, -16, 0, -17); c.quadraticCurveTo(21, -16, 21, 4); c.closePath(); c.stroke();
      // aba
      c.fillStyle = C.blue; c.beginPath(); c.moveTo(14, 1); c.quadraticCurveTo(30, 0, 33, 5); c.lineTo(14, 6); c.closePath(); c.fill(); c.stroke();
      // pino e hélice
      c.fillStyle = C.now; c.fillRect(-1.5, -24, 3, 8); c.strokeRect(-1.5, -24, 3, 8);
      const sp = o.spin == null ? 0.6 : o.spin;
      const ph = Math.cos(t * sp * Math.PI * 2);
      c.save(); c.translate(0, -25);
      c.fillStyle = C.red; c.beginPath(); c.ellipse(-11 * ph, 0, Math.max(1.5, 11 * Math.abs(ph)), 3.2, 0, 0, 7); c.fill(); c.stroke();
      c.fillStyle = C.now; c.beginPath(); c.ellipse(11 * ph, 0, Math.max(1.5, 11 * Math.abs(ph)), 3.2, 0, 0, 7); c.fill(); c.stroke();
      c.fillStyle = C.ink; c.beginPath(); c.arc(0, 0, 2.6, 0, 7); c.fill(); c.stroke();
      c.restore();
    }
    c.restore();
    arm(armA, -13, false);
    c.restore();
    c.restore();
  };

  /** Desenha o boné (com hélice) sozinho. */
  A.drawCap = function (c, x, y, s, t, spin) {
    c.save(); c.translate(x, y); c.scale(s, s);
    const C = A.C; c.lineWidth = 3; c.strokeStyle = C.out; c.lineJoin = 'round';
    c.fillStyle = C.blue; c.beginPath(); c.moveTo(-21, 4); c.quadraticCurveTo(-21, -16, 0, -17); c.quadraticCurveTo(21, -16, 21, 4); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-4, -16.6); c.quadraticCurveTo(-6, -6, -5, 3.5); c.lineTo(5, 3.5); c.quadraticCurveTo(6, -6, 4, -16.6); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-21, 4); c.quadraticCurveTo(-21, -16, 0, -17); c.quadraticCurveTo(21, -16, 21, 4); c.closePath(); c.stroke();
    c.fillStyle = C.blue; c.beginPath(); c.moveTo(14, 1); c.quadraticCurveTo(30, 0, 33, 5); c.lineTo(14, 6); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-21, 4); c.lineTo(21, 4); c.stroke();
    c.fillStyle = C.now; c.fillRect(-1.5, -24, 3, 8); c.strokeRect(-1.5, -24, 3, 8);
    const ph = Math.cos(t * (spin || 3) * Math.PI * 2);
    c.translate(0, -25);
    c.fillStyle = C.red; c.beginPath(); c.ellipse(-11 * ph, 0, Math.max(1.5, 11 * Math.abs(ph)), 3.2, 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = C.now; c.beginPath(); c.ellipse(11 * ph, 0, Math.max(1.5, 11 * Math.abs(ph)), 3.2, 0, 0, 7); c.fill(); c.stroke();
    c.restore();
  };

  /** Um Amiguinho: robozinho aleatório e tonto, sem boné. color muda a cor do corpo. */
  A.AMIGUINHO_CORES = ['#9fb6a0', '#c9a3d8', '#e3b27a', '#8fb7d6', '#d98f8f', '#b8c27a'];
  A.drawAmiguinho = function (c, x, y, s, o = {}) {
    const C = A.C, t = o.t || 0, col = o.color || A.AMIGUINHO_CORES[0];
    c.save(); c.translate(Math.round(x / A.PIX) * A.PIX, Math.round(y / A.PIX) * A.PIX); c.scale(o.flip ? -s : s, s);
    c.lineWidth = 3; c.strokeStyle = C.out; c.lineJoin = 'miter';
    const walk = o.walk ? Math.sin(t * 10) : 0;
    const wob = Math.sin(t * 4 + (o.seed || 0)) * 0.08;
    c.rotate(wob + (o.rot || 0));
    // pés
    c.fillStyle = '#5a6068';
    A.rr(c, -12 + walk * 3, -7, 10, 7, 3); c.fill(); c.stroke();
    A.rr(c, 2 - walk * 3, -7, 10, 7, 3); c.fill(); c.stroke();
    // corpo-cabeça (uma peça só, tipo cápsula)
    c.fillStyle = col; A.rr(c, -15, -44, 30, 38, 13); c.fill(); c.stroke();
    // antena torta
    c.beginPath(); c.moveTo(4, -44); c.quadraticCurveTo(8, -52, 3, -56); c.stroke();
    c.fillStyle = C.red; c.beginPath(); c.arc(3, -57, 3, 0, 7); c.fill(); c.stroke();
    // visor
    c.fillStyle = C.visor; A.rr(c, -10, -37, 20, 13, 5); c.fill();
    c.fillStyle = '#e9f0f5';
    const derp = o.face === 'scared' ? 0 : Math.sin(t * 2 + (o.seed || 0)) * 1.5;
    if (o.face === 'scared') { c.fillRect(-7, -34, 5, 6); c.fillRect(2, -34, 5, 6); }
    else { c.fillRect(-7 + Math.round(derp), -33, 3, 3); c.fillRect(2 - Math.round(derp), -34, 5, 5); }
    c.restore();
  };

  // ---------- Partículas e tremor ----------
  const parts = [];
  A.burst = function (x, y, color, n = 12, speed = 220, life = 0.6, size = 4) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.35 + Math.random() * 0.65);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, color: Array.isArray(color) ? A.pick(color) : color, size: size * (0.6 + Math.random() * 0.8), g: 500 });
    }
  };
  /** Texto que sobe e some ("+100"). */
  const floats = [];
  A.float = function (x, y, str, color, size) { floats.push({ x, y, str, color: color || A.C.now, size: size || 22, life: 0.9 }); };
  let shakeT = 0, shakeA = 0;
  A.shake = function (a, t) { shakeA = Math.max(shakeA, a); shakeT = Math.max(shakeT, t || 0.25); };
  function fxUpdate(dt) {
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.life -= dt; f.y -= 50 * dt; if (f.life <= 0) floats.splice(i, 1); }
    if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) shakeA = 0; }
  }
  function fxDraw(c) {
    for (const p of parts) { if (p.life / p.max < 0.3 && Math.floor(p.life * 30) % 2) continue; const z = Math.max(A.PIX, Math.round(p.size / A.PIX) * A.PIX); c.fillStyle = p.color; c.fillRect(Math.round(p.x / A.PIX) * A.PIX, Math.round(p.y / A.PIX) * A.PIX, z, z); }
    c.globalAlpha = 1;
    for (const f of floats) A.text(c, f.str, f.x, f.y, { size: Math.min(24, f.size), align: 'center', color: f.color, stroke: A.C.out, strokeW: 6 });
  }
  A.clearFx = () => { parts.length = 0; floats.length = 0; };

  // ---------- Som (feito em código, sem arquivos) ----------
  let ac = null, master = null;
  A.muted = store.get('arcade:mudo') === '1';
  function audio() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = A.muted ? 0 : 0.5; master.connect(ac.destination); } catch (e) { ac = null; }
    }
    if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }
  A.toggleMute = function () { A.muted = !A.muted; store.set('arcade:mudo', A.muted ? '1' : '0'); if (master) master.gain.value = A.muted ? 0 : 0.5; };
  A.tone = function (f, dur = 0.12, type = 'square', vol = 0.25, f2, delay = 0) {
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  };
  A.noise = function (dur = 0.2, vol = 0.2, freq = 1200, delay = 0, type = 'bandpass') {
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + delay;
    const len = Math.max(1, Math.floor(a.sampleRate * dur));
    const b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = b; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t0);
  };
  A.sfx = function (name) {
    switch (name) {
      case 'jump': A.tone(320, 0.16, 'square', 0.16, 720); break;
      case 'coin': A.tone(988, 0.07, 'square', 0.14); A.tone(1319, 0.18, 'square', 0.14, null, 0.07); break;
      case 'ok': A.tone(660, 0.08, 'triangle', 0.25); A.tone(990, 0.14, 'triangle', 0.25, null, 0.07); break;
      case 'bad': A.tone(220, 0.25, 'sawtooth', 0.16, 110); break;
      case 'hit': A.noise(0.12, 0.35, 900); A.tone(140, 0.12, 'square', 0.18, 70); break;
      case 'tick': A.tone(1500, 0.03, 'square', 0.08); break;
      case 'blip': A.tone(880, 0.05, 'square', 0.1); break;
      case 'press': A.noise(0.08, 0.4, 400, 0, 'lowpass'); A.tone(90, 0.12, 'square', 0.2, 50); break;
      case 'boom': A.noise(0.5, 0.5, 300, 0, 'lowpass'); A.tone(80, 0.4, 'sine', 0.4, 30); break;
      case 'whoosh': A.noise(0.25, 0.18, 2200); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => A.tone(f, 0.16, 'square', 0.15, null, i * 0.09)); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => A.tone(f, 0.2, 'triangle', 0.2, null, i * 0.12)); break;
      case 'start': A.tone(523, 0.08, 'square', 0.14); A.tone(784, 0.08, 'square', 0.14, null, 0.08); A.tone(1047, 0.2, 'square', 0.14, null, 0.16); break;
      case 'bump': A.tone(520, 0.08, 'square', 0.16, 260); break;
      case 'flip': A.tone(180, 0.05, 'square', 0.12, 120); break;
      default: break;
    }
  };

  // ---------- Controles ----------
  // Ações: left, right, up, down, a (principal), b (secundária), l, r (gatilhos), start.
  const KEYS = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    Space: 'a', Enter: 'a', KeyZ: 'a', KeyJ: 'a', KeyX: 'b', KeyK: 'b', Backspace: 'b', ShiftLeft: 'l', ShiftRight: 'r', KeyQ: 'l', KeyE: 'r', Escape: 'start', KeyP: 'start',
  };
  const ACTIONS = ['left', 'right', 'up', 'down', 'a', 'b', 'l', 'r', 'start'];
  const kb = {}, pad = {}, touchHeld = {}, held = {}, prev = {}, tap = {};
  ACTIONS.forEach((k) => { kb[k] = pad[k] = touchHeld[k] = held[k] = prev[k] = tap[k] = false; });
  A.lastDevice = 'teclado'; // 'teclado' | 'controle' | 'toque' | 'mouse'
  window.addEventListener('keydown', (e) => {
    const k = KEYS[e.code]; if (k) { if (!e.repeat) tap[k] = true; kb[k] = true; e.preventDefault(); }
    if (e.code === 'KeyM') A.toggleMute();
    A.lastDevice = 'teclado'; audio();
  });
  window.addEventListener('keyup', (e) => { const k = KEYS[e.code]; if (k) kb[k] = false; });
  window.addEventListener('blur', () => { ACTIONS.forEach((k) => { kb[k] = false; }); });
  A.pad = { lx: 0, ly: 0, connected: false };
  function readPad() {
    ACTIONS.forEach((k) => { pad[k] = false; });
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    A.pad.connected = false; A.pad.lx = 0; A.pad.ly = 0;
    for (const g of gps) {
      if (!g) continue;
      A.pad.connected = true;
      const b = (i) => !!(g.buttons[i] && g.buttons[i].pressed);
      const lx = g.axes[0] || 0, ly = g.axes[1] || 0;
      A.pad.lx = Math.abs(lx) > 0.18 ? lx : 0; A.pad.ly = Math.abs(ly) > 0.18 ? ly : 0;
      pad.left = pad.left || b(14) || lx < -0.45; pad.right = pad.right || b(15) || lx > 0.45;
      pad.up = pad.up || b(12) || ly < -0.45; pad.down = pad.down || b(13) || ly > 0.45;
      pad.a = pad.a || b(0) || b(2); pad.b = pad.b || b(1) || b(3);
      pad.l = pad.l || b(4) || b(6); pad.r = pad.r || b(5) || b(7);
      pad.start = pad.start || b(9);
      if (g.buttons.some((x) => x.pressed) || Math.abs(lx) > 0.5 || Math.abs(ly) > 0.5) A.lastDevice = 'controle';
    }
  }

  // Ponteiro (mouse e toque), em coordenadas do jogo
  const pointers = new Map();
  A.ptr = { x: 0, y: 0, down: false, pressed: false, released: false, moved: false };
  let ptrPressedFlag = false, ptrReleasedFlag = false;
  function toGame(e) { return { x: (e.clientX - offX) / scale, y: (e.clientY - offY) / scale }; }
  A.isTouch = false;
  let touchButtons = [];
  /** Botões na tela para celular: [{ act: 'left', x, y, r, label }]. Só aparecem em toque. */
  A.setTouchButtons = function (list) { touchButtons = list || []; };
  /** Ação disparada por um toque fora dos botões (padrão 'a'); null desliga. */
  A.tapAction = 'a';
  function hitButton(p) { for (const b of touchButtons) { if (Math.hypot(p.x - b.x, p.y - b.y) <= b.r * 1.15) return b; } return null; }
  function recomputeTouch() {
    ACTIONS.forEach((k) => { touchHeld[k] = false; });
    for (const p of pointers.values()) {
      if (!p.touch) continue;
      const b = hitButton(p);
      const act = b ? b.act : (A.tapAction && !p.onUi ? A.tapAction : null);
      if (act) { touchHeld[act] = true; if (!p.tapped) { tap[act] = true; } }
      p.tapped = true;
    }
  }
  function onDown(e) {
    audio();
    const p = toGame(e);
    const touch = e.pointerType === 'touch' || e.pointerType === 'pen';
    if (touch) { A.isTouch = true; A.lastDevice = 'toque'; } else A.lastDevice = 'mouse';
    const onUi = uiHit(p);
    pointers.set(e.pointerId, { x: p.x, y: p.y, sx: p.x, sy: p.y, t0: performance.now(), touch, onUi });
    A.ptr.x = p.x; A.ptr.y = p.y; A.ptr.down = true; ptrPressedFlag = true;
    recomputeTouch();
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* */ }
    e.preventDefault();
  }
  function onMove(e) {
    const p = toGame(e);
    const q = pointers.get(e.pointerId);
    if (q) { q.x = p.x; q.y = p.y; }
    A.ptr.x = p.x; A.ptr.y = p.y; A.ptr.moved = true;
    if (q) recomputeTouch();
  }
  function onUp(e) {
    const q = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (q) { A.ptr.swipe = { dx: q.x - q.sx, dy: q.y - q.sy, dt: performance.now() - q.t0 }; }
    A.ptr.down = pointers.size > 0; ptrReleasedFlag = true;
    recomputeTouch();
  }
  /** Lista dos dedos/mouse na tela agora: [{x, y, sx, sy, touch}]. */
  A.pointers = () => [...pointers.values()];

  /** O que está apertado agora. */
  A.held = (k) => held[k];
  /** Apertou neste quadro. */
  A.pressed = (k) => held[k] && !prev[k];
  A.released = (k) => !held[k] && prev[k];
  A.anyPressed = () => ACTIONS.some((k) => k !== 'start' && A.pressed(k)) || A.ptr.pressed;
  function pollInput() {
    readPad();
    // tap: um aperto rápido (apertou e soltou entre dois quadros) ainda conta por um quadro
    ACTIONS.forEach((k) => { prev[k] = held[k]; held[k] = kb[k] || pad[k] || touchHeld[k] || tap[k]; tap[k] = false; });
    A.ptr.pressed = ptrPressedFlag; A.ptr.released = ptrReleasedFlag;
    ptrPressedFlag = false; ptrReleasedFlag = false;
  }
  function endInput() { A.ptr.moved = false; if (!A.ptr.released) A.ptr.swipe = A.ptr.swipe && A.ptr.down ? A.ptr.swipe : A.ptr.swipe; }

  /** Nome do botão principal conforme o aparelho (para "Aperte ___"). */
  A.btnName = function () {
    if (A.lastDevice === 'toque') return 'Toque';
    if (A.lastDevice === 'controle') return 'Aperte A';
    if (A.lastDevice === 'mouse') return 'Clique';
    return 'Aperte espaço';
  };

  // ---------- Botões da interface (voltar e som) ----------
  const ui = [];
  function uiHit(p) { return ui.some((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h); }
  function uiClick(p) { for (const b of ui) if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { b.fn(); return true; } return false; }
  A.back = function () { location.href = 'index.html'; };

  // ---------- Fluxo de um jogo ----------
  /**
   * A.game({
   *   id, title, tagline, w, h,
   *   lowerIsBetter: false,            // ranking por tempo (menor é melhor)
   *   format: (score) => '1.234',      // como mostrar a pontuação
   *   unit: 'pontos',
   *   start(),                         // começa uma partida nova
   *   update(dt),                      // a cada quadro (60 por segundo), só durante a partida
   *   draw(c, state),                  // desenha o jogo (state: 'title' | 'play' | 'over')
   *   drawTitle(c, t),                 // opcional: fundo da tela de início
   *   idle(dt)                         // opcional: anima o fundo na tela de início
   * })
   * Para encerrar a partida: A.end(score, { line: 'frase do IAmiguinho' }).
   */
  A.state = 'title';
  let G = null, overInfo = null, stateT = 0, paused = false;
  A.time = 0;
  A.end = function (score, info = {}) {
    if (A.state !== 'play') return;
    const key = 'arcade:' + G.id + ':' + A.week();
    const old = parseFloat(store.get(key));
    const better = isNaN(old) || (G.lowerIsBetter ? score < old : score > old);
    if (better) store.set(key, String(score));
    overInfo = { score, best: better ? score : old, record: better && !isNaN(old) ? true : better, first: isNaN(old), line: info.line || '', sub: info.sub || '' };
    A.state = 'over'; stateT = 0;
    A.sfx(better ? 'win' : 'lose');
  };
  A.bestOfWeek = function () { const v = parseFloat(store.get('arcade:' + G.id + ':' + A.week())); return isNaN(v) ? null : v; };
  function begin() {
    A.clearFx(); A.state = 'play'; stateT = 0; paused = false;
    A.sfx('start');
    G.start();
  }

  function drawTop(c) {
    ui.length = 0;
    // voltar
    const bw = 118, bh = 34;
    c.save(); c.globalAlpha = 0.9;
    c.fillStyle = 'rgba(16,19,24,0.82)'; A.cut(c, 12, 12, bw, bh, 12); c.fill();
    A.text(c, '< Arcade', 24, 35, { size: 12, color: A.C.ink2 });
    c.restore();
    ui.push({ x: 12, y: 12, w: bw, h: bh, fn: A.back });
    // som
    const sx = W - 12 - 44;
    c.save(); c.globalAlpha = 0.9; c.fillStyle = 'rgba(16,19,24,0.82)'; A.cut(c, sx, 12, 44, bh, 10); c.fill();
    c.strokeStyle = A.muted ? A.C.muted : A.C.ink2; c.fillStyle = c.strokeStyle; c.lineWidth = 2;
    c.beginPath(); c.moveTo(sx + 10, 24); c.lineTo(sx + 15, 24); c.lineTo(sx + 21, 18); c.lineTo(sx + 21, 40); c.lineTo(sx + 15, 34); c.lineTo(sx + 10, 34); c.closePath(); c.fill();
    if (A.muted) { c.beginPath(); c.moveTo(sx + 25, 23); c.lineTo(sx + 33, 35); c.moveTo(sx + 33, 23); c.lineTo(sx + 25, 35); c.stroke(); }
    else { c.beginPath(); c.arc(sx + 22, 29, 6, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(sx + 22, 29, 10, -0.9, 0.9); c.stroke(); }
    c.restore();
    ui.push({ x: sx, y: 12, w: 44, h: bh, fn: A.toggleMute });
  }

  function drawTouchButtons(c) {
    if (!A.isTouch || A.state !== 'play') return;
    for (const b of touchButtons) {
      const on = held[b.act];
      c.save(); c.globalAlpha = on ? 0.5 : 0.22;
      c.fillStyle = A.C.ink; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.fill();
      c.globalAlpha = on ? 0.95 : 0.6;
      A.text(c, b.label || '', b.x, b.y + 1, { size: Math.round(b.r * 0.5 / 3) * 3, align: 'center', base: 'middle', color: A.C.bg, shadow: false });
      c.restore();
    }
  }

  function drawTitleScreen(c) {
    const t = A.time;
    if (G.drawTitle) G.drawTitle(c, t); else { c.fillStyle = A.C.bg; c.fillRect(0, 0, W, H); }
    c.fillStyle = 'rgba(7,8,10,0.55)'; c.fillRect(0, 0, W, H);
    const cx = W / 2, portrait = H > W;
    const ty = portrait ? H * 0.3 : H * 0.36;
    A.text(c, 'Arcade do IAmiguinho', cx, ty - 66, { size: 15, align: 'center', color: A.C.now });
    const tsize = Math.floor(Math.min(48, (W - 60) / Math.max(6, G.title.length)) / 3) * 3;
    A.text(c, G.title, cx, ty, { size: tsize, wide: true, align: 'center', color: A.C.ink, stroke: A.C.out, strokeW: 9 });
    if (G.tagline) A.text(c, G.tagline, cx, ty + 42, { size: Math.min(15, Math.floor((W - 40) / G.tagline.length)), align: 'center', color: A.C.ink2 });
    A.drawIAmiguinho(c, cx, portrait ? H * 0.62 : H * 0.78, portrait ? 1.6 : 1.3, { pose: 'idle', t, spin: 1.2 });
    const blink = Math.sin(t * 5) > -0.3;
    if (blink) A.text(c, A.btnName() + ' para jogar', cx, portrait ? H * 0.74 : H * 0.92, { size: portrait ? 15 : 18, align: 'center', color: A.C.now });
    const best = A.bestOfWeek();
    if (best != null) A.text(c, 'Recorde da semana: ' + G.format(best) + (G.unit ? ' ' + G.unit : ''), cx, ty + 76, { size: 12, align: 'center', color: A.C.muted });
  }

  function drawOverScreen(c) {
    const o = overInfo, cx = W / 2, portrait = H > W;
    const a = Math.min(1, stateT * 3);
    c.save(); c.globalAlpha = a;
    c.fillStyle = 'rgba(7,8,10,0.86)'; c.fillRect(0, 0, W, H);
    const y0 = portrait ? H * 0.17 : H * 0.2;
    A.text(c, 'Fim de partida', cx, y0, { size: 15, align: 'center', color: A.C.muted });
    A.text(c, G.format(o.score), cx, y0 + 72, { size: portrait ? 42 : 54, wide: true, align: 'center', color: A.C.ink });
    let yy = y0 + 108;
    if (G.unit) { A.text(c, G.unit, cx, yy, { size: 15, align: 'center', color: A.C.ink2 }); yy += 30; }
    if (o.sub) { A.text(c, o.sub, cx, yy, { size: Math.min(12, Math.floor((W - 30) / o.sub.length)), align: 'center', color: A.C.muted }); yy += 28; }
    const rec = o.record ? (o.first ? 'Primeira marca da semana' : 'Novo recorde da semana!') : 'Recorde da semana: ' + G.format(o.best);
    A.text(c, rec, cx, yy + 16, { size: portrait ? 12 : 15, align: 'center', color: o.record ? A.C.now : A.C.ink2 });
    const ix = portrait ? cx : W * 0.16, iy = portrait ? H * 0.72 : H * 0.9;
    A.drawIAmiguinho(c, ix, iy, portrait ? 1.3 : 1.15, { pose: o.record ? 'cheer' : 'idle', t: A.time, face: o.record ? 'wow' : 'smug', spin: o.record ? 3 : 0.6 });
    if (o.line) A.bubble(c, ix + 6, iy - (portrait ? 150 : 132), o.line, { size: 12, align: portrait ? 'center' : 'left' });
    if (stateT > 0.6) {
      const by = portrait ? H * 0.86 : H * 0.8;
      const lab = (A.isTouch ? 'Toque' : A.lastDevice === 'controle' ? 'A' : 'Espaço') + ': de novo';
      const bw = A.measure(c, lab, { size: 15 }) + 54, bx = cx - bw / 2;
      c.fillStyle = A.C.ink; A.cut(c, bx, by - 30, bw, 45, 15); c.fill();
      A.text(c, lab, bx + 18, by, { size: 15, color: A.C.bg, shadow: false });
      if (!A.isTouch) A.text(c, (A.lastDevice === 'controle' ? 'B' : 'X') + ': voltar ao Arcade', cx, by + 42, { size: 12, align: 'center', color: A.C.muted });
    }
    c.restore();
  }

  A.game = function (def) {
    G = def;
    G.format = G.format || ((s) => Math.round(s).toLocaleString('pt-BR'));
    makeCanvas(G.w || 960, G.h || 540);
    document.title = G.title + ' · Arcade do IAmiguinho';
    cv.addEventListener('pointerdown', (e) => {
      const p = toGame(e);
      if (uiClick(p)) { e.preventDefault(); return; }
      onDown(e);
    });
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('visibilitychange', () => { if (document.hidden && A.state === 'play') paused = true; });
    let last = performance.now(), acc = 0;
    const STEP = 1 / 60;
    function frame(now) {
      let el = (now - last) / 1000; last = now;
      if (el > 0.25) el = 0.25;
      acc += el;
      while (acc >= STEP) {
        acc -= STEP;
        pollInput();
        A.time += STEP; stateT += STEP;
        if (A.state === 'title') {
          if (G.idle) G.idle(STEP);
          if ((A.anyPressed() && !(A.ptr.pressed && uiHit(A.ptr))) && stateT > 0.25) begin();
          else if (A.pressed('b') && stateT > 0.25) A.back();
        } else if (A.state === 'play') {
          if (A.pressed('start')) paused = !paused;
          if (paused) { if (A.anyPressed()) paused = false; }
          else { G.update(STEP); fxUpdate(STEP); }
        } else if (A.state === 'over') {
          fxUpdate(STEP);
          if (G.idle) G.idle(STEP);
          if (stateT > 0.8) {
            if (A.pressed('a') || (A.ptr.pressed && !uiHit(A.ptr))) begin();
            else if (A.pressed('b') || A.pressed('start')) A.back();
          }
        }
        endInput();
      }
      // desenhar, em camadas de 8 bits
      beginLayer();
      bctx.fillStyle = A.C.bg; bctx.fillRect(0, 0, W, H);
      bctx.save();
      if (shakeA > 0) bctx.translate(Math.round((Math.random() - 0.5) * shakeA * 2 / A.PIX) * A.PIX, Math.round((Math.random() - 0.5) * shakeA * 2 / A.PIX) * A.PIX);
      if (A.state === 'title') drawTitleScreen(bctx);
      else { G.draw(bctx, A.state); fxDraw(bctx); }
      bctx.restore();
      commitLayer(false);
      if (A.state === 'over' || paused) {
        beginLayer();
        if (A.state === 'over') drawOverScreen(bctx);
        if (paused) {
          bctx.fillStyle = 'rgba(7,8,10,0.7)'; bctx.fillRect(0, 0, W, H);
          A.text(bctx, 'Pausa', W / 2, H / 2, { size: 42, wide: true, align: 'center' });
          A.text(bctx, A.btnName() + ' para continuar', W / 2, H / 2 + 48, { size: 15, align: 'center', color: A.C.now });
        }
        commitLayer(true);
      }
      beginLayer();
      drawTouchButtons(bctx);
      drawTop(bctx);
      commitLayer(true);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };
})();
