// BMX pintado (01/11): fotos de cada situação (pedalando, pump, salto, Superman, Sem mãos, Tailwhip, pouso, queda, vala) e dos 4 horários.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 }); fs.mkdirSync('amg', { recursive: true });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__skHora = 12; choose(bmx); start(); }); await p.waitForTimeout(5000);
  console.log('pintado carregado:', await p.evaluate(() => [window.__BXCOK && window.__BXCOK(), window.__BXIOK && window.__BXIOK()].join(' ')));
  const r = await p.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.x, y: c.y, width: c.width, height: c.height }; });
  await p.evaluate(() => { window.__u = bmx.update; bmx.update = function (dt) { this.t += dt; return false; }; });
  const shots = [
    ['pedal', 'Object.assign(bmx,{air:false,crashT:0,landT:0,pumping:false,trick:null,y:bmx.h(bmx.x),ang:Math.atan(bmx.slope(bmx.x)),pedal:1.3})'],
    ['pump', 'Object.assign(bmx,{pumping:true})'],
    ['salto', 'Object.assign(bmx,{pumping:false,air:true,y:bmx.h(bmx.x)+40,vy:20,airT:.5,ang:.2})'],
    ['super', 'Object.assign(bmx,{trick:{key:"b",...BX_MAN.b,t:.25}})'],
    ['semmao', 'Object.assign(bmx,{trick:{key:"c",...BX_MAN.c,t:.18}})'],
    ['tail', 'Object.assign(bmx,{trick:{key:"e",...BX_MAN.e,t:.2}})'],
    ['pouso', 'Object.assign(bmx,{trick:null,air:false,y:bmx.h(bmx.x),landT:.15,ang:Math.atan(bmx.slope(bmx.x))})'],
    ['queda', 'Object.assign(bmx,{landT:0,crashT:.7,crashX:bmx.x,crashAgua:false,crashAng:0})'],
  ];
  for (const [nm, js] of shots) { await p.evaluate(js); await p.waitForTimeout(200); await p.screenshot({ path: `amg/bx_${nm}.png`, clip: r }); }
  // a vala mais perto
  const temVala = await p.evaluate(() => { const s = bmx.tr.find((q) => q.pit && q.x0 > bmx.x); if (!s) return false; Object.assign(bmx, { crashT: 0, x: s.x0 - 130, air: true, trick: null, y: bmx.h(s.x0 - 130) + 50, vy: 0, airT: .6, ang: 0 }); return true; });
  await p.waitForTimeout(200); await p.screenshot({ path: 'amg/bx_vala.png', clip: r });
  for (const h of [7, 12, 17.5, 22]) { await p.evaluate((h) => { window.__skHora = h; }, h); await p.waitForTimeout(250); await p.screenshot({ path: `amg/bx_hora_${h}.png`, clip: r }); }
  // partida de verdade com o teclado
  await p.evaluate(() => { bmx.update = window.__u; window.__skHora = 12; choose(bmx); start(); }); await p.waitForTimeout(4500);
  for (let i = 0; i < 8; i++) { await p.keyboard.down('Space'); await p.waitForTimeout(600); await p.keyboard.up('Space'); await p.waitForTimeout(250); }
  await p.screenshot({ path: 'amg/bx_jogo.png', clip: r });
  console.log('vala:', temVala, 'estado:', await p.evaluate(() => [mode, bmx.score || bmx.pts | 0, bmx.tombos].join(' · ')));
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
