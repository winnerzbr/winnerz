/* ============================================================ teste: Vôlei 3D (31/10/2026)
   Pedido do dono: portar o vôlei para 3D, com quadra 3D de verdade (anda para a frente e para trás) e os desenhos pintados.
   O vôlei 2D continua igual; esta é uma prova à parte, para teste.
   Câmera de transmissão, de lado e do alto (o lado do IAmiguinho fica à esquerda, como no 2D). Os personagens são as pranchas
   pintadas do vôlei, desenhadas numa tela à parte a cada quadro e coladas num recorte de papel que sempre olha para a câmera.
   Medidas em metros: quadra 16 × 8, rede de 2,43 m, personagens de 1,85 m, bola de raio 0,28 (maior que a real, para ler bem).
   ◀ ▶ ▲ ▼ andam pela quadra (▲ vai para o fundo da tela). ✕ pula. ○ peixinho. □ cortada (no ar, perto da bola) e saque.
   Toque: a bola bate na cabeça ou no corpo. 1º e 2º toques levantam a bola perto da rede do seu lado; segurando para a rede,
   ou no 3º toque, ela passa para o outro lado. ▲ ▼ na hora da batida escolhem o lado da quadra adversária para onde ela vai.
   Um círculo na areia mostra onde a bola vai cair. Até 7 pontos. */
const V3 = { g: 7.4, r: .28, net: 2.43, L: 8, Wd: 4, hc: 1.55, hr: .44, sp: 5.2, jump: 4.4, gp: 11, pts: 7 };
if (typeof Music !== 'undefined' && Music.songs.volei) Music.songs.volei3d = Music.songs.volei;
FALA.intro.volei3d = [
  'Vôlei em 3D! Agora dá para ir para o fundo da quadra. E para errar em mais direções.',
  'O círculo na areia mostra onde a bola vai cair. Chega antes dela.',
  'Levanta perto da rede, pula e corta. O Amiguinho odeia isso.',
];
const volei3d = {
  id: 'volei3d', name: 'Vôlei 3D (teste)', tag: 'Praia do Pôr do Sol · até 7 · 3D', wide: true, hi: true, paint: true, two: false, dur: 0,
  med: [400, 1500, 1900], medText: ['fazer 4 pontos', 'vencer', 'vencer por 4 ou mais'], medShort: ['Fazer 4 pontos', 'Vencer', 'Vencer por 4+'], ia: 1700, nota: 'a bola caiu no fundo da quadra',
  desc: 'Teste: o vôlei numa quadra 3D, com os desenhos pintados.',
  steps: () => [
    `◀ ▶ ▲ ▼ andam pela quadra. ${touch ? '“Pular”' : 'Espaço'} pula e ${touch ? '“Peixinho”' : 'X'} dá um peixinho. O círculo na areia mostra onde a bola vai cair.`,
    'A bola bate na sua cabeça e sobe perto da rede. Segurando para a rede, ou no 3º toque, ela passa para o outro lado.',
    `No ar e perto da bola, ${touch ? '“Cortada”' : 'C'} corta. ▲ ▼ na hora da batida escolhem o lado. ${touch ? '“Cortada”' : 'C'} também saca. Até 7 pontos.`,
  ],
  hint: () => '',
  gp: 'Controle: analógico anda · ✕ pula · ○ peixinho · □ cortada e saque · Start pausa',
  ctl: [['◀ ▶ ▲ ▼', 'andar'], ['Espaço', 'pular', 'kb'], ['X', 'peixinho', 'kb'], ['C', 'cortada / saque', 'kb'], ['Pular', 'pular', 'touch'], ['Peixinho', 'peixinho', 'touch'], ['Cortada', 'cortada / saque', 'touch'], ['Esc', 'pausa', 'kb']],
  pad: { dirs: 'lrud', a: 'Pular', b: 'Peixinho', c: 'Cortada' }, bannerY: 40,
  init() {
    Object.assign(this, { t: 0, score: 0, sc: [0, 0], P: [this.newP(0), this.newP(1)], b: null, state: 'serve', st: 0, server: 0, fx: [], over: false, overT: 0, mood: 0, cortadas: 0, peixes: 0, longest: 0, hits: 0, lastW: 0 });
    this.no3d = !window.THREE; if (!this.no3d) { try { this.build3d(); } catch (e) { this.no3d = true; console.warn(e); } }
    this.resetServe(0);
  },
  newP(i) { return { i, f: i ? -1 : 1, x: i ? 5 : -5, y: 0, z: 0, vx: 0, vz: 0, vy: 0, g: true, dive: 0, down: 0, arm: 0, cool: 0, touchT: 9, touchK: '', ph: 0, ex: 0, exT: 0, ai: {}, ix: 0, iz: 0 }; },
  accNow() { const m = this.mood || 0; return clamp(.74 + .16 * m, .5, .92); },
  hud() { const n = ['Você', 'Amiguinho']; return [[n[0], String(this.sc[0])], [n[1], String(this.sc[1])], ['Saque', n[this.server], this.state === 'serve'], ['Toques', this.b && this.state === 'rally' ? `${this.b.tc[0]} × ${this.b.tc[1]}` : '—']]; },
  stats() { return [`Placar ${this.sc[0]} a ${this.sc[1]}`, `${this.cortadas} cortadas · ${this.peixes} peixinhos · maior troca ${this.longest} toques`]; },
  finalScore() { const [a, b] = this.sc; return a > b ? 1500 + 100 * Math.min(7, a - b) : 100 * Math.min(a, 7); },
  demo() { this.state = 'rally'; Object.assign(this.b, { held: false, x: -2, y: 3, z: 1, vx: 3, vy: 1, vz: 0, last: 0 }); },
  resetServe(s) {
    this.server = s; this.state = 'serve'; this.st = 0; this.hits = 0;
    for (const p of this.P) Object.assign(p, this.newP(p.i), { ai: {} });
    const sv = this.P[s]; sv.x = s ? 8.6 : -8.6; sv.z = 0;
    this.b = { x: sv.x + sv.f * .45, y: 1.3, z: sv.z, vx: 0, vy: 0, vz: 0, held: true, toss: false, last: -1, tc: [0, 0], netT: 0, spin: 0, rot: 0, land: null };
  },
  // ---------- física da bola
  stepBall(c, dt) { c.vy -= V3.g * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; },
  // onde a bola vai cair (sem ninguém tocar): para o círculo na areia e para o Amiguinho
  predict(maxT = 3) {
    const c = { ...this.b }, out = [], dt = 1 / 60;
    for (let t = 0; t < maxT; t += dt) {
      const px = c.x; this.stepBall(c, dt);
      if ((px < 0) !== (c.x < 0) && c.y < V3.net + V3.r && Math.abs(c.z) < V3.Wd + .6) { c.vx *= -.3; c.x = px; }
      out.push({ t: t + dt, x: c.x, y: c.y, z: c.z, vy: c.vy });
      if (c.y <= V3.r) break;
    }
    return out;
  },
  // lança a bola até um ponto do chão passando pela altura máxima pedida
  lob(to, apex) {
    const b = this.b, g = V3.g, top = Math.max(apex, b.y + .3), vy = Math.sqrt(2 * g * (top - b.y)), T = vy / g + Math.sqrt(2 * (top - V3.r) / g);
    b.vx = (to[0] - b.x) / T; b.vz = (to[1] - b.z) / T; b.vy = vy;
  },
  // ---------- quadro a quadro
  update(dt, I) {
    this.t += dt; this.st += dt;
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < .8);
    if (this.over) { this.overT += dt; return this.overT > 2; }
    const C = [this.inputHuman(I), this.brain(dt)];
    if (this.state === 'point') { for (const p of this.P) this.moveP(p, { ix: 0, iz: 0 }, dt); this.ballDead(dt); if (this.st > 1.6) this.next(); return false; }
    const b = this.b;
    if (this.state === 'serve') {
      const s = this.P[this.server], c = C[this.server];
      for (const p of this.P) this.moveP(p, p === s ? { ix: 0, iz: c.iz } : C[p.i], dt, p === s);
      if (b.held) { b.x = s.x + s.f * .45; b.y = 1.3; b.z = s.z; if ((c.serve || c.jumpP) && this.st > .4) { b.held = false; b.toss = true; b.vy = 5.6; b.vx = s.f * .25; b.kind = c.serve ? 'forte' : 'leve'; s.serveT = 0; } }
      else {
        this.stepBall(b, dt); s.serveT = (s.serveT || 0) + dt;
        if (b.vy < 0 && b.y < 2.7) this.serveHit(s, c);
        if (b.y < V3.r) { this.state = 'rally'; this.point(1 - this.server, 'Saque perdido'); }
      }
      return false;
    }
    for (const p of this.P) this.moveP(p, C[p.i], dt);
    // bola em 3 passos, com toques e rede
    for (let k = 0; k < 3 && this.state === 'rally'; k++) {
      const h = dt / 3, px = b.x; this.stepBall(b, h); b.rot += h * 8;
      if ((px < 0) !== (b.x < 0)) {
        if (b.y < V3.net + V3.r && Math.abs(b.z) < V3.Wd + .6) { b.x = px; b.vx *= -.3; b.vz *= .6; b.netT = this.t; this.fx.push({ k: 'net', x: b.x, y: b.y, z: b.z, t: 0 }); beep(140, .06, 'triangle', .04, -30); }
        else { const s = b.x < 0 ? 0 : 1; b.tc[s] = 0; b.over = -1; }
      }
      for (const p of this.P) if (this.contact(p, C[p.i])) break;
      if (b.y <= V3.r) { this.landed(); break; }
    }
    b.land = this.state === 'rally' ? this.predict(3).pop() : null;
    return false;
  },
  inputHuman(I) {
    const ix = I.ax || 0, iz = (I.u ? 1 : 0) - (I.d ? 1 : 0) || (Math.abs(I.ay || 0) > .2 ? -I.ay : 0);
    return { ix, iz, jumpP: I.pa, diveP: I.pb, spikeP: I.pc, serve: I.pc, hold: I.c };
  },
  moveP(p, c, dt, lockX) {
    p.exT = Math.max(0, p.exT - dt); if (!p.exT) p.ex = 0; p.cool = Math.max(0, p.cool - dt); p.touchT += dt; p.arm = Math.max(0, p.arm - dt);
    if (c.spikeP && !p.g) p.arm = .4;
    if (p.down > 0) { p.down -= dt; p.vx *= .8; p.vz *= .8; }
    else if (p.dive > 0) { p.dive -= dt; if (p.dive <= 0) p.down = .45; }
    else {
      const sp = V3.sp * (p.g ? 1 : .55), tx = clamp(c.ix, -1, 1) * sp, tz = -clamp(c.iz, -1, 1) * sp, a = (p.g ? 30 : 8) * dt;
      p.vx += clamp(tx - p.vx, -a, a); p.vz += clamp(tz - p.vz, -a, a);
      if (c.jumpP && p.g) { p.g = false; p.vy = V3.jump; beep(520, .06, 'square', .03, 300); }
      if (c.diveP && p.g && this.state === 'rally') { const m = Math.hypot(c.ix, c.iz) > .3 ? [c.ix, -c.iz] : [this.b.x - p.x, this.b.z - p.z], n = Math.hypot(...m) || 1; p.vx = m[0] / n * 7.2; p.vz = m[1] / n * 7.2; p.dive = .45; if (p.i === 0) this.peixes++; beep(260, .08, 'triangle', .04, -80); }
    }
    if (!p.g) { p.vy -= V3.gp * dt; p.y += p.vy * dt; if (p.y <= 0) { p.y = 0; p.vy = 0; p.g = true; } }
    p.x += p.vx * dt; p.z += p.vz * dt;
    const s = p.f; p.x = s > 0 ? clamp(p.x, -11, -.35) : clamp(p.x, .35, 11); p.z = clamp(p.z, -6, 6);
    if (lockX) p.x = s > 0 ? Math.min(p.x, -8.2) : Math.max(p.x, 8.2);
    p.ph += Math.hypot(p.vx, p.vz) * dt * 1.8;
  },
  ballDead(dt) { const b = this.b; if (b.held) return; if (b.y > V3.r) { this.stepBall(b, dt); if (b.y < V3.r) { b.y = V3.r; b.vy = Math.abs(b.vy) * .3; b.vx *= .5; b.vz *= .5; } } },
  // ---------- toque: cabeça, corpo (ou o corpo deitado no peixinho)
  contact(p, c) {
    const b = this.b; if (p.cool > 0 || b.held) return false;
    const low = p.dive > 0 || p.down > 0, hy = p.y + (low ? .45 : V3.hc), by = p.y + .75;
    const dh = Math.hypot(b.x - p.x, b.y - hy, b.z - p.z), db = Math.hypot(b.x - p.x, b.y - by, b.z - p.z);
    const spikeZone = p.arm > 0 && !p.g && b.y > hy && b.y < hy + 1.3 && Math.hypot(b.x - p.x, b.z - p.z) < 1.05;
    if (!(spikeZone || dh < V3.hr + V3.r + .12 || (!low && db < .38 + V3.r + .08))) return false;
    const side = p.i, s = p.f;
    if (((b.x < 0 ? 0 : 1) !== side && Math.abs(b.x) > .3) || b.over === side) return false;
    b.tc[side]++; b.tc[1 - side] = 0;
    if (b.tc[side] > 3) { this.point(1 - side, '4 toques'); return true; }
    b.last = side; p.cool = .28; p.touchT = 0; this.hits++; this.longest = Math.max(this.longest, this.hits);
    const opp = this.P[1 - side], acc = side === 1 ? this.accNow() : this.botAcc ?? 1;
    const off = Math.hypot(b.x - p.x, b.z - p.z) / (V3.hr + V3.r), inSp = Math.hypot(b.vx, b.vy, b.vz), q = clamp(1 - off * .7 - Math.max(0, inSp - 9) * .05, .15, 1) * (side === 1 || this.botAcc ? .7 + .3 * acc : 1);
    const err = (1.15 - q) * .9, aimZ = c.iz ? -c.iz * 2.9 : clamp(-opp.z * .7 + (Math.random() - .5) * 2, -3.2, 3.2);
    const gz = () => (Math.random() - .5) * 2 * err, toNet = c.ix * s > .5;
    if (spikeZone) {
      // cortada: reta e forte para o outro lado (passa raspando a rede)
      const depth = .55 + .3 * Math.random(), tx = s * (depth * V3.L) + gz() * 1.4, tz = clamp(aimZ + gz() * 1.6, -4.6, 4.6), hs = 13 * (.85 + .3 * q), d = Math.hypot(tx - b.x, tz - b.z), T = d / hs;
      b.vx = (tx - b.x) / T; b.vz = (tz - b.z) / T; b.vy = (V3.r - b.y + .5 * V3.g * T * T) / T; b.spin = 1; p.touchK = 'spike'; p.arm = 0; b.over = side;
      if (side === 0) this.cortadas++; shake = .15; beep(220, .08, 'square', .05, -60); this.fx.push({ k: 'hit', x: b.x, y: b.y, z: b.z, t: 0, c: '#ffd166' });
      if (side === 0 && q > .85) pop('Cortada!', W / 2, 60, '#ffd166');
      return true;
    }
    if (b.tc[side] >= 3 || toNet || Math.abs(b.x) < .9) {
      // passa para o outro lado, por cima da rede
      const depth = .45 + .35 * Math.random(), tx = s * (depth * V3.L) + gz() * 1.6, tz = clamp(aimZ + gz() * 1.8, -4.8, 4.8);
      this.lob([tx, tz], Math.max(V3.net + 1.3, b.y + .6) + gz() * .6); p.touchK = b.y > hy ? 'set' : 'bump'; b.over = side;
    } else {
      // levanta perto da rede do próprio lado
      const tx = s * -(1.4 + Math.random() * .6) + gz(), tz = clamp(p.z * .6 + gz() * 1.4, -3.6, 3.6);
      this.lob([tx, tz], (low ? 4.9 : 4.6) + gz() * .5); p.touchK = low ? 'bump' : b.y > hy + .1 ? 'set' : 'bump';
    }
    b.spin = 0; beep(560, .04, 'square', .04, 60); this.fx.push({ k: 'hit', x: b.x, y: b.y, z: b.z, t: 0, c: '#ffffff' });
    return true;
  },
  serveHit(s, c) {
    const b = this.b, i = s.i, opp = this.P[1 - i], forte = b.kind === 'forte', acc = i === 1 ? this.accNow() : 1;
    const err = forte ? .7 - .4 * acc * (i ? 1 : .9) : .35, aimZ = c.iz ? -c.iz * 2.8 : clamp(-opp.z * .7 + (Math.random() - .5) * 3, -3.2, 3.2);
    const tx = s.f * ((forte ? .7 : .6) + Math.random() * .2) * V3.L + (Math.random() - .5) * 2 * err * 1.5, tz = clamp(aimZ + (Math.random() - .5) * 2 * err * 1.6, -4.8, 4.8);
    b.toss = false; b.last = i; b.tc = [0, 0]; b.over = i; this.state = 'rally'; this.hits = 0; s.touchT = 0; s.touchK = 'serve'; s.cool = .4;
    if (forte) { const d = Math.hypot(tx - b.x, tz - b.z), T = d / 11.5; b.vx = (tx - b.x) / T; b.vz = (tz - b.z) / T; b.vy = (V3.r - b.y + .5 * V3.g * T * T) / T; }
    else this.lob([tx, tz], 5.2);
    beep(forte ? 240 : 480, .06, 'square', .05, forte ? -60 : 60);
  },
  landed() {
    const b = this.b, inC = Math.abs(b.x) <= V3.L + .05 && Math.abs(b.z) <= V3.Wd + .05; b.y = V3.r;
    this.fx.push({ k: 'sand', x: b.x, y: 0, z: b.z, t: 0 });
    if (inC) { const s = b.x < 0 ? 0 : 1; this.point(1 - s, s === 0 ? (b.last === 1 ? 'Ponto do Amiguinho' : 'Caiu do seu lado') : (b.last === 0 ? 'Ponto!' : 'Caiu do lado dele')); }
    else this.point(b.last < 0 ? 1 - this.server : 1 - b.last, 'Fora!');
  },
  point(w, why) {
    if (this.state === 'point' || this.over) return;
    this.sc[w]++; this.state = 'point'; this.st = 0; this.lastW = w; this.b.land = null;
    if (w === 0) { sfx.point(); } else sfx.whiff();
    pop(why, W / 2, 46, w === 0 ? '#bfefff' : '#ffb3c8', true);
    const d = this.sc[1] - this.sc[0]; this.mood = clamp(d <= -2 ? this.mood + .35 : d >= 2 ? this.mood - .3 : this.mood * .6, -1, 1);
    this.P[w].ex = 2; this.P[w].exT = 1.5; this.P[1 - w].ex = 4; this.P[1 - w].exT = 1.5;
  },
  next() {
    const [a, b] = this.sc;
    if (a >= V3.pts || b >= V3.pts) { this.over = true; this.overT = 0; this.score = this.finalScore(); talk(a > b ? FALA.ppPonto || ['Ganhei!'] : FALA.ppLevou || ['Perdi!'], .8); return; }
    this.resetServe(this.lastW);
  },
  // ---------- o Amiguinho: prevê a bola, vai para debaixo dela, levanta perto da rede e corta
  brain(dt, i = 1, accIn) {
    const p = this.P[i], b = this.b, A = p.ai, out = { ix: 0, iz: 0 }, acc = accIn ?? this.accNow(), sg = p.f;
    const go = (x, z, slow) => { const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz); if (d > .12) { const k = Math.min(1, d / (slow ? 1.2 : .5)); out.ix = dx / d * k; out.iz = -dz / d * k; } };
    if (this.state === 'serve') {
      if (this.server === i) { if (!A.sv) { A.sv = 1; A.w = rand(.8, 1.6); A.kind = Math.random() < .3 + .5 * acc ? 'forte' : 'leve'; A.z = rand(-2, 2); } go(-sg * 8.6, A.z, true); A.w -= dt; if (b.held && A.w <= 0) { if (A.kind === 'forte') out.serve = true; else out.jumpP = true; } }
      else go(-sg * 5, 0, true);
      return out;
    }
    if (this.state !== 'rally') return out;
    const pts = this.predict(3), mine = (q) => q.x * -sg > .2;
    // jogada nova: sorteia o erro de leitura e o tempo de reação
    const key = `${this.hits}:${b.last}`; if (A.key !== key) { A.key = key; A.react = .12 + (1 - acc) * .25 * Math.random(); A.err = [(Math.random() - .5) * (1 - acc) * 1.6, (Math.random() - .5) * (1 - acc) * 1.6]; A.spk = Math.random() < .35 + .6 * acc; }
    if (A.react > 0) { A.react -= dt; return out; }
    const comes = pts.length && (mine(b) || pts.some(mine)) && b.over !== i;
    if (!comes) { go(-sg * 5, clamp(b.z * .3, -2, 2), true); return out; }
    // ponto de contato: a bola na altura da cabeça (ou da cortada, se der), do lado dele, no primeiro lugar alcançável
    const wantSpike = b.tc[i] >= 1 && A.spk && b.last === i;
    let best = null;
    for (const q of pts) {
      if (!mine(q) || q.vy > 0 && !wantSpike) continue;
      const hTop = wantSpike ? V3.hc + 1.0 + .7 : V3.hc + .65, hLow = wantSpike ? V3.hc + 1.0 : V3.hc + .15;
      if (q.y > hTop || q.y < hLow) continue;
      const sx = q.x - sg * .12, sz = q.z, need = Math.hypot(sx - p.x, sz - p.z) / (V3.sp * .9);
      if (need <= q.t) { best = { ...q, sx, sz }; break; }
      if (!best || need - q.t < best.gap) best = { ...q, sx, sz, gap: need - q.t };
    }
    if (!best) { const l = pts[pts.length - 1]; if (mine(l)) go(l.x - sg * .1, l.z); return out; }
    go(best.sx + A.err[0], best.sz + A.err[1]);
    if (wantSpike && p.g && best.t < .42 && best.t > .3) out.jumpP = true;
    if (wantSpike && !p.g) out.spikeP = true;
    if (b.tc[i] >= 2 || (!wantSpike && b.tc[i] === 1 && Math.random() < .5)) out.ix = sg;   // segura para a rede: passa para o outro lado
    // sem tempo de chegar numa bola baixa: peixinho
    if (best.gap > .15 && best.t < .45 && p.g && Math.random() < acc * .5) out.diveP = true;
    return out;
  },
  // ---------- 3D
  build3d() {
    if (volei3d.G) return;
    const T = THREE, G = {}, cv = document.createElement('canvas');
    G.r = new T.WebGLRenderer({ canvas: cv, antialias: true }); G.r.setPixelRatio(1); G.r.setSize(1024, 576, false); G.cv = cv;
    G.s = new T.Scene();
    // céu de pôr do sol (degradê pintado numa tela)
    const sk = document.createElement('canvas'); sk.width = 4; sk.height = 256; const sg = sk.getContext('2d'), gr = sg.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#3a2f7a'); gr.addColorStop(.45, '#c05a9a'); gr.addColorStop(.75, '#ff9a62'); gr.addColorStop(1, '#ffd89a'); sg.fillStyle = gr; sg.fillRect(0, 0, 4, 256);
    G.s.background = new T.CanvasTexture(sk); G.s.background.colorSpace = T.SRGBColorSpace;
    G.s.fog = new T.Fog(0xf5a07a, 60, 160);
    G.cam = new T.PerspectiveCamera(46, 16 / 9, .3, 400);
    G.s.add(new T.HemisphereLight(0xfff2e6, 0x8a6a5a, 1.6)); const sun = new T.DirectionalLight(0xffc89a, 2.2); sun.position.set(-30, 25, -40); G.s.add(sun);
    const grad = new T.DataTexture(new Uint8Array([120, 190, 255]), 3, 1, T.RedFormat); grad.minFilter = grad.magFilter = T.NearestFilter; grad.needsUpdate = true;
    const toon = (c, o = {}) => new T.MeshToonMaterial({ color: c, gradientMap: grad, ...o });
    // areia com textura feita na hora
    const st = document.createElement('canvas'); st.width = st.height = 256; const sx = st.getContext('2d'); sx.fillStyle = '#efd3a2'; sx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { sx.fillStyle = i % 3 ? 'rgba(150,100,60,.12)' : 'rgba(255,240,210,.25)'; sx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5); }
    const stex = new T.CanvasTexture(st); stex.wrapS = stex.wrapT = T.RepeatWrapping; stex.repeat.set(30, 30); stex.colorSpace = T.SRGBColorSpace;
    const sand = new T.Mesh(new T.PlaneGeometry(140, 140), new T.MeshLambertMaterial({ map: stex })); sand.rotation.x = -Math.PI / 2; G.s.add(sand);
    const sea = new T.Mesh(new T.PlaneGeometry(600, 300), new T.MeshLambertMaterial({ color: 0x5a8fcf, emissive: 0x3a3060 })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, .05, -190); G.s.add(sea);
    const sunD = new T.Mesh(new T.CircleGeometry(9, 32), new T.MeshBasicMaterial({ color: 0xffe0a0, fog: false })); sunD.position.set(-40, 10, -330); G.s.add(sunD);
    // linhas da quadra (fita azul) e a rede
    const line = new T.MeshBasicMaterial({ color: 0x2f6fd0 });
    for (const [w, d, x, z] of [[16.2, .1, 0, -4], [16.2, .1, 0, 4], [.1, 8.1, -8, 0], [.1, 8.1, 8, 0], [.06, 8, 0, 0]]) { const m = new T.Mesh(new T.BoxGeometry(w, .02, d), line); m.position.set(x, .012, z); G.s.add(m); }
    for (const z of [-4.9, 4.9]) { const post = new T.Mesh(new T.CylinderGeometry(.07, .07, 2.9, 10), toon(0xdedede)); post.position.set(0, 1.45, z); G.s.add(post); }
    const nc = document.createElement('canvas'); nc.width = 512; nc.height = 128; const nx = nc.getContext('2d'); nx.strokeStyle = 'rgba(20,20,30,.85)'; nx.lineWidth = 2;
    for (let x = 0; x <= 512; x += 12) { nx.beginPath(); nx.moveTo(x, 0); nx.lineTo(x, 128); nx.stroke(); } for (let y = 14; y <= 128; y += 12) { nx.beginPath(); nx.moveTo(0, y); nx.lineTo(512, y); nx.stroke(); }
    nx.fillStyle = '#ffffff'; nx.fillRect(0, 0, 512, 14); nx.fillRect(0, 122, 512, 6); const ntex = new T.CanvasTexture(nc); ntex.colorSpace = T.SRGBColorSpace;
    const net = new T.Mesh(new T.PlaneGeometry(8.6, 1), new T.MeshBasicMaterial({ map: ntex, transparent: true, side: T.DoubleSide })); net.rotation.y = Math.PI / 2; net.position.set(0, V3.net - .5, 0); G.s.add(net);
    for (const z of [-4.02, 4.02]) { const an = new T.Mesh(new T.CylinderGeometry(.025, .025, 1.6, 6), new T.MeshBasicMaterial({ color: 0xe0453c })); an.position.set(0, V3.net + .3, z); G.s.add(an); }
    // coqueiros simples e a bola
    for (const [x, z, h] of [[-16, -8, 7], [17, -9, 8], [-20, 6, 6], [14, -14, 7.5]]) { const tr = new T.Mesh(new T.CylinderGeometry(.18, .28, h, 8), toon(0x7a5233)); tr.position.set(x, h / 2, z); tr.rotation.z = .12; G.s.add(tr); for (let k = 0; k < 6; k++) { const lf = new T.Mesh(new T.BoxGeometry(3.4, .08, .7), toon(0x3d8a4a)); lf.position.set(x + .5 + Math.cos(k) * 1.4, h + .1, z + Math.sin(k) * 1.4); lf.rotation.set(0, -k, -.35); G.s.add(lf); } }
    const bc = document.createElement('canvas'); bc.width = 256; bc.height = 128; const bx = bc.getContext('2d'); for (let i = 0; i < 6; i++) { bx.fillStyle = ['#ffd84a', '#2f6fd0', '#ffffff'][i % 3]; bx.fillRect(i * 256 / 6, 0, 256 / 6 + 1, 128); }
    const btex = new T.CanvasTexture(bc); btex.colorSpace = T.SRGBColorSpace;
    G.ball = new T.Mesh(new T.SphereGeometry(V3.r, 24, 16), toon(0xffffff, { map: btex })); G.s.add(G.ball);
    const ink = new T.Mesh(new T.SphereGeometry(V3.r * 1.08, 16, 12), new T.MeshBasicMaterial({ color: 0x1b1f4f, side: T.BackSide })); G.ball.add(ink);
    const shm = new T.MeshBasicMaterial({ color: 0x3a2214, transparent: true, opacity: .32, depthWrite: false });
    G.bsh = new T.Mesh(new T.CircleGeometry(V3.r, 20), shm); G.bsh.rotation.x = -Math.PI / 2; G.s.add(G.bsh);
    G.mark = new T.Mesh(new T.RingGeometry(.32, .42, 28), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8, depthWrite: false })); G.mark.rotation.x = -Math.PI / 2; G.s.add(G.mark);
    // personagens: recortes de papel com as pranchas pintadas
    G.chars = [0, 1].map(() => {
      const c = document.createElement('canvas'); c.width = 320; c.height = 320; const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
      const m = new T.Mesh(new T.PlaneGeometry(2.8, 2.8), new T.MeshBasicMaterial({ map: tex, alphaTest: .5, side: T.DoubleSide })); G.s.add(m);
      const sh = new T.Mesh(new T.CircleGeometry(.6, 20), shm); sh.rotation.x = -Math.PI / 2; sh.scale.set(1.3, .7, 1); G.s.add(sh);
      return { c, g: c.getContext('2d'), tex, m, sh };
    });
    volei3d.G = G;
  },
  // escolhe o desenho da prancha de cada personagem (mesmos nomes do vôlei 2D)
  frameOf(p, tt) {
    if (this.over || (this.state === 'point' && this.st > .3)) { const won = this.over ? this.sc[p.i] > this.sc[1 - p.i] : this.lastW === p.i; return [won ? 'party' : 'sad', Math.min(15, Math.floor((this.over ? this.overT : this.st - .3) * 12))]; }
    if (this.state === 'serve' && this.server === p.i && !this.b.held) return ['serve', Math.min(39, Math.floor((p.serveT || 0) / .9 * 30))];
    if (p.touchK === 'serve' && p.touchT < .35) return ['serve', Math.min(39, 30 + Math.floor(p.touchT / .35 * 9))];
    if (p.dive > 0 || p.down > 0) return ['dive', Math.min(31, Math.floor((.45 - p.dive + (p.down > 0 ? .45 - p.down : 0)) / .9 * 31))];
    if (p.touchK === 'spike' && p.touchT < .35) return ['spike', Math.min(23, 14 + Math.floor(p.touchT / .35 * 9))];
    if (!p.g) return p.arm > 0 ? ['spike', Math.min(13, Math.floor((.4 - p.arm) / .4 * 13))] : ['jump', clamp(Math.floor((1 - (p.vy + V3.jump) / (2 * V3.jump)) * 23), 0, 23)];
    if ((p.touchK === 'set' || p.touchK === 'bump') && p.touchT < .3) return [p.touchK, Math.min(15, 5 + Math.floor(p.touchT / .3 * 10))];
    const sp = Math.hypot(p.vx, p.vz);
    if (sp > .8) { const back = p.vx * p.f < -.5 && Math.abs(p.vx) > Math.abs(p.vz); return back ? ['back', Math.floor(p.ph * 1.4) % 8] : ['run', Math.floor(p.ph * 2.2) % 16]; }
    return ['ready', Math.floor(tt * 8) % 8];
  },
  toScreen(x, y, z) { const v = new THREE.Vector3(x, y, z).project(this.G.cam); return v.z > 1 ? null : [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; },
  draw(tt) {
    if (this.no3d || !this.G) { R(0, 0, W, H, '#f0a070'); ctx.fillStyle = NAVY; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Este aparelho não conseguiu abrir o 3D.', W / 2, H / 2); ctx.textAlign = 'left'; return; }
    const G = this.G, b = this.b;
    // câmera de transmissão: de lado e do alto, acompanhando a bola de leve
    const cx = clamp(b.x * .35, -3, 3); G.camX = (G.camX ?? cx) + (cx - (G.camX ?? cx)) * .06;
    G.cam.position.set(G.camX, 4.6, 12.8); G.cam.lookAt(G.camX * .92, 1.5, -1.2);
    G.ball.position.set(b.x, b.y, b.z); G.ball.rotation.z = -b.rot * Math.sign(b.vx || 1); G.ball.rotation.x = b.rot * .3;
    G.bsh.position.set(b.x, .02, b.z); const hk = clamp(1 - b.y / 8, .35, 1); G.bsh.scale.setScalar(hk * 1.2); G.bsh.material.opacity = .32 * hk;
    const L = b.land; G.mark.visible = !!L && this.state === 'rally'; if (L) { G.mark.position.set(L.x, .03, L.z); G.mark.material.color.setHex(L.x < 0 ? 0x8fdcff : 0xff9ac4); G.mark.scale.setScalar(1 + .08 * Math.sin(tt * 8)); }
    // personagens: desenha a prancha na tela de cada um e vira o recorte para a câmera
    const camYaw = Math.atan2(G.cam.position.x, G.cam.position.z);
    for (const p of this.P) {
      const C = G.chars[p.i], fr = window.__fr && window.__fr[p.i ? 'bl' : 'ia'], [an, k] = this.frameOf(p, tt);
      C.g.setTransform(1, 0, 0, 1, 0, 0); C.g.clearRect(0, 0, 320, 320);
      if (fr) { const save = ctx; ctx = C.g; try { ctx.translate(160, 300); ctx.scale(3.75, 3.75); fr(an, k, 'g', p.ex || ((b.x < 0) === (p.i === 0) && this.state === 'rally' ? 5 : 0), p.i === 1); } catch (e) { /* carregando */ } finally { ctx = save; } }
      C.tex.needsUpdate = true;
      C.m.position.set(p.x, p.y + 1.4 - 20 / 320 * 2.8, p.z); C.m.rotation.set(0, camYaw, 0);
      C.sh.position.set(p.x, .02, p.z); const s = clamp(1 - p.y / 3, .5, 1); C.sh.scale.set(1.3 * s, .7 * s, 1);
    }
    G.r.render(G.s, G.cam);
    ctx.drawImage(G.cv, 0, 0, W, H);
    for (const f of this.fx) { const s = this.toScreen(f.x, f.y, f.z); if (!s) continue; const k = f.t / .8; ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.c || '#fff6d6'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(s[0], s[1], 3 + k * 14, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    const sc = `${this.sc[0]}  ×  ${this.sc[1]}`; R(W / 2 - 26, 6, 52, 14, 'rgba(60,40,30,.85)'); ctx.strokeStyle = NAVY; ctx.lineWidth = 1; ctx.strokeRect(W / 2 - 26, 6, 52, 14);
    ctx.fillStyle = '#fff6d6'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(sc, W / 2, 17); ctx.textAlign = 'left';
  },
};
