const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  // simulação: jogador automático (mira e bate no tempo, com erro)
  const sim = await p.evaluate(() => {
    const out = []; const ev = frescobol;
    for (const [nm, skill, hardP] of [['bom', .92, .15], ['médio', .75, .05], ['ruim', .5, 0]]) {
      let tot = 0, best = 0, N = 6;
      for (let m = 0; m < N; m++) {
        ev.two = false; ev.init(); let t = 0, plan = null;
        while (t < 70) {
          const P = ev.P[0], B = ev.b, I = { l: false, r: false, ax: 0, pa: false, pb: false, u: false };
          const coming = B.live && (B.toss || (ev.last === 1 && B.vx < 0));
          if (coming) {
            if (!plan) plan = { e: (Math.random() < skill ? 1 : 3) * (Math.random() * 2 - 1) * 6, late: Math.random() < skill ? 0 : (Math.random() - .5) * .3, hard: Math.random() < hardP };
            const R0 = ev.racket({ x: 0, f: 1 }, FB.hitT / FB.sw), c = { ...B }, gg = FB.g * ev.spd * ev.spd; let th = null, xh = c.x;
            for (let tt = 0; tt < 2.5; tt += DT) { c.vy += gg * DT; c.x += c.vx * DT; c.y += c.vy * DT; if (c.vy > 0 && c.y >= ev.gy + R0.y - ev.gy + 0) { th = tt; xh = c.x; break; } }
            if (th !== null) { const dx = xh - R0.x + plan.e - P.x; I.ax = Math.max(-1, Math.min(1, dx / 10)); if (!P.sw && th <= FB.hitT + plan.late && th > FB.hitT + plan.late - .04) { if (plan.hard) I.pb = true; else I.pa = true; } }
          } else plan = null;
          if (ev.update(DT, I)) break; t += DT;
        }
        tot += ev.score; best = Math.max(best, ev.best);
      }
      out.push(`${nm}: média ${Math.round(tot / N)} pontos · maior sequência ${best}`);
    }
    return out;
  });
  console.log(sim.join('\n'));
  await p.evaluate(() => { choose(frescobol); start(); }); await p.waitForTimeout(1500);
  for (let i = 0; i < 3; i++) { await p.waitForTimeout(700); await p.locator('canvas').first().screenshot({ path: `amg/fr_${i}.png` }); }
  console.log(errs.join(' | ') || 'ok'); await b.close();
})();
