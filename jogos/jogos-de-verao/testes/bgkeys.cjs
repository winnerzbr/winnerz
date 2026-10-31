// corrida de bugue pelo teclado: largada com turbo (Espaço no "Vai!"), curva com derrapagem (C) e item (V)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  await p.evaluate(() => { choose(bugue); start(); });
  await p.waitForFunction(() => bugue.race > -.35, null, { timeout: 15000 }); await p.keyboard.down('Space');
  await p.waitForTimeout(800); const s = () => p.evaluate(() => ({ s: Math.round(bugue.me.s), boost: bugue.me.boost.toFixed(2), turbos: bugue.turbos, drift: bugue.me.drift, chg: bugue.me.chg.toFixed(2), itens: bugue.me.items.map((q) => q.k).join('+'), pos: bugue.rank }));
  console.log('depois da largada', JSON.stringify(await s()));
  await p.waitForTimeout(1500); await p.keyboard.down('ArrowLeft'); await p.keyboard.down('KeyC'); await p.waitForTimeout(1300); console.log('derrapando', JSON.stringify(await s()));
  await p.keyboard.up('KeyC'); await p.keyboard.up('ArrowLeft'); await p.waitForTimeout(100); console.log('soltou', JSON.stringify(await s()));
  await p.evaluate(() => { bugue.me.items = [{ k: 'bola', roll: 0 }, { k: 'coco', roll: 0 }]; }); await p.keyboard.press('KeyV'); await p.waitForTimeout(100); console.log('item usado', JSON.stringify(await s()), 'bolas na pista', await p.evaluate(() => bugue.proj.length));
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
