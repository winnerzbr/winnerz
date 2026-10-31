// teco-teco: fotos do avião passando por cada marco e por uma sequência de argolas
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  await p.evaluate(() => { choose(teco); start(); });
  await p.waitForTimeout(500);
  const spots = await p.evaluate(() => { const L = teco.C.lm.slice(0, 4).map((l) => [l.kind, l.x0 - 90, l.top(l.mark[0]) + 30]); const r = teco.C.rings[0]; L.push(['argolas', r.x - 100, r.a]); return L; });
  for (const [k, x, a] of spots) {
    await p.evaluate(([x, a]) => { Object.assign(teco, { x, a, vx: 125, va: 0, th: .07, thU: .07, loopBase: .07, ground: false, spin: 0, camX: x - 125, camA: a - 100 }); }, [x, a]);
    await p.waitForTimeout(500); await p.locator('canvas').first().screenshot({ path: `amg/tc_${k}.png` });
  }
  console.log(spots.map((s) => s[0]).join(', '), errs.join(' | ') || 'ok'); await b.close();
})();
