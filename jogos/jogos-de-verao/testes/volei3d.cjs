// vôlei 3D: fotos de uma troca (jogador automático contra o Amiguinho) e partidas simuladas por nível
const { chromium } = require('playwright');
const path = require('path');
const N = Number(process.argv[2] || 4);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }), p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route(/three@0\.160\.0\/build\/three\.min\.js/, (r) => r.fulfill({ path: path.join(__dirname, 'vendor/three-r160.min.js'), contentType: 'text/javascript' }));
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  const sim = await p.evaluate((N) => {
    const ev = volei3d, o = [], why = {}; const p0 = ev.point.bind(ev); ev.point = function (w, y) { if (this.state !== 'point') why[y] = (why[y] || 0) + 1; return p0(w, y); };
    for (const [nm, sk] of [['muito bom', .92], ['médio', .75], ['fraco', .55]]) {
      let wins = 0, pts = [0, 0], rally = 0, nr = 0, cort = 0;
      for (let m = 0; m < N; m++) {
        ev.init(); ev.botAcc = sk; let t = 0;
        ev.inputHuman = function () { const c = this.brain(DT, 0, sk); return { ix: c.ix, iz: c.iz, jumpP: c.jumpP, diveP: c.diveP, spikeP: c.spikeP, serve: c.serve }; };
        const h0 = ev.hits; while (t < 600) { if (ev.update(DT, {})) break; t += DT; }
        if (ev.sc[0] > ev.sc[1]) wins++; pts[0] += ev.sc[0]; pts[1] += ev.sc[1]; rally += ev.longest; cort += ev.cortadas;
        delete ev.inputHuman; delete ev.botAcc;
      }
      o.push(`${nm}: venceu ${wins}/${N} · pontos ${pts[0]} x ${pts[1]} · maior troca média ${(rally / N).toFixed(1)} toques · cortadas ${(cort / N).toFixed(1)}`);
    }
    ev.point = p0; o.push(JSON.stringify(why)); return o;
  }, N);
  console.log(sim.join('\n'));
  await p.evaluate(() => { choose(volei3d); start(); volei3d.botAcc = .85; volei3d.inputHuman = function () { const c = this.brain(DT, 0, .85); return { ix: c.ix, iz: c.iz, jumpP: c.jumpP, diveP: c.diveP, spikeP: c.spikeP, serve: c.serve }; }; });
  for (let i = 0; i < 9; i++) { await p.waitForTimeout(700); await p.locator('canvas').first().screenshot({ path: `amg/v3_${i}.png` }); }
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
