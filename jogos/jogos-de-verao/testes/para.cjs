// paraquedismo: jogador automático em 3 níveis (formação, abertura, pouso) para calibrar as medalhas, e fotos das 3 partes
const { chromium } = require('playwright');
const N = Number(process.argv[2] || 4);
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  const out = await p.evaluate((N) => {
    const ev = paraquedas, o = [];
    const bot = (sk, A) => {
      const I = { ax: 0, ay: 0, u: false, d: false, pa: false };
      if (ev.phase === 'livre' || ev.phase === 'abrir') {
        const P = ev.P, free = ev.A.filter((a) => !a.linked);
        let tx = W / 2, ty = H / 2;
        if (free.length && ev.phase === 'livre') { const t = free.reduce((m, a) => (Math.hypot(a.x - P.x, a.y - P.y) < Math.hypot(m.x - P.x, m.y - P.y) ? a : m)); tx = t.x; ty = t.y; }
        const dx = tx - P.x, dy = ty - P.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(P.vx, P.vy), lim = 40 + 30 * sk;
        if (sp > lim) { I.ax = -P.vx / sp; I.ay = -P.vy / sp; } else if (d > 6) { I.ax = dx / d * (Math.random() < sk ? 1 : 0); I.ay = dy / d * (Math.random() < sk ? 1 : 0); }
        if (ev.phase === 'abrir') { if (A.h === undefined) A.h = 260 + (1 - sk) * 500 * Math.random() + (Math.random() < (1 - sk) * .3 ? -120 : 0); if (ev.alt < A.h) I.pa = true; }
      } else if (ev.phase === 'velame') {
        A.h = undefined; const c = ev.can, left = Math.max(.4, c.a / c.rate), want = -c.x / left, w = ev.wind + ev.gustW;
        if (A.e === undefined || Math.random() < .02) A.e = (Math.random() - .5) * (1 - sk) * 1.4;
        I.ax = clamp((want - w) / PQ.ar + A.e, -1, 1);
        if (A.fl === undefined) A.fl = 3 + (Math.random() - .5) * (1 - sk) * 9; if (c.a < A.fl && !ev.flare) I.pa = true;
      } else { A.fl = undefined; }
      return I;
    };
    for (const [nm, sk] of [['muito bom', .95], ['médio', .8], ['fraco', .6]]) {
      let sc = 0, best = 0, rod = 0, mos = 0, emp = 0;
      for (let m = 0; m < N; m++) { ev.init(); const A = {}; for (let t = 0; t < 200; t += DT) { const I = bot(sk, A); I.pa = I.pa && !A.lastPa; A.lastPa = I.pa; if (ev.update(DT, I)) break; } sc += ev.score; best = Math.max(best, ev.score); rod += ev.rodas; mos += ev.mosca; emp += ev.empe; }
      o.push(`${nm}: ${Math.round(sc / N)} pontos (melhor ${best}) · rodas ${(rod / N).toFixed(1)} · na mosca ${(mos / N).toFixed(1)} · em pé ${(emp / N).toFixed(1)}`);
    }
    return o;
  }, N);
  console.log(out.join('\n'));
  await p.evaluate(() => { choose(paraquedas); start(); });
  await p.waitForTimeout(2500); await p.locator('canvas').first().screenshot({ path: 'amg/pq_livre.png' });
  await p.evaluate(() => { paraquedas.demo(); }); await p.waitForTimeout(300); await p.locator('canvas').first().screenshot({ path: 'amg/pq_roda.png' });
  await p.evaluate(() => { paraquedas.alt = 1490; paraquedas.phase = 'livre'; }); await p.waitForTimeout(2200); await p.locator('canvas').first().screenshot({ path: 'amg/pq_abrir.png' });
  await p.keyboard.press('Space'); await p.waitForTimeout(2500); await p.locator('canvas').first().screenshot({ path: 'amg/pq_velame.png' });
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
