// Sonoplastia retirada (02/11): joga cada prova uns segundos e conta os bipes de antes; confere que não sobrou nada dos sons novos.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  console.log('sons novos no jogo:', await p.evaluate(() => typeof FOL !== 'undefined' || !!window.__folHook));
  await p.evaluate(() => { window.__bp = {}; const o = beep; beep = function (...a) { window.__bp[cur.id] = (window.__bp[cur.id] || 0) + 1; return o.apply(this, a); }; });
  const ids = await p.evaluate(() => EVENTS.map((e) => e.id));
  const KEYS = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Space', 'KeyX', 'KeyC', 'KeyV', 'KeyZ'];
  const out = [];
  for (const id of ids) {
    await p.evaluate((id) => { choose(EVENTS.find((e) => e.id === id)); start(); }, id); await p.waitForTimeout(3600);
    for (let i = 0; i < 30; i++) { const k = KEYS[(i * 7 + id.length) % KEYS.length]; await p.keyboard.down(k); if (i % 3 === 0) await p.keyboard.down('ArrowRight'); await p.waitForTimeout(120); await p.keyboard.up(k); if (i % 3 === 0) await p.keyboard.up('ArrowRight'); }
    out.push(id + ' ' + await p.evaluate((id) => window.__bp[id] || 0, id));
    await p.evaluate(() => { mode = 'menu'; });
  }
  console.log(out.join(' · ')); console.log(errs.slice(0, 5).join(' | ') || 'sem erros'); await b.close();
})();
