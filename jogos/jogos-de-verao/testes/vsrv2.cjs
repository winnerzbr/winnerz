const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  const out = await p.evaluate(() => {
    const pc = { react: .14, err: 4, spd: 1, fwd: .5, block: .4, slip: .015, iq: .9, dive: .5, spike: 0, set: 0, read: 0 }; const R = {};
    for (const L of [0.45, 0.75, 1.02]) {
      OPP.rapida.lvl = L; let sp = 0, tq = 0, bad = 0;
      for (let m = 0; m < 20; m++) {
        volei.two = false; volei.tour = null; volei.copa = null; volei.init(); volei.resetServe(1); const A = { t: 0, tx: 70 }; let t = 0; const c0 = volei.cortadas[1];
        while (volei.hits === 0 && volei.state !== 'point' && t < 12) { const c = volei.brain0(0, DT, A, pc); volei.update(DT, { l: c.l, r: c.r, u: c.u, ax: c.ax, auto: true }); t += DT; }
        if (volei.state === 'point' || volei.b.x > VNX) { let k = 0; while (volei.state === 'rally' && k++ < 200 && volei.b.x > VNX) { volei.update(DT, { auto: true }); } }
        if (volei.cortadas[1] > c0) sp++; else if (volei.hits > 0) tq++; if (volei.state === 'point' && volei.lastW === 0) bad++;
      }
      R['nível ' + L] = { cortada: sp, toque: tq, errou: bad };
    }
    return R;
  });
  console.log(JSON.stringify(out)); await b.close();
})();
