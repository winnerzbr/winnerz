// Copa das Dunas: fotos do menu, das 3 pistas, do atalho e da classificação entre corridas
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  await p.evaluate(() => { choose(bugue); }); await p.waitForTimeout(500);
  await p.click('#b-alt2'); await p.waitForTimeout(400); await p.screenshot({ path: 'amg/copa_menu.png' });
  console.log('botões:', await p.evaluate(() => ['b-play', 'b-alt', 'b-alt2'].map((i) => document.getElementById(i).hidden ? '-' : document.getElementById(i).textContent).join(' | ')));
  const cv = p.locator('canvas').first();
  for (const [ti, segs] of [[1, [110, 190, 168, 330]], [2, [20, 150, 300, 370]]]) {
    for (const sg of segs) {
      await p.evaluate(([ti, sg]) => { const ev = bugue; ev.cup = null; ev.trackSel = ti; ev.init(); ev.started = true; ev.race = 3; const me = ev.me, L = BG_LINE[sg], L2 = BG_LINE[sg + 2]; me.x = L[0]; me.y = L[1]; me.seg = sg; me.h = me.d = Math.atan2(L2[1] - L[1], L2[0] - L[0]); ev.camX = me.x; ev.camY = me.y; ev.K.forEach((k, i) => { if (!k.me) { const Q = BG_LINE[(sg + 8 + i * 5) % BG_LINE.length]; k.x = Q[0] + (i % 2 ? 18 : -18); k.y = Q[1]; k.seg = (sg + 8 + i * 5) % BG_LINE.length; } }); mode = 'play'; showOv(false); }, [ti, sg]);
      await p.waitForTimeout(250); await cv.screenshot({ path: `amg/copa_${ti}_${sg}.png` });
    }
  }
  // atalho do Desce-Duna: rampa por cima da duna
  await p.evaluate(() => { const ev = bugue; ev.trackSel = 2; ev.init(); ev.started = true; ev.race = 3; const me = ev.me, R = ev.scRamp(); me.x = R.x - Math.cos(R.a) * 30; me.y = R.y - Math.sin(R.a) * 30; me.h = me.d = R.a; me.seg = BG_SC.a; ev.camX = me.x + 80; ev.camY = me.y; mode = 'play'; showOv(false); });
  await p.waitForTimeout(200); await cv.screenshot({ path: 'amg/copa_salto.png' });
  // classificação depois da 1ª corrida da Copa
  await p.evaluate(() => { const ev = bugue; ev.cupNew = true; ev.init(); ev.started = true; ev.K.forEach((k, i) => { k.fin = 10 + i; }); ev.me.fin = 12.5; ev.rank = 3; ev.done = true; ev.doneT = 3.3; ev.cupScore(); mode = 'play'; showOv(false); });
  await p.waitForTimeout(1300); await cv.screenshot({ path: 'amg/copa_classif.png' });
  await p.evaluate(() => renderHud()); 
  console.log('HUD:', await p.evaluate(() => [0, 1, 2, 3].map((i) => document.getElementById('hl' + i).textContent + ' ' + document.getElementById('h' + i).textContent).join(' · ')));
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
