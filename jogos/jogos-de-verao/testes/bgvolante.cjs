// corrida de bugue: sensibilidade do volante. Em alta, um toque curto para o lado deve desviar pouco; segurar vira de verdade.
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage(); await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1000);
  console.log(await p.evaluate(() => {
    const ev = bugue, o = [];
    const run = (hold, ax = 1) => {
      ev.cup = null; ev.trackSel = 0; ev.init(); ev.started = true; ev.race = 1; ev.st = 0;
      const me = ev.me; for (const k of ev.K) if (k !== me) { k.x = -9999; k.y = -9999; k.fin = 1; }
      const h = 0; Object.assign(me, { x: 0, y: 0, h, d: h, vx: BG.vmax, vy: 0, w: 0, seg: 13, items: [] });
      const sv = [ev.near, ev.walls, ev.ground]; ev.near = () => [13, 0]; ev.walls = () => {}; ev.ground = () => null; // pista infinita e reta só para medir
      let t = 0; for (; t < 1.2; t += DT) ev.update(DT, { a: true, ax: t < hold ? ax : 0 });
      [ev.near, ev.walls, ev.ground] = sv;
      return { lado: me.y, ang: me.h * 180 / Math.PI, vel: me.s };
    };
    for (const hold of [.08, .15, .3, .6]) { const r = run(hold); o.push(`toque de ${hold.toFixed(2)} s a ${BG.vmax} px/s: desvio de ${r.lado.toFixed(0)} px para o lado em 1,2 s, bugue girou ${r.ang.toFixed(0)}°`); }
    const r = run(9); o.push(`segurando o tempo todo: desvio ${r.lado.toFixed(0)} px, girou ${r.ang.toFixed(0)}° em 1,2 s`);
    return o.join('\n');
  }));
  await b.close(); })();
