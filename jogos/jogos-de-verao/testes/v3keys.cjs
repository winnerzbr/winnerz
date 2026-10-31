// vôlei 3D pelo teclado: anda nas 4 direções, pula e saca
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }), p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route(/three@0\.160\.0\/build\/three\.min\.js/, (r) => r.fulfill({ path: path.join(__dirname, 'vendor/three-r160.min.js'), contentType: 'text/javascript' }));
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { choose(volei3d); start(); }); await p.waitForTimeout(800);
  const st = () => p.evaluate(() => { const q = volei3d.P[0]; return `x ${q.x.toFixed(1)} z ${q.z.toFixed(1)} y ${q.y.toFixed(2)} estado ${volei3d.state} bola ${volei3d.b.held ? 'na mão' : volei3d.b.y.toFixed(1)}`; });
  console.log('início', await st());
  for (const k of ['ArrowUp', 'ArrowRight', 'ArrowDown']) { await p.keyboard.down(k); await p.waitForTimeout(500); await p.keyboard.up(k); console.log(k, await st()); }
  await p.keyboard.press('KeyC'); await p.waitForTimeout(300); console.log('C (saque)', await st()); await p.waitForTimeout(900); console.log('depois', await st());
  await p.keyboard.press('Space'); await p.waitForTimeout(120); console.log('Espaço', await st());
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
