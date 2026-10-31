// bocha pintada: IAmiguinho (esperando, mirando, lançando, torcendo, ganhou), bolas, conchas, pegadas e tábuas (fotos)
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  await p.evaluate(() => { choose(bocha); start(); }); await p.waitForTimeout(1500);
  console.log('carregou:', await p.evaluate(() => window.__BCOK && window.__BCOK()));
  const cv = p.locator('canvas').first(), shots = [];
  const cena = async (nome, fn) => { await p.evaluate(fn); await p.waitForTimeout(150); await cv.screenshot({ path: `amg/bcp_${nome}.png` }); shots.push(nome); };
  await p.evaluate(() => { const e = bocha; e._up = e.update; e.update = () => false; });
  await cena('mirando', () => { const e = bocha; e.state = 'aim'; e.who = 0; e.charging = true; e.kind = 'rolar'; e.m = .8; });
  await cena('soltando', () => { const e = bocha; e.state = 'roll'; e.throwBy = 0; e.throwT = e.t - .25; e.kind = 'rolar'; });
  await cena('alto', () => { const e = bocha; e.state = 'aim'; e.charging = true; e.kind = 'alto'; e.m = .9; });
  await cena('torcendo', () => { const e = bocha; e.state = 'roll'; e.throwBy = 0; e.throwT = e.t - 1.2; });
  await cena('esperando', () => { const e = bocha; e.state = 'aim'; e.who = 1; e.charging = false; });
  console.log('fotos:', shots.join(', '), errs.join(' | ') || 'sem erros'); await b.close(); })();
