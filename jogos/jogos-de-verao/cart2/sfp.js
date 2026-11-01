  /* ============================================================ Surfe pintado (01/11/2026)
     As 11 pranchas pintadas do IAmiguinho no surfe (mvsf.py -> window.MVSF) e a arte do Pico da Pedra Furada (sfcen.py -> window.SFC)
     entram no lugar do desenho de 16 bits quando carregam. A física e as regras da prova não mudam.
     Na onda: em pé, subindo a parede, agachado no tubo e o pouso. No ar: o voo (o quadro segue a subida e a descida), Superman, Indy,
     Rabeta e Mortal (o quadro segue o andamento da manobra; no mortal o jogo gira o desenho), e o giro pelas 8 vistas.
     O caldo afunda e volta à tona. O rosto aceso é o mesmo do vôlei, desenhado dentro da tela escura de cada quadro.
     Cenário nos 4 horários pelo relógio de quem joga (perto da troca de horário, mistura os dois); de noite, as luzes por cima. */
  const MSF = window.MVSF, SFC = window.SFC, SFI = {}, SFM = {};
  if (MSF) { const im = new Image(), mk = new Image(); im.src = MSF.src; mk.src = MSF.mask; for (const nm of Object.keys(MSF.a)) { SFI[nm] = im; SFM[nm] = mk; } } // um atlas só para todas as animações (junta.py)
  const sfImg = (k, src) => { if (!src) return null; let im = SFI['_' + k]; if (!im) { im = SFI['_' + k] = new Image(); im.src = src; } return im.complete && im.naturalWidth ? im : null; };
  const SFOK = () => !!MSF && !!SFC && Object.keys(MSF.a).every((n) => SFI[n].complete && SFI[n].naturalWidth > 0 && SFM[n].complete && SFM[n].naturalWidth > 0)
    && !!sfImg('atl', SFC.atl) && ['entrada', 'meio', 'fecha'].every((k) => sfImg('t_' + k, SFC.tubo[k].src));
  window.__SFOK = SFOK;
  // unidades do jogo por pixel guardado: em pé, da quilha à hélice = 42 (o desenho de 16 bits tinha uns 39 com a prancha)
  const SFU = MSF ? 42 / MSF.a.pe.f[0].ay : 1;
  let FTSF = null;
  (window.__fr = window.__fr || {})['sf'] = frameSf; // usado pelos testes e pela Prévia
  function frameSf(an, k, ex, mirror, sx = 1) {
    const A = MSF.a[an], n = A.f.length, f = A.f[((k | 0) % n + n) % n];
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.scale(SFU * (mirror ? -1 : 1) * sx, SFU); if (f.ks || f.kr) { ctx.rotate(f.kr || 0); ctx.scale(f.ks || 1, f.ks || 1); }
    ctx.drawImage(SFI[an], f.x, A.y || 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    if (f.s && f.sz) {
      if (!FTSF) FTSF = document.createElement('canvas');
      const w = Math.ceil(f.w), h = Math.ceil(f.h);
      if (FTSF.width < w || FTSF.height < h) { FTSF.width = Math.max(FTSF.width, w); FTSF.height = Math.max(FTSF.height, h); }
      const g = FTSF.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, FTSF.width, FTSF.height);
      const cx = f.s[4] ?? (f.s[0] + f.s[2]) / 2, cy = f.s[5] ?? (f.s[1] + f.s[3]) / 2;
      const L1 = f.s[6] || f.sz[0], L2 = f.s[7] || f.sz[1], fk = L2 / 14.5, fkx = clamp(.62 * L1 / (11.6 * fk), .5, 1.3);
      const save = ctx; ctx = g; try { g.save(); g.translate(cx, cy); g.rotate((f.r || 0) + (f.inv ? Math.PI : 0)); glowFace(ex, 0, L2 * .03, fk, fkx); g.restore(); } finally { ctx = save; }
      g.globalCompositeOperation = 'destination-in'; g.drawImage(SFM[an], f.x, A.y || 0, f.w, f.h, 0, 0, f.w, f.h); g.globalCompositeOperation = 'source-over';
      ctx.drawImage(FTSF, 0, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    }
    ctx.restore();
  }
  const SF_HORAS = [['noite', 5, 'manha'], ['manha', 10, 'dia'], ['dia', 16, 'tarde'], ['tarde', 19, 'noite']];
  function sfPesos() {
    const d = new Date(), h = window.__skHora != null ? window.__skHora : d.getHours() + d.getMinutes() / 60;
    for (const [a, b, c] of SF_HORAS) if (Math.abs(h - b) < .5) { const t = h - b + .5; return [[a, 1 - t], [c, t]]; }
    return [[h >= 5 && h < 10 ? 'manha' : h >= 10 && h < 16 ? 'dia' : h >= 16 && h < 19 ? 'tarde' : 'noite', 1]];
  }
  // peça do atlas (objetos e espuma) com a âncora dela na origem; s = escala, a = opacidade
  function sfPart(name, x, y, s = 1, flip = 1) {
    const f = SFC.p[name]; if (!f) return; const u = 1 / SFC.u, im = sfImg('atl', SFC.atl);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(x, y); ctx.scale(u * s * flip, u * s);
    ctx.drawImage(im, f.x, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h); ctx.restore();
  }
  const SF_MARCOR = { dia: '#1f62b8', manha: '#2a6aa8', tarde: '#2b3a80', noite: '#0d1b48' };
  const SF_ONDAW = 444, SF_ONDAH = 111, SF_CRISTA = 4; // a faixa da onda, em unidades do jogo
  const SF_TK = .30; // unidades por pixel guardado nos módulos do tubo
  function sfDraw(ev, tt) {
    const cam = ev.x - SXP, SL = Math.round(ev.lip);
    let P = sfPesos().filter(([, w]) => w > .001);
    const night = P.reduce((a, [v, w]) => a + (v === 'noite' ? w : v === 'tarde' ? w * .2 : 0), 0);
    ctx.save(); ctx.imageSmoothingEnabled = true;
    // mar e céu (parados; sobem um pouco junto com a crista)
    const oy = Math.min(0, SL - 30 - SFC.hz * H);
    for (const [v, w] of P) { const im = sfImg('f_' + v, SFC.f[v]); if (im) { ctx.globalAlpha = w; ctx.drawImage(im, 0, oy, W, H); } } ctx.globalAlpha = 1;
    const lf = night > .01 && sfImg('lf', SFC.lf); if (lf) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * (.35 + .08 * Math.sin(tt * 1.7)); ctx.drawImage(lf, 0, oy, W, H); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    // a parede da onda, andando com você (a faixa repete)
    const y0 = SL - SF_CRISTA, off = ((cam % SF_ONDAW) + SF_ONDAW) % SF_ONDAW;
    for (const [v, w] of P) { const im = sfImg('o_' + v, SFC.o[v]); if (!im) continue; ctx.globalAlpha = w; for (let x = -off; x < W; x += SF_ONDAW) ctx.drawImage(im, x, y0, SF_ONDAW + .6, SF_ONDAH); }
    ctx.globalAlpha = 1;
    // correnteza: faixas escuras que descem
    for (const z of ev.zones) {
      const zx = Math.round(z.x - cam); if (zx > W || zx + z.w < 0) continue;
      R(zx, SL + 6, z.w, SBASE - SL - 6, 'rgba(10,20,70,.30)');
      for (let k = 0; k < 10; k++) { const yy = SL + 8 + ((k * 23 + tt * 70) % (SBASE - SL - 14)); R(zx + 6 + ((k * 37) % Math.max(1, z.w - 16)), Math.round(yy), 2, 8, 'rgba(12,22,80,.6)'); }
    }
    // tubos: o meio repete; a entrada (o lábio enrolando) à esquerda e o fechamento (a explosão de espuma) à direita.
    // O teto do meio (a parte de baixo da água que enrola) fica na altura do teto do tubo da física.
    const TB = SFC.tubo, tw = (k) => TB[k].w * SF_TK, th = TB.meio.h * SF_TK, teto = 260 * .75 * SF_TK;
    for (const tb of ev.tubes) {
      const top = tb.roof - teto - 6, ex = tb.x0 - tw('entrada') + 30 - cam, fx0 = tb.x1 - 30 - cam;
      if (ex > W || fx0 + tw('fecha') < 0) continue;
      const mi = sfImg('t_meio', TB.meio.src), en = sfImg('t_entrada', TB.entrada.src), fe = sfImg('t_fecha', TB.fecha.src);
      for (let x = ex + tw('entrada') - 4; x < fx0 + 8; x += tw('meio') - 1) if (x < W && x + tw('meio') > 0) ctx.drawImage(mi, x, top, tw('meio') + .6, th);
      if (ex < W && ex + tw('entrada') > 0) ctx.drawImage(en, ex, top, tw('entrada'), th);
      if (fx0 < W && fx0 + tw('fecha') > 0) ctx.drawImage(fe, fx0, top, tw('fecha'), th);
    }
    // a quebra à esquerda: três colunas de espuma, cada uma num quadro diferente
    [[4, -2, 1], [24, 0, .96], [46, 1, 1]].forEach(([cx, ph, k]) => {
      const nm = 'col' + ((Math.floor(tt * 8) + ph + 3) % 3), f = SFC.p[nm], h = (SBASE + 10 - (SL - 22)) * k, s = h / (f.h / SFC.u);
      sfPart(nm, cx, SBASE + 10, s);
    });
    // água da frente, na cor do horário
    for (const [v, w] of P) { ctx.globalAlpha = w; R(0, SBASE, W, H - SBASE, SF_MARCOR[v]); } ctx.globalAlpha = 1;
    // a água da frente com a textura do fundo da faixa da onda (passa um pouco mais rápido), mais escura
    { const o2 = (((cam * 1.1) % SF_ONDAW) + SF_ONDAW) % SF_ONDAW; for (const [v, w] of P) { const im = sfImg('o_' + v, SFC.o[v]); if (!im) continue; ctx.globalAlpha = w * .85;
      for (let x = -o2; x < W; x += SF_ONDAW) ctx.drawImage(im, 0, im.height * .62, im.width, im.height * .38, x, SBASE, SF_ONDAW + .6, H - SBASE); }
      ctx.globalAlpha = 1; R(0, SBASE, W, H - SBASE, night > .5 ? 'rgba(4,8,30,.35)' : 'rgba(10,25,80,.28)'); }
    R(0, SBASE, W, 1, NAVY); R(0, SBASE + 1, W, 2, night > .5 ? '#3d7fc0' : '#58d6dc');
    for (let i = 0; i < 22; i++) R(((i * 41 - cam * 1.1) % W + W) % W, SBASE + 6 + (i * 11) % 30, 8 + (i % 4) * 3, 1, i % 3 ? 'rgba(255,255,255,.4)' : night > .5 ? 'rgba(190,210,255,.45)' : 'rgba(255,190,170,.5)');
    // estrelas, conchas e obstáculos
    for (const o of ev.objs) {
      if (o.done) continue;
      const fly = o.k === 'gaivota' || o.k === 'drone', x = o.x - cam, y = o.y + (fly ? 0 : Math.sin(tt * 3 + o.x) * 1.5);
      if (x < -30 || x > W + 30) continue;
      if (o.k === 'gaivota') sfPart(Math.floor(tt * 6 + (o.ph || 0)) % 2 ? 'gaivota1' : 'gaivota2', x, y);
      else if (o.k === 'drone') sfPart(Math.floor(tt * 14) % 2 ? 'drone1' : 'drone2', x, y);
      else sfPart(o.k, x, y - (o.k === 'pedra' ? 1 : 0));
    }
    // espuma e respingos (rastro, batidas, pousos, quedas)
    for (const e of ev.fx) {
      const k = e.t / e.d, sc = e.s * (e.k.startsWith('sp') ? .7 + k * .5 : 1);
      ctx.globalAlpha = clamp(1.4 - k * 1.4, 0, 1); sfPart(e.k, e.x - cam, e.y, sc);
    }
    ctx.globalAlpha = 1; ctx.restore();
    for (const p of ev.spray) R(p.x - cam, p.y, 2, 2, '#ffffff');
    artVignette(SBASE - 50);
    sfSurfer(ev, tt);
  }
  function sfSurfer(ev, tt) {
    const y = ev.y;
    if (ev.fallT > 0) {
      // caldo: cai da prancha, mergulha e volta à tona; some no fim
      const k = clamp((1.6 - ev.fallT) / 1.6, 0, .999), j = Math.floor(k * 8);
      ctx.save(); ctx.translate(SXP - k * 18, (j < 4 ? y + 3 : y + 4 + k * 4)); ctx.globalAlpha = clamp(ev.fallT / .4, 0, 1);
      frameSf('caldo', j, 3); ctx.restore(); return;
    }
    if (ev.inv && !(Math.floor(tt * 14) % 2)) return;
    if (ev.air) {
      const tr = ev.trick, pr = tr ? Math.min(1, tr.t / tr.d) : 0;
      let ang = ev.avy / 900, an = 'ar', k;
      const v = ev.avy; k = v < -120 ? 1 : v < -60 ? 2 : v < -20 ? 3 : v < 25 ? 4 : v < 70 ? 5 : v < 130 ? 6 : 7;
      if (tr) { an = { superman: 'super', indy: 'indy', rabeta: 'rabeta', mortal: 'mortal' }[tr.k] || 'ar'; k = Math.min(7, Math.floor(pr * 8)); if (tr.k === 'mortal') ang -= TAU * pr; }
      ctx.save(); ctx.translate(SXP, Math.round(y) - 16);
      if (ev.spinning && (!tr || tr.k !== 'mortal')) {
        // giro: as 8 vistas em volta dele; com manobra, perto de lado a pose da manobra (achatando), de frente e de costas as vistas do giro
        const c = Math.cos(ev.rot * TAU), gv = ((Math.round(ev.rot * 8) % 8) + 8) % 8; ctx.rotate(ang);
        if (tr && Math.abs(c) >= .75) frameSf(an, k, 2, false, (c < 0 ? -1 : 1) * Math.max(.85, Math.abs(c)));
        else frameSf('giro', gv, 2);
      } else { ctx.rotate(ang); frameSf(an, k, 2); }
      ctx.restore(); return;
    }
    // na onda: pouso · agachado no tubo · subindo a parede · em pé
    let an = 'pe', k = Math.floor(tt * 7) % 8, ex = 0;
    if (ev.landT > 0) { an = 'pouso'; k = Math.min(7, Math.floor((1 - ev.landT / .28) * 8)); ex = 2; }
    else if (ev.tube) { an = 'tubo'; k = Math.floor(tt * 8) % 8; ex = 5; }
    else if (ev.vy < -50 || ev.lipCd > .35) { an = 'sobe'; k = Math.floor(tt * 10) % 8; ex = 5; }
    ctx.save(); ctx.translate(SXP, Math.round(y) + 3); ctx.rotate(clamp(ev.vy / 240, -.4, .4)); frameSf(an, k, ex); ctx.restore();
  }
  if (typeof surfe !== 'undefined') {
    const draw16s = surfe.draw;
    surfe.draw = function (tt) { if (!SFOK()) return draw16s.call(this, tt); sfDraw(this, tt); };
  }
