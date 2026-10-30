const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  const Ls = JSON.parse(process.argv[2] || '[0.05,0.45,0.75,1.02]'), N = +(process.argv[3] || 12), PL = process.argv[4] || 'bot';
  const out = await p.evaluate(([Ls, N, PL]) => {
    const pc = PL === 'forte' ? { react: .08, err: 2, spd: 1.05, fwd: .6, block: .5, slip: .008, iq: 1, dive: .7, spike: .6, set: .3, read: .5 } : { react: .14, err: 4, spd: 1, fwd: .5, block: .4, slip: .015, iq: .9, dive: .5, spike: 0, set: 0, read: 0 };
    const res = {}; const oT = volei.touch.bind(volei), oP = volei.point.bind(volei);
    for (const L of Ls) {
      OPP.rapida.lvl = L; OPP.rapida.pts = 7;
      let w = 0, own = 0, four = 0, win = 0, myErr = 0, tAI = 0, last = -1, spk = 0, dv = 0, ace = 0, pts = 0, ms = 0, t0 = performance.now(), tsim = 0;
      volei.touch = function (i) { last = i; if (i === 1) tAI++; oT(i); };
      volei.point = function (wn, why) { if (why.startsWith('4 toques')) { if (wn === 0) four++; } else if (wn === 0) { if (last === 1) own++; else win++; } else if (last === 0) myErr++; if (wn === 1 && this.hits <= 1 && this.server === 1) ace++; oP(wn, why); };
      for (let m = 0; m < N; m++) {
        volei.two = false; volei.tour = null; volei.copa = null; volei.init(); const A = { t: 0, tx: 70 }; let t = 0;
        while (volei.state !== 'over' && t < 900) { const c = volei.brain0(0, DT, A, pc); volei.update(DT, { l: c.l, r: c.r, u: c.u, a: false, ax: c.ax, pd: c.d, d: c.d, pc: c.sp, auto: true }); t += DT; }
        if (volei.sc[0] > volei.sc[1]) w++; spk += volei.cortadas[1]; dv += volei.peixes[1]; pts += volei.sc[0]; ms += t;
      }
      res['nível ' + L] = `você ${w}/${N} (${(pts / N).toFixed(1)} pts) · erros IA ${((own + four) / N).toFixed(1)}/partida (${((own + four) / tAI * 100).toFixed(1)}%/toque) · cortadas IA ${(spk / N).toFixed(1)} · peixinhos ${(dv / N).toFixed(1)} · saques diretos ${(ace / N).toFixed(1)} · seus pontos ${(win / N).toFixed(1)} · seus erros ${(myErr / N).toFixed(1)} · ${(ms / N).toFixed(0)} s/partida · cálculo ${((performance.now() - t0) / (ms) ).toFixed(2)} ms por s de jogo`;
    }
    volei.touch = oT; volei.point = oP; return res;
  }, [Ls, N, PL]);
  console.log(JSON.stringify(out, null, 1), errs.slice(0, 3)); await b.close();
})();
