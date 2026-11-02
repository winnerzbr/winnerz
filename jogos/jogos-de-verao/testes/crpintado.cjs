// Corrida na areia pintada (02/11): fotos da largada, da corrida, do pulo, do tropeço, do cansaço e do placar.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); fs.mkdirSync('amg', { recursive: true });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__skHora = 12; choose(obstaculos); start(); }); await p.waitForTimeout(3500);
  console.log('pintado:', await p.evaluate(() => [!!window.__CROK && window.__CROK(), !!window.__CRIOK && window.__CRIOK()].join(' ')));
  const box = await p.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  const clip = box; const shot = (n) => p.screenshot({ path: `amg/cr_${n}.png`, clip });
  await p.evaluate(() => { obstaculos.startHeat(0); }); await p.waitForTimeout(300); await shot('largada');
  await p.waitForTimeout(2600); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(900); await shot('sprint');
  await p.keyboard.up('ArrowRight'); await p.waitForTimeout(500); await shot('trote');
  await p.evaluate(() => { const me = obstaculos.me(); me.air = OB.JT * .55; }); await p.waitForTimeout(40); await shot('pulo');
  await p.evaluate(() => { const me = obstaculos.me(); obstaculos.trip(me, false); obstaculos.rs[1].tropT = .7; }); await p.waitForTimeout(150); await shot('tropeco');
  await p.waitForTimeout(900); await p.evaluate(() => { const me = obstaculos.me(); me.bufT = 1.2; me.v = 3; }); await p.waitForTimeout(250); await shot('cansado');
  // obstáculos na frente: põe os da bateria perto da câmera
  await p.evaluate(() => { const me = obstaculos.me(); const K = ['cerca', 'castelo', 'siri', 'tronco', 'castelo', 'poca', 'cerca']; for (const r of obstaculos.rs) r.obs = K.map((k, i) => ({ k, m: 0, x: me.x + 30 + i * 52, hit: i === 4 || i === 6, ok: false, dx: 0, ph: i })); obstaculos.fofa = [{ x0: me.x + 120, x1: me.x + 180 }]; window.__ou = obstaculos.update; obstaculos.update = function (dt) { this.t += dt; return false; }; }); await p.waitForTimeout(200); await shot('obstaculos');
  await p.evaluate(() => { const me = obstaculos.me(); for (const r of obstaculos.rs) r.x = obstaculos.L - 60 + r.lane * 4; obstaculos.update = window.__ou; }); await p.waitForTimeout(200); await shot('chegada');
  await p.evaluate(() => { for (const r of obstaculos.rs) { r.done = true; r.time = 8 + r.lane; } obstaculos.st = 'placar'; obstaculos.stT = 0; }); await p.waitForTimeout(400); await shot('placar');
  for (const h of [7, 12, 17.5, 22]) { await p.evaluate((h) => { window.__skHora = h; }, h); await p.waitForTimeout(120); await shot('hora_' + h); }
  
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
