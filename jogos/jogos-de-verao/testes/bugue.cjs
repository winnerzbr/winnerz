// corrida de bugue: corridas com o jogador no piloto automático (mesmo cérebro dos Amiguinhos, com força escolhida) e fotos
const { chromium } = require('playwright');
const N = Number(process.argv[2] || 3);
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  const out = await p.evaluate((N) => {
    const ev = bugue, o = [];
    for (const [nm, sk] of [['bom', 1.0], ['médio', .94], ['fraco', .86]]) {
      const pos = [], tm = []; let hits = 0, gave = 0, tb = 0;
      for (let m = 0; m < N; m++) {
        ev.init(); const me = ev.me; me.ai.skill = sk; let t = 0;
        ev.ctlOf = function () { return this.aiCtl(this.me, DT); };
        const orig = ev.drive; while (t < 240) { if (ev.update(DT, { a: ev.race > -.3 })) break; t += DT; }
        pos.push(ev.rank); tm.push(ev.race.toFixed(0)); hits += ev.levou; gave += ev.acertos; tb += ev.turbos;
        delete ev.ctlOf;
      }
      o.push(`${nm}: posições ${pos.join(', ')} · tempos ${tm.join(', ')} s · acertado ${hits} · acertou ${gave} · turbos ${tb}`);
    }
    // o jogador automático usa vmax de Amiguinho; confere também a ordem dos Amiguinhos
    return o;
  }, N);
  console.log(out.join('\n'));
  await p.evaluate(() => { choose(bugue); start(); bugue.ctlOf = function () { return this.aiCtl(this.me, DT); }; });
  for (let i = 0; i < 6; i++) { await p.waitForTimeout(i ? 1500 : 4200); await p.locator('canvas').first().screenshot({ path: `amg/bg_${i}.png` }); }
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
