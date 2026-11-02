// Cancha da bocha (02/11, relato do dono: bolas saindo da quadra). Aplica a cancha que estava guardada no editor do dono
// (lado de cima 49, de baixo 190), joga partidas automáticas e confere: a cancha do jogo em cima da pintada, a vila cobrindo a tela,
// nenhuma bola parada fora das tábuas. Foto antes (cancha original) e depois (cancha do dono, corrigida).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  for (const [nome, cfg] of [['original', {}], ['dono', { 'BC.x0': 50, 'BC.y1': 190, 'BC.y0': 49 }], ['exagero', { 'BC.x0': 0, 'BC.x1': 400, 'BC.y0': 20, 'BC.y1': 225 }]]) {
    const r = await p.evaluate((cfg) => {
      WZ.apply({ mec: cfg, pistas: {}, rostos: {}, textos: {} });
      const c = BCC.c, s = (BC.x1 - BC.x0) / (c[2] - c[0]), ox = BC.x0 - c[0] * s, oy = BC.y0 - c[1] * s;
      const pint = [c[0] * s + ox, c[1] * s + oy, c[2] * s + ox, c[3] * s + oy].map((v) => +v.toFixed(1));
      const cobre = ox <= 0.01 && oy <= 0.01 && ox + BCC.w * s >= 399.9 && oy + BCC.h * s >= 224.9;
      let fora = 0, bolas = 0; const ev = bocha;
      for (let m = 0; m < 3; m++) {
        ev.two = false; ev.init(); ev.botAcc = .6; ev.aimHuman = function (dt) { this.aimAI(dt); }; let t = 0;
        while (t < 900) { if (ev.update(DT, {})) break; t += DT;
          for (const q of [...ev.balls, ev.jack]) if (q && q.alive && !q.mv) { bolas++; if (q.x < BC.x0 || q.x > BC.x1 || q.y < BC.y0 || q.y > BC.y1) fora++; } }
        delete ev.aimHuman; delete ev.botAcc;
      }
      return { BC: [BC.x0, BC.y0, BC.x1, BC.y1].map((v) => +v.toFixed(1)), pint, cobre, fora, bolas };
    }, cfg);
    console.log(nome.padEnd(9), 'cancha do jogo', r.BC.join(','), '· pintada', r.pint.join(','), '· vila cobre a tela:', r.cobre, '· paradas fora:', r.fora, 'de', r.bolas);
    await p.evaluate(() => { choose(bocha); start(); bocha.botAcc = .8; bocha.aimHuman = function (dt) { this.aimAI(dt); }; });
    await p.waitForTimeout(16000); await p.screenshot({ path: `testes/bccancha_${nome}.png` });
    await p.evaluate(() => { delete bocha.aimHuman; delete bocha.botAcc; mode = 'menu'; });
  }
  console.log(errs.slice(0, 5).join(' | ') || 'sem erros'); await b.close();
})();
