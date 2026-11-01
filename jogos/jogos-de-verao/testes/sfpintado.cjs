// Surfe pintado (01/11): fotos de cada situação (em pé, subindo, tubo, pouso, voo, manobras, giro, caldo) e dos 4 horários.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); fs.mkdirSync('amg', { recursive: true });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__skHora = 12; choose(surfe); start(); }); await p.waitForTimeout(5000);
  console.log('pintado carregado:', await p.evaluate(() => window.__SFOK && window.__SFOK()));
  await p.evaluate(() => { const u0 = surfe.update; window.__u0 = u0; surfe.update = function (dt, I) { this.t += dt; return false; }; });
  const shots = [
    ['pe', 'Object.assign(surfe,{air:false,y:150,vy:0,tube:null,landT:0,fallT:0,inv:0,trick:null,spinning:false})'],
    ['sobe', 'Object.assign(surfe,{vy:-90})'],
    ['tubo', 'Object.assign(surfe,{vy:0,tube:{},tubes:[{x0:surfe.x-120,x1:surfe.x+160,roof:surfe.lip+6,band:20}],y:surfe.lip+6+40})'],
    ['pouso', 'Object.assign(surfe,{tube:null,tubes:[],landT:.14,y:surfe.lip+8})'],
    ['voo', 'Object.assign(surfe,{landT:0,air:true,y:60,avy:-90})'],
    ['super', 'Object.assign(surfe,{trick:{k:"superman",t:.3,d:.55},avy:10})'],
    ['indy', 'Object.assign(surfe,{trick:{k:"indy",t:.2,d:.38}})'],
    ['rabeta', 'Object.assign(surfe,{trick:{k:"rabeta",t:.2,d:.4}})'],
    ['mortal', 'Object.assign(surfe,{trick:{k:"mortal",t:.25,d:.62}})'],
    ['giro', 'Object.assign(surfe,{trick:null,spinning:true,rot:.25})'],
    ['caldo1', 'Object.assign(surfe,{spinning:false,air:false,y:150,fallT:1.2})'],
    ['caldo2', 'Object.assign(surfe,{fallT:.5})'],
  ];
  for (const [nm, js] of shots) { await p.evaluate(js); await p.waitForTimeout(250); await p.screenshot({ path: `amg/sf_${nm}.png`, clip: { x: 0, y: 300, width: 900, height: 470 } }); }
  for (const h of [7, 12, 17.5, 22]) { await p.evaluate((h) => { window.__skHora = h; Object.assign(surfe, { fallT: 0, y: 150, objs: [{ k: 'estrela', x: surfe.x + 60, y: 160 }, { k: 'boia', x: surfe.x + 140, y: 170 }, { k: 'alta', x: surfe.x + 30, y: 70 }, { k: 'gaivota', x: surfe.x + 200, y: 60, ph: 0 }, { k: 'drone', x: surfe.x + 250, y: 80 }, { k: 'pedra', x: surfe.x + 100, y: 180 }, { k: 'prancha', x: surfe.x + 180, y: 175 }, { k: 'concha', x: surfe.x + 220, y: 168 }] }); }, h); await p.waitForTimeout(300); await p.screenshot({ path: `amg/sf_hora_${h}.png`, clip: { x: 0, y: 300, width: 900, height: 470 } }); }
  // partida de verdade, com o teclado, para ver se nada quebra
  await p.evaluate(() => { surfe.update = window.__u0; window.__skHora = 12; choose(surfe); start(); }); await p.waitForTimeout(4200);
  for (let i = 0; i < 6; i++) { await p.keyboard.down('Space'); await p.waitForTimeout(700); await p.keyboard.up('Space'); await p.waitForTimeout(150); await p.keyboard.press('KeyX'); await p.waitForTimeout(500); }
  await p.screenshot({ path: 'amg/sf_jogo.png', clip: { x: 0, y: 300, width: 900, height: 470 } });
  console.log('estado:', await p.evaluate(() => [mode, surfe.score, surfe.falls, surfe.airs].join(' · ')));
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
