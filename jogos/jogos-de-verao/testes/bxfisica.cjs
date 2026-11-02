// BMX física nova (02/11): partidas inteiras com três jogadores automáticos.
// "só pedala": segura ✕ o tempo todo. "bom": pedala, ▼ nas descidas e antes da rampa, pulo carregado na ponta da rampa.
// "mortal": o bom + mortal para trás quando o voo vai durar mais de 0,95 s. Mostra saltos, altura, mortais, tombos e pontos.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { choose(bmx); start(); }); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    const B = bmx, res = {};
    const tempoNoAr = () => { let x = B.px, y = B.py, vx = B.vx, vy = B.vy; for (let t = 0; t < 3; t += .02) { vy -= __BXF.G * .02; x += vx * .02; y += vy * .02; if (y - 22 < B.h(x)) return t; } return 3; };
    for (const modo of ['só pedala', 'bom', 'mortal']) {
      const T = { saltos: 0, pico: 0, mortais: 0, tombos: 0, pontos: 0, porque: {}, dist: [], vel: [], alt: [] }; const N = 6;
      for (let g = 0; g < N; g++) {
        B.init(); window.failMsg = (m) => { T.porque[m] = (T.porque[m] || 0) + 1; }; let wasAir = false, segurando = 0; const land0 = B.land; B.land = function () { const d = (this.x - this.tx0) / 10, a = (this.topo - this.ty0) / 10; if (this.airT > .3) { T.dist.push(d); T.alt.push(a); } return land0.call(this); };
        for (let f = 0; f < 3700; f++) {
          const I = { a: 1 }; const c = B.cont[0] || B.cont[1];
          if (modo !== 'só pedala') {
            const lip = B.tr.find((s) => s.lip && s.x1 > B.x && s.x1 - B.x < 70), dist = lip ? lip.x1 - B.x : 1e9;
            if (c && (B.slope(B.x) < -.12 || dist < 60)) I.d = 1;
            if (c && dist < 9 && !B.air) I.pu = 1;
            if (modo === 'mortal' && B.air) { if (!segurando && Math.abs(B.rotSum) < .5 && tempoNoAr() > .95) segurando = 1; if (segurando && B.rotSum > 3 && B.a - Math.atan(B.slope(B.x)) > TAU - .8) segurando = 0; if (segurando) I.l = 1; }
            if (!B.air) segurando = 0;
          }
          if (B.update(1 / 60, I)) break;
          if (B.air && !wasAir) T.saltos++; wasAir = B.air; T.pico = Math.max(T.pico, B.peak || 0); if (f % 30 === 0 && B.crashT <= 0) T.vel.push(Math.hypot(B.vx, B.vy));
        }
        T.mortais += B.flips; T.tombos += B.tombos; T.pontos += B.score; B.land = land0;
      }
      const md = (a) => a.length ? a.reduce((q, v) => q + v, 0) / a.length : 0, mx = (a) => a.length ? Math.max(...a) : 0, vs = T.vel.slice().sort((a, b) => a - b);
      res[modo] = `velocidade ${vs[Math.floor(vs.length * .1)].toFixed(0)}–${vs[Math.floor(vs.length * .5)].toFixed(0)}–${vs[Math.floor(vs.length * .9)].toFixed(0)} · saltos ${md(T.dist).toFixed(0)} m (máx ${mx(T.dist).toFixed(0)}) altura ${md(T.alt).toFixed(1)} m (máx ${mx(T.alt).toFixed(0)}) · ${(T.saltos / N).toFixed(0)} saltos · pico ${T.pico.toFixed(0)} · ${(T.mortais / N).toFixed(1)} mortais · ${(T.tombos / N).toFixed(1)} tombos · ${(T.pontos / N).toFixed(0)} pontos (média de ${N}) · ${JSON.stringify(T.porque)}`;
    }
    return JSON.stringify(res, null, 1);
  });
  console.log(r); console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
