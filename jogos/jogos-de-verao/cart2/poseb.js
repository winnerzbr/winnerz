const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch(), pg = await (await b.newContext({ viewport: { width: 1360, height: 980 } })).newPage();
  await pg.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('file://' + path.join(__dirname, '..', 'jogos_verao', 'index.html')); await pg.waitForTimeout(900);
  await pg.evaluate(() => choose(volei)); await pg.waitForTimeout(300); await pg.click('#b-play'); await pg.waitForTimeout(1500);
  const L = [
    ['parado', {}], ['ready', { rally: 1 }], ['run', { ph: 0, vx: 128 }], ['run', { ph: 2, vx: 128 }], ['run', { ph: 4, vx: 128 }], ['back', { ph: 2, vx: -100 }],
    ['jump up', { g: false, vy: -250 }], ['jump top', { g: false, vy: 0 }], ['jump down', { g: false, vy: 200 }], ['land', { lt: .08 }],
    ['set', { hitA: .27, hk: 'set' }], ['bump', { hitA: .27, hk: 'bump' }], ['set end', { hitA: .05, hk: 'set' }],
    ['serve hold', { held: 1 }], ['serve charge', { held: 1, charging: 1 }], ['toss', { toss: .2 }],
    ['spk ch', { g: false, ch: .3 }], ['spk swing', { g: false, sw: .3 }], ['spk hit', { g: false, sw: .5, hit: 1 }], ['gnd ch', { ch: .3 }],
    ['gnd hit', { sw: .5, hit: 1 }], ['dive air', { dv: { t: .15 }, g: false, vy: 0 }], ['dive slide', { dv: { t: .4 }, vx: 80 }], ['getup', { dv: { t: .5, rest: .4 } }],
    ['spec', { spec: 1, g: false }], ['comemora', { win: 0 }], ['triste', { win: 1, st: .4 }], ['triste loop', { win: 1, st: 1.2 }],
  ];
  await pg.evaluate(() => { const c = document.createElement('canvas'); c.width = 10 * 200; c.height = 3 * 230; window.__g = c; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); window.__verao.speed = 0; });
  for (let k = 0; k < L.length; k++) {
    await pg.evaluate(([nm, o]) => {
      const v = volei, a = v.P[1]; v.state = o.rally ? 'rally' : (o.win !== undefined ? 'point' : (o.held || o.toss !== undefined ? 'serve' : 'rally')); v.lastW = o.win === undefined ? null : 1 - o.win; v.st = o.st ?? .5; v.cheer = o.win === 0 ? 1 : 0;
      v.held = !!o.held; v.charging = !!o.charging; v.charge = o.charging ? .5 : 0; v.server = 1; v.hits = 0; v.tossT = o.toss ?? 9;
      if (o.toss !== undefined) { v.state = 'rally'; v.held = false; }
      Object.assign(a, { x: 290, y: VGY - (o.g === false ? 30 : 0), vx: o.vx || 0, vy: o.vy || 0, g: o.g !== false, ph: o.ph || 0, sq: 0, hitA: o.hitA || 0, hitF: false, spec: !!o.spec,
        dv: o.dv ? { dir: -1, ...o.dv } : null, ch: o.ch !== undefined ? { t: o.ch } : null, sw: o.sw !== undefined ? { t: swingT(o.g === false ? false : true, .7) * o.sw, gnd: o.g !== false, pow: .7, hit: !!o.hit } : null, landT: 0 });
      Object.assign(v.b, { x: 60, y: 60, vx: 0, vy: 0 });
      const s = (window.__st5 = window.__st5 || 0);
    }, L[k]);
    for (let q = 0; q < 12; q++) await pg.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    await pg.evaluate(([nm, k]) => { const a = volei.P[1];
      const cv = document.getElementById('screen'), K = cv.width / W, g = window.__g.getContext('2d');
      g.drawImage(cv, (a.x - 45) * K, (a.y - 75) * K, 90 * K, 95 * K, (k % 10) * 200, Math.floor(k / 10) * 230, 196, 207);
      g.fillStyle = '#000'; g.font = '13px sans-serif'; g.fillText(nm, (k % 10) * 200 + 3, Math.floor(k / 10) * 230 + 224);
    }, [L[k][0], k]);
  }
  const d = await pg.evaluate(() => window.__g.toDataURL('image/png'));
  fs.writeFileSync(path.join(__dirname, '..', 'ashots', 'pb_poses.png'), Buffer.from(d.split(',')[1], 'base64'));
  console.log(errs.length ? errs.slice(0, 5) : 'sem erros', await pg.evaluate(() => [cv.width, cv.height]));
  await b.close();
})();
