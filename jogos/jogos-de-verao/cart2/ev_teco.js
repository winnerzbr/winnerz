/* ============================================================ prova nova: Teco-teco d'Água (01/11/2026, ideia do dono)
   Jogo de "navinha" de lado: quatro teco-tecos (o IAmiguinho e três Amiguinhos) voam sobre o mar da Costa WinnerZ, com uma
   pistola d'água presa no nariz, disputando os mesmos alvos. Quem estoura primeiro leva os pontos.
   VOAR LIVRE: ◀ ▶ ▲ ▼ (ou o analógico). ÁGUA: segure ✕ / Espaço / "Água": a pistola atira gotas para a frente.
   O tanque esvazia: um rasante no mar (bem baixo) enche de novo; parado no alto ele enche bem devagar.
   BEXIGA: ○ / X / "Bexiga" joga uma bexiga d'água (cai em curva). Acertou um teco-teco: o piloto fica tonto um tempo
   (rodopia, não atira e não pontua). Acertou alvos: estoura tudo em volta. Cestas de bexigas descem de paraquedas.
   Alvos: balões de festa, cachos de balões, drones, pipas presas nos barcos, o patinho inflável preso em balões e o
   dirigível da Costa WinnerZ (4 alvos pintados no casco; quem fizer o último leva um bônus). Argolas douradas: a primeira
   passagem leva; argolas seguidas (até 4 s entre uma e outra) valem mais. Estouros seguidos rápidos fazem sequência (até ×2).
   2 minutos. No fim, o placar dos quatro decide a colocação (e a medalha).
   Arte provisória: tudo desenhado pelo jogo. Os pedidos de arte estão na página de pedidos. */
const TA = {
  dur: 120, sc: 45, spd: 135, acc: 900, rate: 4.5, shotV: 300, alcance: .8, frente: .6, gasto: .02, refil: .5, refil0: .02, bexIni: 3, bexMax: 5, bexG: 380,
  tonto: 2.8, inv: 1.3, ringPts: 120, ringSeq: 40, combo: 1.2, ai: [.86, .91, .96], esc: .85, perto: 600, volta: .25,
};
if (typeof Music !== 'undefined' && Music.songs.jetski) Music.songs.teco = Music.songs.jetski;
FALA.intro.teco = [
  'Teco-teco com pistola d\'água! Os Amiguinhos também vão estar lá em cima. Quem estoura primeiro, leva.',
  'Água acabou? Rasante no mar. O teco-teco bebe igual a mim na praia.',
  'Bexiga d\'água no Amiguinho e ele fica tonto. Não é maldade, é estratégia. Tá, é um pouquinho de maldade.',
];
FALA.taBoa = ['Estourei antes dele! O balão era meu desde criancinha.', 'Bexiga certeira! O Amiguinho tá vendo estrela de dia.', 'Argola, argola, argola! Sou um piloto de circo.', 'Drone molhado não voa. Ciência.'];
FALA.taRuim = ['Levei uma bexiga! Tô vendo três mares.', 'Ele estourou o meu balão! Eu tinha mirado primeiro, juro.', 'Tanque vazio. Rasante, rasante!'];
const TA_COLS = [['#3b6fd6', 'Você'], ['#ff6ba8', 'Rosa'], ['#ffd84a', 'Amarelo'], ['#9be37a', 'Verde']];
// jeito de cada Amiguinho (01/11, pedido do dono: eles grudavam e brigavam pelas mesmas coisas)
// Rosa: caçadora de drones, patinho e dirigível, voa no alto e atira de longe. Amarelo: argolas, balões e cestas, no meio.
// Verde: o malandro: rouba o último acerto dos alvos que os outros quase estouraram, voa baixo e joga muita bexiga (no líder).
const TA_JEITO = [{ faixa: [.15, .9], gosto: {}, argola: 1, bomba: 1, dist: [70, 130], linha: .2, cedo: 0 }, // (o jogador, quando um teste joga por ele)
  { faixa: [.08, .42], gosto: { drone: 1.7, pato: 1.6, alvo: 1.7, pipa: 1.1, balao: .7, cesta: .8 }, argola: 1.1, bomba: 1, dist: [110, 170], linha: .3, cedo: .4 },
  { faixa: [.36, .68], gosto: { balao: 1.4, cesta: 1.3, pipa: 1.1, drone: .8, pato: .9, alvo: 1 }, argola: 2.8, bomba: .7, dist: [50, 90], linha: .45, cedo: 1.2 },
  { faixa: [.62, .95], gosto: { pipa: 1.4, balao: 1.1, drone: 1, pato: 1, alvo: 1.1, cesta: 1.4 }, argola: 1.5, bomba: 1.8, rouba: 2.4, dist: [40, 80], linha: .55, cedo: 1.6 },
];
const TA_TIPOS = {
  balao: { r: 7, hp: 1, pts: 100 }, drone: { r: 9, hp: 3, pts: 250 }, pipa: { r: 9, hp: 2, pts: 150 }, pato: { r: 11, hp: 4, pts: 350 },
  cesta: { r: 9, hp: 0, pts: 0 }, alvo: { r: 7, hp: 3, pts: 200 },
};
const teco = {
  id: 'teco', name: 'Teco-teco d\'Água', tag: 'Céu da Costa WinnerZ · 2 minutos', wide: true, hi: true, paint: true, two: false, dur: 0,
  med: [1600, 2200, 3000], medText: ['ficar em 3º', 'ficar em 2º', 'vencer'], medShort: ['3º lugar', '2º lugar', '1º lugar'], ia: 2200, nota: 'molhou o próprio boné no rasante',
  desc: 'Teco-teco com pistola d\'água contra 3 Amiguinhos: estoure balões e drones antes deles, passe pelas argolas e jogue bexigas d\'água.',
  steps: () => [
    `Voe livre com ◀ ▶ ▲ ▼ e segure ${touch ? '“Água”' : 'Espaço'} para atirar água: balões, drones, pipas, o patinho e o dirigível valem pontos. Quem estoura primeiro leva.`,
    'Passe por dentro das argolas douradas: a primeira passagem leva os pontos, e argolas seguidas valem mais. Quando a água acabar, dê um rasante no mar para encher o tanque.',
    `${touch ? '“Bexiga”' : 'X'} joga uma bexiga d'água: o Amiguinho acertado fica tonto um tempo, sem atirar e sem pontuar. Pegue as cestas de bexigas que descem de paraquedas. Eles também jogam em você!`,
    '2 minutos. No fim, o placar dos quatro decide a colocação.',
  ],
  hint: () => '',
  gp: 'Controle: analógico voa · ✕ água (segure) · ○ bexiga · Start pausa',
  ctl: [['◀ ▶ ▲ ▼', 'voar'], ['Espaço', 'água (segure)', 'kb'], ['X', 'bexiga', 'kb'], ['Água', 'água (segure)', 'touch'], ['Bexiga', 'bexiga', 'touch'], ['Esc', 'pausa', 'kb']],
  pad: { dirs: 'lrud', a: 'Água', b: 'Bexiga' }, bannerY: 40,
  init() {
    const SEA = H - 30;
    Object.assign(this, {
      t: 0, T: -3, score: 0, SEA, done: false, doneT: 0, rank: 4, P: TA_COLS.map(([col, name], i) => this.newP(i, col, name)),
      tg: [], rings: [], shots: [], bombs: [], fx: [], spawnT: 0, ringT: 6, cestaT: 9, blimp: [52, 100], blimpOn: null, seed: 1,
      st: { baloes: 0, drones: 0, argolas: 0, acertos: 0, levou: 0, seq: 0, dirig: 0 }, gulls: [], boats: [],
    });
    this.me = this.P[0];
    for (let i = 0; i < 4; i++) this.gulls.push({ x: rand(0, W), y: rand(30, 90), s: rand(.5, 1), ph: rand(0, TAU) });
  },
  newP(i, col, name) {
    return { i, me: i === 0, col, name, x: 40 + i * 14, y: 60 + i * 30, vx: 0, vy: 0, water: 1, bex: TA.bexIni, tonto: 0, inv: 0, pts: 0, cd: 0, bcd: 0,
      combo: 0, comboT: 0, ringT: 99, ringN: 0, tilt: 0, ph: rand(0, TAU), skim: 0, ai: { plan: null, t: 0, sk: TA.ai[i - 1] || .7, dodge: 0, err: 0, dy: 0 }, shots: 0, fire: false };
  },
  demo() {
    this.T = 34; this.t = 34;
    this.P.forEach((p, i) => { p.x = [70, 140, 210, 100][i]; p.y = [80, 50, 120, 150][i]; p.pts = [1200, 900, 1500, 600][i]; });
    for (let i = 0; i < 9; i++) this.addT('balao', 180 + i * 24, 40 + (i % 3) * 30 + i * 4);
    this.addT('drone', 330, 70); this.addT('pipa', 280, 120);
    this.rings.push({ x: 250, y: 100, r: 14, by: -1, t: 0 }, { x: 300, y: 85, r: 14, by: 2, t: 0 });
    this.P[0].fire = true; for (let k = 0; k < 6; k++) this.shots.push({ x: 90 + k * 14, y: 82 + k * .6, vx: 300, vy: 0, o: 0, life: 1 });
    this.bombs.push({ x: 150, y: 62, vx: 120, vy: 20, o: 1, col: '#ff6ba8', t: .3 });
  },
  hud() {
    const m = this.me, left = Math.max(0, Math.ceil(TA.dur - Math.max(0, this.T)));
    return [['Posição', `${this.rank}º`, this.rank === 1], ['Pontos', nf(m.pts)], ['Tempo', this.T < 0 ? '2:00' : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`, left <= 10 && this.T > 0], ['Bexigas', String(m.bex), m.bex > 0]];
  },
  stats() {
    const s = this.st;
    return [`Terminou em ${this.rank}º lugar com ${nf(this.me.pts)} pontos`, `${s.baloes} balões · ${s.drones} drones e pipas · ${s.argolas} argolas · ${s.dirig} alvos do dirigível · maior sequência ${s.seq}`,
      `Acertou ${s.acertos} bexiga${s.acertos === 1 ? '' : 's'} nos Amiguinhos · levou ${s.levou}`];
  },
  ord() { return [...this.P].sort((a, b) => b.pts - a.pts || a.i - b.i); },
  // ---------- alvos
  addT(kind, x, y, o = {}) {
    const B = TA_TIPOS[kind], c = ['#ff5a5a', '#ffb347', '#6bcbff', '#ff6ba8', '#9be37a', '#b78cff', '#ffd84a'];
    const q = { kind, x, y, x0: x, y0: y, vx: -TA.sc, vy: 0, r: B.r, hp: B.hp, pts: B.pts, t: 0, ph: rand(0, TAU), col: pick(c), last: -1, dead: false, hit: 0, ...o };
    if (kind === 'balao') { q.vx = -TA.sc * rand(.5, .8); q.vy = -rand(10, 22); }
    if (kind === 'drone') { q.vx = -TA.sc * .35; q.col = '#3a3f52'; }
    if (kind === 'pipa') { q.vx = -TA.sc; q.len = rand(60, 90); }
    if (kind === 'pato') { q.vx = -TA.sc * .55; q.vy = -4; q.col = '#ffd84a'; }
    if (kind === 'cesta') { q.vx = -TA.sc * .7; q.vy = 16; }
    this.tg.push(q); return q;
  },
  spawn(dt) {
    const T = this.T; if (T < 0 || T > TA.dur - 2) return;
    // ritmo: aperta com o tempo
    this.spawnT -= dt; if (this.spawnT <= 0) {
      this.spawnT = Math.max(.55, 1.15 - T / 220) * rand(.8, 1.2);
      const r = Math.random(), S = this.SEA;
      if (r < .42) this.addT('balao', rand(W * .45, W + 20), S - 8);
      else if (r < .55) { const x = W + 20, y = rand(40, S - 50); for (let k = 0; k < 5; k++) this.addT('balao', x + rand(-10, 10), y + rand(-12, 12), { vx: -TA.sc * .6, vy: -rand(2, 6) }); }
      else if (r < .72) this.addT('drone', W + 16, rand(36, S - 50));
      else if (r < .86) { const b = { x: W + 30, t: 0 }; this.boats.push(b); this.addT('pipa', W + 30, rand(50, S - 70), { boat: b }); }
      else if (r < .93 && T > 15) this.addT('pato', W + 20, rand(50, S - 60));
      else this.addT('balao', W + 14, rand(40, S - 40), { vy: -rand(3, 8) });
    }
    // argolas em arco (5 seguidas)
    this.ringT -= dt; if (this.ringT <= 0) {
      this.ringT = rand(11, 15); const gr = {}; const y0 = rand(55, this.SEA - 55), a = rand(18, 40) * (Math.random() < .5 ? 1 : -1), ph = rand(0, TAU);
      for (let k = 0; k < 5; k++) this.rings.push({ x: W + 20 + k * 46, y: clamp(y0 + Math.sin(ph + k * .9) * a, 30, this.SEA - 24), r: 14, by: -1, t: 0, gr });
    }
    // cesta de bexigas de paraquedas
    this.cestaT -= dt; if (this.cestaT <= 0) { this.cestaT = rand(11, 16); this.addT('cesta', rand(W * .55, W * .9), -12); }
    // dirigível
    if (this.blimp.length && T >= this.blimp[0]) { this.blimp.shift(); this.addBlimp(); }
  },
  addBlimp() {
    const b = { x: W + 70, y: 62, t: 0 }; this.blimpOn = b;
    for (let k = 0; k < 4; k++) this.addT('alvo', 0, 0, { blimp: b, k, vx: 0 });
    pop('O dirigível!', W / 2, 46, '#ffd166', true); talk(['O dirigível da Costa WinnerZ! Quatro alvos no casco. O último leva bônus.'], 1);
  },
  // ---------- passo
  update(dt, I) {
    this.t += dt;
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < (f.life || .6));
    if (this.done) { this.doneT += dt; this.stepWorld(dt, null); return this.doneT > 3.4; }
    const was = this.T; this.T += dt;
    if (this.T < 0) { for (const n of [-3, -2, -1]) if (was < n && this.T >= n) { pop(String(-n), W / 2, 80, '#fff6d6', true); beep(440, .12, 'square', .05); } }
    else if (was < 0) { pop('Vai!', W / 2, 80, '#ffd166', true); beep(880, .3, 'square', .06); }
    if (this.T >= TA.dur) { this.end(); return false; }
    if (this.T > TA.dur - 10 && Math.floor(was) !== Math.floor(this.T)) beep(1200, .05, 'square', .03);
    this.stepWorld(dt, I);
    return false;
  },
  end() {
    this.done = true; this.doneT = 0; const o = this.ord(); this.rank = o.indexOf(this.me) + 1;
    this.score = [3000, 2200, 1600, 400][this.rank - 1] + Math.min(599, Math.floor(this.me.pts / 10));
    pop(this.rank === 1 ? 'Você venceu!' : `Você ficou em ${this.rank}º`, W / 2, 70, this.rank === 1 ? '#ffd166' : '#fff6d6', true);
    if (this.rank === 1) { sfx.big(); talk(FALA.taBoa, .8); } else { sfx.point(); talk(this.rank > 2 ? FALA.taRuim : FALA.taBoa, .6); }
  },
  stepWorld(dt, I) {
    const live = !this.done && this.T >= 0;
    this.spawn(dt);
    this.rank = this.ord().indexOf(this.me) + 1;
    for (const p of this.P) {
      const c = !live ? { mx: .4, my: 0, fire: false, bomb: false } : p.me && I ? this.ctlOf(I) : this.aiCtl(p, dt);
      this.fly(p, c, dt, live);
    }
    // aviões se afastam um pouco quando encostam
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) { const A = this.P[a], B = this.P[b], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx * .6, dy), dm = 12 * TA.esc; if (d < dm && d > .01) { const k = (dm - d) / d * .5; A.x -= dx * k * .3; A.y -= dy * k; B.x += dx * k * .3; B.y += dy * k; } }
    // alvos
    for (const q of this.tg) {
      q.t += dt; q.hit = Math.max(0, q.hit - dt);
      if (q.kind === 'balao') { q.x += (q.vx + Math.sin(q.t * 1.3 + q.ph) * 6) * dt; q.y += q.vy * dt; }
      else if (q.kind === 'drone') { q.x += q.vx * dt; q.y = q.y0 + Math.sin(q.t * 1.4 + q.ph) * 22; q.x += Math.sin(q.t * .7) * 10 * dt; }
      else if (q.kind === 'pipa') { q.boat.x += -TA.sc * dt; q.x = q.boat.x + 20 + Math.sin(q.t * 1.1 + q.ph) * 14; q.y = q.y0 + Math.sin(q.t * .8 + q.ph) * 10; }
      else if (q.kind === 'pato') { q.x += q.vx * dt; q.y = q.y0 + Math.sin(q.t * .9) * 8 + q.vy * q.t; }
      else if (q.kind === 'cesta') { q.x += q.vx * dt; q.y += q.vy * dt; if (q.y > this.SEA - 6) { q.dead = true; this.splash(q.x, this.SEA, 1); } }
      else if (q.kind === 'alvo') { const b = q.blimp; q.x = b.x - 42 + q.k * 26; q.y = b.y + 2 + (q.k % 2 ? -3 : 3); }
      if (q.fall) { q.vy += 300 * dt; q.y += q.vy * dt; q.x += q.vx * dt; q.rot = (q.rot || 0) + dt * 6; if (q.y > this.SEA) { q.dead = true; this.splash(q.x, this.SEA, 2); } }
      if (q.x < -40 || q.y < -40) q.dead = true;
    }
    for (const b of this.boats) b.t += dt;
    this.boats = this.boats.filter((b) => b.x > -60);
    if (this.blimpOn) { const b = this.blimpOn; b.t += dt; b.x += (b.t < 3 ? -TA.sc * 1.2 : -TA.sc * .32) * dt; b.y = 62 + Math.sin(b.t * .6) * 6; if (b.x < -90) this.blimpOn = null; }
    // argolas
    for (const g of this.rings) { const px = g.x; g.x += -TA.sc * dt; g.t += dt; if (g.by >= 0) continue;
      for (const p of this.P) { if (p.tonto > 0 || !live) continue; const rx0 = p.px - px, rx1 = p.x - g.x; if (rx0 < 0 && rx1 >= 0 && Math.abs(p.y - g.y) < g.r - 3) this.ring(p, g); } }
    this.rings = this.rings.filter((g) => g.x > -30);
    // tiros d'água
    for (const s of this.shots) {
      s.vy += 140 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.y > this.SEA) { s.life = 0; if (Math.random() < .3) this.fx.push({ k: 'gota', x: s.x, y: this.SEA, t: 0, life: .3 }); continue; }
      for (const q of this.tg) { if (q.dead || q.fall || q.kind === 'cesta') continue; if (Math.hypot(s.x - q.x, (s.y - q.y) * (q.kind === 'pato' ? .8 : 1)) < q.r + 2) { s.life = 0; this.dano(q, 1, s.o, s.x, s.y); break; } }
    }
    this.shots = this.shots.filter((s) => s.life > 0 && s.x < W + 20);
    // bexigas
    for (const b of this.bombs) {
      b.t += dt; b.vy += TA.bexG * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      let boom = b.y > this.SEA;
      for (const p of this.P) { if (p.i === b.o || p.inv > 0 || p.tonto > 0) continue; if (Math.hypot(p.x - b.x, p.y - b.y) < 11 * TA.esc + 2) { this.atordoa(p, b.o); boom = true; break; } }
      if (!boom) for (const q of this.tg) { if (q.dead || q.fall || q.kind === 'cesta') continue; if (Math.hypot(q.x - b.x, q.y - b.y) < q.r + 5) { boom = true; break; } }
      if (boom) { b.dead = true; this.estoura(b); }
    }
    this.bombs = this.bombs.filter((b) => !b.dead && b.x < W + 40);
    this.tg = this.tg.filter((q) => !q.dead);
    for (const gl of this.gulls) { gl.x -= (12 + gl.s * 10) * dt; gl.ph += dt * 7; if (gl.x < -20) { gl.x = W + 20; gl.y = rand(30, 90); } }
  },
  // ---------- avião: voo livre com um pouco de inércia; tonto, rodopia e cai um pouco
  fly(p, c, dt, live) {
    if (p.water <= 0) p.seco = true;
    p.px = p.x; p.inv = Math.max(0, p.inv - dt); p.cd -= dt; p.bcd -= dt; p.comboT -= dt; if (p.comboT <= 0) p.combo = 0; p.ringT += dt; p.ph += dt;
    if (p.tonto > 0) { p.tonto -= dt; p.vx += (-25 - p.vx) * Math.min(1, dt * 3); p.vy += (18 - p.vy) * Math.min(1, dt * 3); if (p.tonto <= 0) p.inv = TA.inv; }
    else {
      const sp = TA.spd * (p.me ? 1 : .94 + .06 * p.ai.sk + .08 * this.aperto()), tx = c.mx * sp, ty = c.my * sp, k = Math.min(1, TA.acc / sp * dt * .12);
      p.vx += (tx - p.vx) * k * 1.6; p.vy += (ty - p.vy) * k * 1.6;
    }
    p.x = clamp(p.x + p.vx * dt, 14, W * TA.frente); p.y = clamp(p.y + p.vy * dt, 22, this.SEA - 7);
    if (p.y >= this.SEA - 7 && p.vy > 0) p.vy = 0;
    p.tilt += (clamp(p.vy / 260, -.35, .35) - p.tilt) * Math.min(1, dt * 8);
    if (Math.random() < dt * 8) this.fx.push({ k: 'fumaca', x: p.x - 18, y: p.y + rand(-1, 1), t: 0, life: .7 });
    // rasante: bem perto do mar, o tanque enche (e espirra)
    p.skim = p.y > this.SEA - 14 && p.tonto <= 0 ? p.skim + dt : 0;
    p.water = Math.min(1, p.water + (p.skim > 0 ? TA.refil : TA.refil0) * dt);
    if (p.skim > 0 && Math.random() < dt * 30) this.fx.push({ k: 'spray', x: p.x - 8 + rand(-4, 4), y: this.SEA - 1, vx: rand(-60, -20), vy: rand(-50, -20), t: 0, life: .45 });
    if (p.me && p.skim > 0 && Math.floor((p.skim - dt) * 4) !== Math.floor(p.skim * 4) && p.water < 1) beep(300 + p.water * 500, .05, 'sine', .03);
    if (!live || p.tonto > 0) { p.fire = false; return; }
    // tanque vazio: a pistola só volta a atirar quando o tanque tiver um pouco de água de novo (01/11, pedido do dono)
    if (p.water <= 0) p.seco = true; else if (p.water >= TA.volta) p.seco = false;
    p.fire = !!c.fire && !p.seco && p.water > 0;
    if (p.fire && p.cd <= 0) {
      p.cd = 1 / TA.rate; p.water = Math.max(0, p.water - TA.gasto); p.shots++; if (p.water <= 0) p.seco = true;
      this.shots.push({ x: p.x + 19 * TA.esc, y: p.y + 5 * TA.esc, vx: TA.shotV + p.vx * .4, vy: p.vy * .25 - 8 + rand(-6, 6), o: p.i, life: TA.alcance });
      if (p.me && p.shots % 3 === 0) beep(rand(1300, 1500), .025, 'triangle', .02);
      if (p.me && p.seco) { pop('Tanque vazio!', p.x, p.y - 16, '#bfefff'); talk(FALA.taRuim, .3); }
    }
    if (c.bomb && p.bex > 0 && p.bcd <= 0) {
      p.bex--; p.bcd = .45; const col = pick(['#ff5a5a', '#ffd84a', '#6bcbff', '#ff9ad5', '#9be37a']);
      this.bombs.push({ x: p.x + 4, y: p.y + 8, vx: 120 + p.vx * .6, vy: -30 + p.vy * .4, o: p.i, col, t: 0 });
      if (p.me) sfx.jump();
    }
    // cestas de bexigas
    for (const q of this.tg) if (q.kind === 'cesta' && !q.dead && Math.hypot(q.x - p.x, q.y - p.y) < 13 * TA.esc + 2) {
      q.dead = true; const n = Math.min(TA.bexMax, p.bex + 3) - p.bex; p.bex += n;
      if (p.me) { pop(n ? `+${n} bexigas` : 'Bexigas cheias', q.x, q.y - 10, '#ffd166'); sfx.coin(); }
    }
  },
  // controle do jogador
  ctlOf(I) {
    const ax = I.ax || 0, ay = I.ay || ((I.d ? 1 : 0) - (I.u ? 1 : 0));
    const m = Math.hypot(ax, ay), k = m > 1 ? 1 / m : 1;
    return { mx: ax * k, my: ay * k, fire: !!I.a, bomb: !!I.pb };
  },
  // ---------- pontos
  credita(p, pts, x, y, txt) {
    if (p.tonto > 0) return;
    p.combo = p.comboT > 0 ? p.combo + 1 : 1; p.comboT = TA.combo;
    const mul = 1 + Math.min(4, p.combo - 1) * .25, v = Math.round(pts * mul / 10) * 10; p.pts += v;
    if (p.me) { this.st.seq = Math.max(this.st.seq, p.combo); pop(`${txt || ''}+${v}${p.combo > 1 ? ` ×${String(mul).replace('.', ',')}` : ''}`, x, y - 8, '#fff6d6'); }
    else if (Math.random() < .5) pop(`+${v}`, x, y - 8, p.col);
  },
  dano(q, n, o, x, y) {
    const p = this.P[o]; if (p.tonto > 0) return;
    q.hp -= n; q.hit = .12; q.last = o;
    this.fx.push({ k: 'gota', x, y, t: 0, life: .25 });
    if (q.hp > 0) { if (p.me) beep(700 + q.hp * 120, .03, 'square', .02); return; }
    q.dead = true;
    if (q.kind === 'balao') { this.fx.push({ k: 'pop', x: q.x, y: q.y, col: q.col, t: 0, life: .5 }); if (p.me) { this.st.baloes++; beep(rand(900, 1200), .06, 'square', .04); } }
    else if (q.kind === 'drone' || q.kind === 'pipa' || q.kind === 'pato') {
      const f = { ...q, dead: false, fall: true, vx: -TA.sc * .5, vy: -40, hp: 0, pts: 0 }; this.tg.push(f);
      if (q.kind === 'pipa') q.boat.solta = true;
      if (p.me) { this.st.drones++; sfx.point(); if (Math.random() < .3) talk(FALA.taBoa, .4); }
    } else if (q.kind === 'alvo') {
      this.fx.push({ k: 'pop', x: q.x, y: q.y, col: '#ffd166', t: 0, life: .6 }); if (p.me) { this.st.dirig++; sfx.point(); }
      const resto = this.tg.filter((z) => z.kind === 'alvo' && z.blimp === q.blimp && !z.dead).length;
      if (!resto) { this.credita(p, 600, q.x, q.y - 14, 'Dirigível! '); if (p.me) sfx.big(); }
    }
    this.credita(p, q.pts, q.x, q.y);
  },
  ring(p, g) {
    g.by = p.i; g.t = 0;
    p.ringN = p.ringT < 4 ? p.ringN + 1 : 1; p.ringT = 0;
    const v = TA.ringPts + (p.ringN - 1) * TA.ringSeq; this.credita(p, v, g.x, g.y - 14, p.ringN > 1 ? `Argola ${p.ringN}! ` : 'Argola ');
    if (p.me) { this.st.argolas++; beep(660 + p.ringN * 110, .12, 'square', .05); }
  },
  atordoa(p, o) {
    p.tonto = TA.tonto; p.fire = false; p.combo = 0;
    this.fx.push({ k: 'splash', x: p.x, y: p.y, t: 0, life: .6, col: this.P[o].col });
    const q = this.P[o]; q.pts += 100;
    if (q.me) { this.st.acertos++; pop('Na mosca! +100', p.x, p.y - 16, '#ffd166'); sfx.big(); talk(FALA.taBoa, .35); }
    else if (p.me) { this.st.levou++; pop('Tonto!', p.x, p.y - 16, '#bfefff'); sfx.crash(); shake = .15; talk(FALA.taRuim, .5); }
  },
  estoura(b) {
    this.fx.push({ k: 'splash', x: b.x, y: Math.min(b.y, this.SEA), t: 0, life: .55, col: b.col });
    if (b.y > this.SEA) return;
    for (const q of this.tg) { if (q.dead || q.fall || q.kind === 'cesta') continue; if (Math.hypot(q.x - b.x, q.y - b.y) < 26) this.dano(q, 2, b.o, q.x, q.y); }
  },
  splash(x, y, n) { this.fx.push({ k: 'mar', x, y, t: 0, life: .8, n }); },
  // ---------- Amiguinhos: escolhem o melhor alvo à frente, alinham a altura e atiram; pegam argolas e cestas; enchem o tanque
  // no mar; jogam bexiga em quem está à frente e mais baixo (de preferência em quem está ganhando); às vezes desviam de bexigas.
  aiCtl(p, dt) {
    const A = p.ai, F = TA_JEITO[p.i], sk = this.forca(p); A.t -= dt; A.dodge -= dt;
    if (A.t <= 0 || !A.plan || A.plan.q && (A.plan.q.dead || A.plan.q.fall)) { A.t = rand(.18, .38) * (1.5 - sk); A.plan = this.plano(p); }
    const pl = A.plan; let tx = pl.x, ty = pl.y;
    if (pl.q) { const q = pl.q, ax = Math.max(0, q.x - p.x), tq = ax / TA.shotV; ty = q.y + (q.kind === 'balao' ? q.vy * .3 : 0) - (q.kind === 'cesta' ? 0 : 4 + 70 * tq * tq) + A.err; tx = q.kind === 'cesta' ? q.x : clamp(q.x - pl.d, W * F.linha, W * TA.frente); }
    if (pl.hunt) { const h = pl.hunt; if (h.tonto > 0 || p.bex <= 0) A.t = 0; tx = clamp(h.x - 80, 16, W * TA.frente); ty = clamp(h.y - 42, 24, this.SEA - 20); }
    // desvio de bexiga que vem para cima dele
    if (A.dodge <= 0) for (const b of this.bombs) if (b.o !== p.i && b.x < p.x + 10 && b.x > p.x - 120 && Math.abs(b.y - p.y) < 40 && Math.random() < sk * .9) { A.dodge = .6; A.dy = b.y < p.y ? 1 : -1; break; }
    if (A.dodge > 0) ty = p.y + A.dy * 40;
    // não grudar nos outros: afasta na altura de quem está muito perto
    for (const o of this.P) { if (o === p) continue; const dx = o.x - p.x, dy = o.y - p.y; if (Math.abs(dx) < 60 && Math.abs(dy) < 40) { ty -= Math.sign(dy || (p.i - o.i)) * (40 - Math.abs(dy)) * 1.6; if (!o.me && p.i < o.i && !pl.ring) tx -= (60 - Math.abs(dx)) * .8; } }
    const dx = tx - p.x, dy = ty - p.y;
    const c = { mx: clamp(dx / 30, -1, 1), my: clamp(dy / 16, -1, 1), fire: false, bomb: false };
    // atira quando o alvo está alinhado e no alcance da gota (que cai um pouco no caminho)
    if (!p.seco && p.water > .02) for (const q of this.tg) { if (q.dead || q.fall || q.kind === 'cesta') continue; const ax = q.x - p.x; if (ax > 10 && ax < 215) { const tq = ax / TA.shotV, cai = 70 * tq * tq; if (Math.abs(q.y - (p.y + 4 + cai)) < q.r + 2 - (1 - sk) * 4 + 3 * this.aperto()) { c.fire = true; break; } } }
    // bexiga: alvo à frente e abaixo, no alcance da curva; o Verde caça o líder, e todos caçam o jogador quando ele dispara no placar
    if (p.bex > 0 && p.bcd <= 0) {
      const lider = this.ord()[0], fuga = this.me.pts - Math.max(...this.P.filter((o) => !o.me).map((o) => o.pts));
      for (const o of this.P) { if (o === p || o.tonto > 0 || o.inv > 0) continue; const ox = o.x - p.x, oy = o.y - p.y;
        if (ox > 20 && ox < 160 && oy > 0 && oy < 100) { const tt = ox / (120 + p.vx * .6), yy = (-30 + p.vy * .4) * tt + .5 * TA.bexG * tt * tt;
          const want = (o === lider ? 1.3 : .6) * (o.me && fuga > TA.perto ? 1.8 : 1) * F.bomba;
          if (Math.abs(yy - oy) < 15 && Math.random() < dt * 3.5 * sk * want) { c.bomb = true; break; } } }
    }
    return c;
  },
  // quanto o Amiguinho joga bem agora: o jogo aperta quando você dispara no placar
  // 0 a 1: quanto você está disparando no placar (acima de TA.perto de vantagem sobre o melhor Amiguinho)
  aperto() { const fuga = this.me.pts - Math.max(...this.P.filter((o) => !o.me).map((o) => o.pts)); return clamp((fuga - TA.perto) / (TA.perto * 2), 0, 1) + (fuga > TA.perto ? .001 : 0); },
  forca(p) { const fuga = this.me.pts - Math.max(...this.P.filter((o) => !o.me).map((o) => o.pts)); return clamp(p.ai.sk + (fuga > TA.perto ? .1 : 0) + (fuga > TA.perto * 2 ? .06 : 0), 0, 1); },
  plano(p) {
    const F = TA_JEITO[p.i], sk = this.forca(p), err = rand(-1, 1) * (1 - sk) * 9, [y0, y1] = F.faixa.map((v) => v * this.SEA);
    if (p.seco || p.water < .06 + .08 * (1 - sk)) p.ai.enche = true; if (p.water > .5) p.ai.enche = false;
    if (p.ai.enche) return { x: clamp(p.x, W * F.linha, W * TA.frente), y: this.SEA - 9, q: null, err };
    // caça com bexiga: fica atrás e acima de quem está ganhando para jogar a bexiga (o Verde sempre que alguém dispara; os outros
    // quando você dispara no placar). Assim, ficar parado na frente atirando deixa de ser seguro.
    const lider = this.ord()[0], fuga = this.me.pts - Math.max(...this.P.filter((o) => !o.me).map((o) => o.pts));
    if (p.bex > 0 && lider !== p && lider.tonto <= 0 && (F.rouba ? lider.pts - p.pts > 500 && Math.random() < .55 : lider.me && fuga > TA.perto && Math.random() < .35 + .25 * sk)) return { hunt: lider, x: 0, y: 0, q: null, err };
    // alvos que outros Amiguinhos já foram buscar valem menos (cada um vai atrás de uma coisa)
    const outros = this.P.filter((o) => o !== p && !o.me && o.ai.plan).map((o) => o.ai.plan.q || o.ai.plan.ring);
    let best = null, bv = 0;
    for (const q of this.tg) {
      if (q.dead || q.fall || q.x < p.x + (q.kind === 'cesta' ? -20 : 25) || q.x > W + 10 || q.y < 20) continue;
      if (q.kind === 'cesta' && p.bex >= TA.bexMax - 1) continue;
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      let val = (q.kind === 'cesta' ? 260 * (TA.bexMax - p.bex) / TA.bexMax : (q.kind === 'alvo' ? 300 : q.pts) / Math.max(1, q.hp)) / (40 + d);
      val *= F.gosto[q.kind] || 1;
      val *= 1 + F.cedo * clamp((q.x - W * .5) / (W * .5), 0, 1);      // quem fica na frente vai nos que acabaram de entrar
      if (q.y < y0 || q.y > y1) val *= this.aperto() > 0 ? .75 : .35;                          // fora da altura preferida dele
      if (outros.includes(q)) val *= .2;                                // outro já está indo
      if (q.last === p.i) val *= 1.3;                                   // termina o que começou
      if (F.rouba && q.last >= 0 && q.last !== p.i && q.hp <= 1) val *= F.rouba; // o Verde rouba o último acerto
      if (val > bv) { bv = val; best = q; }
    }
    for (const g of this.rings) { if (g.by >= 0 || g.x < p.x + 15 || g.x > W) continue; const d = Math.hypot(g.x - p.x, g.y - p.y); let val = (TA.ringPts * 1.3) / (40 + d) * F.argola; if (this.P.some((o) => o !== p && !o.me && o.ai.plan && o.ai.plan.ring && o.ai.plan.ring.gr === g.gr && Math.hypot(o.x - g.x, o.y - g.y) < d)) val *= .12; /* uma fileira de argolas é de quem chegou primeiro */ if (val > bv) { bv = val; best = { ring: g }; } }
    if (best && best.ring) return { x: clamp(best.ring.x - 30, W * F.linha, W * TA.frente), y: best.ring.y, q: null, ring: best.ring, err: err * .4 };
    if (best) { p.ai.err = err; return { q: best, d: rand(F.dist[0], F.dist[1]), x: 0, y: 0, err }; }
    return { x: W * F.linha + 20, y: (y0 + y1) / 2, q: null, err };
  },
  // ---------- desenho
  hora() { const d = new Date(), h = window.__taHora != null ? window.__taHora : d.getHours() + d.getMinutes() / 60; return h >= 5 && h < 9 ? 'manha' : h >= 9 && h < 16.5 ? 'dia' : h >= 16.5 && h < 19 ? 'tarde' : 'noite'; },
  draw(tt) {
    const S = this.SEA, hr = this.hora(), night = hr === 'noite';
    const PAL = { manha: ['#f6c8a8', '#bfd9ef', '#ffe7b0'], dia: ['#7ec8f2', '#cdeefc', '#fff6d6'], tarde: ['#f08a5d', '#ffc98a', '#ffd18a'], noite: ['#141a44', '#2b3a78', '#e8ecff'] }[hr];
    const g = ctx.createLinearGradient(0, 0, 0, S); g.addColorStop(0, PAL[0]); g.addColorStop(1, PAL[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, S);
    if (night) { for (let i = 0; i < 50; i++) R((hash(i, 3) * W + tt * 2) % W, hash(i, 4) * (S - 40), 1, 1, `rgba(255,255,255,${.4 + .5 * Math.abs(Math.sin(tt + i))})`); ctx.fillStyle = '#f4f1d8'; ctx.beginPath(); ctx.arc(W - 60, 34, 10, 0, TAU); ctx.fill(); ctx.fillStyle = PAL[0]; ctx.beginPath(); ctx.arc(W - 55, 31, 9, 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = PAL[2]; ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(hr === 'tarde' ? W - 90 : hr === 'manha' ? 70 : W - 70, hr === 'tarde' ? S - 40 : hr === 'manha' ? S - 60 : 36, 16, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    // nuvens ao longe (devagar)
    for (let i = 0; i < 6; i++) { const x = ((hash(i, 7) * (W + 160) - tt * (6 + i * 1.5)) % (W + 160) + W + 160) % (W + 160) - 80, y = 24 + hash(i, 8) * 70; this.nuvem(x, y, .7 + hash(i, 9) * .6, night ? 'rgba(160,170,220,.35)' : 'rgba(255,255,255,.85)'); }
    // costa ao longe: morros, cidade e o farol
    const cx = -((tt * 8) % 600);
    for (const off of [0, 600]) { ctx.fillStyle = night ? '#232a5a' : hr === 'tarde' ? '#b8716b' : '#8db8a8'; ctx.beginPath(); ctx.moveTo(cx + off, S); for (let x = 0; x <= 600; x += 20) ctx.lineTo(cx + off + x, S - 18 - Math.sin(x * .02) * 8 - Math.sin(x * .053) * 6); ctx.lineTo(cx + off + 600, S); ctx.fill();
      for (let k = 0; k < 7; k++) { const bx = cx + off + 300 + k * 12, bh = 10 + (k * 37 % 13); R(bx, S - 18 - bh, 9, bh + 2, night ? '#2e3670' : '#c9d6dc'); if (night) for (let w = 0; w < 3; w++) R(bx + 2 + (w % 2) * 4, S - 16 - bh + w * 4, 2, 2, (k + w) % 3 ? '#ffd88a' : '#2e3670'); }
      const fx = cx + off + 140; R(fx - 3, S - 44, 6, 28, '#fff6d6'); R(fx - 3, S - 38, 6, 4, '#e8484a'); R(fx - 3, S - 28, 6, 4, '#e8484a'); R(fx - 4, S - 48, 8, 5, NAVY);
      if (night) { ctx.save(); ctx.globalAlpha = .25; ctx.fillStyle = '#fff3b0'; ctx.beginPath(); const a = Math.sin(tt * .8) * .6; ctx.moveTo(fx, S - 46); ctx.lineTo(fx + Math.cos(a) * 160, S - 46 + Math.sin(a) * 20 - 12); ctx.lineTo(fx + Math.cos(a) * 160, S - 46 + Math.sin(a) * 20 + 12); ctx.fill(); ctx.restore(); } }
    for (const gl of this.gulls) { const f = Math.sin(gl.ph) * 3 * gl.s; ctx.strokeStyle = night ? 'rgba(220,225,255,.6)' : 'rgba(40,50,80,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gl.x - 5 * gl.s, gl.y - f); ctx.quadraticCurveTo(gl.x - 2 * gl.s, gl.y - 2, gl.x, gl.y); ctx.quadraticCurveTo(gl.x + 2 * gl.s, gl.y - 2, gl.x + 5 * gl.s, gl.y - f); ctx.stroke(); }
    // mar
    const gs = ctx.createLinearGradient(0, S, 0, H); gs.addColorStop(0, night ? '#1d3d7a' : hr === 'tarde' ? '#3f7fb0' : '#2aa3c9'); gs.addColorStop(1, night ? '#0f1f45' : '#156c9a'); ctx.fillStyle = gs; ctx.fillRect(0, S, W, H - S);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; for (let r = 0; r < 3; r++) { ctx.beginPath(); for (let x = -10; x <= W + 10; x += 6) { const y = S + 3 + r * 8 + Math.sin(x * .09 + tt * (2 + r) + r) * 1.2; x < -5 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.globalAlpha = .6 - r * .15; ctx.stroke(); } ctx.globalAlpha = 1;
    // barcos das pipas
    for (const b of this.boats) this.barco(b.x, S + 4, tt);
    if (this.blimpOn) this.dirigivel(this.blimpOn, tt);
    // argolas: metade de trás, aviões, metade da frente
    for (const r of this.rings) this.argola(r, tt, true);
    for (const q of this.tg) this.alvo(q, tt);
    for (const s of this.shots) { ctx.fillStyle = 'rgba(160,225,255,.95)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, 2.6, 1.6, Math.atan2(s.vy, s.vx), 0, TAU); ctx.fill(); R(s.x - .5, s.y - .8, 1, 1, '#ffffff'); }
    for (const p of this.P) this.aviao(p, tt);
    for (const r of this.rings) this.argola(r, tt, false);
    for (const b of this.bombs) this.bexiga(b.x, b.y, b.col, b.t * 9, 1);
    for (const f of this.fx) this.efeito(f);
    this.placar(tt);
  },
  nuvem(x, y, s, col) { ctx.fillStyle = col; for (const [dx, dy, r] of [[0, 0, 10], [10, -4, 12], [22, 0, 9], [11, 3, 10]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); ctx.fill(); } },
  barco(x, y, tt) {
    ctx.save(); ctx.translate(x, y + Math.sin(tt * 2 + x * .05) * .8); ctx.fillStyle = '#c75b39'; ctx.strokeStyle = NAVY; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-12, -3); ctx.lineTo(12, -3); ctx.lineTo(8, 3); ctx.lineTo(-9, 3); ctx.closePath(); ctx.fill(); ctx.stroke(); R(-1, -16, 1.5, 13, NAVY); ctx.fillStyle = '#fff6d6'; ctx.beginPath(); ctx.moveTo(.5, -15); ctx.lineTo(9, -5); ctx.lineTo(.5, -5); ctx.fill(); ctx.restore();
  },
  argola(r, tt, back) {
    const col = r.by >= 0 ? this.P[r.by].col : '#ffcc33', a = r.by >= 0 ? Math.max(0, 1 - r.t * 1.5) : 1; if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(r.x, r.y); const sc = r.by >= 0 ? 1 + r.t : 1; ctx.scale(sc, sc);
    ctx.lineWidth = 3.4; ctx.strokeStyle = NAVY; ctx.beginPath(); ctx.ellipse(0, 0, 5, r.r, 0, back ? Math.PI / 2 : -Math.PI / 2, back ? Math.PI * 1.5 : Math.PI / 2); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
    if (!back && r.by < 0) { ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(.5, 0, 5, r.r, 0, -Math.PI / 2 + .2, -.4); ctx.stroke(); ctx.globalAlpha = .25 + .2 * Math.sin(tt * 6); ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.ellipse(0, 0, 4, r.r - 2, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  },
  balao(x, y, col, s = 1, hit = 0) {
    ctx.strokeStyle = 'rgba(40,40,60,.6)'; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(x, y + 7 * s); ctx.quadraticCurveTo(x + 2, y + 12 * s, x - 1, y + 17 * s); ctx.stroke();
    ctx.fillStyle = hit > 0 ? '#ffffff' : col; ctx.strokeStyle = NAVY; ctx.lineWidth = .9; ctx.beginPath(); ctx.ellipse(x, y, 5.6 * s, 6.8 * s, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.beginPath(); ctx.ellipse(x - 2 * s, y - 2.5 * s, 1.4 * s, 2.2 * s, -.4, 0, TAU); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 1.4, y + 7.6 * s); ctx.lineTo(x + 1.4, y + 7.6 * s); ctx.lineTo(x, y + 6.4 * s); ctx.fill();
  },
  bexiga(x, y, col, rot, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(rot) * .5); ctx.scale(s * (1 + Math.sin(rot * 1.7) * .08), s * (1 - Math.sin(rot * 1.7) * .08));
    ctx.fillStyle = col; ctx.strokeStyle = NAVY; ctx.lineWidth = .9; ctx.beginPath(); ctx.arc(0, 0, 4.4, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(-1.4, -1.5, 1.2, 0, TAU); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-1, -4.2); ctx.lineTo(1, -4.2); ctx.lineTo(0, -6); ctx.fill(); ctx.restore();
  },
  alvo(q, tt) {
    const hit = q.hit;
    ctx.save(); if (q.fall) { ctx.translate(q.x, q.y); ctx.rotate(q.rot || 0); ctx.translate(-q.x, -q.y); }
    if (q.kind === 'balao') this.balao(q.x, q.y, q.col, 1, hit);
    else if (q.kind === 'drone') {
      const x = q.x, y = q.y; ctx.strokeStyle = NAVY; ctx.lineWidth = .9;
      R(x - 9, y - 4, 18, 1.4, '#555b70'); for (const sx of [-9, 9]) { ctx.fillStyle = 'rgba(220,230,240,.55)'; ctx.beginPath(); ctx.ellipse(x + sx, y - 5, 5.5, 1.1 + Math.abs(Math.sin(tt * 40)) * .4, 0, 0, TAU); ctx.fill(); R(x + sx - .7, y - 5, 1.4, 2, NAVY); }
      ctx.fillStyle = hit > 0 ? '#ffffff' : q.col; ctx.beginPath(); ctx.roundRect(x - 6, y - 3, 12, 6, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1b1f4f'; ctx.beginPath(); ctx.arc(x + 3, y + 3.5, 2, 0, Math.PI); ctx.fill(); R(x - 4, y - 1, 2, 2, Math.sin(tt * 8 + q.ph) > 0 ? '#ff5a5a' : '#5a1a1a'); R(x + 2, y - 1, 2, 2, Math.sin(tt * 8 + q.ph) > 0 ? '#5aff8a' : '#1a4a2a');
      for (let k = 0; k < q.hp - 1 && !q.fall; k++) R(x - 4 + k * 4, y - 9, 3, 1.2, '#9be37a');
    } else if (q.kind === 'pipa') {
      const x = q.x, y = q.y; if (!q.fall && q.boat) { ctx.strokeStyle = 'rgba(40,40,60,.5)'; ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(x, y + 9); ctx.quadraticCurveTo((x + q.boat.x) / 2 + 8, (y + this.SEA) / 2, q.boat.x, this.SEA - 10); ctx.stroke(); }
      ctx.fillStyle = hit > 0 ? '#ffffff' : q.col; ctx.strokeStyle = NAVY; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(x, y - 11); ctx.lineTo(x + 7, y - 1); ctx.lineTo(x, y + 9); ctx.lineTo(x - 7, y - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(27,31,79,.5)'; ctx.beginPath(); ctx.moveTo(x, y - 11); ctx.lineTo(x, y + 9); ctx.moveTo(x - 7, y - 1); ctx.lineTo(x + 7, y - 1); ctx.stroke();
      for (let k = 0; k < 3; k++) { const yy = y + 12 + k * 5, xx = x + Math.sin(tt * 5 + k + q.ph) * 3; R(xx - 1.5, yy, 3, 2, ['#ff5a5a', '#ffd84a', '#6bcbff'][k]); }
    } else if (q.kind === 'pato') {
      const x = q.x, y = q.y;
      if (!q.fall) for (let k = -1; k <= 1; k++) this.balao(x + k * 7, y - 18 - Math.abs(k) * -2, ['#ff5a5a', '#6bcbff', '#ff9ad5'][k + 1], .8);
      ctx.fillStyle = hit > 0 ? '#ffffff' : '#ffd84a'; ctx.strokeStyle = NAVY; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y + 2, 11, 6, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 7, y - 5, 5, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ff9f43'; ctx.beginPath(); ctx.moveTo(x + 11, y - 5); ctx.lineTo(x + 16, y - 3.5); ctx.lineTo(x + 11, y - 2.5); ctx.fill(); R(x + 8, y - 7, 1.4, 1.4, NAVY);
      for (let k = 0; k < q.hp - 1 && !q.fall; k++) R(x - 6 + k * 4, y + 10, 3, 1.2, '#9be37a');
    } else if (q.kind === 'cesta') {
      const x = q.x, y = q.y; ctx.fillStyle = '#fff6d6'; ctx.strokeStyle = NAVY; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(x, y - 14, 10, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8484a'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x - 10 + k * 7, y - 14); ctx.arc(x, y - 14, 10, Math.PI + k * Math.PI / 3, Math.PI + k * Math.PI / 3 + Math.PI / 6); ctx.fill(); }
      ctx.strokeStyle = 'rgba(27,31,79,.6)'; ctx.beginPath(); ctx.moveTo(x - 10, y - 14); ctx.lineTo(x - 4, y - 3); ctx.moveTo(x + 10, y - 14); ctx.lineTo(x + 4, y - 3); ctx.stroke();
      ctx.fillStyle = '#c98a4b'; ctx.beginPath(); ctx.roundRect(x - 5, y - 3, 10, 7, 1.5); ctx.fill(); ctx.stroke();
      for (let k = 0; k < 3; k++) this.bexiga(x - 3 + k * 3, y - 4, ['#ff5a5a', '#6bcbff', '#ffd84a'][k], 0, .45);
    } else if (q.kind === 'alvo') {
      const x = q.x, y = q.y; for (const [r, c] of [[6.5, '#fff6d6'], [4.6, '#e8484a'], [2.8, '#fff6d6'], [1.2, '#e8484a']]) { ctx.fillStyle = hit > 0 ? '#ffffff' : c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = NAVY; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(x, y, 6.5, 0, TAU); ctx.stroke();
      for (let k = 0; k < q.hp; k++) R(x - 4 + k * 3, y + 8, 2, 1.2, '#9be37a');
    }
    ctx.restore();
  },
  dirigivel(b, tt) {
    const x = b.x, y = b.y; ctx.save(); ctx.strokeStyle = NAVY; ctx.lineWidth = 1.2;
    ctx.fillStyle = '#d9dde6'; ctx.beginPath(); ctx.moveTo(x + 52, y - 10); ctx.lineTo(x + 66, y - 22); ctx.lineTo(x + 70, y - 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 52, y + 8); ctx.lineTo(x + 66, y + 20); ctx.lineTo(x + 70, y + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    const gd = ctx.createLinearGradient(0, y - 18, 0, y + 18); gd.addColorStop(0, '#ffffff'); gd.addColorStop(1, '#aeb6c8'); ctx.fillStyle = gd; ctx.beginPath(); ctx.ellipse(x, y, 62, 18, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3b6fd6'; ctx.beginPath(); ctx.ellipse(x, y, 62, 18, 0, -.25, .25); ctx.lineTo(x, y); ctx.fill();
    R(x - 10, y + 17, 22, 6, '#ffd166'); ctx.strokeRect(x - 10, y + 17, 22, 6); R(x - 6, y + 19, 3, 2, NAVY); R(x, y + 19, 3, 2, NAVY);
    ctx.fillStyle = NAVY; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('COSTA WINNERZ', x + 2, y - 8); ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(220,230,240,.6)'; ctx.beginPath(); ctx.ellipse(x + 72, y, 1.2, 6 + Math.sin(tt * 30), 0, 0, TAU); ctx.fill();
    ctx.restore();
  },
  aviao(p, tt) {
    const blink = p.inv > 0 && Math.floor(tt * 14) % 2;
    if (blink) return;
    ctx.save(); ctx.translate(p.x, p.y + Math.sin(p.ph * 2.2) * .8);
    const rot = p.tonto > 0 ? Math.sin(p.tonto * 12) * .5 + p.tonto * 2.6 : p.tilt; ctx.rotate(rot); ctx.scale(TA.esc, TA.esc);
    ctx.strokeStyle = NAVY; ctx.lineWidth = 1;
    // cauda
    ctx.fillStyle = p.col; ctx.beginPath(); ctx.moveTo(-15, -1); ctx.lineTo(-20, -10); ctx.lineTo(-16, -10); ctx.lineTo(-10, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    R(-21, -2, 9, 2, '#fff6d6');
    // corpo
    const gb = ctx.createLinearGradient(0, -6, 0, 6); gb.addColorStop(0, '#ffffff'); gb.addColorStop(.35, p.col); gb.addColorStop(1, p.col); ctx.fillStyle = gb;
    ctx.beginPath(); ctx.moveTo(-17, 0); ctx.quadraticCurveTo(-8, -6, 6, -5.5); ctx.quadraticCurveTo(14, -5, 15, 0); ctx.quadraticCurveTo(14, 5, 6, 5); ctx.quadraticCurveTo(-8, 4, -17, 1.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    R(-13, -.5, 24, 1.4, 'rgba(255,246,214,.9)');
    // tanque d'água (bolha com o nível) em cima do nariz
    ctx.fillStyle = 'rgba(220,240,255,.55)'; ctx.beginPath(); ctx.ellipse(7, -7.5, 4.5, 3.2, 0, 0, TAU); ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = '#4cc3ff'; ctx.fillRect(2, -4.3 - 6.4 * p.water, 10, 6.4 * p.water + .2); ctx.restore(); ctx.beginPath(); ctx.ellipse(7, -7.5, 4.5, 3.2, 0, 0, TAU); ctx.stroke();
    // cabine e piloto
    ctx.fillStyle = 'rgba(200,235,255,.6)'; ctx.beginPath(); ctx.moveTo(-6, -5); ctx.quadraticCurveTo(-4, -12, 2, -12); ctx.lineTo(3, -5.5); ctx.closePath(); ctx.fill();
    this.piloto(p, -2, -9, tt);
    ctx.beginPath(); ctx.moveTo(-6, -5); ctx.quadraticCurveTo(-4, -12, 2, -12); ctx.lineTo(3, -5.5); ctx.stroke();
    // asa alta (teco-teco) com escora
    ctx.fillStyle = '#fff6d6'; ctx.beginPath(); ctx.roundRect(-9, -14, 16, 2.8, 1.4); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-1, -11.5); ctx.lineTo(3, -4); ctx.stroke();
    // pistola d'água embaixo do nariz
    ctx.fillStyle = '#ff9f43'; ctx.beginPath(); ctx.roundRect(4, 3.5, 11, 3.4, 1); ctx.fill(); ctx.stroke(); R(14, 4.3, 3, 1.8, '#3fbf6a'); R(6, 6.6, 2.4, 3, '#ff9f43');
    if (p.fire) { ctx.fillStyle = 'rgba(180,235,255,.8)'; ctx.beginPath(); ctx.ellipse(19, 5.2, 2.2 + Math.random(), 1.3, 0, 0, TAU); ctx.fill(); }
    // bexigas penduradas embaixo da asa
    for (let k = 0; k < p.bex; k++) { const bx = -7 + k * 3.2; this.bexiga(bx, -9.2 + 5.5, ['#ff5a5a', '#ffd84a', '#6bcbff', '#ff9ad5', '#9be37a'][k % 5], tt * 3 + k, .35); }
    // rodas
    ctx.beginPath(); ctx.moveTo(-1, 4.5); ctx.lineTo(-3, 8); ctx.stroke(); ctx.fillStyle = NAVY; ctx.beginPath(); ctx.arc(-3, 8.6, 1.6, 0, TAU); ctx.fill();
    // hélice girando
    ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.arc(15.5, 0, 1.8, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(230,230,240,.55)'; ctx.beginPath(); ctx.ellipse(16.5, 0, 1.3, 8.5, 0, 0, TAU); ctx.fill();
    const a = tt * 50; ctx.strokeStyle = 'rgba(27,31,79,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(16.5, Math.sin(a) * 8.5); ctx.lineTo(16.5, -Math.sin(a) * 8.5); ctx.stroke();
    // tonto: estrelinhas
    if (p.tonto > 0) for (let k = 0; k < 3; k++) { const aa = tt * 6 + k * TAU / 3; this.estrela(-2 + Math.cos(aa) * 9, -17 + Math.sin(aa) * 3, '#ffd84a'); }
    ctx.restore();
  },
  piloto(p, x, y, tt) {
    if (p.me) {
      // IAmiguinho: cabeça creme, visor escuro com olhinhos acesos, boné azul com hélice
      ctx.fillStyle = '#f4e3c8'; ctx.beginPath(); ctx.arc(x, y, 3.6, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1b1f4f'; ctx.beginPath(); ctx.ellipse(x + 1.6, y + .4, 2.4, 1.9, 0, 0, TAU); ctx.fill(); R(x + 1.6, y - .3, .9, .9, '#7fe7ff'); R(x + 2.9, y - .3, .9, .9, '#7fe7ff');
      ctx.fillStyle = '#2f6fe0'; ctx.beginPath(); ctx.arc(x, y - 1, 3.8, Math.PI, 0); ctx.fill(); R(x, y - 1.4, 5.5, 1.2, '#2f6fe0'); R(x - .3, y - 6.6, .8, 2, NAVY);
      ctx.fillStyle = '#2f6fe0'; ctx.beginPath(); ctx.ellipse(x + .1 + Math.cos(tt * 20) * 2, y - 6.8, 2.2 * Math.abs(Math.cos(tt * 20)) + .4, .7, 0, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(x, y, 3.6, 4, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1b1f4f'; ctx.beginPath(); ctx.ellipse(x + 1.4, y - .4, 2.6, 1.4, 0, 0, TAU); ctx.fill(); R(x + 1.6, y - .9, .8, .8, '#bfefff'); R(x + 2.8, y - .9, .8, .8, '#bfefff');
    }
  },
  estrela(x, y, c) { ctx.fillStyle = c; ctx.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 1 : 2.4, a = k * Math.PI / 5 - Math.PI / 2; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.fill(); },
  efeito(f) {
    const k = f.t / (f.life || .6);
    if (f.k === 'pop') { ctx.strokeStyle = f.col; ctx.lineWidth = 1.2; ctx.globalAlpha = 1 - k; for (let i = 0; i < 8; i++) { const a = i * TAU / 8, r0 = 3 + k * 6, r1 = 5 + k * 11; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * r0, f.y + Math.sin(a) * r0); ctx.lineTo(f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1); ctx.stroke(); } ctx.globalAlpha = 1; }
    else if (f.k === 'gota') { ctx.fillStyle = `rgba(190,235,255,${1 - k})`; for (let i = 0; i < 4; i++) R(f.x + Math.cos(i * 1.7) * k * 6, f.y + Math.sin(i * 1.7) * k * 6, 1.2, 1.2, `rgba(190,235,255,${1 - k})`); }
    else if (f.k === 'splash') { ctx.globalAlpha = 1 - k; ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, 3 + k * 6, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(190,235,255,.9)'; for (let i = 0; i < 10; i++) { const a = i * TAU / 10; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * (4 + k * 16), f.y + Math.sin(a) * (4 + k * 16) + k * k * 8, 1.4, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
    else if (f.k === 'mar') { ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(f.x, f.y + 2, 4 + k * 12 * f.n, 1 + k * 2, 0, 0, TAU); ctx.stroke(); for (let i = 0; i < 5 * f.n; i++) R(f.x - 6 + i * 3, f.y - Math.sin(k * Math.PI) * (6 + (i % 3) * 3), 1.2, 1.2, `rgba(220,245,255,${1 - k})`); }
    else if (f.k === 'spray') { f.x += f.vx / 60; f.y += f.vy / 60; f.vy += 4; R(f.x, f.y, 1.2, 1.2, `rgba(220,245,255,${1 - k})`); }
    else if (f.k === 'fumaca') { ctx.fillStyle = `rgba(255,255,255,${.35 * (1 - k)})`; ctx.beginPath(); ctx.arc(f.x - k * 20, f.y - k * 3, 1.5 + k * 3, 0, TAU); ctx.fill(); }
  },
  // placar dos quatro e o tempo, no alto da tela; o tanque e as bexigas do jogador no canto
  placar(tt) {
    const left = Math.max(0, TA.dur - Math.max(0, this.T)), s = Math.ceil(left), m = this.me;
    ctx.fillStyle = 'rgba(20,24,60,.8)'; ctx.beginPath(); ctx.roundRect(W / 2 - 22, 4, 44, 14, 4); ctx.fill();
    ctx.fillStyle = left <= 10 && this.T > 0 && Math.floor(tt * 4) % 2 ? '#ffd166' : '#fff6d6'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, W / 2, 14.5);
    const o = this.ord(); ctx.textAlign = 'left'; ctx.font = 'bold 7px sans-serif';
    o.forEach((p, r) => { const y = 6 + r * 10, x = W - 74; ctx.fillStyle = p.me ? 'rgba(59,111,214,.92)' : 'rgba(20,24,60,.82)'; ctx.beginPath(); ctx.roundRect(x, y, 70, 9, 3); ctx.fill(); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(x + 5, y + 4.5, 2.6, 0, TAU); ctx.fill();
      ctx.fillStyle = p.tonto > 0 ? '#9fb0d0' : '#fff6d6'; ctx.fillText(`${r + 1}º ${p.name}`, x + 10, y + 7); ctx.textAlign = 'right'; ctx.fillText(nf(p.pts), x + 67, y + 7); ctx.textAlign = 'left'; });
    // tanque e bexigas
    ctx.fillStyle = 'rgba(20,24,60,.8)'; ctx.beginPath(); ctx.roundRect(4, 4, 62, 14, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(8, 8, 30, 6); ctx.fillStyle = (m.seco || m.water < .2) && Math.floor(tt * 4) % 2 ? '#ff8a8a' : '#4cc3ff'; ctx.fillRect(8, 8, 30 * m.water, 6); ctx.strokeStyle = '#fff6d6'; ctx.lineWidth = .7; ctx.strokeRect(8, 8, 30, 6);
    for (let k = 0; k < TA.bexMax; k++) { if (k < m.bex) this.bexiga(44 + k * 4.4, 11.5, ['#ff5a5a', '#ffd84a', '#6bcbff', '#ff9ad5', '#9be37a'][k], 0, .5); else { ctx.strokeStyle = 'rgba(255,246,214,.4)'; ctx.beginPath(); ctx.arc(44 + k * 4.4, 11.5, 1.8, 0, TAU); ctx.stroke(); } }
    // fim: a colocação final
    if (this.done) { ctx.fillStyle = 'rgba(20,24,60,.75)'; ctx.beginPath(); ctx.roundRect(W / 2 - 70, 86, 140, 52, 6); ctx.fill(); ctx.font = 'bold 8px sans-serif';
      o.forEach((p, r) => { ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(W / 2 - 58, 98 + r * 11, 3, 0, TAU); ctx.fill(); ctx.fillStyle = p.me ? '#ffd166' : '#fff6d6'; ctx.fillText(`${r + 1}º  ${p.name}`, W / 2 - 50, 101 + r * 11); ctx.textAlign = 'right'; ctx.fillText(nf(p.pts), W / 2 + 62, 101 + r * 11); ctx.textAlign = 'left'; }); }
  },
};
