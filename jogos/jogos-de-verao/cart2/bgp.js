{ /* ============================================================ Corrida de bugue pintada (bugues vistos de cima)
     Pranchas do dono (mvbg.py). IAmiguinho: reto (hélice e pneus girando, mais rápido com mais velocidade), rodas da frente para a
     esquerda/direita conforme o volante, derrapando (areia saindo dos pneus de trás; o desenho é da derrapagem para a direita e
     espelha para a esquerda) e rodopiando (os 4 desenhos girados, desfeito o giro: o bugue segue a direção do jogo e as estrelinhas rodam).
     Amiguinhos: as pranchas rosa, com a cor de cada um (mesma troca de cor do vôlei): reto, rodas virando, derrapando e rodopiando. O jogo gira o desenho com o bugue. */
  const BGA = window.BGA, BGI = {};
  if (BGA) for (const n of ['ia', 'iad', 'ias', 'bl', 'bld', 'bls']) if (BGA[n]) { BGI[n] = new Image(); BGI[n].src = BGA[n].src; }
  const ok = (n) => !!BGI[n] && BGI[n].complete && BGI[n].naturalWidth > 0;
  const BGOK = () => !!BGA && ['ia', 'iad', 'ias', 'bl', 'bld', 'bls'].every(ok);
  window.__BGOK = BGOK;
  // bugue do Amiguinho na cor de cada um (feito uma vez por cor)
  const BGT = {};
  function bgTint(set, col) {
    const key = set + col; if (BGT[key]) return BGT[key];
    const im = BGI[set], c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0); const T = hsv(...hexRGB(col));
    if (Math.abs(T[0] - PINK[0]) > 2 || Math.abs(T[1] - PINK[1]) > .03) {
      const d = g.getImageData(0, 0, c.width, c.height), px = d.data, ks = T[1] / PINK[1], kv = T[2] / PINK[2];
      for (let q = 0; q < px.length; q += 4) {
        if (!px[q + 3]) continue;
        const [h, s, v] = hsv(px[q], px[q + 1], px[q + 2]);
        if (s < .18 || (h > 40 && h < 270)) continue; // pneus, gaiola, visor e faróis ficam
        const nh = ((T[0] + (h - PINK[0]) * .6) % 360 + 360) % 360, [r, gg, b] = rgbOf(nh, clamp(s * ks, 0, 1), clamp(v * (.55 + .45 * kv), 0, 1));
        px[q] = r; px[q + 1] = gg; px[q + 2] = b;
      }
      g.putImageData(d, 0, 0);
    }
    return (BGT[key] = c);
  }
  // qual desenho: [conjunto, quadro, espelhado]
  function bgPick(k, tt) {
    const p = Math.floor(k.ph || 0), st = k.cst || 0;
    if (k.spin > 0) return [k.me ? 'ias' : 'bls', Math.floor(tt * 10) % 4, false];
    if (k.drift && !(k.z > 0)) return [k.me ? 'iad' : 'bld', p % 4, k.dsg < 0];
    const f = st < -.25 ? 4 + (p % 2) : st > .25 ? 6 + (p % 2) : p % 4;
    return [k.me ? 'ia' : 'bl', f, false];
  }
  if (typeof bugue !== 'undefined') {
    const buggy16 = bugue.drawBuggy;
    bugue.drawBuggy = function (k, tt) {
      if (!BGOK()) return buggy16.call(this, k, tt);
      const z = k.z * .12, [set, fi, flip] = bgPick(k, tt), A = BGA[set], f = A.f[fi], u = 1 / BGA.u;
      ctx.fillStyle = 'rgba(80,60,30,.28)'; ctx.beginPath(); ctx.ellipse(k.x + 2.5, k.y + 3.5, 12.5 - z * .3, 9 - z * .2, k.h, 0, TAU); ctx.fill();
      const blink = k.inv > 0 && !(k.spin > 0) && Math.floor(tt * 16) % 2 === 0;
      ctx.save(); if (blink) ctx.globalAlpha = .35; ctx.imageSmoothingEnabled = true; ctx.translate(k.x, k.y - z); ctx.rotate(k.h);
      ctx.translate(0, clamp(k.lean, -2.2, 2.2));
      const sc = 1 + z / 30; ctx.scale(sc * (1 + (k.sq || 0) * .4) * u, sc * (1 - (k.sq || 0) * .3) * u * (flip ? -1 : 1));
      if (f.r) ctx.rotate(-f.r * Math.PI / 180);
      ctx.drawImage(k.me ? BGI[set] : bgTint(set, k.col), f.x, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
      ctx.restore();
      this.drawBuggyFx(k, tt, z);
    };
  }

  /* ---------- cenário pintado (bgcen.py): dunas nos 3 horários, beira-mar, muretas, rampas, largada, bandeirinhas, areia fofa,
     ladeiras, caixas, itens e farol. Pista, muretas e peças recebem a luz do horário numa camada (como na bocha). */
  const BGC = window.BGC, BCI2 = {};
  const cImg = (k, src) => { if (!src) return null; let im = BCI2[k]; if (!im) { im = BCI2[k] = new Image(); im.src = src; } return im.complete && im.naturalWidth ? im : null; };
  const CATL = () => BGC && cImg('atl', BGC.atl);
  window.__BGCOK = () => !!BGC && !!CATL() && ['dia', 'tarde', 'noite'].every((v) => cImg('d_' + v, BGC.d[v])) && !!cImg('mar', BGC.mar);
  const BG_HORAS = [['noite', 5, 'dia'], ['dia', 16, 'tarde'], ['tarde', 19, 'noite']];
  function bgPesos() {
    const d = new Date(), h = window.__skHora != null ? window.__skHora : d.getHours() + d.getMinutes() / 60;
    for (const [a, b, c] of BG_HORAS) if (Math.abs(h - b) < .5) { const t = h - b + .5; return [[a, 1 - t], [c, t]]; }
    return [[h >= 5 && h < 16 ? 'dia' : h >= 16 && h < 19 ? 'tarde' : 'noite', 1]];
  }
  const BG_TINT = { dia: ['#fff8e8', 0], tarde: ['#ff8a4a', .16], noite: ['#22306e', .46] };
  function bgTintNow() {
    let r = 0, g = 0, b = 0, a = 0;
    for (const [v, w] of bgPesos()) { const [c, k] = BG_TINT[v], n = parseInt(c.slice(1), 16); r += ((n >> 16) & 255) * w; g += ((n >> 8) & 255) * w; b += (n & 255) * w; a += k * w; }
    return [`rgb(${r | 0},${g | 0},${b | 0})`, a];
  }
  const nightNow = () => bgPesos().reduce((a, [v, w]) => a + (v === 'noite' ? w : v === 'tarde' ? w * .3 : 0), 0);
  // peça do atlas com o centro na origem, do tamanho pedido (w x h em unidades do mundo)
  function part(nm, w, h) { const f = BGC.p[nm], im = CATL(); ctx.drawImage(im, f.x, f.y, f.w, f.h, -w / 2, -h / 2, w, h); }
  const asp = (nm) => BGC.p[nm].h / BGC.p[nm].w;
  // faixa repetida ao longo de um segmento (muretas): fonte = tile, começa no deslocamento s0
  function stripSeg(nm, x0, y0, x1, y1, th, tl, s0) {
    const f = BGC.p[nm], im = CATL(), L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
    ctx.save(); ctx.translate(x0, y0); ctx.rotate(a); let d = -.6, s = ((s0 % tl) + tl) % tl;
    while (d < L + .6) { const take = Math.min(tl - s, L + .6 - d); ctx.drawImage(im, f.x + s / tl * f.w, f.y, take / tl * f.w, f.h, d, -th / 2, take, th); d += take; s = 0; }
    ctx.restore(); return s0 + L;
  }
  let LAYER = null, LSAVE = null;
  if (typeof bugue !== 'undefined' && BGC) {
    const P0 = {}; for (const n of ['drawGround', 'drawSea', 'drawWalls', 'drawCWalls', 'drawScRamp', 'drawRamp', 'drawStart', 'drawFlag', 'drawBox', 'drawPud', 'drawProj', 'drawFofa', 'drawSlopes', 'drawFarol', 'drawItemIcon', 'drawBuggyFx', 'draw']) P0[n] = bugue[n];
    const on = () => !!CATL();
    bugue.drawGround = function (tt, vw, vh) {
      const P = bgPesos().map(([v, w]) => [w, cImg('d_' + v, BGC.d[v])]).filter((p) => p[0] > .001);
      if (!on() || P.some((p) => !p[1])) { this.painted = false; return P0.drawGround.call(this, tt, vw, vh); }
      this.painted = true; const T = 400, x0 = Math.floor((this.camX - vw / 2) / T) * T, y0 = Math.floor((this.camY - vh / 2) / T) * T;
      ctx.save(); ctx.imageSmoothingEnabled = true;
      for (const [w, im] of P) { ctx.globalAlpha = w; for (let x = x0; x < this.camX + vw / 2; x += T) for (let y = y0; y < this.camY + vh / 2; y += T) ctx.drawImage(im, x - .3, y - .3, T + .6, T + .6); }
      ctx.restore();
    };
    // a pista e as peças numa camada que recebe a luz do horário
    bugue.layerBegin = function () {
      if (!this.painted) return; const t = bgTintNow(); if (t[1] < .01) return;
      const cv = ctx.canvas; if (!LAYER) LAYER = document.createElement('canvas');
      if (LAYER.width !== cv.width || LAYER.height !== cv.height) { LAYER.width = cv.width; LAYER.height = cv.height; }
      const g = LAYER.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, LAYER.width, LAYER.height); g.setTransform(ctx.getTransform()); g.imageSmoothingEnabled = ctx.imageSmoothingEnabled;
      LSAVE = [ctx, t]; ctx = g;
    };
    bugue.layerEnd = function () {
      if (!LSAVE) return; const [main, t] = LSAVE, g = ctx; LSAVE = null; ctx = main;
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = t[1]; g.fillStyle = t[0]; g.fillRect(0, 0, LAYER.width, LAYER.height); g.restore();
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(LAYER, 0, 0); ctx.restore();
    };
    bugue.drawSea = function (tt, vw, vh) {
      const im = cImg('mar', BGC.mar); if (!this.painted || !im) return P0.drawSea.call(this, tt, vw, vh);
      const oy = BG_T.box.y0 - 146; if (this.camY - oy - vh / 2 > 120) return;
      const TW = 640, TH = 160, top = oy - 10, x0 = Math.floor((this.camX - vw / 2) / TW) * TW, yv = this.camY - vh / 2 - 20;
      ctx.save(); ctx.imageSmoothingEnabled = true; const sw = Math.sin(tt * .8) * 1.5; // a água vai e volta um pouquinho
      // mar aberto acima da faixa: a água do alto da faixa, esticada
      if (yv < top + sw) for (let x = x0; x < this.camX + vw / 2; x += TW) ctx.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight * .12, x - .3, yv, TW + .6, top + sw - yv + 1);
      for (let x = x0; x < this.camX + vw / 2; x += TW) ctx.drawImage(im, x - .3, top + sw, TW + .6, TH);
      ctx.restore();
    };
    bugue.drawWalls = function (off) {
      if (!this.painted) return P0.drawWalls.call(this, off);
      const n = BG_LINE.length, vw = W / BG.Z, vh = H / BG.Z, th = 7.5, tl = th * (BGC.p.mureta.w / BGC.p.mureta.h);
      for (const sd of [-1, 1]) { const d = sd * (BG.hw + 3); let s = 0;
        const pt = (i) => { const p = BG_LINE[i % n], q = BG_LINE[(i + 1) % n], nx = -(q[1] - p[1]), ny = q[0] - p[0], nl = Math.hypot(nx, ny) || 1; return [p[0] + nx / nl * d, p[1] + ny / nl * d]; };
        let A = pt(0);
        for (let i = 1; i <= n; i++) { const B = pt(i), L = Math.hypot(B[0] - A[0], B[1] - A[1]);
          if (Math.abs(A[0] - this.camX) < vw / 2 + 30 && Math.abs(A[1] - this.camY) < vh / 2 + 30) stripSeg('mureta', A[0], A[1], B[0], B[1], th, tl, s);
          s += L; A = B; } }
    };
    bugue.drawCWalls = function (LG, A, ang) {
      if (!this.painted) return P0.drawCWalls.call(this, LG, A, ang);
      const th = 7.5, tl = th * (BGC.p.mureta.w / BGC.p.mureta.h);
      ctx.save(); ctx.translate(A[0], A[1]); ctx.rotate(ang); for (const [x, y] of LG.walls) stripSeg('mureta', x, y, x + 9.5, y, th, tl, x); ctx.restore();
    };
    // rampas: módulos de madeira atravessando a pista (a areia do desenho fica do lado de quem chega)
    function ramps(nm, x, y, a, across, depth, mods) {
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(x, y); ctx.rotate(a); ctx.rotate(-Math.PI / 2);
      const w = across / mods; for (let m = 0; m < mods; m++) { ctx.save(); ctx.translate(-across / 2 + w * (m + .5), 0); part(nm, w, depth); ctx.restore(); }
      ctx.restore();
    }
    bugue.drawRamp = function (x, y, a) { if (!this.painted) return P0.drawRamp.call(this, x, y, a); ramps('rampa', x, y, a, BG.hw * 2 - 6, 40, 2); };
    bugue.drawScRamp = function (RP) { if (!this.painted) return P0.drawScRamp.call(this, RP); ramps('rampa_at', RP.x, RP.y, RP.a, BG.sw * 2, 36, 1); };
    bugue.drawStart = function (x, y, a) {
      if (!this.painted) return P0.drawStart.call(this, x, y, a);
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(x, y); ctx.rotate(a + Math.PI / 2); const w = BG.hw * 2 + 26; part('largada', w, w * asp('largada')); ctx.restore();
    };
    bugue.drawFlag = function (x, y, red) {
      if (!this.painted) return P0.drawFlag.call(this, x, y, red);
      const nm = red ? 'band_v' : 'band_b', h = 10; ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(x + 3, y - 4); part(nm, h / asp(nm), h); ctx.restore();
    };
    bugue.drawBox = function (x, y, rot, tt, b) {
      if (!on()) return P0.drawBox.call(this, x, y, rot, tt, b);
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(x, y - 1.5 * Math.abs(Math.sin(tt * 2.2 + b.j))); ctx.rotate(rot * .5); part('caixa', 14, 14 * asp('caixa')); ctx.restore();
    };
    bugue.drawPud = function (u) {
      if (!on()) return P0.drawPud.call(this, u);
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(u.x, u.y); ctx.rotate(.3); part('poca_p', 28, 28 * asp('poca_p')); ctx.restore();
    };
    bugue.drawProj = function (p) {
      if (!on()) return P0.drawProj.call(this, p);
      if (p.k === 'bola') { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 3, 5, 2, 0, 0, TAU); ctx.fill();
        ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(p.x, p.y - Math.abs(Math.sin(p.t * 9)) * 6); ctx.rotate(p.t * 8); part('bola_p', 11, 11); ctx.restore(); }
      else { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 4, 5, 2, 0, 0, TAU); ctx.fill();
        ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(p.x, p.y - 4); ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2); part('balao_p', 10, 10 * asp('balao_p')); ctx.restore(); }
    };
    // areia fofa: a mancha certa pelo tamanho; no corredor do atalho, a faixa comprida
    bugue.drawFofa = function (x, y, rx, ry, a, tt, strip) {
      if (!this.painted) return P0.drawFofa.call(this, x, y, rx, ry, a, tt, strip);
      const nm = strip && rx > ry * 2.5 ? 'faixa' : rx * ry > 2200 ? 'fofa3' : rx * ry > 700 ? 'fofa2' : 'fofa1';
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(x, y); ctx.rotate(a); part(nm, rx * 2.15, ry * 2.15); ctx.restore();
    };
    // ladeiras: setas na areia nas descidas, areia marcada de pneu nas subidas
    bugue.drawSlopes = function (tt) {
      if (!this.painted) return P0.drawSlopes.call(this, tt);
      const n = BG_LINE.length; if (!BG_T.slopes.length) return;
      for (const z of BG_T.slopes) {
        ctx.beginPath(); for (let i = z.a; i <= z.b; i++) { const p = BG_LINE[i % n]; i === z.a ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); }
        ctx.strokeStyle = z.s > 0 ? 'rgba(255,255,245,.14)' : 'rgba(120,80,40,.1)'; ctx.lineWidth = BG.hw * 2 - 6; ctx.lineCap = 'butt'; ctx.stroke();
        const nm = z.s > 0 ? 'setas' : 'trilha';
        for (let i = z.a + 4; i < z.b - 2; i += 9) { const p = BG_LINE[i % n], q = BG_LINE[(i + 2) % n], a = Math.atan2(q[1] - p[1], q[0] - p[0]); ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(p[0], p[1]); ctx.rotate(a - Math.PI / 2);
          ctx.globalAlpha = .6; for (const o of [-40, 0, 40]) { ctx.save(); ctx.translate(o, 0); part(nm, 30, 30 * asp(nm)); ctx.restore(); } ctx.restore(); }
      }
    };
    // farol: a torre aqui; o facho depois dos bugues (drawLights), sem a tinta da noite
    bugue.drawFarol = function (x, y, tt) {
      if (!this.painted) return P0.drawFarol.call(this, x, y, tt);
      ctx.fillStyle = 'rgba(80,60,30,.25)'; ctx.beginPath(); ctx.ellipse(x + 10, y + 8, 48, 44, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(x, y); part('torre', 100, 100 * asp('torre')); ctx.restore();
    };
    bugue.drawLights = function (tt) {
      if (!this.painted || !BG_T.farol) return; const [x, y] = BG_T.farol, a = tt * .9, nt = nightNow(), f = BGC.p.facho, L = 420;
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = .42 + .4 * nt; if (nt > .3) ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(CATL(), f.x, f.y, f.w, f.h, 0, -L * f.h / f.w * .3, L, L * f.h / f.w * .6); ctx.restore();
    };
    // escudo do guarda-sol: o guarda-sol aberto em cima do bugue
    bugue.drawBuggyFx = function (k, tt, z) {
      if (!on() || !(k.shield > 0)) return P0.drawBuggyFx.call(this, k, tt, z);
      const s0 = k.shield; k.shield = 0; P0.drawBuggyFx.call(this, k, tt, z); k.shield = s0;
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = s0 < 1.5 && Math.floor(tt * 10) % 2 ? .45 : .92; ctx.translate(k.x - 1, k.y - z - 3); ctx.rotate(tt * 1.2); part('guarda_p', 22, 22); ctx.restore();
    };
    bugue.drawItemIcon = function (k, x, y) {
      const nm = { bola: 'bola_g', balao: 'balao_g', coco: 'coco_g', guarda: 'guarda_g', protetor: 'frasco_g', onda: 'onda_g' }[k];
      if (!on() || !nm) return P0.drawItemIcon.call(this, k, x, y);
      const f = BGC.p[nm], s = 19 / Math.max(f.w, f.h); ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(x, y); part(nm, f.w * s, f.h * s); ctx.restore();
    };
    // onda: além da água na tela, a onda pintada passa de um lado para o outro
    bugue.draw = function (tt) {
      P0.draw.call(this, tt);
      if (this.wave > 0 && on()) { const k = 1 - this.wave / 2.2, f = BGC.p.onda_g, w = 120, h = w * f.h / f.w;
        ctx.save(); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = Math.min(1, this.wave * 2); ctx.translate(-w / 2 + k * (W + w), H * .42); part('onda_g', w, h); ctx.restore(); }
    };
  }
}
