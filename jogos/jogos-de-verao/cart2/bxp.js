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
  /* ---------- 02/11: o pacote do cenário da trilha nova (bxcen2.py -> window.BXC2). Quando carrega, entra no lugar do cenário antigo:
     fundo estendido (o céu continua para cima nos saltos), dunas estendidas (a encosta continua para baixo), terra pintada dentro do
     contorno da trilha, a beirada de cima da trilha dobrada ao longo do contorno (pedacinhos girados, pelo comprimento do caminho),
     o bico pintado em cada ponta de rampa, objetos da pista (portal da largada, placa a cada 100 m, bandeiras, cones, fardos, pneus)
     e a poeira pintada (pouso, torrões e derrapada). De noite, as luzes do fundo e das dunas por cima. */
  const BXC2 = window.BXC2;
  const b2 = (k) => bxImg('v2_' + k, k === 'bico' ? BXC2.bico.src : BXC2[k]);
  const BXC2OK = () => !!BXC2 && ['f', 'm', 't', 'b', 'l', 'ld', 'atl', 'bico'].every((k) => !!b2(k));
  window.__BXC2OK = BXC2OK;
  function bxPart2(name, x, y, k = 1, sx = 1, rot = 0) {
    const f = BXC2.p[name]; if (!f) return; const u = 1 / BXC2.u, im = b2('atl');
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(u * k * sx, u * k);
    ctx.drawImage(im, f.x, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h); ctx.restore();
  }
  const BX2_B = .18; // beirada: unidades por pixel guardado (repete a cada 184)
  function bx2Faixa(h) { // a beirada do horário, duas vezes lado a lado (o pedaço que passa da ponta continua no começo)
    const k = 'faixa_' + h; if (BXI[k]) return BXI[k];
    const im = b2('b'), c = document.createElement('canvas'); c.width = BXC2.bw * 2; c.height = BXC2.bh; const g = c.getContext('2d'), r = BXC2.horas.indexOf(h);
    for (const x of [0, BXC2.bw]) g.drawImage(im, 0, r * BXC2.bh, BXC2.bw, BXC2.bh, x, 0, BXC2.bw, BXC2.bh);
    return (BXI[k] = c);
  }
  function bx2Arco(v, wx) { // comprimento do caminho até wx (em passos de 4, guardado; recomeça quando a partida recomeça)
    let A = v.__arc; if (!A || wx < A.x0 - 1) { A = v.__arc = { x0: Math.floor(wx / 4) * 4 - 40, s: [0] }; }
    while (A.x0 + (A.s.length - 1) * 4 < wx + 4) { const i = A.s.length - 1, x = A.x0 + i * 4; A.s.push(A.s[i] + Math.hypot(4, v.h(x + 4) - v.h(x))); }
    const f = (wx - A.x0) / 4, i = Math.max(0, Math.floor(f)); return A.s[i] + (A.s[Math.min(i + 1, A.s.length - 1)] - A.s[i]) * (f - i);
  }
  function bxScene2(v, tt) {
    const C = BXC2, cam = v.x - BX.SX, P = bxPesos().filter(([, w]) => w > .001), night = P.reduce((a, [h, w]) => a + (h === 'noite' ? w : 0), 0), row = (h) => C.horas.indexOf(h);
    ctx.save(); ctx.imageSmoothingEnabled = true;
    // fundo distante, anda a 30%; o pé dele fica no pé da tela e o céu pintado continua para cima quando a câmera sobe
    const F = b2('f'), FW = 800, FH = 300, of = ((cam * .3) % FW + FW) % FW, cy = v.camH || 0, ca = cy - (v.camG ?? cy), fy = ca * .6 + H - FH;
    for (const [h, w] of P) { ctx.globalAlpha = w; if (fy > 0) R(0, 0, W, fy + 1, C.ceu[h]); for (let x = -of; x < W; x += FW) ctx.drawImage(F, 0, row(h) * C.fh, C.fw, C.fh, x, fy, FW + .6, FH); }
    if (night > .01) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * (.85 + .1 * Math.sin(tt * 1.7)); for (let x = -of; x < W; x += FW) ctx.drawImage(b2('l'), x, fy, FW + .6, FH); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore(); ctx.save(); ctx.translate(0, ca * .9); ctx.imageSmoothingEnabled = true;
    // dunas, anda a 55%: o alto (dunas, cercas, bandeiras) no mesmo lugar de antes; a encosta pintada continua para baixo
    const M = b2('m'), MW = 480, MH = 160, om = ((cam * .55) % MW + MW) % MW, my = BX.GY + 4 - 80;
    for (const [h, w] of P) { ctx.globalAlpha = w; for (let x = -om; x < W; x += MW) ctx.drawImage(M, 0, row(h) * C.mh, C.mw, C.mh, x, my, MW + .6, MH); R(0, my + MH - 1, W, 400, C.duna[h]); }
    if (night > .01) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * (.85 + .15 * Math.sin(tt * 2.3 + 1)); for (let x = -om; x < W; x += MW) ctx.drawImage(b2('ld'), x, my, MW + .6, MH); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = 1; ctx.restore(); ctx.save();
    // daqui para baixo, tudo anda com a câmera (mesmo zoom de antes)
    const z = v.zoom || 1, XA = BX.SX - BX.SX / z - 6, XB = BX.SX + (W - BX.SX) / z + 6;
    ctx.translate(BX.SX, BX.GY); ctx.scale(z, z); ctx.translate(-BX.SX, -BX.GY); ctx.translate(0, cy); ctx.imageSmoothingEnabled = true;
    const top = (sx) => BX.GY - v.h(sx + cam), perfil = () => { ctx.beginPath(); ctx.moveTo(XA, top(XA)); for (let sx = XA + 2; sx <= XB; sx += 3) ctx.lineTo(sx, top(sx)); ctx.lineTo(XB, top(XB)); };
    // terra pintada (ladrilho de 92 unidades, preso no mundo)
    const T = b2('t'), TK = 92 / C.tw;
    for (const [h, w] of P) {
      if (!BXI['pat2_' + h]) { const c = document.createElement('canvas'); c.width = C.tw; c.height = C.tw; c.getContext('2d').drawImage(T, 0, row(h) * C.tw, C.tw, C.tw, 0, 0, C.tw, C.tw); BXI['pat2_' + h] = ctx.createPattern(c, 'repeat'); }
      const pat = BXI['pat2_' + h]; pat.setTransform(new DOMMatrix([TK, 0, 0, TK, -(((cam % 92) + 92) % 92), 0]));
      ctx.globalAlpha = w; perfil(); ctx.lineTo(XB, H / z + 900 - cy); ctx.lineTo(XA, H / z + 900 - cy); ctx.closePath(); ctx.fillStyle = pat; ctx.fill();
    }
    // beirada: a faixa pintada dobrada ao longo da trilha, em pedaços de 3 girados com o chão (pelo comprimento do caminho)
    const M0 = ctx.getTransform(), RAD = 180 / Math.PI, BH = C.bh * BX2_B, BY = C.by * BX2_B;
    for (const [h, w] of P) {
      const FX = bx2Faixa(h); ctx.globalAlpha = w;
      for (let sx = XA; sx < XB; sx += 3) {
        const y0 = top(sx), y1 = top(sx + 3), L = Math.hypot(3, y1 - y0), s0 = bx2Arco(v, sx + cam) / BX2_B % C.bw;
        ctx.setTransform(M0.translate(sx, y0).rotate(Math.atan2(y1 - y0, 3) * RAD)); ctx.drawImage(FX, s0, 0, L / BX2_B + .5, C.bh, 0, -BY, L + .35, BH);
      }
    }
    ctx.setTransform(M0); ctx.globalAlpha = 1; perfil(); ctx.strokeStyle = NAVY; ctx.lineWidth = 1.1; ctx.lineJoin = 'round'; ctx.stroke();
    // o bico pintado em cada ponta de rampa (a ponta do desenho na ponta da física, girado para a inclinação dela)
    const BI = C.bico, BK = .12;
    for (const s of v.tr) {
      if (!s.lip) continue; const lx = s.x1, sx = lx - cam; if (sx < XA - 40 || sx > XB + 40) continue;
      ctx.save(); ctx.translate(sx, top(sx)); ctx.rotate(BI.ang - Math.atan(v.slope(lx - 2))); ctx.scale(BK, BK); ctx.drawImage(b2('bico'), -BI.tx, -BI.ty, BI.w, BI.h); ctx.restore();
    }
    // objetos da pista (atrás do IAmiguinho): portal na largada, placa a cada 100 m, bandeiras a cada 160, cone no começo de cada
    // rampa, fardo de feno ou pneus no vale antes dela (só onde o chão é quase plano)
    const plano = (wx) => Math.abs(v.slope(wx)) < .35, perto = (wx) => wx - cam > XA - 60 && wx - cam < XB + 60;
    if (perto(110)) bxPart2('start_gate', 110 - cam, top(110 - cam) + 1, 1);
    for (let k = Math.max(1, Math.floor((cam + XA) / 1000)); k <= (cam + XB) / 1000 + 1; k++) {
      const wx = k * 1000 + 20; if (!perto(wx)) continue; const sx = wx - cam, y = top(sx) + 1;
      bxPart2('distance_sign', sx, y, .8); ctx.save(); ctx.fillStyle = NAVY; ctx.font = 'bold 5px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`${k * 100} m`, sx, y - 19.5); ctx.restore();
    }
    for (let k = Math.floor((cam + XA) / 160); k < (cam + XB) / 160 + 1; k++) { const wx = k * 160 + 40; if (!perto(wx) || v.pitAt(wx) || !plano(wx)) continue; bxPart2(Math.floor(tt * 3 + k) % 2 ? 'checkered_flag_01' : 'checkered_flag_02', wx - cam, top(wx - cam) + 1, .62); }
    let n = 0;
    for (const s of v.tr) {
      if (!s.lip) continue; n++; const a = s.x0 + 6; if (perto(a)) bxPart2(n % 2 ? 'cone_01' : 'cone_02', a - cam, top(a - cam) + 1, .55);
      const b = s.x0 - 26; if (perto(b) && plano(b)) bxPart2(n % 3 === 0 ? 'three_tires' : n % 3 === 1 ? 'hay_bale' : 'rope_fence_repeat', b - cam, top(b - cam) + 1, .62);
    }
  }
  function bx2Poeira(v, cam) { // poeira pintada: derrapada (decolando), nuvem do pouso e torrões (tombo e pouso forte)
    for (const p of v.puffs) {
      const k = clamp(p.t / p.d, 0, .999), nm = p.k === 'p0' || p.k === 'p1' ? 'skid_0' + (1 + Math.floor(k * 3)) : 'landing_0' + (1 + Math.floor(k * 4));
      ctx.globalAlpha = clamp(1.25 - k * 1.1, 0, 1); bxPart2(nm, p.x - cam, p.y + 1, p.k === 'p3' ? 1.15 : p.k === 'p2' ? .95 : .8, p.sx);
      if (p.k === 'p3' || p.k === 'p2') bxPart2('clods_0' + (1 + Math.floor(k * 3)), p.x - cam + 6 * p.sx, p.y - 2 - k * 6, p.k === 'p3' ? 1 : .7, p.sx);
      ctx.globalAlpha = 1;
    }
  }
  // IAmiguinho na bike: em pé pedalando, da roda ao alto da hélice = 56 (a mesma altura do desenho de 16 bits)
  const BXK5 = MBX ? 56 / MBX.a.pedal.f[0].ay : 1, BXW_X = 12.85; // BXW_X: a roda de trás fica a 12,85 do meio da bike
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
    if (BXC2OK()) return bxScene2(v, tt); // 02/11: o cenário da trilha nova
    const cam = v.x - BX.SX, P = bxPesos().filter(([, w]) => w > .001), night = P.reduce((a, [h, w]) => a + (h === 'noite' ? w : h === 'tarde' ? w * .2 : 0), 0);
    const F = bxImg('f', BXC.f), M = bxImg('m', BXC.m), L = bxImg('l', BXC.l), fw = BXC.fw, fh = BXC.fh, mw = BXC.mw, mh = BXC.mh;
    ctx.save(); ctx.imageSmoothingEnabled = true;
    // fundo distante (céu, mar e morros), anda a 30%
    const of = ((cam * .3) % BX_FW + BX_FW) % BX_FW;
    // 02/11: a câmera sobe nos saltos grandes: o fundo sobe junto (60%) e, acima dele, a cor do céu do alto da imagem
    const cy = v.camH || 0, ca = cy - (v.camG ?? cy), fy0 = ca * .6, /* o fundo só sobe com a altura do salto (a trilha desce sem o céu descer) */ FW2 = BX_FW, FH2 = H, of2 = of;
    for (const [h, w] of P) { ctx.globalAlpha = w; const CF = bxImg('ceuf', BXC.ceuf); if (fy0 > 0 && CF) for (let x = -of2; x < W; x += FW2) ctx.drawImage(CF, 0, bxRow(h) * 4 + 1, 320, 2, x, -1, FW2 + .6, fy0 + 3); /* o céu continua para cima (faixa desfocada) */ for (let x = -of2; x < W; x += FW2) ctx.drawImage(F, 0, bxRow(h) * fh, fw, fh, x, fy0, FW2 + .6, FH2); }
    if (night > .01) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * (.35 + .08 * Math.sin(tt * 1.7)); for (let x = -of2; x < W; x += FW2) ctx.drawImage(L, 0, 0, 960, 270, x, fy0, FW2 + .6, FH2); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore(); ctx.save(); ctx.translate(0, ca * .9); ctx.imageSmoothingEnabled = true; // dunas: 90% da subida do salto
    // dunas com cercas, pneus e bandeiras (plano médio), anda a 55%; o pé fica atrás da pista
    const om = ((cam * .55) % BX_MW + BX_MW) % BX_MW, my = BX.GY + 4 - BX_MH;
    for (const [h, w] of P) { ctx.globalAlpha = w; for (let x = -om; x < W; x += BX_MW) { ctx.drawImage(M, 0, bxRow(h) * mh, mw, mh, x, my, BX_MW + .6, BX_MH); } R(0, my + BX_MH - 1, W, 400, BXC.duna[h]); } // embaixo das dunas, a areia continua (cor lisa)
    if (night > .01) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * (.45 + .1 * Math.sin(tt * 2.3 + 1)); for (let x = -om; x < W; x += BX_MW) ctx.drawImage(L, 0, 270, mw, mh, x, my, BX_MW + .6, BX_MH); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = 1; ctx.restore(); ctx.save();
    // daqui para baixo, tudo anda com a câmera; nos saltos altos a câmera se afasta (zoom) em volta do chão embaixo da bike,
    // para o chão continuar aparecendo e dar para mirar o pouso
    const z = v.zoom || 1, XA = BX.SX - BX.SX / z - 6, XB = BX.SX + (W - BX.SX) / z + 6;
    ctx.translate(BX.SX, BX.GY); ctx.scale(z, z); ctx.translate(-BX.SX, -BX.GY); ctx.translate(0, cy); ctx.imageSmoothingEnabled = true;
    const top = (sx) => BX.GY - v.h(sx + cam), V = BXC.p.vala, VO = BXC.vala, base = P.length > 1 && P[1][1] > .5 ? BXC.base[P[1][0]] : BXC.base[P[0][0]];
    // valas (o vão fundo entre as duas rampas): o miolo da peça pintada (a borda de trás, a água e a borda da frente) no fundo do vão,
    // na altura do chão; as paredes das rampas cobrem as laterais; embaixo, a cor da terra
    for (const s of v.tr) if (s.pit) {
      const m = 8, xa = s.x0 - cam - m, xb = s.x1 - cam + m; if (xa > XB || xb < XA) continue;
      const sx0 = VO.o0 - 40, sx1 = VO.o1 + 40, sy0 = 95, sy1 = V.h, y0 = BX.GY - (s.b || 0) - 8, hh = H + 400 - y0;
      R(xa, y0 + hh - 2, xb - xa, H, base);
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(bxImg('atl', BXC.atl), V.x + sx0, sy0, sx1 - sx0, sy1 - sy0, xa, y0, xb - xa, hh); ctx.restore();
      // a peça da vala só veio de dia: escurece com o horário (noite azulada, pôr do sol avermelhado)
      { const nt = P.reduce((q, [h, w]) => q + (h === 'noite' ? w : 0), 0), td = P.reduce((q, [h, w]) => q + (h === 'tarde' ? w : h === 'manha' ? w * .5 : 0), 0);
        if (nt > .01) R(xa, y0, xb - xa, hh, `rgba(12,18,58,${.6 * nt})`); if (td > .01) R(xa, y0, xb - xa, hh, `rgba(90,30,40,${.28 * td})`); }
    }
    // 02/11: a pista é desenhada em código (contorno da trilha): terra com o ladrilho pintado de cada horário, a faixa de areia em
    // cima e o contorno escuro. Funciona em qualquer inclinação (a trilha desce, as rampas são íngremes).
    const TT = bxImg('terra', BXC.terra), perfil = () => { ctx.beginPath(); ctx.moveTo(XA, top(XA)); for (let sx = XA + 2; sx <= XB; sx += 3) ctx.lineTo(sx, top(sx)); ctx.lineTo(XB, top(XB)); };
    if (TT) for (const [h, w] of P) {
      if (!BXI['pat_' + h]) { const c = document.createElement('canvas'); c.width = 384; c.height = 128; c.getContext('2d').drawImage(TT, 0, bxRow(h) * 128, 384, 128, 0, 0, 384, 128); BXI['pat_' + h] = ctx.createPattern(c, 'repeat'); }
      const pat = BXI['pat_' + h]; pat.setTransform(new DOMMatrix([.5, 0, 0, .5, -((cam % 192) + 192) % 192, (-v.h(cam) * 0) ]));
      ctx.globalAlpha = w; perfil(); ctx.lineTo(XB, H / z + 900 - cy); ctx.lineTo(XA, H / z + 900 - cy); ctx.closePath(); ctx.fillStyle = pat; ctx.fill();
      perfil(); ctx.strokeStyle = BXC.areia[h]; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.save(); ctx.translate(0, 2.2); ctx.stroke(); ctx.restore();
    }
    ctx.globalAlpha = 1; perfil(); ctx.strokeStyle = NAVY; ctx.lineWidth = 1.2; ctx.stroke();
    // tábua na ponta de cada rampa que termina numa vala (gira com a rampa)
    for (let i = 0; i < v.tr.length; i++) {
      const s = v.tr[i]; if (!(s.lip || (s.pit && v.tr[i - 1] && !v.tr.some((q) => q.lip && Math.abs(q.x1 - s.x0) < 8)))) continue;
      const lx = (s.lip ? s.x1 : s.x0) - 2, sx = lx - cam; if (sx < XA - 40 || sx > XB + 40) continue; // a ponta da rampa (02/11: em toda rampa)
      bxPart('tabua', sx + 1, top(sx) - 1, 1, 1, -Math.atan(v.slope(lx - 3)) + .12);
    }
    // bandeiras quadriculadas na beira da pista a cada 160 (balançando: os dois desenhos)
    for (let k = Math.floor((cam + XA) / 160); k < (cam + XB) / 160 + 1; k++) {
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
        const sp = v.tr.find((q) => q.pit && v.crashX >= q.x0 - 30 && v.crashX <= q.x1 + 10), wy = BX.GY - (sp ? sp.b : 0) + 12;
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
    // 02/11: com o pacote dos movimentos novos. Segurando a manobra: Superman e Sem mãos segurados e o Tailwhip contínuo (em laço);
    // pulo (▲): o bunny hop (agachando com ▼ antes: os quadros 1-2; saindo do chão: 3 a 8); girando rápido sem manobra: o mortal
    // encolhido; ◀ ▶ no ar: corpo para trás (1-4) ou para frente (5-8); empinando no chão: o wheelie, preso na roda de trás;
    // pouso torto: o desequilíbrio.
    const MBA = MBX.a, tem = (n) => !!MBA[n];
    let an = 'pedal', k = Math.floor((v.pedal || 0) * 1.4) % 8, wh = false; // pedalando: ~1,5 volta por segundo; descansando, devagar
    if (v.air) {
      const segura = tr && tr.hold > 0 && tr.t >= tr.d * .5 - 1e-6, q = Math.min(7, Math.floor(pr * 8)), dh = v.hopT != null ? v.t - v.hopT : 9;
      if (tr && tr.k === 'superman') { if (segura && tem('superH')) { an = 'superH'; k = Math.floor(tr.hold * 10) % 8; } else { an = 'super'; k = q; } }
      else if (tr && tr.k === 'semmao') { if (segura && tem('semmaoH')) { an = 'semmaoH'; k = Math.floor(tr.hold * 10) % 8; } else { an = 'semmao'; k = q; } }
      else if (tr && tr.k === 'tailwhip') { if ((tr.n || 1) > 1 && tem('tailC')) { an = 'tailC'; k = q; } else { an = 'tail'; k = q; } }
      else if (dh < .4 && tem('hop')) { an = 'hop'; k = Math.min(7, 2 + Math.floor(dh / .4 * 6)); }
      else if (Math.abs(v.w) > 3.2 && tem('tuck')) { an = 'tuck'; k = Math.floor(v.t * 10) % 8; }
      else if (v.dirIn && tem('corpo')) { v.corpoT = (v.corpoT || 0) + 1 / 60; const j = Math.min(3, Math.floor(v.corpoT * 10)); an = 'corpo'; k = v.dirIn > 0 ? j : 4 + j; }
      else { v.corpoT = 0; an = 'salto'; const hg = v.y - v.h(v.x); k = v.airT < .18 ? Math.min(2, Math.floor(v.airT / .18 * 3)) : v.vy > 60 ? 3 : v.vy > -40 ? (v.vy > 0 ? 4 : 5) : hg < 34 ? 7 : 6; }
      if (an !== 'corpo') v.corpoT = 0;
    } else if (v.wobT > 0 && tem('deseq')) { an = 'deseq'; k = Math.min(7, Math.floor((1 - v.wobT / .5) * 8)); }
    else if (v.landT > 0) { an = 'pouso'; k = Math.min(7, Math.floor((1 - v.landT / .3) * 8)); }
    else if (v.carga > .05 && tem('hop')) { an = 'hop'; k = v.carga > .18 ? 1 : 0; }
    else if (tem('wheelie') && v.dirIn > 0 && v.cont && v.cont[0] && !v.cont[1] && v.ang - Math.atan(v.slope(v.x)) > .25) /* 02/11: só empinando de propósito (segurando ◀); na ponta da rampa a roda da frente sai antes e aparecia o empinando */ { an = 'wheelie'; k = Math.floor(v.t * 8) % 8; wh = true; }
    else if (v.pumping) { an = 'pump'; k = Math.floor(tt * 12) % 8; }
    const sus = v.pen ? (v.pen[0] + v.pen[1]) / 2 : 0; // a roda afunda um pouco no chão (suspensão): o desenho sobe junto
    if (wh) { // empinando: o ponto da roda de trás do desenho preso na roda de trás da física, girando só o que falta
      const f = MBA.wheelie.f[k], c = Math.cos(v.ang), s2 = Math.sin(v.ang), rx = sx - BXW_X * c, ry = sy + BXW_X * s2;
      ctx.save(); ctx.translate(rx, ry - (v.pen ? v.pen[0] : 0)); ctx.rotate(-(v.ang - f.tilt)); ctx.translate(-f.rx * BXK5, 0); frameBx('wheelie', k, ex, false); ctx.restore(); return;
    }
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(-(v.ang + lean) + wob); ctx.translate(0, -sus); frameBx(an, k, ex, false); ctx.restore();
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
      if (BXC2OK()) bx2Poeira(this, cam); else for (const p of this.puffs) { const k = p.t / p.d; ctx.globalAlpha = clamp(1.3 - k * 1.3, 0, 1); bxPart(PUF[p.k] || 'dust_01', p.x - cam, p.y + 1, .8 + k * .5, p.sx); ctx.globalAlpha = 1; }
      for (const p of this.dust) R(p.x - cam, p.y, 2, 2, p.t < .2 ? '#f6d6ae' : '#d9a066');
      bxRider(this, tt);
      ctx.restore(); // fim da câmera (aberta em bxScene)
      artVignette(BX.GY - 60);
    };
  }
