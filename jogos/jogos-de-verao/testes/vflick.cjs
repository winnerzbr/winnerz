const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(900);
  await p.evaluate(() => choose(volei)); await p.waitForTimeout(300); await p.click('#b-play'); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    const pc = { react: .14, err: 4, spd: 1, fwd: .5, block: .4, slip: .015, iq: .9, dive: .5, spike: 0, set: 0, read: 0 };
    OPP.rapida.lvl = 1.02; volei.two = false; volei.tour = null; volei.copa = null; volei.init();
    const A = { t: 0, tx: 70 }, seq = [[], []]; let t = 0;
    const loco = /^(run|back|ss|ready|idle)/;
    for (let f = 0; f < 60 * 90 && volei.state !== 'over'; f++) {
      const c = volei.brain0(0, DT, A, pc); volei.update(DT, { l: c.l, r: c.r, u: c.u, a: false, ax: c.ax, pd: c.d, d: c.d, pc: c.sp, auto: true }); t += DT;
      withCtx(cv.getContext('2d'), () => volei.draw(t));
      seq[0].push(__stOf('ia50').last || __stOf('ia5' + 0).last); seq[1].push(__stOf('bl51').last);
    }
    const out = {};
    ['IAmiguinho', 'Amiguinho'].forEach((nm, i) => {
      const s = seq[i].map((a) => (a || '').replace(/_\d$/, '').replace(/[UD]$/, '')); let runs = [], cur = s[0], n = 0;
      for (const a of s) { if (a === cur) n++; else { runs.push([cur, n]); cur = a; n = 1; } } runs.push([cur, n]);
      const lr = runs.filter(([a]) => loco.test(a));
      out[nm] = { trocas_por_segundo: +(runs.length / t).toFixed(2), trechos_curtos: lr.filter(([, n]) => n < 6).length, trechos_locomocao: lr.length, curtos: lr.filter(([, n]) => n < 6).map(([a, n]) => a + n).join(' '), exemplo: runs.slice(20, 45).map(([a, n]) => a + n).join(' ') };
    });
    return out;
  });
  console.log(JSON.stringify(r, null, 1), errs.slice(0, 2)); await b.close();
})();
