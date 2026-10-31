// bocha: o Amiguinho pintado (esperando, mirando com a bola na mão nos quadros 1-4, soltando, torcendo, ganhou) — fotos ampliadas
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 3 }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  await p.evaluate(() => { choose(bocha); start(); }); await p.waitForTimeout(1500);
  console.log('pranchas novas no atlas:', await p.evaluate(() => ['bcEspera', 'bcRolar', 'bcAlto', 'bcTorce'].every((a) => window.MVB && window.MVB.a[a])));
  await p.evaluate(() => { const e = bocha; e._up = e.update; e.update = () => false; });
  const cv = p.locator('canvas').first(), box = await cv.boundingBox(), sx = box.width / 480;
  const clip = { x: box.x, y: box.y + 55 * sx, width: 95 * sx, height: 160 * sx }, shots = [];
  const foto = async (nm, fn, arg) => { await p.evaluate(fn, arg); await p.waitForTimeout(150); const f = `amg/bca_${nm}.png`; await p.screenshot({ path: f, clip }); shots.push(f); };
  await foto('espera', () => { const e = bocha; e.state = 'aim'; e.who = 0; e.toss = 'ball'; e.kind = 'rolar'; e.charging = false; });
  for (const kind of ['rolar', 'alto']) for (const [nm, m, ch] of [['parado', 0, false], ['f1', .3, true], ['f2', .55, true], ['f3', .8, true]])
    await foto(`${kind}_${nm}`, ([kind, m, ch]) => { const e = bocha; e.state = 'aim'; e.who = 1; e.toss = 'ball'; e.kind = kind; e.m = m; e.charging = ch; }, [kind, m, ch]);
  await foto('bolim', () => { const e = bocha; e.toss = 'jack'; e.kind = 'rolar'; e.m = .8; e.charging = true; });
  for (const kind of ['rolar', 'alto']) {
    await p.evaluate((kind) => { const e = bocha; e.state = 'aim'; e.who = 1; e.toss = 'ball'; e.left[1] = Math.max(e.left[1], 2); e.kind = kind; e.m = .6; e.charging = true; e.release(.6); }, kind);
    await foto(`sai_${kind}`, () => { const e = bocha; e.t = e.throwT + .06; });
    await foto(`solto_${kind}`, () => { const e = bocha; e.t = e.throwT + .3; });
  }
  await foto('torce', () => { const e = bocha; e.t = e.throwT + 1.1; });
  await foto('ganhou', () => { const e = bocha; e.over = true; e.overT = 1; e.sc = [3, 7]; });
  console.log('fotos', shots.length, errs.join(' | ') || 'sem erros'); await b.close(); })();
