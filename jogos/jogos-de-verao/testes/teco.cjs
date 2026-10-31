// teco-teco 2D com voo livre: decolagem, resposta dos comandos, looping, piloto automático em 3 níveis e fotos
const { chromium } = require('playwright');
const N = Number(process.argv[2] || 3);
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  const out = await p.evaluate((N) => {
    const ev = teco, o = [], I0 = () => ({ u: false, d: false, pa: false, pb: false, ax: 0, ay: 0 });
    ev.init(); let t = 0; while (ev.ground && t < 5) { ev.update(DT, I0()); t += DT; } o.push(`decolou sozinho em ${t.toFixed(2)} s`);
    for (t = 0; t < 1; t += DT) ev.update(DT, I0()); const a0 = ev.a; for (t = 0; t < .5; t += DT) ev.update(DT, { ...I0(), u: true }); o.push(`▲ meio segundo: subiu ${(ev.a - a0).toFixed(0)} px`);
    const s0 = ev.sx; for (t = 0; t < .5; t += DT) ev.update(DT, { ...I0(), ax: 1 }); o.push(`▶ meio segundo: andou ${(ev.sx - s0).toFixed(0)} px para a frente na tela`);
    for (t = 0; t < 1; t += DT) ev.update(DT, { ...I0(), u: true }); ev.update(DT, { ...I0(), pb: true }); for (t = 0; t < 1.6; t += DT) ev.update(DT, I0()); o.push(`looping: ${ev.loops} feito(s), batidas ${ev.crashes}`);
    const why = {}; const cr0 = ev.crash; ev.crash = function (w) { if (!(this.spin > 0)) why[w] = (why[w] || 0) + 1; return cr0.call(this, w); };
    const pilot = (skill, A) => {
      const I = I0(), ahead = (x) => x > ev.x + 10 && x < ev.x + 360;
      let tgt = 160;
      const r = ev.C.rings.find((r) => !r.done && ahead(r.x)), bl = ev.C.balloons.find((q) => !q.pop && ahead(q.x));
      if (r && (!bl || r.x < bl.x + 30)) tgt = r.a; else if (bl) tgt = bl.a;
      for (const l of ev.C.lm) if (l.x1 > ev.x - 30 && l.x0 < ev.x + 220) { let top = 0; for (let q = Math.max(l.x0, ev.x - 30); q <= Math.min(l.x1, ev.x + 220); q += 5) top = Math.max(top, l.top(q)); tgt = Math.max(tgt, top + (skill > .9 ? 22 : 36)); }
      for (const g of ev.C.birds) { const gx = g.x - ev.t * 18; if (!g.hit && gx > ev.x && gx < ev.x + 90 && Math.abs(g.a - ev.a) < 14) tgt = g.a + (ev.a > g.a ? 26 : -26); }
      if (A.e === undefined || Math.random() < .02) A.e = (Math.random() - .5) * (1 - skill) * 70;
      const d = tgt + A.e - ev.a; if (Math.random() < skill) { I.u = d > 4; I.d = d < -4; A.u = I.u; A.d = I.d; } else { I.u = A.u; I.d = A.d; }
      I.ax = ev.sx < 110 ? .5 : ev.sx > 160 ? -.5 : 0;
      I.pa = ev.tank >= 1 && Math.random() < .02;
      I.pb = skill > .8 && ev.a > 150 && !r && Math.random() < .01;
      return I;
    };
    for (const [nm, sk] of [['muito bom', .97], ['médio', .85], ['fraco', .7]]) {
      let sc = 0, rg = 0, bal = 0, cr = 0, ras = 0, best = 0, lp = 0;
      for (let m = 0; m < N; m++) { ev.init(); const A = {}; for (t = 0; t < 95; t += DT) if (ev.update(DT, pilot(sk, A))) break; sc += ev.score; rg += ev.rings; bal += ev.balloons; cr += ev.crashes; ras += ev.rasantes; lp += ev.loops; best = Math.max(best, ev.score); }
      o.push(`${nm}: ${Math.round(sc / N)} pontos (melhor ${best}) · argolas ${(rg / N).toFixed(0)} de ${ev.ringsAll} · balões ${(bal / N).toFixed(0)} · rasantes ${(ras / N).toFixed(1)} · loopings ${(lp / N).toFixed(1)} · batidas ${(cr / N).toFixed(1)}`);
    }
    ev.crash = cr0; o.push(JSON.stringify(why)); return o;
  }, N);
  console.log(out.join('\n'));
  await p.evaluate(() => { choose(teco); start(); });
  await p.waitForTimeout(2500); await p.locator('canvas').first().screenshot({ path: 'amg/tc_0.png' });
  await p.keyboard.down('ArrowUp'); await p.waitForTimeout(700); await p.keyboard.up('ArrowUp'); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(500); await p.keyboard.up('ArrowRight'); await p.locator('canvas').first().screenshot({ path: 'amg/tc_1.png' });
  await p.keyboard.press('KeyX'); await p.waitForTimeout(500); await p.locator('canvas').first().screenshot({ path: 'amg/tc_2.png' });
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
