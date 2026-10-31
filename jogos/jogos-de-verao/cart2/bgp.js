{ /* ============================================================ Corrida de bugue pintada (bugue do IAmiguinho visto de cima)
     Prancha do dono (mvbg.py): 1-4 reto (hélice e pneus girando, mais rápido com mais velocidade), 5-6 rodas da frente para a
     esquerda, 7-8 para a direita. O jogo gira o desenho com o bugue. Os Amiguinhos seguem desenhados pelo jogo até chegar a prancha deles. */
  const BGA = window.BGA, BGI = new Image(); if (BGA) BGI.src = BGA.src;
  const BGOK = () => !!BGA && BGI.complete && BGI.naturalWidth > 0;
  window.__BGOK = BGOK;
  function bgFrame(k) {
    const p = Math.floor(k.ph || 0), st = k.spin > 0 ? 0 : k.cst || 0;
    return st < -.25 ? 4 + (p % 2) : st > .25 ? 6 + (p % 2) : p % 4;
  }
  if (typeof bugue !== 'undefined') {
    const buggy16 = bugue.drawBuggy;
    bugue.drawBuggy = function (k, tt) {
      if (!k.me || !BGOK()) return buggy16.call(this, k, tt);
      const z = k.z * .12;
      ctx.fillStyle = 'rgba(80,60,30,.28)'; ctx.beginPath(); ctx.ellipse(k.x + 2.5, k.y + 3.5, 12.5 - z * .3, 9 - z * .2, k.h, 0, TAU); ctx.fill();
      const blink = k.inv > 0 && !(k.spin > 0) && Math.floor(tt * 16) % 2 === 0, f = bgFrame(k), u = 1 / BGA.u;
      ctx.save(); if (blink) ctx.globalAlpha = .35; ctx.imageSmoothingEnabled = true; ctx.translate(k.x, k.y - z); ctx.rotate(k.h);
      const sc = 1 + z / 30; ctx.scale(sc * (1 + (k.sq || 0) * .4) * u, sc * (1 - (k.sq || 0) * .3) * u);
      ctx.translate(0, clamp(k.lean, -2.2, 2.2) * BGA.u);
      ctx.drawImage(BGI, f * (BGA.w + 2), 0, BGA.w, BGA.h, -BGA.ax, -BGA.ay, BGA.w, BGA.h);
      ctx.restore();
      this.drawBuggyFx(k, tt, z);
    };
  }
}
