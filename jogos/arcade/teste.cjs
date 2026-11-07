// Testa um jogo do Arcade. uso: node teste.cjs <arquivo em build/> <id do jogo> <prefixo das capturas> [largura altura] [ações...]
// ações: wait:ms | shot | down:Tecla | up:Tecla | tecla (aperta e solta) | click:x,y (na tela, em px da página) | tap:x,y (no canvas, coords lógicas 320x360) | hold:x,y,ms | eval:js | play
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
(async () => {
  const [file, id, out, w, h, ...acts] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const touch = (+w || 1280) < 600;
  const p = await b.newPage({ viewport: { width: +w || 1280, height: +h || 860 }, hasTouch: touch, isMobile: touch });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.goto('http://127.0.0.1:8767/build/' + file); await p.waitForTimeout(500);
  await p.evaluate((id) => { const g = GAMES.find((x) => x.id === id); if (!g) throw new Error('jogo não está em GAMES: ' + id); choose(g); }, id);
  await p.waitForTimeout(300);
  let n = 0; const shot = async () => { const el = await p.$('.cab'); await (el || p).screenshot({ path: `${out}-${n++}.png` }); };
  await shot();
  const cvPt = async (x, y) => p.evaluate(([x, y]) => { const r = document.getElementById('screen').getBoundingClientRect(); return { x: r.left + (x / 320) * r.width, y: r.top + (y / 360) * r.height }; }, [x, y]);
  for (const a of acts) {
    if (a === 'play') await p.click('#b-play');
    else if (a === 'shot') await shot();
    else if (a.startsWith('wait:')) await p.waitForTimeout(+a.slice(5));
    else if (a.startsWith('down:')) await p.keyboard.down(a.slice(5));
    else if (a.startsWith('up:')) await p.keyboard.up(a.slice(3));
    else if (a.startsWith('click:')) { const [x, y] = a.slice(6).split(','); await p.mouse.click(+x, +y); }
    else if (a.startsWith('tap:')) { const [x, y] = a.slice(4).split(','); const q = await cvPt(+x, +y); if (touch) await p.touchscreen.tap(q.x, q.y); else await p.mouse.click(q.x, q.y); }
    else if (a.startsWith('hold:')) { const [x, y, ms] = a.slice(5).split(','); const q = await cvPt(+x, +y); await p.mouse.move(q.x, q.y); await p.mouse.down(); await p.waitForTimeout(+ms); await p.mouse.up(); }
    else if (a.startsWith('eval:')) console.log('eval:', JSON.stringify(await p.evaluate(a.slice(5))));
    else await p.keyboard.press(a);
  }
  console.log('estado:', await p.evaluate(() => state), '| erros:', errs.length ? '\n' + errs.join('\n') : 'nenhum');
  await b.close();
})();
