// teco-teco 3D: abre a prova (three.js servido da cópia local em vendor/), confere curva e subida, tira fotos e roda um piloto automático
const { chromium } = require('playwright');
const path = require('path');
const N = Number(process.argv[2] || 3);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }), p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.route(/three@0\.160\.0\/build\/three\.min\.js/, (r) => r.fulfill({ path: path.join(__dirname, 'vendor/three-r160.min.js'), contentType: 'text/javascript' }));
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1500);
  console.log('THREE', await p.evaluate(() => window.THREE && THREE.REVISION));
  await p.evaluate(() => { choose(teco); start(); }); await p.waitForTimeout(400);
  console.log('3D', await p.evaluate(() => !teco.no3d));
  const shot = async (n) => p.locator('canvas').first().screenshot({ path: `amg/t3_${n}.png` });
  await p.waitForTimeout(2600); await shot('decolagem');
  const s0 = await p.evaluate(() => ({ x: teco.p.x, y: teco.p.y, z: teco.p.z, yaw: teco.yaw }));
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(700); await shot('curva_direita');
  const s1 = await p.evaluate(() => { const v = new THREE.Vector3(teco.p.x + Math.cos(teco.yaw) * 30, teco.p.y, teco.p.z + Math.sin(teco.yaw) * 30).project(teco.G.cam); return { yaw: teco.yaw, sx: v.x }; });
  await p.keyboard.up('ArrowRight');
  console.log('curva para a direita: yaw', s0.yaw.toFixed(2), '->', s1.yaw.toFixed(2), '· o caminho à frente fica', s1.sx > 0 ? 'à direita (ok)' : 'à esquerda (invertido!)');
  const y0 = await p.evaluate(() => teco.p.y); await p.keyboard.down('ArrowUp'); await p.waitForTimeout(600); await p.keyboard.up('ArrowUp'); const y1 = await p.evaluate(() => teco.p.y);
  console.log('▲ 0,6 s: altura', y0.toFixed(1), '->', y1.toFixed(1));
  await p.evaluate(() => { teco.demo(); teco.G.camP = null; }); await p.waitForTimeout(800); await shot('argolas');
  for (const k of ['farol', 'viaduto', 'laje', 'roda']) { await p.evaluate((k) => { const l = teco.C.lm.find((l) => l.kind === k); Object.assign(teco.p, { x: l.x - 90, y: l.top + 15, z: l.z + 20 }); teco.yaw = Math.atan2(-20, 90); teco.th = 0; teco.G.camP = null; }, k); await p.waitForTimeout(500); await shot(k); }
  const fps = await p.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2); }; requestAnimationFrame(f); }));
  console.log('quadros por segundo (aqui, sem placa de vídeo):', fps.toFixed(0));
  // piloto automático (sem desenhar)
  const out = await p.evaluate((N) => {
    const ev = teco, o = [], why = {}; const cr0 = ev.crash; ev.crash = function (w) { if (!(this.spin > 0) && !(this.takeoff > 0)) why[w] = (why[w] || 0) + 1; return cr0.call(this, w); };
    const pilot = (skill, A) => {
      const P = ev.p, r = ev.C.rings[ev.next], dx = r.x - P.x, dy = r.y - P.y, dz = r.z - P.z, d = Math.hypot(dx, dz);
      let e = Math.atan2(dz, dx) - ev.yaw; e = Math.atan2(Math.sin(e), Math.cos(e));
      if (A.n === undefined || Math.random() < .03) A.n = (Math.random() - .5) * (1 - skill) * 1.2;
      // perto e de lado para a argola: segue reto um pouco para ter espaço e voltar alinhado
      if (!A.ext && d < 45 && Math.abs(e) > .7) A.ext = 1.4; if (A.ext) { A.ext = Math.max(0, A.ext - DT); e = 0; }
      const I = { ax: clamp((e + A.n) * 2.2, -1, 1), u: false, d: false, pa: false, pb: false };
      let want = Math.atan2(dy, Math.max(20, d)); const ahead = tcGround(P.x + Math.cos(ev.yaw) * 40, P.z + Math.sin(ev.yaw) * 40); if (ahead > P.y - 10) want = .5;
      const iy = clamp((want - ev.th) * 3 + want * 1.2, -1, 1); if (Math.random() < skill) { I.u = iy > .25; I.d = iy < -.25; A.u = I.u; A.d = I.d; } else { I.u = A.u; I.d = A.d; }
      I.pa = ev.tank >= 1 && Math.abs(e) < .2 && d > 120 && Math.random() < .05;
      return I;
    };
    for (const [nm, sk] of [['muito bom', .97], ['médio', .85], ['fraco', .7]]) {
      let sc = 0, rg = 0, cr = 0, best = 0, lp = 0, bl = 0, ra = 0;
      for (let m = 0; m < N; m++) { ev.init(); const A = {}; let t = 0; for (; t < 95; t += DT) if (ev.update(DT, pilot(sk, A))) break; o.push(`  voo ${m + 1}: ${ev.score} pontos, ${ev.rings} argolas, terminou em ${t.toFixed(1)} s, posição ${ev.p.x.toFixed(0)},${ev.p.y.toFixed(0)},${ev.p.z.toFixed(0)}`); sc += ev.score; rg += ev.rings; cr += ev.crashes; best = Math.max(best, ev.score); lp += ev.laps; bl += ev.balloons; ra += ev.rasantes; }
      o.push(`${nm}: ${Math.round(sc / N)} pontos (melhor ${best}) · argolas ${(rg / N).toFixed(1)} · voltas ${(lp / N).toFixed(1)} · balões ${(bl / N).toFixed(1)} · rasantes ${(ra / N).toFixed(1)} · batidas ${(cr / N).toFixed(1)}`);
    }
    ev.crash = cr0; o.push(JSON.stringify(why)); return o;
  }, N);
  console.log(out.join('\n'));
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
})();
