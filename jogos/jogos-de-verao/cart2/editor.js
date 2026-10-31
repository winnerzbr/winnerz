/* ============================================================ EDITOR DO JOGO (só para o dono)
   Uma tela própria, por cima do jogo, que só aparece para quem é dono da página. Tudo o que muda fica num RASCUNHO
   (salvo sozinho); "Testar" joga com o rascunho só nesta tela; "Aplicar" leva o rascunho para o jogo de todo mundo
   e guarda uma versão (dá para voltar). Partes:
   - Mecânicas: os números de cada prova (duração, medalhas e as constantes de física e dificuldade);
   - Pistas: as 3 pistas da corrida de bugue (pontos da pista, caixas, rampas, esteiras, areia fofa, atalhos, ladeiras, farol);
   - Rostos e quadros: posição, tamanho e giro do rosto no visor e o encaixe de cada quadro, em todos os desenhos pintados;
   - Textos: falas do IAmiguinho e nomes das provas;
   - Versões: voltar a uma versão aplicada, copiar e colar tudo (cópia de segurança).
   Onde fica guardado: no banco da própria página (db), em wz/rascunho, wz/aplicado e wz/v<data> (versões). */
const WZ_OBJS = { SF_MAN, SOBJ, HP_AIR, HP_BTN, HP_LIP, EB_BOLAS, PT_MAN, PT_GRIND, BQ, BX, BX_MAN, OB, OB_TIPO, FR, AR, DU, CN, FU, NT, JS, JS_MAN, DIVE, SERVE, SPEC, SPK, SPK_F, SPKG, OPP, PP, BC, BG };
const WZ_REG = {
  surfe: ['SF_MAN', 'SOBJ'], halfpipe: ['HP_AIR', 'HP_BTN', 'HP_LIP'], embaixadinha: ['EB_BOLAS'], patins: ['PT_MAN', 'PT_GRIND'], basquete: ['BQ'],
  pingue: ['PP'], bmx: ['BX', 'BX_MAN'], obstaculos: ['OB', 'OB_TIPO'], frisbee: ['FR'], arco: ['AR'], duelo: ['DU'], canoagem: ['CN'], futebol: ['FU'],
  bocha: ['BC'], natacao: ['NT'], jetski: ['JS', 'JS_MAN'], bugue: ['BG'], volei: ['DIVE', 'SERVE', 'SPEC', 'SPK', 'SPK_F', 'SPKG', 'OPP'],
};
// nomes em português dos números (os que não estão aqui aparecem com o nome técnico)
const WZ_NOMES = {
  G: 'Gravidade', GY: 'Gravidade (vertical)', BG: 'Gravidade da bola', VMAX: 'Velocidade máxima', VMIN: 'Velocidade mínima', SPD: 'Velocidade de andar', DSPD: 'Velocidade do pique',
  JV: 'Força do pulo', JH: 'Altura do pulo', JT: 'Tempo do pulo', R: 'Raio da bola', RR: 'Raio do aro', ACC: 'Aceleração', DRAG: 'Resistência do ar', CHG: 'Tempo para carregar a força',
  KICK: 'Força do chute', KMAX: 'Chute máximo', REACH: 'Alcance', BOUNCE: 'Quique', GH: 'Altura do gol', GW: 'Largura do gol', PXM: 'Pixels por metro', LEN: 'Comprimento da piscina',
  GLIDE: 'Deslize', PERF: 'Janela do perfeito', GOOD: 'Janela do bom', AIR: 'Tempo no ar', BREATH: 'Fôlego', FLOW: 'Correnteza', CAMX: 'Posição da câmera', LAPS: 'Voltas',
  VBOOST: 'Velocidade no turbo', ISL: 'Tamanho da ilha', CP: 'Raio da boia', WW: 'Largura do mundo', WH: 'Altura do mundo', CX: 'Centro x', CY: 'Centro y',
  SPR: 'Velocidade correndo', JOG: 'Velocidade trotando', WALK: 'Velocidade andando', DRAIN: 'Cansaço', REC: 'Recuperação', RECW: 'Recuperação andando', SX: 'Posição na tela',
  PED: 'Força da pedalada', VPED: 'Velocidade da pedalada', PUMP: 'Força do bombeado', ROT: 'Velocidade do giro', CLEAN: 'Margem do pouso limpo', DRAW: 'Tempo para puxar o arco',
  X0: 'Posição de saída', AMIN: 'Ângulo mínimo', AMAX: 'Ângulo máximo', AV: 'Velocidade da mira', CATCH: 'Distância para pegar', KL: 'Sustentação', KD: 'Arrasto',
  DT: 'Duração do pique', DCD: 'Espera entre piques', RATE: 'Tiros por segundo', GOTA: 'Tamanho da gota', WETG: 'Molhado para perder', STUN: 'Tempo atordoado', REF: 'Recarga',
  VMAXS: 'Velocidade máxima', TRES: 'Distância da linha de 3', CD: 'Espera', NEAR: 'Distância de perto', PR: 'Raio do jogador', YT: 'Margem de cima', YB: 'Margem de baixo',
  vx: 'Velocidade x', vy: 'Velocidade y', fric: 'Atrito', rest: 'Quique', v0: 'Força mínima', v1: 'Força máxima', max: 'Máximo', back: 'Recuo', h: 'Altura', w: 'Largura', f: 'Quadros', x: 'Multiplicador', v: 'Valor', d: 'Duração', nota: 'Nota',
};
const WZ_DESC = {
  BG: { padW: 'Meia largura da esteira de turbo', kr: 'Tamanho do corpo do bugue na batida (raio)', kf: 'Distância do centro até a frente e a traseira na batida', boxR: 'Raio da caixa de item', boxT: 'Segundos para a caixa voltar',
    voltas: 'Voltas por corrida', hw: 'Meia largura da pista', r: 'Raio do bugue na mureta', vmax: 'Velocidade máxima', eng: 'Força do motor', brake: 'Força do freio', grip: 'Aderência', gripD: 'Aderência derrapando',
    wb: 'Distância entre os eixos (curva)', water: 'Freio na água', boostV: 'Ganho do turbo', sw: 'Meia largura do atalho', Z: 'Zoom da câmera', g: 'Gravidade dos saltos' },
  BC: { x0: 'Cancha: esquerda (casada com o desenho da vila)', x1: 'Cancha: direita', y0: 'Cancha: em cima', y1: 'Cancha: embaixo', sx: 'Linha de lançamento (x)', sy: 'Linha de lançamento (y)', rb: 'Raio da bola',
    rj: 'Raio do bolim', fc: 'Atrito da areia', fv: 'Atrito que cresce com a velocidade', G: 'Força dos montinhos e buracos', meter: 'Escala da medida', fofa: 'Freio da areia fofa' },
};
const WZ_EVF = { dur: 'Duração (segundos; 0 = por tentativas)', 'med.0': 'Pontos para o bronze', 'med.1': 'Pontos para a prata', 'med.2': 'Pontos para o ouro', ia: 'Pontos do IAmiguinho (rival)' };
// conjuntos de desenhos pintados com rosto (o mesmo desenho do jogo, chamado pela função do próprio jogo)
const WZ_SETS = [
  { id: 'ia', nome: 'IAmiguinho (vôlei e geral)', atl: () => window.MV5, fn: (an, k, ex) => window.__fr.ia(an, k, 'g', ex, false), esc: () => 56 / 325 / (window.MV5 ? window.MV5.q : .5) },
  { id: 'bl', nome: 'Amiguinho (vôlei e bocha)', atl: () => window.MVB, fn: (an, k, ex) => window.__fr.bl(an, k, 'g', ex, false), esc: () => 34.8 / 152 },
  { id: 'sk', nome: 'IAmiguinho no skate', atl: () => window.MVSK, fn: (an, k, ex) => window.__fr.sk(an, k, ex, false), esc: () => 50.5 / 177 },
  { id: 'eb', nome: 'IAmiguinho na embaixadinha', atl: () => window.MVEB, fn: (an, k, ex) => window.__fr.eb(an, k, ex, false), esc: () => (window.MVEB ? 52 / window.MVEB.a.espera.f[0].ay : 1) },
  { id: 'bc', nome: 'IAmiguinho na bocha', atl: () => window.MVBC, fn: (an, k, ex) => window.__fr.bc(an, k, ex, false), esc: () => 56 / 325 / (window.MVBC ? window.MVBC.q : .5) },
];
const WZ_PISTA_CAMPOS = ['name', 'fala', 'pts', 'sc', 'ramps', 'boxes', 'pads', 'fofa', 'slopes', 'farol'];

const WZ = (() => {
  const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
  // ---------- caminhos ("BG.vmax", "ev:bugue.med.1", "fala:intro.bugue", "pista:0.pts", "rosto:ia.idle.3")
  const ORIG = new Map();
  function rootOf(path) {
    const i = path.indexOf(':'); if (i > 0) { const kind = path.slice(0, i), rest = path.slice(i + 1); return { kind, rest }; }
    return { kind: 'obj', rest: path };
  }
  function getSet(path, val, write) {
    const { kind, rest } = rootOf(path), parts = rest.split('.');
    let o;
    if (kind === 'obj') o = WZ_OBJS[parts.shift()];
    else if (kind === 'ev') { const id = parts.shift(); o = EVENTS.find((e) => e.id === id); }
    else if (kind === 'fala') o = FALA;
    else if (kind === 'pista') o = BG_TRACKS[+parts.shift()];
    if (!o) return undefined;
    for (let i = 0; i < parts.length - 1; i++) { o = o[parts[i]]; if (o == null) return undefined; }
    const k = parts[parts.length - 1];
    if (!write) return o[k];
    if (!ORIG.has(path)) ORIG.set(path, clone(o[k]));
    o[k] = clone(val); return true;
  }
  const get = (p) => getSet(p, null, false);
  // rostos e encaixes: mexem nas medidas de cada quadro (e no quadro do meio que vem depois dele)
  const RORIG = new Map();
  function metas(set, an, k) {
    const S = WZ_SETS.find((s) => s.id === set), A = S && S.atl() && S.atl().a[an]; if (!A || !A.f[k]) return [];
    return [A.f[k], A.m && A.m[k]].filter(Boolean);
  }
  function applyRosto(set, an, k, o) {
    for (const f of metas(set, an, k)) {
      if (!RORIG.has(f)) RORIG.set(f, { s: f.s ? f.s.slice() : null, r: f.r, ax: f.ax, ay: f.ay });
      const g = RORIG.get(f);
      if (g.s && f.s) { const cx = g.s[4] ?? (g.s[0] + g.s[2]) / 2, cy = g.s[5] ?? (g.s[1] + g.s[3]) / 2; f.s[4] = cx + (o.fx || 0); f.s[5] = cy + (o.fy || 0);
        const L1 = g.s[6] || (f.sz ? f.sz[0] : 0), L2 = g.s[7] || (f.sz ? f.sz[1] : 0); f.s[6] = L1 * (o.fs || 1); f.s[7] = L2 * (o.fs || 1); }
      f.r = (g.r || 0) + (o.fr || 0) * Math.PI / 180; f.ax = g.ax - (o.ax || 0); f.ay = g.ay - (o.ay || 0);
    }
  }
  function restoreAll() {
    for (const [p, v] of ORIG) { const { kind, rest } = rootOf(p); const parts = rest.split('.'); let o = kind === 'obj' ? WZ_OBJS[parts.shift()] : kind === 'ev' ? EVENTS.find((e) => e.id === parts.shift()) : kind === 'fala' ? FALA : BG_TRACKS[+parts.shift()];
      for (let i = 0; i < parts.length - 1 && o; i++) o = o[parts[i]]; if (o) o[parts[parts.length - 1]] = clone(v); }
    ORIG.clear();
    for (const [f, g] of RORIG) { if (g.s && f.s) for (let i = 0; i < g.s.length; i++) f.s[i] = g.s[i]; f.r = g.r; f.ax = g.ax; f.ay = g.ay; }
  }
  // aplica uma configuração inteira (sempre a partir do original)
  function apply(cfg) {
    restoreAll(); cfg = cfg || {};
    for (const [p, v] of Object.entries(cfg.mec || {})) getSet(p, v, true);
    for (const [p, v] of Object.entries(cfg.textos || {})) getSet(p, v, true);
    for (const [p, v] of Object.entries(cfg.pistas || {})) getSet(p, v, true);
    for (const [p, o] of Object.entries(cfg.rostos || {})) { const [set, an, k] = p.split('.'); applyRosto(set, an, +k, o); }
    // contas que dependem dos números
    BC.L = BC.x1 - BC.sx;
    for (const T of BG_TRACKS) T.line = null; if (typeof BG_T !== 'undefined') { const i = BG_TRACKS.indexOf(BG_T); BG_T = null; bgLoad(Math.max(0, i)); }
  }
  return { get, apply, clone };
})();
window.WZ = WZ;

// ---------- guardar: banco da página (db); sem ele, só nos testes locais, no navegador
const WZDB = (() => {
  let db = null, user = null, ready = null; const LOCAL = /[?&]wzlocal=1/.test(location.search) || location.hostname === 'localhost';
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem('wz_' + k) || 'null'); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem('wz_' + k, JSON.stringify(v)); } catch { /* sem espaço */ } };
  function init() {
    if (ready) return ready;
    ready = (async () => {
      try { if (window.claude && window.claude.use) { db = await window.claude.use('db'); user = await window.claude.use('user'); } } catch { db = null; }
      return { db: !!db, owner: user ? !!(await user.isOwner?.()) : LOCAL, local: LOCAL };
    })();
    return ready;
  }
  async function get(k) { await init(); if (db) { try { const s = await db.doc('wz/' + k).get(); return s.exists ? s.data() : null; } catch { return null; } } return LOCAL ? lsGet(k) : null; }
  async function set(k, v) { await init(); if (db) return db.doc('wz/' + k).set(v); if (LOCAL) return lsSet(k, v); throw new Error('sem banco'); }
  async function del(k) { await init(); if (db) return db.doc('wz/' + k).delete(); if (LOCAL) try { localStorage.removeItem('wz_' + k); } catch { /* */ } }
  async function versions() {
    await init();
    if (db) { try { const q = await db.collection('wz').get(); return q.docs.filter((d) => d.id.startsWith('v')).map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.at - a.at); } catch { return []; } }
    return LOCAL ? (lsGet('versoes') || []) : [];
  }
  async function addVersion(v) {
    await init(); const id = 'v' + v.at;
    if (db) return db.doc('wz/' + id).set(v);
    if (LOCAL) { const L = lsGet('versoes') || []; L.unshift({ id, ...v }); lsSet('versoes', L.slice(0, 30)); }
  }
  return { init, get, set, del, versions, addVersion };
})();

// ---------- o jogo carrega a configuração aplicada assim que o banco responde
let WZ_APLICADO = null;
WZDB.init().then(async (st) => {
  const ap = await WZDB.get('aplicado'); if (ap && ap.cfg) { WZ_APLICADO = ap.cfg; if (!(mode === 'play' || mode === 'pause')) WZ.apply(ap.cfg); }
  if (st.owner) wzBotao();
});

// ---------- botão do editor (só para o dono) e a tela do editor
function wzBotao() {
  if (document.getElementById('wz-abrir')) return;
  const b = document.createElement('button'); b.id = 'wz-abrir'; b.type = 'button'; b.textContent = 'Editor';
  b.title = 'Editor do jogo (só você vê)'; b.addEventListener('click', () => wzAbrir()); document.body.appendChild(b);
}
const WZ_CSS = `
#wz-abrir{position:fixed;left:10px;bottom:10px;z-index:60;font:600 13px/1 system-ui,sans-serif;padding:8px 12px;border-radius:8px;border:2px solid #1b1f4f;background:#fff6d6;color:#1b1f4f;cursor:pointer}
#wz{position:fixed;inset:0;z-index:80;background:#f4efe4;color:#1b1f4f;font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;display:grid;grid-template-rows:auto 1fr;}
#wz *{box-sizing:border-box}
#wz header{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 12px;background:#1b1f4f;color:#fff6d6}
#wz header h1{font-size:15px;margin:0 10px 0 0;font-weight:700;letter-spacing:.02em}
#wz header .st{font-size:12px;opacity:.85;margin-right:auto}
#wz button{font:inherit;font-weight:600;font-size:13px;padding:6px 11px;border-radius:7px;border:1.5px solid #1b1f4f;background:#fffaf0;color:#1b1f4f;cursor:pointer}
#wz button.pri{background:#ffd166}
#wz button.dang{background:#ffe1e1}
#wz header button{border-color:#fff6d6}
#wz button:disabled{opacity:.45;cursor:default}
#wz .corpo{display:grid;grid-template-columns:190px 1fr;min-height:0}
#wz nav{background:#e9e1cf;padding:8px;display:flex;flex-direction:column;gap:4px;overflow:auto;border-right:1.5px solid #d2c6ad}
#wz nav button{text-align:left;border-color:transparent;background:transparent}
#wz nav button.on{background:#fffaf0;border-color:#1b1f4f}
#wz main{overflow:auto;padding:14px 16px;min-width:0}
#wz h2{font-size:16px;margin:4px 0 10px}
#wz h3{font-size:14px;margin:14px 0 6px}
#wz .ajuda{font-size:12.5px;color:#4a4f72;margin:0 0 10px;max-width:760px}
#wz .lin{display:grid;grid-template-columns:minmax(150px,280px) 1fr 92px 28px;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid #e3d9c3}
#wz .lin.mud{background:#fff3c4}
#wz .lin small{display:block;color:#6b6f8f;font-size:11px}
#wz input[type=number],#wz input[type=text],#wz select,#wz textarea{font:inherit;padding:5px 7px;border:1.5px solid #b9ad94;border-radius:6px;background:#fff;color:#1b1f4f;width:100%}
#wz textarea{min-height:64px;resize:vertical}
#wz input[type=range]{width:100%;accent-color:#e8484a}
#wz .chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
#wz .chips button.on{background:#1b1f4f;color:#fff6d6}
#wz .pista{display:grid;grid-template-columns:1fr 250px;gap:12px;height:calc(100vh - 130px);min-height:360px}
#wz canvas.pc{width:100%;height:100%;background:#efe6cf;border:1.5px solid #b9ad94;border-radius:8px;touch-action:none}
#wz .lado{overflow:auto;display:flex;flex-direction:column;gap:6px}
#wz .rost{display:grid;grid-template-columns:minmax(260px,1fr) 300px;gap:12px}
#wz canvas.rc{width:100%;max-width:560px;aspect-ratio:1;background:#cfe8ee;border:1.5px solid #b9ad94;border-radius:8px;touch-action:none}
#wz .tira{display:flex;gap:4px;flex-wrap:wrap;margin:6px 0}
#wz .tira button{min-width:34px}
#wz .tira button.on{background:#1b1f4f;color:#fff6d6}
#wz .ver{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #e3d9c3}
#wz .aviso{background:#fff3c4;border:1.5px solid #e2c56a;border-radius:8px;padding:8px 10px;font-size:13px;margin:0 0 10px;max-width:760px}
@media (max-width:760px){#wz .corpo{grid-template-columns:1fr}#wz nav{flex-direction:row;flex-wrap:wrap;border-right:0}#wz .pista,#wz .rost{grid-template-columns:1fr}#wz .lin{grid-template-columns:1fr 1fr 70px 28px}}
`;
const WZE = { cfg: { mec: {}, pistas: {}, rostos: {}, textos: {} }, aba: 'mec', ev: 'bugue', salvo: true, hist: [], aplicadoEm: 0 };
let wzTimer = 0;
function wzMudou() {
  WZE.salvo = false; wzStatus('Salvando rascunho…'); clearTimeout(wzTimer);
  wzTimer = setTimeout(async () => { try { await WZDB.set('rascunho', { cfg: WZE.cfg, at: Date.now() }); WZE.salvo = true; wzStatus('Rascunho salvo'); } catch { wzStatus('Não deu para salvar o rascunho agora'); } }, 1200);
}
function wzStatus(t) { const e = document.getElementById('wz-st'); if (e) e.textContent = t; }
const el = (tag, at = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(at)) { if (k === 'on') for (const [ev, f] of Object.entries(v)) e.addEventListener(ev, f); else if (k === 'class') e.className = v; else if (k in e && k !== 'list') e[k] = v; else e.setAttribute(k, v); } for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c)); return e; };

async function wzAbrir() {
  if (!document.getElementById('wz-css')) document.head.append(el('style', { id: 'wz-css', textContent: WZ_CSS }));
  if (mode === 'play' && typeof pause === 'function') pause();
  const r = await WZDB.get('rascunho'), ap = await WZDB.get('aplicado');
  WZE.cfg = Object.assign({ mec: {}, pistas: {}, rostos: {}, textos: {} }, WZ.clone(r && r.cfg) || WZ.clone(ap && ap.cfg) || {});
  WZE.aplicadoEm = ap ? ap.at : 0;
  WZ.apply(WZE.cfg); // o editor mostra o rascunho
  const box = el('div', { id: 'wz' },
    el('header', {}, el('h1', {}, 'Editor dos Jogos de Verão'), el('span', { class: 'st', id: 'wz-st' }, WZE.aplicadoEm ? `Aplicado pela última vez em ${new Date(WZE.aplicadoEm).toLocaleString('pt-BR')}` : 'Nada aplicado ainda'),
      el('button', { type: 'button', on: { click: wzTestar } }, 'Testar'),
      el('button', { type: 'button', class: 'pri', on: { click: wzAplicar } }, 'Aplicar no jogo'),
      el('button', { type: 'button', on: { click: wzFechar } }, 'Fechar')),
    el('div', { class: 'corpo' },
      el('nav', {}, ...[['mec', 'Mecânicas'], ['pistas', 'Pistas do bugue'], ['rostos', 'Rostos e quadros'], ['textos', 'Textos e falas'], ['versoes', 'Versões e cópia']].map(([k, t]) =>
        el('button', { type: 'button', class: WZE.aba === k ? 'on' : '', on: { click: () => { WZE.aba = k; wzRender(); } } }, t))),
      el('main', { id: 'wz-main' })));
  // as teclas digitadas no editor não chegam no jogo (Espaço, setas, Enter)
  for (const t of ['keydown', 'keyup']) box.addEventListener(t, (e) => e.stopPropagation());
  document.body.append(box); wzRender();
}
function wzFechar() { const b = document.getElementById('wz'); if (b) b.remove(); WZ.apply(WZ_APLICADO); clearInterval(WZE.anim); }
function wzTestar() {
  // joga com o rascunho (só aqui; o jogo dos outros continua com o aplicado). Ao voltar ao menu, abre o editor de novo pelo botão.
  const ev = EVENTS.find((e) => e.id === WZE.ev) || EVENTS[0]; const b = document.getElementById('wz'); if (b) b.remove(); clearInterval(WZE.anim);
  WZ.apply(WZE.cfg); if (ev === bugue && WZE.pista != null) bugue.trackSel = WZE.pista;
  choose(ev); showOv(true); wzAviso('Testando o rascunho. Para voltar a editar, toque em Editor.');
}
function wzAviso(t) { if (typeof say === 'function') say(t); }
async function wzAplicar() {
  const at = Date.now(), nome = prompt('Nome desta versão (opcional):', '') ?? null; if (nome === null) return;
  try {
    await WZDB.set('aplicado', { cfg: WZE.cfg, at, nome });
    await WZDB.addVersion({ cfg: WZE.cfg, at, nome: nome || '' });
    WZ_APLICADO = WZ.clone(WZE.cfg); WZE.aplicadoEm = at; wzStatus(`Aplicado em ${new Date(at).toLocaleString('pt-BR')}: já vale para quem abrir o jogo`);
  } catch { wzStatus('Não deu para aplicar agora. Tente de novo.'); }
}
function wzRender() {
  const m = document.getElementById('wz-main'); if (!m) return; clearInterval(WZE.anim);
  document.querySelectorAll('#wz nav button').forEach((b, i) => b.classList.toggle('on', ['mec', 'pistas', 'rostos', 'textos', 'versoes'][i] === WZE.aba));
  m.replaceChildren(); ({ mec: wzMec, pistas: wzPistas, rostos: wzRostos, textos: wzTextos, versoes: wzVersoes })[WZE.aba](m);
}

// ---------- MECÂNICAS
function wzFolhas(o, base, out = [], depth = 0) {
  if (depth > 3 || o == null) return out;
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'number') out.push({ path: base + '.' + k, key: k });
    else if (Array.isArray(v) && v.every((x) => typeof x === 'number')) v.forEach((x, i) => out.push({ path: `${base}.${k}.${i}`, key: `${k} ${i + 1}` }));
    else if (v && typeof v === 'object' && !Array.isArray(v)) wzFolhas(v, base + '.' + k, out, depth + 1);
  }
  return out;
}
function wzLinha(path, rotulo, sub, sec = 'mec') {
  const atual = WZE.cfg[sec][path], orig = WZ.get(path), v0 = WZ.clone(orig);
  // valor original: o que o jogo tem sem a mudança
  const base = atual !== undefined ? (() => { const save = WZE.cfg[sec][path]; return save; })() : orig;
  const origVal = atual !== undefined ? wzOrig(path) : orig;
  const inp = el('input', { type: 'number', step: 'any', value: String(atual ?? orig) });
  const rng = el('input', { type: 'range' }); const span = Math.max(Math.abs(origVal) * 2, 1);
  rng.min = String(Math.min(0, origVal * 3, -span * (origVal < 0 ? 1 : 0))); rng.max = String(Math.max(origVal * 3, span)); rng.step = String(Math.abs(origVal) < 2 ? .01 : Math.abs(origVal) < 50 ? .1 : 1); rng.value = String(atual ?? orig);
  const linha = el('div', { class: 'lin' + (atual !== undefined ? ' mud' : '') }, el('div', {}, rotulo, sub ? el('small', {}, sub) : null), rng, inp,
    el('button', { type: 'button', title: `Voltar ao original (${origVal})`, on: { click: () => { delete WZE.cfg[sec][path]; WZ.apply(WZE.cfg); wzMudou(); wzRender(); } } }, '↺'));
  const set = (v) => { if (!isFinite(v)) return; if (Math.abs(v - origVal) < 1e-12) delete WZE.cfg[sec][path]; else WZE.cfg[sec][path] = v; linha.classList.toggle('mud', WZE.cfg[sec][path] !== undefined); WZ.apply(WZE.cfg); wzMudou(); };
  rng.addEventListener('input', () => { inp.value = rng.value; set(+rng.value); });
  inp.addEventListener('change', () => { rng.value = inp.value; set(+inp.value); });
  void base; void v0; return linha;
}
// o valor original de um caminho (antes de qualquer mudança)
function wzOrig(path) { const save = WZ.clone(WZE.cfg); const c = WZ.clone(WZE.cfg); for (const s of ['mec', 'textos', 'pistas']) delete c[s][path]; WZ.apply(c); const v = WZ.get(path); WZ.apply(save); return v; }
function wzMec(m) {
  m.append(el('h2', {}, 'Mecânicas'), el('p', { class: 'ajuda' }, 'Escolha a prova e mude os números. A linha fica amarela quando está diferente do original; o ↺ volta ao original. Use "Testar" lá em cima para jogar a prova com as mudanças. Os nomes técnicos aparecem quando o número ainda não tem nome em português.'));
  m.append(el('div', { class: 'chips' }, ...EVENTS.map((e) => el('button', { type: 'button', class: WZE.ev === e.id ? 'on' : '', on: { click: () => { WZE.ev = e.id; wzRender(); } } }, e.name))));
  const ev = EVENTS.find((e) => e.id === WZE.ev) || EVENTS[0];
  m.append(el('h3', {}, 'Partida e medalhas'));
  for (const k of ['dur', 'med.0', 'med.1', 'med.2']) if (WZ.get(`ev:${ev.id}.${k}`) !== undefined && typeof WZ.get(`ev:${ev.id}.${k}`) === 'number') m.append(wzLinha(`ev:${ev.id}.${k}`, WZ_EVF[k]));
  for (const nm of WZ_REG[ev.id] || []) {
    const o = WZ_OBJS[nm]; if (!o) continue; const folhas = wzFolhas(o, nm); if (!folhas.length) continue;
    m.append(el('h3', {}, nm === 'BG' ? 'Corrida' : nm === 'BC' ? 'Cancha e física' : `Ajustes (${nm})`));
    for (const f of folhas) { const k0 = f.path.split('.').pop(), desc = (WZ_DESC[nm] || {})[k0]; m.append(wzLinha(f.path, desc || WZ_NOMES[k0] || f.key, desc ? f.path.replace(nm + '.', '') : WZ_NOMES[k0] ? f.path : 'nome técnico: ' + f.path)); }
  }
  if (!(WZ_REG[ev.id] || []).length) m.append(el('p', { class: 'ajuda' }, 'Esta prova ainda não tem números separados para editar aqui (só a partida e as medalhas).'));
}

// ---------- PISTAS DO BUGUE
function wzPistas(m) {
  const ti = WZE.pista ?? 0; WZE.pista = ti; WZE.ev = 'bugue';
  const P = () => { const k = `pista:${ti}.`; const T = BG_TRACKS[ti]; const o = {}; for (const c of WZ_PISTA_CAMPOS) o[c] = WZE.cfg.pistas[k + c] !== undefined ? WZ.clone(WZE.cfg.pistas[k + c]) : WZ.clone(T[c]); return o; };
  let D = P(); const line = () => bgLine(D.pts);
  let L = line();
  const MODOS = [['pts', 'Pontos da pista'], ['boxes', 'Caixas'], ['ramps', 'Rampas'], ['pads', 'Esteiras'], ['fofa', 'Areia fofa'], ['sc', 'Atalhos'], ['slopes', 'Ladeiras'], ['farol', 'Farol']];
  WZE.pmodo = WZE.pmodo || 'pts';
  const salvar = () => { for (const c of WZ_PISTA_CAMPOS) { const k = `pista:${ti}.${c}`; WZE.cfg.pistas[k] = WZ.clone(D[c]); } WZ.apply(WZE.cfg); wzMudou(); };
  const desfazer = () => { const h = WZE.hist.pop(); if (h) { D = h; L = line(); salvar(); desenha(); } };
  const marca = () => { WZE.hist.push(WZ.clone(D)); if (WZE.hist.length > 60) WZE.hist.shift(); };
  m.append(el('h2', {}, 'Pistas do bugue'),
    el('p', { class: 'ajuda' }, 'Escolha a pista e o que quer mexer. Arraste para mover. Clique na pista para pôr uma peça nova; clique numa peça com a tecla Shift (ou o botão "Apagar selecionada") para tirar. Pontos da pista: duplo clique na pista põe um ponto novo ali. Arraste o fundo para andar e use a rodinha do mouse (ou os botões) para aproximar.'),
    el('div', { class: 'chips' }, ...BG_TRACKS.map((T, i) => el('button', { type: 'button', class: i === ti ? 'on' : '', on: { click: () => { WZE.pista = i; WZE.hist = []; wzRender(); } } }, T.name))));
  const cv = el('canvas', { class: 'pc' }), g = cv.getContext('2d');
  const info = el('div', { class: 'ajuda' });
  const lado = el('div', { class: 'lado' },
    el('div', { class: 'chips' }, ...MODOS.map(([k, t]) => el('button', { type: 'button', class: WZE.pmodo === k ? 'on' : '', on: { click: (e) => { WZE.pmodo = k; WZE.sel = null; e.target.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target)); desenha(); } } }, t))),
    info,
    el('button', { type: 'button', on: { click: () => apagaSel() } }, 'Apagar selecionada'),
    el('button', { type: 'button', on: { click: desfazer } }, 'Desfazer'),
    el('button', { type: 'button', on: { click: () => { zoom *= 1.25; desenha(); } } }, 'Aproximar'),
    el('button', { type: 'button', on: { click: () => { zoom /= 1.25; desenha(); } } }, 'Afastar'),
    el('button', { type: 'button', on: { click: () => { enquadra(); desenha(); } } }, 'Ver a pista inteira'),
    el('h3', {}, 'Nome e fala'),
    (() => { const i = el('input', { type: 'text', value: D.name }); i.addEventListener('change', () => { marca(); D.name = i.value; salvar(); }); return i; })(),
    (() => { const i = el('textarea', { value: D.fala }); i.addEventListener('change', () => { marca(); D.fala = i.value; salvar(); }); return i; })(),
    el('button', { type: 'button', class: 'dang', on: { click: () => { if (!confirm('Voltar esta pista ao original?')) return; for (const c of WZ_PISTA_CAMPOS) delete WZE.cfg.pistas[`pista:${ti}.${c}`]; WZ.apply(WZE.cfg); wzMudou(); wzRender(); } } }, 'Voltar a pista ao original'));
  m.append(el('div', { class: 'pista' }, cv, lado));
  let zoom = 1, cx = 0, cy = 0;
  const enquadra = () => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const q of L) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); } cx = (x0 + x1) / 2; cy = (y0 + y1) / 2; const r = cv.getBoundingClientRect(); zoom = Math.min(r.width / (x1 - x0 + 400), r.height / (y1 - y0 + 400)) || .2; };
  const W2 = () => cv.getBoundingClientRect();
  const toS = (x, y) => { const r = W2(); return [r.width / 2 + (x - cx) * zoom, r.height / 2 + (y - cy) * zoom]; };
  const toW = (sx, sy) => { const r = W2(); return [cx + (sx - r.width / 2) / zoom, cy + (sy - r.height / 2) / zoom]; };
  const near = (x, y) => { let b = 0, bd = 1e18; L.forEach((q, i) => { const d = (q[0] - x) ** 2 + (q[1] - y) ** 2; if (d < bd) { bd = d; b = i; } }); return { i: b, d: Math.sqrt(bd) }; };
  const n = () => L.length;
  const lp = (i) => L[((i % n()) + n()) % n()];
  const ang = (i) => { const p = lp(i), q = lp(i + 2); return Math.atan2(q[1] - p[1], q[0] - p[0]); };
  function desenha() {
    const r = W2(), dpr = window.devicePixelRatio || 1; cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#efe6cf'; g.fillRect(0, 0, r.width, r.height);
    g.save(); g.translate(r.width / 2, r.height / 2); g.scale(zoom, zoom); g.translate(-cx, -cy);
    const path = () => { g.beginPath(); L.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); };
    g.lineJoin = 'round'; path(); g.strokeStyle = '#e8484a'; g.lineWidth = BG.hw * 2 + 14; g.stroke(); path(); g.strokeStyle = '#e2c79c'; g.lineWidth = BG.hw * 2; g.stroke();
    path(); g.strokeStyle = 'rgba(27,31,79,.35)'; g.lineWidth = 3 / zoom; g.setLineDash([12 / zoom, 10 / zoom]); g.stroke(); g.setLineDash([]);
    // ladeiras
    for (const z of D.slopes) { g.beginPath(); for (let i = z.a; i <= z.b; i++) { const p = lp(i); i === z.a ? g.moveTo(p[0], p[1]) : g.lineTo(p[0], p[1]); } g.strokeStyle = z.s > 0 ? 'rgba(80,160,255,.45)' : 'rgba(150,80,30,.45)'; g.lineWidth = BG.hw * 1.4; g.stroke(); }
    // atalhos
    for (const c of D.sc) { const A = lp(c.a), B = lp(c.b); g.strokeStyle = c.kind === 'agua' ? 'rgba(47,143,208,.75)' : 'rgba(176,132,78,.75)'; g.lineWidth = BG.sw * 2; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke(); if (c.ramp) { g.fillStyle = '#7a5233'; const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; g.fillRect(M[0] - 12, M[1] - 12, 24, 24); } }
    const mk = (i, col, s, lab) => { const p = lp(i); g.fillStyle = col; g.strokeStyle = '#1b1f4f'; g.lineWidth = 2 / zoom; g.beginPath(); g.arc(p[0], p[1], s, 0, Math.PI * 2); g.fill(); g.stroke(); if (lab) { g.fillStyle = '#1b1f4f'; g.font = `${14 / zoom}px system-ui`; g.fillText(lab, p[0] + s + 4 / zoom, p[1]); } };
    D.ramps.forEach((i) => { const p = lp(i), a = ang(i); g.save(); g.translate(p[0], p[1]); g.rotate(a); g.fillStyle = '#9b6a3a'; g.fillRect(-12, -BG.hw + 4, 24, BG.hw * 2 - 8); g.restore(); });
    D.boxes.forEach((i) => { const p = lp(i), a = ang(i); for (const j of [-2, -1, 0, 1, 2]) { const x = p[0] - Math.sin(a) * j * 31, y = p[1] + Math.cos(a) * j * 31; g.fillStyle = '#ffd166'; g.fillRect(x - 7, y - 7, 14, 14); } });
    D.pads.forEach((pd) => { const p = lp(pd.i), a = ang(pd.i); g.save(); g.translate(p[0] - Math.sin(a) * pd.o, p[1] + Math.cos(a) * pd.o); g.rotate(a); g.fillStyle = '#2d3350'; g.fillRect(-17, -BG.padW, 34, BG.padW * 2); g.restore(); });
    D.fofa.forEach((i) => mk(i, 'rgba(176,132,78,.9)', 26));
    if (D.farol) { g.fillStyle = '#e8484a'; g.beginPath(); g.arc(D.farol[0], D.farol[1], 44, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(D.farol[0], D.farol[1], 22, 0, Math.PI * 2); g.fill(); }
    mk(0, '#ffffff', 16, 'largada');
    // pontos de controle
    if (WZE.pmodo === 'pts') D.pts.forEach((q, i) => { g.fillStyle = WZE.sel === i ? '#ffd166' : '#ffffff'; g.strokeStyle = '#1b1f4f'; g.lineWidth = 3 / zoom; g.beginPath(); g.arc(q[0], q[1], 9 / zoom + 6, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = '#1b1f4f'; g.font = `bold ${12 / zoom}px system-ui`; g.fillText(String(i + 1), q[0] - 4 / zoom, q[1] + 4 / zoom); });
    // seleção
    const s = WZE.sel; if (s != null && WZE.pmodo !== 'pts') { const pos = selPos(s); if (pos) { g.strokeStyle = '#ff2d55'; g.lineWidth = 4 / zoom; g.beginPath(); g.arc(pos[0], pos[1], 30, 0, Math.PI * 2); g.stroke(); } }
    g.restore();
    info.textContent = { pts: `Pontos da pista: ${D.pts.length}. Arraste os pontos; duplo clique na pista põe um novo; com a pista mudando, as peças acompanham.`, boxes: `Caixas: ${D.boxes.length} fileiras (5 caixas cada). Clique na pista para pôr.`, ramps: `Rampas: ${D.ramps.length}.`, pads: `Esteiras: ${D.pads.length}. Arraste para os lados para mudar a faixa.`, fofa: `Areia fofa: ${D.fofa.length} (fica por dentro da curva).`, sc: `Atalhos: ${D.sc.length}. Clique na pista na entrada e depois na saída. Selecionado: botões abaixo trocam água/areia e a rampa.`, slopes: `Ladeiras: ${D.slopes.length}. Clique no começo e no fim. Azul desce (embala), marrom sobe (segura).`, farol: D.farol ? 'Arraste o farol.' : 'Esta pista não tem farol. Clique para pôr um.' }[WZE.pmodo];
    extras();
  }
  // botões extras do modo (atalho e ladeira selecionados)
  const extraBox = el('div', { class: 'chips' }); lado.insertBefore(extraBox, lado.children[2]);
  function extras() {
    extraBox.replaceChildren(); const s = WZE.sel;
    if (WZE.pmodo === 'sc' && s != null && D.sc[s]) { const c = D.sc[s]; extraBox.append(el('button', { type: 'button', on: { click: () => { marca(); c.kind = c.kind === 'agua' ? 'fofa' : 'agua'; salvar(); desenha(); } } }, c.kind === 'agua' ? 'Água → areia fofa' : 'Areia fofa → água'), el('button', { type: 'button', on: { click: () => { marca(); c.ramp = !c.ramp; if (!c.ramp) delete c.ramp; salvar(); desenha(); } } }, c.ramp ? 'Tirar a rampa' : 'Pôr rampa (salto)')); }
    if (WZE.pmodo === 'slopes' && s != null && D.slopes[s]) { const z = D.slopes[s]; extraBox.append(el('button', { type: 'button', on: { click: () => { marca(); z.s = -z.s; salvar(); desenha(); } } }, z.s > 0 ? 'Virar subida' : 'Virar descida')); }
  }
  function selPos(s) { const md = WZE.pmodo; if (md === 'boxes' || md === 'ramps' || md === 'fofa') return D[md][s] != null ? lp(D[md][s]) : null; if (md === 'pads') return D.pads[s] ? lp(D.pads[s].i) : null; if (md === 'sc') return D.sc[s] ? lp(D.sc[s].a) : null; if (md === 'slopes') return D.slopes[s] ? lp(D.slopes[s].a) : null; return null; }
  function apagaSel() {
    const s = WZE.sel, md = WZE.pmodo; if (s == null) return; marca();
    if (md === 'pts') { if (D.pts.length <= 4) return; D.pts.splice(s, 1); remap(s, -1); }
    else if (D[md] && Array.isArray(D[md])) D[md].splice(s, 1);
    WZE.sel = null; L = line(); salvar(); desenha();
  }
  // ao pôr ou tirar um ponto da pista, as peças depois dele andam junto (cada ponto vira 24 pedacinhos da linha)
  function remap(at, dir) {
    const cut = at * 24, f = (i) => (i >= cut ? Math.max(0, i + dir * 24) : i);
    D.boxes = D.boxes.map(f); D.ramps = D.ramps.map(f); D.fofa = D.fofa.map(f); D.pads.forEach((p) => { p.i = f(p.i); }); D.sc.forEach((c) => { c.a = f(c.a); c.b = f(c.b); }); D.slopes.forEach((z) => { z.a = f(z.a); z.b = f(z.b); });
  }
  let drag = null, pend = null;
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId); const r = W2(), [x, y] = toW(e.clientX - r.left, e.clientY - r.top), md = WZE.pmodo, tol = 22 / zoom;
    const hit = (pts) => { let b = -1, bd = 1e18; pts.forEach((p, i) => { if (!p) return; const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; b = i; } }); return bd < Math.max(tol, 40) ? b : -1; };
    let h = -1;
    if (md === 'pts') h = hit(D.pts.map((q) => q));
    else if (md === 'boxes' || md === 'ramps' || md === 'fofa') h = hit(D[md].map((i) => lp(i)));
    else if (md === 'pads') h = hit(D.pads.map((p) => { const q = lp(p.i), a = ang(p.i); return [q[0] - Math.sin(a) * p.o, q[1] + Math.cos(a) * p.o]; }));
    else if (md === 'sc') h = hit(D.sc.map((c) => lp(c.a)));
    else if (md === 'slopes') h = hit(D.slopes.map((z) => lp(z.a)));
    else if (md === 'farol' && D.farol && Math.hypot(D.farol[0] - x, D.farol[1] - y) < 80) h = 0;
    if (h >= 0 && e.shiftKey && md !== 'farol') { WZE.sel = h; apagaSel(); return; }
    if (h >= 0) { marca(); WZE.sel = h; drag = { md, h, moved: false }; desenha(); return; }
    const nr = near(x, y);
    if (md !== 'pts' && md !== 'farol' && nr.d < BG.hw * 1.3) {
      marca();
      if (md === 'boxes' || md === 'ramps' || md === 'fofa') { D[md].push(nr.i); D[md].sort((a, b) => a - b); WZE.sel = D[md].indexOf(nr.i); }
      else if (md === 'pads') { D.pads.push({ i: nr.i, o: 0 }); WZE.sel = D.pads.length - 1; }
      else if (md === 'sc' || md === 'slopes') { if (!pend) { pend = { md, a: nr.i }; info.textContent = 'Agora clique onde termina.'; return; } const a = pend.a, b = nr.i; pend = null; if (md === 'sc') D.sc.push({ a: Math.min(a, b), b: Math.max(a, b), kind: 'agua' }); else D.slopes.push({ a: Math.min(a, b), b: Math.max(a, b), s: 1 }); WZE.sel = D[md].length - 1; }
      salvar(); desenha(); return;
    }
    if (md === 'farol' && !D.farol) { marca(); D.farol = [Math.round(x), Math.round(y)]; salvar(); desenha(); return; }
    drag = { pan: true, sx: e.clientX, sy: e.clientY, cx, cy };
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return; const r = W2(), [x, y] = toW(e.clientX - r.left, e.clientY - r.top);
    if (drag.pan) { cx = drag.cx - (e.clientX - drag.sx) / zoom; cy = drag.cy - (e.clientY - drag.sy) / zoom; desenha(); return; }
    drag.moved = true; const md = drag.md, h = drag.h;
    if (md === 'pts') { D.pts[h] = [Math.round(x), Math.round(y)]; L = line(); }
    else if (md === 'farol') D.farol = [Math.round(x), Math.round(y)];
    else { const nr = near(x, y);
      if (md === 'boxes' || md === 'ramps' || md === 'fofa') D[md][h] = nr.i;
      else if (md === 'pads') { const p = D.pads[h], q = lp(nr.i), a = ang(nr.i); p.i = nr.i; p.o = Math.round(Math.max(-BG.hw + BG.padW, Math.min(BG.hw - BG.padW, -(x - q[0]) * Math.sin(a) + (y - q[1]) * Math.cos(a)))); }
      else if (md === 'sc') { const c = D.sc[h], len = c.b - c.a; c.a = nr.i; c.b = nr.i + len; }
      else if (md === 'slopes') { const z = D.slopes[h], len = z.b - z.a; z.a = nr.i; z.b = nr.i + len; } }
    desenha();
  });
  cv.addEventListener('pointerup', () => { if (drag && !drag.pan) { if (drag.moved) salvar(); else WZE.hist.pop(); } drag = null; });
  cv.addEventListener('dblclick', (e) => {
    if (WZE.pmodo !== 'pts') return; const r = W2(), [x, y] = toW(e.clientX - r.left, e.clientY - r.top), nr = near(x, y); if (nr.d > BG.hw * 1.5) return;
    marca(); const at = Math.floor(nr.i / 24) + 1; D.pts.splice(at, 0, [Math.round(x), Math.round(y)]); remap(at, 1); L = line(); WZE.sel = at; salvar(); desenha();
  });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); zoom *= e.deltaY < 0 ? 1.12 : 1 / 1.12; desenha(); }, { passive: false });
  requestAnimationFrame(() => { enquadra(); desenha(); });
  WZE.redesenha = desenha;
}

// ---------- ROSTOS E QUADROS
function wzRostos(m) {
  WZE.rset = WZE.rset || 'ia'; const S = WZ_SETS.find((s) => s.id === WZE.rset), A0 = S.atl();
  m.append(el('h2', {}, 'Rostos e quadros'), el('p', { class: 'ajuda' }, 'Escolha o personagem, o movimento e o quadro. Arraste o rosto para mudar a posição dentro do visor; use os controles para o tamanho, o giro e o encaixe do quadro (para o desenho não pular de um quadro para outro). O rosto só aparece dentro do visor (a parte escura do desenho). "Tocar" mostra o movimento andando.'));
  m.append(el('div', { class: 'chips' }, ...WZ_SETS.map((s) => el('button', { type: 'button', class: s.id === WZE.rset ? 'on' : '', on: { click: () => { WZE.rset = s.id; WZE.ran = null; WZE.rk = 0; wzRender(); } } }, s.nome))));
  if (!A0 || !window.__fr || !window.__fr[S.id]) { m.append(el('p', { class: 'aviso' }, 'Os desenhos deste personagem ainda estão carregando. Volte nesta aba em alguns segundos.')); return; }
  const anims = Object.keys(A0.a).filter((a) => !/_\d$/.test(a)); WZE.ran = WZE.ran && A0.a[WZE.ran] ? WZE.ran : anims[0]; WZE.rk = Math.min(WZE.rk || 0, A0.a[WZE.ran].f.length - 1);
  const sel = el('select', {}, ...anims.map((a) => el('option', { value: a, selected: a === WZE.ran }, a))); sel.addEventListener('change', () => { WZE.ran = sel.value; WZE.rk = 0; wzRender(); });
  const cv = el('canvas', { class: 'rc' }), g = cv.getContext('2d'), key = () => `${S.id}.${WZE.ran}.${WZE.rk}`;
  const cur = () => WZE.cfg.rostos[key()] || {};
  const setv = (k, v) => { const o = { ...cur(), [k]: v }; if (!o.fx && !o.fy && (o.fs ?? 1) === 1 && !o.fr && !o.ax && !o.ay) delete WZE.cfg.rostos[key()]; else WZE.cfg.rostos[key()] = o; WZ.apply(WZE.cfg); wzMudou(); desenha(); campos(); };
  let ex = WZE.rex || 0, toca = false, zoom = WZE.rzoom || 5;
  const tira = el('div', { class: 'tira' });
  const ctl = el('div', {});
  const mud = (k) => (WZE.cfg.rostos[`${S.id}.${WZE.ran}.${k}`] ? ' •' : '');
  function campos() {
    tira.replaceChildren(...A0.a[WZE.ran].f.map((_, k) => el('button', { type: 'button', class: k === WZE.rk ? 'on' : '', on: { click: () => { WZE.rk = k; toca = false; desenha(); campos(); } } }, `${k + 1}${mud(k)}`)));
    const o = cur(), f = A0.a[WZE.ran].f[WZE.rk];
    const num = (rot, k, step, def, conv = (v) => v) => { const i = el('input', { type: 'number', step: String(step), value: String(o[k] ?? def) }); i.addEventListener('change', () => setv(k, conv(+i.value))); return el('div', { class: 'lin', style: 'grid-template-columns:1fr 110px' }, rot, i); };
    ctl.replaceChildren(
      f.s ? el('div', {}, el('h3', {}, 'Rosto neste quadro'),
        num('Para a direita (pixels do desenho)', 'fx', 1, 0), num('Para baixo (pixels do desenho)', 'fy', 1, 0), num('Tamanho (1 = original)', 'fs', .02, 1), num('Giro (graus)', 'fr', 1, 0)) : el('p', { class: 'ajuda' }, 'Este quadro não tem visor (sem rosto).'),
      el('h3', {}, 'Encaixe do quadro'), num('Mover o desenho para a direita', 'ax', 1, 0), num('Mover o desenho para baixo', 'ay', 1, 0),
      el('div', { class: 'chips' },
        el('button', { type: 'button', on: { click: () => { const o2 = cur(); A0.a[WZE.ran].f.forEach((_, k) => { const kk = `${S.id}.${WZE.ran}.${k}`; if (Object.keys(o2).length) WZE.cfg.rostos[kk] = { ...o2 }; else delete WZE.cfg.rostos[kk]; }); WZ.apply(WZE.cfg); wzMudou(); desenha(); campos(); } } }, 'Copiar para todos os quadros'),
        el('button', { type: 'button', on: { click: () => { delete WZE.cfg.rostos[key()]; WZ.apply(WZE.cfg); wzMudou(); desenha(); campos(); } } }, 'Voltar este quadro'),
        el('button', { type: 'button', class: 'dang', on: { click: () => { A0.a[WZE.ran].f.forEach((_, k) => delete WZE.cfg.rostos[`${S.id}.${WZE.ran}.${k}`]); WZ.apply(WZE.cfg); wzMudou(); desenha(); campos(); } } }, 'Voltar o movimento todo')),
      el('h3', {}, 'Ver'),
      (() => { const s2 = el('select', {}, ...['0 normal', '1 feliz', '2 rindo', '3 espanto', '4 bravo', '5 concentrado'].map((t, i) => el('option', { value: i, selected: i === ex }, 'Rosto ' + t))); s2.addEventListener('change', () => { ex = WZE.rex = +s2.value; desenha(); }); return s2; })(),
      (() => { const r = el('input', { type: 'range', min: '2', max: '12', step: '.5', value: String(zoom) }); r.addEventListener('input', () => { zoom = WZE.rzoom = +r.value; desenha(); }); return el('div', { class: 'lin', style: 'grid-template-columns:90px 1fr' }, 'Aproximar', r); })(),
      el('button', { type: 'button', on: { click: () => { toca = !toca; } } }, 'Tocar / parar'));
  }
  m.append(el('div', { class: 'chips' }, 'Movimento: ', sel), tira, el('div', { class: 'rost' }, cv, ctl));
  function desenha() {
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; if (!r.width) return; cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    const save = ctx; ctx = g; try {
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#cfe8ee'; g.fillRect(0, 0, r.width, r.height);
      g.fillStyle = '#e9d7ad'; g.fillRect(0, r.height * .82, r.width, r.height * .18); g.strokeStyle = 'rgba(27,31,79,.3)'; g.beginPath(); g.moveTo(r.width / 2, 0); g.lineTo(r.width / 2, r.height); g.stroke();
      g.translate(r.width / 2, r.height * .82); g.scale(zoom, zoom); S.fn(WZE.ran, WZE.rk, ex);
    } catch { /* desenho carregando */ } finally { ctx = save; }
  }
  // arrastar o rosto
  let dr = null;
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); const o = cur(); dr = { x: e.clientX, y: e.clientY, fx: o.fx || 0, fy: o.fy || 0 }; });
  cv.addEventListener('pointermove', (e) => { if (!dr) return; const k = 1 / (zoom * S.esc()), o = { ...cur(), fx: Math.round(dr.fx + (e.clientX - dr.x) * k), fy: Math.round(dr.fy + (e.clientY - dr.y) * k) }; WZE.cfg.rostos[key()] = o; WZ.apply(WZE.cfg); desenha(); });
  cv.addEventListener('pointerup', () => { if (dr) { dr = null; wzMudou(); campos(); } });
  campos(); requestAnimationFrame(desenha);
  let t = 0; WZE.anim = setInterval(() => { if (!document.getElementById('wz-main')) return; if (toca) { t++; WZE.rk = t % A0.a[WZE.ran].f.length; desenha(); if (t % 4 === 0) campos(); } }, 125);
}

// ---------- TEXTOS E FALAS
function wzTextos(m) {
  m.append(el('h2', {}, 'Textos e falas'), el('p', { class: 'ajuda' }, 'Uma fala por linha: o jogo sorteia uma delas. Os nomes das provas e a linha de baixo do nome também mudam aqui. Use linguagem neutra.'));
  m.append(el('h3', {}, 'Nomes das provas'));
  for (const e of EVENTS) for (const k of ['name', 'tag']) {
    const p = `ev:${e.id}.${k}`, i = el('input', { type: 'text', value: WZE.cfg.textos[p] ?? e[k] });
    i.addEventListener('change', () => { if (i.value === wzOrigT(p)) delete WZE.cfg.textos[p]; else WZE.cfg.textos[p] = i.value; WZ.apply(WZE.cfg); wzMudou(); });
    m.append(el('div', { class: 'lin', style: 'grid-template-columns:200px 1fr' }, `${e.name} · ${k === 'name' ? 'nome' : 'subtítulo'}`, i));
  }
  const grupos = [];
  const walk = (o, base) => { for (const [k, v] of Object.entries(o)) { if (Array.isArray(v) && v.every((x) => typeof x === 'string')) grupos.push(base ? `${base}.${k}` : k); else if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, base ? `${base}.${k}` : k); } };
  walk(FALA, '');
  m.append(el('h3', {}, 'Falas do IAmiguinho'));
  for (const gk of grupos) {
    const p = `fala:${gk}`, v = WZE.cfg.textos[p] ?? WZ.get(p), ta = el('textarea', { value: v.join('\n') });
    ta.addEventListener('change', () => { const arr = ta.value.split('\n').map((s) => s.trim()).filter(Boolean); if (!arr.length) return; WZE.cfg.textos[p] = arr; WZ.apply(WZE.cfg); wzMudou(); });
    m.append(el('div', { class: 'lin', style: 'grid-template-columns:200px 1fr 28px' }, gk, ta, el('button', { type: 'button', title: 'Voltar ao original', on: { click: () => { delete WZE.cfg.textos[p]; WZ.apply(WZE.cfg); wzMudou(); wzRender(); } } }, '↺')));
  }
}
function wzOrigT(p) { const c = WZ.clone(WZE.cfg); delete c.textos[p]; WZ.apply(c); const v = WZ.get(p); WZ.apply(WZE.cfg); return v; }

// ---------- VERSÕES E CÓPIA
async function wzVersoes(m) {
  m.append(el('h2', {}, 'Versões e cópia de segurança'), el('p', { class: 'ajuda' }, 'Cada vez que você aplica, uma versão fica guardada. "Trazer para o rascunho" coloca aquela versão no rascunho (aí é só testar e aplicar). A cópia de segurança é um texto com tudo o que você mudou: copie e guarde, ou cole uma cópia para trazer de volta.'));
  const lista = el('div', {}, 'Carregando…'); m.append(lista);
  const vs = await WZDB.versions(); lista.replaceChildren(...(vs.length ? vs.map((v) => el('div', { class: 'ver' }, el('div', {}, el('b', {}, v.nome || 'Sem nome'), ' · ', new Date(v.at).toLocaleString('pt-BR')),
    el('button', { type: 'button', on: { click: () => { if (!confirm('Trocar o rascunho por esta versão?')) return; WZE.cfg = Object.assign({ mec: {}, pistas: {}, rostos: {}, textos: {} }, WZ.clone(v.cfg)); WZ.apply(WZE.cfg); wzMudou(); wzStatus('Versão trazida para o rascunho'); } } }, 'Trazer para o rascunho'))) : [el('p', { class: 'ajuda' }, 'Nenhuma versão aplicada ainda.')]));
  const conta = (o) => Object.keys(o || {}).length;
  m.append(el('h3', {}, 'O rascunho agora'), el('p', { class: 'ajuda' }, `${conta(WZE.cfg.mec)} números, ${conta(WZE.cfg.pistas)} partes de pistas, ${conta(WZE.cfg.rostos)} quadros e ${conta(WZE.cfg.textos)} textos mudados.`));
  const ta = el('textarea', { style: 'min-height:140px;max-width:760px', value: JSON.stringify(WZE.cfg) });
  m.append(ta, el('div', { class: 'chips', style: 'margin-top:8px' },
    el('button', { type: 'button', on: { click: async () => { try { await navigator.clipboard.writeText(ta.value); wzStatus('Cópia copiada'); } catch { ta.select(); wzStatus('Selecione e copie o texto'); } } } }, 'Copiar a cópia de segurança'),
    el('button', { type: 'button', on: { click: () => { try { const c = JSON.parse(ta.value); if (!c || typeof c !== 'object') throw 0; WZE.cfg = Object.assign({ mec: {}, pistas: {}, rostos: {}, textos: {} }, c); WZ.apply(WZE.cfg); wzMudou(); wzStatus('Cópia colada no rascunho'); } catch { wzStatus('Esse texto não é uma cópia válida'); } } } }, 'Colar no rascunho'),
    el('button', { type: 'button', class: 'dang', on: { click: () => { if (!confirm('Apagar todas as mudanças do rascunho? (o que já foi aplicado continua no jogo)')) return; WZE.cfg = { mec: {}, pistas: {}, rostos: {}, textos: {} }; WZ.apply(WZE.cfg); wzMudou(); wzRender(); } } }, 'Limpar o rascunho')));
}
