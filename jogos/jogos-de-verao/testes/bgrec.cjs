// corrida de bugue: depois de ser acertado, o bugue volta virado para a frente e fica invencível; de cara na mureta, sai só acelerando e virando
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(), p = await b.newPage(); await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1000);
  console.log(await p.evaluate(() => {
    const ev = bugue, o = [], wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), tg = (k) => { const s = ev.near(k)[0], A = BG_LINE[s], B = BG_LINE[(s + 3) % BG_LINE.length]; return Math.atan2(B[1] - A[1], B[0] - A[0]); };
    let okRec = 0, okWall = 0, N = 20, tMax = 0;
    for (let n = 0; n < N; n++) {
      ev.init(); ev.started = true; ev.race = 1; const me = ev.me, L = BG_LINE[60 + n * 15], L2 = BG_LINE[62 + n * 15];
      // 1) acertado em velocidade: depois de 2 s tem que estar andando para a frente da pista
      me.x = L[0]; me.y = L[1]; me.h = Math.atan2(L2[1] - L[1], L2[0] - L[0]); me.vx = Math.cos(me.h) * 170; me.vy = Math.sin(me.h) * 170; me.seg = 60 + n * 15;
      ev.hit(me, null, 'teste'); let hitAgain = 0; for (let t = 0; t < 2; t += DT) { ev.update(DT, { a: false, ax: 0 }); const lv = me.levou; ev.hit(me, null, 'de novo'); }
      const e = Math.abs(wrap(tg(me) - me.d)); if (e < .6 && me.s > 60 && ev.levou === 1) okRec++; else o.push(`recuperação ${n}: erro ${e.toFixed(2)} vel ${me.s.toFixed(0)} acertado ${ev.levou}`);
      // 2) parado de cara na mureta: acelerar e virar para um lado tem que tirar o bugue em 2 s
      ev.init(); ev.started = true; ev.race = 1; const m2 = ev.me, s0 = 60 + n * 15, A = BG_LINE[s0], B = BG_LINE[s0 + 2], tan = Math.atan2(B[1] - A[1], B[0] - A[0]), side = n % 2 ? 1 : -1, nx = -Math.sin(tan) * side, ny = Math.cos(tan) * side;
      m2.x = A[0] + nx * (BG.hw - BG.r); m2.y = A[1] + ny * (BG.hw - BG.r); m2.h = Math.atan2(ny, nx); m2.vx = m2.vy = 0; m2.seg = s0;
      let solto = 0, saiu = -1; for (let t = 0; t < 1.5; t += DT) { const rel = wrap(m2.h - tg(m2)); if (Math.abs(rel) < .3) solto = 1; ev.update(DT, { a: true, ax: solto ? 0 : (side > 0 ? -1 : 1) }); // vira até ficar de frente e solta, como a pessoa faria
        const dd = ev.near(m2)[1]; if (saiu < 0 && m2.s > 60 && Math.abs(wrap(tg(m2) - m2.d)) < .9) saiu = t; }
      if (saiu >= 0) okWall++; else o.push(`mureta ${n}: vel ${m2.s.toFixed(0)} dist ${ev.near(m2)[1].toFixed(0)}`); if (saiu > tMax) tMax = saiu;
    }
    o.unshift(`recuperou de frente e invencível: ${okRec} de ${N} · saiu da mureta só acelerando e virando: ${okWall} de ${N} (o mais lento levou ${tMax.toFixed(2)} s)`); return o.join('\n');
  }));
  await b.close(); })();
