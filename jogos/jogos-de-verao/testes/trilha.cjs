// trilha gravada: abertura com o tema, cada prova com a sua faixa, menus com o Disco, pausa abaixando, botão desligando, pódio
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }), p = await b.newPage({ viewport: { width: 1280, height: 800 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1200);
  await p.mouse.click(5, 5); await p.waitForTimeout(1500);
  const st = () => p.evaluate(() => { const o = { faixa: TRILHA.faixa }; for (const f of Object.keys(TRILHA.NOMES)) { const a = TRILHA.el(f); if (a) o[f] = a.paused ? 'parada' : `tocando ${a.volume.toFixed(2)} ${a.currentTime.toFixed(1)}s`; } return o; });
  console.log('abertura:', JSON.stringify(await st()));
  const evs = await p.evaluate(() => EVENTS.map((e) => e.id)); const mapa = {};
  for (const id of evs) { mapa[id] = await p.evaluate((id) => { const e = EVENTS.find((x) => x.id === id); choose(e); start(); return TRILHA.faixa; }, id); await p.waitForTimeout(150); }
  console.log('provas:', JSON.stringify(mapa));
  console.log('sem faixa:', evs.filter((id) => !mapa[id]).join(',') || 'nenhuma');
  await p.waitForTimeout(1500); console.log('no vôlei:', JSON.stringify(await st()));
  await p.evaluate(() => pause()); await p.waitForTimeout(1200); console.log('pausa:', JSON.stringify(await st()));
  await p.evaluate(() => { resume(); }); await p.waitForTimeout(1200); console.log('volta:', JSON.stringify(await st()));
  await p.evaluate(() => { finishEvent(); }); await p.waitForTimeout(1500); console.log('resultado:', JSON.stringify(await st()));
  await p.evaluate(() => Music.setOn(false)); await p.waitForTimeout(600); console.log('desligada:', JSON.stringify(await st()));
  await p.evaluate(() => Music.setOn(true)); await p.waitForTimeout(1500); console.log('ligada:', JSON.stringify(await st()));
  await p.evaluate(() => Music.play('podio')); await p.waitForTimeout(1500); console.log('pódio:', JSON.stringify(await st()));
  const dur = await p.evaluate(() => Promise.all(Object.keys(TRILHA.NOMES).map((f) => new Promise((ok) => { const a = new Audio(`musica/${f}.mp3`); a.onloadedmetadata = () => ok(`${f} ${a.duration.toFixed(1)}s`); a.onerror = () => ok(`${f} ERRO`); }))));
  console.log('arquivos:', dur.join(' · '));
  console.log(errs.join(' | ') || 'sem erros'); await b.close(); })();
