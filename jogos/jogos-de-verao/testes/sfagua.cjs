// Surfe (02/11): a água e o tubo animados. Grava quadros seguidos (o jogo parado, só o tempo andando) para um GIF.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__skHora = 12; choose(surfe); start(); }); await p.waitForTimeout(3000);
  const c = await p.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  // um tubo na tela
  await p.evaluate(() => { const S = surfe; if (!S.tubes.length) S.tubes.push({ x0: S.x + 40, x1: S.x + 260, roof: S.lip + 6 }); else { const t = S.tubes[0], L = t.x1 - t.x0; t.x0 = S.x + 40; t.x1 = t.x0 + Math.max(200, L); } S.update = function (dt) { this.t += dt; return false; }; });
  fs.mkdirSync('amg/sfa', { recursive: true });
  for (let i = 0; i < 16; i++) { await p.waitForTimeout(66); await p.screenshot({ path: `amg/sfa/${String(i).padStart(2, '0')}.png`, clip: c }); }
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
