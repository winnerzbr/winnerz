const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }), pg = await (await b.newContext({ viewport: { width: 1360, height: 980 } })).newPage();
  await pg.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('file://' + path.join(__dirname, 'volei2.html')); await pg.waitForTimeout(900);
  await pg.click('#b-play'); await pg.waitForTimeout(1200);
  const L = [
    ['parado', 0, {}], ['correndo', 0, { ph: 0, vx: 120 }], ['correndo', 0, { ph: 1.2, vx: 120 }], ['correndo', 0, { ph: 2.4, vx: 120 }], ['correndo', 0, { ph: 3.6, vx: 120 }], ['correndo', 0, { ph: 4.8, vx: 120 }],
    ['correndo', 0, { ph: 1.2, vx: -120 }], ['pulo', 0, { vy: -250, g: false }], ['pulo', 0, { vy: 250, g: false }], ['aterrissagem', 0, {}], ['saque', 1, { held: 1 }], ['toque', 0, { hitA: .2 }],
    ['batida', 0, { hitA: .2 }], ['cortada', 0, { sw: .1, g: false }], ['cortada', 0, { sw: .5, g: false }], ['cortada', 0, { sw: .9, g: false }], ['peixinho', 1, { dv: 1, g: false }], ['comemora', 0, {}], ['triste', 0, {}], ['correndo', 0, { ph: 2.4, vx: 120, face: -1 }],
  ];
  await pg.evaluate(() => { const c = document.createElement('canvas'); c.width = 10 * 200; c.height = 2 * 230; window.__g = c; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); window.__verao.speed = 0; });
  for (let k = 0; k < L.length; k++) {
    await pg.evaluate(([an, fr, o, k]) => {
      const v = volei, a = v.P[0]; v.state = 'rally'; v.held = !!o.held; v.server = 0; v.cheer = 0;
      Object.assign(a, { x: 120, y: VGY - (o.g === false ? 20 : 0), vx: o.vx || 0, vy: o.vy || 0, g: o.g !== false, ph: o.ph || 0, sq: 0, hitA: o.hitA || 0, dv: o.dv ? { t: .3, dir: o.face || 1 } : null, sw: o.sw !== undefined ? { t: swingT(false, .7) * o.sw, gnd: false, pow: .7, hit: false } : null, ch: 0, landT: 0 });
      if (o.face === -1) a.x = 140;
      window.vAnim = () => [an, fr, 0, null];
    }, [...L[k], k]);
    for (let q = 0; q < 20; q++) await pg.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    await pg.evaluate(([an, fr, o, k]) => { const a = volei.P[0];
      const cv = document.getElementById('screen'), K = cv.width / W, g = window.__g.getContext('2d');
      g.drawImage(cv, (a.x - 45) * K, (a.y - 80) * K, 90 * K, 100 * K, (k % 10) * 200, Math.floor(k / 10) * 230, 196, 218);
      g.fillStyle = '#000'; g.font = '13px sans-serif'; g.fillText(an + ' ' + JSON.stringify(o).slice(0, 22), (k % 10) * 200 + 3, Math.floor(k / 10) * 230 + 228);
    }, [...L[k], k]);
  }
  const d = await pg.evaluate(() => window.__g.toDataURL('image/png'));
  fs.writeFileSync(path.join(__dirname, '..', 'ashots', 'p3_poses.png'), Buffer.from(d.split(',')[1], 'base64'));
  console.log(errs.length ? errs.slice(0, 5) : 'sem erros', await pg.evaluate(() => typeof INTEIRO));
  await b.close();
})();
