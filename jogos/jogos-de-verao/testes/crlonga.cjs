// Corrida na areia mais longa (02/11): várias partidas no automático; tempo de cada bateria, obstáculos, menor espaço entre eles,
// tropeços e pontos (para as medalhas).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { choose(obstaculos); start(); }); await p.waitForTimeout(2500);
  for (const jeito of ['bom', 'trota']) for (let jogo = 0; jogo < 4; jogo++) {
    const r = await p.evaluate((jeito) => {
      const O = obstaculos; O.init(); let fim = false, n = 0; const info = [];
      let bat = -1;
      while (!fim && n < 60 * 200) {
        if (O.bat !== bat) { bat = O.bat; const ms = O.me().obs.map((o) => o.m); const gaps = ms.slice(1).map((m, j) => m - ms[j]); info.push({ L: OB_LEN[bat], n: ms.length, min: Math.min(...gaps).toFixed(1), fofa: O.fofa.length }); }
        const me = O.me(); let pula = false;
        for (const o of me.obs) { if (o.ok || o.hit || o.k === 'poca') continue; const d = o.x + o.dx - me.x; if (d > 0 && d < me.v * OB.PXM * .2 + 2) pula = true; break; }
        let poca = me.obs.some((o) => o.k === 'poca' && !o.ok && o.x - me.x < 14 * OB.PXM / 8 * 8 && o.x - me.x > -22);
        const forte = jeito === 'bom' ? (me.st > .35 || (O.L - me.x) / OB.PXM < 30) && !poca : false;
        fim = O.update(1 / 60, { r: forte, pa: pula }); n++;
      }
      return { info, res: O.res.map((x) => `${x.pos + 1}º ${x.time.toFixed(1)}s`).join(' · '), pts: O.score, tropecos: O.tropecos };
    }, jeito);
    console.log(jeito, r.res, '| pontos', r.pts, '| tropeços', r.tropecos, '|', r.info.map((x) => `${x.L} m: ${x.n} obst, menor ${x.min} m, ${x.fofa} fofa`).join(' · '));
  }
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
