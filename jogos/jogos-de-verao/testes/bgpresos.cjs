const { chromium } = require('playwright'); // corrida de bugue: 12 corridas no piloto automático, conta quantas não terminam (bugue preso)
(async () => { const b = await chromium.launch(), p = await b.newPage(); await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1000);
  console.log(await p.evaluate(() => { const ev = bugue, o = []; let stuck = 0;
    for (let m = 0; m < 12; m++) { ev.init(); ev.ctlOf = function () { return this.aiCtl(this.me, DT); }; let t = 0; const hist = [];
      for (; t < 400; t += DT) { ev.update(DT, { a: ev.race > -.3 }); if (ev.done) break; if (Math.round(t * 60) % 60 === 0) hist.push(ev.K.map((k) => [k.x | 0, k.y | 0, k.s | 0, k.seg, k.lap])); }
      if (!ev.done) { stuck++; const last = hist.slice(-3); o.push('preso: ' + JSON.stringify(last.map((h) => h.filter((q, i) => true)))); } }
    delete ev.ctlOf; o.push('presos ' + stuck + ' de 12'); return o.join('\n'); }));
  await b.close(); })();
