// editor: dificuldade dos adversários do vôlei (0 até impossível), com o nome ao lado; o máximo vale no jogo
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1400, height: 1000 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  // o servidor local não diz que a página é UTF-8: aqui ela vai com o aviso, para os acentos saírem certos na foto
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?wzlocal=1'); await p.waitForTimeout(1200); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2000);
  await p.keyboard.type('editor'); await p.waitForSelector('#wz-main', { timeout: 20000 });
  await p.evaluate(() => { WZE.aba = 'mec'; WZE.ev = 'volei'; wzRender(); }); await p.waitForTimeout(400);
  const linhas = await p.$$eval('#wz main .lin', (l) => l.filter((x) => x.querySelector('.rot')).map((x) => x.firstChild.textContent.replace(/\s+/g, ' ').trim() + ' | max ' + x.querySelector('input[type=range]').max));
  console.log(linhas.join('\n'));
  // arrasta a partida rápida até o fim e digita acima do máximo na final da Copa
  const lr = p.locator('#wz main .lin', { hasText: 'Partida rápida' }), r0 = lr.locator('input[type=range]'); await r0.evaluate((e) => { e.value = e.max; e.dispatchEvent(new Event('input')); }); await p.waitForTimeout(200);
  const fin = p.locator('#wz main .lin', { hasText: /^Final/ }).first().locator('input[type=number]'); await fin.fill('5'); await fin.dispatchEvent('change'); await p.waitForTimeout(200);
  console.log('rápida:', await lr.locator('.rot').textContent(), '| final da Copa digitando 5:', await fin.inputValue(), await p.locator('#wz main .lin', { hasText: /^Final/ }).first().locator('.rot').textContent());
  await p.locator('#wz main h3', { hasText: 'Dificuldade' }).scrollIntoViewIfNeeded(); await p.locator('#wz main').screenshot({ path: 'amg/wz_dificuldade.png' });
  console.log('no jogo:', JSON.stringify(await p.evaluate(() => ({ rapida: OPP.rapida.lvl, imp: (() => { volei.two = false; volei.tour = null; volei.copa = null; return volei.impossivel(); })(), copaFinal: COPA_LVL.final }))));
  console.log(errs.join(' | ') || 'sem erros'); await b.close(); })();
