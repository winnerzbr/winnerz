// corrida de bugue: batida na mureta. O bugue tem que quicar, perder velocidade e seguir andando, sem travar e sem precisar virar.
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage(); await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1000);
  console.log(await p.evaluate(() => {
    const ev = bugue, o = [], wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    let travou = 0, total = 0;
    for (const ti of [0, 1, 2]) for (const sg of [20, 130, 260]) for (const angD of [15, 35, 60, 85]) for (const side of [-1, 1]) {
      ev.cup = null; ev.trackSel = ti; ev.init(); ev.started = true; ev.race = 1;
      const me = ev.me; for (const k of ev.K) if (k !== me) { k.x = -9999; k.y = -9999; k.fin = 1; }
      const L = BG_LINE, A = L[sg], B = L[sg + 2], tg = Math.atan2(B[1] - A[1], B[0] - A[0]), h = tg + side * angD * Math.PI / 180;
      Object.assign(me, { x: A[0], y: A[1], h, d: h, vx: Math.cos(h) * BG.vmax, vy: Math.sin(h) * BG.vmax, w: 0, seg: sg, items: [] });
      let bateu = -1, minV = 999, t = 0, v0 = 0;
      for (; t < 2.2; t += DT) { const f0 = ev.fx.length; ev.update(DT, { a: true, ax: 0 }); if (bateu < 0 && ev.fx.slice(f0).some((f) => f.k === 'batida')) { bateu = t; v0 = me.s; }
        if (bateu >= 0 && t - bateu < 1) minV = Math.min(minV, me.s); if (bateu >= 0 && t - bateu > 1) break; }
      if (bateu < 0) continue; total++;
      const [s2] = ev.near(me), C = L[s2], D = L[(s2 + 2) % L.length], e = Math.abs(wrap(Math.atan2(D[1] - C[1], D[0] - C[0]) - me.d));
      const ok = minV > 45 && me.s > 90 && e < 1.1; if (!ok) { travou++; o.push(`  ${BG_TRACKS[ti].name} trecho ${sg} batendo a ${angD}°: menor velocidade ${minV.toFixed(0)}, depois de 1 s ${me.s.toFixed(0)} px/s, direção errada ${e.toFixed(2)}`); }
    }
    o.unshift(`batidas: ${total} · travou ou ficou torto: ${travou}`); return o.join('\n');
  }));
  await b.close(); })();
