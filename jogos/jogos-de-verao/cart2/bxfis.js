  /* ============================================================ BMX: física nova (02/11/2026, pedido do dono: "refazer, como no Hill Climb Racing")
     A bike é um corpo de verdade: centro de massa no alto (no IAmiguinho), duas rodas com suspensão macia (o chão empurra cada roda
     como uma mola: afunda um pouquinho, amortece e devolve), gravidade e inércia de giro. Pedalar empurra pela roda de trás, então
     acelerar forte empina; no ar, ◀ ▶ giram a bike; pousar numa roda só faz a bike bater a outra e balançar, como na vida real.
     Tombo: bater a cabeça no chão, pousar muito torto, no meio da manobra ou cair na vala.
     Pista nova, gerada na hora e cada vez mais difícil: costelinhas, whoops, kickers com vão e morro de pouso, vala de água, morros,
     mesas, vales com saída em rampa, degraus para cima e para baixo e a rampa gigante. A câmera sobe e desce junto nos saltos grandes.
     Medidas da arte: rodas de raio 12,6 com os centros a 12,85 para cada lado do meio da bike (medidos na prancha pedalando). */
  const BXF = {
    G: 300, M: 1, I: 230, CY: 22,              // gravidade, massa, inércia de giro, centro de massa acima da âncora (o pé da bike)
    WR: 12.6, WX: 12.85,                       // roda: raio e distância do meio
    KS: 140, KD: 13, PMAX: 3.2,                // suspensão: mola, amortecedor e o máximo que a roda afunda
    PED: 150, VPED: 235, PUMP: 170, BAL: 4400, BALD: 520, // pedal, pump e o equilíbrio do ciclista no chão            // pedal (força e velocidade máxima pedalando) e pump (▼ na descida)
    HOP: 150, HOP2: 215, CARGA: .25,           // pulo (▲) e pulo carregado (▼ antes)
    ROTA: 8.4, ROTK: 8, ROTD: .2, AJ: 2.4, // giro no ar; AJ: sem ◀ ▶, o ciclista vai alinhando a bike com o chão lá embaixo           // giro no ar: velocidade, quanto responde, quanto demora para parar
    LEAN: 1500, VMAX: 400, RR: .06, AR: .01,   // inclinar no chão, velocidade máxima, atrito no chão e no ar
    HEAD: [2, 21, 7.5],                        // cabeça (em relação ao centro de massa) e raio: se encostar no chão, tombo
    CLEAN: .38, TORTO: 1.1,                    // pouso: limpo até 0,38 rad (22°) fora do chão; tombo acima de 1,1 rad (63°)
  };
  const BXW = [[-BXF.WX, BXF.WR - BXF.CY], [BXF.WX, BXF.WR - BXF.CY]];
  // A PISTA (02/11): a lista dos trechos, na ordem. Fácil de mudar: cada linha é um trecho.
  //   ['plano', comprimento]                      reta
  //   ['descida', comprimento, quanto desce]      desce e arredonda num vale (pega velocidade)
  //   ['ondas', quantas, largura, altura]         ondinhas (fora da pista por enquanto: em alta velocidade viram rampa)
  //   ['salto', altura da rampa, inclinação da ponta, inclinação do pouso, comprimento do pouso]
  //      inclinação = quanto sobe por unidade andada (1,0 = 45°, 1,4 = 54°, 1,8 = 61°); o pouso desce (−0,5 = 27°)
  const BX_PISTA = [
    ['descida', 260, 70],
    ['salto', 18, .9, -.5, 460], ['salto', 20, 1.0, -.5, 480], ['salto', 22, 1.05, -.5, 500],
    ['salto', 24, 1.1, -.55, 540], ['salto', 28, 1.15, -.55, 580],
    ['descida', 220, 60],
    ['salto', 42, 1.4, -.65, 820],                                  // o primeiro salto grande
    ['salto', 22, 1.05, -.5, 500], ['salto', 26, 1.15, -.55, 560],
    ['salto', 30, 1.2, -.6, 640], ['salto', 32, 1.25, -.6, 680],
    ['descida', 260, 90],
    ['salto', 58, 1.6, -.7, 1000],                                  // rampa gigante
    ['salto', 24, 1.1, -.55, 540], ['salto', 32, 1.25, -.6, 680], ['salto', 36, 1.3, -.6, 720],
    ['salto', 40, 1.35, -.65, 800],
    ['descida', 280, 100],
    ['salto', 68, 1.8, -.75, 1150],                                 // rampa gigante maior
  ]; // rodas em relação ao centro de massa (trás, frente)
  if (typeof bmx !== 'undefined') Object.assign(bmx, {
    desc: 'Desça a trilha, voe das rampas e faça manobras. Vale o salto mais longe e mais alto.',
    steps: () => [`Segure ${actName()} para pedalar. ▲ pula; abaixado (▼) um instante antes, pula mais alto. ▼ na descida dá pump.`, `No ar: ◀ ▶ giram a bike; ${touch ? '○ □ △' : 'X C V'} fazem manobras. No chão, ◀ ▶ empinam e inclinam.`, 'Os pontos vêm dos saltos: distância, altura, mortais e manobras. Pouse nas duas rodas na descida; pouso limpo sobe o combo.'],
    gp: 'Controle: ✕ pedala · ▲ pula · ▼ pump na descida · ◀ ▶ empina e gira no ar · ○ □ △ manobras · Start pausa',
    ctl: [['Espaço', 'pedala', 'kb'], ['▲', 'pula (com ▼ antes, mais alto)'], ['▼', 'pump na descida'], ['◀ ▶', 'empina · no ar, gira'], ['X C V', 'no ar: Superman, sem mãos, tailwhip', 'kb'], ['Pedalar', 'pedala', 'touch'], ['○ □ △', 'no ar: manobras', 'touch'], ['Esc', 'pausa', 'kb']],
    pad: { dirs: 'lrud', a: 'Pedalar', b: '○', c: '□', e: '△' },
    init() {
      Object.assign(this, {
        t: 0, left: this.dur, px: 60, py: 0, vx: 70, vy: 0, a: 0, w: 0, pen: [0, 0], cont: [false, false], noC: 0, air: false, carga: 0,
        x: 60, y: 0, ang: 0, lean: 0, rotSum: 0, airT: 0, peak: 0, camH: 0, landT: 0, wobT: 0, pumping: false, pedal: 0, wheel: 0,
        trick: null, airTr: [], lastTr: [], combined: false, crashT: 0, combo: 0, bestCombo: 0, pts: 0, score: 0,
        flips: 0, mans: 0, clean: 0, tombos: 0, dist: 0, bigAir: 0, maxDist: 0, maxAlt: 0, camG: null, zoom: 1, tx0: 0, ty0: 0, topo: 0, tr: [], end: 0, base: 0, fx: [], dust: [], puffs: [],
      });
      this.iPista = 0; this.addSeg(0, 160, 0, 0, 0, 0); this.tr[0].sOut = 0; this.gen(); this.pousa(60, 70);
    },
    demo() { this.pousa(150, 0); this.py += 46; this.a = .35; this.air = true; this.trick = { key: 'b', ...BX_MAN.b, t: .25 }; this.sync(); },
    // ---------- pista (02/11, segunda versão, pedido do dono: "a pista deve dar flow; o que pontua são os saltos e as manobras")
    // Uma trilha que desce sempre: cada trecho é vale → rampa (kicker) → ponta → descida comprida de pouso → próximo vale.
    // A descida de pouso é longa e lisa: saltou curto, cai no começo dela; saltou longe, cai mais embaixo; nos dois casos a
    // bike pousa descendo e não perde velocidade, então sempre dá para pegar o próximo salto. A velocidade vem da descida
    // (e do ✕ e do pump); a rampa é o lugar de pular (▲ na ponta, mais alto). Entre os saltos, às vezes, ondinhas para o pump.
    // Os trechos estão escritos aqui embaixo (BX_PISTA), do mais fácil ao mais difícil; acabou a lista, ela repete maior.
    // Cada ponto da pista tem altura e inclinação; entre dois pontos, curva suave (Hermite). Na ponta da rampa a inclinação
    // muda de repente (de subida para descida): é ali que a bike decola.
    addSeg(x0, x1, h0, h1, s0, s1, lip = false) { this.tr.push({ x0, x1, h0, h1, s0, s1, lip, e: 'h', b: 0 }); this.end = x1; },
    ponto(dx, h1, s1in, s1out = s1in, lip = false) { // novo ponto a dx do último, com altura h1 (relativa ao último) e inclinações
      const L = this.tr[this.tr.length - 1], h0 = L ? L.h1 : 0, s0 = L ? L.sOut : 0;
      this.addSeg(this.end, this.end + dx, h0, h0 + h1, s0, s1in, lip); this.tr[this.tr.length - 1].sOut = s1out;
    },
    h(x) {
      const T = this.tr; let lo = 0, hi = T.length - 1;
      if (x <= T[0].x0) return T[0].h0; if (x >= T[hi].x1) return T[hi].h1;
      while (lo < hi) { const m = (lo + hi + 1) >> 1; if (T[m].x0 <= x) lo = m; else hi = m - 1; }
      const s = T[lo], w = Math.max(1e-6, s.x1 - s.x0), u = clamp((x - s.x0) / w, 0, 1), u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * s.h0 + (u3 - 2 * u2 + u) * w * s.s0 + (-2 * u3 + 3 * u2) * s.h1 + (u3 - u2) * w * s.s1;
    },
    pitAt() { return false; },
    slope(x) { return (this.h(x + .6) - this.h(x - .6)) / 1.2; },
    gen() {
      while (this.end < this.px + W * 2.2) {
        const P = BX_PISTA[this.iPista % BX_PISTA.length], volta = Math.floor(this.iPista / BX_PISTA.length), k = 1 + volta * .15; this.iPista++;
        const [tipo, a, b, c, d] = P;
        if (tipo === 'plano') this.ponto(a, 0, 0);
        else if (tipo === 'descida') { this.ponto(a * .55, -b * .5, -b / a * 1.4); this.ponto(a * .45, -b * .5, 0); } // desce e arredonda no vale
        else if (tipo === 'ondas') { for (let i = 0; i < a; i++) { this.ponto(b * .5, c, 0); this.ponto(b * .5, -c - 4, 0); } }
        else if (tipo === 'salto') {
          // a = altura da rampa, b = inclinação da ponta (tangente), c = inclinação da descida de pouso, d = comprimento do pouso
          const rk = a * k, tl = b, sl = c, L = d * k * 1.3, /* pouso 30% mais comprido: cabe o salto com o pulo na ponta */ wk = rk * 2.2 / tl * 1.3, D = -sl * L * .62;
          this.ponto(wk, rk, tl, sl, true);         // a rampa: do vale (plano) até a ponta, cada vez mais inclinada
          this.ponto(L, -D, 0);                     // o pouso: começa descendo com a inclinação c e arredonda no vale
        }
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
      const F = BXF, L = I.l || (I.ax || 0) < -.35, Rr = I.r || (I.ax || 0) > .35, dir = (L ? 1 : 0) - (Rr ? 1 : 0); this.dirIn = dir; // para o desenho
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
        else { const th = Math.atan(this.slope(this.ondeCai())), e = ((this.a - th) % TAU + TAU * 1.5) % TAU - Math.PI;
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
        const imp = this.carga >= BXF.CARGA, v = imp ? BXF.HOP2 : BXF.HOP;
        this.vy += v; this.w += 1.2; // o pulo empurra para cima (não para trás): na ponta da rampa, voa mais alto sem perder velocidade this.carga = 0; this.py += 1;
        sfx.jump(); if (imp) sfx.whoosh(); this.puff(this.x, this.h(this.x), 5); this.hopT = this.t;
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
      if (!this.air && this.noC > .07) { this.air = true; this.airT = this.noC; this.rotSum = 0; this.peak = 0; this.tx0 = this.x - this.vx * this.noC; this.ty0 = this.y; this.topo = this.y; this.airTr = []; this.combined = false; this.trick = null; sfx.jump(); this.puff(this.x - 8, this.h(this.x - 8), 4); }
      if (this.air) {
        this.airT += dt; this.peak = Math.max(this.peak, this.y - this.h(this.x)); this.topo = Math.max(this.topo, this.y);
        if (!this.trick) for (const key of 'bce') if (I['p' + key]) { this.trick = { key, ...BX_MAN[key], t: 0 }; if (Math.abs(this.rotSum) > .6) this.combined = true; sfx.whoosh(); break; }
        // 02/11 (pedido do dono, como no skate): segurando o botão, a manobra se mantém. Superman e Sem mãos param na pose cheia
        // (o meio da manobra) enquanto segura; o Tailwhip continua girando o quadro (duplo, triplo...). Soltou, a manobra termina.
        // Girando junto (◀ ▶) vira combinada. Pousar segurando (no meio da manobra) é tombo.
        if (this.trick) {
          const tr = this.trick, seg = !!I[tr.key]; if (Math.abs(this.w) > 2) this.combined = true;
          if (tr.k === 'tailwhip') { tr.t += dt; if (tr.t >= tr.d) { if (seg) { tr.n = (tr.n || 1) + 1; tr.t -= tr.d; sfx.tick(); } else { this.airTr.push({ key: tr.key, n: tr.n || 1, hold: 0 }); this.trick = null; sfx.tick(); } } }
          else { const H0 = tr.d * .5; if (seg && tr.t >= H0) { tr.t = H0; tr.hold = (tr.hold || 0) + dt; } else tr.t += dt; if (tr.t >= tr.d) { this.airTr.push({ key: tr.key, n: 1, hold: tr.hold || 0 }); this.trick = null; sfx.tick(); } }
        }
        if (c) this.land();
      }
      const dx = this.x - x0; this.dist += Math.max(0, dx);
      this.pedal += (I.a && c ? 9 : c ? 2 : .5) * dt; this.wheel += dx / 7;
      if (c && !this.air) { const sp = Math.hypot(this.vx, this.vy); if (sp > 150 && Math.random() < dt * sp / 40) this.dust.push({ x: this.x - 12, y: BX.GY - this.h(this.x - 12) - 1, vx: rand(-50, -20), vy: rand(-40, -10), t: 0 }); }
      this.cam(dt); this.gen();
      this.score = Math.floor(this.pts);
      return false;
    },
    ondeCai() { // onde a bike vai tocar o chão se seguir voando (para o ciclista já ir alinhando com aquele pedaço)
      let x = this.px, y = this.py - BXF.CY, vy = this.vy; for (let t = 0; t < 3; t += .03) { vy -= BXF.G * .03; x += this.vx * .03; y += vy * .03; if (y < this.h(x)) return x; } return x;
    },
    cam(dt) {
      // a câmera segue o chão (um pouco à frente: a trilha desce); no ar, se afasta (zoom) conforme a altura, até a metade
      const x = this.crashT > 0 ? this.crashX : this.x, g = (this.h(x) + this.h(x + 120)) / 2, y = this.crashT > 0 ? this.h(x) : this.y;
      if (this.camG == null) this.camG = g; this.camG += (g - this.camG) * Math.min(1, dt * 4); this.camH = this.camG;
      const A = Math.max(0, y - this.camG), zT = clamp(150 / (A + 110), .5, 1); this.zoom = (this.zoom || 1) + (zT - (this.zoom || 1)) * Math.min(1, dt * 5);
    },
    land() {
      this.air = false;
      const th = Math.atan(this.slope(this.x)), diff = ((this.a - th) % TAU + TAU * 1.5) % TAU - Math.PI, airT = this.airT;
      const flips = Math.round(Math.abs(this.rotSum) / TAU), mid = this.trick && this.trick.d - this.trick.t > .06;
      if (airT < .3 && !flips && !this.airTr.length && !this.trick) { this.rotSum = 0; return; } // pulinho: nada a contar
      if (mid) return this.crash('Pousou no meio da manobra');
      if (Math.abs(diff) > BXF.TORTO) return this.crash(Math.abs(this.rotSum) > 2 ? (diff > 0 ? 'Girou demais' : 'Faltou girar') : 'Pousou torto');
      if (this.trick) { this.airTr.push({ key: this.trick.key, n: this.trick.n || 1, hold: this.trick.hold || 0 }); this.trick = null; }
      const clean = Math.abs(diff) <= BXF.CLEAN;
      // o salto: distância (de onde decolou até onde pousou) e altura (acima da ponta da rampa), em metros (10 unidades = 1 m)
      const dm = Math.max(0, (this.x - this.tx0) / 10), am = Math.max(0, (this.topo - this.ty0) / 10);
      this.maxDist = Math.max(this.maxDist || 0, dm); this.maxAlt = Math.max(this.maxAlt || 0, am);
      let base = Math.round(dm * 6 + am * 22), nome = '';
      if (flips) { base += flips * (this.rotSum > 0 ? 300 : 340); this.flips += flips; nome = `${flips > 1 ? flips + ' ' : ''}${this.rotSum > 0 ? 'mortal para trás' : 'mortal para frente'}`; }
      // manobra segurada vale mais pelo tempo segurado (+150% por segundo); cada volta a mais do Tailwhip vale uma inteira
      let tv = 0; for (const m of this.airTr) { tv += BX_MAN[m.key].v * m.n * (1 + 1.5 * m.hold) * (this.lastTr.includes(m.key) ? .5 : 1); this.lastTr = [...this.lastTr.slice(-1), m.key]; }
      if (this.combined && flips) tv *= 1.3; base += Math.round(tv); this.mans += this.airTr.length;
      const NV = ['', '', ' duplo', ' triplo'], nm = (m) => BX_MAN[m.key].nome + (m.n > 1 ? (NV[m.n] || ` ×${m.n}`) : m.hold > .25 ? ' segurado' : '');
      if (this.airTr.length) nome = this.airTr.map(nm).join(' + ') + (nome ? ` + ${nome}` : '');
      const med = `${Math.round(dm)} m${am >= 1 ? ' · ' + Math.round(am) + ' m de altura' : ''}`;
      if (dm >= 40 || am >= 6) this.bigAir++;
      if (clean && (airT > .45 || flips || this.airTr.length)) { this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); this.clean++; }
      const pts = Math.round(base * this.mult() * (clean ? 1 : .5)); this.pts += pts;
      const sy = BX.GY + (this.camH - this.h(this.x)) * (this.zoom || 1);
      if (pts >= 30) { pop(`${clean ? '' : 'Desequilibrou · '}${nome ? nome.charAt(0).toUpperCase() + nome.slice(1) : 'Salto'} +${pts}`, BX.SX, sy - 84, clean ? (flips ? GO : '#ffffff') : '#ffd9a0', true); pop(med, BX.SX, sy - 70, '#bfefff'); }
      if (clean) { this.landT = .3; (flips || this.airTr.length ? sfx.big : sfx.land)(); if (flips) talk(FALA.bmxBom, .5); }
      else { this.wobT = .5; sfx.land(); }
      this.puff(this.x, this.h(this.x), clean ? 5 : 9);
      this.airTr = []; this.combined = false; this.rotSum = 0;
    },
    crash(why, agua = false) {
      this.crashT = 1.3; this.tombos++; this.combo = 0; this.air = false; this.trick = null; this.airTr = [];
      this.sync(); this.crashAng = this.ang; this.crashAgua = agua; this.crashX = this.x; this.crashY = this.y;
      failMsg(why); sfx.crash(); shake = .3; talk(FALA.bmxTombo, .5);
      if (agua) this.fx.push({ k: 'sp3', x: this.x, y: BX.GY - this.h(this.x) + 34, t: 0, d: .7, s: 1 }); else this.puff(this.x, this.h(this.x), 14);
    },
    hud() { const m = this.mult(); return [['Pontos', nf(this.score)], ['Tempo', `${Math.ceil(this.left)}s`, this.left <= 10], ['Combo', `×${String(m).replace('.', ',')}`, m > 1], ['Maior salto', `${Math.round(this.maxDist || 0)} m`]]; },
    stats() { return [`maior salto ${Math.round(this.maxDist || 0)} m · mais alto ${Math.round(this.maxAlt || 0)} m`, `${this.flips} mortais · ${this.mans} manobras · ${this.bigAir} saltos grandes`, `${this.clean} pousos limpos · combo máximo ×${String(1 + .25 * Math.min(8, this.bestCombo)).replace('.', ',')}`, `${this.tombos} tombos`]; },
  });
  window.__BXF = BXF;
