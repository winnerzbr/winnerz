// corrida de bugue: o bugue pintado do IAmiguinho (reto, rodas para a esquerda e para a direita, girando com a pista, ao lado de um Amiguinho)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  await p.evaluate(() => { choose(bugue); }); await p.waitForTimeout(500);
  await p.evaluate(() => { const ev = bugue; ev.cup = null; ev.trackSel = 0; ev.init(); ev.started = true; ev.race = 3; mode = 'play'; showOv(false); ev._up = ev.update; ev.update = () => false; });
  await p.waitForTimeout(600);
  console.log('bugue pintado carregou:', await p.evaluate(() => window.__BGOK && window.__BGOK()));
  const cv = p.locator('canvas').first(), shots = [];
  for (const [nm, sg, st, ph] of [['reto', 16, 0, 0], ['reto2', 16, 0, 2], ['esquerda', 16, -1, 0], ['direita', 16, 1, 1], ['curva', 60, -.8, 3], ['curva2', 130, .8, 0]]) {
    await p.evaluate(([sg, st, ph]) => { const ev = bugue, L = BG_LINE, A = L[sg], B = L[sg + 2], h = Math.atan2(B[1] - A[1], B[0] - A[0]), me = ev.me, o = ev.K.find((k) => !k.me);
      Object.assign(me, { x: A[0], y: A[1], h, d: h, cst: st, ph, seg: sg, z: 0, spin: 0, inv: 0 }); Object.assign(o, { x: A[0] - Math.sin(h) * 26 + Math.cos(h) * 6, y: A[1] + Math.cos(h) * 26 + Math.sin(h) * 6, h, d: h, z: 0 });
      ev.camX = me.x; ev.camY = me.y; }, [sg, st, ph]);
    await p.waitForTimeout(150); const f = `amg/bgp_${nm}.png`; await cv.screenshot({ path: f }); shots.push(f);
  }
  console.log('fotos', shots.length, errs.join(' | ') || 'sem erros'); await b.close();
})();
