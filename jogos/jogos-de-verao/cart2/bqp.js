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

  /* ---------- Quadra da Laje pintada (bqcen.py -> window.BQC): cenário nos 4 horários, cesta em peças, redes, bola, carrinho e torcida.
     O desenho da prova é o mesmo de antes, com o cenário, a cesta e a bola trocados (a física e as medidas da cesta não mudam). */
  const BQC = window.BQC, BQX = {};
  const bqImg = (k, src) => { if (!src) return null; let im = BQX[k]; if (!im) { im = BQX[k] = new Image(); im.src = src; } return im.complete && im.naturalWidth ? im : null; };
  const BQCOK = () => !!BQC && !!bqImg('atl', BQC.atl);
  window.__BQCOK = BQCOK;
  const BQ_HORAS = [['noite', 5, 'manha'], ['manha', 10, 'dia'], ['dia', 16, 'tarde'], ['tarde', 19, 'noite']];
  function bqPesos() {
    const d = new Date(), h = window.__skHora != null ? window.__skHora : d.getHours() + d.getMinutes() / 60;
    for (const [a, b, c] of BQ_HORAS) if (Math.abs(h - b) < .5) { const t = h - b + .5; return [[a, 1 - t], [c, t]]; }
    return [[h >= 5 && h < 10 ? 'manha' : h >= 10 && h < 16 ? 'dia' : h >= 16 && h < 19 ? 'tarde' : 'noite', 1]];
  }
  // peça do atlas com a âncora dela em (x, y); uw/uh em unidades (opcionais: esticam); sx espelha
  function bqPart(name, x, y, uw, uh, sx = 1, rot = 0) {
    const f = BQC.p[name]; if (!f) return; const im = bqImg('atl', BQC.atl), w = uw ?? f.uw, h = uh ?? f.uh;
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(sx, 1);
    ctx.drawImage(im, f.x, 0, f.w, f.h, -f.ax * w / f.uw, -f.ay * h / f.uh, w, h); ctx.restore();
  }
  function bqScene(v, tt) {
    const P = bqPesos().filter(([, w]) => w > .001), night = P.reduce((a, [h, w]) => a + (h === 'noite' ? w : h === 'tarde' ? w * .25 : 0), 0);
    ctx.save(); ctx.imageSmoothingEnabled = true;
    for (const [h, w] of P) { const im = bqImg('f_' + h, BQC.f[h]); if (im) { ctx.globalAlpha = w; ctx.drawImage(im, 0, 0, W, H); } } ctx.globalAlpha = 1;
    const lf = night > .01 && bqImg('lf', BQC.lf); if (lf) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * (.32 + .08 * Math.sin(tt * 1.7)); ctx.drawImage(lf, 0, 0, W, H); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    for (const [h, w] of P) { const im = bqImg('m_' + h, BQC.m[h]); if (im) { ctx.globalAlpha = w; ctx.drawImage(im, 0, 0, W, H); } } ctx.globalAlpha = 1;
    const lm = night > .01 && bqImg('lm', BQC.lm); if (lm) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * (.45 + .1 * Math.sin(tt * 2.3 + 1)); ctx.drawImage(lm, 0, 0, W, H); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
    // torcida pequena encostada no alambrado (os mesmos 8 lugares de antes); comemora quando a bola cai
    const cheer = v.cheer > 0;
    [44, 66, 88, 110, 206, 228, 250, 272].map((x) => x * W / 320).forEach((x, k) => {
      const c = k % 6, m2 = (n) => ((Math.floor(n) % 2) + 2) % 2, f = cheer ? 2 + m2(tt * 8 + k) : m2(tt * 1.5 + k * .7);
      const hop = cheer ? Math.max(0, Math.sin(tt * 12 + k)) * 3 : 0;
      bqPart(`t${c}_${f}`, x, VGY - 26 - hop, undefined, undefined, k >= 4 ? -1 : 1);
    });
  }
  // cesta: base no chão, poste (repete) até o topo, braço (repete) até a tabela, tabela (bordas e o meio que repete) do tamanho da física,
  // rede e aro por cima na altura do aro da física; a biruta (vento) no alto do poste
  function bqHoop(v, tt, BX, rx, ry) {
    const p = BQC.p, pc = BX + 26, top = ry - 19, bTop = VGY + 1;
    bqPart('carro', 2, VGY + 1);
    bqPart('base', pc, bTop);
    const ph = p.poste.uh, pTop = top + p.topo.uh * .4, pBot = bTop - p.base.uh * .6;
    for (let y = pBot; y > pTop - ph; y -= ph - .3) { const hh = Math.min(ph, y - pTop); if (hh > .3) bqPart('poste', pc, y - hh / 2, p.poste.uw, hh); }
    bqPart('topo', pc, top + p.topo.uh * .3);
    for (let x = BX + 6; x < pc - 2; x += p.braco.uw - .3) { const ww = Math.min(p.braco.uw, pc - 2 - x); bqPart('braco', x + ww / 2, ry - 15, ww, p.braco.uh); }
    // tabela: de ry − 36 a ry + 8 (44)
    // 01/11 (pedido do dono): a tabela pintada é vista de frente, então o meio dela (o quadrado laranja) fica onde está o centro da bola quando ela bate (BX − BQ.R)
    const y0 = ry - 36, th = 44, wE = p.tabE.uw, wD = p.tabD.uw, tx = BX - BQ.R - (wE + wD) / 2; /* o centro da bola encosta no meio */ bqPart('tabE', tx, y0, wE, th); bqPart('tabD', tx + wE, y0, wD, th);
    if (sReady('eb_obj')) {
      const E = SPR.eb_obj, k = clamp(v.wind / 40, -1, 1), f = E.fr[Math.abs(k) > .4 ? 'biruta1' : 'biruta2'], dir = k < -.05 ? -1 : 1;
      ctx.save(); ctx.translate(pc, top - 10); ctx.scale(dir, 1); ctx.drawImage(sImg('eb_obj'), f.x, f.y, f.w, f.h, -4.5, -f.h / 2, f.w / 2, f.h / 2); ctx.restore();
    }
  }
  // 02/11 (pedido do dono): a rede e o aro são desenhados depois da bola que está passando pela cesta (ela fica por dentro da rede)
  function bqRede(v, tt, rx, ry) {
    // rede: parada · chuá (esticada, logo que a bola passa) · balançando depois; o aro por cima
    const nt = v.net;
    // 01/11 (pedido do dono): a rede presa no aro. A parada vai no ponto de encaixe do pacote (antes estava 1,4 abaixo e ficava solta);
    // o chuá e o balanço sobem 1,2 (12 px da peça) para o anel branco de cima ficar escondido atrás do aro.
    if (nt > .3) bqPart('swish' + Math.min(3, Math.floor((1 - (nt - .3) / .5) * 4)), rx, ry - 1.2);
    else if (nt > 0) bqPart('bal' + (Math.floor(tt * 14) % 4), rx, ry - 1.2);
    else bqPart('rede', rx, ry);
    bqPart('aro', rx, ry);
  }
  const BQ_BOLA = 1.3;
  if (typeof basquete !== 'undefined') {
    // 01/11 (pedido do dono): a cesta não anda mais (nem troca de lugar entre as séries, nem desliza); as séries mudam só o vento e a marcação.
    // A linha de três é a linha do meio da quadra pintada (x 199,5 na altura dos pés).
    // A bola é desenhada 30% maior (BQ_BOLA); a física do aro continua com o mesmo tamanho (com a bola maior, até o arremesso perfeito batia no aro).
    // No chão ela quica pelo tamanho do desenho (BQ.CHAO), para não afundar na quadra.
    BQ_SERIES.forEach((q) => { q.rx = 345; q.ry = 100; q.slide = 0; });
    BQ.CHAO = (BQC ? BQC.p.bola0.uw / 2 : 7.3) * BQ_BOLA;
    const draw16q = basquete.draw, ball16q = basquete.ball;
    basquete.ball = function (x, y, spin, fire = false, vx = 1) {
      if (!BQCOK()) return ball16q.apply(this, arguments);
      const k = ((Math.floor(spin * 1.3) % 4) + 4) % 4;
      const e = BQ_BOLA, fb = BQC.p['fogo' + k], bb = BQC.p['bola' + k];
      if (fire) bqPart('fogo' + k, x, y, fb && fb.uw * e, fb && fb.uh * e, vx < 0 ? -1 : 1); else bqPart('bola' + k, x, y, bb && bb.uw * e, bb && bb.uh * e);
    };
    basquete.draw = function (tt) { if (!BQCOK()) return draw16q.call(this, tt); bqDraw.call(this, tt); };
  }
function bqDraw(tt) {
      bqScene(this, tt);
      const rx = this.rx, ry = this.ry, BX = this.bx(), art = sReady('bq_obj');
      // 01/11: a linha de três é a linha do meio pintada na quadra (BQ_LINHA3); o jogo não desenha outra
      bqHoop(this, tt, BX, rx, ry);
      // 02/11: a bola dentro da cesta (entre as bordas do aro, do aro até o fim da rede) vai antes da rede: fica por trás dela
      const naCesta = (b) => Math.abs(b.x - rx) < BQ.RR && b.y > ry - 9 && b.y < ry + 30;
      for (const b of this.balls) if (naCesta(b)) this.ball(b.x, b.y, b.spin, b.fire && !b.done, b.vx);
      bqRede(this, tt, rx, ry);
      // marcação (Amiguinho rosa)
      const D = this.def;
      if (D.on && sReady('am_rosa')) {
        const a = D.ph === 'pulo' ? ['pulo', 1] : D.ph === 'agacha' ? ['aterrissagem', 1] : ['parado', Math.floor(tt * 4) % 4];
        vSprite('am_rosa', a[0], a[1], { x: D.x, y: VGY + 1 }, -1, D.ph === 'pulo' ? 5 : 0, { lx: -1, ly: 0 }, false, tt, 0, D.lift);
      }
      // IAmiguinho: 0 parado com a bola no peito · 1 quicando (andando) · 2 carregando · 3 soltando (no ar) · 4 comemora · 5 errou
      if (sReady('ia_bq', 'rostos')) {
        let f = 0, ex = 0, lift = 0, face = 1, hand = BQ_MAO.parado, by = 0, ball = this.cd <= 0;
        if (this.shootT > 0) { const k = 1 - this.shootT / .45; f = 3; ex = 5; lift = k < .5 ? 6 + 4 * k : 16 * (1 - k); ball = false; } // já sai do chão com a bola na mão no alto
        else if (this.charging) { f = 2; ex = 5; hand = BQ_MAO.carrega; by = -(1 - this.p) * 2; }
        else if (this.cheer > .6) { f = 4; ex = 2; ball = false; }
        else if (this.missT > 0) { f = 5; ex = 4; ball = false; }
        else if (this.walk > 0) { f = 1; face = this.face; hand = BQ_MAO.quica; by = 0; }
        else by = Math.round(Math.sin(tt * 3)) * .5;
        this.ia(f, this.px, face, ex, { lx: 1, ly: this.charging ? -1 : 0 }, tt, lift);
        if (ball && this.shootT <= 0 && this.cheer <= .6) {
          if (f === 1) { const q = Math.abs(Math.sin(tt * 8)); this.ball(this.px + face * hand[0], VGY - (BQ.CHAO || 5) + 1 - q * 6, tt * 4); } /* a bola maior quica sem afundar no chão */
          else this.ball(this.px + face * hand[0], VGY - hand[1] + by, tt * .5);
        }
      }
      // bolas no ar e fogo
      for (const f of this.fx) R(f.x, f.y, 2, 2, f.fire ? (f.t < .12 ? '#fff3b0' : f.t < .24 ? '#ffb020' : '#e8443a') : '#ffffff');
      for (const b of this.balls) if (!naCesta(b)) this.ball(b.x, b.y, b.spin, b.fire && !b.done, b.vx);
      // medidor de força: só mostra quanta força você está colocando (enche e esvazia); o ponto certo é com você
      if (this.charging || this.shootT > 0) {
        const p = this.charging ? this.p : this.lastP, bh = 40, bw = 4, x0 = Math.round(this.px - 23), y0 = VGY - 62, Y = (q) => y0 + bh - Math.round(q * bh);
        R(x0 - 1, y0 - 1, bw + 2, bh + 2, NAVY); R(x0, y0, bw, bh, '#2b3442');
        R(x0, Y(p), bw, y0 + bh - Y(p), 'rgba(255,255,255,.55)'); R(x0 - 1, Y(p) - 1, bw + 2, 2, '#ffffff');
      }
    }
