// pingue-pongue pelo teclado: anda, saca e prepara a raquete; no 2 jogadores, confere as teclas do jogador 2
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  await p.evaluate(() => { choose(pingue); start(); }); await p.waitForTimeout(1200);
  const st = () => p.evaluate(() => ({ x: pingue.P[0].x.toFixed(0), state: pingue.state, arm: pingue.P[0].arm && pingue.P[0].arm.kind, toss: pingue.b.toss, hits: pingue.hits, x2: pingue.P[1].x.toFixed(0), arm2: pingue.P[1].arm && pingue.P[1].arm.kind }));
  console.log('início', await st());
  await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(400); await p.keyboard.up('ArrowLeft'); console.log('◀ 0,4 s', await st());
  await p.keyboard.press('Space'); await p.waitForTimeout(150); console.log('Espaço (saque)', await st());
  await p.waitForTimeout(900); console.log('depois do saque', await st());
  await p.keyboard.press('KeyX'); await p.waitForTimeout(50); console.log('X', await st());
  await p.evaluate(() => { pingue.two = true; pingue.init(); }); await p.waitForTimeout(200);
  await p.keyboard.down('KeyJ'); await p.waitForTimeout(300); await p.keyboard.up('KeyJ'); console.log('2P: J', await st());
  await p.evaluate(() => { pingue.server = 1; pingue.resetServe(); }); await p.waitForTimeout(400);
  await p.keyboard.press('KeyU'); await p.waitForTimeout(100); console.log('2P: U saca com efeito', await st());
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
