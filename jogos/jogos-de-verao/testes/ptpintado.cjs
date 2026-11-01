// Patins pintado (01/11): o Calçadão das Ondas nos 4 horários com todos os obstáculos, prêmios e o corrimão; e uma partida com o teclado.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); fs.mkdirSync('amg', { recursive: true });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__skHora = 12; choose(patins); start(); }); await p.waitForTimeout(4500);
  console.log('pintado carregado:', await p.evaluate(() => window.__PTOK && window.__PTOK()));
  await p.evaluate(() => { window.__pu = patins.update; patins.update = function (dt) { this.t += dt; return false; };
    const d = patins.d; patins.obs = [{ k: 'buraco', x: d + 140, w: 30 }, { k: 'coco', x: d + 190, r: 1 }, { k: 'queda', x: d + 220, h: 60 }, { k: 'bola', x: d + 250, y: PGY - 30 },
      { k: 'corrimao', x: d + 280, w: 90 }, { k: 'picole', x: d + 120, y: PGY - 40 }, { k: 'agua', x: d + 175, y: PGY - 50 }, { k: 'bot', x: d + 380 }]; });
  const clip = { x: 0, y: 300, width: 900, height: 470 };
  for (const h of [7, 12, 17.5, 22]) { await p.evaluate((h) => { window.__skHora = h; }, h); await p.waitForTimeout(250); await p.screenshot({ path: `amg/pt_hora_${h}.png`, clip }); }
  // o IAmiguinho pintado em cada situação
  console.log('IAmiguinho pintado:', await p.evaluate(() => window.__PTIOK && window.__PTIOK()));
  const est = [['passada', '{air:false,y:0,crouch:false,grind:false,trick:null,grab:false,spinning:false,deadT:0,inv:0}'], ['agacha', '{crouch:true}'], ['salto', '{crouch:false,air:true,y:40,vy:120}'],
    ['grab', '{grab:true,grabT:.5}'], ['aviao', '{grab:false,trick:{k:"aviao",t:.18,d:.36}}'], ['tesoura', '{trick:{k:"tesoura",t:.15,d:.3}}'], ['mortal', '{trick:{k:"mortal",t:.2,d:.54}}'],
    ['giro', '{trick:null,spinning:true,rot:1.6}'], ['soul', '{spinning:false,air:false,y:PT_RH,grind:true,gStyle:"soul"}'], ['royale', '{gStyle:"royale"}'], ['baixo', '{gStyle:"agachado"}'], ['queda', '{grind:false,y:0,deadT:.9}']];
  for (const [nm, js] of est) { await p.evaluate((js) => { window.__skHora = 12; Object.assign(patins, eval('(' + js + ')')); }, js); await p.waitForTimeout(200); await p.screenshot({ path: `amg/pt_ia_${nm}.png`, clip: { x: 60, y: 420, width: 420, height: 300 } }); }
  await p.evaluate(() => { patins.deadT = 0; patins.update = window.__pu; window.__skHora = 12; choose(patins); start(); }); await p.waitForTimeout(4200);
  for (let i = 0; i < 8; i++) { await p.keyboard.press('Space'); await p.waitForTimeout(600); }
  await p.screenshot({ path: 'amg/pt_jogo.png', clip });
  console.log('estado:', await p.evaluate(() => [mode, patins.score, patins.falls].join(' · ')));
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
