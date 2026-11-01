// editor com um banco de mentira que responde como o de verdade: primeiro uma cópia antiga do navegador, depois a confirmada.
// Confere: o jogo aplica o que foi aplicado (não a cópia velha), também quando o banco responde no meio de uma prova,
// e o editor abre com os rostos salvos (e com o que foi mexido nesta visita, ao fechar e abrir de novo).
const { chromium } = require('playwright');
const R = {}; for (let k = 0; k < 8; k++) R[`ia.readyU.${k}`] = { fx: 0, fy: -2, fs: 1, fr: -15, ax: 0, ay: 0 };
for (let k = 0; k < 16; k++) R[`ia.idle.${k}`] = { fx: 0, fy: -1, fs: 1, fr: 5, ax: 0, ay: 0 };
const NOVO = { mec: {}, pistas: {}, rostos: R, textos: {} }, VELHO = { mec: {}, pistas: {}, rostos: { 'ia.readyU.0': { fr: 30 } }, textos: {} };
const mock = ({ novo, velho, atraso }) => {
  const at = 1793504589033, store = { 'wz/aplicado': { at, nome: '', json: JSON.stringify(novo) }, 'wz/rascunho': { at: at - 5000, nome: '', json: JSON.stringify(novo) } };
  const velhos = { 'wz/aplicado': { at: at - 9e6, nome: '', json: JSON.stringify(velho) }, 'wz/rascunho': { at: at - 9e6, nome: '', json: JSON.stringify(velho) } };
  const snap = (p, d, cache) => ({ id: p.split('/')[1], exists: !!d, data: () => d, metadata: { fromCache: cache, hasPendingWrites: false } });
  const db = { doc: (p) => ({ get: async () => snap(p, velhos[p] || store[p], true),
    set: async (d) => { await new Promise((r) => setTimeout(r, 300)); store[p] = JSON.parse(JSON.stringify(d)); window.__grav = (window.__grav || 0) + 1; },
    onSnapshot: (ok) => { let vivo = true; setTimeout(() => vivo && ok(snap(p, velhos[p], true)), 50); setTimeout(() => vivo && ok(snap(p, store[p], false)), 600); return () => { vivo = false; }; } }),
    collection: () => ({ get: async () => ({ docs: [] }) }) };
  const user = { isOwner: async () => true, canEdit: async () => true, can: async () => true };
  window.__store = store;
  window.claude = { use: async (n) => { await new Promise((r) => setTimeout(r, atraso)); return n === 'db' ? db : n === 'user' ? user : null; } };
};
(async () => { const b = await chromium.launch(); const errs = [];
  const nova = async (atraso) => { const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(mock, { novo: NOVO, velho: VELHO, atraso }); await p.goto('http://localhost:8765/index.html'); return p; };
  const giro = (p) => p.evaluate(() => +((MV5.a.readyU.f[0].r || 0) * 180 / Math.PI).toFixed(1));
  // 1) banco responde no menu
  let p = await nova(300); const orig = await p.evaluate(() => +((MV5.a.readyU.f[0].r || 0) * 180 / Math.PI).toFixed(1));
  await p.waitForTimeout(2500); console.log('giro original', orig, '| depois de carregar', await giro(p), '(esperado', orig - 15, '; a cópia velha daria', orig + 30, ')');
  // 2) editor abre com o salvo; mexe, fecha e abre de novo
  await p.keyboard.type('editor'); await p.waitForTimeout(1500);
  await p.click('#wz nav button >> nth=3'); await p.waitForTimeout(600); await p.selectOption('#wz main select >> nth=0', 'readyU'); await p.waitForTimeout(300);
  console.log('editor, readyU quadro 1:', await p.$$eval('#wz input[data-k]', (l) => l.map((i) => i.dataset.k + '=' + i.value).join(' ')), '|', await p.textContent('#wz-st'));
  const fx = p.locator('#wz input[data-k=fx]'); await fx.fill('7'); await p.waitForTimeout(100);
  await p.evaluate(() => wzFechar()); await p.waitForTimeout(100); await p.keyboard.type('editor'); await p.waitForTimeout(1500);
  await p.click('#wz nav button >> nth=3'); await p.waitForTimeout(600); await p.selectOption('#wz main select >> nth=0', 'readyU'); await p.waitForTimeout(300);
  console.log('fechou logo e abriu de novo:', await p.$$eval('#wz input[data-k]', (l) => l.map((i) => i.dataset.k + '=' + i.value).join(' ')));
  await p.waitForTimeout(1500); console.log('rascunho no banco com fx=7:', await p.evaluate(() => JSON.parse(window.__store['wz/rascunho'].json).rostos['ia.readyU.0'].fx === 7));
  await p.close();
  // 3) banco responde com o vôlei já em andamento: entra quando a prova acaba
  p = await nova(2500); await p.waitForTimeout(800); await p.evaluate(() => { choose(volei); start(); });
  await p.waitForTimeout(4000); console.log('durante a prova:', await giro(p), '| pendente:', await p.evaluate(() => WZ_PEND));
  await p.evaluate(() => finishEvent()); await p.waitForTimeout(1200); console.log('depois da prova:', await giro(p));
  // 4) o desenho do vôlei muda de verdade com o giro aplicado
  await p.evaluate(() => { choose(volei); start(); }); await p.waitForTimeout(1500);
  const cv = p.locator('canvas').first(); await cv.screenshot({ path: 'amg/wz_banco_volei.png' });
  console.log(errs.join(' | ') || 'sem erros'); await b.close(); })();
