// embaixadinha: dificuldade progressiva (o que liga em cada série), gaivota que empurra a bola, areia fofa e pedidos da torcida
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  console.log(await p.evaluate(() => { const e = embaixadinha, o = []; e.init();
    for (const n of [1, 3, 4, 5, 7, 8, 9, 11, 14]) { e.nivel = n; const C = e.cfg(); o.push(`série ${n}: bola ${e.kindNow()} · gravidade ${C.g} · vento ${C.wind} · gaivota a cada ~${C.gull ? C.gullT.toFixed(1) + ' s' : '—'} · faixa −${C.aperta} · pedidos ${C.pedido ? 'sim' : 'não'} · sombra ${C.sombra == null ? 'sempre' : 'só abaixo de ' + (EBY - C.sombra) + ' de altura'} · areia fofa ${C.fofa ? 'sim' : 'não'}`); }
    // gaivota encostando em cada tipo de bola
    for (const kind of ['futebol', 'praia', 'gude', 'pingue']) { e.init(); e.nivel = 6; const bl = e.balls[0]; Object.assign(bl, { kind, serve: 0, x: 200, y: 100, vx: 0, vy: 0, cv: 0 }); e.gull = { x: 186, y: 100, y0: 100, dir: 1, v: 90, ph: 0, vy: 0, hit: false }; e.gullT = 99;
      e.update(DT, { ax: 0 }); o.push(`gaivota na bola de ${kind}: empurrou para o lado a ${bl.vx.toFixed(0)} px/s e para cima a ${(-bl.vy).toFixed(0)} px/s`); }
    // areia fofa
    e.init(); e.nivel = 9; e.levelUp(9); const f = e.fofa; e.px = f.x; e.update(.1, { ax: 1 }); const dentro = e.px - f.x; e.px = 40; const x0 = e.px; e.update(.1, { ax: 1 }); o.push(`areia fofa em x=${f.x.toFixed(0)}: anda ${dentro.toFixed(1)} dentro e ${(e.px - x0).toFixed(1)} fora em 0,1 s`);
    // pedidos: 200 toques simulados na série 5
    e.init(); e.nivel = 5; let pedidos = 0, at = 0; for (let i = 0; i < 200; i++) { const bl = e.balls[0]; bl.serve = 0; const z = EB_ZONAS[i % 3]; bl.x = e.px; bl.y = z.y; bl.vy = 50; e.cool = 0; const had = !!e.req; const pts0 = e.pts; e.touch(false); if (had) pedidos++; if ((e.pedidos || 0) > at) at = e.pedidos; }
    o.push(`pedidos: em 200 toques, ${at} atendidos (a torcida pediu em ${pedidos} toques)`);
    return o.join('\n'); }));
  // foto: série 9 com areia fofa, pedido e gaivota
  await p.evaluate(() => { window.__skHora = 12; choose(embaixadinha); start(); }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const e = embaixadinha; e.update = () => false; e.nivel = 9; e.fofa = { x: 140, w: 56 }; e.req = { k: 'coxa', nome: 'Coxa', n: 4 }; const bl = e.balls[0]; Object.assign(bl, { serve: 0, kind: 'futebol', x: e.px + 40, y: 60, vy: 20 }); e.gull = { x: 300, y: 95, y0: 95, dir: -1, v: 0, ph: 0, vy: 0, hit: false }; });
  await p.waitForTimeout(400); await p.locator('canvas').first().screenshot({ path: 'amg/ebdif.png' });
  console.log(errs.join(' | ') || 'sem erros'); await b.close(); })();
