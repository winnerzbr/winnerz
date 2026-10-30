const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  const out = await p.evaluate(() => {
    const pc = { react: .14, err: 4, spd: 1, fwd: .5, block: .4, slip: .015, iq: .9, dive: .5, spike: 0, set: 0, read: 0 }; const R = {};
    for (const L of [0.05, 0.45, 0.75, 1.02]) {
      OPP.rapida.lvl = L; const S = { cortada: 0, toque: 0, falhou: 0, passou: 0, ponto: 0 };
      for (let m = 0; m < 6; m++) {
        volei.two = false; volei.tour = null; volei.copa = null; volei.init(); const A = { t: 0, tx: 70 }; let t = 0, cur = null;
        while (volei.state !== 'over' && t < 900) {
          const st = volei.state, hits = volei.hits, srv = volei.server;
          const c = volei.brain0(0, DT, A, pc); volei.update(DT, { l: c.l, r: c.r, u: c.u, a: false, ax: c.ax, pd: c.d, d: c.d, pc: c.sp, auto: true }); t += DT;
          if (srv === 1 && hits === 0 && volei.hits === 1) { cur = volei.cortadas[1] > (cur?.c ?? volei.cortadas[1] - 1) ? 'cortada' : 'toque'; S[cur]++; }
          if (srv === 1 && st === 'rally' && volei.state === 'point') { if (volei.hits === 0) S.falhou++; else if (volei.hits === 1) { if (volei.lastW === 1) S.ponto++; else S.falhou++; } }
          if (volei.state === 'serve') cur = { c: volei.cortadas[1] };
        }
      }
      R['nível ' + L] = S;
    }
    return R;
  });
  console.log(JSON.stringify(out)); await b.close();
})();
