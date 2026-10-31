// editor do jogo: abre no modo de teste local (?wzlocal=1, guarda no navegador), muda um número, uma pista, um rosto e uma fala,
// aplica e confere que o jogo usa as mudanças; fotos de cada aba
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1400, height: 900 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept('teste'));
  await p.goto('http://localhost:8765/index.html?wzlocal=1'); await p.waitForTimeout(1500);
  console.log('botão do editor:', await p.locator('#wz-abrir').count());
  await p.click('#wz-abrir'); await p.waitForTimeout(500);
  await p.screenshot({ path: 'amg/wz_mec.png' });
  // muda a velocidade máxima do bugue
  const lin = p.locator('#wz .lin', { hasText: 'vmax' }).first(); await lin.locator('input[type=number]').fill('300'); await lin.locator('input[type=number]').dispatchEvent('change');
  console.log('BG.vmax no rascunho:', await p.evaluate(() => BG.vmax));
  // pistas
  await p.click('#wz nav button >> nth=1'); await p.waitForTimeout(600); await p.screenshot({ path: 'amg/wz_pistas.png' });
  const cv = p.locator('#wz canvas.pc'), bb = await cv.boundingBox();
  // arrasta o primeiro ponto
  const pt = await p.evaluate(() => { return null; });
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.wheel(0, -200); await p.waitForTimeout(200);
  // caixas: clica na pista perto da largada
  await p.click('#wz .lado .chips button >> nth=1');
  const sp = await p.evaluate(() => { const c = document.querySelector('#wz canvas.pc'), r = c.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  await p.waitForTimeout(200); await p.screenshot({ path: 'amg/wz_pistas2.png' });
  // rostos
  await p.click('#wz nav button >> nth=3'); await p.waitForTimeout(800);
  const rc = p.locator('#wz canvas.rc'), rb = await rc.boundingBox();
  await p.mouse.move(rb.x + rb.width / 2, rb.y + rb.height * .5); await p.mouse.down(); await p.mouse.move(rb.x + rb.width / 2 + 40, rb.y + rb.height * .5, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(300);
  await p.screenshot({ path: 'amg/wz_rostos.png' });
  console.log('rosto mudado:', await p.evaluate(() => JSON.stringify(Object.entries(WZE.cfg.rostos)[0])));
  // textos
  await p.click('#wz nav button >> nth=4'); await p.waitForTimeout(300); await p.screenshot({ path: 'amg/wz_textos.png' });
  const ta = p.locator('#wz .lin', { hasText: 'intro.bugue' }).locator('textarea'); await ta.fill('Fala de teste do editor.'); await ta.dispatchEvent('change');
  // aplicar
  await p.click('#wz header button >> nth=1'); await p.waitForTimeout(300); await p.fill('#wz input[placeholder]', 'versão de teste'); await p.click('#wz button.pri >> nth=-1'); await p.waitForTimeout(500);
  await p.click('#wz nav button >> nth=5'); await p.waitForTimeout(400); await p.screenshot({ path: 'amg/wz_versoes.png' });
  await p.click('#wz header button >> nth=2'); await p.waitForTimeout(300);
  console.log('depois de aplicar e fechar:', await p.evaluate(() => [BG.vmax, FALA.intro.bugue[0]]));
  // abre de novo depois de jogar e pausar (o problema relatado: abria só uma vez)
  await p.evaluate(() => { choose(bocha); start(); }); await p.waitForTimeout(800); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.click('#wz-abrir', { timeout: 3000 }); await p.waitForTimeout(600); console.log('abriu de novo com o jogo pausado:', await p.locator('#wz').count());
  // cancha da bocha: arrasta o ponto de lançamento
  await p.click('#wz nav button >> nth=2'); await p.waitForTimeout(600);
  const cc = await p.evaluate(() => { const c = document.querySelector('#wz canvas.pc'), r = c.getBoundingClientRect(), k = Math.min(r.width / W, r.height / H); return [r.left + BC.sx * k, r.top + BC.sy * k]; });
  await p.mouse.move(cc[0], cc[1]); await p.mouse.down(); await p.mouse.move(cc[0] + 20, cc[1] - 30, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(300);
  console.log('lançamento depois de arrastar:', await p.evaluate(() => [BC.sx, BC.sy]));
  await p.screenshot({ path: 'amg/wz_cancha.png' });
  await p.click('#wz nav button >> nth=3'); await p.waitForTimeout(600); await p.click('#wz .chips button:has-text("Tamanho")'); 
  const rb2 = await p.locator('#wz canvas.rc').boundingBox(); await p.mouse.move(rb2.x + 200, rb2.y + 300); await p.mouse.down(); await p.mouse.move(rb2.x + 200, rb2.y + 240, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(300);
  console.log('tamanho do rosto depois de arrastar para cima:', await p.evaluate(() => (WZE.cfg.rostos['ia.idle.0'] || {}).fs));
  await p.screenshot({ path: 'amg/wz_rostos2.png' });
  await p.click('#wz header button >> nth=2'); await p.waitForTimeout(300); await p.click('#wz-abrir'); await p.waitForTimeout(500); console.log('abriu pela terceira vez:', await p.locator('#wz').count()); await p.click('#wz header button >> nth=2');
  // recarrega: o jogo lê o aplicado
  await p.reload(); await p.waitForTimeout(1800);
  console.log('ao abrir de novo:', await p.evaluate(() => [BG.vmax, FALA.intro.bugue[0]]));
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
