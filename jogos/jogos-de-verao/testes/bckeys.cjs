// bocha pelo teclado: mira com ▲ ▼, segura Espaço e solta (rolar), segura X e solta (pelo alto); foto da tela
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  await p.evaluate(() => { choose(bocha); start(); }); await p.waitForTimeout(1000);
  const st = () => p.evaluate(() => ({ state: bocha.state, who: bocha.who, toss: bocha.toss, ang: bocha.ang.toFixed(1), m: bocha.m.toFixed(2), jack: bocha.jack && [bocha.jack.x.toFixed(0), bocha.jack.y.toFixed(0)], balls: bocha.balls.length }));
  await p.keyboard.down('ArrowUp'); await p.waitForTimeout(300); await p.keyboard.up('ArrowUp'); console.log('▲', JSON.stringify(await st()));
  await p.keyboard.down('Space'); await p.waitForTimeout(700); console.log('segurando', JSON.stringify(await st())); await p.locator('canvas').first().screenshot({ path: 'amg/bc_mira.png' });
  await p.keyboard.up('Space'); await p.waitForTimeout(100); console.log('soltou', JSON.stringify(await st()));
  for (let i = 0; i < 40; i++) { await p.waitForTimeout(250); const s = await st(); if (s.state === 'aim' && s.who === 0 && s.toss === 'ball') break; }
  console.log('vez da bola', JSON.stringify(await st()));
  await p.keyboard.down('KeyX'); await p.waitForTimeout(600); await p.keyboard.up('KeyX'); await p.waitForTimeout(300); console.log('alto', JSON.stringify(await st()));
  await p.locator('canvas').first().screenshot({ path: 'amg/bc_alto.png' });
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
