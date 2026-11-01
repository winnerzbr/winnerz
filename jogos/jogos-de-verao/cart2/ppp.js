{ /* ============================================================ Pingue-pongue pintado: a raquete e a bolinha (folha do dono, mvpp.py)
     IAmiguinho mostra a borracha vermelha e o Amiguinho a preta (os dois lados da mesma raquete). Esperando: a raquete em 3/4;
     preparada: de frente; no meio da batida (a parte mais rápida), de lado, como quando ela corta o ar. O jogo gira a raquete
     em volta do meio da cabeça, como antes. */
  const PPA = window.PPA, PPI = new Image(); if (PPA) PPI.src = PPA.src;
  const PPOK = () => !!PPA && PPI.complete && PPI.naturalWidth > 0;
  window.__PPOK = PPOK;
  const LEN = 14; // comprimento da raquete no jogo
  function ppPart(nm, x, y, rot, sc, flip) {
    const f = PPA.p[nm]; ctx.save(); ctx.imageSmoothingEnabled = true; ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(sc * (flip ? -1 : 1), sc);
    ctx.drawImage(PPI, f.x, 0, f.w, f.h, -f.ax, -f.ay, f.w, f.h); ctx.restore();
  }
  if (typeof pingue !== 'undefined') {
    const racket16 = pingue.drawRacket, draw16 = pingue.draw;
    pingue.drawRacket = function (p) {
      if (!PPOK()) return racket16.call(this, p);
      const R0 = this.racketPos(p), face = p.i ? 'verso' : 'frente';
      let nm = p.i ? 'verso' : 'tres';
      if (p.sw) { const q = clamp(p.sw.t / .22, 0, 1); nm = q > .3 && q < .7 ? 'lado' : face; }
      else if (p.arm) nm = face;
      const sc = LEN / PPA.p.frente.len;
      ppPart(nm, R0.x, R0.y, p.f * (R0.rot - .2), sc, p.f < 0);
      // raquete pronta: brilho em volta da cabeça
      if (p.arm && p.arm.t > .2 && !p.arm.serve) { ctx.save(); ctx.translate(R0.x, R0.y); ctx.rotate(p.f * (R0.rot - .2)); ctx.globalAlpha = .45 + .3 * Math.sin(this.t * 18); ctx.strokeStyle = '#fff6d6'; ctx.lineWidth = .9; ctx.beginPath(); ctx.ellipse(0, 0, 6.2, 6.8, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
    };
    // a bolinha pintada por cima da bolinha desenhada pelo jogo (mesmo lugar e tamanho)
    pingue.draw = function (tt) {
      draw16.call(this, tt); const b = this.b;
      if (b && PPOK()) ppPart('bola', b.x, b.y, 0, (2 * (PP.r + .5)) / PPA.p.bola.len, false);
      // o placar fica por cima da bolinha
      const s = `${this.sc[0]}  ×  ${this.sc[1]}`; if (b && b.y < 26) { R(W / 2 - 26, 6, 52, 14, 'rgba(60,40,30,.85)'); ctx.strokeStyle = NAVY; ctx.lineWidth = 1; ctx.strokeRect(W / 2 - 26, 6, 52, 14); ctx.fillStyle = this.flash > 0 ? (this.flashW ? '#ffb3c8' : '#bfefff') : '#fff6d6'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(s, W / 2, 17); ctx.textAlign = 'left'; }
    };
  }
}
