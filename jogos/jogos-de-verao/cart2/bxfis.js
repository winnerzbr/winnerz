  /* ============================================================ BMX: física nova (02/11/2026, pedido do dono: "refazer, como no Hill Climb Racing")
     A bike é um corpo de verdade: centro de massa no alto (no IAmiguinho), duas rodas com suspensão macia (o chão empurra cada roda
     como uma mola: afunda um pouquinho, amortece e devolve), gravidade e inércia de giro. Pedalar empurra pela roda de trás, então
     acelerar forte empina; no ar, ◀ ▶ giram a bike; pousar numa roda só faz a bike bater a outra e balançar, como na vida real.
     Tombo: bater a cabeça no chão, pousar muito torto, no meio da manobra ou cair na vala.
     Pista nova, gerada na hora e cada vez mais difícil: costelinhas, whoops, kickers com vão e morro de pouso, vala de água, morros,
     mesas, vales com saída em rampa, degraus para cima e para baixo e a rampa gigante. A câmera sobe e desce junto nos saltos grandes.
     Medidas da arte: rodas de raio 12,6 com os centros a 12,85 para cada lado do meio da bike (medidos na prancha pedalando). */
  const BXF = {
    G: 400, M: 1, I: 230, CY: 22,              // gravidade, massa, inércia de giro, centro de massa acima da âncora (o pé da bike)
    WR: 12.6, WX: 12.85,                       // roda: raio e distância do meio
    KS: 170, KD: 15, PMAX: 3.2,                // suspensão: mola, amortecedor e o máximo que a roda afunda
    PED: 150, VPED: 235, PUMP: 170, BAL: 4400, BALD: 520, // pedal, pump e o equilíbrio do ciclista no chão            // pedal (força e velocidade máxima pedalando) e pump (▼ na descida)
    HOP: 150, HOP2: 215, CARGA: .25,           // pulo (▲) e pulo carregado (▼ antes)
    ROTA: 8.4, ROTK: 8, ROTD: .2, AJ: 2.4, // giro no ar; AJ: sem ◀ ▶, o ciclista vai alinhando a bike com o chão lá embaixo           // giro no ar: velocidade, quanto responde, quanto demora para parar
    LEAN: 1500, VMAX: 430, RR: .22, AR: .02,   // inclinar no chão, velocidade máxima, atrito no chão e no ar
    HEAD: [2, 21, 7.5],                        // cabeça (em relação ao centro de massa) e raio: se encostar no chão, tombo
    CLEAN: .38, TORTO: 1.1,                    // pouso: limpo até 0,38 rad (22°) fora do chão; tombo acima de 1,1 rad (63°)
  };
  const BXW = [[-BXF.WX, BXF.WR - BXF.CY], [BXF.WX, BXF.WR - BXF.CY]]; // rodas em relação ao centro de massa (trás, frente)
  if (typeof bmx !== 'undefined') Object.assign(bmx, {
    desc: 'Pedale, pule nas rampas, gire no ar e pouse nas duas rodas.',
    steps: () => [`Segure ${actName()} para pedalar. ▲ pula; abaixado (▼) um instante antes, pula mais alto. ▼ na descida dá pump.`, `No ar: ◀ ▶ giram a bike; ${touch ? '○ □ △' : 'X C V'} fazem manobras. No chão, ◀ ▶ empinam e inclinam.`, 'Pouse nas duas rodas e não bata a cabeça. Pouso limpo sobe o combo.'],
    gp: 'Controle: ✕ pedala · ▲ pula · ▼ pump na descida · ◀ ▶ empina e gira no ar · ○ □ △ manobras · Start pausa',
    ctl: [['Espaço', 'pedala', 'kb'], ['▲', 'pula (com ▼ antes, mais alto)'], ['▼', 'pump na descida'], ['◀ ▶', 'empina · no ar, gira'], ['X C V', 'no ar: Superman, sem mãos, tailwhip', 'kb'], ['Pedalar', 'pedala', 'touch'], ['○ □ △', 'no ar: manobras', 'touch'], ['Esc', 'pausa', 'kb']],
    pad: { dirs: 'lrud', a: 'Pedalar', b: '○', c: '□', e: '△' },
    init() {
      Object.assign(this, {
        t: 0, left: this.dur, px: 60, py: 0, vx: 70, vy: 0, a: 0, w: 0, pen: [0, 0], cont: [false, false], noC: 0, air: false, carga: 0,
        x: 60, y: 0, ang: 0, lean: 0, rotSum: 0, airT: 0, peak: 0, camH: 0, landT: 0, wobT: 0, pumping: false, pedal: 0, wheel: 0,
        trick: null, airTr: [], lastTr: [], combined: false, crashT: 0, combo: 0, bestCombo: 0, pts: 0, score: 0,
        flips: 0, mans: 0, clean: 0, tombos: 0, dist: 0, bigAir: 0, tr: [], end: 0, base: 0, fx: [], dust: [], puffs: [],
      });
      this.addSeg(0, 220, 0, 0, 'lin'); this.gen(); this.pousa(60, 70);
    },
    demo() { this.pousa(150, 0); this.py += 46; this.a = .35; this.air = true; this.trick = { key: 'b', ...BX_MAN.b, t: .25 }; this.sync(); },
    // ---------- pista: segmentos com curva (lin, cos, in = vai ficando íngreme, out = começa íngreme); lip = ponta de rampa (tábua)
    addSeg(x0, x1, h0, h1, e, pit = false, lip = false) { this.tr.push({ x0, x1, h0, h1, e, pit, lip, b: this.base }); this.end = x1; },
    seg(w, h1, e = 'cos', o = {}) { const h0 = this.tr.length ? this.tr[this.tr.length - 1].h1 : 0; this.addSeg(this.end, this.end + w, h0, h1, e, !!o.pit, !!o.lip); },
    h(x) {
      const T = this.tr; let lo = 0, hi = T.length - 1;
      if (x <= T[0].x0) return T[0].h0; if (x >= T[hi].x1) return T[hi].h1;
      while (lo < hi) { const m = (lo + hi + 1) >> 1; if (T[m].x0 <= x) lo = m; else hi = m - 1; }
      const s = T[lo], u = clamp((x - s.x0) / Math.max(1e-6, s.x1 - s.x0), 0, 1);
      const k = s.e === 'cos' ? (1 - Math.cos(u * Math.PI)) / 2 : s.e === 'in' ? u * u : s.e === 'out' ? 1 - (1 - u) * (1 - u) : u;
      return s.h0 + (s.h1 - s.h0) * k;
    },
    pitAt(x) { return this.tr.some((s) => s.pit && x >= s.x0 && x <= s.x1); },
    slope(x) { return (this.h(x + .6) - this.h(x - .6)) / 1.2; },
    gen() {
      while (this.end < this.px + W * 1.8) {
        const d = clamp(this.t / 50 + this.end / 14000, 0, 1), b = this.base, run = (w) => this.seg(w, b, 'lin');
        const P = [['rollers', 2], ['whoops', .8], ['kicker', 2.6], ['morro', 1.4], ['mesa', 1.2], ['vale', 1.5], ['degrau', 1.1]];
        if (this.end > 900) P.push(['agua', 1 + 2 * d]); if (this.end > 1800) P.push(['mega', .5 + 1.6 * d]);
        let r = Math.random() * P.reduce((q, [, w]) => q + w, 0), k = P[0][0]; for (const [n, w] of P) { r -= w; if (r <= 0) { k = n; break; } }
        if (k === 'rollers') { const n = 2 + Math.floor(rand(0, 3)), hh = rand(9, 14); for (let i = 0; i < n; i++) { this.seg(34, b + hh); this.seg(34, b); } }
        else if (k === 'whoops') { const n = 5 + Math.floor(rand(0, 3)); for (let i = 0; i < n; i++) { this.seg(15, b + rand(5, 7)); this.seg(15, b); } }
        else if (k === 'kicker') {
          // kicker com vão e morro de pouso (a descida do morro é o lugar certo para pousar)
          const hk = 18 + d * 14 + rand(0, 6), g = 30 + d * 60 + rand(0, 20);
          run(40); this.seg(50, b + hk, 'in', { lip: true }); this.seg(5, b, 'lin'); run(g); this.seg(hk * 1.7, b + hk * .8); this.seg(12, b + hk * .8, 'lin'); this.seg(90 + hk, b); // face do morro de pouso: dá para subir
        } else if (k === 'agua') {
          const hh = 24 + d * 10, gap = 36 + d * 54 + rand(0, 10);
          run(50); this.seg(50, b + hh, 'in', { lip: true }); this.seg(2, b - 64, 'lin'); this.seg(gap, b - 64, 'lin', { pit: true }); this.seg(2, b + hh - 4, 'lin'); this.seg(80, b);
        } else if (k === 'morro') { const hh = 30 + d * 26; this.seg(rand(90, 120), b + hh); this.seg(rand(130, 170), b); }
        else if (k === 'mesa') { const hh = 24 + d * 14; run(30); this.seg(50, b + hh, 'in', { lip: true }); this.seg(rand(60, 110), b + hh, 'lin'); this.seg(70, b); }
        else if (k === 'vale') {
          // depressão: desce, e a saída vira rampa (quanto mais rápido, mais alto)
          const hv = rand(24, 40), hq = 6 + d * 14, wq = (hv + hq) * 1.5; this.seg(rand(70, 90), b - hv); this.seg(wq, b + hq, 'in', { lip: true }); this.seg(34, b); // saída: no máximo ~53° na ponta
        } else if (k === 'degrau') {
          if (b < 40 && (b < -10 || Math.random() < .5)) { this.seg(40, b + 24); this.base = b + 24; }
          else { run(20); this.seg(5, b - 26, 'lin'); this.base = b - 26; } // degrau para baixo: um penhasco curto, salta da beira
        } else if (k === 'mega') {
          // rampa gigante: desce para pegar velocidade, sobe íngreme e voa; o pouso é a descida comprida do outro lado
          const g = 110 + d * 70; this.seg(130, b - 34); this.seg(72, b + 34, 'in', { lip: true }); this.seg(5, b - 34, 'lin');
          this.seg(g, b - 34, 'lin'); this.seg(80, b + 8); this.seg(180, b - 34); this.seg(80, b);
        }
        run(Math.max(30, 70 - d * 30) + rand(0, 30) * (1 - d));
      }
      while (this.tr.length > 4 && this.tr[1].x1 < this.px - W) this.tr.shift();
    },
    // ---------- corpo
    rot(lx, ly) { const c = Math.cos(this.a), s = Math.sin(this.a); return [lx * c - ly * s, lx * s + ly * c]; },
    pousa(x, v) { // põe a bike parada em pé no chão em x (com velocidade v ao longo do chão)
      const th = Math.atan(this.slope(x)); this.a = th; this.w = 0;
      const [ox, oy] = this.rot(0, BXF.CY); this.px = x + ox; this.py = this.h(x) + oy + 1.3;
      this.vx = v * Math.cos(th); this.vy = v * Math.sin(th); this.pen = [0, 0]; this.cont = [false, false]; this.noC = 0; this.air = false; this.sync();
    },
    sync() { // âncora (o pé da bike, entre as rodas) para o desenho e o resto do jogo
      const [ox, oy] = this.rot(0, -BXF.CY); this.x = this.px + ox; this.y = this.py + oy; this.ang = this.a;
    },
    // menor distância de um ponto ao chão (amostrando a pista); devolve [distância, normal x, normal y, x do contato, altura do contato]
    chao(cx, cy, r) {
      let best = 1e9, bx = cx, by = this.h(cx);
      let x0 = cx - r - 2, y0 = this.h(x0);
      for (let x = x0 + 1; x <= cx + r + 2; x += 1) {
        const y1 = this.h(x), dx = 1, dy = y1 - y0, L2 = dx * dx + dy * dy, u = clamp(((cx - x0) * dx + (cy - y0) * dy) / L2, 0, 1);
        const qx = x0 + dx * u, qy = y0 + dy * u, dd = Math.hypot(cx - qx, cy - qy);
        if (dd < best) { best = dd; bx = qx; by = qy; }
        x0 = x; y0 = y1;
      }
      let nx = (cx - bx) / (best || 1), ny = (cy - by) / (best || 1);
      if (cy < this.h(cx)) { const s = this.slope(cx), L = Math.hypot(1, s); nx = -s / L; ny = 1 / L; best = -best; } // centro abaixo do chão
      return [best, nx, ny, bx, by];
    },
    passo(dt, I) {
      const F = BXF, L = I.l || (I.ax || 0) < -.35, Rr = I.r || (I.ax || 0) > .35, dir = (L ? 1 : 0) - (Rr ? 1 : 0);
      let fx = 0, fy = -F.G * F.M, tq = 0;
      const anyC = this.cont[0] || this.cont[1];
      this.pumping = false;
      for (let i = 0; i < 2; i++) {
        const [rx, ry] = this.rot(...BXW[i]), wx = this.px + rx, wy = this.py + ry;
        const [dd, nx, ny, cxp, cyp] = this.chao(wx, wy, F.WR);
        const pen = F.WR - dd; this.cont[i] = pen > -.4; this.pen[i] = Math.max(0, pen);
        if (pen <= 0) continue;
        // água: a roda encostou no fundo da vala
        if (this.tr.some((s) => s.pit && cxp >= s.x0 && cxp <= s.x1 && cyp < s.b - 20)) { this.crash('Caiu na vala', true); return; }
        // velocidade do ponto da roda
        const vx = this.vx - this.w * ry, vy = this.vy + this.w * rx, vn = vx * nx + vy * ny;
        let N = F.KS * pen - F.KD * vn; if (N < 0) N = 0;
        // fundo da suspensão: não deixa afundar mais que PMAX (corrige a posição e corta a velocidade de entrada)
        if (pen > F.PMAX) {
          const ex = pen - F.PMAX; this.px += nx * ex; this.py += ny * ex;
          if (vn < 0) { const kk = 1 / F.M + Math.pow(rx * ny - ry * nx, 2) / F.I, j = -vn / kk * .9; this.vx += nx * j / F.M; this.vy += ny * j / F.M; this.w += (rx * ny - ry * nx) * j / F.I; }
        }
        let tx = ny, ty = -nx; if (tx < 0) { tx = -tx; ty = -ty; } // tangente para a frente
        let ft = 0;
        if (i === 0 && I.a && !this.trick) { const vt = this.vx * tx + this.vy * ty; ft += F.PED * clamp((F.VPED - vt) / 70, 0, 1); }
        if (I.d && ty < -.12) { ft += F.PUMP * Math.min(1, -ty * 2); this.pumping = true; }
        const cx = (rx - nx * F.WR), cy = (ry - ny * F.WR); // ponto de contato em relação ao centro de massa
        const gx = nx * N, gy = ny * N, dx_ = tx * ft, dy_ = ty * ft; // o pedal empurra pelo eixo da roda (empina pouco); o chão, pelo contato
        fx += gx + dx_; fy += gy + dy_; tq += cx * gy - cy * gx + rx * dy_ - ry * dx_;
      }
      // inclinar (no chão) e girar (no ar)
      if (anyC) {
        // equilíbrio: no chão, sem ◀ ▶, o IAmiguinho joga o peso para manter as duas rodas no chão (alinha a bike com a pista)
        if (!dir) { const th = Math.atan(this.slope(this.px)), e = ((this.a - th) % TAU + TAU * 1.5) % TAU - Math.PI; tq += -F.BAL * clamp(e, -1, 1) - F.BALD * this.w; }
        tq += dir * F.LEAN; this.vx -= this.vx * F.RR * dt; this.vy -= this.vy * F.RR * dt; }
      else {
        if (dir) this.w += (dir * F.ROTA - this.w) * Math.min(1, dt * F.ROTK);
        else { const th = Math.atan(this.slope(this.px + this.vx * .25)), e = ((this.a - th) % TAU + TAU * 1.5) % TAU - Math.PI;
          // perto de em pé (inclusive no fim de um mortal), o ciclista alinha com o chão; longe disso, o giro continua no embalo e vai parando
          if (Math.abs(e) < 1.2 || Math.abs(this.rotSum) < 2.2) this.w += (-e * F.AJ - this.w) * Math.min(1, dt * (Math.abs(this.rotSum) > 2.2 ? 6 : 3)); else this.w *= Math.exp(-dt / F.ROTD); }
        this.vx -= this.vx * F.AR * dt;
      }
      this.vx += fx / F.M * dt; this.vy += fy / F.M * dt; this.w += tq / F.I * dt;
      const sp = Math.hypot(this.vx, this.vy); if (sp > F.VMAX) { this.vx *= F.VMAX / sp; this.vy *= F.VMAX / sp; }
      this.px += this.vx * dt; this.py += this.vy * dt; this.a += this.w * dt;
      if (!anyC) this.rotSum += this.w * dt;
    },
    update(dt, I) {
      this.t += dt; this.left -= dt;
      for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < f.d);
      for (const p of this.puffs) p.t += dt; this.puffs = this.puffs.filter((p) => p.t < p.d);
      for (const p of this.dust) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; } this.dust = this.dust.filter((p) => p.t < .5);
      if (this.left <= 0) { this.left = 0; return true; }
      this.landT = Math.max(0, this.landT - dt); this.wobT = Math.max(0, this.wobT - dt);
      if (this.crashT > 0) {
        this.crashT -= dt;
        if (this.crashT <= 0) {
          // volta num lugar plano logo à frente (depois da vala, se caiu nela)
          let nx = this.crashX; for (const s of this.tr) if (s.pit && nx >= s.x0 - 40 && nx <= s.x1 + 4) nx = s.x1 + 50;
          if (this.lastCrash != null && Math.abs(nx - this.lastCrash) < 60) nx += 160; // caiu de novo no mesmo lugar: volta mais à frente
          this.lastCrash = this.crashX;
          for (let k = 0; k < 300 && (Math.abs(this.slope(nx)) > .2 || this.pitAt(nx) || Math.abs(this.slope(nx + 30)) > .5); k += 4) nx += 4;
          this.trick = null; this.airTr = []; this.combined = false; this.rotSum = 0; this.pousa(nx, 60);
        }
        this.cam(dt); this.gen(); this.score = Math.floor(this.pts); return false;
      }
      // pulo (▲): ▼ segurado um instante antes = pulo mais alto
      const anyC = this.cont[0] || this.cont[1];
      if (anyC && I.d) this.carga += dt; else if (!I.d) this.carga = anyC ? 0 : this.carga;
      if (anyC && I.pu && !this.air) {
        const imp = this.carga >= BXF.CARGA, v = imp ? BXF.HOP2 : BXF.HOP, s = this.slope(this.x), L = Math.hypot(1, s);
        this.vx += -s / L * v; this.vy += 1 / L * v; this.w += 1.6; this.carga = 0; this.py += 1;
        sfx.jump(); if (imp) sfx.whoosh(); this.puff(this.x, this.h(this.x), 5);
      }
      const x0 = this.x, n = 4;
      for (let k = 0; k < n && this.crashT <= 0; k++) this.passo(dt / n, I);
      if (this.crashT > 0) { this.cam(dt); this.gen(); this.score = Math.floor(this.pts); return false; }
      this.sync();
      const c = this.cont[0] || this.cont[1];
      this.noC = c ? 0 : this.noC + dt;
      // parou num buraco ou numa subida que não dá: o IAmiguinho empurra a bike até um lugar plano à frente (sem tombo)
      this.parado = c && Math.hypot(this.vx, this.vy) < 14 ? (this.parado || 0) + dt : 0;
      if (this.parado > 1.4) { let nx = this.x + 40; for (let k = 0; k < 400 && (Math.abs(this.slope(nx)) > .15 || this.pitAt(nx) || Math.abs(this.slope(nx + 40)) > .4); k += 4) nx += 4; this.pousa(nx, 50); this.parado = 0; pop('Empurrou a bike', BX.SX, 90, '#ffd9a0'); }
      // cabeça no chão: tombo
      { const [hx, hy] = this.rot(BXF.HEAD[0], BXF.HEAD[1]), [dd] = this.chao(this.px + hx, this.py + hy, BXF.HEAD[2]); if (dd < BXF.HEAD[2]) { this.crash('Bateu a cabeça'); return false; } }
      if (!this.air && this.noC > .07) { this.air = true; this.airT = this.noC; this.rotSum = 0; this.peak = 0; this.airTr = []; this.combined = false; this.trick = null; sfx.jump(); this.puff(this.x - 8, this.h(this.x - 8), 4); }
      if (this.air) {
        this.airT += dt; this.peak = Math.max(this.peak, this.y - this.h(this.x));
        if (!this.trick) for (const key of 'bce') if (I['p' + key]) { this.trick = { key, ...BX_MAN[key], t: 0 }; if (Math.abs(this.rotSum) > .6) this.combined = true; sfx.whoosh(); break; }
        if (this.trick) { const tr = this.trick; tr.t += dt; if (Math.abs(this.w) > 2) this.combined = true; if (tr.t >= tr.d) { this.airTr.push(tr.key); this.trick = null; sfx.tick(); } }
        if (c) this.land();
      }
      const dx = this.x - x0; this.dist += Math.max(0, dx); this.pts += Math.max(0, dx) / 4;
      this.pedal += (I.a && c ? 9 : c ? 2 : .5) * dt; this.wheel += dx / 7;
      if (c && !this.air) { const sp = Math.hypot(this.vx, this.vy); if (sp > 150 && Math.random() < dt * sp / 40) this.dust.push({ x: this.x - 12, y: BX.GY - this.h(this.x - 12) - 1, vx: rand(-50, -20), vy: rand(-40, -10), t: 0 }); }
      this.cam(dt); this.gen();
      this.score = Math.floor(this.pts);
      return false;
    },
    cam(dt) { const y = this.crashT > 0 ? this.h(this.crashX) : this.y, T = y > 55 ? y - 55 : y < -12 ? y + 12 : 0; this.camH += (T - this.camH) * Math.min(1, dt * 5); },
    land() {
      this.air = false;
      const th = Math.atan(this.slope(this.x)), diff = ((this.a - th) % TAU + TAU * 1.5) % TAU - Math.PI, airT = this.airT;
      const flips = Math.round(Math.abs(this.rotSum) / TAU), mid = this.trick && this.trick.d - this.trick.t > .06;
      if (airT < .22 && !flips && !this.airTr.length && !this.trick) { this.rotSum = 0; return; } // pulinho: nada a contar
      if (mid) return this.crash('Pousou no meio da manobra');
      if (Math.abs(diff) > BXF.TORTO) return this.crash(Math.abs(this.rotSum) > 2 ? (diff > 0 ? 'Girou demais' : 'Faltou girar') : 'Pousou torto');
      if (this.trick) { this.airTr.push(this.trick.key); this.trick = null; }
      const clean = Math.abs(diff) <= BXF.CLEAN;
      let base = Math.round(airT * 80 + this.peak * .8), nome = '';
      if (flips) { base += flips * (this.rotSum > 0 ? 300 : 340); this.flips += flips; nome = `${flips > 1 ? flips + ' ' : ''}${this.rotSum > 0 ? 'mortal para trás' : 'mortal para frente'}`; }
      let tv = 0; for (const key of this.airTr) { tv += BX_MAN[key].v * (this.lastTr.includes(key) ? .5 : 1); this.lastTr = [...this.lastTr.slice(-1), key]; }
      if (this.combined && flips) tv *= 1.3; base += Math.round(tv); this.mans += this.airTr.length;
      if (this.airTr.length) nome = this.airTr.map((k) => BX_MAN[k].nome).join(' + ') + (nome ? ` + ${nome}` : '');
      if (!nome && this.peak > 60) nome = 'Salto gigante';
      if (this.peak > 60) this.bigAir++;
      if (clean && (airT > .45 || flips || this.airTr.length)) { this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); this.clean++; }
      const pts = Math.round(base * this.mult() * (clean ? 1 : .5)); this.pts += pts;
      const sy = BX.GY - this.h(this.x) + this.camH;
      if (pts >= 40) pop(`${nome ? nome.charAt(0).toUpperCase() + nome.slice(1) : clean ? 'Pouso limpo' : 'Ufa'} +${pts}`, BX.SX, sy - 52, clean ? (flips ? GO : '#ffffff') : '#ffd9a0', true);
      if (clean) { this.landT = .3; (flips || this.airTr.length ? sfx.big : sfx.land)(); if (flips) talk(FALA.bmxBom, .5); }
      else { this.wobT = .5; sfx.land(); pop('Desequilibrou', BX.SX, sy - 30, '#ffd9a0'); }
      this.puff(this.x, this.h(this.x), clean ? 5 : 9);
      this.airTr = []; this.combined = false; this.rotSum = 0;
    },
    crash(why, agua = false) {
      this.crashT = 1.3; this.tombos++; this.combo = 0; this.air = false; this.trick = null; this.airTr = [];
      this.sync(); this.crashAng = this.ang; this.crashAgua = agua; this.crashX = this.x; this.crashY = this.y;
      failMsg(why); sfx.crash(); shake = .3; talk(FALA.bmxTombo, .5);
      if (agua) this.fx.push({ k: 'sp3', x: this.x, y: BX.GY - this.base + 34, t: 0, d: .7, s: 1 }); else this.puff(this.x, this.h(this.x), 14);
    },
    stats() { return [`${Math.round(this.dist / 10)} m pedalados`, `${this.flips} mortais · ${this.mans} manobras · ${this.bigAir} saltos gigantes`, `${this.clean} pousos limpos · combo máximo ×${String(1 + .25 * Math.min(8, this.bestCombo)).replace('.', ',')}`, `${this.tombos} tombos`]; },
  });
  window.__BXF = BXF;
