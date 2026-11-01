// imagem: os quadros do IAmiguinho do vôlei sem e com a configuração do dono (cfg_dono.json)
const { chromium } = require('playwright'); const fs = require('fs');
const CFG = JSON.parse(fs.readFileSync(__dirname + '/cfg_dono.json', 'utf8'));
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1200, height: 700 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto('http://localhost:8765/index.html?wzlocal=1'); await p.waitForTimeout(2500);
  const png = await p.evaluate((cfg) => {
    const Q = [['readyU', 0, 'Preparado (alto)'], ['serve', 23, 'Saque'], ['set', 11, 'Levantamento'], ['spike', 10, 'Cortada'], ['dive', 21, 'Peixinho']];
    const cv = document.createElement('canvas'), W = 220, H = 230; cv.width = W * Q.length; cv.height = H * 2 + 70; const g = cv.getContext('2d');
    g.fillStyle = '#f4efe4'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#1b1f4f'; g.font = 'bold 15px sans-serif';
    const desenha = (lin) => Q.forEach(([an, k, nome], i) => { const save = ctx; ctx = g; try { g.save(); g.translate(i * W + W / 2, 60 + lin * (H + 10) + H - 25); g.scale(3, 3); window.__fr.ia(an, k, 'g', 0, false); g.restore(); } finally { ctx = save; }
      g.fillText(nome, i * W + 8, 60 + lin * (H + 10) + 16); });
    WZ.apply({}); g.fillStyle = '#e8484a'; g.font = 'bold 17px sans-serif'; g.fillText('Como o jogo vem de fábrica', 8, 22); g.fillStyle = '#1b1f4f'; g.font = 'bold 15px sans-serif'; desenha(0);
    g.fillStyle = '#e8484a'; g.font = 'bold 17px sans-serif'; g.fillText('Com as mudanças que estão guardadas (aplicadas às 00h57)', 8, 60 + H + 2); g.fillStyle = '#1b1f4f'; g.font = 'bold 15px sans-serif'; WZ.apply(cfg); desenha(1);
    return cv.toDataURL('image/png');
  }, CFG);
  fs.writeFileSync('amg/wz_comparar.png', Buffer.from(png.split(',')[1], 'base64')); console.log('ok'); await b.close(); })();
