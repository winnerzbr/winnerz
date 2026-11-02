// Corrida na areia pintada: as 3 baterias inteiras (jogando sozinho), desenhando cada quadro, para ver se nada quebra.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { choose(obstaculos); start(); }); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    const O = obstaculos; O.init(); let fim = false, n = 0;
    for (const h of [8, 13, 18, 23]) { window.__skHora = h; O.draw(n / 60); }
    while (!fim && n < 60 * 120) {
      const me = O.me(); let pula = false;
      for (const o of me.obs) { if (o.ok || o.hit || o.k === 'poca') continue; const d = o.x + o.dx - me.x; if (d > 0 && d < me.v * OB.PXM * .2 + 2) pula = true; break; }
      fim = O.update(1 / 60, { r: me.st > .3, pa: pula }); if (n % 3 === 0) O.draw(n / 60); n++;
    }
    return [fim, n, O.res.map((x) => x.pos + 1 + 'º ' + x.time.toFixed(1)).join(' · '), O.score, O.limpos, O.tropecos];
  });
  console.log(r.join(' | ')); console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
