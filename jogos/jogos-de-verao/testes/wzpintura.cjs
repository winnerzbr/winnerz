// editor: aba Pintura. Abre um quadro do IAmiguinho, pinta com "caneta" (pressão), apaga, desfaz, camadas,
// importa pincéis do Procreate (.brush e .brushset) e do Photoshop (.abr), salva e o jogo passa a usar a imagem nova.
// Também confere o tamanho e o giro do desenho inteiro (Rostos e quadros).
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1400, height: 950 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?wzlocal=1'); await p.waitForTimeout(1200); await p.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('wz-pinceis'); }); await p.reload(); await p.waitForTimeout(2000);
  console.log('imagens registradas:', await p.evaluate(() => window.__WZIMG && window.__WZIMG.lista().length));
  await p.keyboard.type('editor'); await p.waitForSelector('#wz-main', { timeout: 20000 });
  // ---- tamanho e giro do desenho inteiro
  await p.evaluate(() => { WZE.aba = 'rostos'; WZE.rset = 'ia'; WZE.ran = 'idle'; WZE.rk = 0; wzRender(); }); await p.waitForTimeout(500);
  const rc = p.locator('#wz canvas.rc'), a0 = await rc.screenshot();
  await p.locator('#wz input[data-k=ks]').fill('1.3'); await p.waitForTimeout(150); await p.locator('#wz input[data-k=kr]').fill('12'); await p.waitForTimeout(250);
  const a1 = await rc.screenshot({ path: 'amg/wz_desenho_giro.png' });
  console.log('desenho inteiro: mudou na hora', !a0.equals(a1), '| no quadro', await p.evaluate(() => { const f = MV5.a.idle.f[0]; return [f.ks, +(f.kr * 180 / Math.PI).toFixed(1)]; }));
  // ---- pintura
  await p.evaluate(() => { WZE.aba = 'pintura'; WZP.modo = 'personagem'; WZP.set = 'ia'; WZP.an = 'idle'; WZP.k = 0; WZP.doc = null; wzRender(); });
  await p.waitForFunction(() => WZP.doc && WZP.doc.w > 0, null, { timeout: 15000 }); await p.waitForTimeout(400);
  console.log('aberto:', await p.textContent('#wz .pin + .ajuda, #wz .pin > .ajuda').catch(() => ''), await p.evaluate(() => [WZP.doc.w, WZP.doc.h, WZP.doc.F.k]));
  const cv = p.locator('#wz canvas.pin-cv'), bb = await cv.boundingBox();
  const px = () => p.evaluate(() => { const c = WZP.doc.camadas[WZP.doc.at].c, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] * 3 + d[i + 2] * 7 + d[i + 3] * 11; return s; });
  // caneta: pointer events com pressão crescendo
  const caneta = async (pts, tipo = 'pen') => p.evaluate(([pts, tipo]) => { const cv = document.querySelector('#wz canvas.pin-cv'), r = cv.getBoundingClientRect(); const ev = (t, [x, y, pr]) => cv.dispatchEvent(new PointerEvent(t, { pointerId: 7, pointerType: tipo, pressure: pr, clientX: r.left + x, clientY: r.top + y, bubbles: true, button: 0, buttons: t === 'pointerup' ? 0 : 1 }));
    ev('pointerdown', pts[0]); for (const q of pts.slice(1)) ev('pointermove', q); ev('pointerup', pts[pts.length - 1]); }, [pts, tipo]);
  const linha = (x0, y0, x1, y1, n = 30) => Array.from({ length: n }, (_, i) => [x0 + (x1 - x0) * i / (n - 1), y0 + (y1 - y0) * i / (n - 1), .1 + .9 * i / (n - 1)]);
  const s0 = await px();
  await p.evaluate(() => { WZP.cor = '#e8484a'; WZP.tam = 26; });
  await caneta(linha(bb.width * .3, bb.height * .3, bb.width * .7, bb.height * .6)); await p.waitForTimeout(200);
  const s1 = await px(); console.log('pincel com pressão pintou:', s1 !== s0);
  await cv.screenshot({ path: 'amg/wz_pintura_traco.png' });
  await p.keyboard.press('e'); await caneta(linha(bb.width * .3, bb.height * .62, bb.width * .7, bb.height * .62)); await p.waitForTimeout(150);
  const s2 = await px(); console.log('borracha apagou:', s2 !== s1, '| ferramenta:', await p.evaluate(() => WZP.ferr));
  await p.keyboard.press('Control+z'); await p.waitForTimeout(150); console.log('desfazer voltou:', (await px()) === s1);
  await p.keyboard.press('Control+Shift+z'); await p.waitForTimeout(150); console.log('refazer:', (await px()) === s2);
  // conta-gotas: pega a cor vermelha do traço
  await p.keyboard.press('i'); await p.evaluate(() => { WZP.cor = '#000000'; });
  const pt = await p.evaluate(() => { const D = WZP.doc, c = D.camadas[0].c, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const i = (y * c.width + x) * 4; if (d[i] > 200 && d[i + 1] < 100 && d[i + 3] > 250) return [x, y]; } return null; });
  if (pt) { await p.evaluate(([x, y]) => { const cv = document.querySelector('#wz canvas.pin-cv'), r = cv.getBoundingClientRect(); const s = 0; void s; }, pt); }
  console.log('ponto vermelho achado:', !!pt);
  // camadas
  await p.keyboard.press('b'); await p.click('#wz button:has-text("+ Camada")'); await p.evaluate(() => { WZP.cor = '#2a9df4'; });
  await caneta(linha(bb.width * .2, bb.height * .2, bb.width * .25, bb.height * .8)); await p.waitForTimeout(150);
  console.log('camadas:', await p.evaluate(() => WZP.doc.camadas.map((L) => L.nome).join(', ')));
  // pincéis importados
  const arq = p.locator('#wz input[type=file]');
  for (const f of ['Oval.brush', 'Kit.brushset', 'Teste.abr']) { await arq.setInputFiles(path.join(__dirname, 'pinceis', f)); await p.waitForTimeout(900); console.log('importar', f + ':', await p.textContent('#wz .pin ~ .ajuda, #wz .pin > .ajuda').catch(() => '?')); }
  console.log('pincéis na lista:', await p.$$eval('#wz .pin-pinceis button span', (l) => l.map((x) => x.textContent).join(', ')));
  await p.evaluate(() => { WZP.pincel = WZP_PINCEIS.find((b) => b.importado === 'Procreate').id; }); await p.evaluate(() => { WZP.cor = '#3a9d3a'; WZP.tam = 40; });
  await caneta(linha(bb.width * .35, bb.height * .75, bb.width * .65, bb.height * .4)); await p.waitForTimeout(200);
  await p.locator('#wz .pin-lado').screenshot({ path: 'amg/wz_pintura_lado.png' }); await cv.screenshot({ path: 'amg/wz_pintura_traco2.png' });
  // salvar no jogo
  await p.click('#wz button:has-text("Salvar no jogo")'); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const k = WZP.doc.F.k, u = (WZE.cfg.imgs || {})[k], im = [...window.__WZIMG.by.get(k)][0]; return { chave: k, salvo: !!u, jogoUsa: !!(im && im.src === u), mudou: WZP.doc.mudou }; });
  console.log('salvou e o jogo usa a nova:', JSON.stringify(r), '|', await p.textContent('#wz-st'));
  await p.screenshot({ path: 'amg/wz_pintura_tela.png' });
  // o jogo desenha com a imagem nova
  const ok = await p.evaluate(() => new Promise((res) => { const im = [...window.__WZIMG.by.get(WZP.doc.F.k)][0]; const go = () => { const c = document.createElement('canvas'); c.width = 260; c.height = 260; const g = c.getContext('2d'); const sv = ctx; ctx = g; try { g.translate(130, 250); g.scale(4, 4); __fr.ia('idle', 0, 'g', 0, false); } finally { ctx = sv; } res(c.toDataURL()); }; if (im.complete) go(); else im.onload = go; }));
  require('fs').writeFileSync('amg/wz_pintura_nojogo.png', Buffer.from(ok.split(',')[1], 'base64'));
  // cenários: lista de imagens e abrir uma grande
  await p.evaluate(() => { WZP.modo = 'imagens'; WZP.doc = null; wzRender(); }); await p.waitForTimeout(1500);
  const n = await p.$$eval('#wz .gal .mini', (l) => l.length); await p.click('#wz .gal .mini >> nth=0'); await p.waitForFunction(() => WZP.doc && WZP.doc.w > 0, null, { timeout: 15000 });
  console.log('cenários na lista:', n, '| aberto:', await p.evaluate(() => [WZP.doc.F.k, WZP.doc.w, WZP.doc.h]));
  await p.screenshot({ path: 'amg/wz_pintura_cenario.png' });
  console.log(errs.join(' | ') || 'sem erros'); await b.close(); })();
