// pintura 3ª etapa (cara do Procreate): dedos (pinça não pinta, toque de 2 dedos desfaz, com caneta o dedo não pinta),
// pincéis do Procreate (.brushset de verdade, com Reset/ e QuickLook/), camadas, copiar camada para outros quadros, salvar.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); fs.mkdirSync('amg', { recursive: true });
  await p.goto('http://localhost:8765/index.html?wzlocal=1'); await p.waitForTimeout(1200); await p.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('wz-pinceis'); }); await p.reload(); await p.waitForTimeout(2000);
  await p.keyboard.type('editor'); await p.waitForSelector('#wz-main', { timeout: 20000 });
  await p.evaluate(() => { WZE.aba = 'pintura'; Object.assign(WZP, { modo: 'personagem', set: 'ia', an: 'idle', k: 0, meio: false, visor: false }); wzRender(); });
  await p.waitForSelector('#pc .pc-grade .pc-card'); await p.waitForTimeout(800); await p.screenshot({ path: 'amg/pc_galeria.png' });
  await p.click('#pc .pc-grade .pc-card >> nth=0'); await p.waitForFunction(() => window.__wzpTela && __wzpTela.doc() && __wzpTela.doc().w > 0, null, { timeout: 15000 }); await p.waitForTimeout(500);
  const soma = () => p.evaluate(() => { const D = __wzpTela.doc(), c = D.camadas[D.at].c, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] * 3 + d[i + 2] * 7 + d[i + 3] * 11; return s; });
  // roteiro de toques: [[ms, tipo, id, x, y, pressão]]
  const roteiro = (passos, tipo = 'touch') => p.evaluate(async ([passos, tipo]) => { const cv = document.querySelector('#pc canvas.pc-cv'), r = cv.getBoundingClientRect(), dorme = (ms) => new Promise((ok) => setTimeout(ok, ms));
    for (const [ms, t, id, x, y, pr] of passos) { if (ms) await dorme(ms); cv.dispatchEvent(new PointerEvent(t, { pointerId: id, pointerType: tipo, isPrimary: id === 1, pressure: pr ?? .5, clientX: r.left + r.width * x, clientY: r.top + r.height * y, bubbles: true, button: 0, buttons: t === 'pointerup' ? 0 : 1 })); } }, [passos, tipo]);
  const traco = (id, x0, y0, x1, y1, n = 20, ms = 8) => [[0, 'pointerdown', id, x0, y0], ...Array.from({ length: n }, (_, i) => [ms, 'pointermove', id, x0 + (x1 - x0) * (i + 1) / n, y0 + (y1 - y0) * (i + 1) / n]), [ms, 'pointerup', id, x1, y1]];
  await p.evaluate(() => { WZP.cor = '#e8484a'; WZP.tam = 24; });
  const s0 = await soma();
  await roteiro(traco(1, .35, .3, .65, .5)); await p.waitForTimeout(150); const s1 = await soma();
  console.log('dedo sozinho (sem caneta ainda) pinta:', s1 !== s0);
  // pinça: o segundo dedo chega logo depois do primeiro
  const V0 = await p.evaluate(() => __wzpTela.V.a);
  await roteiro([[0, 'pointerdown', 1, .4, .6], [30, 'pointerdown', 2, .6, .6], ...Array.from({ length: 12 }, (_, i) => [12, 'pointermove', 1 + (i % 2), (i % 2 ? .6 + i * .01 : .4 - i * .01), .6]), [10, 'pointerup', 1, .3, .6], [5, 'pointerup', 2, .7, .6]]);
  await p.waitForTimeout(150); const s2 = await soma(), V1 = await p.evaluate(() => __wzpTela.V.a);
  console.log('pinça: não pintou', s2 === s1, '| aproximou', V1 > V0 * 1.1);
  // pinça com o primeiro dedo parado um tempo antes (o traço já tinha começado): é cancelado, nada fica pintado
  await roteiro([[0, 'pointerdown', 1, .4, .65], [60, 'pointermove', 1, .401, .65], [140, 'pointermove', 1, .41, .655], [20, 'pointerdown', 2, .6, .65], ...Array.from({ length: 8 }, (_, i) => [12, 'pointermove', 1 + (i % 2), (i % 2 ? .6 - i * .01 : .4 + i * .01), .65]), [10, 'pointerup', 1, .45, .65], [5, 'pointerup', 2, .55, .65]]);
  await p.waitForTimeout(150); console.log('pinça depois de parar o dedo: não pintou', (await soma()) === s2);
  await p.evaluate(() => __wzpTela.enquadra());
  // toque com dois dedos: desfaz o traço do dedo
  await roteiro([[0, 'pointerdown', 1, .5, .5], [20, 'pointerdown', 2, .55, .5], [60, 'pointerup', 1, .5, .5], [10, 'pointerup', 2, .55, .5]]); await p.waitForTimeout(150);
  console.log('toque de dois dedos desfez:', (await soma()) === s0);
  // caneta pinta; depois disso o dedo não pinta mais
  await roteiro(traco(9, .3, .3, .7, .6).map((x, i) => [...x, .2 + i / 30]), 'pen'); await p.waitForTimeout(150); const s3 = await soma();
  await roteiro(traco(1, .3, .7, .7, .7)); await p.waitForTimeout(150); const s4 = await soma();
  console.log('caneta pintou:', s3 !== s0, '| dedo depois da caneta não pinta:', s4 === s3);
  await p.screenshot({ path: 'amg/pc_estudio.png' });
  // pincéis: toque de novo no pincel abre a biblioteca; importar
  await p.click('#pc [data-f=pincel]'); await p.waitForSelector('#pc .pc-pop.pinceis');
  console.log('campo de arquivo sem filtro de tipo:', await p.$eval('#pc .pc-arq', (i) => !i.hasAttribute('accept')));
  for (const f of ['Real.brushset', 'Kit.brushset', 'Oval.brush', 'Areia.brush', 'Teste.abr']) {
    await p.locator('#pc .pc-arq').setInputFiles(path.join(__dirname, 'pinceis', f)); await p.waitForFunction((f) => /importad|:/.test(document.querySelector('#pc .pc-aviso')?.textContent || '') && !/Importando/.test(document.querySelector('#pc .pc-aviso').textContent), f, { timeout: 15000 }).catch(() => {});
    console.log('importar', f + ':', await p.textContent('#pc .pc-aviso'));
  }
  console.log('coleções:', await p.$$eval('#pc .pc-cols button', (l) => l.map((x) => x.textContent).join(', ')));
  await p.click('#pc .pc-cols button:has-text("Real")'); await p.waitForTimeout(200);
  console.log('pincéis do Real:', await p.$$eval('#pc .pc-pin span', (l) => l.map((x) => x.textContent).join(', ')));
  await p.locator('#pc .pc-pop').screenshot({ path: 'amg/pc_pinceis.png' });
  await p.click('#pc .pc-pin >> nth=1'); await p.waitForTimeout(100); await p.click('#pc .pc-pin.on'); await p.waitForSelector('#pc .pc-pop.estudio'); await p.locator('#pc .pc-pop').screenshot({ path: 'amg/pc_estudio_pincel.png' });
  await p.mouse.click(600, 400); // fecha a janela (sem pintar)
  await p.evaluate(() => { WZP.cor = '#2a6df4'; WZP.tam = 60; }); const s5 = await soma();
  await roteiro(traco(9, .3, .75, .7, .4, 30).map((x, i) => [...x, .3 + i / 50]), 'pen'); await p.waitForTimeout(150); console.log('pincel importado pinta:', (await soma()) !== s5);
  // camadas: nova camada, pinta nela, opções da camada, copiar para outros quadros (todos)
  await p.click('#pc [data-p=camadas]'); await p.click('#pc .pc-pop .pc-mais'); await p.evaluate(() => { WZP.cor = '#ffcc00'; WZP.tam = 30; WZP.pb.pincel = 'redondo'; });
  await p.mouse.click(600, 400);
  await roteiro(traco(9, .45, .15, .55, .25, 10).map((x) => [...x, .8]), 'pen'); await p.waitForTimeout(150);
  await p.click('#pc [data-p=camadas]'); await p.locator('#pc .pc-pop').screenshot({ path: 'amg/pc_camadas.png' });
  await p.click('#pc .pc-cam.on'); await p.waitForTimeout(100); await p.locator('#pc .pc-pop').screenshot({ path: 'amg/pc_camada_opcoes.png' });
  await p.click('#pc .pc-op:has-text("Copiar para outros quadros")'); await p.waitForSelector('#pc .pc-todos'); await p.check('#pc .pc-todos'); await p.waitForTimeout(400);
  await p.locator('#pc .pc-pop').screenshot({ path: 'amg/pc_copiar_quadros.png' });
  await p.click('#pc .pc-copiar'); await p.waitForTimeout(1500);
  const cq = await p.evaluate(() => { const D = __wzpTela.doc(), L = WZP_QC; void L; const outros = [...WZP_DOCS.values()].filter((d) => d !== D); return { quadros: wzpQuadrosDoMov().length, abertos: outros.length, comCamada: outros.filter((d) => d.camadas.length === 2).length, mudados: wzpMudados().length, aviso: document.querySelector('#pc .pc-aviso').textContent }; });
  console.log('copiar para todos os quadros:', JSON.stringify(cq));
  // alinhamento pelos pés: a cópia no quadro 2 está deslocada pela diferença dos pontos de apoio
  console.log('deslocamento no quadro 2:', await p.evaluate(() => { const D = __wzpTela.doc(), T = [...WZP_DOCS.values()].find((d) => d !== D && d.F.o.k === 1); const box = (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let x0 = 1e9, y0 = 1e9; for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 100) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); } return [x0, y0]; };
    const a = box(D.camadas[1].c), b2 = box(T.camadas[1].c); return { medido: [b2[0] - a[0], b2[1] - a[1]], esperado: [T.F.ax - D.F.ax, T.F.ay - D.F.ay] }; }));
  await p.waitForTimeout(300); await p.screenshot({ path: 'amg/pc_animacao.png' });
  // salvar tudo: uma imagem nova por folha
  await p.click('#pc .pc-c .pc-txt'); await p.waitForFunction(() => /salv/i.test(document.querySelector('#pc .pc-aviso').textContent) && !/Salvando/.test(document.querySelector('#pc .pc-aviso').textContent), null, { timeout: 30000 });
  console.log('salvar:', await p.textContent('#pc .pc-aviso'), '| imagens trocadas:', await p.evaluate(() => Object.keys(WZE.cfg.imgs || {}).length), '| sobrou para salvar:', await p.evaluate(() => wzpMudados().length));
  console.log('o jogo usa a imagem nova:', await p.evaluate(() => { const k = __wzpTela.doc().F.k, u = (WZE.cfg.imgs || {})[k], im = [...(window.__WZIMG.by.get(k) || [])][0]; return !!u && !!im && im.src === u; }));
  // cor, ações, ajustes, seleção automática, transformar
  await p.click('#pc .pc-cor'); await p.waitForSelector('#pc .pc-pop.cor'); await p.locator('#pc .pc-pop').screenshot({ path: 'amg/pc_cor.png' });
  await p.click('#pc [data-p=acoes]'); await p.click('#pc .pc-chips button:has-text("Ajuda")'); await p.locator('#pc .pc-pop').screenshot({ path: 'amg/pc_acoes.png' });
  await p.click('#pc [data-p=ajustes]'); await p.click('#pc [data-aj=hsb]'); await roteiro(traco(1, .3, .5, .6, .5, 10), 'mouse'); await p.waitForTimeout(200);
  console.log('ajuste arrastando na imagem:', await p.evaluate(() => JSON.stringify(__wzpTela.ajuste && __wzpTela.ajuste.v)));
  await p.screenshot({ path: 'amg/pc_ajuste.png' }); await p.click('#pc .pc-baixo button:has-text("Aplicar")');
  await p.click('#pc [data-f=selecao]'); await p.click('#pc .pc-baixo button:has-text("Automática")'); await roteiro(traco(9, .5, .2, .5, .2, 1), 'pen'); await p.waitForTimeout(300);
  console.log('seleção automática:', await p.evaluate(() => !!__wzpTela.doc().sel)); await p.screenshot({ path: 'amg/pc_selecao.png' });
  await p.click('#pc [data-f=transformar]'); await p.waitForTimeout(200); console.log('transformar abriu:', await p.evaluate(() => !!__wzpTela.flut)); await p.screenshot({ path: 'amg/pc_transformar.png' });
  await p.click('#pc .pc-baixo button:has-text("Cancelar")');
  // celular
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400); await p.screenshot({ path: 'amg/pc_celular.png' });
  await p.setViewportSize({ width: 1180, height: 820 });
  // voltar para o editor
  await p.click('#pc .pc-top .pc-txt >> nth=0'); await p.waitForSelector('#pc .pc-grade'); await p.click('#pc .pc-top .pc-txt >> nth=0'); await p.waitForTimeout(300);
  console.log('voltou ao editor:', await p.evaluate(() => !document.getElementById('pc') && WZE.aba));
  console.log(errs.join(' | ') || 'sem erros'); await b.close(); })();
