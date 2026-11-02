// Corrida na areia pintada: 4 fotos grandes para mostrar (largada, pulo, tropeço dos Amiguinhos, chegada) e a noite.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 }); fs.mkdirSync('amg', { recursive: true });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__skHora = 12; choose(obstaculos); start(); }); await p.waitForTimeout(3000);
  const clip = await p.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  const shot = (n) => p.screenshot({ path: `amg/crv_${n}.png`, clip });
  await p.evaluate(() => { obstaculos.startHeat(1); obstaculos.stT = .7; window.__ou = obstaculos.update; obstaculos.update = function (dt) { this.t += dt; return false; }; }); await p.waitForTimeout(200); await shot('1_largada');
  // correndo: o IAmiguinho no meio do pulo de uma cerca, Amiguinhos correndo e pulando
  await p.evaluate(() => { const O = obstaculos; O.st = 'corrida'; O.stT = 9; const K = ['cerca', 'castelo', 'tronco', 'siri', 'poca', 'cerca']; O.rs.forEach((r, i) => { r.x = 260 + [30, 12, -8, 0][i]; r.v = 9; r.ph = i * 1.3; r.st = .6; r.obs = K.map((k, j) => ({ k, m: 0, x: 262 + j * 58, hit: false, ok: false, dx: 0, ph: j })); }); const me = O.me(); me.air = OB.JT * .5; me.y = OB.JH; O.rs[1].air = OB.JT * .3; O.rs[1].y = 18; O.fofa = []; O.fx = []; }); await p.waitForTimeout(150); await shot('2_pulo');
  await p.evaluate(() => { const O = obstaculos, me = O.me(); me.air = 0; me.y = 0; O.rs[1].air = 0; O.rs[1].y = 0; O.rs[0].tropT = .45; O.rs[0].slip = false; O.rs[2].tropT = .25; O.rs[2].slip = false; me.bufT = 1; me.v = 2; O.fx = [{ x: O.rs[0].x + 6, lane: 0, t: .2 }]; }); await p.waitForTimeout(150); await shot('3_tropeco');
  await p.evaluate(() => { const O = obstaculos; O.rs.forEach((r) => { r.tropT = 0; r.bufT = 0; r.x = O.L - 30 - r.lane * 8; r.v = 9; r.obs = []; }); }); await p.waitForTimeout(150); await shot('4_chegada');
  await p.evaluate(() => { const O = obstaculos; O.rs.forEach((r) => { r.done = true; r.v = 0; r.x = O.L + 30 + r.lane * 6; r.time = [9.1, 9.6, 10.2, 8.8][r.lane]; }); }); await p.waitForTimeout(150); await shot('5_venceu');
  for (const h of [7, 17.5, 22]) { await p.evaluate((h) => { window.__skHora = h; const O = obstaculos; O.rs.forEach((r) => { r.done = false; r.x = 300 + r.lane * 5; r.v = 9; r.obs = ['cerca', 'castelo', 'tronco', 'siri'].map((k, j) => ({ k, m: 0, x: 340 + j * 70, hit: false, ok: false, dx: 0, ph: j })); }); }, h); await p.waitForTimeout(150); await shot('6_hora_' + h); }
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
