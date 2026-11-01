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
  /* ---------- Quiosque do Coqueiral pintado (01/11/2026; ppcen.py -> window.PPC)
     Fundo (céu, mar, ilha e barcos) e meio-plano (quiosque de palha, varal de lâmpadas, coqueiros e dois Amiguinhos no balcão)
     nos 4 horários pelo relógio de quem joga (perto da troca mistura os dois); de noite, as luzes dos dois por cima, piscando de leve,
     e a luz quente sobre a mesa. */
  const PPC = window.PPC, PPX2 = {};
  const ppImg = (k, src) => { if (!src) return null; let im = PPX2[k]; if (!im) { im = PPX2[k] = new Image(); im.src = src; } return im.complete && im.naturalWidth ? im : null; };
  const PP_HORAS = [['noite', 5, 'manha'], ['manha', 10, 'dia'], ['dia', 16, 'tarde'], ['tarde', 19, 'noite']];
  function ppPesos() {
    const d = new Date(), h = window.__skHora != null ? window.__skHora : d.getHours() + d.getMinutes() / 60;
    for (const [a, b, c] of PP_HORAS) if (Math.abs(h - b) < .5) { const t = h - b + .5; return [[a, 1 - t], [c, t]]; }
    return [[h >= 5 && h < 10 ? 'manha' : h >= 10 && h < 16 ? 'dia' : h >= 16 && h < 19 ? 'tarde' : 'noite', 1]];
  }
  window.__PPCOK = () => !!PPC && ['dia', 'manha', 'tarde', 'noite'].some((h) => ppImg('f_' + h, PPC.f[h]) && ppImg('m_' + h, PPC.m[h]));
  if (typeof pingue !== 'undefined' && PPC) {
    const scene16 = pingue.drawScene;
    pingue.drawScene = function (tt) {
      let P = ppPesos().filter(([, w]) => w > .001).map(([h, w]) => [h, w, ppImg('f_' + h, PPC.f[h]), ppImg('m_' + h, PPC.m[h])]);
      const ok = P.filter((p) => p[2] && p[3]); if (!ok.length) return scene16.call(this, tt);
      if (ok.length < P.length) { P = ok; P[0][1] = 1; }
      const night = P.reduce((a, [h, w]) => a + (h === 'noite' ? w : h === 'tarde' ? w * .3 : 0), 0);
      ctx.save(); ctx.imageSmoothingEnabled = true;
      for (const [, w, f] of P) { ctx.globalAlpha = w; ctx.drawImage(f, 0, 0, W, H); } ctx.globalAlpha = 1;
      const lf = night > .01 && ppImg('lf', PPC.lf); if (lf) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * (.3 + .08 * Math.sin(tt * 1.7)); ctx.drawImage(lf, 0, 0, W, H); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      // o meio-plano um pouco menor e mais para trás (85%, preso no meio da tela): o quiosque fica atrás da mesa, não encostado nela
      const MK = .85, mx = W * (1 - MK) / 2, my = H * .5 * (1 - MK), mw = W * MK, mh = H * MK;
      for (const [, w, , m] of P) { ctx.globalAlpha = w; ctx.drawImage(m, mx, my, mw, mh); } ctx.globalAlpha = 1;
      const lm = night > .01 && ppImg('lm', PPC.lm); if (lm) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * (.5 + .12 * Math.sin(tt * 3)); ctx.drawImage(lm, mx, my, mw, mh); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      if (night > .05) { const lg = ctx.createRadialGradient(200, this.ty, 10, 200, this.ty, 150); lg.addColorStop(0, `rgba(255,210,140,${(.2 * night).toFixed(3)})`); lg.addColorStop(1, 'rgba(255,210,140,0)'); ctx.fillStyle = lg; ctx.fillRect(40, 40, 320, H - 40); }
      ctx.restore();
    };
  }
