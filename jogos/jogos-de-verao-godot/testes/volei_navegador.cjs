// Ferramentas do vôlei que rodam no jogo do navegador (Playwright), para conferir o Godot com a versão de referência.
// Antes: python3 -m http.server 8765 --directory <pasta jogos_verao>   (o jogo do navegador, com as imagens)
// Uso (da pasta do projeto Godot):
//   node testes/volei_navegador.cjs comparar          → fotos dos 4 momentos de testes/volei_comparar.gd: testes/fotos/volei_comparar_<momento>_navegador.png
//   node testes/volei_navegador.cjs sim 150           → a mesma simulação de testes/sim_volei.gd (você = cérebro antigo "bot"; Rosa = cérebro novo)
//   node testes/volei_navegador.cjs rostos <jogo_ref.html> → refaz provas/volei/rostos_*.png (folhas de rostos acesos) com o desenho do navegador
// Os rostos do dono (editor do jogo) vêm de EDITOR (editor_aplicado.json) e são aplicados na página antes de tudo.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const EDITOR = process.env.VOLEI_EDITOR || '/home/claude/work/gref/editor_aplicado.json';
const G = path.resolve(__dirname, '..');

async function abre() {
  const cfg = JSON.parse(JSON.parse(fs.readFileSync(EDITOR, 'utf8')).json);
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(2500);
  console.log('rostos do dono aplicados:', await p.evaluate((c) => WZ.apply(c, true).rostos, cfg));
  const canvas = async (f) => { const png = await p.evaluate(() => document.querySelector('canvas').toDataURL('image/png')); fs.writeFileSync(f, Buffer.from(png.split(',')[1], 'base64')); };
  return { b, p, errs, canvas };
}

async function comparar() {
  const { b, p, errs, canvas } = await abre();
  await p.evaluate(() => { volei.two = false; volei.tour = null; volei.copa = null; choose(volei); start(); }); await p.waitForTimeout(1500);
  for (const n of ['saque', 'rali', 'cortada', 'ponto']) {
    await p.evaluate((n) => {
      const v = volei; v.update = function () { return false; };
      v.init(); const VG = VGY;
      if (n === 'saque') v.t = 1.0;
      if (n === 'rali') { Object.assign(v, { state: 'rally', held: false, hits: 3, server: 0, tossT: 5, touches: [0, 1], side: 1 }); Object.assign(v.P[0], { x: 120, y: VG - 40, g: false, vy: -100 }); v.P[1].x = 300; Object.assign(v.b, { x: 250, y: 90, vx: -80, vy: 50, ang: 1.3 }); v.t = 2.3; }
      if (n === 'cortada') { Object.assign(v, { state: 'rally', held: false, hits: 2, server: 0, tossT: 5, touches: [0, 1], side: 1 }); v.P[0].x = 90; Object.assign(v.P[1], { x: 240, y: VG - 50, g: false, vy: -20, sw: { t: .08, hit: false, gnd: false, pow: .8 } }); Object.assign(v.b, { x: 222, y: 72, vx: -30, vy: 40, ang: .4 }); v.t = 3.1; }
      if (n === 'ponto') { Object.assign(v, { state: 'point', held: false, st: .5, lastW: 0, sc: [3, 2], cheer: 1, hits: 4 }); v.P[0].x = 110; v.P[1].x = 280; Object.assign(v.b, { x: 260, y: VG - VRB, ang: 2 }); v.t = 4.2; }
      for (const k of ['ia50', 'bl51', 'cam', 'spl']) { const s = __stOf(k); for (const q of Object.keys(s)) delete s[q]; Object.assign(s, { th: null, tt: v.t, prop: 0, pv: 0, j: 0, jv: 0, vy: 0, wave: 0 }); }
      __stOf('cam').j = W / 2;
    }, n);
    await p.waitForTimeout(300);
    await canvas(path.join(G, `testes/fotos/volei_comparar_${n}_navegador.png`)); console.log('foto', n);
  }
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
}

async function sim(N) {
  const { b, p, errs } = await abre();
  const out = await p.evaluate((N) => {
    const pc = { react: .14, err: 4, spd: 1, fwd: .5, block: .4, slip: .015, iq: .9, dive: .5, spike: 0, set: 0, read: 0 };
    const R = []; const t0 = performance.now(); let tj = 0;
    for (let m = 0; m < N; m++) {
      volei.two = false; volei.tour = null; volei.copa = null; volei.init(); const A = { t: 0, tx: 70 }; let t = 0;
      while (volei.state !== 'over' && t < 900) { const c = volei.brain0(0, DT, A, pc); volei.update(DT, { l: c.l, r: c.r, u: c.u, a: false, ax: c.ax, pd: c.d, d: c.d, pc: c.sp, auto: true }); t += DT; }
      while (volei.state === 'over' && !volei.update(DT, {})) t += DT;
      tj += t;
      R.push({ sc: volei.sc.slice(), ralis: volei.rallies, maior: volei.longest, cortadas: volei.cortadas.slice(), rapidas: volei.rapidas.slice(), peixes: volei.peixes.slice(), pontos: volei.score, s: Math.round(t) });
    }
    return { R, msPorSeg: (performance.now() - t0) / tj };
  }, N);
  const R = out.R, med = (f) => (R.reduce((a, r) => a + f(r), 0) / R.length).toFixed(2);
  console.log(`partidas ${R.length} · você venceu ${R.filter((r) => r.sc[0] > r.sc[1]).length} · média de pontos (você ${med((r) => r.sc[0])} x ${med((r) => r.sc[1])} Rosa) · ralis ${med((r) => r.ralis)} · maior rali ${med((r) => r.maior)} · cortadas Rosa ${med((r) => r.cortadas[1])} · peixinhos (${med((r) => r.peixes[0])}, ${med((r) => r.peixes[1])}) · rápidas (${med((r) => r.rapidas[0])}, ${med((r) => r.rapidas[1])}) · pontuação ${med((r) => r.pontos)} · ${med((r) => r.s)} s/partida · ${out.msPorSeg.toFixed(2)} ms de cálculo por s de jogo`);
  console.log(errs.join(' | ') || 'sem erros'); await b.close();
}

// folhas de rostos: cada célula tem 28 x 20 unidades do rosto, 8 pixels por unidade, centro em (14, 10).
// Colunas = expressão 0..5; linhas = largura dos olhos (kx de 0,85 a 1,3). O brilho é o do glowFace (shadowBlur 7 nos pixels da prancha).
async function rostos(ref) {
  const html = fs.readFileSync(ref, 'utf8'), i0 = html.indexOf('  function faceExpr(ex, cx, cy, kx, col) {'), i1 = html.indexOf('\n  }\n', i0) + 4;
  const FACE = html.slice(i0, i1);
  const b = await chromium.launch(), p = await b.newPage(); await p.setContent('<canvas></canvas>');
  const KX = [.85, .9, .95, 1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3];
  const res = await p.evaluate(([FACE, KX]) => {
    const TAU = Math.PI * 2; let ctx; var faceExpr;
    eval(FACE.replace('function faceExpr', 'faceExpr = function'));
    const R = 8, CW = 28, CH = 20;
    const folha = (kxs, fk, cor, brilho) => {
      const c = document.createElement('canvas'); c.width = 6 * CW * R; c.height = kxs.length * CH * R; ctx = c.getContext('2d');
      kxs.forEach((kx, row) => { for (let ex = 0; ex < 6; ex++) {
        ctx.save(); ctx.translate((ex * CW + CW / 2) * R, (row * CH + CH / 2) * R); ctx.scale(R, R);
        if (brilho) { ctx.shadowColor = 'rgba(95,244,255,.9)'; ctx.shadowBlur = 7 * R / fk; }
        faceExpr(ex, 0, 0, kx, cor); ctx.restore();
      } });
      return c.toDataURL('image/png');
    };
    // fk: tamanho típico do rosto em cada personagem (IAmiguinho ~2,47; Amiguinho ~2,77 pixels da prancha por unidade)
    return { ia: folha(KX, 2.47, '#7ff8ff', true), bl: folha(KX, 2.77, '#7ff8ff', true), torcida: folha([1], 1, '#8ff5ff', false) };
  }, [FACE, KX]);
  for (const k of Object.keys(res)) fs.writeFileSync(path.join(G, `provas/volei/rostos_${k}.png`), Buffer.from(res[k].split(',')[1], 'base64'));
  console.log('rostos gerados'); await b.close();
}

const [cmd, arg] = process.argv.slice(2);
(cmd === 'sim' ? sim(+(arg || 40)) : cmd === 'rostos' ? rostos(arg || '/home/claude/work/gref/jogo_ref.html') : comparar());
