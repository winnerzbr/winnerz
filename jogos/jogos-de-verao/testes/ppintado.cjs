// pingue-pongue pintado (IAmiguinho, 8 pranchas): os 8 movimentos, o jogo rodando (saque com a bolinha na mão, batidas), sem erros
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); fs.mkdirSync('amg', { recursive: true });
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(2500);
  await p.waitForFunction(() => window.__PIOK && window.__PIOK(), null, { timeout: 20000 });
  // folha com os 8 movimentos (8 quadros cada)
  const folha = await p.evaluate(() => { const c = document.createElement('canvas'), N = Object.keys(MVPI.a); c.width = 8 * 90; c.height = N.length * 80; const g = c.getContext('2d'); g.fillStyle = '#e8dcc4'; g.fillRect(0, 0, c.width, c.height);
    const sv = ctx; ctx = g; try { N.forEach((an, r) => { for (let k = 0; k < 8; k++) { g.save(); g.translate(45 + k * 90, 74 + r * 80); g.scale(1, 1); __fr.pi(an, k, 0, false); g.restore(); } g.fillStyle = '#1b1f4f'; g.font = '11px sans-serif'; g.fillText(an, 4, 12 + r * 80); }); } finally { ctx = sv; } return c.toDataURL(); });
  fs.writeFileSync('amg/pp_pintado_folha.png', Buffer.from(folha.split(',')[1], 'base64'));
  await p.evaluate(() => { choose(pingue); start(); pingue.controls = function (I, dt) { return [this.brain(0, dt, .85), this.brain(1, dt, this.accNow())]; }; });
  const estados = new Set(); let n = 0;
  for (let i = 0; i < 260 && n < 7; i++) {
    const r = await p.evaluate(() => { const ev = pingue, P = ev.P[0]; return { arm: P.arm ? (P.arm.serve ? 'saque' : P.arm.kind) : '', sw: P.sw ? (P.sw.serve ? 'saque' : P.sw.label || P.sw.kind) : '', mv: P.mvT > 0, held: ev.state === 'serve' && ev.server === 0 && ev.b && ev.b.held }; }).catch(() => null);
    if (r) { const key = r.sw ? 'bate:' + r.sw : r.arm ? 'prepara:' + r.arm : r.held ? 'bola na mão' : r.mv ? 'andando' : 'esperando'; if (!estados.has(key)) { estados.add(key); await p.screenshot({ path: `amg/pp_pintado_${n++}.png`, clip: { x: 60, y: 320, width: 780, height: 380 } }); } }
    await p.waitForTimeout(60);
  }
  console.log('estados vistos:', [...estados].join(', '));
  console.log(errs.join(' | ') || 'sem erros'); await b.close(); })();
