const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  await p.evaluate(() => { choose(EVENTS.find((e) => e.id === 'salto')); start(); }); await p.waitForTimeout(1500);
  for (const n of [0, 4]) {
    await p.evaluate((n) => { salto.n = n; salto.newDive(); }, n); await p.waitForTimeout(400);
    await p.locator('canvas').first().screenshot({ path: `amg/penh_${n}_a.png` });
    await p.keyboard.down('ArrowRight'); await p.waitForTimeout(700);
    await p.keyboard.press('Space'); await p.waitForTimeout(250); await p.keyboard.up('ArrowRight');
    await p.keyboard.down('KeyC'); await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(500);
    await p.locator('canvas').first().screenshot({ path: `amg/penh_${n}_b.png` });
    await p.keyboard.up('KeyC'); await p.keyboard.up('ArrowLeft'); await p.keyboard.down('ArrowDown'); await p.waitForTimeout(2500); await p.keyboard.up('ArrowDown');
    await p.locator('canvas').first().screenshot({ path: `amg/penh_${n}_c.png` });
  }
  const r = await p.evaluate(() => salto.dives.map((d) => [d.media, d.pts]));
  console.log(JSON.stringify(r), errs.join(' | ') || 'ok'); await b.close();
})();
