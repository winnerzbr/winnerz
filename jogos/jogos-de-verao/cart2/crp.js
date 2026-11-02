  /* ============================================================ Corrida na areia pintada (02/11/2026)
     O pacote do dono entra no lugar do desenho de 16 bits quando carrega. A corrida (fôlego, pulo, tropeço) não muda.
     Praia da Maré Baixa (crcen.py -> window.CRC): o fundo anda bem devagar; o meio-plano (guarda-sóis com a torcida e o posto de
     salva-vidas) anda pela metade; a areia das raias anda junto com você. 4 horários pelo relógio (perto da troca mistura os dois);
     de noite, a lua e o brilho do mar e a luz do posto por cima (somadas), e um azulado leve sobre as peças e os corredores.
     IAmiguinho (mvcr.py -> window.MVCR): largada, correndo, trotando, pulo da barreira, tropeço e sem fôlego; ganhando, a festa do vôlei.
     Amiguinhos (mvbcr.py -> window.MVB, na cor de cada um): largada, correndo, pulo e tropeço; no fim, festa e tristeza do vôlei. */
  const CRC = window.CRC, MCR = window.MVCR, CRI = {};
  const crImg = (k, src) => { if (!src) return null; let im = CRI[k]; if (!im) { im = CRI[k] = new Image(); im.src = src; } return im.complete && im.naturalWidth ? im : null; };
  const CROK = () => !!CRC && !!crImg('atl', CRC.atl) && !!crImg('f', CRC.f) && !!crImg('a', CRC.areia) && !!crImg('ms', CRC.ms); // cada camada: os 4 horários empilhados (CRC.row)
  window.__CROK = CROK;
  const CRJ = {};
  if (MCR) { CRJ.im = new Image(); CRJ.im.src = MCR.src; CRJ.mk = new Image(); CRJ.mk.src = MCR.mask; }
  const CRIOK = () => !!MCR && CRJ.im.complete && CRJ.im.naturalWidth > 0 && CRJ.mk.complete && CRJ.mk.naturalWidth > 0;
  window.__CRIOK = CRIOK;
  const CR_IA = 46, CR_AM = 30; // altura em pé na raia da frente: IAmiguinho e Amiguinho (o Amiguinho do vôlei tem 34,8)
  const CRK5 = MCR ? CR_IA / MCR.a.trote.f[0].ay : 1;
  let FTCR = null;
  (window.__fr = window.__fr || {})['cr'] = frameCr;
  function frameCr(an, k, ex, s = 1) {
    const A = MCR.a[an], n = A.f.length, f = A.f[((k | 0) % n + n) % n], y0 = A.y || 0;
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.scale(CRK5 * s, CRK5 * s);
    ctx.drawImage(CRJ.im, f.x, y0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    if (f.s && f.sz) {
      if (!FTCR) FTCR = document.createElement('canvas');
      const w = Math.ceil(f.w), h = Math.ceil(f.h);
      if (FTCR.width < w || FTCR.height < h) { FTCR.width = Math.max(FTCR.width, w); FTCR.height = Math.max(FTCR.height, h); }
      const g = FTCR.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, FTCR.width, FTCR.height);
      const cx = f.s[4] ?? (f.s[0] + f.s[2]) / 2, cy = f.s[5] ?? (f.s[1] + f.s[3]) / 2;
      const L1 = f.s[6] || f.sz[0], L2 = f.s[7] || f.sz[1], fk = L2 / 14.5, fkx = clamp(.62 * L1 / (11.6 * fk), .5, 1.3);
      const save = ctx; ctx = g; try { g.save(); g.translate(cx, cy); g.rotate(f.r || 0); glowFace(ex, 0, L2 * .03, fk, fkx); g.restore(); } finally { ctx = save; }
      g.globalCompositeOperation = 'destination-in'; g.drawImage(CRJ.mk, f.x, y0, f.w, f.h, 0, 0, f.w, f.h); g.globalCompositeOperation = 'source-over';
      ctx.drawImage(FTCR, 0, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    }
    ctx.restore();
  }
  const CR_HORAS = [['noite', 5, 'manha'], ['manha', 10, 'dia'], ['dia', 16, 'tarde'], ['tarde', 19, 'noite']];
  function crPesos() {
    const d = new Date(), h = window.__skHora != null ? window.__skHora : d.getHours() + d.getMinutes() / 60;
    for (const [a, b, c] of CR_HORAS) if (Math.abs(h - b) < .5) { const t = h - b + .5; return [[a, 1 - t], [c, t]]; }
    return [[h >= 5 && h < 10 ? 'manha' : h >= 10 && h < 16 ? 'dia' : h >= 16 && h < 19 ? 'tarde' : 'noite', 1]];
  }
  // de noite, um azulado leve por cima das peças e dos corredores (para não ficarem acesos como de dia); de tarde, um dourado leve
  const CR_LUZ = { dia: null, manha: null, tarde: '#ffe9d2', noite: '#b4bce0' };
  // peça do atlas com o pé em by e o meio em cx; em pé: a altura manda e a largura segue o desenho; deitadas (poça, areia fofa, marca): w e h
  const CR_DEIT = new Set(['poca', 'fofa', 'largada']);
  function crPeca(nm, cx, by, w, h) {
    const f = CRC.p[nm], im = crImg('atl', CRC.atl); if (!f || !im) return;
    const hh = h, ww = CR_DEIT.has(nm) ? w : h * f.w / f.h;
    ctx.drawImage(im, f.x, 0, f.w, f.h, cx - ww / 2, by - hh, ww, hh);
  }
  // meio-plano: guarda-sóis com a torcida (0), posto (1), quiosque de coco (2), coqueiros (3), rede de vôlei (4); repete a cada 1500.
  // Altura pela prancha (0,1026 por pixel da prancha de 1672, a escala do meio-plano aprovado).
  const CR_MEIO = [{ i: 0, x: 40 }, { i: 3, x: 250 }, { i: 1, x: 400 }, { i: 2, x: 640 }, { i: 4, x: 860 }, { i: 3, x: 1150 }, { i: 0, x: 1290 }], CR_MW = 1500;
  if (typeof obstaculos !== 'undefined') {
    const draw16 = obstaculos.draw, runner16 = obstaculos.runner, ob16 = obstaculos.ob;
    obstaculos.ob = function (nm, cx, by, w, h) { if (!CROK()) return ob16.call(this, nm, cx, by, w, h); crPeca(nm, cx, by, w, h); };
    // 02/11: o desenho de cada obstáculo começa em x (onde começa o contato) e tem a largura de OB_TIPO na raia da frente
    const obst16 = obstaculos.obst, CR_OB = { cerca: ['cerca', 'cerca_caida', 14, 8], tronco: ['tronco', 'tronco', 7, 7], castelo: ['castelo', 'castelo_caido', 20, 9], siri: ['siri0', 'siri0', 8, 8], poca: ['poca', 'poca', 6, 6] };
    obstaculos.obst = function (o, x, gy, sc, tt) {
      if (!CROK()) return obst16.call(this, o, x, gy, sc, tt);
      const q = CR_OB[o.k]; if (!q) return;
      let nm = o.hit ? q[1] : q[0]; if (o.k === 'siri') nm = Math.floor(tt * 8 + o.x) % 2 ? 'siri0' : 'siri1';
      const T = OB_TIPO[o.k], x0 = x + (o.k === 'siri' ? Math.round(o.dx) : 0);
      if (o.k === 'poca') { crPeca('poca', x0 + T.w * sc / 2, gy + 2, T.w * sc, q[2] * sc); return; }
      const f = CRC.p[nm], hh = (o.hit ? q[3] : q[2]) * sc, ww = hh * f.w / f.h;
      crPeca(nm, x0 + ww / 2, gy + 1, ww, hh);
    };
    obstaculos.runner = function (r, sx, gy, sc, tt) {
      const MB = window.MVB, amOK = MB && MB.a.crSprint && MB.a.party && window.__fr && window.__fr.bl && window.__blCor;
      if (!CROK() || (r.me ? !CRIOK() : !amOK)) return runner16.call(this, r, sx, gy, sc, tt);
      const fim = this.st === 'placar' || r.done, pos = fim ? this.posOf(r) : 0, e = this.stT - 2.2, run = r.ph * 2.93;
      let lift = r.y * sc, ex = 0;
      // sombra macia no chão (menor no ar)
      const k0 = clamp(1 - r.y / 30, .4, 1); ctx.save(); ctx.fillStyle = 'rgba(120,70,25,.28)'; ctx.beginPath(); ctx.ellipse(sx, gy + .5, 10 * sc * k0, 2.4 * sc * k0, 0, 0, TAU); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(Math.round(sx * 4) / 4, gy + 1 - lift);
      if (r.me) {
        let an = 'trote', k = run;
        if (this.st === 'pronto') { an = 'largada'; k = Math.floor(tt * 2.5) % 3; ex = 5; }
        else if (r.tropT > 0) { an = 'queda'; k = Math.min(7, Math.floor((1 - r.tropT / (r.slip ? .55 : .8)) * 8)); ex = 3; }
        else if (r.air > 0) { an = 'salto'; k = 1 + Math.floor((1 - r.air / OB.JT) * 5.99); ex = 2; }
        else if (fim && r.v < 1.5) {
          if (pos === 0 && window.__fr.ia) { ctx.scale(CR_IA / 56 * sc, CR_IA / 56 * sc); window.__fr.ia('party', Math.floor(tt * 10) % 16, 'g', 2, false); ctx.restore(); return; }
          an = 'cansado'; k = Math.floor(tt * 7); ex = pos === 3 ? 4 : 0;
        } else if (e >= 0 && e < .5 && !fim) { an = 'largada'; k = 3 + Math.floor(e / .5 * 4.99); ex = 5; }
        else if (r.bufT > 0 && r.v < 4) { an = 'cansado'; k = Math.floor(tt * 7); ex = 4; }
        else if (r.bufT > 0) { an = 'trote'; ex = 4; }
        else if (r.v > 7.6) { an = 'sprint'; ex = r.v > 8.6 ? 5 : 0; }
        frameCr(an, k, ex, sc);
        ctx.restore(); return;
      }
      const old = window.__blCor({ am_roxo: '#9a7cf0', am_laranja: '#f08a3c', am_dourado: '#e8c25a' }[r.key] || '#e86fa8');
      try {
        ctx.scale(CR_AM / 34.8 * sc, CR_AM / 34.8 * sc);
        let an = 'crSprint', k = Math.floor(run) % 8;
        if (this.st === 'pronto') { an = 'crLargada'; k = Math.floor(tt * 2.5 + r.lane) % 3; }
        else if (r.tropT > 0) { an = 'crQueda'; k = Math.min(7, Math.floor((1 - r.tropT / (r.slip ? .55 : .8)) * 8)); ex = 3; }
        else if (r.air > 0) { an = 'crSalto'; k = 1 + Math.floor((1 - r.air / OB.JT) * 5.99); ex = 2; }
        else if (fim && r.v < 1.5) { an = pos === 0 ? 'party' : pos === 3 ? 'sad' : 'idle'; k = Math.floor(tt * 10 + r.lane * 3) % 16; ex = pos === 0 ? 2 : pos === 3 ? 4 : 0; }
        else if (e >= 0 && e < .5 && !fim) { an = 'crLargada'; k = 3 + Math.floor(e / .5 * 4.99); }
        window.__fr.bl(an, k, 'g', ex, false);
      } catch (err) { window.__blCor(old); ctx.restore(); return runner16.call(this, r, sx, gy, sc, tt); }
      window.__blCor(old); ctx.restore();
    };
    obstaculos.draw = function (tt) {
      if (!CROK()) return draw16.call(this, tt);
      const me = this.me(), cam = me.x - OB.SX, P = crPesos().filter(([, w]) => w > .001);
      ctx.save(); ctx.imageSmoothingEnabled = true;
      // fundo distante (céu, mar e areia molhada): quase parado; a beira da areia fica um pouco acima das raias
      const fw = W + 60, fh = fw * 9 / 16, fx = -clamp(cam * .025, 0, 60) /* 02/11: baterias mais longas (até 220 m) */, om = cam * .5, night = P.reduce((q, [h, w]) => q + (h === 'noite' ? w : 0), 0);
      const FI = crImg('f', CRC.f); for (const [h, w] of P) { ctx.globalAlpha = w; ctx.drawImage(FI, 0, CRC.row[h] * 900, 1600, 900, fx, -46, fw, fh); }
      ctx.globalAlpha = 1;
      const LF = night > .01 && crImg('lf', CRC.lf);
      if (LF) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * (.85 + .1 * Math.sin(tt * 1.3)); ctx.drawImage(LF, fx, -46, fw, fh); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      // meio-plano: guarda-sóis com a torcida atrás da corda e o posto de salva-vidas, pela metade da velocidade
      const LM = night > .01 && crImg('lm', CRC.lm);
      for (const q of CR_MEIO) {
        const M = CRC.m[q.i], qh = (M.hs || 429) * .1026, w = qh * M.w / M.h, MS = crImg('ms', CRC.ms);
        let x = ((q.x - om) % CR_MW + CR_MW) % CR_MW - 120; if (x > W) continue;
        for (const [h, a] of P) { ctx.globalAlpha = a; ctx.drawImage(MS, M.x, CRC.row[h] * 300, M.w, 300, x, 128 - qh, w, qh); }
        ctx.globalAlpha = 1;
        const LI = q.i === 1 ? LM : q.i === 2 && night > .01 ? crImg('lk', CRC.lk) : null; if (LI) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * (.8 + .15 * Math.sin(tt * 3.1 + q.i)); ctx.drawImage(LI, x, 128 - qh, w, qh); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      }
      // bandeirinhas vermelhas a cada 20 m, atrás da última raia (e na largada)
      for (let m = 0; m * OB.PXM <= this.L - 1; m += 20) { const sx = m * OB.PXM - cam; if (sx > -20 && sx < W + 20) crPeca('bandeira', sx + 3, 129, 0, 24); }
      // areia das raias: a mesma areia do fundo, andando junto com você; raias alternadas um tiquinho mais escuras
      const th = H - 124, tw = th * 1024 / 146;
      const AI = crImg('a', CRC.areia); for (const [h, w] of P) { ctx.globalAlpha = w; for (let x = -((cam % tw) + tw) % tw; x < W; x += tw) ctx.drawImage(AI, 0, CRC.row[h] * 146 + .5, 1024, 145, x, 124, tw + .5, th); }
      ctx.globalAlpha = 1;
      const gr = ctx.createLinearGradient(0, 118, 0, 132); gr.addColorStop(0, 'rgba(240,196,140,0)'); gr.addColorStop(1, 'rgba(206,150,92,.22)'); ctx.fillStyle = gr; ctx.fillRect(0, 118, W, 14);
      for (let i = 0; i < 4; i++) {
        const y0 = OB_LANE[i] - (i === 0 ? 12 : OB_LANE[i] - OB_LANE[i - 1] - 3), y1 = OB_LANE[i] + 3;
        if (i % 2) { ctx.fillStyle = 'rgba(170,105,45,.08)'; ctx.fillRect(0, y0, W, y1 - y0); }
        // corda da raia: tracinhos brancos macios
        ctx.fillStyle = i === 3 ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.55)';
        for (let x = -(cam % 12); x < W; x += 12) { ctx.beginPath(); ctx.ellipse(x + 3, y1 - .5, 3, .6 + OB_SC[i] * .3, 0, 0, TAU); ctx.fill(); }
      }
      ctx.fillStyle = 'rgba(150,95,45,.10)'; ctx.fillRect(0, OB_LANE[3] + 3, W, H);
      // areia fofa: o monte de areia clarinha em cada raia
      for (const f of this.fofa) { const a = f.x0 - cam, b = f.x1 - cam; if (b < 0 || a > W) continue; for (let i = 0; i < 4; i++) { const k = OB_SC[i] + .1, ph = 8 * k, pw = ph * 3.2, n = Math.max(1, Math.round((b - a) / (pw * .7))); for (let j = 0; j < n; j++) { const c = n === 1 ? (a + b) / 2 : a + pw * .35 + (b - a - pw * .7) * j / (n - 1); crPeca('fofa', c, OB_LANE[i] + 2.5 + (j % 2) * .6, pw, ph * (j % 2 ? .9 : 1)); } } } /* montinhos lado a lado (esticar um só borrava) */
      // largada (a marca branca em cada raia) e chegada (a linha quadriculada no chão e a faixa nos dois postes, atrás da última raia)
      { const sx = -cam; if (sx > -30 && sx < W + 30) for (let i = 0; i < 4; i++) { const k = OB_SC[i] + .1; crPeca('largada', sx + 8 * k, OB_LANE[i] + 2, 28 * k, 6 * k); } }
      { const sx = Math.round(this.L - cam); if (sx > -60 && sx < W + 60) {
        crPeca('chegada', sx, 130, 0, 46);
        for (let y = 128; y < OB_LANE[3] + 4; y += 3) { ctx.fillStyle = Math.floor(y / 3) % 2 ? 'rgba(22,30,52,.85)' : 'rgba(255,255,255,.9)'; ctx.fillRect(sx - 1, y, 2, 3); ctx.fillStyle = Math.floor(y / 3) % 2 ? 'rgba(255,255,255,.9)' : 'rgba(22,30,52,.85)'; ctx.fillRect(sx + 1, y, 2, 3); }
      } }
      ctx.restore();
      // raias de trás para a frente: obstáculos e corredor de cada uma
      const ready = sReady('ia', 'am_roxo', 'am_laranja', 'am_dourado', 'rostos') || (CRIOK() && window.MVB);
      ctx.save(); ctx.imageSmoothingEnabled = true;
      for (let i = 0; i < 4; i++) {
        const r = this.rs[i], gy = OB_LANE[i], sc = OB_SC[i];
        for (const o of r.obs) { const sx = o.x - cam; if (sx > -30 && sx < W + 30) this.obst(o, sx, gy, sc + .1, tt); }
        for (const f of this.fx) if (f.lane === i) { const sx = f.x - cam; ctx.fillStyle = `rgba(246,214,174,${1 - f.t / .6})`; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(sx + k * 3 - 7, gy - 3 - f.t * 20 * ((k % 2) + 1) + f.t * f.t * 40, 1.2 + (k % 3) * .4, 0, TAU); ctx.fill(); } }
        if (ready) this.runner(r, r.x - cam, gy, sc + .1, tt);
      }
      ctx.restore();
      // luz da hora por cima (leve; o cenário já vem pintado em cada horário)
      ctx.save();
      for (const [h, w] of P) { const c = CR_LUZ[h]; if (!c) continue; ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = w; ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
      artVignette(170);
      // fôlego: barrinha fina em cima da cabeça do IAmiguinho (só durante a corrida)
      if (this.st === 'corrida' && !me.done) {
        const x0 = Math.round(OB.SX - 12), y0 = Math.round(OB_LANE[3] - 56 - me.y), w = 24;
        R(x0 - 1, y0 - 1, w + 2, 5, NAVY); R(x0, y0, w, 3, '#2b3442');
        R(x0, y0, Math.round(w * me.st), 3, me.bufT > 0 ? BAD : me.st < .25 ? WARN : '#f6f7f9');
      }
      if (this.st === 'pronto') { const n = 3 - Math.floor(this.stT / .55); ptext(n >= 1 ? String(n) : 'Vai!', W / 2, 60, n >= 1 ? '#ffffff' : '#ffb020', 3); ptext(`Bateria ${this.bat + 1} · ${OB_LEN[this.bat]} m`, W / 2, 92, '#ffffff', 1); }
      else if (this.st === 'corrida' && this.stT < 2.8) ptext('Vai!', W / 2, 60, '#ffb020', 3);
      if (this.st === 'placar') {
        const ord = this.rs.slice().sort((a, b) => a.time - b.time);
        R(W / 2 - 70, 80, 140, 56, 'rgba(10,16,22,.72)');
        ord.forEach((r, k) => ptext(`${k + 1}. ${r.me ? 'IAmiguinho' : ['Roxo', 'Laranja', 'Dourado'][r.lane]} ${r.time.toFixed(2).replace('.', ',')} s`, W / 2, 86 + k * 12, r.me ? '#ffffff' : 'rgba(255,255,255,.62)', 1, null));
      }
    };
  }
