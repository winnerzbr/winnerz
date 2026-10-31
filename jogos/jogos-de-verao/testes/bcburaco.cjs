const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1000);
  console.log(await p.evaluate(() => {
    const ev = bocha, out = []; ev.init(); ev.fx = [];
    ev.T = { mounds: [{ x: 300, y: 150, r: 30, h: -1.2 }, { x: 200, y: 110, r: 26, h: -1.1 }], soft: [{ x: 300, y: 150, rx: 30, ry: 18, a: 0 }], shells: [], prints: [] };
    for (const [hx, hy] of [[300, 150], [200, 110]]) {
      const list = []; let hits = 0; const h0 = ev.hitFx.bind(ev); ev.hitFx = (...a) => { hits++; };
      for (let n = 0; n < 4; n++) {
        const ang = Math.atan2(hy - BC.sy + (n - 1.5) * 4, hx - BC.sx) * 180 / Math.PI; let best = null;
        for (let pw = .2; pw < 1; pw += .01) { const t = ev.launch(n % 2, false, 'rolar', pw, ang), l = [t]; for (let s = 0; s < 600 && ev.moving(l); s++) ev.world({ list: l }, 1 / 60, false); const d = Math.hypot(t.x - hx, t.y - hy); if (!best || d < best.d) best = { d, pw }; }
        const t = ev.launch(n % 2, false, 'rolar', best.pw + .03, ang); list.push(t); let steps = 0; for (; steps < 1500 && ev.moving(list); steps++) ev.world({ list }, 1 / 180, true);
        out.push(`buraco ${hx}: bola ${n + 1} acomodou em ${(steps / 180).toFixed(2)} s · batidas com efeito ${hits}` + (steps >= 1500 ? " " + JSON.stringify(list.map((o) => [o.x.toFixed(1), o.y.toFixed(1), Math.hypot(o.vx, o.vy).toFixed(1), o.mv, o.alive])) : ""));
      }
      ev.hitFx = h0;
    }
    return out.join('\n');
  }));
  await b.close();
})();
