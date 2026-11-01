// pintura, 2ª etapa: borrar, linha reta segurando, seleção (retângulo, laço, inverter), transformar, ajustes,
// modos de mistura, travar transparência, recorte, gestos (2 e 3 dedos, dedo parado), tela girada/espelhada,
// visor (onde o rosto aparece) e configurações lidas do pincel do Procreate.
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1400, height: 950 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?wzlocal=1'); await p.waitForTimeout(1200); await p.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('wz-pinceis'); }); await p.reload(); await p.waitForTimeout(2000);
  await p.keyboard.type('editor'); await p.waitForSelector('#wz-main', { timeout: 20000 });
  // documento grande e vazio para medir: uma imagem de cenário com uma camada nova por cima
  await p.evaluate(() => { WZE.aba = 'pintura'; WZP.modo = 'imagens'; WZP.img = window.__WZIMG.lista().find((k) => /11f6202254f0/.test(k)) || window.__WZIMG.lista()[0]; WZP.doc = null; WZP.ferr = 'pincel'; WZP.suav = 0; WZP.pincel = 'redondo'; wzRender(); });
  await p.waitForFunction(() => WZP.doc && WZP.doc.w > 0, null, { timeout: 15000 }); await p.waitForTimeout(300);
  await p.click('#wz .pin-abas button[data-a=camadas]'); await p.click('#wz button:has-text("+ Camada")');
  const T = '__wzpTela';
  // caneta: a posição é em pontos da IMAGEM (convertidos para a tela pela vista atual)
  const caneta = (pts, o = {}) => p.evaluate(([pts, o]) => { const cv = document.querySelector('#wz canvas.pin-cv'), r = cv.getBoundingClientRect(), V = window.__wzpTela.V;
    const ev = (t, [x, y, pr]) => { const q = V.transformPoint(new DOMPoint(x, y)); cv.dispatchEvent(new PointerEvent(t, { pointerId: o.id || 7, pointerType: o.tipo || 'pen', pressure: pr ?? .8, clientX: r.left + q.x, clientY: r.top + q.y, bubbles: true, button: 0, buttons: t === 'pointerup' ? 0 : 1, shiftKey: !!o.shift })); };
    ev('pointerdown', pts[0]); for (const q of pts.slice(1)) ev('pointermove', q); if (!o.semSoltar) ev('pointerup', pts[pts.length - 1]); }, [pts, o]);
  const solta = (x, y, o = {}) => p.evaluate(([x, y, o]) => { const cv = document.querySelector('#wz canvas.pin-cv'), r = cv.getBoundingClientRect(), q = window.__wzpTela.V.transformPoint(new DOMPoint(x, y)); cv.dispatchEvent(new PointerEvent('pointerup', { pointerId: o.id || 7, pointerType: o.tipo || 'pen', clientX: r.left + q.x, clientY: r.top + q.y, bubbles: true })); }, [x, y, o]);
  const px = (x, y, camada) => p.evaluate(([x, y, camada]) => { const D = WZP.doc, c = D.camadas[camada ?? D.at].c; return [...c.getContext('2d').getImageData(Math.round(x), Math.round(y), 1, 1).data]; }, [x, y, camada]);
  const linha = (x0, y0, x1, y1, n = 25) => Array.from({ length: n }, (_, i) => [x0 + (x1 - x0) * i / (n - 1), y0 + (y1 - y0) * i / (n - 1)]);
  await p.evaluate(() => { WZP.cor = '#e8484a'; WZP.tam = 30; WZP.opac = 1; WZP.fluxo = 1; WZP.pTam = false; });
  // 1) pincel e borrar
  await caneta(linha(200, 200, 400, 200)); console.log('pincel:', (await px(300, 200))[3] > 200);
  await p.evaluate(() => window.__wzpTela.escolhe('borrar')); await p.evaluate(() => { WZP.forca = 1; });
  await caneta(linha(300, 200, 300, 330, 40)); console.log('borrar puxou a tinta para baixo:', (await px(300, 260))[3] > 20, '| tinta borrada:', (await px(300, 260)).join(','));
  // 2) linha reta: traço torto, segura parado 0,8 s, solta
  await p.evaluate(() => window.__wzpTela.escolhe('pincel')); await p.evaluate(() => { WZP.cor = '#2a9df4'; WZP.tam = 10; });
  await caneta([[100, 500], [150, 430], [200, 560], [250, 440], [300, 500]], { semSoltar: true }); await p.waitForTimeout(800); await solta(300, 500);
  console.log('linha reta: meio do caminho reto pintado', (await px(200, 500))[2] > 200, '| ponto torto apagado', (await px(150, 430))[3] < 20, '|', await p.textContent('#wz .pin-info'));
  // 3) seleção retângulo: pinta só dentro
  await p.evaluate(() => { window.__wzpTela.escolhe('selecao'); WZP.selModo = 'retangulo'; });
  await caneta([[600, 100], [700, 150], [800, 300]]);
  await p.evaluate(() => window.__wzpTela.escolhe('pincel')); await p.evaluate(() => { WZP.cor = '#3a9d3a'; WZP.tam = 20; });
  await caneta(linha(550, 200, 900, 200)); console.log('seleção: dentro pintou', (await px(700, 200))[3] > 200, '| fora não', (await px(580, 200))[3] === 0 && (await px(870, 200))[3] === 0);
  await p.evaluate(() => window.__wzpTela.selInverte()); await caneta(linha(550, 250, 900, 250)); console.log('seleção invertida: fora pintou', (await px(580, 250))[3] > 200, '| dentro não', (await px(700, 250))[3] === 0);
  await p.evaluate(() => window.__wzpTela.selLimpa());
  // 4) transformar: seleciona o quadrado verde e move 200 para a direita, aumenta e gira
  await p.evaluate(() => { window.__wzpTela.escolhe('selecao'); WZP.selModo = 'retangulo'; }); await caneta([[600, 150], [800, 300]]);
  await p.evaluate(() => window.__wzpTela.escolhe('transformar'));
  const antes = await px(700, 200); await caneta(linha(700, 200, 700, 400, 10));
  await p.evaluate(() => { const f = window.__wzpTela.flut; f.T.s = 1.5; f.T.r = 20; });
  await p.evaluate(() => { window.__wzpTela.aplicaFlutuante(); window.__wzpTela.escolhe('pincel'); });
  console.log('transformar: saiu do lugar', antes[3] > 200 && (await px(700, 200))[3] === 0, '| foi para baixo', (await px(700, 400))[3] > 200);
  await p.keyboard.press('Control+z'); await p.waitForTimeout(100); console.log('desfazer o transformar:', (await px(700, 200))[3] > 200);
  // 5) ajustes: matiz 180 no vermelho vira ciano; desfoque espalha
  await p.evaluate(() => window.__wzpTela.escolhe('ajustes')); const c0 = await px(250, 200);
  await p.evaluate(() => { const a = window.__wzpTela.ajuste; a.v.h = 180; a.v.d = 4; a.aplica(); });
  const c1 = await px(250, 200); console.log('ajustes: cor mudou', c0.join(','), '->', c1.join(','), '| desfoque espalhou', (await px(250, 218))[3] > 0);
  // 6) camadas: travar transparência, recorte, modo de mistura
  await p.evaluate(() => { WZP.doc.camadas[WZP.doc.at].alfa = true; WZP.cor = '#000000'; WZP.tam = 60; });
  await caneta(linha(150, 200, 450, 200)); console.log('transparência travada: pintou só onde tinha tinta', (await px(250, 200))[0] < 30, '| fora continua vazio', (await px(150, 150))[3] === 0);
  await p.evaluate(() => { WZP.doc.camadas[WZP.doc.at].alfa = false; });
  await p.click('#wz .pin-abas button[data-a=camadas]'); await p.click('#wz button:has-text("+ Camada")'); await p.evaluate(() => { const D = WZP.doc; D.camadas[D.at].recorte = true; D.camadas[D.at].modo = 'multiply'; WZP.cor = '#ffff00'; WZP.tam = 40; });
  await caneta(linha(150, 330, 450, 330));
  const comp = await p.evaluate(() => { const D = WZP.doc, c = wzpCompor({ w: D.w, h: D.h, camadas: D.camadas.slice(1) }), q = c.getContext('2d'); return [[...q.getImageData(300, 200, 1, 1).data], [...q.getImageData(300, 330, 1, 1).data], [...q.getImageData(160, 330, 1, 1).data]]; });
  console.log('recorte + multiplicar: em cima da tinta', comp[0].join(','), '| fora da camada de baixo não aparece', comp[2][3] === 0 || comp[2].join(','));
  // 7) gestos: dois dedos = desfazer, três = refazer, dedo parado = conta-gotas
  const ndes = await p.evaluate(() => WZP.doc.desfaz.length);
  const toque = (ids, espera = 60) => p.evaluate(async ([ids, espera]) => { const cv = document.querySelector('#wz canvas.pin-cv'), r = cv.getBoundingClientRect(); const ev = (t, id, i) => cv.dispatchEvent(new PointerEvent(t, { pointerId: id, pointerType: 'touch', clientX: r.left + 300 + i * 40, clientY: r.top + 300, bubbles: true, buttons: t === 'pointerup' ? 0 : 1 }));
    ids.forEach((id, i) => ev('pointerdown', id, i)); await new Promise((ok) => setTimeout(ok, espera)); ids.forEach((id, i) => ev('pointerup', id, i)); }, [ids, espera]);
  await toque([21, 22]); console.log('dois dedos desfizeram:', (await p.evaluate(() => WZP.doc.desfaz.length)) === ndes - 1, '|', await p.textContent('#wz .pin-info'));
  await toque([31, 32, 33]); console.log('três dedos refizeram:', (await p.evaluate(() => WZP.doc.desfaz.length)) === ndes);
  // 8) tela girada e espelhada: o traço cai no lugar certo da imagem
  await p.evaluate(() => { WZP.doc.at = 0; window.__wzpTela.escolhe('pincel'); WZP.cor = '#ff00ff'; WZP.tam = 12; });
  await p.click('#wz button[title="Girar a tela"] >> nth=1'); await p.click('#wz button:has-text("Espelhar")'); await p.waitForTimeout(100);
  await caneta(linha(1000, 600, 1200, 600)); console.log('tela girada e espelhada: pintou no lugar certo', (await px(1100, 600, 0)).join(',') === '255,0,255,255');
  await p.screenshot({ path: 'amg/wz_pintura2_tela.png' });
  // 9) dedo parado = conta-gotas
  await p.evaluate(() => { WZP.cor = '#000001'; });
  await p.evaluate(async () => { const cv = document.querySelector('#wz canvas.pin-cv'), r = cv.getBoundingClientRect(), q = window.__wzpTela.V.transformPoint(new DOMPoint(1100, 600)); cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 41, pointerType: 'touch', clientX: r.left + q.x, clientY: r.top + q.y, bubbles: true, buttons: 1 })); await new Promise((ok) => setTimeout(ok, 750)); cv.dispatchEvent(new PointerEvent('pointerup', { pointerId: 41, pointerType: 'touch', clientX: r.left + q.x, clientY: r.top + q.y, bubbles: true })); });
  console.log('dedo parado pegou a cor:', await p.evaluate(() => WZP.cor));
  // 10) pincel do Procreate com configurações
  await p.locator('#wz input[type=file]').setInputFiles(path.join(__dirname, 'pinceis', 'Areia.brush')); await p.waitForTimeout(800);
  console.log('pincel do Procreate:', JSON.stringify(await p.evaluate(() => { const b = WZP_PINCEIS[WZP_PINCEIS.length - 1]; return { nome: b.nome, espaco: b.espaco, jitter: b.jitter, suav: b.suav, girar: b.girar, pMin: b.pMin }; })));
  // 11) visor: abre a máscara do quadro, enche com o balde e salva
  await p.evaluate(() => { WZP.doc.mudou = false; WZP.modo = 'personagem'; WZP.set = 'ia'; WZP.an = 'idle'; WZP.k = 0; WZP.visor = true; WZP.doc = null; WZP.ferr = 'pincel'; wzRender(); });
  await p.waitForFunction(() => WZP.doc && WZP.doc.tipo === 'visor', null, { timeout: 15000 }); await p.waitForTimeout(300);
  const vis0 = await p.evaluate(() => { const c = WZP.doc.camadas[0].c, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 127) n++; return n; });
  await p.evaluate(() => { WZP.tam = 6; }); await caneta(linha(20, 20, 80, 20));
  const vis1 = await p.evaluate(() => { const c = WZP.doc.camadas[0].c, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 127) n++; return n; });
  await p.locator('#wz canvas.pin-cv').screenshot({ path: 'amg/wz_pintura2_visor.png' });
  await p.click('#wz button:has-text("Salvar no jogo")'); await p.waitForTimeout(1200);
  console.log('visor: pontos antes', vis0, 'depois', vis1, '| máscara trocada no jogo:', await p.evaluate(() => { const k = window.__WZIMG.norm(MV5.a.idle.mask); return !!(WZE.cfg.imgs || {})[k]; }));
  console.log(errs.join(' | ') || 'sem erros'); await b.close(); })();
