const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  const Ls = JSON.parse(process.argv[2] || '[0,0.25,0.5,0.75,1]'), moodMode = process.argv[3] || 'off';
  const out = await p.evaluate(([Ls, moodMode, PSP]) => {
    const pc = { react: .14, err: 4, spd: 1, fwd: .5, block: .4, slip: .015, iq: .9, dive: .5, spike: PSP, set: 0, read: 0 };
    const res = {};
    for (const L of Ls) {
      OPP.rapida.lvl = L; let w = 0, n = 20, pts = 0, ms = 0, spk = 0;
      for (let m = 0; m < n; m++) {
        volei.two = false; volei.tour = null; volei.copa = null; volei.init(); volei.moody = moodMode === 'on'; const A = { t: 0, tx: 70 }; let t = 0;
        OPP.rapida.pts = 7;
        while (volei.state !== 'over' && t < 900) { const c = volei.brain(0, DT, A, pc); volei.update(DT, { l: c.l, r: c.r, u: c.u, a: false, ax: c.ax, pd: c.d, d: c.d, pc: c.sp, auto: true }); spk += c.sp ? 1 : 0; t += DT; }
        if (volei.sc[0] > volei.sc[1]) w++; pts += volei.sc[0]; ms += volei.mood;
      }
      res["nível " + L] = `${w}/${n} vitórias · ${(pts / n).toFixed(1)} pts · cortadas jogador ${spk} · IA ${volei.cortadas[1]} (última partida)`;
    }
    return res;
  }, [Ls, moodMode, +(process.env.PSP || 0)]);
  console.log(moodMode, JSON.stringify(out, null, 1), errs.slice(0, 3)); await b.close();
})();
