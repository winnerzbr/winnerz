// Copa das Dunas: as 3 pistas no piloto automático (tempos, bugues presos, batidas fortes, quem pegou o atalho) e uma Copa inteira
const { chromium } = require('playwright');
const N = Number(process.argv[2] || 4);
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  console.log(await p.evaluate((N) => {
    const ev = bugue, o = [];
    for (let ti = 0; ti < BG_TRACKS.length; ti++) {
      let stuck = 0, hard = 0, tm = [], pos = [], sc = 0, fofa = 0, air = 0;
      for (let m = 0; m < N; m++) {
        ev.cup = null; ev.cupNew = false; ev.trackSel = ti; ev.init(); ev.ctlOf = function () { return this.aiCtl(this.me, DT); }; let t = 0;
        for (; t < 240; t += DT) { const f0 = ev.fx.length; ev.update(DT, { a: ev.race > -.3 }); for (const f of ev.fx.slice(f0)) if (f.k === 'batida') hard++;
          for (const k of ev.K) { if (k.gnd === 'fofa') fofa += DT; if (k.z > 0) air += DT; if (BG_LAGOA && ev.near(k)[1] > BG.hw + 10) sc += DT; }
          if (ev.done) break; }
        if (!ev.done) { stuck++; o.push(`  preso: ${JSON.stringify(ev.K.map((k) => [k.x | 0, k.y | 0, k.s | 0, k.seg, k.lap]))}`); }
        tm.push(ev.race.toFixed(0)); pos.push(ev.rank);
      }
      delete ev.ctlOf;
      o.push(`${BG_TRACKS[ti].name}: tempos ${tm.join(', ')} s · posições ${pos.join(', ')} · presos ${stuck} · batidas fortes por corrida ${(hard / N).toFixed(1)} · no atalho ${(sc / N).toFixed(1)} s · na areia fofa ${(fofa / N).toFixed(1)} s · no ar ${(air / N).toFixed(1)} s`);
    }
    // uma Copa inteira (jogador no piloto automático, aperta ✕ na classificação)
    ev.trackSel = 0; ev.cupNew = true; ev.init(); ev.ctlOf = function () { return this.aiCtl(this.me, DT); };
    let t = 0, fim = false, inter = 0, prevI = false; const pistas = [];
    for (; t < 900; t += DT) {
      const I = { a: ev.race > -.3, pa: false };
      if (ev.inter && ev.inter.t > 1.5) { I.pa = true; } if (ev.inter && !prevI) { inter++; pistas.push(`${BG_T.name}: ${ev.rank}º`); } prevI = !!ev.inter;
      if (ev.update(DT, I)) { fim = true; break; }
    }
    delete ev.ctlOf;
    o.push(`Copa: terminou ${fim} · ${pistas.join(' · ')} · classificações mostradas ${inter} · resultado: ${JSON.stringify(ev.cupRes)} · nota ${ev.score}`);
    o.push('resumo: ' + ev.stats().join(' | '));
    return o.join('\n');
  }, N));
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
