// embaixadinha pintada: o IAmiguinho das pranchas novas em cada situação (fotos) e uma partida no piloto automático sem erros
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { choose(embaixadinha); start(); }); await p.waitForTimeout(1500);
  console.log('pranchas pintadas carregadas:', await p.evaluate(() => window.__EBOK && window.__EBOK()));
  const cv = p.locator('canvas').first(), shots = [];
  const cena = async (nome, fn, espera = 120) => { await p.evaluate(fn); await p.waitForTimeout(espera); await cv.screenshot({ path: `amg/ebp_${nome}.png` }); shots.push(nome); };
  await p.evaluate(() => { const e = embaixadinha; e._up = e.update; e.update = function () { return false; }; });
  await cena('saque', () => { const e = embaixadinha; e.balls[0].serve = 2; });
  await cena('olhando', () => { const e = embaixadinha, bl = e.balls[0]; Object.assign(bl, { serve: 0, x: e.px + 8, y: 40, vy: 0 }); });
  for (const [nome, pose, zi] of [['pe', 'kickR', 2], ['coxa', 'knee', 1], ['cabeca', 'air', 0], ['firula', 'firula', 1]]) {
    await cena(nome, `(() => { const e = embaixadinha, bl = e.balls[0]; e.poseT = 0; })()`, 40);
    await cena(nome, `(() => { const e = embaixadinha, bl = e.balls[0], z = EB_ZONAS[${zi}]; Object.assign(bl, { serve: 0, x: e.px + 6 * e.face, y: z.y, vy: -100 }); e.pose = '${pose}'; e.poseT = .22; })()`, 60);
  }
  await cena('andando', () => { const e = embaixadinha; e.poseT = 0; e.walk = .3; });
  await cena('caiu', () => { const e = embaixadinha; e.walk = 0; e.dropT = .9; });
  await cena('fim', () => { const e = embaixadinha; e.vidas = 0; e.dropT = 1.3; });
  await p.evaluate(() => { const e = embaixadinha; e.update = e._up; });
  console.log('fotos:', shots.join(', '), '|', errs.join(' | ') || 'sem erros'); await b.close(); })();
