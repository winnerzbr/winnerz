// Pingue-pongue: o Quiosque do Coqueiral pintado nos 4 horários (01/11).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__skHora = 12; choose(pingue); start(); }); await p.waitForTimeout(4500);
  console.log('cenário pintado:', await p.evaluate(() => window.__PPCOK && window.__PPCOK()));
  for (const h of [7, 12, 17.5, 22]) { await p.evaluate((h) => { window.__skHora = h; }, h); await p.waitForTimeout(300); await p.screenshot({ path: `amg/pp_hora_${h}.png`, clip: { x: 0, y: 300, width: 900, height: 470 } }); }
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
