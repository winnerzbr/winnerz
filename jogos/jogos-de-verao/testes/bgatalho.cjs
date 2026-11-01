// corrida de bugue com atalhos curtos demais (dois cliques quase no mesmo lugar no editor): antes quebrava o desenho (sem bugues); agora o atalho curto fica de fora
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(2500);
  for (const ts of [0, 1, 2]) {
    await p.evaluate((ts) => { WZ.apply(WZ_SEMENTE.aplicado.cfg); const e = EVENTS.find((x) => x.id === 'bugue'); bugue.trackSel = ts; choose(e); start(); }, ts);
    await p.waitForTimeout(3000); await p.screenshot({ path: `amg/bgatalho_${ts}.png` });
    console.log(ts, await p.evaluate(() => JSON.stringify({ T: BG_T && BG_T.name, line: BG_T && BG_T.line && BG_T.line.length, karts: (bugue.karts || []).length })).catch((e) => e.message));
  }
  console.log([...new Set(errs)].slice(0, 8).join('\n') || 'sem erros'); await b.close(); })();
