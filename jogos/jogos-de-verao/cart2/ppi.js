{ /* ============================================================ Pingue-pongue pintado: o IAmiguinho (8 pranchas do dono, mvpi.py)
     A raquete vem desenhada na mão (o jogo não desenha a separada). Esperando: "pronto" (laço); andando sem a raquete preparada: passos
     de lado; com a raquete preparada andando: "andando com a raquete atrás"; parado e preparado: os quadros de antes do toque do golpe
     escolhido (o braço vai para trás conforme o tempo de preparo); depois da batida: do toque até o fim. Rebater = topspin, cortada =
     cortada, efeito e toque curto = efeito por baixo, balão = balão. Saque: a bolinha na mão (quadro 1), jogada para cima (2 e 3),
     raquete atrás (4) e a batida (5 a 8). Comemorar e lamentar seguem com o desenho do vôlei e a raquete separada.
     O Amiguinho (01/11): as 8 pranchas dele (mvbpp.py, animações pp* do desenho do Amiguinho do vôlei, na cor do adversário), com as
     mesmas regras; o toque do saque dele é no quadro 6. */
  const PI = window.MVPI, PII = {}, PIK = {};
  if (PI) for (const [nm, a] of Object.entries(PI.a)) { PII[nm] = new Image(); PII[nm].src = a.src; PIK[nm] = new Image(); PIK[nm].src = a.mask; }
  const PIOK = () => !!PI && Object.keys(PII).every((n) => PII[n].complete && PII[n].naturalWidth > 0 && PIK[n].complete && PIK[n].naturalWidth > 0);
  window.__PIOK = PIOK;
  const PIS = PI ? 56 / 325 / PI.q : 1; // a mesma escala do vôlei (as pranchas já vêm com a cabeça igualada)
  let FTP = null;
  function framePi(an, k, ex, mirror) {
    const A = PI.a[an], n = A.f.length, f = A.f[((k | 0) % n + n) % n];
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.scale(PIS * (mirror ? -1 : 1), PIS); if (f.ks || f.kr) { ctx.rotate(f.kr || 0); ctx.scale(f.ks || 1, f.ks || 1); } // tamanho e giro do desenho inteiro (editor)
    ctx.drawImage(PII[an], f.x, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    if (f.s && f.sz) {
      if (!FTP) FTP = document.createElement('canvas');
      const w = Math.ceil(f.w), h = Math.ceil(f.h);
      if (FTP.width < w || FTP.height < h) { FTP.width = Math.max(FTP.width, w); FTP.height = Math.max(FTP.height, h); }
      const g = FTP.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, FTP.width, FTP.height);
      const cx = f.s[4] ?? (f.s[0] + f.s[2]) / 2, cy = f.s[5] ?? (f.s[1] + f.s[3]) / 2;
      const L1 = f.s[6] || f.sz[0], L2 = f.s[7] || f.sz[1], fk = L2 / 14.5, fkx = clamp(.62 * L1 / (11.6 * fk), .5, 1.3);
      const save = ctx; ctx = g; try { g.save(); g.translate(cx, cy); g.rotate(f.r || 0); glowFace(ex, 0, L2 * .03, fk, fkx); g.restore(); } finally { ctx = save; }
      g.globalCompositeOperation = 'destination-in'; g.drawImage(PIK[an], f.x, 0, f.w, f.h, 0, 0, f.w, f.h); g.globalCompositeOperation = 'source-over';
      ctx.drawImage(FTP, 0, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
    }
    ctx.restore();
  }
  (window.__fr = window.__fr || {})['pi'] = framePi;
  const SHEET = { rebater: 'topspin', cortada: 'cortada', efeito: 'efeito', toque: 'efeito' };
  const MB = window.MVB, PB = {}; // Amiguinho: as imagens das pranchas dele (para saber se já carregaram)
  if (MB && MB.a.ppEspera) for (const [nm, a] of Object.entries(MB.a)) if (nm.startsWith('pp')) { PB[nm] = new Image(); PB[nm].src = a.src; }
  const BLOK = () => !!(MB && MB.a.ppEspera && window.__fr && window.__fr.bl) && Object.values(PB).every((im) => im.complete && im.naturalWidth > 0);
  window.__PBOK = BLOK;
  const BLS = 34.8 / 152; // escala do Amiguinho do vôlei
  const cap = (n) => 'pp' + n[0].toUpperCase() + n.slice(1);
  const okDe = (i) => (i ? BLOK() : PIOK());
  const pinta = (g, p) => okDe(p.i) && !(g.state === 'point' && g.st > .3 && !g.noPoint) && !g.over;
  const toqueDe = (i) => (i ? MB.ppToque : PI.toque), bolaDe = (i) => (i ? MB.ppBola && [MB.ppBola[0] * BLS, MB.ppBola[1] * BLS] : PI.bola && [PI.bola[0] * PIS, PI.bola[1] * PIS]);
  if (typeof pingue !== 'undefined' && (PI || (MB && MB.a.ppEspera))) {
    const char0 = pingue.drawChar, draw0 = pingue.draw;
    pingue.drawChar = function (p, tt) {
      if (!pinta(this, p)) return char0.call(this, p, tt);
      ctx.fillStyle = 'rgba(20,10,20,.3)'; ctx.beginPath(); ctx.ellipse(p.x, this.gy + 1, 15, 3, 0, 0, TAU); ctx.fill();
      const moving = p.mvT > 0, fwd = p.vx * p.f > 0, cyc = ((p.ph / TAU) % 1 + 1) % 1, T = toqueDe(p.i), b = this.b;
      let an = 'espera', k = Math.floor(tt * 8) % 8, ex = p.ex;
      if (p.sw) { an = p.sw.serve ? 'saque' : p.sw.label === 'balão' ? 'balao' : SHEET[p.sw.kind] || 'topspin'; const c = T[an], q = clamp(p.sw.t / PP.sw, 0, 1); k = Math.min(7, c + Math.floor(q * (8 - c))); ex = 5; }
      else if (p.arm && p.arm.serve) { an = 'saque'; k = p.arm.t < .12 ? 1 : p.arm.t < .3 ? 2 : Math.min(T.saque - 1, 3 + Math.floor((p.arm.t - .3) / .12)); }
      else if (p.arm) { ex = 5; if (moving) { an = 'andar'; k = Math.floor(cyc * 8) % 8; if (!fwd) k = 7 - k; } else { an = SHEET[p.arm.kind] || 'topspin'; const c = T[an]; k = Math.min(c - 1, Math.floor(p.arm.t / .2 * c)); } }
      else if (this.state === 'serve' && this.server === p.i && b && b.held) { an = 'saque'; k = 0; }
      else if (moving) { an = 'lado'; k = Math.floor(cyc * 8) % 8; if (!fwd) k = 7 - k; }
      ctx.save(); ctx.translate(p.x, this.gy); try { if (p.i) window.__fr.bl(cap(an), k, 'g', ex, p.f < 0); else framePi(an, k, ex, p.f < 0); } catch { /* carregando */ } ctx.restore();
    };
    // no saque, a bolinha fica na mão desenhada (e sobe dali): só o desenho muda de lugar, a física continua a mesma
    pingue.draw = function (tt) {
      const b = this.b, s = this.P[this.server]; let dx = 0, dy = 0;
      const B = s && bolaDe(s.i);
      if (b && s && B && pinta(this, s)) {
        const w = b.held && this.state === 'serve' ? 1 : b.toss && s.arm && s.arm.serve ? Math.max(0, 1 - s.arm.t / .15) : 0;
        if (w) { dx = s.f * (B[0] - 10) * w; dy = (B[1] + 40) * w; }
      }
      if (dx || dy) { b.x += dx; b.y += dy; }
      try { draw0.call(this, tt); } finally { if (dx || dy) { b.x -= dx; b.y -= dy; } }
    };
  }
}
