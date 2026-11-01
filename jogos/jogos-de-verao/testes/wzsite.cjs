// o jogo dentro do site: moldura + ponte (src/lib/jogosPonte.ts) com um Supabase de mentira.
// Confere: editor abre sozinho (?editor=1), rascunho e aplicado vão para a tabela, pintura vai para a pasta de imagens,
// e ao recarregar o jogo usa o aplicado (números e imagem pintada).
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1400, height: 950 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8766/host.html'); const fr = () => p.frame({ url: /jogos-verao/ });
  await p.waitForTimeout(1500);
  const f = fr(); await f.waitForSelector('#wz-main', { timeout: 20000 });
  await p.waitForTimeout(1500); console.log('editor abriu sozinho:', true, '|', await f.textContent('#wz-diag'), '| rostos da semente no editor:', await f.evaluate(() => Object.keys(WZE.cfg.rostos).length));
  // muda um número e aplica
  await f.evaluate(() => { WZE.cfg.mec['OPP.rapida.lvl'] = 1.2; WZ.apply(WZE.cfg); wzMudou(); }); await p.waitForTimeout(1500);
  console.log('rascunho na tabela:', await p.evaluate(() => [...window.__T.keys()].join(', ')));
  // pinta e salva
  await f.evaluate(() => { WZE.aba = 'pintura'; Object.assign(WZP, { modo: 'personagem', set: 'ia', an: 'idle', k: 0, meio: false, visor: false, estudio: true }); wzRender(); });
  await f.waitForFunction(() => WZP.doc && WZP.doc.w > 0, null, { timeout: 15000 });
  await f.evaluate(() => { const L = WZP.doc.camadas[0].c.getContext('2d'); L.fillStyle = '#ff00ff'; L.fillRect(10, 10, 40, 40); WZP.doc.mudou = true; });
  await f.click('#pc .pc-c .pc-txt'); await p.waitForTimeout(2500);
  console.log('pasta de imagens:', await p.evaluate(() => [...window.__F.keys()].join(', ')), '|', await f.textContent('#pc .pc-aviso').catch(() => ''));
  // aplicar (a pergunta do nome: confirma vazio)
  await f.click('#pc .pc-top button:has-text("Galeria")'); await f.click('#pc button:has-text("Aplicar no jogo")'); await p.waitForTimeout(400);
  await f.click('button:has-text("Confirmar")');
  await p.waitForTimeout(1500);
  console.log('depois de aplicar:', await p.evaluate(() => [...window.__T.keys()].join(', ')));
  // recarrega só o jogo: o aplicado vale (nível e imagem)
  await f.evaluate(() => location.reload()); await p.waitForTimeout(6000);
  const g = fr();
  console.log('recarregado:', JSON.stringify(await g.evaluate(() => { const k = Object.keys((WZ_APLICADO || {}).imgs || {})[0]; const im = k && [...window.__WZIMG.by.get(k)][0]; return { nivel: OPP.rapida.lvl, imagens: Object.keys((WZ_APLICADO || {}).imgs || {}).length, jogoUsa: !!(im && im.src.startsWith('data:')), diag: document.querySelector('#wz-diag') ? document.querySelector('#wz-diag').textContent : wzDiag() }; })));
  await p.screenshot({ path: 'amg/wz_site_editor.png' });
  console.log(errs.join(' | ') || 'sem erros'); await b.close(); })();
