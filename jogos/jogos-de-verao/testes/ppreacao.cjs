// Pingue-pongue: comemorar e lamentar pintados (01/11) — depois do ponto, para quem ganhou e quem perdeu, quadro a quadro.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__skHora = 12; choose(pingue); start(); }); await p.waitForTimeout(4500);
  console.log('reações:', await p.evaluate(() => [!!window.MVPI.a.festa, !!window.MVB.a.ppFesta, window.__PIOK(), window.__PBOK()].join(' ')));
  await p.evaluate(() => { pingue.update = function (dt) { this.t += dt; return false; }; });
  for (const [w, st] of [[0, .45], [0, .75], [0, 1.0], [1, .45], [1, .75], [1, 1.0]]) {
    await p.evaluate(([w, st]) => { Object.assign(pingue, { state: 'point', st, lastW: w, noPoint: false, b: null }); pingue.P.forEach((q) => { q.sw = null; q.arm = null; q.mvT = 0; }); }, [w, st]);
    await p.waitForTimeout(120); await p.screenshot({ path: `amg/pp_reac_${w}_${st}.png`, clip: { x: 60, y: 380, width: 740, height: 340 } });
  }
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
