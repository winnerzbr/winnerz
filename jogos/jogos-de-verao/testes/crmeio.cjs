// Corrida na areia: fotos no meio da bateria (jogando no automático), para ver o espaço entre os obstáculos.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__skHora = 12; choose(obstaculos); start(); }); await p.waitForTimeout(2500);
  const clip = await p.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  for (const [bat, alvo] of [[0, 40], [2, 70], [2, 130]]) {
    await p.evaluate(([bat, alvo]) => {
      const O = obstaculos; O.startHeat(bat); window.__ou = window.__ou || O.update; O.update = window.__ou; let n = 0;
      while (O.me().x / OB.PXM < alvo && n < 60 * 60) { const me = O.me(); let pula = false; for (const o of me.obs) { if (o.ok || o.hit || o.k === 'poca') continue; const d = o.x + o.dx - me.x; if (d > 0 && d < me.v * OB.PXM * .2 + 2) pula = true; break; } O.update(1 / 60, { r: me.st > .35, pa: pula }); n++; }
      O.update = function (dt) { this.t += dt; return false; };
    }, [bat, alvo]);
    await p.waitForTimeout(200); await p.screenshot({ path: `amg/crm_${bat}_${alvo}.png`, clip });
  }
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
