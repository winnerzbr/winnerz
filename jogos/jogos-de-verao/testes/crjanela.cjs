// Corrida na areia (02/11): de que distância dá para pular cada obstáculo sem bater (pé da frente até o início do desenho),
// correndo forte e trotando. 0 = pulou exatamente quando o pé encostou no desenho.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { choose(obstaculos); start(); }); await p.waitForTimeout(2000);
  const r = await p.evaluate(() => {
    const O = obstaculos, out = {};
    for (const k of ['cerca', 'tronco', 'castelo', 'siri']) for (const [nome, v, mode] of [['forte', OB.SPR, 2], ['trote', OB.JOG, 1]]) {
      const ok = [];
      for (let d = -12; d <= 40; d += 1) {
        const rr = { lane: 3, me: false, x: 0, v, st: 1, air: 0, y: 0, tropT: 0, bufT: 0, slipT: 0, done: false, skill: 1, obs: [{ k, m: 0, x: 100, hit: false, ok: false, dx: 0, ph: Math.PI }] };
        O.t = 0; O.L = 1e9; O.fofa = []; let jumped = false;
        for (let n = 0; n < 300 && !rr.obs[0].ok && !rr.obs[0].hit; n++) { const j = !jumped && 100 - (rr.x + OB.FR) <= d; if (j) jumped = true; O.run(rr, 1 / 60, mode, j); rr.v = v; rr.st = 1; }
        if (rr.obs[0].ok) ok.push(d);
      }
      out[k + ' ' + nome] = ok.length ? `de ${Math.min(...ok)} a ${Math.max(...ok)} px antes (${ok.length} px de folga)` : 'nunca';
    }
    return out;
  });
  console.log(r); await b.close();
})();
