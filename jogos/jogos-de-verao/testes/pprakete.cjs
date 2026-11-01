// pingue-pongue: raquete e bolinha pintadas (esperando em 3/4, preparada de frente, no meio da batida de lado; vermelha e preta)
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  await p.evaluate(() => { choose(pingue); start(); }); await p.waitForTimeout(1500);
  console.log('raquete carregou:', await p.evaluate(() => window.__PPOK && window.__PPOK()));
  await p.evaluate(() => { const e = pingue; e._up = e.update; e.update = () => false; });
  const cv = p.locator('canvas').first(), shots = [];
  for (const [nm, fn] of [
    ['espera', () => { const e = pingue; e.P.forEach((q) => { q.arm = null; q.sw = null; }); e.b.x = 200; e.b.y = 60; }],
    ['preparada', () => { const e = pingue; e.P[0].arm = { kind: 'rebater', t: .4 }; e.P[1].arm = { kind: 'cortada', t: .4 }; }],
    ['batida', () => { const e = pingue; e.P[0].arm = null; e.P[0].sw = { t: .11, kind: 'rebater' }; e.P[1].arm = null; e.P[1].sw = { t: .03, kind: 'cortada' }; }],
  ]) { await p.evaluate(fn); await p.waitForTimeout(150); const f = `amg/ppr_${nm}.png`; await cv.screenshot({ path: f }); shots.push(f); }
  console.log('fotos', shots.length, errs.join(' | ') || 'sem erros'); await b.close(); })();
