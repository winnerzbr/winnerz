const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(900);
  await p.evaluate(() => choose(volei)); await p.waitForTimeout(300); await p.click('#b-play'); await p.waitForTimeout(2500);
  const N = +(process.argv[2] || 3);
  const out = await p.evaluate((N) => {
    window.__pause = true; const res = []; const pc = { react: .14, err: 4, spd: 1, fwd: .5, block: .4, slip: .015, iq: .9, dive: .5, spike: 0, set: 0, read: 0 };
    for (let run = 0; run < N; run++) {
      volei.init(); OPP.rapida.lvl = 1.02; volei.state = 'rally'; volei.hits = 2; volei.server = 0; volei.held = false; volei.touches = [0, 0];
      const B = volei.b; B.x = 140; B.y = 60; B.vx = 95 + run * 20; B.vy = -230; B.spin = 0; volei.side = 0;
      Object.assign(volei.P[1], { x: 330, vx: 0, g: true, y: VGY }); Object.assign(volei.P[0], { x: 100 });
      let t = 0; const rec = [];
      for (let f = 0; f < 110; f++) {
        const A = { t: 0, tx: 70 };
        for (let s2 = 0; s2 < 2; s2++) { volei.update(DT, { l: false, r: false, u: false, ax: 0, auto: true }); t += DT; }
        { const g = cv.getContext('2d'), K0 = cv.width / W; g.setTransform(K0, 0, 0, K0, 0, 0); withCtx(g, () => volei.draw(t)); g.setTransform(1, 0, 0, 1, 0, 0); }
        const st = window.__stOf('bl51'); rec.push(`${st.last}${st.L ? '/' + st.L : ''} x${Math.round(volei.P[1].x)} vx${Math.round(volei.P[1].vx)}`);
        if (volei.state !== 'rally') break;
        if (run === 0 && f % 1 === 0 && f < 60) { const c = document.createElement('canvas'); const K = cv.width / W; const px = volei.P[1].x * K, py = volei.P[1].y * K; c.width = 220; c.height = 200; c.getContext('2d').drawImage(cv, px - 110, py - 170, 220, 200, 0, 0, 220, 200); res.push(c.toDataURL()); }
      }
      res.push(rec.join(' | '));
    }
    return res;
  }, N);
  const imgs = out.filter((s) => s.startsWith('data:')); imgs.forEach((d, i) => fs.writeFileSync(`vid/r_${String(i).padStart(2, '0')}.png`, Buffer.from(d.split(',')[1], 'base64')));
  out.filter((s) => !s.startsWith('data:')).forEach((s) => console.log(s, '\n'));
  console.log(errs.join(' | ') || 'ok'); await b.close();
})();
