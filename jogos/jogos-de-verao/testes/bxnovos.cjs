// BMX (02/11): os 8 movimentos novos no jogo, cada um numa foto (Superman e Sem mãos segurados, Tailwhip contínuo, bunny hop,
// mortal encolhido, corpo para trás, empinando, desequilibrou no pouso) e uma partida curta com o teclado.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 }); fs.mkdirSync('amg', { recursive: true });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__skHora = 12; choose(bmx); start(); }); await p.waitForTimeout(5000);
  const r = await p.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.x, y: c.y, width: c.width, height: c.height }; });
  await p.evaluate(() => { const B = bmx; window.__U = B.update; B.update = function (dt) { this.t += dt; return false; }; B.init(); B.pousa(300, 200); });
  const base = 'const B = bmx; B.pousa(300, 200); Object.assign(B, { air: false, trick: null, wobT: 0, landT: 0, carga: 0, hopT: null, dirIn: 0, w: 0, zoom: 1 });';
  const cenas = [
    ['superH', 'B.py += 60; B.sync(); Object.assign(B, { air: true, trick: { key: "b", ...BX_MAN.b, t: BX_MAN.b.d * .5, hold: .4 } });'],
    ['semmaoH', 'B.py += 60; B.sync(); Object.assign(B, { air: true, trick: { key: "c", ...BX_MAN.c, t: BX_MAN.c.d * .5, hold: .4 } });'],
    ['tailC', 'B.py += 60; B.sync(); Object.assign(B, { air: true, trick: { key: "e", ...BX_MAN.e, t: .2, n: 2 } });'],
    ['hop', 'B.py += 30; B.sync(); Object.assign(B, { air: true, hopT: B.t - .15 });'],
    ['tuck', 'B.py += 60; B.a = 1.2; B.sync(); Object.assign(B, { air: true, w: 6 });'],
    ['corpo', 'B.py += 60; B.sync(); Object.assign(B, { air: true, dirIn: 1, corpoT: .5 });'],
    ['wheelie', 'B.a = Math.atan(B.slope(B.x)) + .55; Object.assign(B, { cont: [true, false], dirIn: 1 }); B.sync();'],
    ['deseq', 'Object.assign(B, { wobT: .3 });'],
  ];
  for (const [nm, js] of cenas) { await p.evaluate(base + js); await p.waitForTimeout(150); await p.screenshot({ path: `amg/bxn_${nm}.png`, clip: r }); }
  await p.evaluate(() => { bmx.update = window.__U; choose(bmx); start(); }); await p.waitForTimeout(4500);
  await p.keyboard.down('Space'); for (let i = 0; i < 6; i++) { await p.keyboard.down('ArrowDown'); await p.waitForTimeout(300); await p.keyboard.up('ArrowDown'); await p.keyboard.press('ArrowUp'); await p.keyboard.down('KeyX'); await p.waitForTimeout(500); await p.keyboard.up('KeyX'); } await p.keyboard.up('Space');
  console.log('estado:', await p.evaluate(() => [mode, bmx.score, bmx.tombos].join(' · ')));
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
