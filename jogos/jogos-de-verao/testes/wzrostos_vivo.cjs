const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1400, height: 900 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?wzlocal=1'); await p.waitForTimeout(1200); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2000);
  await p.keyboard.type('editor'); await p.waitForTimeout(600); await p.click('#wz nav button >> nth=3'); await p.waitForTimeout(800);
  for (let si = 0; si < 5; si++) {
    await p.click(`#wz main .chips >> nth=0 >> button >> nth=${si}`); await p.waitForTimeout(800);
    await p.click('#wz .tira button >> nth=1'); await p.waitForTimeout(200);
    const cv = p.locator('#wz canvas.rc'); const out = [];
    for (const k of ['fx', 'fy', 'fs', 'fr', 'ax', 'ay']) {
      const a = await cv.screenshot(); const inp = p.locator(`#wz input[data-k=${k}]`); if (!(await inp.count())) { out.push(k + ':sem campo'); continue; }
      await inp.click(); await inp.press('ArrowUp'); await inp.press('ArrowUp'); if (k === 'fs') { for (let i = 0; i < 8; i++) await inp.press('ArrowUp'); } if (k === 'fr') { for (let i = 0; i < 12; i++) await inp.press('ArrowUp'); }
      await p.waitForTimeout(150); const b2 = await cv.screenshot(); out.push(`${k}:${a.equals(b2) ? 'NÃO mudou' : 'mudou'}`);
    }
    console.log(si, out.join(' '));
  }
  console.log(errs.join(' | ') || 'sem erros'); await b.close(); })();
