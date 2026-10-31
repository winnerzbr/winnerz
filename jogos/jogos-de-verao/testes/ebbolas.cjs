// embaixadinha: rotação das bolas e física pelo peso (tempo no ar, velocidade de queda, vento) e se a sombra acerta onde a bola cai
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  console.log(await p.evaluate(() => {
    const e = embaixadinha, o = [];
    e.init(); const rot = []; for (let n = 1; n <= 12; n++) { e.nivel = n; rot.push(`${n}:${e.kindNow()}`); } o.push('rotação: ' + rot.join(' '));
    o.push('novidades: ' + Object.entries(EB_NOVO).map(([k, v]) => `${k} ${v}`).join(' · '));
    for (const kind of ['futebol', 'praia', 'gude', 'pingue']) {
      let errMax = 0, tAr = 0, vQ = 0, deriva = 0;
      for (let i = 0; i < 20; i++) {
        e.init(); e.nivel = 6; e.wind = i % 2 ? 40 : -40; e.windTo = e.wind; const bl = e.balls[0]; bl.kind = kind; bl.serve = 0; bl.x = 200; bl.y = EB_ZONAS[1].y; e.px = 200;
        e.launch(bl, EB_ZONAS[1], false); const pred = e.shadowX(bl), nz = e.nextZone(bl); let t = 0, x0 = bl.x, cross = null, vmax = 0;
        for (; t < 6; t += DT) { const g = e.gOf(bl), BP = EB_BOLAS[bl.kind]; bl.vy += (g - BP.ar * bl.vy) * DT; bl.vx += e.axOf(bl) * DT; const yb = bl.y; bl.x += bl.vx * DT; bl.y += bl.vy * DT; vmax = Math.max(vmax, bl.vy);
          if (yb < EB_ZONAS[1].y && bl.y >= EB_ZONAS[1].y && bl.vy > 0) { cross = bl.x; break; } }
        errMax = Math.max(errMax, Math.abs(cross - pred)); tAr += t; vQ += vmax; deriva += Math.abs(e.wind * EB_BOLAS[kind].vento) * .5 * t * t;
      }
      o.push(`${kind}: no ar ${(tAr / 20).toFixed(2)} s · chega a ${(vQ / 20).toFixed(0)} px/s · o vento empurra ~${(deriva / 20).toFixed(0)} px · erro da sombra até ${errMax.toFixed(1)} px`);
    }
    return o.join('\n');
  }));
  console.log(errs.join(' | ') || 'sem erros'); await b.close(); })();
