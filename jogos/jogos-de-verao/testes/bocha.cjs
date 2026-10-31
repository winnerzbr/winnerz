// bocha: um jogador automático (o mesmo cérebro do Amiguinho, com acerto escolhido) contra o Amiguinho. Vitórias, pontos, encostos e fotos.
const { chromium } = require('playwright');
const N = Number(process.argv[2] || 4);
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  const sim = await p.evaluate((N) => {
    const out = [], ev = bocha;
    for (const [nm, skill] of [['muito bom', .92], ['médio', .7], ['fraco', .45]]) {
      let wins = 0, pts = [0, 0], rounds = 0, enc = 0, tir = 0, nul = 0, t0 = performance.now();
      for (let m = 0; m < N; m++) {
        ev.two = false; ev.init(); ev.botAcc = skill; ev.aimHuman = function (dt) { this.aimAI(dt); };
        const sc0 = ev.settled.bind(ev); let t = 0;
        while (t < 1500) { if (ev.update(DT, {})) break; if (ev.state === 'null' && !ev._n) { nul++; ev._n = 1; } if (ev.state !== 'null') ev._n = 0; t += DT; }
        if (ev.sc[0] > ev.sc[1]) wins++; pts[0] += ev.sc[0]; pts[1] += ev.sc[1]; rounds += ev.round; enc += ev.encostos; tir += ev.tiradas;
        delete ev.aimHuman; delete ev.botAcc;
      }
      out.push(`${nm}: venceu ${wins}/${N} · pontos ${pts[0]} x ${pts[1]} · ${rounds} rodadas · ${enc} encostos · ${tir} tiradas · ${nul} anuladas · ${((performance.now() - t0) / 1000).toFixed(1)} s`);
    }
    return out;
  }, N);
  console.log(sim.join('\n'));
  await p.evaluate(() => { choose(bocha); start(); bocha.botAcc = .85; bocha.aimHuman = function (dt) { this.aimAI(dt); }; });
  for (let i = 0; i < 12; i++) { await p.waitForTimeout(1500); await p.locator('canvas').first().screenshot({ path: `amg/bc_${i}.png` }); }
  console.log(errs.join(' | ') || 'ok'); await b.close();
})();
