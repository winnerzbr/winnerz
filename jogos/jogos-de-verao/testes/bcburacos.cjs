// bocha: quanto os buracos "puxam" a partida. Partidas automáticas (jogador médio x Amiguinho); no fim de cada rodada conta
// bolas e bolim dentro de um buraco (a 75% do raio do centro) e a área que os buracos ocupam na cancha.
const { chromium } = require('playwright');
const N = Number(process.argv[2] || 12), V = process.argv[3] || '', KR0 = Number(process.argv[4] || 1.5), DEP0 = Number(process.argv[5] || 1);
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  console.log(await p.evaluate(([N, V, KR, DEP]) => {
    const ev = bocha; let rodadas = 0, bolim = 0, bolas = 0, dentro = 0, area = 0, perto = 0;
    const inHole = (o) => ev.T.mounds.some((m) => m.h < 0 && Math.hypot(o.x - m.x, o.y - m.y) < .75 * m.r);
    for (let m = 0; m < N; m++) {
      ev.two = false; ev.init(); ev.botAcc = .7;
      ev._g0 = ev._g0 || ev.heightGrad;
      if (V.includes('compacto')) ev.heightGrad = function (x, y) { let gx = 0, gy = 0; for (const m of this.T.mounds) { const k = (m.h < 0 || V.includes('todos')) ? KR : 0; if (!k) { const dx = x - m.x, dy = y - m.y, e = m.h * Math.exp(-(dx * dx + dy * dy) / (m.r * m.r)); gx += e * -2 * dx / (m.r * m.r); gy += e * -2 * dy / (m.r * m.r); continue; } const R = k * m.r, dx = x - m.x, dy = y - m.y, u = (dx * dx + dy * dy) / (R * R); if (u >= 1) continue; const c = m.h * 3 * (1 - u) ** 2 * -2 / (R * R) * DEP; gx += c * dx; gy += c * dy; } return [gx, gy]; };
      else ev.heightGrad = ev._g0;
      if (V.includes('rasa')) ev.T.mounds.forEach((q) => { if (q.h < 0) q.h *= .6; });
      if (V.includes('menor')) ev.T.mounds.forEach((q) => { if (q.h < 0) q.r *= .7; });
      if (V.includes('fofo')) { const s0 = Object.getPrototypeOf(ev).softAt || ev.constructor.prototype.softAt; ev._s0 = ev._s0 || ev.softAt; ev.softAt = function (x, y) { return ev._s0.call(this, x, y) || this.T.mounds.some((q) => q.h < 0 && Math.hypot(x - q.x, y - q.y) < .8 * q.r); }; } ev.aimHuman = function (dt) { this.aimAI(dt); };
      area += ev.T.mounds.filter((q) => q.h < 0).reduce((a, q) => a + Math.PI * (.75 * q.r) ** 2, 0) / ((BC.x1 - BC.x0) * (BC.y1 - BC.y0));
      let t = 0, last = '';
      while (t < 1500) {
        if (ev.update(DT, {})) break;
        if (ev.state === 'score' && last !== 'score' && ev.jack && ev.jack.alive) {
          rodadas++; if (inHole(ev.jack)) bolim++;
          const al = ev.balls.filter((o) => o.alive); bolas += al.length; dentro += al.filter(inHole).length;
          perto += al.filter((o) => Math.hypot(o.x - ev.jack.x, o.y - ev.jack.y) < 20).length;
        }
        last = ev.state; t += DT;
      }
      delete ev.aimHuman; delete ev.botAcc; if (ev._s0) ev.softAt = ev._s0;
    }
    return V + ' ' + KR + ' ' + DEP + ': ' + `${N} partidas, ${rodadas} rodadas · buracos ocupam ${(100 * area / N).toFixed(1)}% da cancha · bolim parou no buraco em ${(100 * bolim / rodadas).toFixed(0)}% das rodadas · bolas no buraco ${(100 * dentro / bolas).toFixed(0)}% · bolas a menos de 20 do bolim ${(100 * perto / bolas).toFixed(0)}%`;
  }, [N, V, KR0, DEP0]));
  console.log(errs.join(' | ') || 'ok'); await b.close();
})();
