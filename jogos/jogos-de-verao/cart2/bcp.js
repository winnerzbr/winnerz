{ /* bocha: bloco próprio */
  /* ============================================================ Bocha pintada (IAmiguinho, bolas e peças da cancha)
     Pranchas do IAmiguinho (mvbc.py): esperando a vez, lançar rolando, lançar pelo alto e medindo/torcendo. Na mira, o braço vai para
     trás conforme a força (quadros 1-4); ao soltar, quadros 5-8; com a bola andando, torce (1-6); rodada ou jogo ganho, punho e
     joinha (7-8). Na tristeza continua o desenho do vôlei. O Amiguinho usa as 4 pranchas da bocha dele (mvbcb.py), pelo desenho do Amiguinho do vôlei (cor, rosto e máscara da tela).
     Bolas, bolim, conchas, pegadas e tábuas da borda: a folha pintada, vista de cima. A vila (com a cancha e as tábuas) vem pintada nos
     4 horários (bccen.py); com ela, as tábuas da folha ficam de reserva. */
  const MB = window.MVBC, MBI = {}, MBK = {}, BA = window.BCA, BAI = new Image();
  if (MB) for (const [nm, a] of Object.entries(MB.a)) { MBI[nm] = new Image(); MBI[nm].src = a.src; MBK[nm] = new Image(); MBK[nm].src = a.mask; }
  if (BA) BAI.src = BA.atl;
  const BCOK = () => !!MB && Object.keys(MBI).every((n) => MBI[n].complete && MBI[n].naturalWidth > 0 && MBK[n].complete && MBK[n].naturalWidth > 0);
  const BAOK = () => !!BA && BAI.complete && BAI.naturalWidth > 0;
  window.__BCOK = () => BCOK() && BAOK();
  const BCS = MB ? 56 / 325 / MB.q : 1; // a mesma escala do vôlei (o desenho da bocha já vem com a cabeça igualada)
  let FTB = null;
  function frameBc(an, k, ex, mirror) {
    const A = MB.a[an], n = A.f.length, f = A.f[((k | 0) % n + n) % n];
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.scale(BCS * (mirror ? -1 : 1), BCS); if (f.ks || f.kr) { ctx.rotate(f.kr || 0); ctx.scale(f.ks || 1, f.ks || 1); } // tamanho e giro do desenho inteiro (editor)
    ctx.drawImage(MBI[an], f.x, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    if (f.s && f.sz) {
      if (!FTB) FTB = document.createElement('canvas');
      const w = Math.ceil(f.w), h = Math.ceil(f.h);
      if (FTB.width < w || FTB.height < h) { FTB.width = Math.max(FTB.width, w); FTB.height = Math.max(FTB.height, h); }
      const g = FTB.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, FTB.width, FTB.height);
      const cx = f.s[4] ?? (f.s[0] + f.s[2]) / 2, cy = f.s[5] ?? (f.s[1] + f.s[3]) / 2;
      const L1 = f.s[6] || f.sz[0], L2 = f.s[7] || f.sz[1], fk = L2 / 14.5, fkx = clamp(.62 * L1 / (11.6 * fk), .5, 1.3);
      const save = ctx; ctx = g; try { g.save(); g.translate(cx, cy); g.rotate(f.r || 0); glowFace(ex, 0, L2 * .03, fk, fkx); g.restore(); } finally { ctx = save; }
      g.globalCompositeOperation = 'destination-in'; g.drawImage(MBK[an], f.x, 0, f.w, f.h, 0, 0, f.w, f.h); g.globalCompositeOperation = 'source-over';
      ctx.drawImage(FTB, 0, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    }
    ctx.restore();
  }
  (window.__fr = window.__fr || {})['bc'] = frameBc; // usado só pelos testes
  // peça da folha (centro na origem), girada
  function bcPart(name, i, x, y, rot = 0, sc = 1, flip = 1) {
    const L = BA.p[name], f = L[((i | 0) % L.length + L.length) % L.length], u = sc / BA.u;
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(u * flip, u);
    ctx.drawImage(BAI, f.x, 0, f.w, f.h, -f.w / 2, -f.h / 2, f.w, f.h); ctx.restore();
  }
  // tábua comprida repetida ao longo de um lado (x0,y0 até x1,y1), com a grossura de 4,4
  function bcPlank(x0, y0, x1, y1) {
    const f = BA.p.tabua[0], len = f.w / BA.u, L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
    ctx.save(); ctx.translate(x0, y0); ctx.rotate(a); ctx.beginPath(); ctx.rect(0, -3, L, 6); ctx.clip();
    for (let d = 0; d < L; d += len - .6) { ctx.save(); ctx.translate(d, 0); ctx.scale(1 / BA.u, 1 / BA.u); ctx.drawImage(BAI, f.x, 0, f.w, f.h, 0, -f.h / 2, f.w, f.h); ctx.restore(); }
    ctx.restore();
  }
  // mão que segura a bola (fração do quadro da prancha), quadros 1-5 de "rolando" e "pelo alto"; o 5 é o da soltura
  // [0] IAmiguinho, [1] Amiguinho (pranchas da bocha dele, desenhadas pelo Amiguinho do vôlei: window.MVB, animações bc*)
  const HAND = [{
    rolar: [[165 / 222, 205 / 333], [228 / 262, 195 / 337], [25 / 299, 165 / 312], [222 / 300, 255 / 297], [250 / 312, 230 / 296]],
    alto: [[152 / 202, 232 / 327], [220 / 267, 225 / 324], [20 / 300, 170 / 314], [215 / 244, 195 / 335], [257 / 289, 105 / 346]],
  }, {
    rolar: [[336 / 380, 178 / 321], [353 / 399, 173 / 304], [45 / 424, 198 / 289], [258 / 372, 214 / 263], [355 / 411, 199 / 269]],
    alto: [[320 / 357, 205 / 321], [348 / 385, 175 / 280], [38 / 415, 125 / 271], [333 / 374, 170 / 352], [344 / 391, 75 / 348]],
  }];
  const BLN = { espera: 'bcEspera', rolar: 'bcRolar', alto: 'bcAlto', torce: 'bcTorce' }, SBB = 34.8 / 152; // escala do Amiguinho do vôlei
  const BLOK = () => !!(window.MVB && window.MVB.a.bcEspera && window.__fr && window.__fr.bl);
  const PAINT = (i) => (i ? BLOK() : BCOK());
  const HELD = .7, PX = 30, PY = () => BC.sy + 14; // bola na mão: 70% do tamanho da bola na cancha; lugar de quem joga
  function bcHand(an, k, i = 0) {
    const f = i ? window.MVB.a[BLN[an]].f[k] : MB.a[an].f[k], h = HAND[i][an][k], s = .52 * (i ? SBB : BCS);
    return { x: PX + s * (h[0] * f.w - f.ax), y: PY() + s * (h[1] * f.h - f.ay) };
  }
  // vila vista de cima pintada (bccen.py): 4 horários pelo relógio, misturados na troca, e as luzes da noite por cima
  const BCC = window.BCC, BCI = {};
  const bcImg = (k, src) => { if (!src) return null; let im = BCI[k]; if (!im) { im = BCI[k] = new Image(); im.src = src; } return im.complete && im.naturalWidth ? im : null; };
  const BC_HORAS = [['noite', 5, 'manha'], ['manha', 10, 'dia'], ['dia', 16, 'tarde'], ['tarde', 19, 'noite']];
  function bcPesos() {
    const d = new Date(), h = window.__skHora != null ? window.__skHora : d.getHours() + d.getMinutes() / 60;
    for (const [a, b, c] of BC_HORAS) if (Math.abs(h - b) < .5) { const t = h - b + .5; return [[a, 1 - t], [c, t]]; }
    return [[h >= 5 && h < 10 ? 'manha' : h >= 10 && h < 16 ? 'dia' : h >= 16 && h < 19 ? 'tarde' : 'noite', 1]];
  }
  function bcScene(tt) {
    if (!BCC) return false;
    let P = bcPesos().filter(([, w]) => w > .001).map(([v, w]) => [v, w, bcImg('f_' + v, BCC.f[v])]);
    const ok = P.filter((p) => p[2]); if (!ok.length) return false;
    if (ok.length < P.length) { P = ok; P[0][1] = 1; }
    // a cancha pintada fica exatamente em cima da cancha do jogo
    const c = BCC.c, s = (BC.x1 - BC.x0) / (c[2] - c[0]), ox = BC.x0 - c[0] * s, oy = BC.y0 - c[1] * s, w = BCC.w * s, h = BCC.h * s;
    ctx.save(); ctx.imageSmoothingEnabled = true; R(0, 0, W, H, '#c99a5c');
    for (const [, a, im] of P) { ctx.globalAlpha = a; ctx.drawImage(im, ox, oy, w, h); } ctx.globalAlpha = 1;
    const night = P.reduce((a, [v, wt]) => a + (v === 'noite' ? wt : v === 'tarde' ? wt * .25 : 0), 0), lz = night > .01 && bcImg('lz', BCC.lz);
    if (lz) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * (.42 + .08 * Math.sin(tt * 1.9)); ctx.drawImage(lz, ox, oy, w, h); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore(); return true;
  }
  // luz do horário sobre o que o jogo desenha na cancha (montinhos, areia fofa, pegadas, conchas): cor e força pela mistura dos horários
  const BC_TINT = { dia: ['#fff4dc', 0], manha: ['#ffc98a', .14], tarde: ['#ff7a3c', .24], noite: ['#2a3170', .5] };
  function bcTint() {
    let r = 0, g = 0, b = 0, a = 0;
    for (const [v, w] of bcPesos()) { const [c, k] = BC_TINT[v], n = parseInt(c.slice(1), 16); r += ((n >> 16) & 255) * w; g += ((n >> 8) & 255) * w; b += (n & 255) * w; a += k * w; }
    return [`rgb(${r | 0},${g | 0},${b | 0})`, a];
  }
  let BCL = null;
  function bcLayer(fn, tint) {
    if (!tint || tint[1] < .01) return fn();
    const cv = ctx.canvas; if (!BCL) BCL = document.createElement('canvas');
    if (BCL.width !== cv.width || BCL.height !== cv.height) { BCL.width = cv.width; BCL.height = cv.height; }
    const g = BCL.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, BCL.width, BCL.height); g.setTransform(ctx.getTransform()); g.imageSmoothingEnabled = true;
    const save = ctx; ctx = g; try { fn(); } finally { ctx = save; }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = tint[1]; g.fillStyle = tint[0]; g.fillRect(0, 0, BCL.width, BCL.height); g.restore();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(BCL, 0, 0); ctx.restore();
  }
  window.__BCCOK = () => !!BCC && Object.keys(BCC.f).every((v) => bcImg('f_' + v, BCC.f[v])) && !!bcImg('lz', BCC.lz) && (!BCC.rel || !!bcImg('rel', BCC.rel.atl));
  if (typeof bocha !== 'undefined') {
    const scene16 = bocha.drawScene;
    bocha.drawScene = function (tt) { this.paintedCourt = bcScene(tt); if (!this.paintedCourt) scene16.call(this, tt); };
    // com a vila pintada: montinhos, areia fofa, pegadas e conchas numa camada só, que recebe a luz do horário
    const ground16 = bocha.drawGround;
    bocha.drawGround = function () {
      this._gl = false; if (!this.paintedCourt) return ground16.call(this);
      bcLayer(() => { if (!this.drawRelief()) ground16.call(this); this.drawPrints(); this.drawShells(); }, bcTint()); this._gl = true;
    };
    // montinhos, buracos e areia fofa pintados (folha do relevo): redondos; a areia fofa usa a oval quando é bem comprida
    const REL = BCC && BCC.rel;
    bocha.drawRelief = function () {
      const im = REL && bcImg('rel', REL.atl); if (!im) return false;
      const put = (nm, x, y, w, h, a) => { const f = REL.p[nm]; ctx.save(); ctx.translate(x, y); if (a) ctx.rotate(a); ctx.drawImage(im, f.x, 0, f.w, f.h, -w / 2, -h / 2, w, h); ctx.restore(); };
      ctx.save(); ctx.imageSmoothingEnabled = true;
      for (const s of this.T.soft) { const ov = s.rx > s.ry * 1.25; put(ov ? 'fofa_o' : 'fofa', s.x, s.y, s.rx * 2.2, s.ry * 2.2, s.a); }
      for (const m of this.T.mounds) { const d = m.r * 2.35; ctx.globalAlpha = Math.min(1, .75 + .25 * Math.abs(m.h)); put(m.h > 0 ? 'monte' : 'buraco', m.x, m.y, d, d * (m.h > 0 ? 195 / 208 : 185 / 196)); }
      ctx.restore(); return true;
    };
    const ball16 = bocha.drawBall, people16 = bocha.drawPeople, prints16 = bocha.drawPrints, shells16 = bocha.drawShells, border16 = bocha.drawBorder;
    bocha.inHand = function (b) { return b === this.thrown && this.state === 'roll' && this.t - this.throwT < .16 && PAINT(this.throwBy); };
    bocha.drawBall = function (b) {
      if (!BAOK()) return ball16.call(this, b);
      // a bola que acabou de sair da mão do IAmiguinho vai da mão até a linha em 0,16 s, crescendo até o tamanho da cancha
      const e = this.t - this.throwT;
      if (this.inHand(b) && !b._hand) {
        const h = bcHand(this.kind === 'alto' ? 'alto' : 'rolar', 4, this.throwBy), k = e / .16, z = (b.z || 0) * .6;
        return this.drawBall({ ...b, _hand: true, x: h.x + (b.x - h.x) * k, y: h.y + (b.y - z - h.y) * k, z: 0, r: b.r * (HELD + (1 - HELD) * k) });
      }
      const k = 1 + Math.min(.5, (b.z || 0) / 40), y = b.y - (b.z || 0) * .6;
      ctx.save(); if (!b.alive && b.out) ctx.globalAlpha = .45;
      if (b.jack) bcPart('bolim', 0, b.x, y, (b.roll || 0) * .5, k * (2 * b.r) / 7);
      else bcPart(b.side ? 'rosa' : 'azul', Math.floor(((b.roll || 0) % Math.PI + Math.PI) % Math.PI / (Math.PI / 4)), b.x, y, 0, k * (2 * b.r) / 12);
      ctx.restore();
    };
    bocha.drawPrints = function () {
      if (this._gl) return; // já foi na camada da cancha
      if (!BAOK()) return prints16.call(this);
      ctx.save(); ctx.globalAlpha = .75; this.T.prints.forEach((p, i) => bcPart('pegada', i % 2 ? 1 : 0, p.x, p.y, p.ang + Math.PI / 2, .62)); ctx.restore();
    };
    bocha.drawShells = function () {
      if (this._gl) return;
      if (!BAOK()) return shells16.call(this);
      this.T.shells.forEach((s, i) => bcPart('concha', i, s.x, s.y, s.a, .9));
    };
    bocha.drawBorder = function () {
      if (this.paintedCourt) return; // a vila pintada já traz as tábuas
      if (!BAOK()) return border16.call(this);
      const x0 = BC.x0 - 2, x1 = BC.x1 + 2, y0 = BC.y0 - 2, y1 = BC.y1 + 2;
      bcPlank(x0, y0, x1, y0); bcPlank(x0, y1, x1, y1); bcPlank(x0, y0, x0, y1); bcPlank(x1, y0, x1, y1);
      // cantoneiras: a peça em L em cada canto
      const c = BA.p.tabua[1], s2 = 9 / (c.w / BA.u);
      for (const [x, y, r] of [[x1, y0, 0], [x1, y1, Math.PI / 2], [x0, y1, Math.PI], [x0, y0, -Math.PI / 2]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.scale(s2 / BA.u, s2 / BA.u); ctx.drawImage(BAI, c.x, 0, c.w, c.h, -c.w + 2.2 * BA.u / s2, -2.2 * BA.u / s2, c.w, c.h); ctx.restore(); }
    };
    // IAmiguinho com as pranchas da bocha; o resto continua com os desenhos do vôlei
    bocha.drawPeople = function (tt) {
      if (!BCOK()) return people16.call(this, tt);
      const fr = window.__fr || {}; this._held = false;
      for (const i of [0, 1]) {
        const active = this.state === 'aim' || this.state === 'roll' ? (this.state === 'aim' ? this.who : this.throwBy) === i : false;
        const x = active ? 30 : 18, y = active ? BC.sy + 14 : (i === 0 ? BC.y1 + 8 : BC.y0 + 2);
        ctx.save(); ctx.translate(x, y); ctx.scale(.52, .52);
        let an = null, k = 0, ex = 0, old = null;
        const won = this.over ? this.sc[i] > this.sc[1 - i] : this.state === 'score' && this.res && this.res.w >= 0 ? this.res.w === i : null;
        if (won === false) old = ['sad', Math.min(15, Math.floor((this.over ? this.overT : this.st) * 12))];
        else if (won === true) { an = 'torce'; k = 6 + (Math.floor(tt * 3) % 2); ex = 2; }
        else if (active && this.state === 'aim') { an = this.kind === 'alto' ? 'alto' : 'rolar'; k = this.charging ? Math.min(3, Math.floor(clamp(this.m, 0, 1) * 4)) : 0; ex = 5; }
        else if (active && this.state === 'roll') { const e = this.t - this.throwT; if (e < .45) { an = this.kind === 'alto' ? 'alto' : 'rolar'; k = 4 + Math.min(3, Math.floor(e / .45 * 4)); ex = 5; } else { an = 'torce'; k = Math.floor(e * 5) % 6; ex = 5; } }
        else { an = 'espera'; k = Math.floor(tt * 7) % 8; }
        const hold = an && active && this.state === 'aim' && PAINT(i);
        if (i === 0 && an) frameBc(an, k, ex, false);
        else if (i === 1 && an && BLOK()) { try { fr.bl(BLN[an], k, 'g', ex, false); } catch { /* carregando */ } }
        else { const f = fr[i ? 'bl' : 'ia']; let a2 = old ? old[0] : 'idle', k2 = old ? old[1] : Math.floor(tt * 6) % 16;
          if (!old && i === 1) { if (an === 'torce' && won) { a2 = 'party'; k2 = Math.min(15, Math.floor((this.over ? this.overT : this.st) * 12)); } else if (active && this.state === 'aim' && this.charging) { a2 = 'bump'; k2 = 2 + Math.floor(clamp(this.m, 0, 1) * 4); } else if (active && this.state === 'roll' && this.t - this.throwT < .45) { a2 = 'bump'; k2 = Math.min(15, 7 + Math.floor((this.t - this.throwT) / .45 * 9)); } else if (active) a2 = 'ready'; }
          try { if (f) f(a2, k2, 'g', ex, false); } catch { /* carregando */ } }
        ctx.restore();
        // quem está mirando segura a bola (ou o bolim) na mão, em vez de ela ficar parada na linha
        if (hold) {
          const h = bcHand(an, k, i), jack = this.toss === 'jack';
          this.drawBall({ jack, side: jack ? -1 : i, r: (jack ? BC.rj : BC.rb) * HELD, x: h.x, y: h.y, z: 0, roll: 0 }); this._held = true;
        }
        const left = this.left[i] - (hold && this.toss !== 'jack' ? 1 : 0); for (let n = 0; n < left; n++) { const bx = (active ? 40 : 30) + n * 5, by = y + 4; if (BAOK()) bcPart(i ? 'rosa' : 'azul', 0, bx, by, 0, 4 / 12); else { ctx.fillStyle = i ? '#ec5f9e' : '#3f7fe0'; ctx.strokeStyle = NAVY; ctx.lineWidth = .6; ctx.beginPath(); ctx.arc(bx, by, 2, 0, TAU); ctx.fill(); ctx.stroke(); } }
      }
    };
  }

}
