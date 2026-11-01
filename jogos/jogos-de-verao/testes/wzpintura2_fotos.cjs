// fotos da pintura (2ª etapa) para mostrar ao dono: tela cheia com transformar e camadas; ajustes com a aba de cor
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1440, height: 900 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html?wzlocal=1'); await p.waitForTimeout(1200); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2000);
  await p.keyboard.type('editor'); await p.waitForSelector('#wz-main', { timeout: 20000 });
  await p.evaluate(() => { WZE.aba = 'pintura'; WZP.modo = 'personagem'; WZP.set = 'ia'; WZP.an = 'run'; WZP.k = 2; WZP.visor = false; WZP.cebola = false; WZP.doc = null; WZP.ferr = 'pincel'; WZP.lado = 'camadas'; wzRender(); });
  await p.waitForFunction(() => WZP.doc && WZP.doc.w > 0, null, { timeout: 15000 }); await p.waitForTimeout(300);
  await p.click('#wz button[data-cheia]'); await p.waitForTimeout(300);
  await p.click('#wz .pin-abas button[data-a=camadas]'); await p.click('#wz button:has-text("+ Camada")');
  await p.evaluate(() => { const D = WZP.doc, L = D.camadas[1]; L.nome = 'Sombra'; L.modo = 'multiply'; L.recorte = true; L.op = .7;
    const q = L.c.getContext('2d'); q.fillStyle = '#7d6fd8'; q.beginPath(); q.ellipse(40, 120, 45, 30, 0, 0, 6.28); q.fill(); });
  await p.click('#wz .pin-abas button[data-a=pincel]'); await p.click('#wz .pin-abas button[data-a=camadas]');
  await p.evaluate(() => { const D = WZP.doc, p2 = new Path2D(); p2.rect(55, 60, 55, 50); D.sel = { path: p2, inv: false }; D.at = 0; window.__wzpTela.escolhe('transformar'); const f = window.__wzpTela.flut; if (f) { f.T.r = -10; f.T.s = 1.1; } });
  await p.waitForTimeout(500); await p.screenshot({ path: 'amg/wz_pintura2_demo.png' });
  await p.evaluate(() => { window.__wzpTela.cancelaFlutuante(); window.__wzpTela.selLimpa(); window.__wzpTela.escolhe('ajustes'); const a = window.__wzpTela.ajuste; a.v.h = 40; a.v.s = 20; });
  await p.click('#wz .pin-abas button[data-a=cor]'); await p.waitForTimeout(400); await p.screenshot({ path: 'amg/wz_pintura2_demo2.png' });
  await b.close(); })();
