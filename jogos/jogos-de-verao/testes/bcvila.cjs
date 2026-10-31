// bocha: a vila pintada nos 4 horários (e na troca de um para outro), com a cancha do jogo em cima da cancha pintada (fotos)
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  await p.evaluate(() => { choose(bocha); start(); }); await p.waitForTimeout(1800);
  console.log('vila carregou:', await p.evaluate(() => window.__BCCOK && window.__BCCOK()));
  await p.evaluate(() => { const e = bocha; e.demo(); e._up = e.update; e.update = () => false; e.state = 'aim'; e.who = 0; e.toss = 'ball'; e.kind = 'rolar'; e.charging = true; e.m = .5; });
  const cv = p.locator('canvas').first();
  for (const [nm, h] of [['manha', 7], ['dia', 13], ['tarde', 17.5], ['noite', 22], ['troca_tarde_noite', 19]]) {
    await p.evaluate((h) => { window.__skHora = h; }, h); await p.waitForTimeout(200); await cv.screenshot({ path: `amg/bcv_${nm}.png` });
  }
  console.log('cancha:', await p.evaluate(() => ({ pintada: bocha.paintedCourt })));
  console.log(errs.join(' | ') || 'sem erros'); await b.close(); })();
