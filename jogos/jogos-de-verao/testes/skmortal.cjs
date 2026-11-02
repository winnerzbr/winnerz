// Skate (01/11): Mortal com dois botões juntos. Confere a troca (juntos e com o segundo até 0,15 s depois), os pontos ao pousar e fotos da volta.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 }); fs.mkdirSync('amg', { recursive: true });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__skHora = 12; choose(halfpipe); start(); }); await p.waitForTimeout(4500);
  const r = await p.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.x, y: c.y, width: c.width, height: c.height }; });
  console.log(await p.evaluate(() => {
    const H = halfpipe, out = [];
    const voo = (seq) => { H.launch(1, 330); const nomes = []; for (let f = 0; f < 200 && H.air; f++) { const I = seq(f) || {}; H.airStep(1 / 60, I, { x: 0, y: 0 }); if (H.trick && !nomes.includes(H.trick.nome)) nomes.push(H.trick.nome); } return nomes.join(' → ') + ' · feitas: ' + H.doneTr.map((t) => t.nome).join(', '); };
    out.push('juntos: ' + voo((f) => f === 5 ? { pa: 1, a: 1, pb: 1, b: 1 } : f < 12 ? { a: 1, b: 1 } : {}));
    out.push('segundo 0,1 s depois: ' + voo((f) => f === 5 ? { pa: 1, a: 1 } : f === 11 ? { a: 1, pc: 1, c: 1 } : f < 15 && f > 5 ? { a: 1 } : {}));
    out.push('segundo 0,3 s depois (não vira): ' + voo((f) => f === 5 ? { pe: 1, e: 1 } : f === 23 ? { pc: 1, c: 1 } : {}));
    out.push('um botão só: ' + voo((f) => f === 5 ? { pb: 1, b: 1 } : {}));
    return out.join('\n');
  }));
  await p.evaluate(() => { const H = halfpipe; window.__u = H.update; H.update = function (dt) { this.t += dt; return false; }; H.launch(1, 330); H.ah = 70; H.trick = { ...HP_BTN.m, key: 'btn_m', t: 0 }; });
  for (let i = 0; i < 6; i++) { await p.evaluate((i) => { halfpipe.trick.t = halfpipe.trick.d * i / 6; }, i); await p.waitForTimeout(80); await p.screenshot({ path: `amg/sk_mortal_${i}.png`, clip: r }); }
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
