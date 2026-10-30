const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  const Ls = JSON.parse(process.argv[2] || '[0.75,1.02]'), N = +(process.argv[3] || 16);
  const out = await p.evaluate(([Ls, N]) => {
    const pc = { react: .14, err: 4, spd: 1, fwd: .5, block: .4, slip: .015, iq: .9, dive: .5, spike: 0, set: 0, read: 0 };
    const res = {};
    const oT = volei.touch.bind(volei), oP = volei.point.bind(volei);
    for (const L of Ls) {
      OPP.rapida.lvl = L; OPP.rapida.pts = 7; let w = 0; const C = {};
      const inc = (k) => C[k] = (C[k] || 0) + 1;
      let last = -1, lastKind = '';
      volei.touch = function (i) { last = i; const P = this.P[i]; lastKind = P.sw ? (P.sw.gnd ? 'cortada chão' : 'cortada') : P.dv ? 'peixinho' : (!P.g ? 'pulo' : 'chão'); if (this.special) lastKind = 'especial'; oT(i); };
      volei.point = function (wn, why) {
        const bx = this.b.x, side = bx < VNX ? 0 : 1;
        if (why.startsWith('4 toques')) inc((wn === 0 ? 'IA perdeu' : 'IA ganhou') + ': 4 toques');
        else if (wn === 0) inc(last === 1 ? `IA perdeu: erro próprio (${lastKind}, toques ${this.touches[1]})` : `IA perdeu: não alcançou (${lastKind} seu)`);
        else inc(last === 0 ? `IA ganhou: seu erro próprio` : `IA ganhou: ponto dela (${lastKind})`);
        oP(wn, why);
      };
      for (let m = 0; m < N; m++) {
        volei.two = false; volei.tour = null; volei.copa = null; volei.init(); volei.moody = false; const A = { t: 0, tx: 70 }; let t = 0; last = -1;
        while (volei.state !== 'over' && t < 900) { const c = volei.brain(0, DT, A, pc); volei.update(DT, { l: c.l, r: c.r, u: c.u, a: false, ax: c.ax, pd: c.d, d: c.d, pc: c.sp, auto: true }); t += DT; }
        if (volei.sc[0] > volei.sc[1]) w++;
      }
      res['nível ' + L] = { vitorias_jogador: `${w}/${N}`, ...Object.fromEntries(Object.entries(C).sort((a, b) => b[1] - a[1])) };
    }
    volei.touch = oT; volei.point = oP;
    return res;
  }, [Ls, N]);
  console.log(JSON.stringify(out, null, 1)); await b.close();
})();
