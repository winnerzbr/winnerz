/* ============================================================ prova nova: Paraquedismo em formação (31/10/2026)
   Céu da Enseada Cristal: salto sobre água transparente e ilhotas, pouso no alvo de areia de uma ilhota. 3 saltos.
   Cada salto em três partes:
   1. Queda livre (vista de cima, o chão crescendo lá embaixo): o IAmiguinho cai com 3 Amiguinhos. As setas movem no ar
      (com embalo). Encostar devagar num Amiguinho dá as mãos (rápido demais, eles se esbarram e se afastam). Com os quatro,
      a roda fecha: bônus, e quanto mais tempo fechada, mais pontos. Rajadas de vento empurram o grupo; se o grupo correr
      rápido demais, alguém solta a mão. Aos 1.500 m, todos se separam.
   2. Abertura: ✕ abre o paraquedas. Quanto mais baixo, mais pontos; abaixo de 200 m o pouso é duro, e aos 120 m o
      paraquedas reserva abre sozinho, sem pontos. Abrir baixo também deixa menos tempo para guiar.
   3. Pouso (vista de lado): ◀ ▶ guiam contra o vento até o alvo de areia, e ✕ logo antes do chão freia (pousa em pé).
   Arte provisória: o chão, as nuvens, o paraquedas e o alvo são desenhados pelo jogo; os personagens usam os desenhos do
   peixinho do vôlei (na queda) e do pulo (pendurados no paraquedas). */
const PQ = { saltos: 3, alt0: 4000, sep: 1500, vff: 180, vfree: 260, low: 200, auto: 120, gaH: 60, ar: 9, link: 18, ring: 34 };
if (typeof Music !== 'undefined' && Music.songs.surfe) Music.songs.paraquedas = Music.songs.surfe;
FALA.intro.paraquedas = [
  'Paraquedismo em formação: eu e três Amiguinhos de mãos dadas a quatro mil metros. O que eles não sabem é que eu tenho medo de altura.',
  'Encosta devagar que eles dão a mão. Rápido demais, a gente se esbarra e cada um vai para um lado.',
  'Abrir baixo vale mais. Abrir baixo DEMAIS vale um pouso de bumbum na areia.',
];
FALA.pqBoa = ['Roda fechada! Quatro amigos girando no céu.', 'Na mosca! Pode medir com régua.', 'Pousei em pé! Quase elegante.'];
FALA.pqRuim = ['Soltou a mão. Eu sabia que ele estava suando.', 'Caí na água. Era para ser na ilha. A ilha se mexeu.', 'Pouso duro. A areia não é tão macia quanto parece.'];
const paraquedas = {
  id: 'paraquedas', name: 'Paraquedismo em formação', tag: 'Céu da Enseada Cristal · 3 saltos', wide: true, hi: true, paint: true, two: false, dur: 0,
  med: [3000, 5500, 7500], ia: 6000, nota: 'pousou de bumbum no alvo',
  desc: 'Feche a roda na queda livre, abra baixo e pouse no alvo de areia.',
  steps: () => [
    'Na queda livre, as setas movem você no ar. Encoste devagar nos Amiguinhos para dar as mãos e feche a roda com os quatro: quanto mais tempo fechada, mais pontos. Correr rápido demais solta as mãos.',
    `Depois que o grupo se separa, ${actName()} abre o paraquedas. Quanto mais baixo, mais pontos, mas abaixo de 200 m o pouso é duro.`,
    `◀ ▶ guiam o paraquedas contra o vento até o alvo de areia, e ${actName()} logo antes do chão freia para pousar em pé. São 3 saltos.`,
  ],
  hint: () => '',
  gp: 'Controle: analógico ou direcional move no ar e guia o paraquedas · ✕ abre e freia · Start pausa',
  ctl: [['◀ ▶ ▲ ▼', 'mover na queda'], ['◀ ▶', 'guiar o paraquedas'], ['Espaço', 'abrir / frear', 'kb'], ['Abrir', 'abrir / frear', 'touch'], ['Esc', 'pausa', 'kb']],
  pad: { dirs: 'lrud', a: 'Abrir', b: null }, bannerY: 40,
  init() {
    Object.assign(this, { t: 0, score: 0, jump: 0, fx: [], over: false, overT: 0, rodas: 0, rodaT: 0, mosca: 0, empe: 0, aberturas: [], lastPts: 0 });
    this.newJump();
  },
  newJump() {
    const R0 = (a, b) => a + Math.random() * (b - a);
    this.jump++; this.phase = 'livre'; this.pt = 0; this.alt = PQ.alt0; this.jpts = 0; this.ringOn = false; this.ringT = 0; this.linksGot = 0; this.fastT = 0;
    this.P = { x: W / 2, y: H / 2 + 10, vx: 0, vy: 0, linked: true, lead: true };
    this.A = [0, 1, 2].map((i) => { const a = i / 3 * TAU + R0(-.5, .5), d = R0(70, 110); return { x: W / 2 + Math.cos(a) * d * 1.3, y: H / 2 + Math.sin(a) * d * .8, vx: 0, vy: 0, linked: false, hue: [0, 120, 220][i], ph: R0(0, TAU), off: null, k: i, bump: 0 }; });
    this.gust = { t: R0(2, 4), vx: 0, vy: 0, show: 0 }; this.drift = { x: R0(-60, 60), y: R0(-60, 60) };
    this.wind = -(R0(2.5, 4.5)) * (Math.random() < .5 ? 1 : -1); this.gustW = 0;
    this.can = null; this.open = 0; this.flare = 0; this.landed = null;
  },
  hud() { return [['Pontos', nf(this.score)], ['Salto', `${this.jump} de ${PQ.saltos}`], ['Altura', `${Math.max(0, Math.round(this.alt))} m`, this.phase === 'abrir' && this.alt < 500], ['Roda', this.ringOn ? `${this.ringT.toFixed(1)} s` : this.phase === 'livre' ? `${this.links()} de 3` : '—', this.ringOn]]; },
  stats() { return [`${this.rodas} rodas fechadas · ${this.rodaT.toFixed(1)} s de roda`, `Aberturas: ${this.aberturas.map((h) => `${h} m`).join(', ') || '—'}`, `${this.mosca} pousos na mosca · ${this.empe} pousos em pé`]; },
  demo() { this.A.forEach((a, i) => { a.linked = true; a.off = [Math.cos(i / 3 * TAU) * 22, Math.sin(i / 3 * TAU) * 22]; }); this.ringOn = true; },
  links() { return this.A.filter((a) => a.linked).length; },
  add(p, txt, x, y, col = '#fff6d6') { this.score += p; this.jpts += p; pop(`${txt} +${nf(p)}`, x, y, col); },
  update(dt, I) {
    this.t += dt; this.pt += dt;
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < (f.life || .8));
    if (this.over) { this.overT += dt; return this.overT > 1.8; }
    const ix = I.ax || 0, iy = (I.d ? 1 : 0) - (I.u ? 1 : 0) || (Math.abs(I.ay || 0) > .2 ? I.ay : 0);
    if (this.phase === 'livre' || this.phase === 'abrir') this.freefall(dt, ix, iy, I);
    else if (this.phase === 'velame') this.canopy(dt, ix, I);
    else if (this.phase === 'fim') { if (this.pt > 2.4) { if (this.jump >= PQ.saltos) { this.over = true; this.overT = 0; talk(this.mosca ? FALA.pqBoa : FALA.pqRuim, .8); } else this.newJump(); } }
    return false;
  },
  // ---------- 1 e 2: queda livre (vista de cima)
  freefall(dt, ix, iy, I) {
    const P = this.P, live = this.phase === 'livre';
    this.alt -= (live ? PQ.vff : PQ.vfree) * dt;
    // o jogador: setas aceleram, o ar segura (embalo)
    P.vx += ix * 300 * dt - P.vx * 1.6 * dt; P.vy += iy * 300 * dt - P.vy * 1.6 * dt;
    // rajadas: empurram o grupo de uma vez (vêm com linhas de vento)
    const G = this.gust; G.t -= dt;
    if (G.t <= 0 && live) { const a = Math.random() * TAU, f = 95 + Math.random() * 60; G.vx = Math.cos(a) * f; G.vy = Math.sin(a) * f * .6; G.show = .9; G.t = 2.6 + Math.random() * 2.2; }
    if (G.show > 0) { G.show -= dt; P.vx += G.vx * dt * 1.6; P.vy += G.vy * dt * 1.6; }
    P.x += P.vx * dt; P.y += P.vy * dt; P.x = clamp(P.x, 30, W - 30); P.y = clamp(P.y, 34, H - 26);
    this.drift.x += P.vx * dt * .15; this.drift.y += P.vy * dt * .15;
    for (const a of this.A) {
      if (a.linked) {
        // de mãos dadas: segue o jogador (na roda, todos giram devagar em volta do centro)
        const spin = this.ringOn ? this.t * .6 : 0, c = Math.cos(spin), s = Math.sin(spin), ox = a.off[0] * c - a.off[1] * s, oy = a.off[0] * s + a.off[1] * c;
        const tx = P.x + ox, ty = P.y + oy; a.vx = (tx - a.x) * 10; a.vy = (ty - a.y) * 10; a.x += a.vx * dt; a.y += a.vy * dt;
      } else {
        // solto: passeia no ar e se aproxima devagar do grupo; depois da separação, se afasta
        a.ph += dt; const dx = P.x - a.x, dy = P.y - a.y, d = Math.hypot(dx, dy) || 1, pull = live ? (d > 70 ? 9 : 2) : -60;
        a.vx += (Math.sin(a.ph * 1.3 + a.k) * 60 + Math.sin(a.ph * 3.1 + a.k * 5) * 30 + dx / d * pull - a.vx * 1.2) * dt; a.vy += (Math.cos(a.ph * 1.1 + a.k * 2) * 45 + dy / d * pull - a.vy * 1.2) * dt;
        if (G.show > 0 && live) { a.vx += G.vx * dt * .8; a.vy += G.vy * dt * .8; }
        a.x += a.vx * dt; a.y += a.vy * dt; if (live) { a.x = clamp(a.x, 16, W - 16); a.y = clamp(a.y, 30, H - 14); }
        a.bump = Math.max(0, a.bump - dt);
        // encostar: devagar dá as mãos; rápido, esbarra
        if (live && !a.bump) for (const m of [P, ...this.A.filter((q) => q.linked)]) {
          const ddx = a.x - m.x, ddy = a.y - m.y, dd = Math.hypot(ddx, ddy);
          if (dd < PQ.link) {
            const rel = Math.hypot(a.vx - P.vx, a.vy - P.vy);
            if (rel < 60) { a.linked = true; this.linksGot++; this.setOffsets(); this.add(100, 'Deu a mão', a.x, a.y - 12, '#bfefff'); beep(700 + this.links() * 120, .07, 'square', .04, 100); }
            else { a.vx += ddx / dd * 90; a.vy += ddy / dd * 90; a.bump = .6; pop('Rápido demais!', a.x, a.y - 12, '#ffb3c8'); beep(160, .06, 'triangle', .04, -40); }
            break;
          }
        }
      }
    }
    // correr rápido demais com o grupo solta uma mão
    const sp = Math.hypot(P.vx, P.vy), any = this.links() > 0;
    this.fastT = live && any && sp > 80 ? this.fastT + dt : 0;
    if (this.fastT > .35) { const out = this.A.filter((a) => a.linked).pop(); out.linked = false; out.bump = 1; out.vx = (out.x - P.x) * 3; out.vy = (out.y - P.y) * 3; this.fastT = 0; this.setOffsets(); pop('Soltou a mão!', out.x, out.y - 12, '#ffb3c8'); sfx.whiff(); talk(FALA.pqRuim, .2); }
    // roda fechada
    const full = this.links() === 3;
    if (full && !this.ringOn) { this.ringOn = true; this.rodas++; this.add(500, 'Roda fechada!', P.x, P.y - 34, '#ffd166'); sfx.big(); talk(FALA.pqBoa, .3); this.ringAcc = 0; }
    if (!full && this.ringOn) this.ringOn = false;
    if (this.ringOn) { this.ringT += dt; this.rodaT += dt; this.ringAcc += dt; if (this.ringAcc >= 1) { this.ringAcc -= 1; this.add(100, 'Roda', P.x + 30, P.y - 20, '#ffd166'); } }
    // separação aos 1.500 m: todos soltam e se afastam
    if (live && this.alt <= PQ.sep) {
      this.phase = 'abrir'; this.pt = 0; this.ringOn = false; pop('Separar!', W / 2, 60, '#fff6d6', true); beep(880, .15, 'square', .04, -200);
      for (const a of this.A) { a.linked = false; const dx = a.x - P.x, dy = a.y - P.y, d = Math.hypot(dx, dy) || 1; a.vx = dx / d * 70; a.vy = dy / d * 70; a.open = PQ.sep - 300 - Math.random() * 300; }
    }
    if (this.phase === 'abrir') {
      for (const a of this.A) if (!a.chute && this.alt < a.open) a.chute = this.t;
      if (I.pa || this.alt <= PQ.auto) this.openChute(this.alt <= PQ.auto);
    }
  },
  setOffsets() {
    const L = this.A.filter((a) => a.linked);
    if (L.length === 3) L.forEach((a, i) => { const ang = (i + 1) / 4 * TAU + Math.PI / 2; a.off = [Math.cos(ang) * PQ.ring * 1.2, Math.sin(ang) * PQ.ring]; });
    else L.forEach((a, i) => { a.off = [(i % 2 ? -1 : 1) * (PQ.link + 2) * (1 + Math.floor(i / 2)), (i ? 6 : -6)]; });
    if (L.length === 3) { const ang = Math.PI / 2; this.P.ringOff = [Math.cos(ang) * PQ.ring * 1.2, Math.sin(ang) * PQ.ring]; }
  },
  openChute(auto) {
    const h = Math.max(0, Math.round(this.alt)); this.aberturas.push(h);
    let p = 0, txt;
    if (auto) { txt = 'Reserva abriu sozinho'; this.hard = true; }
    else if (h > 1000) { p = 50; txt = 'Abriu alto'; this.hard = false; }
    else if (h >= PQ.low) { p = Math.round((100 + (1000 - h) * .6) / 10) * 10; txt = 'Abriu'; this.hard = false; }
    else { p = 650; txt = 'Abriu baixo demais!'; this.hard = true; }
    if (p) this.add(p, `${txt} a ${h} m`, W / 2, 70, h < PQ.low ? '#ffb3c8' : '#bfefff'); else pop(txt, W / 2, 70, '#ffb3c8', true);
    beep(300, .3, 'triangle', .05, 200);
    // pouso: começa do lado de cá ou de lá do alvo; abrir baixo deixa menos tempo para guiar
    const T = clamp(h / 45, 5.5, 20), side = Math.random() < .5 ? -1 : 1, off = side * (30 + Math.random() * 45) + clamp(this.drift.x * .3, -25, 25);
    this.can = { x: off, a: PQ.gaH, vx: 0, steer: 0, T, rate: PQ.gaH / T, h, sw: 0 };
    this.phase = 'velame'; this.pt = 0; this.flare = 0;
  },
  // ---------- 3: pouso (vista de lado)
  canopy(dt, ix, I) {
    const c = this.can;
    this.gustW += ((Math.sin(this.t * .7) + Math.sin(this.t * 1.9)) * .8 - this.gustW) * dt;
    c.steer += clamp(ix - c.steer, -2.2 * dt, 2.2 * dt);
    const wind = this.wind + this.gustW, flaring = this.flare > 0;
    c.vx = wind + c.steer * PQ.ar * (flaring ? .35 : 1);
    c.x += c.vx * dt; c.sw += (c.steer * .5 - c.sw) * dt * 3;
    const desc = flaring ? c.rate * .35 : c.rate; c.a -= desc * dt; this.alt = c.a / PQ.gaH * c.h;
    if (I.pa && !this.flare && c.a > 0) { this.flare = .9; this.flareA = c.a; beep(500, .12, 'triangle', .04, -200); }
    if (this.flare > 0) this.flare -= dt;
    if (c.a <= 0) this.touchdown();
  },
  touchdown() {
    const c = this.can, d = Math.abs(c.x), soft = !this.hard && this.flareA !== undefined && this.flareA <= 6 && this.flareA >= .8;
    let p = 0, txt;
    if (d < 1.2) { p = 800; txt = 'Na mosca!'; this.mosca++; }
    else if (d < 3.5) { p = 500; txt = 'No alvo'; }
    else if (d < 7) { p = 300; txt = 'Perto do alvo'; }
    else if (d < 22) { p = 120; txt = 'Na areia'; }
    else { txt = 'Na água!'; }
    const water = d >= 22;
    this.landed = { x: c.x, soft: soft && !water, water, t: this.t };
    if (p) this.add(p, txt, W / 2, 60, d < 3.5 ? '#ffd166' : '#bfefff'); else pop(txt, W / 2, 60, '#ffb3c8', true);
    if (!water) { if (soft) { this.add(300, 'Pousou em pé', W / 2, 80, '#ffd166'); this.empe++; sfx.big(); } else { pop('Pouso duro', W / 2, 80, '#ffb3c8'); sfx.crash(); } }
    else { sfx.whiff(); this.fx.push({ k: 'splash', x: c.x, t: 0, life: 1.2 }); }
    talk(d < 3.5 && soft ? FALA.pqBoa : FALA.pqRuim, .35);
    this.flareA = undefined; this.phase = 'fim'; this.pt = 0;
  },
  // ---------- desenho (provisório)
  draw(tt) { if (this.phase === 'velame' || this.phase === 'fim') this.drawSide(tt); else this.drawTop(tt); },
  drawTop(tt) {
    // o chão lá embaixo, visto de cima: mar transparente, ilhotas e veleiros; cresce conforme a altura cai
    const k = 140 / Math.max(this.alt, 60), cx = W / 2 - this.drift.x * k * 3, cy = H / 2 - this.drift.y * k * 3;
    const sea = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 260); sea.addColorStop(0, '#5fe0d6'); sea.addColorStop(1, '#2a8fb8'); ctx.fillStyle = sea; ctx.fillRect(0, 0, W, H);
    for (const [ix, iy, r, main] of [[0, 0, 60, true], [-260, 140, 40], [300, -120, 55], [180, 260, 30], [-340, -220, 70], [520, 200, 45]]) {
      const x = cx + ix * k, y = cy + iy * k, rr = r * k; if (x < -rr - 10 || x > W + rr + 10 || y < -rr - 10 || y > H + rr + 10) continue;
      ctx.fillStyle = 'rgba(160,240,230,.6)'; ctx.beginPath(); ctx.arc(x, y, rr * 1.35, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f3dfa6'; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
      if (!main) { ctx.fillStyle = '#6fbf5a'; ctx.beginPath(); ctx.arc(x + rr * .2, y - rr * .1, rr * .55, 0, TAU); ctx.fill(); }
      else for (let i = 3; i >= 1; i--) { ctx.fillStyle = i % 2 ? '#ffffff' : '#e8484a'; ctx.beginPath(); ctx.arc(x, y, Math.max(.8, i * 2.2 * k), 0, TAU); ctx.fill(); }
    }
    for (let i = 0; i < 5; i++) { const x = cx + (-200 + i * 110 + this.t * 3) * k, y = cy + (90 + (i % 2) * 60) * k; R(x - 1, y - 1, 2 + 3 * k, 1 + k, '#ffffff'); }
    // camada de nuvens perto dos 2.500 m
    const cl = 1 - Math.min(1, Math.abs(this.alt - 2500) / 350);
    if (cl > 0) { ctx.fillStyle = `rgba(255,255,255,${cl * .8})`; ctx.fillRect(0, 0, W, H); }
    // linhas de vento subindo (sensação de queda) e da rajada
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
    for (let i = 0; i < 16; i++) { const x = (i * 53 + Math.sin(i) * 20) % W, y = H - ((tt * 520 + i * 47) % (H + 40)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 14); ctx.stroke(); }
    const G = this.gust; if (G.show > 0) { ctx.strokeStyle = `rgba(255,255,255,${G.show * .7})`; ctx.lineWidth = 1.4; const n = Math.hypot(G.vx, G.vy), ux = G.vx / n, uy = G.vy / n; for (let i = 0; i < 9; i++) { const ox = W / 2 + (i - 4) * 30 * -uy, oy = H / 2 + (i - 4) * 30 * ux, s = ((tt * 300 + i * 40) % 260) - 130; ctx.beginPath(); ctx.moveTo(ox + ux * s, oy + uy * s); ctx.lineTo(ox + ux * (s + 26), oy + uy * (s + 26)); ctx.stroke(); } }
    // mãos dadas e os paraquedistas
    const P = this.P, L = this.A.filter((a) => a.linked);
    if (L.length) { ctx.strokeStyle = this.ringOn ? '#ffd166' : '#fff6d6'; ctx.lineWidth = 1.5; ctx.beginPath(); if (this.ringOn) { const all = [P, ...L].sort((a, b) => Math.atan2(a.y - P.y - 0, a.x - P.x) - Math.atan2(b.y - P.y, b.x - P.x)); const c = this.ringCenter(); all.sort((a, b) => Math.atan2(a.y - c[1], a.x - c[0]) - Math.atan2(b.y - c[1], b.x - c[0])); all.forEach((m, i) => (i ? ctx.lineTo(m.x, m.y) : ctx.moveTo(m.x, m.y))); ctx.closePath(); } else for (const a of L) { ctx.moveTo(P.x, P.y); ctx.lineTo(a.x, a.y); } ctx.stroke(); }
    const c = this.ringOn ? this.ringCenter() : null;
    for (const a of this.A) this.drawFaller(a, 'bl', c, tt);
    this.drawFaller(P, 'ia', c, tt);
    // altímetro
    this.altimeter();
    if (this.phase === 'abrir') for (const a of this.A) if (a.chute) { const s = Math.min(1, (this.t - a.chute) * 2); ctx.fillStyle = ['#ff6b6b', '#6bcbff', '#9be37a'][a.k]; ctx.globalAlpha = .9; ctx.beginPath(); ctx.ellipse(a.x, a.y, 14 * s, 9 * s, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  },
  ringCenter() { const L = [this.P, ...this.A.filter((a) => a.linked)]; return [L.reduce((s, m) => s + m.x, 0) / L.length, L.reduce((s, m) => s + m.y, 0) / L.length]; },
  drawFaller(m, who, center, tt) {
    const fr = window.__fr && window.__fr[who];
    const ang = center ? Math.atan2(center[1] - m.y, center[0] - m.x) : Math.atan2(-(m.vy || 0) - 40, (m.vx || 0)) * .2 - Math.PI / 2 + Math.PI / 2;
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(center ? ang : Math.sin(tt * 2 + (m.k || 0)) * .2);
    ctx.fillStyle = 'rgba(0,30,50,.18)'; ctx.beginPath(); ctx.ellipse(6, 8, 13, 5, 0, 0, TAU); ctx.fill();
    ctx.scale(.5, .5); ctx.translate(-4, 22);
    if (who === 'bl' && m.hue) ctx.filter = `hue-rotate(${m.hue}deg)`;
    try { if (fr) fr('dive', 11, 'g', m.linked || m === this.P ? 2 : 5, false); } catch { /* carregando */ }
    ctx.filter = 'none'; ctx.restore();
  },
  altimeter() {
    const x = 8, y = 34, h = 150, top = PQ.alt0; R(x - 1, y - 1, 10, h + 2, NAVY); R(x, y, 8, h, '#2d3350');
    const yy = (m) => y + h * (1 - m / top);
    R(x, yy(1000), 8, yy(PQ.low) - yy(1000), '#3fae6a'); R(x, yy(PQ.low), 8, yy(0) - yy(PQ.low), '#d0504a'); R(x, yy(PQ.sep) - .5, 8, 1, '#ffffff');
    const a = clamp(this.alt, 0, top); R(x - 3, yy(a) - 1, 14, 2, '#ffd166');
    ctx.fillStyle = '#fff6d6'; ctx.font = 'bold 8px sans-serif'; ctx.fillText(`${Math.max(0, Math.round(this.alt))} m`, x + 13, yy(a) + 3);
  },
  drawSide(tt) {
    const c = this.can, S = 4, camX = c.x, cam = clamp(c.a - 30, 0, 100), gy = H - 30 + cam * S * .0;
    const X = (x) => W / 2 + (x - camX) * S, Y = (a) => H - 34 - (a - cam) * S;
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#8fd6f2'); sky.addColorStop(1, '#d8f4f2'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) { const x = ((i * 97 - camX * 1.2) % (W + 120) + W + 120) % (W + 120) - 60, y = 26 + (i % 3) * 18; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(x, y, 26, 7, 0, 0, TAU); ctx.fill(); }
    const g0 = Y(0);
    // mar transparente, ilhota com o alvo, biruta mostrando o vento
    const sea = ctx.createLinearGradient(0, g0, 0, H); sea.addColorStop(0, '#5fe0d6'); sea.addColorStop(1, '#2a8fb8'); ctx.fillStyle = sea; ctx.fillRect(0, g0, W, H - g0 + 4);
    for (let i = 0; i < 12; i++) { const x = ((i * 61 - camX * S * .9 + tt * 10) % (W + 40) + W + 40) % (W + 40) - 20; R(x, g0 + 3 + (i % 3) * 5, 10, 1, 'rgba(255,255,255,.6)'); }
    ctx.fillStyle = '#f3dfa6'; ctx.beginPath(); ctx.ellipse(X(0), g0 + 2, 22 * S, 6, 0, Math.PI, 0); ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = .8; ctx.stroke();
    for (const [r, col] of [[7, '#ffffff'], [3.5, '#e8484a'], [1.2, '#ffffff']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(X(0), g0 - .5, r * S, 1.6, 0, 0, TAU); ctx.fill(); }
    const bx = X(-14); R(bx, g0 - 26, 1.4, 26, '#666'); const wd = this.wind + this.gustW, wl = clamp(Math.abs(wd) / 5, .3, 1); ctx.fillStyle = '#f08a2a'; ctx.beginPath(); ctx.moveTo(bx + .7, g0 - 26); ctx.lineTo(bx + .7 + Math.sign(wd) * 14 * wl, g0 - 23 + Math.sin(tt * 6)); ctx.lineTo(bx + .7, g0 - 20); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; for (let i = 0; i < 10; i++) { const y = 30 + i * 17, x = ((i * 71 + tt * wd * 40) % W + W) % W; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sign(wd) * 12, y); ctx.stroke(); }
    // seta para o alvo, quando ele está fora da tela
    const tx = X(0); if (tx < 10 || tx > W - 10) { const s = tx < 10 ? -1 : 1, ax = s < 0 ? 14 : W - 14; ctx.fillStyle = '#ffd166'; ctx.strokeStyle = NAVY; ctx.beginPath(); ctx.moveTo(ax + s * 8, H - 50); ctx.lineTo(ax - s * 4, H - 57); ctx.lineTo(ax - s * 4, H - 43); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff6d6'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`${Math.round(Math.abs(c.x))} m`, ax - s * 2, H - 62); ctx.textAlign = 'left'; }
    // paraquedista e o velame
    const L = this.landed, px = X(c.x), py = Y(Math.max(0, c.a));
    if (L && L.water) { for (const f of this.fx) if (f.k === 'splash') { const k = f.t / 1.2; ctx.fillStyle = `rgba(255,255,255,${1 - k})`; for (let i = 0; i < 8; i++) R(px + (i - 4) * 4, g0 - 4 - Math.sin(i) * 10 * (1 - k) - k * 6, 2, 2, ctx.fillStyle); } }
    const fr = window.__fr && window.__fr.ia, landedT = L ? this.t - L.t : 0;
    if (!L) {
      ctx.save(); ctx.translate(px, py - 62); ctx.rotate(c.sw * .25); ctx.scale(1.9, 1.7);
      ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.moveTo(-26, 4); ctx.quadraticCurveTo(0, -14, 26, 4); ctx.quadraticCurveTo(0, -2, -26, 4); ctx.fill();
      for (let i = 0; i < 5; i++) { ctx.fillStyle = ['#ff6b6b', '#ffd166', '#6bcbff', '#9be37a', '#ff9ac4'][i]; ctx.beginPath(); const x0 = -26 + i * 10.4, x1 = x0 + 10.4; ctx.moveTo(x0, 4 - Math.sin((x0 + 26) / 52 * Math.PI) * 12); ctx.lineTo(x1, 4 - Math.sin((x1 + 26) / 52 * Math.PI) * 12); ctx.lineTo(x1, 4 - Math.sin((x1 + 26) / 52 * Math.PI) * 8); ctx.lineTo(x0, 4 - Math.sin((x0 + 26) / 52 * Math.PI) * 8); ctx.fill(); }
      ctx.strokeStyle = NAVY; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(-26, 4); ctx.quadraticCurveTo(0, -14, 26, 4); ctx.stroke();
      ctx.strokeStyle = 'rgba(40,40,60,.7)'; ctx.lineWidth = .5; for (const x of [-24, -10, 10, 24]) { ctx.beginPath(); ctx.moveTo(x, 4 - (Math.abs(x) < 12 ? 7 : 2)); ctx.lineTo(x * .12, 30); ctx.stroke(); }
      ctx.restore();
    }
    ctx.save(); ctx.translate(px, py);
    let an = 'jump', k = 10, ex = this.flare > 0 ? 5 : 0;
    if (L) { if (L.water) { an = 'sad'; k = Math.min(15, Math.floor(landedT * 10)); ctx.translate(0, 10); } else if (L.soft) { an = 'party'; k = Math.min(15, Math.floor(landedT * 10)); ex = 2; } else { an = 'dive'; k = Math.min(31, 20 + Math.floor(landedT * 10)); } }
    else if (this.flare > 0) { an = 'jump'; k = 16; }
    try { if (fr) fr(an, k, 'g', ex, c.vx < -.5 && !L); } catch { /* carregando */ }
    ctx.restore();
    this.altimeter();
  },
};
