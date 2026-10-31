// abre cada prova, joga 2 s e confere se não aparece erro; depois abre o pingue-pongue no celular e no modo 2 jogadores
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  const ids = await p.evaluate(() => EVENTS.map((e) => e.id)); console.log('provas:', ids.join(', '));
  for (const id of ids) { await p.evaluate((id) => { choose(EVENTS.find((e) => e.id === id)); start(); }, id); await p.waitForTimeout(1800); }
  await p.evaluate(() => { choose(pingue); }); await p.waitForTimeout(400);
  console.log('botão 2 jogadores:', await p.evaluate(() => !!document.getElementById('b-alt2') && getComputedStyle(document.getElementById('b-alt2')).display !== 'none'));
  await p.screenshot({ path: 'amg/pp_titulo.png' });
  await p.evaluate(() => { pingue.two = true; start(); }); await p.waitForTimeout(1500);
  await p.keyboard.press('KeyF'); await p.waitForTimeout(1500); await p.locator('canvas').first().screenshot({ path: 'amg/pp_2p.png' });
  const m = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }); m.on('pageerror', (e) => errs.push('cel: ' + e.message));
  await m.goto('http://localhost:8765/index.html'); await m.waitForTimeout(1500);
  await m.evaluate(() => { choose(pingue); start(); }); await m.waitForTimeout(2000); await m.screenshot({ path: 'amg/pp_cel.png' });
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
