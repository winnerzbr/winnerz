// o rosto no editor não muda depois de jogar (antes, o "olhar para a bola" do jogo ficava guardado e mexia o rosto no editor),
// e no jogo o rosto fica onde foi posto (ROSTO.olhar = 0); com 1 volta a olhar para a bola
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1400, height: 900 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html?wzlocal=1'); await p.waitForTimeout(1200); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2000);
  const abre = async () => { await p.keyboard.type('editor'); await p.waitForTimeout(800); await p.click('#wz nav button >> nth=3'); await p.waitForTimeout(500); await p.selectOption('#wz main select >> nth=0', 'run'); await p.waitForTimeout(400); };
  await abre(); await p.locator('#wz input[data-k=fx]').fill('-1'); await p.locator('#wz input[data-k=fy]').fill('5'); await p.locator('#wz input[data-k=fr]').fill('6'); await p.waitForTimeout(300);
  const bb = await p.locator('#wz canvas.rc').boundingBox(), clip = { x: bb.x + 8, y: bb.y + 8, width: bb.width - 16, height: bb.height - 16 };
  const a = await p.screenshot({ clip, path: 'amg/wzolhar_antes.png' });
  await p.evaluate(() => wzFechar()); await p.evaluate(() => { choose(volei); start(); }); await p.waitForTimeout(9000);
  // o rosto do jogo agora: desenho do quadro com o olhar que o jogo deixou
  const jogo = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 200; const g = c.getContext('2d'); const sv = ctx; ctx = g; try { g.translate(100, 190); g.scale(2.5, 2.5); __fr.ia('run', 0, 'g', 0, false); } finally { ctx = sv; } return c.toDataURL(); });
  const neutro = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 200; const g = c.getContext('2d'); const sv = ctx; ctx = g; window.__wzSemOlhar = true; try { g.translate(100, 190); g.scale(2.5, 2.5); __fr.ia('run', 0, 'g', 0, false); } finally { ctx = sv; window.__wzSemOlhar = false; } return c.toDataURL(); });
  console.log('no jogo, rosto igual ao do editor (olhar 0):', jogo === neutro);
  await p.evaluate(() => { ROSTO.olhar = 1; }); await p.waitForTimeout(1500);
  const olhando = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 200; const g = c.getContext('2d'); const sv = ctx; ctx = g; try { g.translate(100, 190); g.scale(2.5, 2.5); __fr.ia('run', 0, 'g', 0, false); } finally { ctx = sv; } return c.toDataURL(); });
  require('fs').writeFileSync('amg/wzolhar_olhando.png', Buffer.from(olhando.split(',')[1], 'base64')); require('fs').writeFileSync('amg/wzolhar_neutro.png', Buffer.from(neutro.split(',')[1], 'base64'));
  console.log('com olhar 1 o rosto se mexe (se a bola estiver de lado):', olhando !== neutro); await p.evaluate(() => { ROSTO.olhar = 0; });
  await p.evaluate(() => pause()); await p.waitForTimeout(300); await abre();
  const b2 = await p.screenshot({ clip, path: 'amg/wzolhar_depois.png' });
  console.log('editor igual antes e depois de jogar:', a.equals(b2), '| campos:', await p.$$eval('#wz input[data-k]', (l) => l.slice(0, 4).map((i) => i.dataset.k + '=' + i.value).join(' ')));
  console.log(errs.join(' | ') || 'sem erros'); await b.close(); })();
