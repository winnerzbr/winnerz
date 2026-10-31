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
    // embalo: fica 1,2 s no vácuo (antes do turbo), sai de trás e vê quanto da velocidade continua
    const emb = (() => { ev.cup = null; ev.trackSel = 0; ev.init(); ev.started = true; ev.race = 1;
      const L = BG_LINE, A = L[13], B = L[15], h = Math.atan2(B[1] - A[1], B[0] - A[0]), me = ev.me, ld = ev.K[0];
      for (const k of ev.K) if (k !== me && k !== ld) { k.x = -9999; k.y = -9999; k.fin = 1; }
      Object.assign(me, { x: A[0], y: A[1], h, d: h, vx: Math.cos(h) * 225, vy: Math.sin(h) * 225, seg: 13, items: [] });
      Object.assign(ld, { x: A[0] + Math.cos(h) * 50, y: A[1] + Math.sin(h) * 50, h, d: h, vx: Math.cos(h) * 225, vy: Math.sin(h) * 225, seg: 15, items: [] });
      ev.aiCtl = () => ({ steer: 0, acc: false, brake: false, drift: false, use: false }); const r = {};
      for (let t = 0; t < 1.2; t += DT) { ev.update(DT, { a: true, ax: 0 }); ld.vx = Math.cos(h) * 225; ld.vy = Math.sin(h) * 225; ld.h = ld.d = h; ld.x = me.x + Math.cos(h) * 50; ld.y = me.y + Math.sin(h) * 50; }
      r.saiu = me.s; ld.x = -7000; ld.y = -7000; ld.fin = 1;
      for (let t = 0; t < 2.5; t += DT) { ev.update(DT, { a: true, ax: 0 }); if (Math.abs(t - 1) < DT / 2) r.s1 = me.s; if (Math.abs(t - 2) < DT / 2) r.s2 = me.s; }
      delete ev.aiCtl; return r; })();
    o.push(`embalo: saiu do vácuo a ${emb.saiu.toFixed(0)} px/s · 1 s depois ${emb.s1.toFixed(0)} · 2 s depois ${emb.s2.toFixed(0)} (o normal é ${BG.vmax})`);
    // ultrapassagem: o da frente anda no máximo (230); eu colo atrás, troco de faixa e vejo se passo
    const ult = (() => { ev.cup = null; ev.trackSel = 0; ev.init(); ev.started = true; ev.race = 1; ev.st = 0;
      const L = BG_LINE, A = L[13], B = L[15], h = Math.atan2(B[1] - A[1], B[0] - A[0]), me = ev.me, ld = ev.K[0];
      for (const k of ev.K) if (k !== me && k !== ld) { k.x = -9999; k.y = -9999; k.fin = 1; }
      Object.assign(me, { x: A[0], y: A[1], h, d: h, vx: Math.cos(h) * 230, vy: Math.sin(h) * 230, seg: 13, items: [] });
      Object.assign(ld, { x: A[0] + Math.cos(h) * 45, y: A[1] + Math.sin(h) * 45, h, d: h, vx: Math.cos(h) * 230, vy: Math.sin(h) * 230, seg: 15, items: [] });
      ev.aiCtl = () => ({ steer: 0, acc: false, brake: false, drift: false, use: false }); let passou = -1;
      const sv = [ev.near, ev.walls, ev.ground]; ev.near = () => [14, 0]; ev.walls = () => {}; ev.ground = () => null;
      for (let t = 0; t < 4; t += DT) { const ax = t > 1.1 && t < 1.4 ? 1 : t > 1.55 && t < 1.8 ? -1 : 0; ev.update(DT, { a: true, ax }); ld.vx = Math.cos(h) * 230; ld.vy = Math.sin(h) * 230; ld.h = ld.d = h;
        const ah = (me.x - ld.x) * Math.cos(h) + (me.y - ld.y) * Math.sin(h); if (ah > 20 && passou < 0) passou = t; }
      [ev.near, ev.walls, ev.ground] = sv; delete ev.aiCtl; return passou; })();
    o.push(`ultrapassagem: colado atrás de quem anda no máximo, trocando de faixa em 1,1 s: ${ult >= 0 ? `passou em ${ult.toFixed(1)} s` : 'não passou em 4 s'}`);
    const so = run(false), com = run(true);
    o.push(`sozinho: velocidade máxima ${so.maxV.toFixed(0)} px/s · no vácuo: ${com.maxV.toFixed(0)} px/s (+${((com.maxV / so.maxV - 1) * 100).toFixed(0)}%) · turbo do vácuo em ${com.boostAt.toFixed(2)} s · “Vácuo!” ${com.vac}×`);
    return o.join('\n');
  }));
  await b.close(); })();
