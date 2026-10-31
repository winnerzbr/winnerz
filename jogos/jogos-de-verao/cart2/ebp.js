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
  const EBST = { an: '', t0: 0, dur: .2, c: 0, lastPose: 0, serving: false, festa: -9 };
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
    if (ev.cheer > 0) { const free = ev.balls.every((b) => { const n = ev.nextZone(b); return !n || n.t > .7; }); if (free && tt - EBST.festa > 2) EBST.festa = tt; }
    if (tt - EBST.festa < .6) return ['festa', 1 + Math.min(6, Math.floor((tt - EBST.festa) / .6 * 7))];
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
