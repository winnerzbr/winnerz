const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  const V = JSON.parse(process.argv[2]), N = +(process.argv[3] || 12), L = +(process.argv[4] || 1.02);
  const out = await p.evaluate(([V, N, L]) => {
    const pc = { react: .14, err: 4, spd: 1, fwd: .5, block: .4, slip: .015, iq: .9, dive: .5, spike: 0, set: 0, read: 0 };
    const src0 = volei.brain.toString(), res = {};
    const oT = volei.touch.bind(volei), oP = volei.point.bind(volei);
    for (const v of V) {
      let src = src0;
      for (const [a, bb] of v.rep || []) { if (!src.includes(a)) return 'falta: ' + a; src = src.split(a).join(bb); }
      const br = (0, eval)('({' + src + '})').brain, br0 = (0, eval)('({' + src0 + '})').brain;
      volei.brain = br;
      OPP.rapida.lvl = L; OPP.rapida.pts = 7;
      let w = 0, own = 0, four = 0, win = 0, myErr = 0, tAI = 0, last = -1, aiWin = 0, spk = 0;
      volei.touch = function (i) { last = i; if (i === 1) tAI++; oT(i); };
      volei.point = function (wn, why) { if (why.startsWith('4 toques')) { if (wn === 0) four++; } else if (wn === 0) { if (last === 1) own++; else win++; } else if (last === 0) myErr++; else aiWin++; oP(wn, why); };
      for (let m = 0; m < N; m++) {
        volei.two = false; volei.tour = null; volei.copa = null; volei.init(); volei.moody = false; const A = { t: 0, tx: 70 }; let t = 0;
        while (volei.state !== 'over' && t < 900) { const c = br0.call(volei, 0, DT, A, pc); volei.update(DT, { l: c.l, r: c.r, u: c.u, a: false, ax: c.ax, pd: c.d, d: c.d, pc: c.sp, auto: true }); t += DT; }
        if (volei.sc[0] > volei.sc[1]) w++; spk += volei.cortadas[1];
      }
      res[v.n] = `jogador ${w}/${N} · erros da IA ${((own + four) / N).toFixed(1)}/partida (4 toques ${(four / N).toFixed(1)}) · pontos seus ${(win / N).toFixed(1)} · seus erros ${(myErr / N).toFixed(1)} · erro/toque IA ${((own + four) / tAI * 100).toFixed(1)}% · cortadas IA ${(spk / N).toFixed(1)} · pontos diretos IA ${(aiWin / N).toFixed(1)}`;
    }
    volei.touch = oT; volei.point = oP;
    return res;
  }, [V, N, L]);
  console.log(JSON.stringify(out, null, 1)); await b.close();
})();
