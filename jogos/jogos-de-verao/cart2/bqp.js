  /* ============================================================ Basquete pintado (IAmiguinho, 01/11/2026)
     As pranchas pintadas (mvbq.py -> window.MVBQ) entram no lugar do desenho de 16 bits quando carregam. A física não muda.
     Parado: espera com a bola (laço). Andando: quicando (laço, o jogo quica a bola na mão da frente). Segurando: carregando
     (as mãos sobem do peito até o alto em 0,35 s e ficam lá; a bola vai junto). Soltou: o arremesso a partir do quadro da soltura,
     com o pulo desenhado. Cesta: comemoração. Errou: mãos na cabeça. O rosto aceso é o do vôlei, dentro da tela de cada quadro. */
  const MBQ = window.MVBQ, BQI = {}, BQM = {};
  if (MBQ) { const im = new Image(), mk = new Image(); im.src = MBQ.src; mk.src = MBQ.mask; for (const nm of Object.keys(MBQ.a)) { BQI[nm] = im; BQM[nm] = mk; } } // um atlas só para todas as animações (junta.py)
  const BQOK = () => !!MBQ && Object.keys(MBQ.a).every((n) => BQI[n].complete && BQI[n].naturalWidth > 0 && BQM[n].complete && BQM[n].naturalWidth > 0);
  window.__BQOK = BQOK;
  const BQK5 = MBQ ? 50 / MBQ.a.espera.f[0].ay : 1; // em pé, da sola à hélice = 50 (o de 16 bits tinha 48,5)
  let FTBQ = null;
  (window.__fr = window.__fr || {})['bq'] = frameBq;
  function frameBq(an, k, ex, mirror) {
    const A = MBQ.a[an], n = A.f.length, f = A.f[((k | 0) % n + n) % n];
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.scale(BQK5 * (mirror ? -1 : 1), BQK5); if (f.ks || f.kr) { ctx.rotate(f.kr || 0); ctx.scale(f.ks || 1, f.ks || 1); }
    ctx.drawImage(BQI[an], f.x, A.y || 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    if (f.s && f.sz) {
      if (!FTBQ) FTBQ = document.createElement('canvas');
      const w = Math.ceil(f.w), h = Math.ceil(f.h);
      if (FTBQ.width < w || FTBQ.height < h) { FTBQ.width = Math.max(FTBQ.width, w); FTBQ.height = Math.max(FTBQ.height, h); }
      const g = FTBQ.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, FTBQ.width, FTBQ.height);
      const cx = f.s[4] ?? (f.s[0] + f.s[2]) / 2, cy = f.s[5] ?? (f.s[1] + f.s[3]) / 2;
      const L1 = f.s[6] || f.sz[0], L2 = f.s[7] || f.sz[1], fk = L2 / 14.5, fkx = clamp(.62 * L1 / (11.6 * fk), .5, 1.3);
      const save = ctx; ctx = g; try { g.save(); g.translate(cx, cy); g.rotate(f.r || 0); glowFace(ex, 0, L2 * .03, fk, fkx); g.restore(); } finally { ctx = save; }
      g.globalCompositeOperation = 'destination-in'; g.drawImage(BQM[an], f.x, A.y || 0, f.w, f.h, 0, 0, f.w, f.h); g.globalCompositeOperation = 'source-over';
      ctx.drawImage(FTBQ, 0, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    }
    ctx.restore();
  }
  // onde fica a bola nas mãos, em cada quadro (unidades do jogo, à frente e acima dos pés)
  const BQ_MAOS_ESP = [6, 17], BQ_MAOS_CAR = [[8, 20], [9, 21], [10, 27], [11, 32], [11, 37], [12, 40], [12, 43], [12, 44]];
  const BQST = { c0: -1, was: false };
  if (typeof basquete !== 'undefined') {
    const ia16 = basquete.ia;
    basquete.ia = function (f, x, face, ex, look, tt, lift = 0) {
      if (!BQOK()) return ia16.apply(this, arguments);
      let an = 'espera', k = Math.floor(tt * 8) % 8;
      if (this.charging && !BQST.was) BQST.c0 = tt; BQST.was = !!this.charging;
      if (f === 3) { const q = clamp(1 - this.shootT / .45, 0, .999); an = 'arremesso'; k = 3 + Math.floor(q * 5); }
      else if (f === 2) { an = 'carrega'; k = Math.min(7, Math.floor((tt - BQST.c0) / .35 * 8)); const m = BQ_MAOS_CAR[k]; BQ_MAO.carrega[0] = m[0]; BQ_MAO.carrega[1] = m[1]; }
      else if (f === 4) { an = 'festa'; k = Math.floor(tt * 10) % 8; }
      else if (f === 5) { an = 'errou'; k = Math.min(7, Math.floor((1 - this.missT / .8) * 8)); }
      else if (f === 1) { an = 'andar'; k = Math.floor(this.walk * 11) % 8; BQ_MAO.quica[0] = 15; }
      else { BQ_MAO.parado[0] = BQ_MAOS_ESP[0]; BQ_MAO.parado[1] = BQ_MAOS_ESP[1]; }
      ctx.save(); ctx.translate(x, VGY + 1); frameBq(an, k, ex, face < 0); ctx.restore();
    };
  }
  // Amiguinho defensor pintado (mvbbq.py -> MVB.a.bqDefesa e bqToco, desenhado pelo Amiguinho do vôlei com a cor dele):
  // parado marcando = defesa (laço); agachando = toco 1-2; no pulo = toco 3-8 (a altura vem da física)
  if (typeof basquete !== 'undefined') {
    const vSprite16b = vSprite;
    vSprite = function (key, anim, f, p, face) {
      const MB2 = window.MVB;
      if (key !== 'am_rosa' || cur !== basquete || !MB2 || !MB2.a.bqDefesa || !window.__fr || !window.__fr.bl) return vSprite16b.apply(this, arguments);
      const D = basquete.def, tt = arguments[8] || 0, lift = arguments[10] || 0;
      let an = 'bqDefesa', k = Math.floor(tt * 8) % 8, ex = 0;
      if (D.ph === 'agacha') { an = 'bqToco'; k = Math.min(1, Math.floor((1 - D.t / .32) * 2)); }
      else if (D.ph === 'pulo') { an = 'bqToco'; k = Math.min(7, 2 + Math.floor((1 - D.t / .62) * 6)); ex = 5; }
      try { ctx.save(); ctx.translate(p.x, p.y - lift); window.__fr.bl(an, k, 'g', ex, face < 0); ctx.restore(); } catch (e) { ctx.restore(); return vSprite16b.apply(this, arguments); }
    };
  }
