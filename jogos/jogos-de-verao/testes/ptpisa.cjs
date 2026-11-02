// Patins (01/11): corrimão começando na ponta, Amiguinhos pintados na pista e o pulo na cabeça deles.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 }); fs.mkdirSync('amg', { recursive: true });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__skHora = 12; choose(patins); start(); }); await p.waitForTimeout(4500);
  const r = await p.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.x, y: c.y, width: c.width, height: c.height }; });
  // simulação: pulos em vários momentos antes do corrimão e do Amiguinho (sem desenhar), contando tombos, deslizes e pisões
  const sim = await p.evaluate(() => {
    const P = patins, U = P.update, out = {};
    for (const alvo of ['corrimao', 'bot']) {
      const res = { tombo: 0, ok: 0, nada: 0 };
      for (let i = 0; i < 60; i++) {
        P.init(); P.t = 10; P.left = 60; P.v = 150; P.inv = 0; P.nextArr = 1e9; P.bumps = 0;
        const o = alvo === 'corrimao' ? { k: 'corrimao', x: P.d + 260, w: 90 } : { k: 'bot', x: P.d + 260 }; P.obs = [o];
        const jt = .55 + i * .012; let t = 0, jumped = false;
        for (let k = 0; k < 240; k++) { const I = {}; if (!jumped && t >= jt) { I.pu = 1; I.u = 1; jumped = true; } U.call(P, 1 / 60, I); t += 1 / 60; }
        if (P.bumps) res.tombo++; else if ((alvo === 'corrimao' && o.grinded) || (alvo === 'bot' && o.pis)) res.ok++; else res.nada++;
      }
      out[alvo] = res;
    }
    return JSON.stringify(out);
  });
  console.log('simulação (60 pulos em momentos diferentes):', sim);
  await p.evaluate(() => { patins.init(); window.__u = patins.update; patins.update = function (dt) { this.t += dt; return false; }; Object.assign(patins, { air: false, y: 0, obs: [{ k: 'corrimao', x: patins.d + 170, w: 80 }, { k: 'bot', x: patins.d + 290 }, { k: 'bot', x: patins.d + 330 }, { k: 'bot', x: patins.d + 370 }] }); });
  await p.waitForTimeout(300); await p.screenshot({ path: 'amg/pt_pista.png', clip: r });
  // pisão: o Amiguinho caindo, quadro a quadro
  for (const [nm, e] of [['0', .05], ['1', .2], ['2', .35], ['3', .55], ['4', .9], ['5', 1.6]]) {
    await p.evaluate((e) => { const o = patins.obs[1]; o.pis = true; o.pisT = patins.t - e; }, e); await p.waitForTimeout(60);
    await p.screenshot({ path: `amg/pt_pisa_${nm}.png`, clip: r });
  }
  // deslizando no começo do corrimão
  await p.evaluate(() => { const o = patins.obs[0]; Object.assign(patins, { d: o.x - PPX - 2, air: false, y: PT_RH, grind: o }); });
  await p.waitForTimeout(150); await p.screenshot({ path: 'amg/pt_corrimao_ponta.png', clip: r });
  // partida de verdade com o teclado
  await p.evaluate(() => { patins.update = window.__u; choose(patins); start(); }); await p.waitForTimeout(4200);
  for (let i = 0; i < 10; i++) { await p.keyboard.press('Space'); await p.waitForTimeout(650); }
  console.log('estado:', await p.evaluate(() => [mode, patins.score, patins.bumps, patins.pisoes || 0, patins.grinds].join(' · ')));
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
