// Basquete (02/11): a bola passando pela cesta fica por trás da rede (fotos em 5 alturas).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__skHora = 12; choose(basquete); start(); }); await p.waitForTimeout(3500);
  const c = await p.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { r: { x: r.x, y: r.y, w: r.width, h: r.height }, k: r.width / W, rx: basquete.rx, ry: basquete.ry }; });
  await p.evaluate(() => { basquete.update = function (dt) { this.t += dt; return false; }; });
  const ys = [-14, -4, 4, 12, 22, 34];
  for (let i = 0; i < ys.length; i++) {
    await p.evaluate((dy) => { const B = basquete; B.net = dy > 0 && dy < 26 ? .6 : 0; B.balls = [{ x: B.rx, y: B.ry + dy, spin: 1, vx: 10, vy: 100, fire: false, done: false }]; }, ys[i]);
    await p.waitForTimeout(120);
    await p.screenshot({ path: `amg/bqr_${i}.png`, clip: { x: c.r.x + (c.rx - 30) * c.k, y: c.r.y + (c.ry - 40) * c.k, width: 60 * c.k, height: 90 * c.k } });
  }
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
