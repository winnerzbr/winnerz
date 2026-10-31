// corrida de bugue: bugues não se sobrepõem (corridas automáticas: a maior sobreposição entre corpos depois de cada passo),
// caixa pega encostando (passando ao lado a várias distâncias) e reaparece em 2 s; esteira de turbo mais larga
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1000);
  console.log(await p.evaluate(() => {
    const ev = bugue, out = [];
    // 1) sobreposição: 3 corridas inteiras
    let maxPen = 0, frames = 0, fundo = 0;
    for (const ti of [0, 1, 2]) { ev.cup = null; ev.trackSel = ti; ev.init(); ev.started = true; ev.race = 0;
      for (let s = 0; s < 60 * 70; s++) { ev.update(DT, {}); frames++;
        for (let a = 0; a < 6; a++) for (let c = a + 1; c < 6; c++) { const A = ev.K[a], B = ev.K[c]; if (A.z > 4 || B.z > 4) continue; let pen = 0;
          for (const sa of [-1, 1]) for (const sb of [-1, 1]) { const d = Math.hypot(A.x + Math.cos(A.h) * BG.kf * sa - B.x - Math.cos(B.h) * BG.kf * sb, A.y + Math.sin(A.h) * BG.kf * sa - B.y - Math.sin(B.h) * BG.kf * sb); pen = Math.max(pen, 2 * BG.kr - d); }
          maxPen = Math.max(maxPen, pen); if (pen > 3) fundo++; } } }
    out.push(`sobreposição: maior ${maxPen.toFixed(1)} (corpo tem ${2 * BG.kr} de largura) · quadros com mais de 3: ${fundo} de ${frames}`);
    // 2) caixa: passando ao lado
    ev.cup = null; ev.trackSel = 0; ev.init(); ev.started = true; ev.race = 0; const bx0 = ev.boxes.find((q) => q.j === 0), L = BG_LINE[bx0.i], L2 = BG_LINE[(bx0.i + 2) % BG_LINE.length], h = Math.atan2(L2[1] - L[1], L2[0] - L[0]);
    const res = [];
    for (const off of [0, 8, 12, 14, 16, 18, 20]) { ev.boxes.forEach((q) => { q.t = 0; }); const me = ev.me; me.items = []; ev.K.forEach((k) => { if (!k.me) { k.x = -9999; k.y = -9999; } });
      for (let x = -40; x <= 40; x += 2) { me.x = L[0] + Math.cos(h) * x - Math.sin(h) * off; me.y = L[1] + Math.sin(h) * x + Math.cos(h) * off; me.h = h; me.z = 0; ev.items(1 / 60); }
      res.push(`${off}:${bx0.t > 0 ? 'pegou' : 'não'}`); }
    out.push('caixa do meio passando ao lado (distância do centro do bugue ao da caixa; o bugue tem ~9 de meia largura e a caixa 7 de raio): ' + res.join(' '));
    ev.boxes.forEach((z) => { z.t = 0; }); const me2 = ev.me; me2.items = []; me2.x = L[0]; me2.y = L[1]; ev.items(1 / 60); me2.x = -9999; const q = bx0; let t = 0; while (q.t > 0 && t < 10) { ev.items(1 / 60); t += 1 / 60; } out.push(`caixa voltou em ${t.toFixed(2)} s`);
    out.push(`esteira: largura ${BG.padW * 2}`);
    return out.join('\n');
  }));
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
