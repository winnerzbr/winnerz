// embaixadinha: bola de pingue-pongue nas séries 7, 11...; fotos com a bola chegando (sem as marcas das alturas em volta do IAmiguinho)
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { choose(embaixadinha); start(); }); await p.waitForTimeout(600);
  // série 1, bola chegando na coxa: antes apareciam as marcas das três alturas
  await p.evaluate(() => { const e = embaixadinha, bl = e.balls[0]; Object.assign(bl, { serve: 0, x: e.px + 4, y: EB_ZONAS[1].y - 20, vx: 0, vy: 60 }); e._up = e.update; e.update = () => false; });
  await p.waitForTimeout(200); await p.locator('canvas').first().screenshot({ path: 'amg/eb_sem_marcas.png' });
  // sobe até a série 7: a bola vira de pingue-pongue
  const r = await p.evaluate(() => { const e = embaixadinha; e.update = e._up; e.touches = 6 * EB_SERIE; e.levelUp(7); const bl = e.balls[0];
    return `série ${e.nivel} · pingue ${bl.pingue} · praia ${bl.praia} · gravidade ${e.gOf(bl).toFixed(0)} (normal ${e.cfg().g}) · vento ×${(e.axOf({ ...bl, cv: 0 }) / (e.wind || 1)).toFixed(1)}`; });
  console.log(r);
  await p.evaluate(() => { const e = embaixadinha, bl = e.balls[0]; Object.assign(bl, { serve: 0, x: e.px + 4, y: EB_ZONAS[1].y - 40, vx: 0, vy: 40 }); e.update = () => false; });
  await p.waitForTimeout(200); await p.locator('canvas').first().screenshot({ path: 'amg/eb_pingue.png' });
  // a série 8 volta para a bola normal; a 11 é pingue-pongue de novo
  console.log(await p.evaluate(() => { const e = embaixadinha; e.update = e._up; e.levelUp(8); const a = e.balls[0].pingue; e.levelUp(11); return `série 8 pingue ${a} · série 11 pingue ${e.balls[0].pingue}`; }));
  console.log(errs.join(' | ') || 'sem erros'); await b.close(); })();
