// BMX pintado com a física nova (02/11): o jogador automático com mortais anda pela pista e as fotos saem nos momentos certos
// (chegando na rampa, salto grande com a câmera subindo, no meio do mortal, pousando, manobra), mais os 4 horários e uma partida com o teclado.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 }); fs.mkdirSync('amg', { recursive: true });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__skHora = 12; choose(bmx); start(); }); await p.waitForTimeout(5000);
  console.log('pintado carregado:', await p.evaluate(() => [window.__BXCOK && window.__BXCOK(), window.__BXIOK && window.__BXIOK()].join(' ')));
  const r = await p.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.x, y: c.y, width: c.width, height: c.height }; });
  await p.evaluate(() => {
    const B = bmx; window.__U = B.update; B.update = function () { return false; }; B.init(); window.failMsg = () => {};
    const tempoNoAr = () => { let x = B.px, y = B.py, vx = B.vx, vy = B.vy; for (let t = 0; t < 3; t += .02) { vy -= 400 * .02; x += vx * .02; y += vy * .02; if (y - 22 < B.h(x)) return t; } return 3; };
    let seg = 0, man = 0;
    window.__passo = () => { const I = { a: 1 }, c = B.cont[0] || B.cont[1];
      const lip = B.tr.find((s) => s.lip && s.x1 > B.x && s.x1 - B.x < 70), dist = lip ? lip.x1 - B.x : 1e9;
      if (c && (B.slope(B.x) < -.12 || dist < 60)) I.d = 1; if (c && dist < 9 && !B.air) I.pu = 1;
      if (B.air) { const pr = tempoNoAr(); if (!seg && Math.abs(B.rotSum) < .5 && pr > .95) { seg = 1; man++; } if (seg && B.rotSum > 3 && B.a - Math.atan(B.slope(B.x)) > TAU - .8) seg = 0; if (seg && man % 3 !== 0) I.l = 1; if (seg && man % 3 === 0 && !B.trick && B.airTr.length === 0) I.pb = 1; } else seg = 0;
      __U.call(B, 1 / 60, I); };
  });
  const tirou = {};
  for (let f = 0; f < 3000 && Object.keys(tirou).length < 6; f++) {
    const st = await p.evaluate(() => { __passo(); const B = bmx, lip = B.tr.find((s) => s.lip && s.x1 > B.x && s.x1 - B.x < 90);
      return { air: B.air, peak: B.peak, alt: B.y - B.h(B.x), vy: B.vy, rot: B.rotSum, lip: lip ? lip.x1 - B.x : 999, lipH: lip ? lip.h1 - lip.h0 : 0, trick: !!B.trick, landT: B.landT, camH: B.camH }; });
    let nm = null;
    if (!tirou.rampa && !st.air && st.lip < 80 && st.lip > 50 && st.lipH > 40) nm = 'rampa';
    else if (!tirou.alto && st.air && st.alt > 90 && st.camH > 30) nm = 'alto';
    else if (!tirou.mortal && st.air && Math.abs(st.rot) > 2.5 && Math.abs(st.rot) < 4) nm = 'mortal';
    else if (!tirou.manobra && st.air && st.trick) nm = 'manobra';
    else if (!tirou.pouso && st.landT > .2) nm = 'pouso';
    else if (!tirou.subindo && st.air && st.vy > 120 && st.alt > 30) nm = 'subindo';
    if (nm) { tirou[nm] = 1; await p.waitForTimeout(60); await p.screenshot({ path: `amg/bx_${nm}.png`, clip: r }); }
  }
  console.log('fotos:', Object.keys(tirou).join(', '));
  for (const h of [7, 12, 17.5, 22]) { await p.evaluate((h) => { window.__skHora = h; }, h); await p.waitForTimeout(200); await p.screenshot({ path: `amg/bx_hora_${h}.png`, clip: r }); }
  // partida de verdade com o teclado
  await p.evaluate(() => { bmx.update = window.__U; window.__skHora = 12; choose(bmx); start(); }); await p.waitForTimeout(4500);
  await p.keyboard.down('Space'); for (let i = 0; i < 10; i++) { await p.keyboard.press('ArrowUp'); await p.waitForTimeout(500); } await p.keyboard.up('Space');
  await p.screenshot({ path: 'amg/bx_jogo.png', clip: r });
  console.log('estado:', await p.evaluate(() => [mode, bmx.score, bmx.tombos, Math.round(bmx.x)].join(' · ')));
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
