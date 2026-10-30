const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  const out = await p.evaluate(() => {
    const pc = { react: .14, err: 4, spd: 1, fwd: .5, block: .4, slip: .015, iq: .9, dive: .5, spike: 0, set: 0, read: 0 };
    OPP.rapida.lvl = 1.02; OPP.rapida.pts = 7;
    const oT = volei.touch.bind(volei), oP = volei.point.bind(volei); let rec = null, last = -1; const E = {}; const inc = (k) => E[k] = (E[k] || 0) + 1;
    volei.touch = function (i) { last = i; if (i === 1) { const P = this.P[1], A = this.ai; rec = `${P.sw ? 'cortada' : P.dv ? 'peixinho' : 'toque'} plano=${A.plan ? A.plan.k : '-'} bom=${A.good} toque#${this.touches[1] + 1} ${this.hits === 0 ? 'SAQUE' : ''}`; } oT(i); };
    volei.point = function (wn, why) {
      if (wn === 0) { if (why.startsWith('4')) inc('4 toques: ' + rec); else if (last === 1) inc('erro: ' + rec); else { const A = this.ai, P = this.P[1]; inc(`não tocou: plano=${A.plan ? A.plan.k : '-'} bom=${A.good} peixe=${A.diveOK} dist=${Math.round(Math.abs(this.b.x - P.x) / 10) * 10}`); } }
      oP(wn, why);
    };
    for (let m = 0; m < 10; m++) {
      volei.two = false; volei.tour = null; volei.copa = null; volei.init(); const A = { t: 0, tx: 70 }; let t = 0;
      while (volei.state !== 'over' && t < 900) { const c = volei.brain0(0, DT, A, pc); volei.update(DT, { l: c.l, r: c.r, u: c.u, a: false, ax: c.ax, pd: c.d, d: c.d, pc: c.sp, auto: true }); t += DT; }
    }
    volei.touch = oT; volei.point = oP; return Object.entries(E).sort((a, b) => b[1] - a[1]);
  });
  for (const e of out) console.log(e[1], e[0]); await b.close();
})();
