{ /* ============================================================ Corrida de bugue pintada (bugues vistos de cima)
     Pranchas do dono (mvbg.py). IAmiguinho: reto (hélice e pneus girando, mais rápido com mais velocidade), rodas da frente para a
     esquerda/direita conforme o volante, derrapando (areia saindo dos pneus de trás; o desenho é da derrapagem para a direita e
     espelha para a esquerda) e rodopiando (os 4 desenhos girados, desfeito o giro: o bugue segue a direção do jogo e as estrelinhas rodam).
     Amiguinhos: a prancha rosa, com a cor de cada um (mesma troca de cor do vôlei), reto e com as rodas virando. O jogo gira o desenho com o bugue. */
  const BGA = window.BGA, BGI = {};
  if (BGA) for (const n of ['ia', 'iad', 'ias', 'bl']) if (BGA[n]) { BGI[n] = new Image(); BGI[n].src = BGA[n].src; }
  const ok = (n) => !!BGI[n] && BGI[n].complete && BGI[n].naturalWidth > 0;
  const BGOK = () => !!BGA && ['ia', 'iad', 'ias', 'bl'].every(ok);
  window.__BGOK = BGOK;
  // bugue do Amiguinho na cor de cada um (feito uma vez por cor)
  const BGT = {};
  function bgTint(col) {
    if (BGT[col]) return BGT[col];
    const im = BGI.bl, c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
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
    return (BGT[col] = c);
  }
  // qual desenho: [conjunto, quadro, espelhado]
  function bgPick(k, tt) {
    const p = Math.floor(k.ph || 0), st = k.cst || 0;
    if (k.me && k.spin > 0) return ['ias', Math.floor(tt * 10) % 4, false];
    if (k.me && k.drift && !(k.z > 0)) return ['iad', p % 4, k.dsg < 0];
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
      ctx.drawImage(set === 'bl' ? bgTint(k.col) : BGI[set], f.x, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h);
      ctx.restore();
      this.drawBuggyFx(k, tt, z);
    };
  }
}
