// corrida de bugue: itens para trás e balão que passa por quem está invencível
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage(); await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1000);
  console.log(await p.evaluate(() => {
    const ev = bugue, o = [];
    const setup = () => { ev.cup = null; ev.trackSel = 0; ev.init(); ev.started = true; ev.race = 5; const L = BG_LINE, h = Math.atan2(L[22][1] - L[18][1], L[22][0] - L[18][0]);
      const put = (k, sg, v) => { const P = L[sg]; Object.assign(k, { x: P[0], y: P[1], h, d: h, vx: Math.cos(h) * v, vy: Math.sin(h) * v, seg: sg, items: [], inv: 0, rec: 0, spin: 0, shield: 0 }); };
      for (const k of ev.K) { k.x = -9999 - k.i * 500; k.y = -9999; k.fin = k.me ? 0 : 1; }
      ev.aiCtl = (k) => ({ steer: 0, acc: k.i !== 0, brake: false, drift: false, use: false, dir: 0 }); return put; };
    // 1) balão vindo atrás de mim enquanto estou invencível: passa por mim, não me acerta depois e vai atrás de quem está na frente
    { const put = setup(), me = ev.me, fr = ev.K[0], bk = ev.K[1]; fr.fin = 0; bk.fin = 0; put(me, 16, 150); put(fr, 32, 150); put(bk, 6, 150);
      me.inv = 1.2; ev.stepAll(0, null); ev.stepAll(0, null);
      ev.proj.push({ k: 'balao', x: me.x - Math.cos(me.h) * 60, y: me.y - Math.sin(me.h) * 60, vx: Math.cos(me.h) * 260, vy: Math.sin(me.h) * 260, t: 0, by: bk, tg: me, seg: 10 });
      let tgFr = false; for (let t = 0; t < 4; t += DT) { ev.update(DT, { a: true, ax: 0 }); if (ev.proj[0] && ev.proj[0].tg === fr) tgFr = true; }
      o.push(`balão passou por mim invencível: me acertou ${ev.levou}× · foi atrás do da frente: ${tgFr ? 'sim' : 'não'} · o da frente rodou: ${fr.spin > 0 || fr.inv > 0 ? 'sim' : 'não'}`); }
    // 2) bola para trás acerta quem vem atrás
    { const put = setup(), me = ev.me, bk = ev.K[1]; bk.fin = 0; put(me, 20, 180); put(bk, 10, 180); ev.stepAll(0, null); ev.stepAll(0, null);
      me.items = [{ k: 'bola', roll: 0 }]; ev.drive(me, { steer: 0, acc: true, brake: false, drift: false, use: true, dir: -1 }, DT);
      let hit = -1; for (let t = 0; t < 2; t += DT) { ev.update(DT, { a: true, ax: 0 }); if (bk.spin > 0 && hit < 0) hit = t; }
      o.push(`bola para trás: acertou quem vinha atrás em ${hit.toFixed(2)} s · acertos ${ev.acertos}`); }
    // 3) balão para trás persegue quem vem atrás
    { const put = setup(), me = ev.me, bk = ev.K[1]; bk.fin = 0; put(me, 20, 180); put(bk, 4, 200); ev.stepAll(0, null); ev.stepAll(0, null);
      me.items = [{ k: 'balao', roll: 0 }]; ev.drive(me, { steer: 0, acc: true, brake: false, drift: false, use: true, dir: -1 }, DT);
      const tg = ev.proj[0] && ev.proj[0].tg; let hit = -1; for (let t = 0; t < 3; t += DT) { ev.update(DT, { a: true, ax: 0 }); if (bk.spin > 0 && hit < 0) hit = t; }
      o.push(`balão para trás: alvo é quem vem atrás: ${tg === bk ? 'sim' : 'não'} · acertou em ${hit.toFixed(2)} s`); }
    // 4) protetor com ↑ cai longe na frente
    { const put = setup(), me = ev.me; put(me, 20, 180); me.items = [{ k: 'protetor', roll: 0 }]; const x0 = me.x, y0 = me.y; ev.drive(me, { steer: 0, acc: true, brake: false, drift: false, use: true, dir: 1 }, DT);
      const u = ev.puds[0]; o.push(`protetor para a frente: caiu ${(((u.x - x0) * Math.cos(me.h) + (u.y - y0) * Math.sin(me.h))).toFixed(0)} px à frente`); }
    delete ev.aiCtl; return o.join('\n');
  }));
  await b.close(); })();
