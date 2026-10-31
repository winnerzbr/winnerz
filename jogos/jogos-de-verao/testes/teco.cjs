// teco-teco: física (decolagem, velocidade de cruzeiro, looping, estol) e um piloto automático em 3 níveis para calibrar as medalhas
const { chromium } = require('playwright');
const N = Number(process.argv[2] || 3);
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  const out = await p.evaluate((N) => {
    const ev = teco, o = [], I0 = () => ({ u: false, d: false, pa: false, ay: 0 });
    // 1) decolagem segurando ↑
    ev.init(); let t = 0; while (ev.ground && t < 8) { ev.update(DT, { ...I0(), u: ev.t > .8 }); t += DT; }
    o.push(`decolou em ${t.toFixed(2)} s, x ${ev.x.toFixed(0)}, velocidade ${Math.hypot(ev.vx, ev.va).toFixed(0)}`);
    // 2) cruzeiro sem comando
    ev.init(); Object.assign(ev, { ground: false, x: 900, a: 200, vx: 120, va: 0, th: .05, thU: .05, loopBase: .05 }); ev.C.rings = []; ev.C.balloons = []; ev.C.birds = []; ev.C.lm = [];
    for (t = 0; t < 8; t += DT) ev.update(DT, I0()); o.push(`8 s sem comando: velocidade ${Math.hypot(ev.vx, ev.va).toFixed(0)}, altura ${ev.a.toFixed(0)}, nariz ${(ev.th * 57.3).toFixed(0)}°`);
    // 3) looping segurando ↑ a 130
    Object.assign(ev, { a: 250, vx: 135, va: 0, th: .05, thU: .05, loopBase: .05, loops: 0 }); let amin = 999, amax = 0;
    for (t = 0; t < 3; t += DT) { ev.update(DT, { ...I0(), u: true }); amin = Math.min(amin, ev.a); amax = Math.max(amax, ev.a); }
    o.push(`3 s segurando ↑ a 135: ${ev.loops} loopings, altura de ${amin.toFixed(0)} a ${amax.toFixed(0)}`);
    Object.assign(ev, { a: 250, vx: 75, va: 0, th: .05, thU: .05, loopBase: .05, loops: 0 }); amin = 999;
    for (t = 0; t < 3; t += DT) { ev.update(DT, { ...I0(), u: true }); amin = Math.min(amin, ev.a); }
    o.push(`3 s segurando ↑ a 75: ${ev.loops} loopings, estol ${ev.stall.toFixed(2)}, perdeu ${(250 - amin).toFixed(0)} de altura`);
    // 4) piloto automático
    const why = {}; const cr0 = ev.crash; ev.crash = function (w) { if (!(this.spin > 0)) { const k = w + (ev.lmIn ? " em " + ev.lmIn.kind : ""); why[k] = (why[k] || 0) + 1; } return cr0.call(this, w); };
    const pilot = (skill, A) => {
      const V = Math.hypot(ev.vx, ev.va), ahead = (x) => x > ev.x + 25 && x < ev.x + 420;
      let tgt = 170, tx = ev.x + 200;
      const r = ev.C.rings.find((r) => !r.done && ahead(r.x)), bl = ev.C.balloons.find((b) => !b.pop && ahead(b.x));
      if (r && (!bl || r.x < bl.x + 40)) { tgt = r.a; tx = r.x; } else if (bl) { tgt = bl.a; tx = bl.x; }
      for (const l of ev.C.lm) if (l.x1 > ev.x - 10 && l.x0 < ev.x + 260) { let top = 0; for (let q = Math.max(l.x0, ev.x); q <= Math.min(l.x1, ev.x + 260); q += 5) top = Math.max(top, l.top(q)); const want = top + (skill > .8 ? 20 : 34); if (tgt < want || l.x0 > ev.x) { tgt = Math.max(tgt, want); tx = Math.max(l.x0, ev.x + 60); } }
      if (A.err === undefined || Math.random() < .02) A.err = (Math.random() - .5) * (1 - skill) * 60;
      const g = clamp(Math.atan2(tgt + A.err - ev.a, Math.max(70, tx - ev.x)), -.55, .5), thd = g + .07;
      const I = I0(); const u = clamp((thd - ev.th) * 3, -1, 1); if (Math.random() < skill) { I.u = u > .15; I.d = u < -.15; } else { I.u = A.lu; I.d = A.ld; } A.lu = I.u; A.ld = I.d;
      if (ev.ground) { I.u = V > 70; I.d = false; }
      I.pa = ev.tank >= 1 && V < 118 && Math.random() < .05;
      return I;
    };
    for (const [nm, sk] of [['muito bom', .97], ['médio', .85], ['fraco', .7]]) {
      let sc = 0, rg = 0, bal = 0, cr = 0, ras = 0, best = 0, lp = 0;
      for (let m = 0; m < N; m++) { ev.init(); const A = {}; for (t = 0; t < 95; t += DT) if (ev.update(DT, pilot(sk, A))) break; sc += ev.score; rg += ev.rings; bal += ev.balloons; cr += ev.crashes; ras += ev.rasantes; lp += ev.loops; best = Math.max(best, ev.score); }
      o.push(`${nm}: ${Math.round(sc / N)} pontos (melhor ${best}) · argolas ${(rg / N).toFixed(0)} de ${ev.ringsAll} · balões ${(bal / N).toFixed(0)} · rasantes ${(ras / N).toFixed(1)} · batidas ${(cr / N).toFixed(1)} · loopings ${(lp / N).toFixed(1)}`);
    }
    o.push(JSON.stringify(why)); return o;
  }, N);
  console.log(out.join('\n'));
  await p.evaluate(() => { choose(teco); start(); });
  for (let i = 0; i < 3; i++) { await p.keyboard.down('ArrowUp'); await p.waitForTimeout(900); await p.keyboard.up('ArrowUp'); await p.waitForTimeout(700); await p.locator('canvas').first().screenshot({ path: `amg/tc_${i}.png` }); }
  console.log(errs.join(' | ') || 'ok'); await b.close();
})();
