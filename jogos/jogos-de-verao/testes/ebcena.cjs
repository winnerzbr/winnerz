// embaixadinha pintada: Praia do Centro nos 4 horários (com as bolas, a biruta e a gaivota) e a comemoração que ficava presa
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  await p.evaluate(() => { choose(embaixadinha); start(); }); await p.waitForTimeout(1500);
  const cv = p.locator('canvas').first();
  await p.evaluate(() => { const e = embaixadinha; e._up = e.update; e.update = () => false; });
  const cenas = [[12, 'futebol', 0, 1], [7.5, 'praia', 30, 1], [17.5, 'pingue', 60, 0], [22, 'gude', -55, 1]];
  for (const [h, kind, wind, gull] of cenas) {
    await p.evaluate(([h, kind, wind, gull]) => { window.__skHora = h; const e = embaixadinha, bl = e.balls[0]; Object.assign(bl, { kind, serve: 0, x: e.px + 30, y: 90, vy: 30, vx: 0 }); e.wind = wind; e.gull = gull ? { x: 90, y: 50, dir: 1, v: 0 } : null; }, [h, kind, wind, gull]);
    for (let i = 0; i < 20; i++) { await p.waitForTimeout(250); if (await p.evaluate(() => Object.keys(window).length && true)) break; }
    await p.waitForTimeout(1500); await cv.screenshot({ path: `amg/ebc_${h}.png` });
  }
  // comemoração: depois de recomeçar a partida (relógio volta ao começo), ela não pode ficar presa
  const r = await p.evaluate(() => { const e = embaixadinha; e.update = e._up; const L = []; e.cheer = 1; for (const b0 of e.balls) b0.serve = 0; e.balls[0].y = 20; e.balls[0].vy = -200;
    L.push(window.__ebPick(500)[0]); L.push(window.__ebPick(500.3)[0]); L.push(window.__ebPick(501.5)[0]); e.cheer = 0;
    e.init(); L.push(window.__ebPick(1)[0]); L.push(window.__ebPick(2)[0]); L.push(window.__ebPick(3)[0]); return L.join(' → '); });
  console.log('comemoração:', r); console.log(errs.join(' | ') || 'sem erros'); await b.close(); })();
