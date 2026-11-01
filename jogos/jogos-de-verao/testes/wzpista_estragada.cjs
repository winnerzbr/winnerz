// rascunho com um atalho fora da pista não trava o rosto ao vivo
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1400, height: 900 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?wzlocal=1'); await p.waitForTimeout(1200);
  await p.evaluate(() => { localStorage.clear(); const sc = JSON.parse(JSON.stringify(BG_TRACKS[0].sc)); sc[0].b = 99999; sc[0].a = 99000; localStorage.setItem('wz_rascunho', JSON.stringify({ cfg: { mec: {}, textos: {}, rostos: {}, pistas: { 'pista:0.sc': sc } }, at: 1 })); });
  await p.reload(); await p.waitForTimeout(1800);
  await p.keyboard.type('editor'); await p.waitForTimeout(600); await p.click('#wz nav button >> nth=3'); await p.waitForTimeout(800);
  const cv = p.locator('#wz canvas.rc'); const a = await cv.screenshot(); const inp = p.locator('#wz input[data-k=fx]'); await inp.click(); await inp.press('ArrowUp'); await inp.press('ArrowUp'); await p.waitForTimeout(150);
  console.log('rosto ao vivo com atalho estragado:', !a.equals(await cv.screenshot()));
  await p.click('#wz header button >> nth=2'); await p.evaluate(() => { choose(bugue); start(); }); await p.waitForTimeout(1500);
  console.log(errs.join(' | ') || 'sem erros'); await b.close(); })();
