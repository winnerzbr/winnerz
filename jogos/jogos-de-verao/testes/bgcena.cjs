// corrida de bugue: o cenário pintado (dunas nos 3 horários, muretas, largada, rampas, caixas, areia fofa, ladeiras, farol, mar, itens)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  await p.evaluate(() => { choose(bugue); }); await p.waitForTimeout(500);
  const cv = p.locator('canvas').first(), shots = [];
  const cena = async (nm, ti, fn, hora) => {
    await p.evaluate(([ti, hora]) => { window.__skHora = hora; const ev = bugue; ev.cup = null; ev.trackSel = ti; ev.init(); ev.started = true; ev.race = 3; mode = 'play'; showOv(false); ev._up = ev._up || ev.update; ev.update = () => false; }, [ti, hora]);
    await p.evaluate(fn); await p.waitForTimeout(700); const f = `amg/bgc_${nm}.png`; await cv.screenshot({ path: f }); shots.push(f);
  };
  const em = (sg, dx = 0) => `() => { const ev = bugue, L = BG_LINE, A = L[${sg}], B = L[${sg} + 2], h = Math.atan2(B[1] - A[1], B[0] - A[0]), me = ev.me; Object.assign(me, { x: A[0], y: A[1], h, d: h }); ev.camX = me.x + ${dx}; ev.camY = me.y; }`;
  await cena('largada_dia', 0, eval(em(2)), 13);
  await cena('largada_tarde', 0, eval(em(2)), 17.5);
  await cena('largada_noite', 0, eval(em(2)), 22);
  await cena('rampa', 0, () => { const ev = bugue, r = BG_RAMPS[0], A = BG_LINE[r.i - 6], me = ev.me; me.x = A[0]; me.y = A[1]; ev.camX = BG_LINE[r.i][0]; ev.camY = BG_LINE[r.i][1]; }, 13);
  await cena('caixas', 0, () => { const ev = bugue, b0 = ev.boxes[0], L = BG_LINE[b0.i]; ev.camX = L[0]; ev.camY = L[1]; ev.me.items = [{ k: 'guarda' }, { k: 'bola' }]; ev.me.shield = 5; ev.me.x = L[0] - 40; ev.me.y = L[1];
    ev.puds.push({ x: L[0] + 40, y: L[1] + 30, t: 0 }); ev.proj.push({ k: 'bola', x: L[0] - 20, y: L[1] - 30, vx: 1, vy: 0, t: .3 }, { k: 'balao', x: L[0] + 10, y: L[1] - 40, vx: 1, vy: 0, t: .2 }); }, 13);
  await cena('lagoa', 0, () => { const ev = bugue, c = BG_SCS[0]; ev.camX = c.x; ev.camY = c.y; ev.me.x = c.x - 60; ev.me.y = c.y; }, 13);
  await cena('farol_dia', 1, () => { const ev = bugue, f = BG_T.farol; ev.camX = f[0]; ev.camY = f[1] - 60; }, 13);
  await cena('farol_noite', 1, () => { const ev = bugue, f = BG_T.farol; ev.camX = f[0]; ev.camY = f[1] - 60; }, 22);
  await cena('mar', 1, () => { const ev = bugue; ev.camX = BG_T.box.x0 + 200; ev.camY = BG_T.box.y0 - 60; }, 17.5);
  await cena('ladeira', 2, () => { const ev = bugue, z = BG_T.slopes[0], A = BG_LINE[(z.a + 12) % BG_LINE.length]; ev.camX = A[0]; ev.camY = A[1]; }, 13);
  await cena('ladeira2', 2, () => { const ev = bugue, z = BG_T.slopes.find((q) => q.s < 0) || BG_T.slopes[1], A = BG_LINE[(z.a + 12) % BG_LINE.length]; ev.camX = A[0]; ev.camY = A[1]; }, 13);
  await cena('salto', 2, () => { const ev = bugue, c = BG_SCS.find((q) => q.ramp), R = ev.scRamp(c); ev.camX = R.x; ev.camY = R.y; }, 13);
  await cena('efeitos', 0, () => { const ev = bugue, A = BG_LINE[30]; ev.camX = A[0]; ev.camY = A[1]; ev.me.x = A[0] - 60; ev.me.y = A[1];
    const fix = (t) => (document.characterSet === 'UTF-8' ? t : unescape(encodeURIComponent(t))); /* o servidor local não manda o charset */ const ks = ['pó', 'fofa', 'água', 'faísca', 'faísca2'].map(fix); ks.forEach((k, r) => { for (let c = 0; c < 4; c++) ev.fx.push({ k, x: A[0] - 40 + c * 30, y: A[1] - 60 + r * 22, t: (c + .5) / 4 * .5, life: .5 }); });
    for (let c = 0; c < 4; c++) ev.fx.push({ k: 'caixa', burst: true, x: A[0] + 90, y: A[1] - 60 + c * 32, t: (c + .5) / 4 * .6 }); }, 13);
  await cena('esteira', 0, () => { const ev = bugue, P = ev.padPos(BG_PADS[1]); ev.camX = P.x; ev.camY = P.y; }, 13);
  await cena('curva', 0, eval(em(120)), 13);
  await cena('curva_noite', 0, eval(em(120)), 22);
  console.log('pintado:', await p.evaluate(() => [window.__BGCOK && window.__BGCOK(), bugue.painted]), 'fotos', shots.length, errs.join(' | ') || 'sem erros'); await b.close();
})();
