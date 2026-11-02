// BMX (02/11): manobras seguradas. Num salto longo: Superman segurado (soltando a tempo), segurado até o chão (tombo),
// Tailwhip segurado (duplo, triplo) e Superman segurado com mortal para trás (◀ junto). Mostra o que aparece no pouso.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { choose(bmx); start(); }); await p.waitForTimeout(2500);
  console.log(await p.evaluate(() => {
    const B = bmx, out = []; let msg = []; window.failMsg = (m) => msg.push('TOMBO: ' + m); const pp = window.pop; window.pop = (t, ...a) => { msg.push(t); return pp(t, ...a); };
    const noAr = () => { let x = B.px, y = B.py, vx = B.vx, vy = B.vy; for (let t = 0; t < 4; t += .02) { vy -= __BXF.G * .02; x += vx * .02; y += vy * .02; if (y - 22 < B.h(x)) return t; } return 4; };
    const casos = {
      'Superman segurado, solta 0,4 s antes de pousar': (r, t0) => r > .4 ? { b: 1, pb: t0 } : {},
      'Superman segurado até o chão': (r, t0) => ({ b: 1, pb: t0 }),
      'Tailwhip segurado, solta 0,5 s antes': (r, t0) => r > .5 ? { e: 1, pe: t0 } : {},
      'Superman segurado + mortal para trás': (r, t0, B) => { const I = r > .35 ? { b: 1, pb: t0 } : {}; if (B.rotSum < TAU - .7 && r > .2) I.l = 1; return I; },
    };
    for (const [nome, fn] of Object.entries(casos)) {
      B.init(); msg = []; let feito = false, voo = false, t0 = true;
      for (let f = 0; f < 3000 && !feito; f++) {
        const c = B.cont[0] || B.cont[1], I = { a: 1 };
        const lip = B.tr.find((s) => s.lip && s.x1 > B.x && s.x1 - B.x < 70), dist = lip ? lip.x1 - B.x : 1e9;
        if (c && (B.slope(B.x) < -.12 || dist < 60)) I.d = 1; if (c && dist < 9 && !B.air) I.pu = 1;
        if (B.air && !voo && noAr() > 1.7) { voo = true; msg = []; }
        if (voo && B.air) { Object.assign(I, fn(noAr(), t0, B)); t0 = false; }
        B.update(1 / 60, I);
        if (voo && !B.air) feito = true;
      }
      out.push(`${nome}:\n   ${msg.join(' | ') || '(nada)'}`);
    }
    window.pop = pp; return out.join('\n');
  }));
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
