// Patins (01/11): sempre tem saída. Um jogador perfeito (a mesma busca do jogo, escolhendo a cada 1/30 s) joga partidas inteiras de 60 s.
// Com a conferência ligada não pode tomar nenhum tombo; desligada (como era antes), mostra quantas situações sem saída apareciam.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => { choose(patins); start(); }); await p.waitForTimeout(2500);
  for (const sem of [true, false]) {
    const r = await p.evaluate(async (sem) => {
      const PS = 6; window.__ptSemConferir = sem; const P = patins, U = P.update.bind(P), out = { partidas: 0, tombos: 0, semSaida: 0, atrasos: 0, tirados: 0, pisoes: 0, corrimaos: 0, ms: 0, porque: {} };
      const fm = window.failMsg; window.failMsg = (w) => { out.porque[w] = (out.porque[w] || 0) + 1; };
      const t0 = performance.now();
      for (let g = 0; g < 60; g++) {
        P.init(); let op = { pula: false, d: false }, fim = false;
        for (let f = 0; f < 3700 && !fim; f++) {
          if (f % PS === 0) { const r = window.__ptBusca(P, P.obs); if (r && r.op) op = r.op; else { out.semSaida++; op = { pula: false, d: false }; } }
          fim = U(1 / 60, { pu: op.pula && f % PS === 0, u: op.pula, d: op.d });
          if (f % PS === 0) op = { pula: false, d: op.d };
        }
        out.partidas++; out.tombos += P.bumps; out.atrasos += P.ptAtrasos || 0; out.tirados += P.ptTirados || 0; out.pisoes += P.pisoes || 0; out.corrimaos += P.grinds;
        if (performance.now() - t0 > 150000) break;
      }
      window.failMsg = fm; out.ms = Math.round(performance.now() - t0); window.__ptSemConferir = false; return out;
    }, sem);
    console.log(sem ? 'SEM a conferência (como era):' : 'COM a conferência:', JSON.stringify(r));
  }
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
