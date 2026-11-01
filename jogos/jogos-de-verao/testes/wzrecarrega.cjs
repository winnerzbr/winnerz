// editor: o que foi aplicado (igual ao do dono em 01/11) volta ao recarregar, no jogo e no editor
const { chromium } = require('playwright');
const R = {};
for (let k = 0; k < 16; k++) R[`ia.idle.${k}`] = { fx: 0, fy: -1, fs: 1, fr: 5, ax: 0, ay: 0 };
for (let k = 0; k < 8; k++) R[`ia.readyU.${k}`] = { fx: 0, fy: -2, fs: 1, fr: -15, ax: 0, ay: 0 };
for (let k = 0; k < 16; k++) R[`ia.run.${k}`] = { fx: 3, fy: 4, fs: 1, fr: 6, ax: 0, ay: 0 };
for (let k = 0; k < 40; k++) R[`ia.serve.${k}`] = { fr: 8, fx: 1 };
R['ia.spike.11'] = { fx: 9, fy: -1, fs: 1, fr: 16, ax: 0, ay: 0 }; R['ia.dive.25'] = { fr: 1 };
const CFG = { mec: { 'BC.x0': 50, 'BC.y1': 190, 'BC.y0': 49 }, pistas: {
  'pista:0.boxes': [93, 154, 256, 359, 525, 604], 'pista:0.ramps': [31, 119, 544], 'pista:0.fofa': [], 'pista:0.slopes': [],
  'pista:0.pts': [[492, 2050], [1148, 2066], [2378, 2034], [2977, 1883], [3216, 1596], [3277, 1186], [3198, 861], [3321, 533], [3132, 246], [2747, 262], [2583, 533], [2337, 722], [1968, 672], [1686, -61], [1257, 68], [1043, 325], [918, 697], [957, 1073], [1311, 1118], [1738, 913], [2006, 1114], [1950, 1493], [1372, 1629], [820, 1476], [451, 1410], [213, 1599], [246, 1911]],
  'pista:0.pads': [{ i: 10, o: 0 }, { i: 52, o: -22 }, { i: 118, o: 20 }, { i: 184, o: -18 }, { i: 299, o: 24 }, { i: 400, o: -20 }, { i: 514, o: 18 }, { i: 594, o: 0 }],
  'pista:0.sc': [{ a: 566, b: 674, kind: 'agua' }, { a: 154, b: 234, kind: 'agua' }, { a: 435, b: 436, kind: 'agua' }, { a: 518, b: 519, kind: 'agua' }, { a: 25, b: 25, kind: 'agua' }],
}, rostos: R, textos: {} };
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1400, height: 900 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = [], warns = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') warns.push(m.text().slice(0, 160)); });
  await p.goto('http://localhost:8765/index.html?wzlocal=1'); await p.waitForTimeout(1500); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2500);
  const med = () => p.evaluate(() => { const f = window.MV5.a.readyU.f[0], g = window.MV5.a.idle.f[3]; return { readyU0: { s4: f.s && +f.s[4].toFixed(2), s5: f.s && +f.s[5].toFixed(2), r: +((f.r || 0) * 180 / Math.PI).toFixed(1) }, idle3: { s5: g.s && +g.s[5].toFixed(2), r: +((g.r || 0) * 180 / Math.PI).toFixed(1) } }; });
  console.log('original:', JSON.stringify(await med()));
  await p.evaluate((c) => { const at = Date.now(); localStorage.setItem('wz_aplicado', JSON.stringify({ cfg: c, at, nome: '' })); localStorage.setItem('wz_rascunho', JSON.stringify({ cfg: c, at, nome: '' })); }, CFG);
  await p.reload(); await p.waitForTimeout(3000);
  console.log('recarregado (jogo):', JSON.stringify(await med()));
  await p.evaluate(() => { choose(volei); start(); }); await p.waitForTimeout(1500);
  console.log('no vôlei:', JSON.stringify(await med()));
  await p.evaluate(() => { pause(); }); await p.waitForTimeout(300);
  await p.keyboard.type('editor'); await p.waitForTimeout(1500);
  console.log('editor aberto:', JSON.stringify(await med()), 'rostos no rascunho:', await p.evaluate(() => Object.keys(WZE.cfg.rostos).length));
  await p.click('#wz nav button >> nth=3'); await p.waitForTimeout(800);
  await p.selectOption('#wz main select >> nth=0', 'readyU'); await p.waitForTimeout(400);
  console.log('campos readyU quadro 1:', await p.$$eval('#wz input[data-k]', (l) => l.map((i) => i.dataset.k + '=' + i.value).join(' ')));
  console.log(warns.slice(0, 8).join('\n') || 'sem avisos'); console.log(errs.join(' | ') || 'sem erros'); await b.close(); })();
