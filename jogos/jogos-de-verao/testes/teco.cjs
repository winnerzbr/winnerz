// Teco-teco d'Água: partidas simuladas (o jogador guiado pelo mesmo cérebro dos Amiguinhos, com acerto escolhido) e fotos de uma
// partida de verdade com o teclado (voar, segurar a água, jogar bexiga, rasante no mar).
const { chromium } = require('playwright'); const fs = require('fs');
const N = Number(process.argv[2] || 4);
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); fs.mkdirSync('amg', { recursive: true });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/index\.html/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } }); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  console.log('na lista de provas:', await p.evaluate(() => EVENTS.indexOf(teco) >= 0 && EVENTS.map((e) => e.id).join(' ')));
  const sim = await p.evaluate((N) => {
    const ev = teco, out = [];
    for (const [nm, skill] of [['muito bom', .95], ['bom', .82], ['médio', .68], ['fraco', .5]]) {
      const pos = [], pts = [], st = { argolas: 0, acertos: 0, levou: 0, baloes: 0, drones: 0, tanqueVazio: 0 }; let oppPts = 0, tonto = 0;
      for (let m = 0; m < N; m++) {
        ev.init(); ev.P[0].ai.sk = skill; const ctl0 = ev.ctlOf; ev.ctlOf = function () { return this.aiCtl(this.P[0], DT); };
        let t = 0; while (t < 200) { if (ev.update(DT, {})) break; t += DT; if (ev.P[0].water <= 0) st.tanqueVazio += DT; if (ev.P.some((q) => !q.me && q.tonto > 0)) tonto += DT; }
        ev.ctlOf = ctl0; pos.push(ev.rank); pts.push(ev.me.pts); oppPts += ev.P.slice(1).reduce((a, q) => a + q.pts, 0) / 3;
        for (const k of ['argolas', 'acertos', 'levou', 'baloes', 'drones']) st[k] += ev.st[k];
      }
      out.push(`${nm}: colocação ${pos.join(', ')} · pontos ${pts.join(', ')} · Amiguinhos ${Math.round(oppPts / N)} em média · por partida: ${(st.baloes / N).toFixed(1)} balões, ${(st.drones / N).toFixed(1)} drones/pipas, ${(st.argolas / N).toFixed(1)} argolas, ${(st.acertos / N).toFixed(1)} bexigas acertadas, levou ${(st.levou / N).toFixed(1)}, tanque vazio ${(st.tanqueVazio / N).toFixed(1)} s`);
    }
    return out;
  }, N);
  console.log(sim.join('\n'));
  // jogador "na frente": fica no limite da frente, alinha com o alvo mais perto e segura a água o tempo todo (o jeito que estava fácil demais)
  const frente = await p.evaluate((N) => {
    const ev = teco, res = []; let junto = 0, amostras = 0;
    for (let m = 0; m < N; m++) {
      ev.init(); const ctl0 = ev.ctlOf;
      ev.ctlOf = function () { const me = this.me; if (me.seco || me.water < .05) return { mx: 0, my: 1, fire: false, bomb: false };
        const alvos = this.tg.filter((q) => !q.dead && !q.fall && q.kind !== 'cesta' && q.x > me.x + 10).sort((a, b) => a.x - b.x), q = alvos[0];
        const ty = q ? q.y - 4 : 90; return { mx: 1, my: clamp((ty - me.y) / 12, -1, 1), fire: true, bomb: this.P.some((o) => !o.me && o.x > me.x + 20 && o.x < me.x + 140 && o.y > me.y + 10 && o.y < me.y + 90) }; };
      let t = 0; while (t < 200) { if (ev.update(DT, {})) break; t += DT; if (Math.round(t * 60) % 30 === 0) { const ai = ev.P.slice(1); for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) { amostras++; if (Math.hypot(ai[a].x - ai[b].x, ai[a].y - ai[b].y) < 30) junto++; } } }
      ev.ctlOf = ctl0; res.push(`${ev.rank}º, levou ${ev.st.levou} bexigas (${ev.me.pts} × ${ev.P.slice(1).map((o) => o.name + ' ' + o.pts).join(', ')})`);
    }
    return res.join('\n') + `\nAmiguinhos colados (a menos de 30): ${Math.round(junto / amostras * 100)}% do tempo`;
  }, N);
  console.log('jogador na frente segurando a água:\n' + frente);
  // partida de verdade, com o teclado
  await p.evaluate(() => { choose(teco); start(); });
  const k = (c, ms) => p.keyboard.down(c).then(() => p.waitForTimeout(ms)).then(() => p.keyboard.up(c));
  await p.waitForTimeout(3600); await p.screenshot({ path: 'amg/teco_0.png' });
  await p.keyboard.down('Space'); await k('ArrowRight', 500); await k('ArrowUp', 400); await p.waitForTimeout(1500); await p.screenshot({ path: 'amg/teco_1.png' });
  await k('KeyX', 80); await p.waitForTimeout(250); await p.screenshot({ path: 'amg/teco_2.png' });
  await p.keyboard.up('Space');
  // tanque vazio: segurando a água no alto, nenhuma gota sai até o tanque encher de novo
  const seco = await p.evaluate(async () => { const m = teco.me; m.y = 60; m.water = 0; return m.shots; });
  await p.keyboard.down('Space'); await p.waitForTimeout(2000); await p.keyboard.up('Space');
  console.log('tanque vazio no alto, gotas em 2 s:', (await p.evaluate(() => teco.me.shots)) - seco, '| água agora', (await p.evaluate(() => teco.me.water)).toFixed(3));
  const agua0 = await p.evaluate(() => teco.me.water);
  await k('ArrowDown', 1600); await p.waitForTimeout(900); await p.screenshot({ path: 'amg/teco_3.png' });
  const agua1 = await p.evaluate(() => teco.me.water);
  console.log('rasante enche o tanque:', agua1 > agua0, agua0.toFixed(2), '->', agua1.toFixed(2));
  await p.evaluate(() => { teco.T = 51; }); await p.waitForTimeout(4500); await p.screenshot({ path: 'amg/teco_4.png' });
  console.log('hud:', JSON.stringify(await p.evaluate(() => teco.hud())));
  await p.evaluate(() => { teco.T = 119.5; }); await p.waitForTimeout(1500); await p.screenshot({ path: 'amg/teco_5.png' }); await p.waitForTimeout(3500);
  console.log('fim:', await p.evaluate(() => [mode, teco.rank, teco.score, teco.stats().join(' | ')].join(' · ')));
  // noite e celular (miniatura no menu)
  await p.evaluate(() => { window.__taHora = 21; choose(teco); }); await p.waitForTimeout(600); await p.screenshot({ path: 'amg/teco_menu_noite.png' });
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
