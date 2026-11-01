// a configuração real do dono (cfg_dono.json, aplicada em 01/11) num banco de mentira: o jogo e o editor mostram os rostos dela?
const { chromium } = require('playwright'); const fs = require('fs');
const CFG = JSON.parse(fs.readFileSync(__dirname + '/cfg_dono.json', 'utf8'));
const mock = ({ cfg }) => {
  const at = 1793505454733, store = { 'wz/aplicado': { at, nome: '', json: JSON.stringify(cfg) }, 'wz/rascunho': { at: at - 1, nome: '', json: JSON.stringify(cfg) } };
  const snap = (p, d, cache) => ({ id: p.split('/')[1], exists: !!d, data: () => d, metadata: { fromCache: cache, hasPendingWrites: false } });
  const db = { doc: (p) => ({ get: async () => snap(p, store[p], false), set: async (d) => { store[p] = d; },
    onSnapshot: (ok) => { const t = setTimeout(() => ok(snap(p, store[p], false)), 400); return () => clearTimeout(t); } }), collection: () => ({ get: async () => ({ docs: [] }) }) };
  const user = { isOwner: async () => true, canEdit: async () => true, can: async () => true };
  window.claude = { use: async (n) => { await new Promise((r) => setTimeout(r, 500)); return n === 'db' ? db : n === 'user' ? user : null; } };
};
(async () => { const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1400, height: 900 } }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = [], warns = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (/editor/.test(m.text())) warns.push(m.text().slice(0, 200)); });
  await p.addInitScript(mock, { cfg: CFG }); await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(4000);
  const conf = () => p.evaluate((cfg) => { const out = { ok: 0, errado: [] }; for (const [key, o] of Object.entries(cfg.rostos)) { const [, an, k] = key.split('.'); const f = MV5.a[an] && MV5.a[an].f[+k]; if (!f) { out.errado.push(key + ':sem quadro'); continue; }
      const r = (f.r || 0) * 180 / Math.PI; out.ok++; if (key === 'ia.readyU.0' || key === 'ia.serve.23' || key === 'ia.set.11') out[key] = { r: +r.toFixed(1), s4: f.s && +f.s[4].toFixed(1) }; } return out; }, CFG);
  console.log('no jogo:', JSON.stringify(await conf()), '| aplicado carregado:', await p.evaluate(() => !!WZ_APLICADO && Object.keys(WZ_APLICADO.rostos).length));
  await p.keyboard.type('editor'); await p.waitForTimeout(2500);
  console.log('editor:', JSON.stringify(await conf()), '| rascunho no editor:', await p.evaluate(() => Object.keys(WZE.cfg.rostos).length));
  console.log(warns.slice(0, 10).join('\n') || 'sem avisos do editor'); console.log(errs.join(' | ') || 'sem erros'); await b.close(); })();
