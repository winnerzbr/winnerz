// Basquete pintado (01/11): fotos de cada situação (parado, andando, carregando, arremessando, cesta, errou) e uma partida com o teclado.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); fs.mkdirSync('amg', { recursive: true });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { choose(basquete); start(); }); await p.waitForTimeout(4500);
  console.log('pintado carregado:', await p.evaluate(() => window.__BQOK && window.__BQOK()));
  const clip = { x: 0, y: 300, width: 900, height: 470 };
  await p.screenshot({ path: 'amg/bq_parado.png', clip });
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(500); await p.screenshot({ path: 'amg/bq_andando.png', clip }); await p.keyboard.up('ArrowRight');
  await p.waitForTimeout(300); await p.keyboard.down('Space'); await p.waitForTimeout(150); await p.screenshot({ path: 'amg/bq_carrega1.png', clip });
  await p.waitForTimeout(400); await p.screenshot({ path: 'amg/bq_carrega2.png', clip }); await p.keyboard.up('Space');
  await p.waitForTimeout(120); await p.screenshot({ path: 'amg/bq_arremesso.png', clip });
  await p.evaluate(() => { const u = basquete.update; basquete.update = function (dt, I) { this.t += dt; return false; }; window.__bu = u; basquete.cheer = 1.2; basquete.balls = []; basquete.shootT = 0; basquete.charging = false; });
  await p.waitForTimeout(200); await p.screenshot({ path: 'amg/bq_festa.png', clip });
  await p.evaluate(() => { basquete.cheer = 0; basquete.missT = .4; }); await p.waitForTimeout(150); await p.screenshot({ path: 'amg/bq_errou.png', clip });
  await p.evaluate(() => { basquete.missT = 0; basquete.update = window.__bu; });
  for (let i = 0; i < 4; i++) { await p.keyboard.down('Space'); await p.waitForTimeout(500 + i * 120); await p.keyboard.up('Space'); await p.waitForTimeout(1400); }
  console.log('estado:', await p.evaluate(() => [mode, basquete.score, basquete.shots, basquete.made].join(' · ')));
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
