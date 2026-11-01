// vôlei: no nível máximo ("impossível") o Amiguinho não perde ponto. O jogador é o cérebro antigo no melhor nível.
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage(); await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  const N = +(process.argv[2] || 6);
  const out = await p.evaluate((N) => {
    const res = {}, oP = volei.point.bind(volei);
    for (const L of [1.02, VOLEI_IMP]) {
      let ptsJog = 0, ptsAI = 0, vit = 0, por = {}, salvas = 0, tempo = 0;
      volei.point = function (w, why) { const a = volei.sc[0]; oP(w, why); if (volei.sc[0] > a) por[why] = (por[why] || 0) + 1; };
      for (let m = 0; m < N; m++) {
        OPP.rapida.lvl = L; OPP.rapida.pts = 7; volei.two = false; volei.tour = null; volei.copa = null; volei.init(); volei.saves1 = 0;
        const A = { t: 0, tx: 70 }, pc = lvlCfg(1.08); let t = 0;
        while (volei.state !== 'over' && t < 900) { const c = volei.brain0.call(volei, 0, DT, A, pc); volei.update(DT, { l: c.l, r: c.r, u: c.u, a: false, ax: c.ax, pd: c.d, d: c.d, pc: c.sp, auto: true }); t += DT; }
        if (volei.sc[0] > volei.sc[1]) vit++; ptsJog += volei.sc[0]; ptsAI += volei.sc[1]; salvas += volei.saves1 || 0; tempo += t;
      }
      res[L] = { vitoriasJogador: `${vit}/${N}`, pontosJogador: ptsJog, pontosAmiguinho: ptsAI, comoJogadorPontuou: por, salvasNoUltimoInstante: salvas, segPorPartida: Math.round(tempo / N), nome: tierOf(L) };
    }
    volei.point = oP; OPP.rapida.lvl = .45; return res;
  }, N);
  console.log(JSON.stringify(out, null, 1)); console.log(errs.join(' | ') || 'sem erros'); await b.close(); })();
