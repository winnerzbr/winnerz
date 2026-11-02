// Sonoplastia (02/11): joga cada prova uns segundos (teclas sorteadas + as de cada prova) e conta os sons tocados.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }), p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { FOL.load(); window.__folLog = {}; const pl = FOL.play, lp = FOL.loop; FOL.play = function (n, ...a) { const r = pl.call(this, n, ...a); if (r) (window.__folLog[cur.id] = window.__folLog[cur.id] || {})[n] = ((window.__folLog[cur.id] || {})[n] || 0) + 1; return r; }; FOL.loop = function (id, n, ...a) { (window.__folLog[cur.id] = window.__folLog[cur.id] || {})['~' + n] = 1; return lp.call(this, id, n, ...a); }; });
  await p.waitForTimeout(2500);
  console.log('carregou:', await p.evaluate(() => FOL.ok()), await p.evaluate(() => Object.keys(FOL.map).length), 'sons');
  const ids = await p.evaluate(() => EVENTS.map((e) => e.id));
  const KEYS = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Space', 'KeyX', 'KeyC', 'KeyV', 'KeyZ'];
  for (const id of ids) {
    await p.evaluate((id) => { choose(EVENTS.find((e) => e.id === id)); start(); }, id); await p.waitForTimeout(3600);
    for (let i = 0; i < 40; i++) { const k = KEYS[(i * 7 + id.length) % KEYS.length]; await p.keyboard.down(k); if (i % 3 === 0) await p.keyboard.down('ArrowRight'); await p.waitForTimeout(140); await p.keyboard.up(k); if (i % 3 === 0) await p.keyboard.up('ArrowRight'); }
    const log = await p.evaluate((id) => window.__folLog[id] || {}, id);
    console.log(id.padEnd(13), Object.entries(log).map(([k, v]) => k.startsWith('~') ? k : `${k}×${v}`).join(' '));
    await p.evaluate(() => { mode = 'menu'; });
  }
  console.log(errs.slice(0, 5).join(' | ') || 'sem erros'); await b.close();
})();
