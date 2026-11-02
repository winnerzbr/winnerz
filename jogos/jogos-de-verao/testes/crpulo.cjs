// Corrida na areia (02/11): o IAmiguinho pulando um castelo, em 6 momentos do pulo (pulando 10 px antes do pé encostar).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__skHora = 12; choose(obstaculos); start(); }); await p.waitForTimeout(2500);
  const clip = await p.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.x + r.width * .12, y: r.y + r.height * .45, width: r.width * .4, height: r.height * .55 }; });
  await p.evaluate(() => { const O = obstaculos; O.st = 'corrida'; O.stT = 9; O.fofa = []; O.fx = []; O.rs.forEach((r) => { r.x = 400; r.v = OB.SPR; r.obs = [{ k: 'castelo', m: 0, x: 400 + OB.FR + 10, hit: false, ok: false, dx: 0, ph: 0 }]; if (!r.me) r.x = 200; }); O.update = function (dt) { this.t += dt; return false; }; });
  for (let i = 0; i < 6; i++) {
    await p.evaluate((i) => { const O = obstaculos, me = O.me(); if (i === 0) { me.air = 0; me.y = 0; } else { O.run(me, 0, 2, i === 1); for (let n = 0; n < 9; n++) O.run(me, 1 / 60, 2, false); } }, i);
    await p.waitForTimeout(120); await p.screenshot({ path: `amg/crp_${i}.png`, clip });
  }
  await b.close();
})();
