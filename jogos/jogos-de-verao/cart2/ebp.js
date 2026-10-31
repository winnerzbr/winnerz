  /* ============================================================ Embaixadinha pintada (IAmiguinho)
     As pranchas pintadas (mveb.py) entram no lugar do desenho de 16 bits quando carregam. O jogo escolhe a prancha e o quadro
     pelo estado da prova: espera e cabeça seguindo a bola, andando, os toques (pé, coxa, cabeça e firula, começando no quadro do
     contato), levantando a bola do chão no começo, deixou cair, fim de jogo e comemoração (só quando nenhuma bola está chegando).
     O rosto aceso é o mesmo do vôlei, desenhado dentro da tela escura de cada quadro. */
  const ME = window.MVEB, MEI = {}, MEK = {};
  if (ME) for (const [nm, a] of Object.entries(ME.a)) { MEI[nm] = new Image(); MEI[nm].src = a.src; MEK[nm] = new Image(); MEK[nm].src = a.mask; }
  const EBOK = () => !!ME && Object.keys(MEI).every((n) => MEI[n].complete && MEI[n].naturalWidth > 0 && MEK[n].complete && MEK[n].naturalWidth > 0);
  window.__EBOK = EBOK;
  const EBK5 = ME ? 52 / ME.a.espera.f[0].ay : 1; // unidades por pixel guardado: em pé, da sola à hélice, igual ao desenho antigo (52)
  let FTE = null;
  (window.__fr = window.__fr || {})['eb'] = frameEb; // usado só pelos testes
  window.__ebPick = (tt) => ebPick(embaixadinha, tt); // usado só pelos testes
  function frameEb(an, k, ex, mirror) {
    const A = ME.a[an], n = A.f.length, f = A.f[((k | 0) % n + n) % n];
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.scale(EBK5 * (mirror ? -1 : 1), EBK5);
    ctx.drawImage(MEI[an], f.x, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    if (f.s && f.sz) {
      if (!FTE) FTE = document.createElement('canvas');
      const w = Math.ceil(f.w), h = Math.ceil(f.h);
      if (FTE.width < w || FTE.height < h) { FTE.width = Math.max(FTE.width, w); FTE.height = Math.max(FTE.height, h); }
      const g = FTE.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, FTE.width, FTE.height);
      const cx = f.s[4] ?? (f.s[0] + f.s[2]) / 2, cy = f.s[5] ?? (f.s[1] + f.s[3]) / 2;
      const L1 = f.s[6] || f.sz[0], L2 = f.s[7] || f.sz[1], fk = L2 / 14.5, fkx = clamp(.62 * L1 / (11.6 * fk), .5, 1.3);
      const save = ctx; ctx = g; try { g.save(); g.translate(cx, cy); g.rotate(f.r || 0); glowFace(ex, 0, L2 * .03, fk, fkx); g.restore(); } finally { ctx = save; }
      g.globalCompositeOperation = 'destination-in'; g.drawImage(MEK[an], f.x, 0, f.w, f.h, 0, 0, f.w, f.h); g.globalCompositeOperation = 'source-over';
      ctx.drawImage(FTE, 0, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    }
    ctx.restore();
  }
  // prancha e quadro conforme o estado da embaixadinha
  const EBST = { an: '', t0: -9, dur: .2, c: 0, lastPose: 0, serving: false, festa: -9, cheerUsed: false };
  const EB_TOQUE = { kickR: ['pe', 3], knee: ['coxa', 3], air: ['cabeca', 3], firula: ['firula', 4] };
  function ebPick(ev, tt) {
    const live = ev.dropT <= 0;
    if (!live) { const k = Math.min(7, Math.floor(ev.dropT / 1.5 * 8)); return [ev.vidas <= 0 ? 'fim' : 'caiu', k]; }
    // toque novo: começa no quadro do contato e vai até o fim da prancha
    if (ev.poseT > EBST.lastPose + .01) {
      const [an, c] = EBST.serving ? ['levanta', 4] : EB_TOQUE[ev.pose] || ['pe', 3];
      Object.assign(EBST, { an, c, t0: tt, dur: Math.max(.28, ev.poseT + .12) });
    }
    EBST.lastPose = ev.poseT; EBST.serving = ev.balls.some((b) => b.serve > 0);
    const e = tt - EBST.t0;
    if (EBST.an && e >= 0 && e < EBST.dur) return [EBST.an, Math.min(7, EBST.c + Math.floor(e / EBST.dur * (8 - EBST.c)))];
    // bola parada no pé, esperando o primeiro toque: pisando nela e rolando para trás
    if (EBST.serving) return ['levanta', Math.min(3, Math.floor((tt * 3) % 4))];
    if (ev.walk > 0) return ['andar', Math.floor(ev.walk * 12) % 8];
    // comemoração (série nova ou 10 seguidos) só se nenhuma bola chega nos próximos 0,7 s
    // (correção 31/10: o relógio recomeça a cada partida; uma marca antiga, maior que o relógio, deixava a comemoração presa em looping)
    if (tt < EBST.festa || tt < EBST.t0) { EBST.festa = -9; EBST.t0 = -9; EBST.an = ''; }
    if (ev.cheer > 0 && !EBST.cheerUsed) { const free = ev.balls.every((b) => { const n = ev.nextZone(b); return !n || n.t > .7; }); if (free) { EBST.festa = tt; EBST.cheerUsed = true; } }
    if (ev.cheer <= 0) EBST.cheerUsed = false;
    const ef = tt - EBST.festa;
    if (ef >= 0 && ef < .6) return ['festa', 1 + Math.min(6, Math.floor(ef / .6 * 7))];
    // cabeça seguindo a bola (a mais próxima de cair)
    const b0 = ev.balls.filter((b) => b.serve <= 0).sort((a, b) => b.y - a.y)[0];
    if (!b0) return ['espera', Math.floor(tt * 8) % 8];
    const a = Math.atan2((EBY - 40) - b0.y, Math.abs(b0.x - ev.px) + 12);
    return ['olhar', a > 1.25 ? 4 : a > .85 ? 3 : a > .5 ? 2 : a > .18 ? 1 : a > -.25 ? 0 : a > -.6 ? 7 : a > -1 ? 6 : 5];
  }
  if (typeof embaixadinha !== 'undefined') {
    const vSprite16e = vSprite;
    vSprite = function (key, anim, f, p, face, expr, look, crown, tt) {
      if (key !== 'ia_eb' || cur !== embaixadinha || !EBOK()) return vSprite16e.apply(this, arguments);
      const [an, k] = ebPick(embaixadinha, tt || 0);
      ctx.save(); ctx.translate(p.x, p.y - 1); frameEb(an, k, expr || 0, face < 0); ctx.restore();
    };
  }

  /* ---------- cenário, bolas, biruta e gaivota pintados (ebcen.py -> window.EBC)
     Praia do Centro em duas camadas (fundo e meio-plano) nos 4 horários, pelo relógio de quem joga (perto da troca de horário,
     mistura os dois); de noite, as luzes das janelas, dos postes e dos quiosques acendem por cima. */
  const EBC = window.EBC, EBI = {};
  const ebImg = (k, src) => { if (!src) return null; let im = EBI[k]; if (!im) { im = EBI[k] = new Image(); im.src = src; } return im.complete && im.naturalWidth ? im : null; };
  const EB_HORAS = [['noite', 5, 'manha'], ['manha', 10, 'dia'], ['dia', 16, 'tarde'], ['tarde', 19, 'noite']];
  function ebPesos() {
    const d = new Date(), h = window.__skHora != null ? window.__skHora : d.getHours() + d.getMinutes() / 60;
    for (const [a, b, c] of EB_HORAS) if (Math.abs(h - b) < .5) { const t = h - b + .5; return [[a, 1 - t], [c, t]]; }
    return [[h >= 5 && h < 10 ? 'manha' : h >= 10 && h < 16 ? 'dia' : h >= 16 && h < 19 ? 'tarde' : 'noite', 1]];
  }
  const EBP = () => !!EBC && !!ebImg('atl', EBC.atl);
  function ebScene(tt) {
    let P = ebPesos().filter(([, w]) => w > .001).map(([v, w]) => [v, w, ebImg('f_' + v, EBC.f[v]), ebImg('m_' + v, EBC.m[v])]);
    const ok = P.filter((p) => p[2] && p[3]); if (!ok.length) return false;
    if (ok.length < P.length) { P = ok; P[0][1] = 1; }
    const night = P.reduce((a, [v, w]) => a + (v === 'noite' ? w : v === 'tarde' ? w * .25 : 0), 0);
    ctx.save(); ctx.imageSmoothingEnabled = true;
    for (const [, w, f] of P) { ctx.globalAlpha = w; ctx.drawImage(f, 0, 0, W, H); } ctx.globalAlpha = 1;
    const lf = night > .01 && ebImg('lf', EBC.lf); if (lf) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * (.3 + .08 * Math.sin(tt * 1.7)); ctx.drawImage(lf, 0, 0, W, H); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    for (const [, w, , m] of P) { ctx.globalAlpha = w; ctx.drawImage(m, 0, 0, W, H); } ctx.globalAlpha = 1;
    const lm = night > .01 && ebImg('lm', EBC.lm); if (lm) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * (.45 + .1 * Math.sin(tt * 2.3 + 1)); ctx.drawImage(lm, 0, 0, W, H); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore(); return true;
  }
  // peça do atlas (bola, gaivota, biruta) com a âncora dela na origem
  function ebPart(name, i, x, y, flip = 1, rot = 0) {
    const L = EBC.p[name], f = L[((i | 0) % L.length + L.length) % L.length], u = 1 / EBC.u, im = ebImg('atl', EBC.atl);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(u * flip, u);
    ctx.drawImage(im, f.x, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h); ctx.restore();
  }
  function ebBall(b, tt) {
    if (b.kind === 'gude') return ebBolinha(b, tt);
    if (b.kind === 'praia') return ebPart('praia', Math.floor(b.spin * .6), b.x, b.y);
    if (b.kind === 'pingue') return ebPart('pingue', Math.floor(b.spin * .8), b.x, b.y);
    if (b.firula && Math.abs(b.vx) > 50) return ebPart('futebol_firula', 0, b.x, b.y, b.vx < 0 ? -1 : 1);
    ebPart('futebol', Math.floor(b.spin), b.x, b.y);
  }
  if (typeof embaixadinha !== 'undefined') {
    const draw16 = embaixadinha.draw;
    embaixadinha.draw = function (tt) {
      if (!EBP() || !EBOK()) return draw16.call(this, tt);
      if (!ebScene(tt)) { if (sReady('cenario', 'torcida')) vArtScene(this, tt); else R(0, 0, W, H, '#f0a080'); }
      // biruta: murcha sem vento, meio aberta com pouco, esticada (balançando) com vento forte; aponta para onde o vento sopra
      { const k = clamp(this.wind / 60, -1, 1), a = Math.abs(k), i = a < .12 ? 0 : a < .45 ? 1 : 2 + (Math.floor(tt * 4) % 2); ebPart('biruta', i, W - 62, EBY + 1, k < -.05 ? -1 : 1); }
      for (const s of this.sand) R(s.x, s.y, 3, 1, 'rgba(247,230,189,.75)');
      // gaivota e a sombra que engana
      if (this.gull) { const g = this.gull; ebPart('gaivota', Math.floor(tt * 8), g.x, g.y, g.dir > 0 ? -1 : 1); ellipseFill(Math.round(g.x), EBY - 1, 8, 2, 'rgba(70,45,15,.5)'); }
      const live = this.dropT <= 0;
      for (const b of this.balls) { const sx = this.shadowX(b), k = clamp(1 - (EBY - b.y) / 170, .3, 1), r = EB_BOLAS[b.kind].r / 8.5; ellipseFill(Math.round(sx), EBY - 1, Math.round((5 + 5 * k) * r), 2, `rgba(70,45,15,${(.35 + .3 * k).toFixed(2)})`); }
      ellipseFill(Math.round(this.px), EBY, 13, 2, 'rgba(70,45,15,.35)');
      const act = this.poseT > 0, b0 = this.balls[0];
      let ex = 0; if (!live) ex = this.vidas <= 0 ? 4 : 3; else if (act) ex = 2; else if (b0 && b0.serve <= 0 && b0.vy > 0 && Math.abs(b0.x - this.px) < 30) ex = 5;
      const [an, k] = ebPick(this, tt); ctx.save(); ctx.translate(this.px, EBY); frameEb(an, k, ex, this.face < 0); ctx.restore();
      for (const b of this.balls) ebBall(b, tt);
    };
  }
