// Teco-teco d'Água: um "jogador bom" simulado (atira em tudo que está alinhado, compensa a queda da gota, pega argolas e cestas,
// desvia de bexigas, enche o tanque no mar e joga bexiga) contra os Amiguinhos, com os pontos de cada um por origem.
// Uso: node teco_humano.cjs [partidas]. Em 01/11, depois do ajuste, ele ganhou 3 de 8 (antes ganhava todas por 2 a 3 vezes os pontos).
const { chromium } = require('playwright');
const N = Number(process.argv[2] || 4);
(async () => { const b = await chromium.launch(), p = await b.newPage();
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  console.log(await p.evaluate((N) => { const ev = teco, out = [];
    // "jogador humano bom": atira em tudo que estiver alinhado, vai atrás do melhor alvo, pega argolas, desvia de bexigas, enche no mar
    const humano = function () { const me = this.me, S = this.SEA, st = this._h || (this._h = { enche: false });
      if (me.seco || me.water < .06) st.enche = true; if (me.water > .55) st.enche = false;
      const bom = (q) => !q.dead && !q.fall && q.kind !== 'cesta';
      const queda = (q) => { const ax = q.x - me.x; const tq = ax / TA.shotV; return me.y + 4 + 70 * tq * tq; };
      let ty = me.y, tx = W * .5;
      const ring = this.rings.filter((g) => g.by < 0 && g.x > me.x + 5 && g.x < me.x + 140).sort((a, c) => a.x - c.x)[0];
      if (st.enche) ty = S - 9;
      else if (ring) { ty = ring.y; tx = Math.min(W * .6, ring.x - 20); }
      else { const ts = this.tg.filter((q) => bom(q) && q.x > me.x + 30 && q.x < me.x + 230); let best = null, bv = 0;
        for (const q of ts) { const v = (q.kind === 'alvo' ? 300 : q.pts) / q.hp / (30 + Math.abs(q.y - me.y)); if (v > bv) { bv = v; best = q; } }
        const cesta = this.tg.find((q) => q.kind === 'cesta' && !q.dead && me.bex < 3 && Math.hypot(q.x - me.x, q.y - me.y) < 90);
        if (cesta) { tx = cesta.x; ty = cesta.y; } else if (best) { ty = best.y - (queda(best) - me.y - 4); } else ty = S * .5; }
      for (const bb of this.bombs) if (bb.o !== me.i && bb.x < me.x + 15 && bb.x > me.x - 110 && Math.abs(bb.y - me.y) < 35) { ty = me.y + (bb.y < me.y ? 40 : -40); break; }
      let fire = false; if (!me.seco) for (const q of this.tg) { if (!bom(q)) continue; const ax = q.x - me.x; if (ax > 10 && ax < 230 && Math.abs(q.y - queda(q)) < q.r + 2) { fire = true; break; } }
      let bomb = false; if (me.bex > 0) for (const o of this.P) { if (o === me || o.tonto > 0 || o.inv > 0) continue; const ox = o.x - me.x, oy = o.y - me.y; if (ox > 20 && ox < 160 && oy > 0 && oy < 100) { const tt = ox / (120 + me.vx * .6), yy = (-30 + me.vy * .4) * tt + .5 * TA.bexG * tt * tt; if (Math.abs(yy - oy) < 12) bomb = true; } }
      return { mx: clamp((tx - me.x) / 30, -1, 1), my: clamp((ty - me.y) / 12, -1, 1), fire, bomb }; };
    const R0 = ev.ring, C0 = ev.credita, A0 = ev.atordoa; let fonte; ev.ring = function (p, g) { fonte = 'arg'; R0.call(this, p, g); fonte = null; }; ev.credita = function (p, v, ...r) { const a = p.pts; C0.call(this, p, v, ...r); p.src[fonte || 'alvo'] = (p.src[fonte || 'alvo'] || 0) + p.pts - a; }; ev.atordoa = function (p, o) { const q = this.P[o], a = q.pts; A0.call(this, p, o); q.src.bex = (q.src.bex || 0) + q.pts - a; };
    for (let m = 0; m < N; m++) { ev.init(); ev._h = null; for (const q of ev.P) q.src = {}; const c0 = ev.ctlOf; ev.ctlOf = humano;
      let t = 0; while (t < 200) { if (ev.update(DT, {})) break; t += DT; } ev.ctlOf = c0;
      out.push(ev.P.map((o) => o.name + ' ' + JSON.stringify(o.src)).join(' | ')); out.push(`${ev.rank}º ${ev.me.pts} × ${ev.P.slice(1).map((o) => o.name + ' ' + o.pts).join(', ')} · argolas ${ev.st.argolas}, balões ${ev.st.baloes}, drones ${ev.st.drones}, bexigas ${ev.st.acertos}, levou ${ev.st.levou}, seq ${ev.st.seq}`); }
    return out.join('\n'); }, N)); await b.close(); })();
