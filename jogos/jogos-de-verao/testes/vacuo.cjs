// corrida de bugue: o vácuo. Um bugue logo atrás de outro (mesma direção) fica mais rápido e, segurando ali, sai com um turbo
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage(); await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1000);
  console.log(await p.evaluate(() => {
    const ev = bugue, o = [];
    const run = (comLider) => {
      ev.cup = null; ev.trackSel = 0; ev.init(); ev.started = true; ev.race = 1;
      const L = BG_LINE, A = L[13], B = L[15], h = Math.atan2(B[1] - A[1], B[0] - A[0]), me = ev.me, ld = ev.K[0];
      for (const k of ev.K) if (k !== me && k !== ld) { k.x = -9999; k.y = -9999; k.fin = 1; }
      Object.assign(me, { x: A[0], y: A[1], h, d: h, vx: Math.cos(h) * 200, vy: Math.sin(h) * 200, seg: 13, items: [] });
      Object.assign(ld, { x: A[0] + Math.cos(h) * 60, y: A[1] + Math.sin(h) * 60, h, d: h, vx: Math.cos(h) * 205, vy: Math.sin(h) * 205, seg: 15, items: [] });
      if (!comLider) { ld.x = -5000; ld.y = -5000; }
      // o da frente anda a 236 px/s em linha reta (um pouco mais que o máximo de quem vem atrás); quem vem atrás acelera tudo
      ev.aiCtl = function (k) { return k === ld ? { steer: 0, acc: k.s < 205, brake: false, drift: false, use: false } : { steer: 0, acc: false, brake: false, drift: false, use: false }; };
      let maxV = 0, boostAt = -1, t = 0; for (; t < 2.3; t += DT) { ev.update(DT, { a: true, ax: 0 }); if (comLider) { ld.vx = Math.cos(h) * 236; ld.vy = Math.sin(h) * 236; ld.h = ld.d = h; } if (me.boost > 0 && boostAt < 0) boostAt = t; maxV = Math.max(maxV, me.s); if (comLider && Math.hypot(ld.x - me.x, ld.y - me.y) < 22) break; }
      delete ev.aiCtl; return { maxV, boostAt, t, vac: ev.vacuos };
    };
    const so = run(false), com = run(true);
    o.push(`sozinho: velocidade máxima ${so.maxV.toFixed(0)} px/s · no vácuo: ${com.maxV.toFixed(0)} px/s (+${((com.maxV / so.maxV - 1) * 100).toFixed(0)}%) · turbo do vácuo em ${com.boostAt.toFixed(2)} s · “Vácuo!” ${com.vac}×`);
    return o.join('\n');
  }));
  await b.close(); })();
