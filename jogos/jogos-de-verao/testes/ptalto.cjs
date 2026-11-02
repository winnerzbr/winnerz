// Patins (02/11, pedidos do dono): (1) itens altos com a janela livre para abaixar, pegar impulso e pular; (2) segurar ▼ até pousar = pousa abaixado.
// Jogador automático: para cada item alto (fora do corrimão) abaixa a tempo, pula com o impulso na hora certa; no resto do tempo usa a
// busca do jogo (nada, abaixar ou pular) para não tomar tombo. Compara com a regra antiga da janela desligada.
const { chromium } = require('playwright');
const N = Number(process.argv[2] || 16);
(async () => {
  const b = await chromium.launch(), p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  const sim = async (semJanela) => p.evaluate(([N, semJanela]) => {
    window.__ptSemJanela = semJanela; const P = patins; let altos = 0, pegos = 0, tombos = 0, tombosAlto = 0, frames = 0;
    for (let g = 0; g < N; g++) {
      P.init(); let op = { pula: false, d: false }, k = 0, vistos = new Set(), cargaAlvo = null;
      for (let f = 0; f < 60 * 62; f++) {
        const px = P.d + PPX, it = P.obs.find((o) => o.alto && !o.trilho && !o.got && o.x + 10 > px - 7);
        let I = {};
        const b0 = P.bumps;
        if (it && !P.air && !P.grind) {
          const t = (it.x + 5 - px) / P.v;
          if (t <= .47 && (P.carga || 0) >= PT_CARGA) { I = { pu: true }; cargaAlvo = it; }
          else if (t <= .47 + .25 + .14 && t > .3) I = { d: true };
          else { if (k++ % 6 === 0) { const r = window.__ptBusca(P, P.obs); op = r && r.op ? r.op : op; } I = op.pula ? { pu: true } : { d: op.d }; }
        } else { if (k++ % 6 === 0) { const r = window.__ptBusca(P, P.obs); op = r && r.op ? r.op : { pula: false, d: false }; } I = P.air ? {} : op.pula ? { pu: true } : { d: op.d }; }
        if (P.update(DT, I)) break; frames++;
        if (P.bumps > b0) { tombos++; if (cargaAlvo && !cargaAlvo.got && cargaAlvo.x + 10 > P.d + PPX - 30) tombosAlto++; }
        for (const o of P.obs) if (o.alto && !o.trilho && o.x + 10 < P.d + PPX - 7 && !vistos.has(o)) { vistos.add(o); altos++; if (o.got) pegos++; }
      }
    }
    return { altos, pegos, tombos, tombosAlto, janelas: P.ptJanelas || 0 };
  }, [N, semJanela]);
  const antes = await sim(true), depois = await sim(false);
  console.log(`regra antiga: itens altos ${antes.pegos} de ${antes.altos} pegos com o impulso · tombos ${antes.tombos} (${antes.tombosAlto} indo atrás do item)`);
  console.log(`regra nova:   itens altos ${depois.pegos} de ${depois.altos} pegos com o impulso · tombos ${depois.tombos} (${depois.tombosAlto} indo atrás do item)`);
  // pousar segurando ▼
  const pouso = await p.evaluate(() => {
    const P = patins; P.init(); P.obs = []; P.nextArr = 1e9; const out = [];
    for (const segura of [false, true]) {
      P.air = false; P.y = 0; P.bumps = 0; P.update(DT, { pu: true }); let f = 0;
      while (P.air && f++ < 200) { const I = segura && P.vy < 0 ? { d: true, pd: f === 1 } : {}; P.update(DT, I); }
      const depois = []; for (let q = 0; q < 12; q++) { P.update(DT, segura ? { d: true } : {}); }
      out.push({ segura, tombo: P.bumps, abaixado: P.crouch, carga: +(P.carga || 0).toFixed(2) });
      P.update(DT, { pu: true }); out[out.length - 1].impulso = !!P.impulso; P.update(DT, {}); while (P.air) P.update(DT, {});
    }
    return out;
  });
  for (const r of pouso) console.log(`pouso ${r.segura ? 'segurando ▼' : 'sem ▼     '}: tombo ${r.tombo} · abaixado ${r.abaixado} · carga ${r.carga} s · pulo seguinte com impulso ${r.impulso}`);
  console.log(errs.slice(0, 3).join(' | ') || 'sem erros'); await b.close();
})();
