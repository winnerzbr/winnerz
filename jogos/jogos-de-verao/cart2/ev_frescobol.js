/* ============================================================ prova nova: Frescobol (30/10/2026)
   Cooperativo: as duas raquetes jogam juntas contra o recorde. ◀ ▶ andam, ✕ rebate. No tempo certo a batida sai
   forte e reta e vale mais; cedo ou tarde, sai alta e lenta. ○ (ou ↑ + ✕) é a pancada: mais rápida, vale o dobro,
   mas é mais difícil de devolver. A bolinha acelera a cada troca. 60 segundos e 3 bolinhas; a sequência zera quando cai.
   Sozinho: o parceiro é um Amiguinho, que devolve bem as bolas certas e erra mais quando recebe pancada atrás de pancada.
   Em duas pessoas (no computador): Jogador 1 com A D, F rebate, W + F pancada; Jogador 2 com ◀ ▶, Enter rebate, ↑ + Enter pancada.
   Arte provisória: os personagens são os desenhos pintados do vôlei; a praia e a raquete são desenhadas pelo jogo. */
const FB = { g: 300, reach: 17, sw: .26, hitT: .13, win: .1, minX: [34, 222], maxX: [178, 366], spd: 128 };
const FB_TXT = { certa: 'Batida certa', lob: 'Bola alta', pancada: 'Pancada!' };
if (typeof Music !== 'undefined' && Music.songs.embaixadinha) Music.songs.frescobol = Music.songs.embaixadinha;
FALA.intro.frescobol = [
  'Frescobol: ninguém ganha, ninguém perde, todo mundo sai com o braço doendo kkkk',
  'O segredo é bater no tempo certo. E não dar pancada no parceiro toda hora. Ele é sensível.',
  'Três bolinhas, um minuto. Bora fazer a maior sequência da praia.',
];
FALA.fbCaiu = ['Caiu! A bolinha queria conhecer a areia.', 'Ih, foi pro guarda-sol do vizinho kkkk', 'Pancada demais, parceria de menos.'];
FALA.fbBom = ['Que sequência! A praia inteira parou pra ver.', 'Isso aqui é frescobol de campeonato, hein.'];
const frescobol = {
  id: 'frescobol', name: 'Frescobol', tag: 'Praia Lotada · 60 segundos', wide: true, hi: true, paint: true, dur: 60, med: [900, 1900, 3200], ia: 2100, nota: 'o Amiguinho ficou olhando o sorvete',
  desc: 'Em dupla contra o recorde: rebata no tempo certo e não deixe a bolinha cair.',
  steps: () => ['◀ ▶ para chegar na bolinha.', `${actName()} rebate: no tempo certo sai forte e reta e vale mais.`, `${touch ? 'Pancada' : 'X (ou ↑ + Espaço)'} é a pancada: vale o dobro, mas o parceiro erra mais. São 3 bolinhas em 60 segundos.`],
  hint: () => '',
  gp: 'Controle: analógico ou direcional anda · ✕ rebate · ○ pancada · Start pausa',
  ctl: [['◀ ▶', 'andar'], ['Espaço', 'rebater', 'kb'], ['X', 'pancada (ou ↑ + Espaço)', 'kb'], ['Rebater', 'rebater', 'touch'], ['Pancada', 'pancada', 'touch'], ['Esc', 'pausa', 'kb']],
  pad: { dirs: 'lr', a: 'Rebater', b: 'Pancada' }, bannerY: 60,
  two: false,
  init() {
    const gy = H - 22;
    Object.assign(this, {
      t: 0, left: this.dur, score: 0, vidas: 3, trocas: 0, best: 0, certas: 0, pancadas: 0, seguidas: 0, cheer: 0,
      gy, P: [this.newP(96, 1), this.newP(304, -1)], b: null, wait: .9, last: -1, fx: [], spd: 1, over: false, flash: 0, k2: {},
    });
    this.serve();
  },
  newP(x, f) { return { x, vx: 0, f, sw: null, ph: 0, ex: 0, exT: 0, ai: { tx: x, plan: null, t: 0, miss: false } }; },
  demo() { this.b = { x: 200, y: this.gy - 70, vx: 140, vy: -40, r: 3, live: true, by: 0 }; this.P[0].sw = { t: .14, hit: true, kind: 'certa' }; },
  serve() { const p = this.P[0]; this.b = { x: p.x + 24, y: this.gy - 56, vx: 0, vy: 0, r: 3, live: false, by: 0 }; this.wait = .9; this.last = -1; this.spd = 1; this.trocas = 0; this.seguidas = 0; },
  hud() { return [['Pontos', nf(this.score)], ['Trocas', String(this.trocas)], ['Bolinhas', String(this.vidas)], ['Tempo', `${Math.ceil(this.left)} s`, this.left < 10]]; },
  stats() { return [`Maior sequência: ${this.best} trocas`, `${this.certas} batidas certas · ${this.pancadas} pancadas`, `${3 - this.vidas} bolinhas caíram`]; },
  // ponto onde a raquete encontra a bola, conforme o andamento do giro (0 → 1)
  racket(p, q) {
    const ph = (-10 + 160 * q) * Math.PI / 180, sx = p.x + p.f * 7, sy = this.gy - 30;
    return { x: sx + p.f * Math.sin(ph) * 21, y: sy - Math.cos(ph) * 21, ph };
  },
  controls(I) {
    if (!this.two) {
      const c0 = { ax: I.ax || ((I.r ? 1 : 0) - (I.l ? 1 : 0)), hit: I.pa || I.pb, hard: I.pb || ((I.pa) && I.u) };
      return [c0, null];
    }
    const k = (c) => !!codeHeld[c], e = (c) => { const v = k(c), was = this.k2[c]; this.k2[c] = v; return v && !was; };
    const f = e('KeyF'), en = e('Enter') || e('NumpadEnter');
    return [{ ax: (k('KeyD') ? 1 : 0) - (k('KeyA') ? 1 : 0), hit: f, hard: f && k('KeyW') }, { ax: (k('ArrowRight') ? 1 : 0) - (k('ArrowLeft') ? 1 : 0), hit: en, hard: en && k('ArrowUp') }];
  },
  update(dt, I) {
    this.t += dt; this.cheer = Math.max(0, this.cheer - dt); this.flash = Math.max(0, this.flash - dt);
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < .6);
    if (this.over) { this.overT += dt; return this.overT > 1.4; }
    this.left = Math.max(0, this.left - dt);
    const [c0, c1x] = this.controls(I), c1 = c1x || this.brain(dt);
    [c0, c1].forEach((c, i) => {
      const p = this.P[i];
      const target = clamp(c.ax || 0, -1, 1) * FB.spd, dv = target - p.vx, acc = Math.abs(target) > Math.abs(p.vx) ? 900 : 1400;
      p.vx += Math.sign(dv) * Math.min(Math.abs(dv), acc * dt); p.x += p.vx * dt;
      const x0 = p.x; p.x = clamp(p.x, FB.minX[i], FB.maxX[i]); if (p.x !== x0) p.vx = 0;
      p.ph += Math.abs(p.vx) * dt * .11; p.exT = Math.max(0, p.exT - dt); if (!p.exT) p.ex = 0;
      if (c.hit && !p.sw) p.sw = { t: 0, hit: false, kind: c.hard ? 'pancada' : null };
      if (p.sw) { p.sw.t += dt; if (p.sw.t > FB.sw) p.sw = null; }
    });
    const b = this.b, g = FB.g;
    if (!b.live) {
      // saque: a bolinha sobe da mão do IAmiguinho; quem rebate é o IAmiguinho
      const p = this.P[0]; this.wait -= dt;
      if (this.wait > 0) { b.x = p.x + 24; b.y = this.gy - 56; }
      else if (this.wait > -.05) { b.live = true; b.vx = 0; b.vy = -150; b.toss = true; }
    } else {
      b.vy += g * dt * this.spd * this.spd; b.x += b.vx * dt; b.y += b.vy * dt;
      for (let i = 0; i < 2; i++) this.tryHit(i);
      if (b.y >= this.gy - b.r || b.x < -10 || b.x > W + 10) this.drop();
    }
    if (this.left <= 0 || this.vidas <= 0) { this.over = true; this.overT = 0; if (this.best >= 25) talk(FALA.fbBom, .8); }
    return false;
  },
  tryHit(i) {
    const p = this.P[i], b = this.b;
    if (!p.sw || p.sw.hit || this.last === i && !b.toss) return;
    if (!b.toss && b.vx * p.f > 0) return; // a bolinha tem que estar vindo
    const q = p.sw.t / FB.sw;
    const R = this.racket(p, q), d = Math.hypot(b.x - R.x, b.y - R.y);
    if (d > FB.reach) return;
    // no tempo certo (até 0,045 s de diferença) e com a bola no meio da raquete: batida certa; senão, sai alta e lenta
    const dtq = Math.abs(p.sw.t - FB.hitT); if (dtq > FB.win) return;
    const kind = p.sw.kind || (dtq < .045 && d < 11 ? 'certa' : 'lob');
    p.sw.hit = true; p.sw.kind = kind; b.toss = false;
    const o = this.P[1 - i];
    // para onde vai: o ponto de rebater do parceiro, com um desvio maior quando a batida não saiu boa
    const err = kind === 'certa' ? 8 : kind === 'pancada' ? 14 : 24;
    const M = this.racket({ x: 0, f: 1 }, FB.hitT / FB.sw), tx = clamp(o.x + rand(-1, 1) * err, FB.minX[1 - i] + 6, FB.maxX[1 - i] - 6) + o.f * M.x, ty = M.y + rand(-3, 3);
    const v = (kind === 'pancada' ? 245 : kind === 'certa' ? 158 : 96) * this.spd, dx = tx - b.x, T = Math.max(.35, Math.abs(dx) / v);
    const gg = FB.g * this.spd * this.spd;
    b.vx = dx / T; b.vy = (ty - b.y - .5 * gg * T * T) / T;
    this.last = i; this.trocas++; this.best = Math.max(this.best, this.trocas);
    this.spd = Math.min(1.75, 1 + this.trocas * .03);
    this.seguidas = kind === 'pancada' ? this.seguidas + 1 : 0;
    const mult = 1 + Math.floor(this.trocas / 10) * .5, base = kind === 'pancada' ? 100 : kind === 'certa' ? 50 : 20;
    const pts = Math.round(base * mult); this.score += pts;
    if (kind === 'certa') this.certas++; if (kind === 'pancada') this.pancadas++;
    p.ex = kind === 'lob' ? 0 : 2; p.exT = .5;
    this.fx.push({ x: b.x, y: b.y, t: 0, k: kind });
    if (kind !== 'lob') pop(`${FB_TXT[kind]} +${pts}`, b.x, b.y - 18, kind === 'pancada' ? '#ffd04a' : '#ffffff');
    if (this.trocas % 10 === 0) { pop(`${this.trocas} trocas! ×${mult + .5}`, W / 2, 40, '#bfefff', true); this.cheer = 1.2; sfx.point(); }
    if (i === 0 || this.two) beep(kind === 'pancada' ? 260 : kind === 'certa' ? 520 : 380, .06, 'square', .045, kind === 'pancada' ? -80 : 120);
    else beep(440, .05, 'triangle', .035, 60);
  },
  drop() {
    this.vidas--; this.flash = .6; this.fx.push({ x: clamp(this.b.x, 6, W - 6), y: this.gy, t: 0, k: 'areia' }); sfx.whiff(); talk(FALA.fbCaiu, .5);
    if (this.vidas > 0) { failMsg(this.trocas >= 10 ? `Caiu depois de ${this.trocas} trocas` : 'Caiu!'); this.serve(); }
    else { this.b.live = false; this.b.y = -50; }
  },
  // o parceiro (Amiguinho): vai para onde a bolinha vai chegar e bate na hora; erra mais com pancada atrás de pancada e bola rápida
  brain(dt) {
    const p = this.P[1], b = this.b, A = p.ai, out = { ax: 0, hit: false, hard: false };
    const coming = b.live && !b.toss && this.last === 0 && b.vx > 0;
    if (!coming) { A.plan = null; const home = 300; if (Math.abs(home - p.x) > 10) out.ax = clamp((home - p.x) / 30, -.6, .6); return out; }
    if (!A.plan) {
      const risk = .02 + (this.spd - 1) * .16 + Math.max(0, this.seguidas - 1) * .2 + (this.seguidas >= 1 ? .06 : 0);
      A.plan = { miss: Math.random() < risk, err: rand(-1, 1) * (3 + (this.spd - 1) * 10) };
    }
    // onde a bolinha passa na altura do ponto de rebater (no meio do giro)
    const R0 = this.racket({ x: 0, f: -1 }, FB.hitT / FB.sw), c = { ...b }, gg = FB.g * this.spd * this.spd; let tHit = null, xHit = c.x;
    for (let t = 0; t < 2.5; t += DT) {
      c.vy += gg * DT; c.x += c.vx * DT; c.y += c.vy * DT;
      if (c.vy > 0 && c.y >= R0.y) { tHit = t; xHit = c.x; break; }
      if (c.x > FB.maxX[1] + 16) { tHit = t; xHit = c.x; break; }
    }
    if (tHit === null) return out;
    const stand = xHit - R0.x + A.plan.err;
    const dx = stand - p.x; if (Math.abs(dx) > 2) out.ax = clamp(dx / 10, -1, 1);
    const swingAt = FB.hitT + (A.plan.miss ? rand(.07, .14) : 0);
    if (!p.sw && tHit <= swingAt && tHit > swingAt - .04) out.hit = true;
    return out;
  },
  // ---------- desenho: praia de domingo (provisória, desenhada pelo jogo) e os personagens pintados do vôlei
  drawBeach(tt) {
    const gy = this.gy, hz = 112;
    const sky = ctx.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, '#6fb6f2'); sky.addColorStop(1, '#cfe9fb'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hz);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; for (const [x, y, s] of [[60, 30, 1], [250, 22, 1.3], [350, 46, .8]]) { ctx.beginPath(); ctx.ellipse(x + Math.sin(tt * .05 + x) * 6, y, 22 * s, 7 * s, 0, 0, TAU); ctx.ellipse(x + 12 * s, y - 5 * s, 14 * s, 7 * s, 0, 0, TAU); ctx.fill(); }
    const sea = ctx.createLinearGradient(0, hz, 0, hz + 30); sea.addColorStop(0, '#2f8fc9'); sea.addColorStop(1, '#58c3d9'); ctx.fillStyle = sea; ctx.fillRect(0, hz, W, 30);
    for (let i = 0; i < 14; i++) R(((i * 61 + tt * 9) % (W + 40)) - 20, hz + 6 + (i % 4) * 6, 14, 1, 'rgba(255,255,255,.55)');
    ctx.fillStyle = '#f7f1d8'; ctx.fillRect(0, hz + 28, W, 4);
    const sand = ctx.createLinearGradient(0, hz + 30, 0, H); sand.addColorStop(0, '#f3d79c'); sand.addColorStop(1, '#e2b56f'); ctx.fillStyle = sand; ctx.fillRect(0, hz + 31, W, H - hz - 31);
    // guarda-sóis até o horizonte (domingo de praia lotada)
    const cols = ['#e8473f', '#ffd03a', '#2f7fe0', '#ffffff', '#3cbf7a', '#ff8a2a', '#c45bd6'];
    for (let i = 0; i < 18; i++) {
      const x = 10 + i * 23 + (i % 2) * 7, y = hz + 40 + (i % 3) * 5, s = .55 + (i % 3) * .1;
      R(x, y - 12 * s, 1, 12 * s, '#7a5a40');
      ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.ellipse(x + .5, y - 12 * s, 13 * s, 6 * s, 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = cols[(i + 3) % cols.length]; ctx.beginPath(); ctx.moveTo(x + .5, y - 18 * s); ctx.lineTo(x - 4 * s, y - 12 * s); ctx.lineTo(x + 5 * s, y - 12 * s); ctx.fill();
      ctx.strokeStyle = NAVY; ctx.lineWidth = .6; ctx.beginPath(); ctx.ellipse(x + .5, y - 12 * s, 13 * s, 6 * s, 0, Math.PI, TAU); ctx.stroke();
      if (i % 3 === 0) R(x - 9 * s, y + 2, 14 * s, 3 * s, cols[(i + 5) % cols.length]);
    }
    // areia molhada onde se joga (perto da água): um pouco mais escura, com marcas de pé
    ctx.fillStyle = 'rgba(160,110,60,.12)'; ctx.fillRect(0, gy - 20, W, 30);
    for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(120,80,40,.18)'; ctx.beginPath(); ctx.ellipse((i * 47) % W, gy - 6 + (i * 13) % 18, 2, 1, 0, 0, TAU); ctx.fill(); }
  },
  drawRacket(p, tt) {
    const q = p.sw ? p.sw.t / FB.sw : null, R = q === null ? { x: p.x + p.f * 15, y: this.gy - 15, ph: .3 } : this.racket(p, q);
    const ang = q === null ? p.f * .4 : p.f * (R.ph + Math.PI / 2) * .9;
    ctx.save(); ctx.translate(R.x, R.y); ctx.rotate(ang);
    R2(-1, 0, 2, 7, '#7b4a2a');
    ctx.fillStyle = '#d99a52'; ctx.strokeStyle = NAVY; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, -5, 5, 7, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-1.5, -7, 1.6, 3, 0, 0, TAU); ctx.fill();
    ctx.restore();
    function R2(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  },
  drawChar(i, tt) {
    const p = this.P[i], fr = window.__fr && window.__fr[i ? 'bl' : 'ia'];
    ctx.fillStyle = 'rgba(80,40,20,.25)'; ctx.beginPath(); ctx.ellipse(p.x, this.gy + 1, 16, 3, 0, 0, TAU); ctx.fill();
    if (!fr) { R(p.x - 8, this.gy - 40, 16, 40, i ? '#e86fa8' : '#f4efe6'); return; }
    let an = 'ready', k = Math.floor(tt * 8) % 8;
    if (p.sw) { an = 'gnd'; const q = p.sw.t / FB.sw; k = Math.min(15, Math.floor(2 + q * 13)); }
    else if (Math.abs(p.vx) > 25) { an = 'run'; k = Math.floor(((p.ph / (2 * TAU)) % 1) * 16) % 16; }
    ctx.save(); ctx.translate(p.x, this.gy);
    try { fr(an, k, 'g', p.sw ? 5 : p.ex, p.f < 0); } catch { /* desenho ainda carregando */ }
    ctx.restore();
    this.drawRacket(p, tt);
  },
  draw(tt) {
    this.drawBeach(tt);
    const b = this.b;
    if (b) { const sh = clamp(1 - (this.gy - b.y) / 140, .3, 1); ctx.fillStyle = `rgba(80,40,20,${.25 * sh})`; ctx.beginPath(); ctx.ellipse(b.x, this.gy + 1, 4 * sh, 1.4, 0, 0, TAU); ctx.fill(); }
    this.drawChar(0, tt); this.drawChar(1, tt);
    for (const f of this.fx) {
      const k = f.t / .6; ctx.globalAlpha = 1 - k;
      if (f.k === 'areia') { for (let j = 0; j < 6; j++) R(f.x - 8 + j * 3, f.y - 2 - k * 10 * ((j % 3) + 1), 2, 2, '#e9c27c'); }
      else { ctx.strokeStyle = f.k === 'pancada' ? '#ffd04a' : '#ffffff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(f.x, f.y, 4 + k * 10, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    if (b && b.y > -20) {
      ctx.fillStyle = '#ffc43a'; ctx.strokeStyle = NAVY; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + .5, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(b.x - 1.5, b.y - 2, 1.2, 1.2);
      if (this.spd > 1.3 && b.live) { ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * .04, b.y - b.vy * .04); ctx.stroke(); }
    }
    if (this.two) { R(6, 6, 0, 0, '#000'); }
  },
};
