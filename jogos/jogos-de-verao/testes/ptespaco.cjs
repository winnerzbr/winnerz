// Patins (01/11): espaço entre as coisas paradas no chão e itens altos (só com o impulso ou do corrimão).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { choose(patins); start(); }); await p.waitForTimeout(2500);
  for (const sem of [true, false]) {
    console.log(sem ? 'sem o espaçamento (como era):' : 'com o espaçamento:', await p.evaluate((sem) => {
      window.__ptSemEspacar = sem; const P = patins, ext = (o) => o.k === 'bot' ? [o.x - 6, o.x + 22] : o.k === 'buraco' ? [o.x - 6, o.x + o.w + 6] : o.k === 'corrimao' ? [o.x - 8, o.x + o.w + 8] : (o.k === 'picole' || o.k === 'agua') && !o.alto && o.y > PGY - 40 ? [o.x - 2, o.x + 12] : null;
      let pares = 0, colados = 0, botbot = 0, altos = 0, total = 0;
      for (let g = 0; g < 40; g++) { P.init(); const todos = new Set(); for (let f = 0; f < 3600; f++) { P.inv = 9; P.bumps = 0; P.update(1 / 60, {}); for (const o of P.obs) todos.add(o); }
        // posição de cada coisa parada quando nasceu (as que andam não contam)
        const L = [...todos].filter((o) => ext(o)).sort((a, c) => ext(a)[0] - ext(c)[0]); total += L.length;
        for (const o of todos) if (o.alto) altos++;
        for (let i = 1; i < L.length; i++) { const gap = ext(L[i])[0] - ext(L[i - 1])[1]; if (gap < 34) { pares++; if (gap < 10) colados++; if (L[i].k === 'bot' && L[i - 1].k === 'bot') botbot++; } } }
      const L = { length: total };
      window.__ptSemEspacar = false; return JSON.stringify({ objetos: L.length, pertoDemais: pares, colados, amiguinhosColados: botbot, itensAltos: altos });
    }, sem));
  }
  console.log('alcance do item alto:', await p.evaluate(() => {
    const P = patins, res = {};
    for (const [nome, imp, doRail] of [['pulo comum', false, false], ['impulso', true, false], ['pulando do corrimão', false, true]]) {
      let ok = 0;
      for (let i = 0; i < 30; i++) {
        P.init(); P.t = 20; P.v = 150; P.nextArr = 1e9; P.inv = 9; const px = P.d + PPX;
        const it = { k: 'picole', x: px + 150 * 1.6, y: PGY - 128, alto: true, v0: 150 };
        P.obs = doRail ? [{ k: 'corrimao', x: px + 150 * .9, w: 160, v0: 150 }, it] : [it];
        const jt = (doRail ? 1.2 : 1.1) + i * .012; let t = 0, pulou = false, pulou2 = false;
        for (let k = 0; k < 200; k++) { const I = {}; if (doRail) { if (!pulou && t >= .6) { I.pu = 1; pulou = true; } else if (pulou && !pulou2 && P.grind && t >= jt) { I.pu = 1; pulou2 = true; } }
          else { if (imp && !pulou && t > jt - .3) I.d = 1; if (!pulou && t >= jt) { I.pu = 1; pulou = true; } }
          P.update(1 / 60, I); t += 1 / 60; }
        if (it.got) ok++;
      }
      res[nome] = ok + '/30';
    }
    return JSON.stringify(res);
  }));
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
