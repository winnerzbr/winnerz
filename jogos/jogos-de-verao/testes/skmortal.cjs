// Skate (01/11): Mortal segurando ▼ (como o giro). Segura por tempos diferentes num voo e vê: quantos mortais, se pousou ou caiu e os pontos.
// Também as fotos de uma volta. O toque rápido em ▼ continua sendo a Rabeta.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 }); fs.mkdirSync('amg', { recursive: true });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__skHora = 12; choose(halfpipe); start(); }); await p.waitForTimeout(4500);
  const r = await p.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.x, y: c.y, width: c.width, height: c.height }; });
  console.log(await p.evaluate(() => {
    const H = halfpipe, out = []; const msgs = []; const fm = window.failMsg; window.failMsg = (m) => msgs.push(m); const pp = window.pop; let ult = ''; window.pop = (t, ...a) => { ult = t; return pp(t, ...a); };
    for (const v of [300, 420]) {
      H.launch(1, v); out.push(`voo de ${H.airDur.toFixed(2)} s (velocidade ${v}):`);
      for (const seg of [0.05, .3, .5, .7, .9, 1.1, 1.3]) {
        H.init(); H.launch(1, v); const f0 = H.falls, s0 = H.score; msgs.length = 0; ult = ''; let t = 0, nomes = [];
        for (let f = 0; f < 400 && H.air; f++) { const segurando = t >= .08 && t < .08 + seg; H.airStep(1 / 60, segurando ? { d: 1 } : {}, { x: 0, y: segurando ? 1 : 0 }); if (H.trick && !nomes.includes(H.trick.nome)) nomes.push(H.trick.nome); t += 1 / 60; }
        out.push(`  segurou ▼ ${seg.toFixed(2)} s: ${H.falls > f0 ? 'CAIU (' + msgs.join(', ') + ')' : 'pousou: ' + ult}${nomes.length ? ' · manobra: ' + nomes.join(', ') : ''}`);
      }
    }
    window.failMsg = fm; window.pop = pp; return out.join('\n');
  }));
  await p.evaluate(() => { const H = halfpipe; window.__u = H.update; H.update = function (dt) { this.t += dt; return false; }; H.launch(1, 330); H.ah = 70; H.flip = 1; });
  for (let i = 0; i < 6; i++) { await p.evaluate((i) => { halfpipe.fl = 360 * i / 6 + 20; }, i); await p.waitForTimeout(80); await p.screenshot({ path: `amg/sk_mortal_${i}.png`, clip: r }); }
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
