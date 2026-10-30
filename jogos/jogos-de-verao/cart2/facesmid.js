// todos os quadros dos dois personagens, recortados na cabeça, com o rosto de verdade do jogo
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const WHO = process.argv[2] || 'ia', Z = +(process.argv[3] || 150), COLS = +(process.argv[4] || 16), ONLY = process.argv[5] || '';
(async () => {
  const b = await chromium.launch(), pg = await (await b.newContext({ viewport: { width: 1360, height: 980 } })).newPage();
  await pg.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:8765/index.html'); await pg.waitForTimeout(900);
  await pg.evaluate(() => choose(volei)); await pg.waitForTimeout(300); await pg.click('#b-play'); await pg.waitForTimeout(2500);
  const d = await pg.evaluate(([WHO, Z, COLS, ONLY]) => {
    const M = WHO === 'ia' ? window.MV5 : window.MVB, fr = window.__fr[WHO], S = WHO === 'ia' ? 56 / 325 / M.q : 34.8 / 152;
    const L = []; for (const [an, A] of Object.entries(M.a)) { if (ONLY && !ONLY.split(',').includes(an)) continue; A.f.forEach((f, k) => { f.s && L.push([an, k, f]); if (A.m && A.m[k]) L.push([an, k + .5, A.m[k]]); }); }
    const c = document.createElement('canvas'), R = Math.ceil(L.length / COLS); c.width = COLS * Z; c.height = R * Z; const g = c.getContext('2d');
    g.fillStyle = '#2a8a3a'; g.fillRect(0, 0, c.width, c.height);
    L.forEach(([an, k, f], i) => {
      const x = (i % COLS) * Z, y = Math.floor(i / COLS) * Z, sc = Z / (Math.max(f.s[2] - f.s[0], f.s[3] - f.s[1]) * 2.1);
      const cx = (f.s[0] + f.s[2]) / 2, cy = (f.s[1] + f.s[3]) / 2;
      g.save(); g.beginPath(); g.rect(x, y, Z, Z); g.clip(); g.translate(x + Z / 2, y + Z / 2); g.scale(sc / S, sc / S); g.translate(-(cx - f.ax) * S, -(cy - f.ay) * S);
      withCtx(g, () => { ctx.imageSmoothingEnabled = true; fr(an, k, 'x', 0, false); }); g.restore();
      g.fillStyle = '#ff0'; g.font = '11px sans-serif'; g.fillText(an + k + ' ' + Math.round((f.r || 0) * 57.3), x + 2, y + 11);
    });
    return c.toDataURL('image/png');
  }, [WHO, Z, COLS, ONLY]);
  const out = path.join(__dirname, '..', 'ashots', 'mids_' + WHO + (ONLY ? '_' + ONLY.replace(/,/g, '-') : '') + '.png');
  fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64')); console.log(errs.length ? errs.slice(0, 5) : 'sem erros', out);
  await b.close();
})();
