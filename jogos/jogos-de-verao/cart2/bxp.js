  /* ============================================================ BMX pintado (01/11/2026)
     O IAmiguinho na bike (mvbx.py -> window.MVBX, as 8 animações do pacote do dono) e a pista da Costa WinnerZ (bxcen.py -> window.BXC)
     entram no lugar do desenho de 16 bits quando carregam. A física e as regras da prova não mudam.
     Cenário nos 4 horários pelo relógio (perto da troca mistura os dois): fundo distante (anda a 30%), dunas do plano médio (55%) e a
     faixa de terra da pista, que acompanha o perfil do chão; de noite, as luzes por cima. Vala com a peça pintada (a abertura da água
     do tamanho do buraco) e a tábua na ponta da rampa; bandeiras quadriculadas na beira da pista; poeira pintada.
     IAmiguinho: pedalando (pela pedalada), pumping (segurando na descida e no pouso curto), o salto (saída, subida, flutuando e
     preparando o pouso), Superman, Sem mãos e Tailwhip (pelo andamento), aterrissagem e a queda. */
  const BXC = window.BXC, MBX = window.MVBX, BXI = {};
  const bxImg = (k, src) => { if (!src) return null; let im = BXI[k]; if (!im) { im = BXI[k] = new Image(); im.src = src; } return im.complete && im.naturalWidth ? im : null; };
  const BXJ = {}; if (MBX) { BXJ.im = new Image(); BXJ.im.src = MBX.src; BXJ.mk = new Image(); BXJ.mk.src = MBX.mask; }
  const BXCOK = () => !!BXC && !!bxImg('f', BXC.f) && !!bxImg('m', BXC.m) && !!bxImg('l', BXC.l) && !!bxImg('atl', BXC.atl);
  const BXIOK = () => !!MBX && BXJ.im.complete && BXJ.im.naturalWidth > 0 && BXJ.mk.complete && BXJ.mk.naturalWidth > 0;
  window.__BXCOK = BXCOK; window.__BXIOK = BXIOK;
  const BX_HORAS = [['noite', 5, 'manha'], ['manha', 10, 'dia'], ['dia', 16, 'tarde'], ['tarde', 19, 'noite']];
  function bxPesos() {
    const d = new Date(), h = window.__skHora != null ? window.__skHora : d.getHours() + d.getMinutes() / 60;
    for (const [a, b, c] of BX_HORAS) if (Math.abs(h - b) < .5) { const t = h - b + .5; return [[a, 1 - t], [c, t]]; }
    return [[h >= 5 && h < 10 ? 'manha' : h >= 10 && h < 16 ? 'dia' : h >= 16 && h < 19 ? 'tarde' : 'noite', 1]];
  }
  const bxRow = (h) => BXC.horas.indexOf(h);
  // peça do atlas de objetos com a âncora dela em (x, y); k = escala, sx espelha, rot gira
  function bxPart(name, x, y, k = 1, sx = 1, rot = 0) {
    const f = BXC.p[name]; if (!f) return; const u = 1 / BXC.u, im = bxImg('atl', BXC.atl);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(u * k * sx, u * k);
    ctx.drawImage(im, f.x, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h); ctx.restore();
  }
  // IAmiguinho na bike: em pé pedalando, da roda ao alto da hélice = 56 (a mesma altura do desenho de 16 bits)
  const BXK5 = MBX ? 56 / MBX.a.pedal.f[0].ay : 1;
  let FTBX = null;
  (window.__fr = window.__fr || {})['bx'] = frameBx;
  function frameBx(an, k, ex, mirror) {
    const A = MBX.a[an], n = A.f.length, f = A.f[((k | 0) % n + n) % n], y0 = A.y || 0;
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.scale(BXK5 * (mirror ? -1 : 1), BXK5);
    ctx.drawImage(BXJ.im, f.x, y0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    if (f.s && f.sz) {
      if (!FTBX) FTBX = document.createElement('canvas');
      const w = Math.ceil(f.w), h = Math.ceil(f.h);
      if (FTBX.width < w || FTBX.height < h) { FTBX.width = Math.max(FTBX.width, w); FTBX.height = Math.max(FTBX.height, h); }
      const g = FTBX.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, FTBX.width, FTBX.height);
      const cx = f.s[4] ?? (f.s[0] + f.s[2]) / 2, cy = f.s[5] ?? (f.s[1] + f.s[3]) / 2;
      const L1 = f.s[6] || f.sz[0], L2 = f.s[7] || f.sz[1], fk = L2 / 14.5, fkx = clamp(.62 * L1 / (11.6 * fk), .5, 1.3);
      const save = ctx; ctx = g; try { g.save(); g.translate(cx, cy); g.rotate(f.r || 0); glowFace(ex, 0, L2 * .03, fk, fkx); g.restore(); } finally { ctx = save; }
      g.globalCompositeOperation = 'destination-in'; g.drawImage(BXJ.mk, f.x, y0, f.w, f.h, 0, 0, f.w, f.h); g.globalCompositeOperation = 'source-over';
      ctx.drawImage(FTBX, 0, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    }
    ctx.restore();
  }
  const BX_FW = 800, BX_MW = 480, BX_MH = 80, BX_PW = 360, BX_PH = 60; // fundo (na altura da tela), plano médio e faixa da pista, em unidades
  function bxScene(v, tt) {
    const cam = v.x - BX.SX, P = bxPesos().filter(([, w]) => w > .001), night = P.reduce((a, [h, w]) => a + (h === 'noite' ? w : h === 'tarde' ? w * .2 : 0), 0);
    const F = bxImg('f', BXC.f), M = bxImg('m', BXC.m), L = bxImg('l', BXC.l), fw = BXC.fw, fh = BXC.fh, mw = BXC.mw, mh = BXC.mh;
    ctx.save(); ctx.imageSmoothingEnabled = true;
    // fundo distante (céu, mar e morros), anda a 30%
    const of = ((cam * .3) % BX_FW + BX_FW) % BX_FW;
    for (const [h, w] of P) { ctx.globalAlpha = w; for (let x = -of; x < W; x += BX_FW) ctx.drawImage(F, 0, bxRow(h) * fh, fw, fh, x, 0, BX_FW + .6, H); }
    if (night > .01) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * (.35 + .08 * Math.sin(tt * 1.7)); for (let x = -of; x < W; x += BX_FW) ctx.drawImage(L, 0, 0, 960, 270, x, 0, BX_FW + .6, H); ctx.globalCompositeOperation = 'source-over'; }
    // dunas com cercas, pneus e bandeiras (plano médio), anda a 55%; o pé fica atrás da pista
    const om = ((cam * .55) % BX_MW + BX_MW) % BX_MW, my = BX.GY + 4 - BX_MH;
    for (const [h, w] of P) { ctx.globalAlpha = w; for (let x = -om; x < W; x += BX_MW) ctx.drawImage(M, 0, bxRow(h) * mh, mw, mh, x, my, BX_MW + .6, BX_MH); }
    if (night > .01) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * (.45 + .1 * Math.sin(tt * 2.3 + 1)); for (let x = -om; x < W; x += BX_MW) ctx.drawImage(L, 0, 270, mw, mh, x, my, BX_MW + .6, BX_MH); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = 1; ctx.restore();
    artHaze(118, BX.GY - 10);
    const top = (sx) => BX.GY - v.h(sx + cam), V = BXC.p.vala, VO = BXC.vala, base = P.length > 1 && P[1][1] > .5 ? BXC.base[P[1][0]] : BXC.base[P[0][0]];
    // valas (o vão fundo entre as duas rampas): o miolo da peça pintada (a borda de trás, a água e a borda da frente) no fundo do vão,
    // na altura do chão; as paredes das rampas cobrem as laterais; embaixo, a cor da terra
    for (const s of v.tr) if (s.pit) {
      const m = 8, xa = s.x0 - cam - m, xb = s.x1 - cam + m; if (xa > W || xb < 0) continue;
      const sx0 = VO.o0 - 40, sx1 = VO.o1 + 40, sy0 = 95, sy1 = V.h, y0 = BX.GY - 8, hh = H - y0 + 2;
      R(xa, y0 + hh - 2, xb - xa, H, base);
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(bxImg('atl', BXC.atl), V.x + sx0, sy0, sx1 - sx0, sy1 - sy0, xa, y0, xb - xa, hh); ctx.restore();
      // a peça da vala só veio de dia: escurece com o horário (noite azulada, pôr do sol avermelhado)
      { const nt = P.reduce((q, [h, w]) => q + (h === 'noite' ? w : 0), 0), td = P.reduce((q, [h, w]) => q + (h === 'tarde' ? w : h === 'manha' ? w * .5 : 0), 0);
        if (nt > .01) R(xa, y0, xb - xa, hh, `rgba(12,18,58,${.6 * nt})`); if (td > .01) R(xa, y0, xb - xa, hh, `rgba(90,30,40,${.28 * td})`); }
    }
    // terra: a faixa da pista acompanha o perfil do chão (2 unidades por coluna); embaixo continua a cor da terra
    const pr = BX_PW / (mw), ri = P.map(([h, w]) => [4 + bxRow(h), w]);
    ctx.save(); ctx.imageSmoothingEnabled = true;
    for (let sx = 0; sx < W; sx += 2) {
      const wx = sx + cam; if (v.pitAt(wx + 1)) continue;
      const y = top(sx), u = (((wx % BX_PW) + BX_PW) % BX_PW) / pr;
      const sw = 2 / pr + .5, uu = Math.min(mw - sw - 2, u); // sem a última coluna da faixa (fazia uma linha clara na emenda)
      for (const [row, w] of ri) { ctx.globalAlpha = w; ctx.drawImage(M, uu, row * mh, sw, mh, sx, y - 1.5, 2.4, BX_PH); }
      ctx.globalAlpha = 1; if (y - 1.5 + BX_PH < H) R(sx, y - 2 + BX_PH, 2.4, H - (y - 2 + BX_PH), base);
    }
    ctx.restore();
    // tábua na ponta de cada rampa que termina numa vala (gira com a rampa)
    for (let i = 1; i < v.tr.length; i++) {
      const s = v.tr[i]; if (!s.pit) continue;
      const lx = s.x0 - 2, sx = lx - cam; if (sx < -40 || sx > W + 40) continue; // a ponta da rampa (antes da parede de 2 que desce)
      bxPart('tabua', sx + 1, top(sx) - 1, 1, 1, -Math.atan(v.slope(lx - 3)) + .12);
    }
    // bandeiras quadriculadas na beira da pista a cada 160 (balançando: os dois desenhos)
    for (let k = Math.floor(cam / 160); k < (cam + W) / 160 + 1; k++) {
      const wx = k * 160 + 40, sx = wx - cam; if (v.pitAt(wx)) continue;
      bxPart(Math.floor(tt * 3 + k) % 2 ? 'flag_01' : 'flag_02', sx, top(sx) + 1, .9);
    }
  }
  function bxRider(v, tt) {
    const cam = v.x - BX.SX;
    if (v.crashT > 0) {
      // tombo: a queda pintada (desequilíbrio, tombo, chão e levantando) no lugar do tombo; na vala, afunda na água
      const k = Math.min(7, Math.floor((1.3 - v.crashT) / 1.3 * 9)), gx = v.crashX - cam;
      if (v.crashAgua) {
        const wy = BX.GY + 12;
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, wy); ctx.clip(); ctx.translate(gx, wy + Math.min(1, (1.3 - v.crashT) * 2) * 30); frameBx('queda', Math.min(3, k), 4, false); ctx.restore();
        R(gx - 16, wy - 1, 32, 1, 'rgba(255,255,255,.8)'); return;
      }
      const gy = BX.GY - v.h(v.crashX + k * 3);
      ctx.save(); ctx.translate(gx + k * 3, gy); ctx.rotate(-Math.atan(v.slope(v.crashX + k * 3))); frameBx('queda', k, 4, false); ctx.restore(); return;
    }
    const sx = BX.SX, sy = BX.GY - v.y, tr = v.trick, pr = tr ? Math.min(1, tr.t / tr.d) : 0;
    const wob = v.wobT > 0 ? Math.sin(tt * 40) * .12 * v.wobT : 0, lean = v.air ? 0 : v.lean * .16;
    let ex = 0;
    if (v.air) {
      const g = v.h(v.x), th = Math.atan(v.slope(v.x)), diff = Math.abs(((v.ang - th) % TAU + TAU * 1.5) % TAU - Math.PI);
      ex = v.y - g < 26 && diff > BX.CLEAN ? 3 : tr ? 5 : 2;
    } else if (v.landT > 0) ex = 2; else if (v.pumping) ex = 5;
    let an = 'pedal', k = Math.floor((v.pedal || 0) * 1.4) % 8; // pedalando: ~1,5 volta por segundo; descansando, devagar
    if (v.air) {
      const q = Math.min(7, Math.floor(pr * 8));
      if (tr && tr.k === 'superman') { an = 'super'; k = q; }
      else if (tr && tr.k === 'semmao') { an = 'semmao'; k = q; }
      else if (tr && tr.k === 'tailwhip') { an = 'tail'; k = q; }
      else { an = 'salto'; const hg = v.y - v.h(v.x); k = v.airT < .18 ? Math.min(2, Math.floor(v.airT / .18 * 3)) : v.vy > 60 ? 3 : v.vy > -40 ? (v.vy > 0 ? 4 : 5) : hg < 34 ? 7 : 6; }
    } else if (v.landT > 0) { an = 'pouso'; k = Math.min(7, Math.floor((1 - v.landT / .3) * 8)); }
    else if (v.pumping) { an = 'pump'; k = Math.floor(tt * 12) % 8; }
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(-(v.ang + lean) + wob); frameBx(an, k, ex, false); ctx.restore();
  }
  if (typeof bmx !== 'undefined') {
    const draw16x = bmx.draw;
    bmx.draw = function (tt) {
      if (!BXCOK() || !BXIOK()) return draw16x.call(this, tt);
      const cam = this.x - BX.SX;
      bxScene(this, tt);
      // respingos, poeira pintada e grãos de areia
      if (sReady('sf_fx')) for (const e of this.fx) { const f = SPR.sf_fx.fr[e.k], w = f.w / 2, h = f.h / 2; ctx.globalAlpha = clamp(1.4 - e.t / e.d * 1.4, 0, 1); ctx.drawImage(sImg('sf_fx'), f.x, f.y, f.w, f.h, half(e.x - cam - w / 2), half(e.y - h), w, h); ctx.globalAlpha = 1; }
      const PUF = { p0: 'dust_01', p1: 'dust_02', p2: 'dust_03', p3: 'dust_04' };
      for (const p of this.puffs) { const k = p.t / p.d; ctx.globalAlpha = clamp(1.3 - k * 1.3, 0, 1); bxPart(PUF[p.k] || 'dust_01', p.x - cam, p.y + 1, .8 + k * .5, p.sx); ctx.globalAlpha = 1; }
      for (const p of this.dust) R(p.x - cam, p.y, 2, 2, p.t < .2 ? '#f6d6ae' : '#d9a066');
      artVignette(BX.GY - 60);
      bxRider(this, tt);
    };
  }
