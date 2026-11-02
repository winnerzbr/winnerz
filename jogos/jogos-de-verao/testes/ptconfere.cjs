// Patins (01/11): a conferência do sorteio atrasa ou tira padrões sem saída (dois casos impossíveis de propósito).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { choose(patins); start(); }); await p.waitForTimeout(2500);
  console.log(await p.evaluate(() => { const P = patins, res = [];
    const caso = (nome, mkVelhos, mkNovos) => {
      P.init(); P.t = 20; P.v = 150; P.nextArr = 1e9; P.inv = 0; P.ptAtrasos = 0; P.ptTirados = 0; const px = P.d + PPX, v = P.v;
      P.obs = mkVelhos(px, v); const n0 = P.obs.length; P.obs.push(...mkNovos(px, v));
      const antes = !!window.__ptBusca(P, P.obs), r = window.__ptConfere(P, n0), depois = !!window.__ptBusca(P, P.obs);
      // e jogando de verdade com o jogador que decide a cada 0,1 s
      let op = {}; for (let f = 0; f < 300; f++) { if (f % 6 === 0) { const q = window.__ptBusca(P, P.obs); op = q ? q.op : {}; } P.update(1 / 60, { pu: op.pula && f % 6 === 0, u: op.pula, d: op.d }); if (f % 6 === 0) op = { d: op.d }; }
      res.push(`${nome}: saída antes ${antes} · conferência ${r < 0 ? 'tirou o padrão novo' : 'atrasou ' + r.toFixed(2) + ' s'} · saída depois ${depois} · tombos jogando ${P.bumps}`);
    };
    caso('buraco longo + bola no meio dele', (px, v) => [{ k: 'buraco', x: px + v * 1.3, w: 100, v0: v }], (px, v) => [{ k: 'bola', x: px + (v + 75) * 1.45, y: PGY - 44, v0: v }]);
    caso('buraco mais largo que o pulo', (px, v) => [], (px, v) => [{ k: 'buraco', x: px + v * 1.3, w: 130, v0: v }]);
    return res.join('\n');
  }));
  await b.close();
})();
