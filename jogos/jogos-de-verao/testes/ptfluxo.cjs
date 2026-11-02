// Patins (01/11): pulo + manobra no ar + pouso no corrimão. Para cada manobra, com pulo normal e com impulso (agachado 0,3 s antes),
// a manobra começa 0,15 s depois do pulo (tempo de gente); tenta pular em vários momentos antes do corrimão e conta quantas vezes começa a deslizar sem tombo.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { choose(patins); start(); }); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    const P = patins, out = {};
    for (const [nome, tecla] of [['sem manobra', null], ['Aviãozinho', 'pb'], ['Tesoura', 'pc'], ['Mortal', 'pe'], ['giro', 'giro']]) for (const imp of [false, true]) {
      let ok = 0, n = 0;
      for (let i = 0; i < 50; i++) {
        P.init(); P.t = 20; P.left = 60; P.v = 150; P.nextArr = 1e9; const o = { k: 'corrimao', x: P.d + 300, w: 110 }; P.obs = [o];
        const jt = .7 + i * .018; let t = 0, pulou = false, fez = false;
        for (let k = 0; k < 200; k++) {
          const I = {}; if (imp && !pulou && t > jt - .3) I.d = 1;
          if (!pulou && t >= jt) { I.pu = 1; I.u = 1; pulou = true; }
          else if (pulou && !fez && P.air && t >= jt + .15) { fez = true; if (tecla === 'giro') { I.pu = 1; } else if (tecla) I[tecla] = 1; }
          P.update(1 / 60, I); t += 1 / 60;
        }
        n++; if (o.grinded && !P.bumps) ok++;
      }
      out[nome + (imp ? ' + impulso' : '')] = ok + '/' + n;
    }
    return JSON.stringify(out, null, 1);
  });
  console.log(r); console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
