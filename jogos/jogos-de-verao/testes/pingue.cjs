// pingue-pongue: jogadores automáticos (o mesmo cérebro do Amiguinho, com acerto escolhido) contra o Amiguinho.
// Mostra vitórias, pontos, maior troca, como os pontos acabam e a qualidade média das batidas. Salva fotos de uma troca em amg/.
const { chromium } = require('playwright');
const N = Number(process.argv[2] || 6);
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  const sim = await p.evaluate((N) => {
    const out = [], ev = pingue, why = {}, kinds = {};
    const pt0 = ev.point.bind(ev); let RH = [0, 0]; ev.point = function (w, y) { if (this.state === 'rally') { RH[0] += this.hits; RH[1]++; const k = `${w === this.b.last ? 'ganhou quem bateu' : 'errou quem bateu'}: ${y}`; why[k] = (why[k] || 0) + 1; } return pt0(w, y); };
    const h0 = ev.hit.bind(ev); let qs = [0, 0, 0, 0]; ev.hit = function (i, d, s) { const k = this.P[i].arm.kind; kinds[k] = (kinds[k] || 0) + 1; h0(i, d, s); qs[i * 2] += this.P[i].lastQ; qs[i * 2 + 1]++; };
    for (const [nm, skill] of [['muito bom', .92], ['bom', .8], ['médio', .65], ['fraco', .45]]) {
      RH = [0, 0]; let wins = 0, pts = [0, 0], longest = 0, hitsT = 0, rallies = 0; qs = [0, 0, 0, 0];
      for (let m = 0; m < N; m++) {
        ev.two = false; ev.init(); ev.P[0].qMul = .8 + .25 * skill; let t = 0;
        ev.controls = function (I, dt) { return [this.brain(0, dt, skill), this.brain(1, dt, this.accNow())]; };
        while (t < 1200) { if (ev.update(DT, {})) break; t += DT; }
        if (ev.sc[0] > ev.sc[1]) wins++; pts[0] += ev.sc[0]; pts[1] += ev.sc[1]; longest = Math.max(longest, ev.longest);
      }
      out.push(`${nm}: venceu ${wins}/${N} · pontos ${pts[0]} x ${pts[1]} · maior troca ${longest} · troca média ${(RH[0] / RH[1]).toFixed(1)} · qualidade ${(qs[0] / qs[1]).toFixed(2)} x ${(qs[2] / qs[3]).toFixed(2)}`);
    }
    delete ev.controls; ev.point = pt0; ev.hit = h0;
    out.push(Object.entries(why).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join('\n'));
    out.push(JSON.stringify(kinds));
    return out;
  }, N);
  console.log(sim.join('\n'));
  await p.evaluate(() => { choose(pingue); start(); const ev = pingue; ev.controls = function (I, dt) { return [this.brain(0, dt, .85), this.brain(1, dt, this.accNow())]; }; });
  await p.waitForTimeout(1200);
  for (let i = 0; i < 12; i++) { await p.waitForTimeout(150); await p.locator('canvas').first().screenshot({ path: `amg/pr_${i}.png` }); }
  await p.evaluate(() => { delete pingue.controls; });
  console.log(errs.join(' | ') || 'ok'); await b.close();
})();
