const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  // simulação: jogador automático que bate no tempo com erro (pele = chance de acertar a janela)
  const sim = await p.evaluate(() => {
    const out = []; const ev = pingue;
    const botP0 = (skill, A) => {
      const p = ev.P[0], b = ev.b, I = { pa: false, pb: false, pc: false, u: false, d: false, l: false, r: false, ax: 0 };
      if (ev.state === 'serve') { if (ev.server === 0 && ev.st > .6) I.pa = true; return I; }
      if (ev.state !== 'rally' || b.last !== 1 || p.sw) return I;
      const evk = `${ev.sc.join()}:${ev.hits}`;
      if (A.ev !== evk) { A.ev = evk; const good = Math.random() < skill; A.err = good ? (Math.random() * 2 - 1) * .02 : (Math.random() < .5 ? -1 : 1) * (.04 + Math.random() * .1); A.k = Math.random() < .2 ? 'efeito' : 'normal'; A.aim = [-1, 0, 1][Math.floor(Math.random() * 3)]; }
      const pl = p.pl; if (!pl) return I;
      if (pl.t <= PP.hitT + A.err) { const k = pl.y < ev.ty - 21 && Math.random() < .8 ? 'cortada' : A.k; if (k === 'cortada') I.pb = true; else if (k === 'efeito') I.pc = true; else I.pa = true; I.r = A.aim > 0; I.l = A.aim < 0; }
      return I;
    };
    const why = {};
    const pt0 = ev.point.bind(ev); ev.point = function (w, y) { if (this.state === 'rally') why[y] = (why[y] || 0) + 1; return pt0(w, y); };
    for (const [nm, skill] of [['muito bom', .95], ['bom', .85], ['médio', .7], ['fraco', .45]]) {
      let wins = 0, pts = [0, 0], N = 6, longest = 0, hitsTot = 0, rallies = 0;
      for (let m = 0; m < N; m++) {
        ev.two = false; ev.init(); let t = 0; const A = {};
        while (t < 600) { const I = botP0(skill, A); if (ev.update(DT, I)) break; t += DT; }
        if (ev.sc[0] > ev.sc[1]) wins++; pts[0] += ev.sc[0]; pts[1] += ev.sc[1]; longest = Math.max(longest, ev.longest);
      }
      out.push(`${nm}: venceu ${wins}/${N} · pontos ${pts[0]} x ${pts[1]} · maior troca ${longest}`);
    }
    out.push(JSON.stringify(why));
    ev.point = pt0;
    return out;
  });
  console.log(sim.join('\n'));
  await p.evaluate(() => { choose(pingue); start(); }); await p.waitForTimeout(1500);
  for (let i = 0; i < 4; i++) { await p.waitForTimeout(600); await p.locator('canvas').first().screenshot({ path: `amg/pp_${i}.png` }); }
  console.log(errs.join(' | ') || 'ok'); await b.close();
})();
