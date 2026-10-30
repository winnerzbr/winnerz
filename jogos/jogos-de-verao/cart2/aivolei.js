/* ============================================================ Vôlei: cérebro novo do Amiguinho (30/10/2026)
   Antes de cada toque ele imagina (simula) para onde a bola vai se ele se posicionar em vários lugares, pulando ou não,
   e escolhe o melhor: mandar para o outro lado longe de você, levantar perto da rede para cortar, ou cortar.
   Assertividade = chance de cada decisão sair certa: 40% no nível mais fácil, 90% no mais difícil
   (de 80% a 95% conforme o placar, com a dificuldade que se adapta). Quando erra, a decisão sai pior:
   lê mal onde a bola cai, se posiciona mal, não corta, mergulha tarde. */
volei.brain0 = volei.brain;
volei.accNow = function () {
  const base = .40 + .50 * clamp(this.baseLvl(), 0, 1), m = this.moody ? (this.mood || 0) : 0;
  return clamp(base + (m > 0 ? .05 * m : .11 * m * (.6 + .4 * base)), .3, .96);
};
// contato com a cabeça/corpo, igual ao do jogo (sem o tremidinho aleatório)
function aiBounce(b, p, i) {
  for (const S of SHAPES) {
    const cx = p.x, cy = p.y + S.dy, dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy), R0 = VRB + S.r;
    if (d >= R0 || d === 0) continue;
    const nx = dx / d, ny = dy / d;
    b.x = cx + nx * (R0 + .5); b.y = cy + ny * (R0 + .5);
    const rvx = b.vx - p.vx, rvy = b.vy - p.vy, vn = rvx * nx + rvy * ny;
    if (vn >= 0 && p.hitT > 0) continue;
    const tx = -ny, ty = nx, vt = rvx * tx + rvy * ty;
    const outN = -Math.min(0, vn) * .32 + S.pop, outT = vt * .55;
    let ox = nx * outN + tx * outT + p.vx * .55, oy = ny * outN + ty * outT + Math.min(0, p.vy) * .35;
    const sp = Math.hypot(ox, oy), lim = clamp(sp, VMIN, VMAX); ox *= lim / sp; oy *= lim / sp;
    b.vx = ox; b.vy = oy; b.spin = clamp(b.spin * .3 + vt * .03, -10, 10);
    return { fwd: !p.g && (i === 0 ? p.vx > 20 : p.vx < -20) };
  }
  return null;
}
function aiMove(p, i, target, dt) {
  const speeding = target !== 0 && (p.vx === 0 || Math.sign(target) === Math.sign(p.vx)) && Math.abs(target) > Math.abs(p.vx);
  const acc = p.g ? (speeding ? 1250 : 1900) : (speeding ? 760 : 520), dv = target - p.vx;
  p.vx += Math.sign(dv) * Math.min(Math.abs(dv), acc * dt); p.x += p.vx * dt;
  const x0 = p.x; p.x = i ? clamp(p.x, VNX + MARGIN, W - 12) : clamp(p.x, 12, VNX - MARGIN); if (p.x !== x0) p.vx = 0;
  if (!p.g) { p.vy += PGRAV * dt; p.y += p.vy * dt; if (p.y >= VGY) { p.y = VGY; p.vy = 0; p.g = true; } }
}
// simula: andar até tx (g = sem pular, j = pula na hora, jf = pula e empurra para a rede) e ver o que a bola faz depois do toque
volei.aiSim = function (i, tx, mode, spd) {
  const b = { ...this.b }, p = { x: this.P[i].x, y: this.P[i].y, vx: this.P[i].vx, vy: this.P[i].vy, g: this.P[i].g, hitT: this.P[i].hitT || 0 };
  const toNet = i ? -1 : 1, mine = (x) => (i ? x > VNX : x < VNX); let mom = this.mom, hit = null, t = 0;
  for (; t < 1.7; t += DT) {
    const bx = b.x - p.x, by = (p.y - 22) - b.y;
    let target = Math.abs(tx - p.x) > 3 ? clamp((tx - p.x) / 14, -1, 1) * 128 * spd : 0;
    if (mode === 'jf' && !p.g && Math.abs(bx) < 40) target = toNet * 128 * spd;
    if (mode !== 'g' && p.g && Math.abs(bx) < 24 && by > 18 && by < 86 && b.vy > -60) { p.vy = -PJUMP; p.g = false; }
    aiMove(p, i, target, DT); p.hitT -= DT;
    ballStep(b, DT * mom);
    if (b.y + VRB >= VGY) return { hit: false, score: mine(b.x) ? -30 : 0 };
    if (!mine(b.x) && b.vx * toNet > 0) return { hit: false, score: 0 };
    hit = aiBounce(b, p, i); if (hit) break;
  }
  if (!hit) return { hit: false, score: -8 };
  if (hit.fwd) mom = MOM_FAST; else if (b.vy < -60 && mom > MOM_BASE) mom = MOM_BASE;
  let cross = false, apex = b.y, vc = 0, t2 = 0;
  for (; t2 < 3; t2 += DT) {
    const was = mine(b.x); ballStep(b, DT * mom); apex = Math.min(apex, b.y);
    if (was && !mine(b.x)) { cross = true; vc = Math.hypot(b.vx, b.vy); }
    if (b.y + VRB >= VGY) break;
  }
  return { hit: true, cross: cross && !mine(b.x), land: b.x, apex, vc, fast: hit.fwd, t: t + t2, tHit: t };
};
// pontua o resultado: passar longe de você vale mais; levantar alto perto da rede (para cortar) também
volei.aiScore = function (i, r, n) {
  if (!r.hit) return r.score;
  const opp = this.P[1 - i], netD = Math.abs(r.land - VNX);
  if (r.cross) return 20 + Math.min(8, r.vc / 50) + Math.min(6, Math.abs(r.land - opp.x) / 25) + (r.fast ? 3 : 0) + (r.apex > VNT - 60 ? 2 : 0);
  if (n >= 3) return -25;
  if (r.apex < VNT - 22 && netD > 14 && netD < 85) return 12 + (r.apex < VNT - 50 ? 2 : 0) - Math.abs(netD - 40) / 20; // levantada boa para cortar
  if (r.t > .8) return 3 - netD / 50;
  return -12;
};
// a cortada a partir de um estado imaginado (igual à spikeSim do jogo, mas com posições dadas)
volei.spikeFrom = function (i, p0, b0, pow, g) {
  const p = { ...p0 }, b = { ...b0 }, face = i ? -1 : 1;
  for (let t = DT; t <= swingT(false, pow); t += DT) {
    p.vy += PGRAV * DT; p.y += p.vy * DT; p.x += p.vx * DT; if (p.y >= VGY) return null;
    ballStep(b, DT * g); if (b.y + VRB >= VGY) return null;
    for (const P of swingPose(p, face, t, false, pow, b).pts) {
      if (!spikeHit(b, P)) continue;
      const v = Math.hypot(b.vx, b.vy);
      for (let k = 0; k < 240; k++) { ballStep(b, DT); if (b.y + VRB >= VGY) return { good: i ? b.x < VNX : b.x > VNX, v, land: b.x }; }
      return { good: false, v };
    }
  }
  return null;
};
// cortada: em que momento pular (e onde ficar) para a cortada dar certo, sem antes a bola bater na cabeça
volei.aiSpikePlan = function (i, spd, pow) {
  const toNet = i ? -1 : 1, behind = -toNet, mine = (x) => (i ? x > VNX : x < VNX); let best = null;
  const P0 = this.P[i];
  for (const off of [24, 30, 36]) for (let tj = 0; tj <= 1.3; tj += .05) {
    const b = { ...this.b }, p = { x: P0.x, y: P0.y, vx: P0.vx, vy: P0.vy, g: P0.g };
    if (!p.g && tj > 0) break;
    let ok = null;
    for (let t = 0; t < tj + .75; t += DT) {
      const tx = b.x + behind * off, target = Math.abs(tx - p.x) > 2 ? clamp((tx - p.x) / 10, -1, 1) * 128 * spd : 0;
      if (p.g && t >= tj) { p.vy = -PJUMP; p.g = false; }
      aiMove(p, i, target, DT); ballStep(b, DT * this.mom);
      if (b.y + VRB >= VGY || !mine(b.x + toNet * 6)) break;
      const tossing = this.server === i && this.hits === 0 && b.vy < 0 && (this.tossT ?? 9) + t < .6; // a bola do saque subindo não encosta em quem sacou
      if (!tossing && Math.hypot(b.x - p.x, b.y - (p.y + SHAPES[0].dy)) < VRB + SHAPES[0].r + 2) break; // bateria a cabeça antes
      if (!p.g) {
        const e = Math.hypot(b.x - (p.x + toNet * SPK_F.x), b.y - (p.y + SPK_F.y));
        if (e < 24) { const r = this.spikeFrom(i, p, b, pow, this.mom); if (r && r.good && r.v > 250) { ok = { tj, off, tHit: t, v: r.v, land: r.land }; break; } }
      }
    }
    if (ok && (!best || ok.tj < best.tj - 1e-6)) best = ok;
    if (ok) break;
  }
  return best;
};
volei.brain = function (i, dt, A, cfg) {
  if (this.two || i === 0) return this.brain0(i, dt, A, cfg);
  const p = this.P[i], b = this.b, home = i ? W - HOME : HOME, behind = i ? 1 : -1, toNet = -behind;
  const acc = this.accNow(), spd = cfg.spd || 1, side = (x) => (i ? x > VNX : x < VNX);
  const lerp = (a, c) => a + (c - a) * clamp((acc - .4) / .5, 0, 1);
  // um sorteio por lance: esta jogada sai certa ou não
  const ev = `${this.rallies}:${this.hits}`;
  if (A.ev !== ev) {
    A.ev = ev; A.good = Math.random() < acc; A.read = A.good ? rand(-1, 1) * lerp(6, 1) : rand(-1, 1) * lerp(42, 16);
    A.bias = rand(-1, 1) * lerp(26, 10); A.spUse = Math.random() < Math.pow(acc, 2.5); A.diveOK = Math.random() < acc; A.plan = null; A.t = 0;
  }
  const out = { l: false, r: false, u: false, ax: 0, d: false, dir: 0, sp: false, pow: .5 + .45 * clamp(acc, 0, 1) };
  const steer = (tx, k = 14) => { const dx = tx - p.x; if (Math.abs(dx) > 3) { out.ax = clamp(dx / k, -1, 1); out.l = dx < 0; out.r = dx > 0; } };
  // ---------- saque dele
  if (this.server === i && this.hits === 0 && (this.state === 'serve' || (this.state === 'rally' && (this.tossT ?? 9) < 2.5))) {
    if (A.srvFor !== this.rallies) {
      A.srvFor = this.rallies; A.srvSpike = Math.random() < clamp((acc - .5) * 1.6, 0, .75);
      if (this.held) { this.aiServe.hold = A.srvSpike ? rand(.5, .62) : rand(.1, .35); }
    }
    if (this.held) return out;
    if (A.srvSpike) {
      A.t -= dt;
      if (!A.plan || A.t <= 0) { A.t = .08; const sp = p.g ? this.aiSpikePlan(i, spd, out.pow) : null; if (sp) A.plan = { k: 'sp', jt: sp.tj, off: sp.off, t0: this.t }; else if (!A.plan || p.g) A.plan = { k: 'srv' }; }
      if (A.plan.k === 'sp') {
        steer(b.x + behind * A.plan.off, 10);
        if (p.g && this.t - A.plan.t0 >= A.plan.jt - 1e-6) out.u = true;
        if (!p.g && !p.sw && !p.swUsed) { const r = this.spikeSim(i, out.pow); if (r && r.good && r.v > 250) out.sp = true; }
        if (!p.g || A.plan.jt < .6) return out;
      }
    }
    // saque de toque: fica embaixo da bola (o lugar onde ela cai do outro lado é escolhido no toque)
    const pr = this.predict(VGY - 46); steer(pr.x + behind * rand(1, 3));
    out.u = p.g && Math.abs(b.x - p.x) < 24 && (p.y - 22) - b.y > 18 && (p.y - 22) - b.y < 86 && b.vy > -60;
    return out;
  }
  if (this.state === 'serve') { steer(home); return out; }
  // ---------- rali
  const pr = this.predict(VGY - 46), x0 = pr.x + A.read, mine = side(x0);
  // peixinho: a bola vai cair longe demais para chegar andando → mergulha para o lado em que ela VAI cair
  if (p.g && !p.dv && b.vy > 30 && side(b.x) && mine) {
    const land = this.predict(VGY - VRB - 2), lx = land.x + A.read * .5, dist = lx - p.x;
    if (land.t < .34 && Math.abs(dist) > 128 * spd * land.t + 8 && Math.abs(dist) < 80) {
      if (A.diveOK) { out.d = true; out.dir = Math.sign(dist); return out; }
    }
  }
  if (!mine) {
    // bloqueio: lê o ataque perto da rede
    const atk = this.P[1 - i], threat = Math.abs(b.x - VNX) < 70 && b.y < VNT - 6 && Math.abs(atk.x - VNX) < 70 && (!atk.g || atk.ch || atk.sw);
    if (threat && A.blkRoll !== this.hits) { A.blkRoll = this.hits; A.blkOK = Math.random() < cfg.block * (.6 + .4 * acc); }
    if (threat && A.blkOK) {
      const tx = VNX + behind * (MARGIN + 2); steer(tx);
      out.u = p.g && Math.abs(p.x - tx) < 8 && ((Math.abs(b.x - VNX) < 46 && b.y < VNT) || ((atk.ch || atk.sw) && Math.abs(atk.x - VNX) < 60 && Math.abs(b.x - VNX) < 70));
      return out;
    }
    // espera: quem é bom já se coloca no meio da quadra, um pouco mais para trás quando você está perto da rede para atacar
    const deep = Math.abs(atk.x - VNX) < 80 ? 12 : 0; steer(home + toNet * lerp(30, 14) + behind * deep);
    return out;
  }
  // a bola é dele: escolhe a jogada (refaz a conta de tempos em tempos, com o atraso de reação do nível)
  A.t -= dt;
  if (!A.plan || A.t <= 0) {
    A.t = cfg.react * .6 + rand(0, .04);
    const n = this.touches[i] + 1, cands = [];
    const sp = n <= 3 && A.spUse && p.g ? this.aiSpikePlan(i, spd, out.pow) : null;
    for (const off of [-14, -10, -6, -3, 0, 3, 6, 10, 14, 18, 22]) for (const mode of ['g', 'j', 'jf']) {
      const tx = clamp(x0 + behind * off, i ? VNX + MARGIN : 14, i ? W - 14 : VNX - MARGIN), r = this.aiSim(i, tx, mode, spd);
      cands.push({ k: mode, tx, s: this.aiScore(i, r, n) });
    }
    cands.sort((a, c) => c.s - a.s);
    let pick = cands[0];
    if (sp && cands[0].s < 34) pick = { k: 'sp', jt: sp.tj, off: sp.off, t0: this.t, s: 30 };
    if (!A.good) {
      // jogada errada: posição torta e escolha pior (às vezes nem pula)
      const bad = cands[Math.min(cands.length - 1, 5 + Math.floor(Math.random() * 16))];
      pick = { k: Math.random() < .5 ? 'g' : bad.k, tx: clamp(bad.tx + A.bias, i ? VNX + MARGIN : 14, i ? W - 14 : VNX - MARGIN), s: bad.s };
    }
    // já no ar com a cortada combinada: não troca de ideia no meio do pulo
    if (!(A.plan && A.plan.k === 'sp' && !p.g)) A.plan = pick;
  }
  const P = A.plan;
  if (P.k === 'sp') {
    steer(b.x + behind * (P.off || 30), 10);
    if (p.g && this.t - P.t0 >= P.jt - 1e-6) out.u = true;
  } else {
    steer(P.tx);
    const bx = b.x - p.x, by = (p.y - 22) - b.y;
    if (P.k !== 'g') out.u = p.g && Math.abs(bx) < 24 && by > 18 && by < 86 && b.vy > -60;
    if (P.k === 'jf' && !p.g && Math.abs(bx) < 40) { out.ax = toNet; out.l = toNet < 0; out.r = toNet > 0; }
  }
  // no ar: se dá para cortar (e ele decidiu usar a cortada neste lance), corta
  if (!p.g && !p.sw && !p.swUsed && this.touches[i] < 3 && (P.k === 'sp' || A.spUse) && Math.abs(p.x - VNX) < 120) {
    const r = this.spikeSim(i, out.pow); if (r && r.good && r.v > 250) out.sp = true;
  }
  return out;
};
// saque de toque: quem joga bem manda a bola rápida e longe de você (no fundo, ou curtinha e baixa se você está lá atrás)
volei.aiServeShot = function (b, cfg) {
  const acc = this.accNow(), P0 = this.P[0], good = Math.random() < acc;
  const far = P0.x > VNX * .42 ? rand(.08, .3) * VNX : rand(.55, .75) * VNX;
  const tx = clamp((good ? far : rand(.2, .8) * VNX) + rand(-1, 1) * (good ? 6 : 26), 16, VNX - 14);
  for (let T = 1.05 - .5 * clamp((acc - .4) / .5, 0, 1) + rand(0, .1); T < 2.6; T += .04) {
    const vx = (tx - b.x) / T, vy = (VGY - VRB - b.y - .5 * VG * T * T) / T, tn = (VNX - b.x) / vx, yn = b.y + vy * tn + .5 * VG * tn * tn;
    if (yn < VNT - VRB - 4 && Math.hypot(vx, vy) < 430) { b.vx = vx; b.vy = vy; b.spin = 0; this.mom = this.momTo = MOM_BASE; return; }
  }
};
