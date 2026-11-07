/* ============================================================ jogo: Gancho do Cabo */
// Um botão só: segurando, o IAmiguinho laça o gancho mais próximo à frente com o cabo do controle e balança como pêndulo
// (o cabo vai encurtando devagar, então o balanço ganha velocidade); soltando, sai voando com o impulso.
// Cidade à noite, 5 fases curtas com bandeira no fim. O percurso é fixo (sorteado com semente fixa: igual para todo mundo).
// Caixas de som quicam; prédios no caminho batem; o rio de lag embaixo tira uma vida (volta ao último ponto de controle).
// Progressão: 1 telhados · 2 prédios no caminho · 3 ganchos que mexem · 4 Amiguinhos de hélice patrulhando · 5 tudo junto e o lag subindo.
// Pontos: 1000 por fase concluída + bônus de rapidez da fase (25 por segundo abaixo do tempo-alvo) + 300 por vida que sobrar ao zerar.
// Controles: PC Espaço/↑/W (segurar) · controle ✕/A (segurar) · celular: segurar na tela ou no botão SEGURAR.
Music.define('gancho', {
  bpm: 138,
  lead: bars('D5 . F#5 A5 . F#5 D6 - . A5 . F#5 G5 - E5 .', 'C#5 . E5 A5 . E5 C#6 - . A5 . G5 F#5 - E5 .', 'B4 . D5 G5 . D5 B5 - . G5 . F#5 E5 - D5 .', 'E5 - . A5 - . C#6 - - . B5 . A5 - - .'),
  arp: bars(x4('D5 F#5 A5 F#5'), x4('C#5 E5 A5 E5'), x4('B4 D5 G5 D5'), x4('C#5 E5 A5 E5')),
  bass: bars('D3 . . D3 . . A2 . D3 . . D3 . A2 . .', 'A2 . . A2 . . E3 . A2 . . A2 . E3 . .', 'G2 . . G2 . . D3 . G2 . . G2 . D3 . .', 'A2 . . A2 . . E3 . A2 . . C#3 . E3 . .'),
  drums: 'k . h . s . h k . k h . s . h h',
  mix: { arp: .55, lead: .85 },
});
const GC_G = 900, GC_REACH = 215, GC_LMIN = 46, GC_REEL = 34, GC_VMAX = 580, GC_WALK = 125, GC_HW = 9, GC_HH = 14, GC_RIO = 330, GC_VIDAS = 3;
const GC_CORES = ['#ffd04a', '#7fdcff', '#ff6fb0', '#8fd3ae', '#b79cff'];
const GC_JANELA = ['#ffd68c', '#7fdcff', '#ff9ad0', '#ffd68c'];
// fases: len comprimento · gap distância entre ganchos · hy altura dos ganchos · bt topo dos prédios no caminho · move parte dos ganchos que mexem
// bld prédios no caminho · spk caixas de som · drones Amiguinhos patrulhando · par tempo-alvo do bônus (s) · seed semente fixa do percurso
const GC_FASES = [
  { nome: 'Telhados', sub: 'aquecimento em cima da cidade', len: 3200, gap: [96, 118], hy: [92, 132], bt: [220, 240], move: 0, bld: 2, spk: 3, drones: 0, par: 36, seed: 7 },
  { nome: 'Prédios no caminho', sub: 'a cidade cresceu de repente', len: 3700, gap: [108, 136], hy: [86, 140], bt: [170, 215], move: 0, bld: 6, spk: 3, drones: 0, par: 40, seed: 23 },
  { nome: 'Ganchos dançantes', sub: 'os ganchos resolveram se mexer', len: 4100, gap: [114, 146], hy: [88, 146], bt: [180, 225], move: .5, bld: 3, spk: 3, drones: 0, par: 44, seed: 41 },
  { nome: 'Patrulha de hélice', sub: 'Amiguinhos voando no caminho', len: 4500, gap: [120, 154], hy: [86, 146], bt: [180, 225], move: .35, bld: 3, spk: 4, drones: 6, par: 48, seed: 58 },
  { nome: 'Tempestade de lag', sub: 'tudo junto e o lag subindo', len: 4900, gap: [128, 166], hy: [84, 150], bt: [170, 220], move: .5, bld: 4, spk: 4, drones: 8, par: 52, seed: 77 },
];
const GC_CTRL = ['.SSSSSSS.', 'SSsSSSRSS', 'SsssSSSYS', 'SSsSSGSSS', '.SS...SS.'];
const GC_BANDEIRA = ['XKXKXKXK', 'KXKXKXKX', 'XKXKXKXK', 'KXKXKXKX', 'XKXKXKXK'];
const gcFmtT = (s) => `${s.toFixed(1).replace('.', ',')} s`;
const gcHash = (i) => { let h = Math.imul((i | 0) ^ 0x9e3779b9, 2654435761); h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
function gcRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// monta o percurso da fase n (sempre igual: semente fixa)
function gcGerar(n) {
  const F = GC_FASES[n], r = gcRng(F.seed), R = (a, b) => a + r() * (b - a);
  const lv = { len: F.len, hooks: [], blds: [], spk: [], drones: [], cps: [], flagX: F.len + 70 };
  lv.blds.push({ x: -80, w: 240, top: 250, c: GC_CORES[1], id: 1 });
  const cpX = [Math.round(F.len / 3), Math.round(F.len * 2 / 3)];
  cpX.forEach((x, k) => { lv.blds.push({ x: x - 56, w: 118, top: 244, c: GC_CORES[3], id: 10 + k, cp: k }); lv.cps.push({ x, top: 244, ok: false }); });
  lv.blds.push({ x: F.len, w: 520, top: 248, c: GC_CORES[0], id: 99 });
  let x = 196, i = 0;
  while (x < F.len + 20) {
    const k = { x0: x, y0: Math.round(R(F.hy[0], F.hy[1])), mv: null, amp: 0, w: 0, ph: R(0, 6.28), c: GC_CORES[i % GC_CORES.length] };
    if (i > 1 && r() < F.move) { k.mv = r() < .5 ? 'h' : 'v'; k.amp = k.mv === 'h' ? R(24, 42) : R(18, 32); k.w = R(.9, 1.6); if (k.mv === 'v') k.y0 = clamp(k.y0, 84 + k.amp, 160); }
    k.x = k.x0; k.y = k.y0; lv.hooks.push(k);
    x += Math.round(R(F.gap[0], F.gap[1])); i++;
  }
  const livre = (x0, x1) => lv.blds.every((b) => x1 < b.x - 24 || x0 > b.x + b.w + 24) && lv.spk.every((s) => x1 < s.x - 24 || x0 > s.x + 28 + 24);
  // vãos entre ganchos onde dá para pôr coisas (longe do começo, do fim e dos pontos de controle)
  const vaos = []; for (let j = 2; j < lv.hooks.length - 2; j++) vaos.push((lv.hooks[j].x0 + lv.hooks[j + 1].x0) / 2);
  const sorteia = () => vaos.splice(Math.floor(r() * vaos.length), 1)[0];
  for (let b = 0, tries = 0; b < F.bld && tries < 60; tries++) { const cx = sorteia(); if (cx === undefined) break; const w = Math.round(R(36, 58)), x0 = Math.round(cx - w / 2); if (!livre(x0, x0 + w)) continue; lv.blds.push({ x: x0, w, top: Math.round(R(F.bt[0], F.bt[1])), c: GC_CORES[Math.floor(r() * 5)], id: 200 + b }); b++; }
  for (let s = 0, tries = 0; s < F.spk && tries < 60; tries++) { const cx = sorteia(); if (cx === undefined) break; const x0 = Math.round(cx - 14); if (!livre(x0, x0 + 28)) continue; lv.spk.push({ x: x0, top: 292, pulse: 0 }); s++; }
  for (let d = 0, tries = 0; d < F.drones && tries < 60; tries++) { const cx = sorteia(); if (cx === undefined) break; if (cpX.some((c) => Math.abs(cx - c) < 120)) continue; lv.drones.push({ x0: Math.round(cx), y0: Math.round(R(170, 225)), amp: R(28, 50), w: R(1.1, 1.9), ph: R(0, 6.28), c: GC_CORES[Math.floor(r() * 5)], x: cx, y: 200 }); d++; }
  return lv;
}
const gcJogo = {
  id: 'gancho', name: 'Gancho do Cabo', tag: 'Balanço · 5 fases', unit: 'pontos', ia: 2150, bestKey: '.v1',
  desc: 'Enganche, balance e voe pela cidade à noite.',
  how: 'Segure para laçar o gancho mais próximo à frente com o cabo e balançar; solte para sair voando com o impulso. Caixas de som quicam e o rio de lag tira uma vida: chegue à bandeira das 5 fases.',
  ctl: [['Espaço', 'segurar: engancha', 'pc'], ['✕ / A', 'segurar no controle', 'pc'], ['Esc', 'pausa', 'pc'], ['Segurar', 'na tela ou no botão', 'touch']],
  pad: [['Segurar', 'Space']],
  rank: [['@duda', 8420], ['@carol', 6930], ['@rafa', 4610], ['@bia', 2380]],
  nota: 'o cabo era de outro controle',
  falas: [
    'Cabo de controle serve pra tudo. Inclusive pra atravessar a cidade. A garantia não cobre, mas serve.',
    'Solta lá no alto que você voa. Solta lá embaixo que você nada. No lag. kkkk',
    'O rio de lag é igual Wi-Fi de hotel: entrou, travou.',
    'Caixa de som quica. Testei com o volume no máximo, os vizinhos amaram hahaha',
    'Eu faria de olhos fechados. Só não fecho porque meu rosto é a tela.',
  ],
  init() {
    Object.assign(this, { t: 0, wt: 0, score: 0, fase: 0, vidas: GC_VIDAS, tt: 0, fx: [], pops: [], feitas: 0, ultimoBonus: 0 });
    this.loadFase();
  },
  demo() {
    const k = this.lv.hooks[2]; this.anima();
    Object.assign(this, { mode: 'play', att: k, ropeT: 1, L: 104, px: k.x + 62, py: k.y + 84, vx: 210, vy: -90, ground: false });
    this.camX = Math.round(this.px - 150);
  },
  loadFase() {
    this.lv = gcGerar(this.fase); this.tf = 0; this.cpi = -1; this.rio = GC_RIO;
    this.spawn(); this.mode = 'intro'; this.mt = 1.5; this.camX = -20;
  },
  // volta ao último ponto de controle (ou ao começo da fase)
  spawn() {
    const cp = this.cpi >= 0 ? this.lv.cps[this.cpi] : { x: 70, top: 250 };
    Object.assign(this, { px: cp.x, py: cp.top - GC_HH, vx: 0, vy: 0, att: null, ultimo: null, L: 0, ground: true, dz: 0, ropeT: 0, solto: null });
    this.camX = Math.round(cp.x - 110);
  },
  held() { return isHeld('Space', 'ArrowUp', 'KeyW', 'Enter') || !!inp.drag; },
  // o gancho mais próximo à frente, dentro do alcance do cabo
  alvo() {
    let best = null, bd = GC_REACH;
    for (const k of this.lv.hooks) { if (k === this.ultimo) continue; const dx = k.x - this.px, dy = k.y - this.py; if (dx < -24 || dy > 6 || dx > GC_REACH) continue; const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = k; } }
    return best;
  },
  anima() {
    const t = this.wt;
    for (const k of this.lv.hooks) { if (k.mv === 'h') k.x = k.x0 + Math.sin(t * k.w + k.ph) * k.amp; else if (k.mv === 'v') k.y = k.y0 + Math.sin(t * k.w + k.ph) * k.amp; }
    for (const d of this.lv.drones) { d.x = d.x0 + Math.sin(t * d.w * .5 + d.ph) * 10; d.y = d.y0 + Math.sin(t * d.w + d.ph) * d.amp; }
    if (this.fase === 4) this.rio = GC_RIO - Math.round(9 + 9 * Math.sin(t * .7));
  },
  burst(x, y, c, n, sp = 90) { for (let k = 0; k < n; k++) this.fx.push({ x, y, vx: rand(-sp, sp), vy: rand(-sp, sp * .4), c, t: 0, life: rand(.25, .55) }); },
  pop(s, x, y, c) { this.pops.push({ s, x, y, c, t: 0 }); },
  prender(k) {
    this.att = k; this.ultimo = null; this.L = Math.max(GC_LMIN, Math.hypot(this.px - k.x, this.py - k.y)); this.ropeT = 0; this.solto = null;
    beep(760, .05, 'square', .035, 380); this.burst(k.x, k.y, k.c, 5, 50);
  },
  soltar() {
    const k = this.att; this.att = null; this.ultimo = k; this.solto = { x: k.x, y: k.y, t: 0 };
    if (this.vx > 0) this.vx += 18;
    beep(440, .06, 'triangle', .035, 300);
  },
  caiu(por) {
    this.vidas--; this.mode = 'caiu'; this.mt = 1.3; this.att = null; this.porque = por; sfx.hit(); shake = .3;
    this.burst(this.px, Math.min(this.py, this.rio), '#ff3fa4', 14, 140); this.burst(this.px, Math.min(this.py, this.rio), '#3ff0ff', 10, 120);
  },
  // um passo da física: gravidade, cabo (pêndulo de comprimento fixo que encurta devagar), batidas
  step(h, pega = true) {
    const held = pega && this.held() && this.dz <= 0;
    if (held && !this.att) { const k = this.alvo(); if (k) this.prender(k); }
    if (!held && this.att) this.soltar();
    const ox = this.px, oy = this.py;
    this.vy += GC_G * h;
    if (this.att) {
      const k = this.att; this.L = Math.max(GC_LMIN, this.L - GC_REEL * h);
      const nx = (this.px - k.x) / (Math.hypot(this.px - k.x, this.py - k.y) || 1), ny = (this.py - k.y) / (Math.hypot(this.px - k.x, this.py - k.y) || 1);
      // empurrãozinho no balanço para a frente (ganha velocidade balançando)
      if (ny > 0) { let tx = -ny, ty = nx; if (tx < 0) { tx = -tx; ty = -ty; } if (tx * this.vx + ty * this.vy > -5) { this.vx += tx * 150 * h; this.vy += ty * 150 * h; } }
    }
    const sp = Math.hypot(this.vx, this.vy); if (sp > GC_VMAX) { this.vx *= GC_VMAX / sp; this.vy *= GC_VMAX / sp; }
    this.vx *= 1 - .04 * h;
    this.px += this.vx * h; this.py += this.vy * h;
    if (this.att) {
      const k = this.att, dx = this.px - k.x, dy = this.py - k.y, d = Math.hypot(dx, dy);
      if (d > this.L) { const nx = dx / d, ny = dy / d; this.px = k.x + nx * this.L; this.py = k.y + ny * this.L; const vr = this.vx * nx + this.vy * ny; if (vr > 0) { this.vx -= nx * vr; this.vy -= ny * vr; } }
    }
    // prédios e caixas de som
    this.ground = false;
    const hit = (x0, top, w) => this.px + GC_HW > x0 && this.px - GC_HW < x0 + w && this.py + GC_HH > top;
    for (const b of this.lv.blds) {
      if (!hit(b.x, b.top, b.w)) continue;
      if (oy + GC_HH <= b.top + 3) { this.py = b.top - GC_HH; if (this.vy > 0) { if (this.vy > 260) { this.burst(this.px, b.top, '#9aa7b4', 4, 40); beep(160, .05, 'square', .03); } this.vy = 0; } this.ground = true; }
      else if (ox < b.x + b.w / 2) { this.px = b.x - GC_HW - .1; if (this.vx > 80) { beep(200, .08, 'sawtooth', .04, -80); shake = .12; this.burst(this.px + GC_HW, this.py, b.c, 5, 60); } this.vx = -Math.abs(this.vx) * .3; }
      else { this.px = b.x + b.w + GC_HW + .1; this.vx = Math.abs(this.vx) * .3; }
    }
    for (const s of this.lv.spk) {
      if (!hit(s.x, s.top, 28)) continue;
      if (oy + GC_HH <= s.top + 6) {
        this.py = s.top - GC_HH; this.vy = -Math.max(540, Math.abs(this.vy) * .92); this.vx = Math.max(this.vx, 175); s.pulse = 1;
        beep(110, .18, 'square', .07, 260); setTimeout(() => beep(220, .08, 'square', .04), 60); this.burst(s.x + 14, s.top, '#ff6fb0', 8, 90); this.pop('TUM!', s.x + 14, s.top - 10, '#ff6fb0');
      } else if (ox < s.x + 14) { this.px = s.x - GC_HW - .1; this.vx = -Math.abs(this.vx) * .3; }
      else { this.px = s.x + 28 + GC_HW + .1; this.vx = Math.abs(this.vx) * .3; }
    }
    // no chão: o IAmiguinho anda sozinho para a frente
    if (this.ground) this.ultimo = null;
    if (this.ground && !this.att) { if (this.vx < GC_WALK) this.vx = Math.min(GC_WALK, this.vx + 420 * h); else this.vx -= 260 * h; }
    const sp2 = Math.hypot(this.vx, this.vy); if (sp2 > GC_VMAX + 40) { this.vx *= (GC_VMAX + 40) / sp2; this.vy *= (GC_VMAX + 40) / sp2; }
    if (this.px < 12) { this.px = 12; this.vx = Math.abs(this.vx) * .3; }
  },
  update(dt) {
    this.t += dt; this.wt += dt; this.anima();
    for (const f of this.fx) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 300 * dt; }
    this.fx = this.fx.filter((f) => f.t < f.life);
    for (const p of this.pops) p.t += dt; this.pops = this.pops.filter((p) => p.t < .7);
    for (const s of this.lv.spk) s.pulse = Math.max(0, s.pulse - dt * 3);
    if (this.solto) { this.solto.t += dt; if (this.solto.t > .14) this.solto = null; }
    this.ropeT += dt;
    const cam = () => { const tx = this.px - 110 + clamp(this.vx * .22, -30, 70); this.camX += (tx - this.camX) * Math.min(1, dt * 5); this.camX = clamp(this.camX, -40, this.lv.flagX + 120 - W); };
    if (this.mode === 'intro') { this.mt -= dt; cam(); if (this.mt <= 0) this.mode = 'play'; return false; }
    if (this.mode === 'caiu') {
      this.mt -= dt; if (this.mt > 0) return false;
      if (this.vidas <= 0) { this.mode = 'fim'; this.mt = 1.8; sfx.over(); return false; }
      this.spawn(); this.mode = 'intro'; this.mt = .9; return false;
    }
    if (this.mode === 'fase') {
      this.mt -= dt;
      if (this.ground) this.vx = Math.max(0, this.vx - 400 * dt); this.step(dt, false); cam();
      if (this.mt > 0) return false;
      this.fase++; this.loadFase(); sfx.start(); return false;
    }
    if (this.mode === 'fim' || this.mode === 'zerou') { this.mt -= dt; return this.mt <= 0; }
    // jogando
    this.tf += dt; this.tt += dt; this.dz = Math.max(0, this.dz - dt);
    for (let n = 0; n < 3; n++) this.step(dt / 3);
    cam();
    // pontos de controle
    this.lv.cps.forEach((c, k) => { if (!c.ok && this.px >= c.x) { c.ok = true; this.cpi = k; sfx.coin(); this.pop('PONTO DE CONTROLE', c.x, c.top - 40, '#8fd3ae'); } });
    // Amiguinhos de hélice: derrubam do cabo
    if (this.dz <= 0) for (const d of this.lv.drones) if (Math.hypot(this.px - d.x, this.py - d.y) < 20) {
      if (this.att) { this.solto = { x: this.att.x, y: this.att.y, t: 0 }; this.ultimo = this.att; this.att = null; }
      this.dz = .45; this.vy = -170; this.vx = (this.px < d.x ? -1 : 1) * 110; beep(240, .2, 'sawtooth', .05, -160); shake = .2; this.burst(this.px, this.py, d.c, 8, 90); this.pop(pick(['OPA!', 'EI!', 'SAI!']), this.px, this.py - 24, d.c); break;
    }
    // rio de lag
    if (this.py + GC_HH > this.rio + 6) { this.caiu('lag'); return false; }
    // bandeira
    if (this.px >= this.lv.flagX) {
      const bonus = Math.max(0, Math.round((GC_FASES[this.fase].par - this.tf) * 25));
      this.ultimoBonus = bonus; this.score += 1000 + bonus; this.feitas++; this.att = null;
      if (this.fase >= GC_FASES.length - 1) { this.score += 300 * this.vidas; this.mode = 'zerou'; this.mt = 3; Music.jingle(JINGLE.recorde); }
      else { this.mode = 'fase'; this.mt = 2.4; Music.jingle(JINGLE.comeco); }
      sfx.big(); this.burst(this.lv.flagX, 200, '#ffd04a', 16, 120);
    }
    return false;
  },
  // ---------- desenho
  ceu(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#060a17'); g.addColorStop(.6, '#141432'); g.addColorStop(1, '#2a1638'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const cx = this.camX || 0;
    for (let i = 0; i < 60; i++) { const x = ((Math.floor(gcHash(i) * 900) - cx * .04) % W + W) % W, y = Math.floor(gcHash(i + 99) * 230) + 4, tw = (Math.floor(t * 2 + i) % 7) === 0; ctx.fillStyle = i % 6 ? 'rgba(200,220,255,.35)' : tw ? '#ffffff' : 'rgba(255,255,255,.7)'; ctx.fillRect(x, y, 1, 1); }
    // lua
    const mx = Math.round(252 - clamp(cx / this.lv.flagX, 0, 1) * 40);
    ctx.fillStyle = 'rgba(255,240,200,.06)'; ctx.fillRect(mx - 14, 62, 28, 16); ctx.fillRect(mx - 8, 56, 16, 28); ctx.fillStyle = '#f2ead2'; ctx.fillRect(mx - 10, 60, 20, 20); ctx.fillRect(mx - 12, 63, 24, 14); ctx.fillRect(mx - 7, 58, 14, 24);
    ctx.fillStyle = '#d9cfb0'; ctx.fillRect(mx - 4, 64, 4, 3); ctx.fillRect(mx + 3, 71, 3, 3);
    // prédios ao longe (duas camadas)
    for (const [p, base, col, win, sd] of [[.18, 250, '#10162a', .12, 5], [.42, 280, '#151d34', .22, 9]]) {
      const off = cx * p, sw = 34, i0 = Math.floor(off / sw) - 1;
      for (let i = i0; i < i0 + W / sw + 3; i++) {
        const hh = 40 + Math.floor(gcHash(i * 7 + sd) * 110), bw = 22 + Math.floor(gcHash(i * 13 + sd) * 12), x = Math.round(i * sw - off), y = base - hh;
        ctx.fillStyle = col; ctx.fillRect(x, y, bw, H - y);
        for (let wy = y + 6; wy < base - 4; wy += 9) for (let wx = x + 4; wx < x + bw - 3; wx += 7) { const hv = gcHash(i * 131 + wy * 7 + wx); if (hv < win) { ctx.fillStyle = GC_JANELA[Math.floor(hv * 40) % 4]; ctx.globalAlpha = p < .3 ? .25 : .4; ctx.fillRect(wx, wy, 3, 3); ctx.globalAlpha = 1; } }
        if (p > .3 && gcHash(i * 3 + 1) < .18) { const c = GC_CORES[i & 3 & 3], on = Math.floor(t * 1.5 + i) % 5 !== 0; ctx.fillStyle = c; ctx.globalAlpha = on ? .55 : .15; ctx.fillRect(x + 3, y + 10, bw - 6, 5); ctx.globalAlpha = 1; }
        if (gcHash(i * 5 + sd) < .3) { ctx.fillStyle = col; ctx.fillRect(x + Math.floor(bw / 2), y - 10, 1, 10); if (Math.floor(t * 2 + i) % 2) { ctx.fillStyle = '#e8443a'; ctx.fillRect(x + Math.floor(bw / 2), y - 11, 1, 1); } }
      }
    }
  },
  predio(b, t) {
    const x = Math.round(b.x - this.camX), top = b.top; if (x > W + 4 || x + b.w < -4) return;
    ctx.fillStyle = '#07050c'; ctx.fillRect(x - 1, top - 1, b.w + 2, H - top + 1);
    ctx.fillStyle = '#1d2538'; ctx.fillRect(x, top, b.w, H - top);
    ctx.fillStyle = '#161c2c'; ctx.fillRect(x + b.w - 5, top, 5, H - top);
    for (let wy = top + 10; wy < H; wy += 12) for (let wx = x + 5; wx < x + b.w - 8; wx += 9) { const hv = gcHash(b.id * 977 + wy * 13 + (wx - x)); ctx.fillStyle = hv < .38 ? GC_JANELA[Math.floor(hv * 50) % 4] : '#111726'; ctx.globalAlpha = hv < .38 ? .75 : 1; ctx.fillRect(wx, wy, 4, 5); ctx.globalAlpha = 1; }
    ctx.fillStyle = b.c; ctx.fillRect(x, top, b.w, 2); ctx.globalAlpha = .25; ctx.fillRect(x, top + 2, b.w, 2); ctx.globalAlpha = 1;
    // antena no telhado
    if (b.w < 80) { ctx.fillStyle = '#5d6875'; ctx.fillRect(x + 8, top - 9, 1, 9); ctx.fillRect(x + 6, top - 6, 5, 1); if (Math.floor(t * 2 + b.id) % 2) { ctx.fillStyle = '#e8443a'; ctx.fillRect(x + 8, top - 10, 1, 1); } }
    if (b.cp !== undefined) {
      const c = this.lv.cps[b.cp], px = x + b.w - 16;
      ctx.fillStyle = '#5d6875'; ctx.fillRect(Math.round(px), top - 26, 2, 26);
      ctx.fillStyle = '#07050c'; ctx.fillRect(Math.round(px) - 3, top - 31, 8, 7);
      ctx.fillStyle = c.ok ? '#8fd3ae' : Math.floor(t * 2) % 2 ? '#e8443a' : '#7a2a24'; ctx.fillRect(Math.round(px) - 2, top - 30, 6, 5);
      if (c.ok) { ctx.fillStyle = 'rgba(143,211,174,.18)'; ctx.fillRect(Math.round(px) - 8, top - 36, 18, 16); }
    }
  },
  caixa(s, t) {
    const x = Math.round(s.x - this.camX), p = s.pulse, sq = Math.round(p * 3), top = s.top + sq; if (x > W + 4 || x < -34) return;
    ctx.fillStyle = '#07050c'; ctx.fillRect(x + 9, s.top + 28, 10, H - s.top); ctx.fillStyle = '#3a4456'; ctx.fillRect(x + 10, s.top + 28, 8, H - s.top);
    ctx.fillStyle = '#07050c'; ctx.fillRect(x - 1, top - 1, 30, 31 - sq);
    ctx.fillStyle = '#2b3142'; ctx.fillRect(x, top, 28, 29 - sq);
    ctx.fillStyle = '#ff6fb0'; ctx.fillRect(x, top, 28, 2); ctx.fillStyle = '#b24f80'; ctx.fillRect(x, top + 27 - sq, 28, 2);
    const beat = Math.floor(t * 4.6) % 2, cx = x + 14;
    // alto-falantes: tweeter em cima, woofer grande embaixo (o woofer pulsa)
    const disco = (cy, r, cone) => { for (let dy = -r; dy < r; dy++) for (let dx = -r; dx < r; dx++) { const d = Math.hypot(dx + .5, dy + .5); if (d > r) continue; ctx.fillStyle = d > r - 1.3 ? '#9aa7b4' : d > cone ? '#151a24' : '#5d6875'; ctx.fillRect(cx + dx, cy + dy, 1, 1); } };
    disco(top + 7, 3, 1.2); disco(top + 18 - Math.round(sq / 2), 7 + (beat && p > 0 ? 1 : 0), 2.2 + beat);
    ctx.fillStyle = beat ? '#3ff0ff' : '#ff6fb0'; ctx.fillRect(x + 23, top + 4, 2, 2); ctx.fillRect(x + 3, top + 4, 2, 2);
    if (p > 0) { ctx.globalAlpha = p * .7; ctx.fillStyle = '#ff6fb0'; const r = Math.round(18 + (1 - p) * 14); ctx.fillRect(cx - r, top - 4 - Math.round((1 - p) * 10), 3, 3); ctx.fillRect(cx + r - 3, top - 4 - Math.round((1 - p) * 10), 3, 3); ctx.fillRect(cx - 1, top - 8 - Math.round((1 - p) * 16), 3, 3); ctx.globalAlpha = 1; }
  },
  gancho(k, t, alvo) {
    const x = Math.round(k.x - this.camX), y = Math.round(k.y); if (x < -20 || x > W + 20) return;
    // pendurado num fio que sobe (ou num trilho, se mexe)
    if (k.mv === 'h') { const a = Math.round(k.x0 - k.amp - this.camX), b = Math.round(k.x0 + k.amp - this.camX), ry = y - 16; ctx.fillStyle = '#3a4456'; ctx.fillRect(a - 4, ry, b - a + 8, 2); ctx.fillStyle = '#5d6875'; ctx.fillRect(a - 5, ry - 2, 2, 6); ctx.fillRect(b + 3, ry - 2, 2, 6); ctx.fillRect(x, ry, 1, 12); ctx.fillStyle = '#9aa7b4'; ctx.fillRect(x - 3, ry - 2, 7, 3); }
    else { ctx.fillStyle = 'rgba(154,167,180,.35)'; ctx.fillRect(x, 0, 1, y - 4); if (k.mv === 'v') { ctx.fillStyle = 'rgba(127,220,255,.5)'; ctx.fillRect(x - 2, Math.round(k.y0 - k.amp) - 4, 5, 1); ctx.fillRect(x - 2, Math.round(k.y0 + k.amp) - 4, 5, 1); } }
    const on = this.att === k, c = k.c;
    ctx.fillStyle = c; ctx.globalAlpha = on ? .35 : .14; ctx.fillRect(x - 7, y - 7, 15, 15); ctx.globalAlpha = 1;
    ctx.fillStyle = '#07050c'; ctx.fillRect(x - 5, y - 5, 11, 11);
    ctx.fillStyle = on ? '#ffffff' : c; ctx.fillRect(x - 4, y - 4, 9, 9);
    ctx.fillStyle = '#07050c'; ctx.fillRect(x - 2, y - 2, 5, 5);
    ctx.fillStyle = on ? c : '#ffffff'; ctx.fillRect(x - 4, y - 4, 2, 1);
    if (alvo) { const g = 9 + (Math.floor(t * 8) % 2); ctx.fillStyle = '#ffffff'; for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.fillRect(x + sx * g - (sx > 0 ? 2 : 0), y + sy * g - (sy > 0 ? 0 : 0), 3, 1); ctx.fillRect(x + sx * g - (sx > 0 ? 0 : 0), y + sy * g - (sy > 0 ? 2 : 0), 1, 3); } }
  },
  drone(d, t) {
    const x = Math.round(d.x - this.camX), y = Math.round(d.y); if (x < -30 || x > W + 30) return;
    sprO(BOT, x - 12, y - 10, 3, { ...PAL, O: d.c, o: '#3a2a4a', E: '#ffffff' }, Math.sin(t * d.w + d.ph) > 0);
    helice(x, y - 14, t * 1.4, 2);
    ctx.fillStyle = 'rgba(255,90,106,.25)'; ctx.fillRect(x - 1, y + 14, 3, 3);
  },
  cabo(t) {
    const hx = this.px - this.camX, hy = this.py - 2;
    let k = this.att ? { x: this.att.x, y: this.att.y } : this.solto, f = 1;
    if (!k) return;
    if (this.att) f = Math.min(1, .25 + this.ropeT / .08); else f = Math.max(0, 1 - this.solto.t / .14);
    const ex = hx + (k.x - this.camX - hx) * f, ey = hy + (k.y - hy) * f, d = Math.hypot(ex - hx, ey - hy), n = Math.max(1, Math.round(d / 2));
    // folga: o fio faz uma barriguinha quando não está esticado
    const slack = this.att ? Math.max(0, this.L - Math.hypot(this.px - k.x, this.py - k.y)) : 6;
    const pts = []; for (let i = 0; i <= n; i++) { const u = i / n; pts.push([Math.round(hx + (ex - hx) * u), Math.round(hy + (ey - hy) * u + Math.sin(u * Math.PI) * Math.min(18, slack * .6))]); }
    ctx.fillStyle = '#07050c'; for (const [x, y] of pts) ctx.fillRect(x - 1, y - 1, 4, 4);
    pts.forEach(([x, y], i) => { ctx.fillStyle = (i >> 1) % 3 === 0 ? '#5d6875' : '#c3c9cf'; ctx.fillRect(x, y, 2, 2); });
    // o controle enrolado no gancho, na ponta do cabo
    spr(GC_CTRL, Math.round(ex - 4), Math.round(ey + 3), 1);
    void t;
  },
  bandeira(t) {
    const x = Math.round(this.lv.flagX - this.camX), top = this.lv.blds[this.lv.blds.length - 1].top; if (x < -40 || x > W + 40) return;
    ctx.fillStyle = '#07050c'; ctx.fillRect(x - 2, top - 62, 4, 62); ctx.fillStyle = '#d9dfe6'; ctx.fillRect(x - 1, top - 62, 2, 62);
    ctx.fillStyle = '#ffd04a'; ctx.fillRect(x - 2, top - 65, 4, 4);
    for (let c = 0; c < 8; c++) { const wv = Math.round(Math.sin(t * 6 - c * .8) * 1.5); for (let r = 0; r < 5; r++) { ctx.fillStyle = GC_BANDEIRA[r][c] === 'X' ? '#f2f4f6' : '#0a1016'; ctx.fillRect(x + 1 + c * 3, top - 60 + r * 3 + wv, 3, 3); } }
    ctx.globalAlpha = .18 + .1 * Math.sin(t * 4); ctx.fillStyle = '#ffd04a'; ctx.fillRect(x - 14, top - 72, 52, 72); ctx.globalAlpha = 1;
  },
  lag(t) {
    const y0 = Math.round(this.rio), cx = this.camX;
    ctx.fillStyle = '#1a0b26'; ctx.fillRect(0, y0, W, H - y0);
    const fr = Math.floor(t * 10);
    for (let k = 0; k < 22; k++) {
      const hv = gcHash(k * 31 + fr * 7), w = 6 + Math.floor(hv * 30), x = Math.round(((k * 61 + Math.floor(gcHash(k) * 300) - cx) % (W + 60) + W + 60) % (W + 60) - 30 + (hv < .2 ? Math.floor(hv * 40) - 4 : 0)), y = y0 + 4 + Math.floor(gcHash(k * 17 + fr) * (H - y0 - 8));
      ctx.fillStyle = hv < .33 ? 'rgba(255,63,164,.55)' : hv < .66 ? 'rgba(63,240,255,.45)' : 'rgba(120,60,180,.6)'; ctx.fillRect(x, y, w, 2 + (k % 3));
    }
    ctx.fillStyle = '#ff3fa4'; for (let x = 0; x < W; x += 4) { const wv = Math.round(Math.sin((x + cx) * .08 + t * 3) * 1.5); ctx.fillRect(x, y0 + wv, 4, 2); }
    ctx.fillStyle = '#3ff0ff'; ctx.globalAlpha = .6; for (let x = 2; x < W; x += 8) { const wv = Math.round(Math.sin((x + cx) * .08 + t * 3 + 1) * 1.5); if ((fr + x) % 5) ctx.fillRect(x + (fr % 2), y0 + 2 + wv, 3, 1); } ctx.globalAlpha = 1;
    // "999 ms" boiando no lag
    ctx.font = '600 9px "IBM Plex Mono", monospace'; ctx.fillStyle = 'rgba(255,63,164,.35)';
    for (let k = 0; k < 3; k++) { const x = Math.round(((k * 140 + 40 - cx * .9) % (W + 80) + W + 80) % (W + 80) - 40); ctx.fillText(k === 1 ? 'LAG' : '999 ms', x, y0 + 16 + (k % 2) * 6); }
  },
  progresso() {
    const lv = this.lv, x0 = 24, w = W - 48, y = H - 6, u = (v) => Math.round(x0 + clamp(v / lv.flagX, 0, 1) * w);
    ctx.fillStyle = 'rgba(7,5,12,.7)'; ctx.fillRect(x0 - 2, y - 2, w + 4, 5);
    ctx.fillStyle = '#3a4456'; ctx.fillRect(x0, y, w, 1);
    ctx.fillStyle = '#7fdcff'; ctx.fillRect(x0, y, u(this.px) - x0, 1);
    for (const c of lv.cps) { ctx.fillStyle = c.ok ? '#8fd3ae' : '#5d6875'; ctx.fillRect(u(c.x) - 1, y - 2, 3, 5); }
    ctx.fillStyle = '#ffd04a'; ctx.fillRect(x0 + w - 1, y - 3, 3, 7);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(u(this.px) - 1, y - 3, 3, 7);
  },
  draw(t = this.t) {
    const wt = state === 'menu' ? t : this.wt;
    if (state === 'menu') { this.wt = t; this.anima(); }
    this.ceu(wt);
    const lv = this.lv;
    for (const k of lv.hooks) this.gancho(k, wt, false);
    for (const b of lv.blds) this.predio(b, wt);
    for (const s of lv.spk) this.caixa(s, wt);
    this.bandeira(wt);
    // gancho que o cabo vai pegar se segurar agora
    if (!this.att && (this.mode === 'play' || this.mode === 'intro')) { const a = this.alvo(); if (a) this.gancho(a, wt, true); }
    for (const d of lv.drones) this.drone(d, wt);
    this.cabo(wt);
    if (this.mode !== 'caiu' || this.mt > 1.1) {
      const x = this.px - this.camX, y = this.py;
      ctx.save(); ctx.translate(Math.round(x), Math.round(y));
      const ang = this.ground ? 0 : this.att ? clamp(Math.atan2(this.px - this.att.x, -(this.py - this.att.y)) * -.35, -.5, .5) : clamp(this.vx / 900, -.3, .3) + clamp(this.vy / 1400, -.2, .3);
      ctx.rotate(ang);
      const bob = this.ground && Math.abs(this.vx) > 20 ? Math.floor(wt * 10) % 2 : 0;
      drawIA(-14, -16 - bob, 2, wt, { dizzy: this.dz > 0 || this.mode === 'caiu', fast: !!this.att || this.vy < -100 });
      ctx.restore();
      if (y < 4) { const ax = Math.round(clamp(x, 8, W - 8)); ctx.fillStyle = '#07050c'; ctx.fillRect(ax - 4, 56, 9, 6); ctx.fillStyle = '#ffffff'; ctx.fillRect(ax - 3, 59, 7, 2); ctx.fillRect(ax - 1, 57, 3, 2); }
    }
    for (const f of this.fx) { ctx.globalAlpha = Math.max(0, 1 - f.t / f.life); ctx.fillStyle = f.c; ctx.fillRect(Math.round(f.x - this.camX), Math.round(f.y), 2, 2); }
    ctx.globalAlpha = 1;
    this.lag(wt);
    for (const p of this.pops) { ctx.globalAlpha = Math.max(0, 1 - p.t / .7); ctx.font = '800 11px Archivo, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#07050c'; const yy = Math.round(p.y - p.t * 24); ctx.strokeText(p.s, Math.round(p.x - this.camX), yy); ctx.fillStyle = p.c; ctx.fillText(p.s, Math.round(p.x - this.camX), yy); ctx.textAlign = 'left'; }
    ctx.globalAlpha = 1;
    this.progresso();
    if (state !== 'play') return;
    const F = GC_FASES[this.fase];
    if (this.mode === 'intro') banner([[`FASE ${this.fase + 1} · ${F.nome.toUpperCase()}`, F_BIG, '#ffffff'], [this.vidas < GC_VIDAS && this.tf > 0 ? `${this.vidas === 1 ? 'Resta 1 vida' : `Restam ${this.vidas} vidas`}` : F.sub, F_SM, '#c3c9cf']], 192);
    if (this.mode === 'caiu') banner([[this.vidas > 0 ? 'TRAVOU NO LAG!' : 'TRAVOU DE VEZ!', F_BIG, '#ff6fb0'], [this.vidas > 0 ? (this.cpi >= 0 ? 'de volta ao ponto de controle' : 'de volta ao começo da fase') : 'sem vidas', F_SM, '#ffffff']], 192);
    if (this.mode === 'fase') banner([['FASE CONCLUÍDA!', F_BIG, '#8fd3ae'], [`${gcFmtT(this.tf)} · +1000 · rapidez +${this.ultimoBonus}`, F_SM, '#ffffff']], 192);
    if (this.mode === 'zerou') banner([['CIDADE ATRAVESSADA!', F_BIG, '#ffd04a'], [`${gcFmtT(this.tt)} no total · vidas +${300 * this.vidas}`, F_SM, '#ffffff']], 192);
    if (this.mode === 'fim') banner([['FIM DO CABO', F_BIG, '#ff8a8a'], [`${this.feitas} de 5 fases`, F_SM, '#ffffff']], 192);
  },
  hud() { return [`Fase ${this.fase + 1}/5`, this.score, `${'♥'.repeat(Math.max(0, this.vidas))} · ${gcFmtT(this.tf)}`]; },
  overText() {
    if (this.mode === 'zerou') return `Zerou as 5 fases em ${gcFmtT(this.tt)} com ${this.vidas} ${this.vidas === 1 ? 'vida sobrando' : 'vidas sobrando'}.`;
    return `Parou na fase ${this.fase + 1} (${GC_FASES[this.fase].nome}). Fases concluídas: ${this.feitas} de 5 · ${gcFmtT(this.tt)} de cabo.`;
  },
};
ARCADE_NOVOS.push(gcJogo);
