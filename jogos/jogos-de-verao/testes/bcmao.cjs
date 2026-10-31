// bocha: a bola na mão do IAmiguinho na mira (quadros 1-4 conforme a força) e saindo da mão ao soltar (fotos ampliadas)
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 3 }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  await p.evaluate(() => { choose(bocha); start(); }); await p.waitForTimeout(1500);
  console.log('carregou:', await p.evaluate(() => window.__BCOK && window.__BCOK()));
  await p.evaluate(() => { const e = bocha; e._up = e.update; e.update = () => false; });
  const cv = p.locator('canvas').first(), box = await cv.boundingBox(), sx = box.width / 480;
  const clip = { x: box.x, y: box.y + 100 * sx, width: 90 * sx, height: 70 * sx };
  const shots = [];
  for (const kind of ['rolar', 'alto']) for (const [nm, m, ch] of [['parado', 0, false], ['f1', .3, true], ['f2', .55, true], ['f3', .8, true]]) {
    await p.evaluate(([kind, m, ch]) => { const e = bocha; e.state = 'aim'; e.who = 0; e.toss = 'ball'; e.kind = kind; e.m = m; e.charging = ch; }, [kind, m, ch]);
    await p.waitForTimeout(120); const f = `amg/bcm_${kind}_${nm}.png`; await p.screenshot({ path: f, clip }); shots.push(f);
  }
  await p.evaluate(() => { const e = bocha; e.toss = 'jack'; e.kind = 'rolar'; e.m = .55; e.charging = true; }); await p.waitForTimeout(120); await p.screenshot({ path: 'amg/bcm_bolim.png', clip }); shots.push('amg/bcm_bolim.png');
  // soltando de verdade: o jogo anda devagar e fotografamos a bola saindo da mão
  for (const kind of ['rolar', 'alto']) {
    await p.evaluate((kind) => { const e = bocha; e.update = e._up; e.state = 'aim'; e.who = 0; e.toss = 'ball'; e.left[0] = Math.max(e.left[0], 2); e.kind = kind; e.m = .6; e.charging = true; e.release(.6); e.update = () => false; }, kind);
    for (const dt of [.04, .1]) { await p.evaluate((dt) => { const e = bocha; e.t = e.throwT + dt; }, dt); await p.waitForTimeout(100); const f = `amg/bcm_sai_${kind}_${dt}.png`; await p.screenshot({ path: f, clip }); shots.push(f); }
  }
  console.log(await p.evaluate(() => ({ segurando: bocha._held })));
  console.log('fotos', shots.length, errs.join(' | ') || 'sem erros'); await b.close(); })();
