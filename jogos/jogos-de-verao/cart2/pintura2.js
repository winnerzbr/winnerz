// ---------- PINTURA, a tela (01/11/2026, 3ª etapa: com a cara e os gestos do Procreate)
// Galeria (o que pintar) e estúdio em tela cheia, escuro. Em cima, à esquerda: Galeria, Ações (chave), Ajustes (varinha),
// Seleção, Transformar; à direita: Pincel, Borrar, Borracha, Camadas e a cor. Do lado: tamanho, conta-gotas, opacidade,
// desfazer e refazer. Embaixo: as opções da ferramenta e o assistente de animação (quadros, cebola, tocar, copiar camada).
// Gestos: pinça (aproxima, gira e move), pinça rápida para dentro (encaixa), 2 dedos tocando = desfazer, 3 = refazer,
// 4 = esconder a interface, 3 dedos para baixo = copiar e colar, dedo parado = conta-gotas. Com a caneta, o dedo não pinta.

const WZP_MODOS = [['source-over', 'Normal', 'N'], ['multiply', 'Multiplicar', 'M'], ['screen', 'Tela', 'Te'], ['overlay', 'Sobrepor', 'So'], ['soft-light', 'Luz suave', 'Ls'], ['hard-light', 'Luz forte', 'Lf'],
  ['darken', 'Escurecer', 'E'], ['lighten', 'Clarear', 'C'], ['color-dodge', 'Subexposição de cor', 'Sc'], ['color-burn', 'Superexposição de cor', 'Su'], ['lighter', 'Adicionar', 'A'], ['difference', 'Diferença', 'D'],
  ['hue', 'Matiz', 'Ma'], ['saturation', 'Saturação', 'Sa'], ['color', 'Cor', 'Co'], ['luminosity', 'Luminosidade', 'Lu']];
const WZP_ICO = {
  chave: '<path d="M14.5 5.5a4 4 0 0 0-5 5l-5.7 5.7a1.6 1.6 0 0 0 2.3 2.3l5.7-5.7a4 4 0 0 0 5-5l-2.6 2.6-2.4-.5-.5-2.4z"/>',
  varinha: '<path d="M4 20 15 9M14 4v3M18 6l-2 2M20 10h-3M9.5 4.5l.8 1.6M19.5 14.5l-1.6-.8"/>',
  selecao: '<path d="M8 4c-3 0-4 2-4 4 0 3 3 3 6 3s6 1 6 4-2 4-5 4" stroke-dasharray="2.5 2"/><path d="M15 5l4 4"/>',
  seta: '<path d="M6 3l12 8-5 1.5 3 6-2 1-3-6L7 17z"/>',
  pincel: '<path d="M19.5 3.5c-3 2-7 6.5-9 9.5l1.5 1.5c3-2 7.5-6 9.5-9z"/><path d="M9.5 14c-2 0-3.5 1.5-3.5 3.5 0 1-1 2-2 2 3 1 6.5 0 7-3.5z"/>',
  dedo: '<path d="M9 21v-5l-2.5-3a1.5 1.5 0 0 1 2.3-2l1.2 1.3V5a1.5 1.5 0 0 1 3 0v5.5l4.2.8A2 2 0 0 1 18.8 14l-1 7"/>',
  borracha: '<path d="M4 15.5 13.5 6a2 2 0 0 1 2.8 0l3.7 3.7a2 2 0 0 1 0 2.8L13 19.5H8z"/><path d="M8.5 11 15 17.5M8 19.5h12"/>',
  camadas: '<rect x="7" y="3" width="13" height="13" rx="2"/><path d="M4 7v11a2 2 0 0 0 2 2h11"/>',
  desfazer: '<path d="M9 7 4.5 11.5 9 16"/><path d="M5 11.5h9a5 5 0 0 1 0 10h-2"/>',
  refazer: '<path d="M15 7l4.5 4.5L15 16"/><path d="M19 11.5h-9a5 5 0 0 0 0 10h2"/>',
  salvar: '<path d="M7 18.5A4.5 4.5 0 0 1 6.5 9.6 6 6 0 0 1 18 9a4 4 0 0 1-.5 8"/><path d="M12 20v-8M9 14.5l3-3 3 3"/>',
  tocar: '<path d="M8 5v14l11-7z"/>', parar: '<rect x="7" y="6" width="4" height="12"/><rect x="13" y="6" width="4" height="12"/>',
};
function wzpIco(n, t) { const s = document.createElement('span'); s.className = 'pc-ico'; s.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${WZP_ICO[n] || ''}</svg>`; if (t) s.title = t; return s; }
const wzpHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const wzpRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function wzpHsv2rgb(h, s, v) { const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return [f(5) * 255, f(3) * 255, f(1) * 255]; }
function wzpRgb2hsv(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx]; }
const wzpCopia = (c) => { const n = wzpTela(c.width, c.height); n.getContext('2d').drawImage(c, 0, 0); return n; };
const WZP_PAD = { pb: { pincel: WZP.pincel || 'redondo', borrar: 'redondo', borracha: 'redondo' }, animOn: true, cebolaN: 1, cebolaOp: .3, simetria: false, dedo: true, canhoto: false, contorno: true, selComb: 'novo', trModo: 'uniforme', liq: .6 };
for (const [k, v] of Object.entries(WZP_PAD)) if (WZP[k] === undefined) WZP[k] = JSON.parse(JSON.stringify(v));
if (!['auto', 'livre', 'ret', 'elipse'].includes(WZP.selModo)) WZP.selModo = 'livre';
const WZP_DOCS = new Map(); // quadros abertos (com as camadas), até salvar: chave = folha + região
let WZP_IMPORTOU = false;

// ----- o que está sendo pintado: um quadro (desenho ou visor) de um personagem, ou uma imagem
function wzpFonteDe(o) {
  const R = window.__WZIMG;
  if (o.modo === 'personagem') {
    const S = WZ_SETS.find((s) => s.id === o.set) || WZ_SETS[0], A0 = S.atl(); if (!A0) return null;
    const an = A0.a[o.an] ? o.an : Object.keys(A0.a)[0], A = A0.a[an], k = Math.max(0, Math.min(o.k || 0, A.f.length - 1));
    const meio = !!(o.meio && A.m && A.m[k] && A.msrc), f = meio ? A.m[k] : A.f[k], visor = !!o.visor && !!(meio ? A.mmask : A.mask);
    const src = visor ? (meio ? A.mmask : A.mask) : (meio ? A.msrc : A.src), kk = R ? R.norm(src) : null; if (!kk) return null;
    return { k: kk, x: Math.round(f.x), y: 0, w: Math.ceil(f.w), h: Math.ceil(f.h), ax: f.ax || 0, ay: f.ay || 0, tipo: visor ? 'visor' : 'desenho', ref: visor ? R.norm(meio ? A.msrc : A.src) : null,
      o: { modo: 'personagem', set: S.id, an, k, meio, visor }, nome: `${an} · ${k + 1}${meio ? '½' : ''}${visor ? ' · visor' : ''}`, setNome: S.nome };
  }
  if (!o.img) return null;
  return { k: o.img, x: 0, y: 0, w: 0, h: 0, ax: 0, ay: 0, tipo: 'desenho', o: { modo: 'imagens', img: o.img }, nome: 'Imagem ' + o.img.replace('img/', '') };
}
const wzpAtual = () => ({ modo: WZP.modo, set: WZP.set, an: WZP.an, k: WZP.k, meio: WZP.meio, visor: WZP.visor, img: WZP.img });
const wzpFonte = () => wzpFonteDe(wzpAtual());
const wzpChave = (F) => JSON.stringify([F.k, F.x, F.y, F.w, F.h]);
const wzpDocs = () => WZP_DOCS;
const wzpCamada = (nome, c) => ({ nome, c, vis: true, op: 1, modo: 'source-over', alfa: false, recorte: false });
async function wzpDocDe(o) {
  const F = wzpFonteDe(o); if (!F) return null; const ch = wzpChave(F); let D = WZP_DOCS.get(ch); if (D) return D;
  const R = window.__WZIMG, im = await R.carrega(F.k); if (!F.w) { F.w = im.naturalWidth; F.h = im.naturalHeight; }
  const base = wzpTela(F.w, F.h); base.getContext('2d').drawImage(im, F.x, F.y, F.w, F.h, 0, 0, F.w, F.h);
  let ref = null; if (F.ref) { const ir = await R.carrega(F.ref); ref = wzpTela(F.w, F.h); ref.getContext('2d').drawImage(ir, F.x, F.y, F.w, F.h, 0, 0, F.w, F.h); }
  D = { F, chave: ch, w: F.w, h: F.h, tipo: F.tipo, camadas: [wzpCamada(F.tipo === 'visor' ? 'Visor' : 'Desenho', base)], at: 0, desfaz: [], refaz: [], ref, sel: null, mudou: false };
  WZP_DOCS.set(ch, D); return D;
}
// junta as camadas (modos de mistura e recorte). troca = { i, c }: usa outra tela no lugar da camada i (prévia)
function wzpCompor(D, troca, alvo) {
  const out = alvo || wzpTela(D.w, D.h), g = out.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, D.w, D.h);
  const tela = (i) => (troca && troca.i === i ? troca.c : D.camadas[i].c); let base = -1;
  D.camadas.forEach((L, i) => {
    if (!L.recorte || base < 0) base = i; if (!L.vis) return;
    let src = tela(i); if (L.recorte && base !== i) { const t = wzpCopia(src), q = t.getContext('2d'); q.globalCompositeOperation = 'destination-in'; q.drawImage(tela(base), 0, 0); src = t; }
    g.globalAlpha = L.op; g.globalCompositeOperation = L.modo || 'source-over'; g.drawImage(src, 0, 0);
  });
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; return out;
}
const wzpJunta = (D) => wzpCompor(D);
const wzpMudados = () => [...WZP_DOCS.values()].filter((d) => d.mudou);
// salva todos os quadros mudados: uma imagem nova por folha (vários quadros da mesma folha vão juntos)
async function wzpSalvarTudo(lista = wzpMudados()) {
  if (!lista.length) return { n: 0, fica: true };
  const R = window.__WZIMG, porFolha = new Map(); for (const D of lista) { if (!porFolha.has(D.F.k)) porFolha.set(D.F.k, []); porFolha.get(D.F.k).push(D); }
  const imgs = { ...(WZE.cfg.imgs || {}) }; let fica = true;
  for (const [k, docs] of porFolha) {
    const im = await R.carrega(k), folha = wzpTela(im.naturalWidth, im.naturalHeight), g = folha.getContext('2d'); g.drawImage(im, 0, 0);
    for (const D of docs) { g.clearRect(D.F.x, D.F.y, D.F.w, D.F.h); g.drawImage(wzpJunta(D), D.F.x, D.F.y); }
    const blob = await new Promise((ok) => folha.toBlob(ok, 'image/webp', .95)); if (!blob) throw new Error('não deu para gerar a imagem');
    const r = await wzpEnvia(`verao/${k.replace(/^img\//, '').replace(/\.\w+$/, '')}-${Date.now().toString(36)}.webp`, blob); imgs[k] = r.url; fica = fica && r.fica;
  }
  WZE.cfg.imgs = imgs; WZ.apply(WZE.cfg); wzMudou(); for (const D of lista) D.mudou = false; WZP_QC.clear();
  return { n: lista.length, fica };
}
// efeitos (feitos à mão para funcionar igual em todo navegador, inclusive o do iPad)
function wzpDesfoca(c, r) {
  r = Math.round(r); if (r < 1) return wzpCopia(c); const w = c.width, h = c.height, img = c.getContext('2d').getImageData(0, 0, w, h), a = img.data, b = new Float32Array(a.length), tmp = new Float32Array(a.length);
  for (let i = 0; i < a.length; i += 4) { const al = a[i + 3] / 255; b[i] = a[i] * al; b[i + 1] = a[i + 1] * al; b[i + 2] = a[i + 2] * al; b[i + 3] = a[i + 3]; }
  const passo = (src, dst, hor) => { const n = hor ? w : h, m = hor ? h : w, st = hor ? 4 : w * 4, k = 1 / (2 * r + 1);
    for (let j = 0; j < m; j++) { const o = hor ? j * w * 4 : j * 4; for (let ch = 0; ch < 4; ch++) { let s = 0; for (let i = -r; i <= r; i++) s += src[o + Math.min(n - 1, Math.max(0, i)) * st + ch];
      for (let i = 0; i < n; i++) { dst[o + i * st + ch] = s * k; s += src[o + Math.min(n - 1, i + r + 1) * st + ch] - src[o + Math.max(0, i - r) * st + ch]; } } } };
  for (let it = 0; it < 3; it++) { passo(b, tmp, true); passo(tmp, b, false); }
  for (let i = 0; i < a.length; i += 4) { const al = b[i + 3]; a[i + 3] = al; const k = al > 0 ? 255 / al : 0; a[i] = b[i] * k; a[i + 1] = b[i + 1] * k; a[i + 2] = b[i + 2] * k; }
  const out = wzpTela(w, h); out.getContext('2d').putImageData(img, 0, 0); return out;
}
function wzpAjustaCor(c, dh, ds, dv) {
  const out = wzpCopia(c); if (!dh && !ds && !dv) return out; const g = out.getContext('2d'), img = g.getImageData(0, 0, c.width, c.height), a = img.data;
  for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; let [h, s, v] = wzpRgb2hsv(a[i], a[i + 1], a[i + 2]); h = (h + dh + 360) % 360; s = Math.max(0, Math.min(1, ds >= 0 ? s + (1 - s) * ds : s * (1 + ds))); v = Math.max(0, Math.min(1, dv >= 0 ? v + (1 - v) * dv : v * (1 + dv))); const [r, gg, b] = wzpHsv2rgb(h, s, v); a[i] = r; a[i + 1] = gg; a[i + 2] = b; }
  g.putImageData(img, 0, 0); return out;
}
function wzpMovimento(c, dist, ang) { const out = wzpTela(c.width, c.height), q = out.getContext('2d'), n = Math.max(1, Math.round(dist)), dx = Math.cos(ang * Math.PI / 180), dy = Math.sin(ang * Math.PI / 180);
  for (let i = 0; i <= n; i++) { const t = i / n - .5; q.globalAlpha = 1 / (i + 1); q.drawImage(c, dx * dist * t, dy * dist * t); } return out; }
function wzpRuidoEm(c, quanto) { const out = wzpCopia(c), g = out.getContext('2d'), img = g.getImageData(0, 0, c.width, c.height), a = img.data; for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; const n = (Math.random() - .5) * quanto * 2.55; a[i] += n; a[i + 1] += n; a[i + 2] += n; } g.putImageData(img, 0, 0); return out; }
function wzpNitidez(c, quanto) { const bl = wzpDesfoca(c, 2), out = wzpCopia(c), g = out.getContext('2d'), img = g.getImageData(0, 0, c.width, c.height), a = img.data, b = bl.getContext('2d').getImageData(0, 0, c.width, c.height).data, k = quanto / 50;
  for (let i = 0; i < a.length; i += 4) for (let j = 0; j < 3; j++) a[i + j] = a[i + j] + (a[i + j] - b[i + j]) * k; g.putImageData(img, 0, 0); return out; }
const WZP_AJ = {
  hsb: { nome: 'Matiz, saturação e brilho', v: [['h', 'Matiz', -180, 180, 0, '°'], ['s', 'Saturação', -100, 100, 0, '%'], ['b', 'Brilho', -100, 100, 0, '%']], f: (c, v) => wzpAjustaCor(c, v.h, v.s / 100, v.b / 100) },
  gauss: { nome: 'Desfoque gaussiano', v: [['r', 'Desfoque', 0, 30, 0, ' px']], f: (c, v) => wzpDesfoca(c, v.r) },
  movim: { nome: 'Desfoque de movimento', v: [['d', 'Distância', 0, 60, 0, ' px'], ['a', 'Direção', 0, 180, 0, '°']], f: (c, v) => (v.d ? wzpMovimento(c, v.d, v.a) : wzpCopia(c)) },
  ruido: { nome: 'Ruído', v: [['n', 'Ruído', 0, 100, 0, '%']], f: (c, v) => (v.n ? wzpRuidoEm(c, v.n) : wzpCopia(c)) },
  nitidez: { nome: 'Nitidez', v: [['n', 'Nitidez', 0, 100, 0, '%']], f: (c, v) => (v.n ? wzpNitidez(c, v.n) : wzpCopia(c)) },
  liquefazer: { nome: 'Liquefazer (empurrar)', v: [] },
};
// quadro de um personagem pronto para mostrar (cebola, animação, miniaturas): com a pintura, se estiver aberto
const WZP_QC = new Map();
function wzpQuadro(o, aoChegar) {
  const F = wzpFonteDe({ ...o, visor: false }); if (!F) return null; const D = WZP_DOCS.get(wzpChave(F)); if (D) return { c: wzpJunta(D), F };
  const ch = wzpChave(F); if (WZP_QC.has(ch)) { const c = WZP_QC.get(ch); return c ? { c, F } : null; }
  WZP_QC.set(ch, null); window.__WZIMG.carrega(F.k).then((im) => { const c = wzpTela(F.w, F.h); c.getContext('2d').drawImage(im, F.x, F.y, F.w, F.h, 0, 0, F.w, F.h); WZP_QC.set(ch, c); if (aoChegar) aoChegar(); }).catch(() => {});
  return null;
}
const wzpQuadrosDoMov = () => { const S = WZ_SETS.find((s) => s.id === WZP.set) || WZ_SETS[0], A0 = S.atl(); if (!A0 || !A0.a[WZP.an]) return []; const A = A0.a[WZP.an], L = [];
  A.f.forEach((_, k) => { L.push({ k, meio: false }); if (A.m && A.m[k] && A.msrc) L.push({ k, meio: true }); }); return L; };

// ----- aparência (escura, como o Procreate)
const WZP_CSS = `
#wz .pc{position:fixed;inset:0;z-index:10000;background:#1c1c1e;color:#e9e9ec;font:14px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-user-select:none;user-select:none;overflow:hidden}
#wz .pc button{font:inherit;font-weight:500;font-size:14px;border:0;background:transparent;color:inherit;padding:6px 9px;border-radius:8px;cursor:pointer;min-width:0}
#wz .pc button:disabled{opacity:.4}
#wz .pc .pc-top{position:absolute;top:0;left:0;right:0;height:50px;display:flex;align-items:center;gap:6px;padding:0 8px;background:#121214;z-index:3}
#wz .pc .pc-l,#wz .pc .pc-r{display:flex;align-items:center;gap:0}
#wz .pc .pc-c{flex:1;display:flex;justify-content:center;align-items:center;gap:8px;min-width:0}
#wz .pc .pc-nome{font-size:12px;opacity:.55;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#wz .pc .pc-titulo{font-size:17px;margin-left:8px}
#wz .pc .pc-ico{display:inline-grid;place-items:center}
#wz .pc .pc-b{width:42px;height:42px;display:inline-grid;place-items:center;padding:0;color:#d8d8dc}
#wz .pc .pc-b.on{color:#2f8bff}
#wz .pc .pc-txt{font-weight:600;display:inline-flex;align-items:center;gap:4px}
#wz .pc .pc-txt.quente{color:#ffb340}
#wz .pc .pc-cor{width:30px;height:30px;border-radius:50%;border:2px solid #f2f2f2;margin:0 6px 0 8px;padding:0;touch-action:none}
#wz .pc .pc-cv{position:absolute;top:50px;left:0;width:100%;height:calc(100% - 50px);display:block;touch-action:none;cursor:crosshair}
#wz .pc.com-anim .pc-cv{height:calc(100% - 136px)}
#wz .pc .pc-lat{position:absolute;left:8px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center;gap:12px;padding:12px 6px;background:rgba(44,44,48,.94);border-radius:14px;z-index:2}
#wz .pc.canhoto .pc-lat{left:auto;right:8px}
#wz .pc .pc-fatia{width:24px;height:150px;background:#55555c;border-radius:12px;position:relative;touch-action:none;cursor:ns-resize}
#wz .pc .pc-fatia i{position:absolute;left:-3px;width:30px;height:18px;margin-top:-9px;background:#ececf0;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.5)}
#wz .pc .pc-mod{width:26px;height:26px;border:2px solid #9a9aa2;border-radius:6px;padding:0}
#wz .pc .pc-mod.on{background:#2f8bff;border-color:#2f8bff}
#wz .pc .pc-lat .pc-b{width:34px;height:34px}
#wz .pc .pc-bolha{position:absolute;left:62px;top:50%;transform:translateY(-50%);background:rgba(20,20,22,.92);padding:6px 12px;border-radius:10px;font-weight:600;opacity:0;pointer-events:none;z-index:3}
#wz .pc.canhoto .pc-bolha{left:auto;right:62px}
#wz .pc .pc-bolha.on{opacity:1}
#wz .pc .pc-pop{position:absolute;top:56px;right:10px;width:min(370px,calc(100vw - 20px));max-height:calc(100% - 150px);overflow:auto;background:#2a2a2e;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.6);padding:12px;z-index:5}
#wz .pc .pc-pop.acoes,#wz .pc .pc-pop.ajustes{right:auto;left:10px}
#wz .pc .pc-pop.pinceis,#wz .pc .pc-pop.estudio{width:min(480px,calc(100vw - 20px))}
#wz .pc .pc-pop-cab{display:flex;align-items:center;gap:8px;justify-content:space-between;margin-bottom:8px}
#wz .pc .pc-pop-cab b{font-size:16px;margin-right:auto}
#wz .pc .pc-mais{font-size:24px;line-height:1;width:38px;height:34px;padding:0}
#wz .pc .pc-bib{display:grid;grid-template-columns:130px 1fr;gap:8px;min-height:260px}
#wz .pc .pc-cols{display:flex;flex-direction:column;gap:2px;border-right:1px solid #3c3c42;padding-right:6px}
#wz .pc .pc-cols button{text-align:left;font-size:13px;overflow:hidden;text-overflow:ellipsis}
#wz .pc .pc-cols button.on{background:#2f8bff;color:#fff}
#wz .pc .pc-lista{display:flex;flex-direction:column;gap:4px}
#wz .pc .pc-pin{position:relative;padding:6px 8px;border-radius:8px;cursor:pointer;background:#333338}
#wz .pc .pc-pin.on{background:#2f8bff;color:#fff}
#wz .pc .pc-pin span{font-size:13px;display:block}
#wz .pc .pc-pin canvas{width:100%;height:40px;display:block}
#wz .pc .pc-pin i{position:absolute;right:8px;top:4px;font-style:normal;font-size:18px}
#wz .pc .pc-dica{font-size:12px;opacity:.6;margin:8px 0 0}
#wz .pc .pc-camadas{display:flex;flex-direction:column;gap:4px}
#wz .pc .pc-cam{display:grid;grid-template-columns:56px 1fr auto auto;gap:8px;align-items:center;padding:6px;border-radius:8px;background:#333338;cursor:pointer}
#wz .pc .pc-cam.on{background:#2f8bff;color:#fff}
#wz .pc .pc-cam.rec{margin-left:18px}
#wz .pc .pc-cam canvas{width:56px;height:42px;background:#e9e9ec;border-radius:3px}
#wz .pc .pc-cam-nome{display:flex;flex-direction:column;font-size:13px;min-width:0}
#wz .pc .pc-cam-nome small{font-size:10px;opacity:.75}
#wz .pc .pc-n{font-weight:700;width:34px}
#wz .pc .pc-cam input{width:18px;height:18px;accent-color:#fff}
#wz .pc .pc-ops{display:flex;flex-direction:column;gap:2px}
#wz .pc .pc-op{display:flex;justify-content:space-between;text-align:left;padding:10px;border-radius:8px}
#wz .pc .pc-op:hover{background:#38383e}
#wz .pc .pc-op i{font-style:normal;color:#2f8bff}
#wz .pc .pc-modos{display:grid;grid-template-columns:1fr 1fr;gap:2px;margin-top:8px}
#wz .pc .pc-modos button{text-align:left}
#wz .pc .pc-modos button.on{background:#2f8bff;color:#fff}
#wz .pc .pc-faixa{display:grid;grid-template-columns:110px 1fr 56px;gap:8px;align-items:center;font-size:13px;margin:4px 0}
#wz .pc .pc-baixo .pc-faixa{display:inline-grid;grid-template-columns:auto 140px 50px;margin:0 4px}
#wz .pc .pc-marca{display:flex;gap:8px;align-items:center;font-size:13px;margin:6px 0}
#wz .pc .pc-chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0}
#wz .pc .pc-chips button{background:#333338;border-radius:16px;padding:6px 12px}
#wz .pc .pc-chips button.on{background:#2f8bff;color:#fff}
#wz .pc select,#wz .pc input[type=text]{background:#333338;color:#eee;border:1px solid #4a4a50;border-radius:6px;padding:5px 7px;width:auto;font:inherit}
#wz .pc input[type=range]{accent-color:#2f8bff;width:100%}
#wz .pc .pc-sw{display:inline-block;width:36px;height:26px;border-radius:6px;border:1px solid #777;padding:0}
#wz .pc .pc-disco{width:260px;height:260px;display:block;margin:6px auto;touch-action:none}
#wz .pc .pc-paleta{display:grid;grid-template-columns:repeat(10,1fr);gap:4px}
#wz .pc .pc-paleta button{aspect-ratio:1;border-radius:4px;padding:0}
#wz .pc .pc-hist{display:flex;flex-wrap:wrap;gap:5px;align-items:center;font-size:12px;margin-top:8px;opacity:.95}
#wz .pc .pc-hist button{width:24px;height:24px;border-radius:50%;padding:0;border:1px solid #555}
#wz .pc .pc-hex{width:90px}
#wz .pc .pc-baixo{position:absolute;left:50%;transform:translateX(-50%);bottom:14px;display:flex;flex-wrap:wrap;justify-content:center;gap:2px;align-items:center;background:rgba(44,44,48,.96);border-radius:12px;padding:6px 10px;width:max-content;max-width:calc(100% - 20px);z-index:2}
#wz .pc.com-anim .pc-baixo{bottom:98px}
#wz .pc .pc-baixo[hidden]{display:none}
#wz .pc .pc-baixo button.on{background:#2f8bff;color:#fff}
#wz .pc .pc-baixo .sep{width:1px;align-self:stretch;background:#4a4a50;margin:0 4px}
#wz .pc .pc-baixo .dica{font-size:12px;opacity:.6}
#wz .pc .pc-anim{position:absolute;left:0;right:0;bottom:0;height:86px;background:#121214;display:flex;align-items:center;gap:8px;padding:0 10px;z-index:2}
#wz .pc .pc-anim[hidden]{display:none}
#wz .pc .pc-anim input[type=range]{width:80px}
#wz .pc .pc-tira{display:flex;gap:6px;overflow-x:auto;flex:1;height:100%;align-items:center}
#wz .pc .pc-q{display:flex;flex-direction:column;align-items:center;padding:3px;border:2px solid transparent;border-radius:7px;background:#2a2a2e;flex:none}
#wz .pc .pc-q canvas{width:54px;height:54px;background:#e9e9ec;border-radius:3px}
#wz .pc .pc-q span{font-size:10px}
#wz .pc .pc-q.on{border-color:#2f8bff}
#wz .pc .pc-q.mud span::after{content:' •';color:#ffb340}
#wz .pc .pc-aviso{position:absolute;bottom:76px;left:50%;transform:translateX(-50%);background:rgba(18,18,20,.94);color:#fff;padding:8px 14px;border-radius:10px;font-size:13px;opacity:0;transition:opacity .2s;pointer-events:none;z-index:6;max-width:90%;text-align:center}
#wz .pc .pc-aviso.on{opacity:1}
#wz .pc.com-anim .pc-aviso{bottom:156px}
#wz .pc:not(.est) .pc-aviso{bottom:24px}
#wz .pc .pc-gota{position:fixed;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:translate(-50%,-120%) rotate(-45deg);border:2px solid #fff;pointer-events:none;z-index:7}
#wz .pc.limpa .pc-top,#wz .pc.limpa .pc-lat,#wz .pc.limpa .pc-anim,#wz .pc.limpa .pc-baixo{display:none}
#wz .pc.limpa .pc-cv{top:0;height:100%}
#wz .pc .pc-gal{position:absolute;top:50px;left:0;right:0;bottom:0;overflow:auto;padding:12px 16px 30px}
#wz .pc .pc-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px}
#wz .pc .pc-grade.larga{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}
#wz .pc .pc-grade.mini{grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:6px;max-height:300px;overflow:auto;margin:8px 0}
#wz .pc .pc-card{display:flex;flex-direction:column;align-items:center;gap:6px;background:#2a2a2e;border-radius:10px;padding:8px;font-size:13px;cursor:pointer}
#wz .pc .pc-card canvas,#wz .pc .pc-card img{width:100%;aspect-ratio:1;object-fit:contain;background:#e9e9ec;border-radius:6px}
#wz .pc .pc-ajuda{margin:0;padding-left:18px}
#wz .pc .pc-ajuda li{margin:7px 0;font-size:13px}
#wz .pc h4{margin:12px 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;opacity:.6}
#wz .pc .pc-pop.estudio>canvas{width:100%;height:46px;background:#1c1c1e;border-radius:6px;display:block}
@media (max-width:760px){#wz .pc .pc-nome{display:none}#wz .pc .pc-b{width:36px}#wz .pc .pc-top{gap:2px;padding:0 4px}#wz .pc .pc-c{flex:0 1 auto}#wz .pc .pc-fatia{height:110px}#wz .pc .pc-bib{grid-template-columns:100px 1fr}#wz .pc .pc-c .pc-txt>span:last-child{display:none}#wz .pc .pc-anim input[type=range],#wz .pc .pc-anim>.pc-txt{display:none}#wz .pc .pc-cor{margin:0 2px}}
@media (max-width:460px){#wz .pc .pc-c{display:none}#wz .pc .pc-b{width:33px}}
`;
function wzpEstilo() { if (document.getElementById('pc-css')) return; const s = document.createElement('style'); s.id = 'pc-css'; s.textContent = WZP_CSS; document.head.append(s); }

// ----- a aba: abre por cima do editor, em tela cheia
function wzPintura(m) {
  m.append(el('p', { class: 'ajuda' }, 'A pintura abre em tela cheia. Para voltar, use "Editor" no canto de cima da Galeria.'));
  if (!window.__WZIMG) { m.append(el('p', { class: 'aviso' }, 'Esta página do jogo é antiga. Recarregue a página.')); return; }
  wzpEstilo(); const velho = document.getElementById('pc'); if (velho) velho.remove();
  const ov = el('div', { id: 'pc', class: 'pc' + (WZP.canhoto ? ' canhoto' : '') }); (document.getElementById('wz') || document.body).append(ov);
  ov.addEventListener('gesturestart', (e) => e.preventDefault()); // o Safari do iPad não aproxima a página inteira
  if (WZP.estudio && wzpFonte()) wzpEstudio(ov); else wzpGaleria(ov);
}
function wzpAviso(ov, t, ms = 2200) { let a = ov.querySelector('.pc-aviso'); if (!a) { a = el('div', { class: 'pc-aviso', role: 'status' }); ov.append(a); } a.textContent = t; a.classList.add('on'); clearTimeout(a._t); a._t = setTimeout(() => a.classList.remove('on'), ms); }
async function wzpSalvaComAviso(ov) {
  const n = wzpMudados().length; if (!n) { wzpAviso(ov, 'Nada novo para salvar.'); return; }
  wzpAviso(ov, 'Salvando…', 20000);
  try { const r = await wzpSalvarTudo(); wzpAviso(ov, r.fica ? `${r.n} ${r.n === 1 ? 'quadro salvo' : 'quadros salvos'} no rascunho. "Aplicar no jogo" (na Galeria) vale para todo mundo.` : 'Salvo só nesta página até recarregar: para guardar de vez, use o editor no site do WinnerZ.', 4500); }
  catch (e) { wzpAviso(ov, 'Não deu para salvar: ' + (e && e.message), 5000); }
  ov.dispatchEvent(new Event('wzp-salvou'));
}

// ----- GALERIA: escolher o quadro ou a imagem
function wzpGaleria(ov) {
  ov.replaceChildren(); ov.className = 'pc' + (WZP.canhoto ? ' canhoto' : '');
  const n = wzpMudados().length;
  const sair = () => { if (wzpMudados().length) wzpAviso(ov, 'Há pinturas não salvas (elas continuam abertas).'); ov.remove(); WZE.aba = WZE.abaAntes && WZE.abaAntes !== 'pintura' ? WZE.abaAntes : 'rostos'; wzRender(); };
  const topo = el('div', { class: 'pc-top' }, el('div', { class: 'pc-l' }, el('button', { type: 'button', class: 'pc-txt', on: { click: sair } }, '‹ Editor'), el('b', { class: 'pc-titulo' }, 'Galeria')), el('div', { class: 'pc-c' }),
    el('div', { class: 'pc-r' }, el('button', { type: 'button', class: 'pc-txt' + (n ? ' quente' : ''), title: 'Salvar no jogo todos os quadros pintados', on: { click: async () => { await wzpSalvaComAviso(ov); wzpGaleria(ov); } } }, wzpIco('salvar'), n ? ` Salvar (${n})` : ' Salvar'),
      el('button', { type: 'button', class: 'pc-txt', title: 'Vale para todo mundo', on: { click: async () => { const st = () => (document.getElementById('wz-st') || {}).textContent || '', antes = st(); await wzAplicar(); if (st() !== antes) wzpAviso(ov, st(), 5000); } } }, 'Aplicar no jogo')));
  const corpo = el('div', { class: 'pc-gal' });
  ov.append(topo, corpo);
  corpo.append(el('div', { class: 'pc-chips' }, ...[['personagem', 'Personagens'], ['imagens', 'Cenários e outras imagens']].map(([k, t]) => el('button', { type: 'button', class: WZP.modo === k ? 'on' : '', on: { click: () => { WZP.modo = k; wzpGuarda(); wzpGaleria(ov); } } }, t))));
  const abre = (o) => { Object.assign(WZP, o); WZP.estudio = true; wzpGuarda(); wzpEstudio(ov); };
  if (WZP.modo === 'personagem') {
    const S = WZ_SETS.find((s) => s.id === WZP.set) || WZ_SETS[0], A0 = S.atl();
    corpo.append(el('div', { class: 'pc-chips' }, ...WZ_SETS.map((s) => el('button', { type: 'button', class: s.id === S.id ? 'on' : '', on: { click: () => { WZP.set = s.id; WZP.an = null; WZP.k = 0; wzpGuarda(); wzpGaleria(ov); } } }, s.nome))));
    if (!A0) { corpo.append(el('p', {}, 'Os desenhos deste personagem ainda estão carregando.')); setTimeout(() => { if (ov.isConnected && !ov.classList.contains('est')) wzpGaleria(ov); }, 800); return; }
    const anims = Object.keys(A0.a).filter((a) => !/_\d$/.test(a)); if (!A0.a[WZP.an]) WZP.an = anims[0];
    const sel = el('select', {}, ...anims.map((a) => el('option', { value: a, selected: a === WZP.an }, a))); sel.addEventListener('change', () => { WZP.an = sel.value; WZP.k = 0; wzpGuarda(); wzpGaleria(ov); });
    corpo.append(el('div', { class: 'pc-chips' }, 'Movimento ', sel, ' Pintar ', ...[[false, 'o desenho'], [true, 'o visor (onde o rosto aparece)']].map(([v, t]) => el('button', { type: 'button', class: !!WZP.visor === v ? 'on' : '', on: { click: () => { WZP.visor = v; wzpGuarda(); wzpGaleria(ov); } } }, t))));
    const grade = el('div', { class: 'pc-grade' }); corpo.append(grade);
    for (const q of wzpQuadrosDoMov()) {
      const o = { modo: 'personagem', set: S.id, an: WZP.an, k: q.k, meio: q.meio, visor: !!WZP.visor }, F = wzpFonteDe(o); if (!F) continue;
      const D = WZP_DOCS.get(wzpChave(F)), mini = wzpTela(120, 120), card = el('button', { type: 'button', class: 'pc-card', on: { click: () => abre(o) } }, mini, el('span', {}, `Quadro ${q.k + 1}${q.meio ? '½' : ''}${D && D.mudou ? ' •' : ''}`));
      const desenha = () => { const r = wzpQuadro(o, desenha); if (!r) return; const g = mini.getContext('2d'), k = Math.min(110 / r.c.width, 110 / r.c.height); g.clearRect(0, 0, 120, 120); g.drawImage(r.c, (120 - r.c.width * k) / 2, (120 - r.c.height * k) / 2, r.c.width * k, r.c.height * k); };
      desenha(); grade.append(card);
    }
  } else {
    const R = window.__WZIMG, sets = new Set(); for (const S of WZ_SETS) { const A0 = S.atl(); if (A0) for (const a of Object.values(A0.a)) for (const s of [a.src, a.mask, a.msrc, a.mmask]) { const k = s && R.norm(s); if (k) sets.add(k); } }
    corpo.append(el('div', { class: 'pc-chips' }, 'Mostrar ', ...[['grandes', 'só as grandes (cenários)'], ['todas', 'todas']].map(([k, t]) => el('button', { type: 'button', class: WZP.so === k ? 'on' : '', on: { click: () => { WZP.so = k; wzpGuarda(); wzpGaleria(ov); } } }, t))));
    const grade = el('div', { class: 'pc-grade larga' }); corpo.append(grade);
    for (const k of R.lista().filter((x) => !sets.has(x))) {
      const im = el('img', { loading: 'lazy', alt: '' }); im.src = k; const D = [...WZP_DOCS.values()].find((d) => d.F.k === k);
      const b = el('button', { type: 'button', class: 'pc-card', title: k, on: { click: () => abre({ modo: 'imagens', img: k }) } }, im, el('span', {}, ((WZE.cfg.imgs || {})[k] ? 'pintada' : '') + (D && D.mudou ? ' •' : '')));
      im.addEventListener('load', () => { if (WZP.so === 'grandes' && im.naturalWidth * im.naturalHeight < 500 * 300) b.remove(); });
      grade.append(b);
    }
  }
}

// ----- ESTÚDIO
function wzpEstudio(ov) {
  ov.replaceChildren(); ov.className = 'pc est' + (WZP.canhoto ? ' canhoto' : '');
  const ferBtn = (k, ico, t) => el('button', { type: 'button', class: 'pc-b', 'data-f': k, title: t, on: { click: () => tocaFerr(k) } }, wzpIco(ico));
  const corBtn = el('button', { type: 'button', class: 'pc-cor', title: 'Cor (arraste até a imagem para encher uma área)' });
  const salvarBtn = el('button', { type: 'button', class: 'pc-txt', title: 'Salvar no jogo todos os quadros pintados', on: { click: () => wzpSalvaComAviso(ov) } }, wzpIco('salvar'), el('span', {}));
  const nomeEl = el('span', { class: 'pc-nome' });
  const topo = el('div', { class: 'pc-top' },
    el('div', { class: 'pc-l' }, el('button', { type: 'button', class: 'pc-txt', on: { click: () => { aplicaPendente(); if (ajuste) ajuste.cancela(); WZP.estudio = false; wzpGuarda(); fim(); wzpGaleria(ov); } } }, 'Galeria'),
      el('button', { type: 'button', class: 'pc-b', 'data-p': 'acoes', title: 'Ações', on: { click: () => pop('acoes') } }, wzpIco('chave')),
      el('button', { type: 'button', class: 'pc-b', 'data-p': 'ajustes', title: 'Ajustes', on: { click: () => pop('ajustes') } }, wzpIco('varinha')),
      ferBtn('selecao', 'selecao', 'Seleção (L)'), ferBtn('transformar', 'seta', 'Transformar (V)')),
    el('div', { class: 'pc-c' }, nomeEl, salvarBtn),
    el('div', { class: 'pc-r' }, ferBtn('pincel', 'pincel', 'Pincel (B): toque de novo para a biblioteca'), ferBtn('borrar', 'dedo', 'Borrar (S)'), ferBtn('borracha', 'borracha', 'Borracha (E)'),
      el('button', { type: 'button', class: 'pc-b', 'data-p': 'camadas', title: 'Camadas', on: { click: () => pop('camadas') } }, wzpIco('camadas')), corBtn));
  // barra do lado: tamanho, conta-gotas, opacidade, desfazer, refazer
  const fatia = (val, set, rot) => { const t = el('div', { class: 'pc-fatia', title: rot }), k = el('i', {}); t.append(k); const pos = () => { k.style.top = `calc(9px + ${1 - val()} * (100% - 18px))`; };
    let on = false; const go = (e) => { const r = t.getBoundingClientRect(); set(Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height))); pos(); bolha(rot); };
    t.addEventListener('pointerdown', (e) => { on = true; try { t.setPointerCapture(e.pointerId); } catch { /* */ } go(e); }); t.addEventListener('pointermove', (e) => on && go(e));
    const larga = () => { if (!on) return; on = false; wzpGuarda(); bolha(null); }; t.addEventListener('pointerup', larga); t.addEventListener('pointercancel', larga);
    t.pos = pos; pos(); return t; };
  const fTam = fatia(() => Math.sqrt((WZP.tam - 1) / 299), (v) => { WZP.tam = Math.round(1 + 299 * v * v); }, 'Tamanho'), fOp = fatia(() => WZP.opac, (v) => { WZP.opac = Math.max(.02, Math.round(v * 100) / 100); }, 'Opacidade');
  const modBtn = el('button', { type: 'button', class: 'pc-mod', title: 'Conta-gotas: toque aqui e depois na cor (ou segure o dedo na imagem)', on: { click: () => { contaUma = !contaUma; modBtn.classList.toggle('on', contaUma); } } });
  const lateral = el('div', { class: 'pc-lat' }, fTam, modBtn, fOp, el('button', { type: 'button', class: 'pc-b', title: 'Desfazer (toque com dois dedos)', on: { click: () => desfaz() } }, wzpIco('desfazer')), el('button', { type: 'button', class: 'pc-b', title: 'Refazer (toque com três dedos)', on: { click: () => refaz() } }, wzpIco('refazer')));
  const bolhaEl = el('div', { class: 'pc-bolha' });
  const bolha = (rot) => { if (!rot) { bolhaEl.classList.remove('on'); pinta(); return; } bolhaEl.textContent = rot === 'Tamanho' ? `${WZP.tam} px` : `${Math.round(WZP.opac * 100)}%`; bolhaEl.classList.add('on'); pinta(); };
  const cv = el('canvas', { class: 'pc-cv' }), popEl = el('div', { class: 'pc-pop', hidden: true }), baixo = el('div', { class: 'pc-baixo' }), anim = el('div', { class: 'pc-anim' });
  ov.append(topo, cv, lateral, bolhaEl, popEl, baixo, anim);
  const g = cv.getContext('2d');
  let D = null, V = new DOMMatrix(), traco = null, acao = null, acaoTipo = '', flut = null, ajuste = null, laco = null, comp = null, cursor = null, temCaneta = false, espaco = false, contaUma = false, tocando = 0, tocaFr = null, popAberto = null, fundo = null, listras = null;
  const vivo = () => cv.isConnected;
  const tela = () => cv.getBoundingClientRect(), escala = () => Math.hypot(V.a, V.b);
  let enq = false; const enquadra = () => { const r = tela(); if (!D || !r.width) return; enq = true; const z = Math.min((r.width - 40) / D.w, (r.height - 40) / D.h); V = new DOMMatrix().translate((r.width - D.w * z) / 2, (r.height - D.h * z) / 2).scale(z); };
  const doc = (e) => { const r = tela(), p = V.inverse().transformPoint(new DOMPoint(e.clientX - r.left, e.clientY - r.top)); return [p.x, p.y]; };
  const naTela = (x, y) => { const p = V.transformPoint(new DOMPoint(x, y)); return [p.x, p.y]; };
  const emVolta = (M, px, py) => new DOMMatrix().translate(px, py).multiply(M).multiply(new DOMMatrix().translate(-px, -py));
  const aviso = (t, ms) => wzpAviso(ov, t, ms);
  function fim() { clearInterval(iv); if (tocando) { clearInterval(tocando); tocando = 0; } }
  // ----- seleção: máscara (branco = selecionado)
  const selM = () => (D && D.sel ? D.sel : null);
  const limita = (c) => { const m = selM(); if (!m) return c; const q = c.getContext('2d'); q.save(); q.globalCompositeOperation = 'destination-in'; q.drawImage(m, 0, 0); q.restore(); return c; };
  const mistura = (velho, novo) => { const m = selM(); if (!m) return novo; const fora = wzpCopia(velho), q = fora.getContext('2d'); q.globalCompositeOperation = 'destination-out'; q.drawImage(m, 0, 0); q.globalCompositeOperation = 'source-over'; q.drawImage(limita(wzpCopia(novo)), 0, 0); return fora; };
  const novaSel = (m) => { const C = WZP.selComb;
    if (!D.sel) { if (C !== 'tirar') D.sel = m; } else if (C === 'novo') D.sel = m; else { const q = D.sel.getContext('2d'); q.save(); q.globalCompositeOperation = C === 'somar' ? 'source-over' : 'destination-out'; q.drawImage(m, 0, 0); q.restore(); }
    if (D.sel) { const d = D.sel.getContext('2d').getImageData(0, 0, D.w, D.h).data; let tem = false; for (let i = 3; i < d.length; i += 64) if (d[i] > 10) { tem = true; break; } if (!tem) D.sel = null; } listras = null; pinta(); };
  const selDePath = (path) => { const m = wzpTela(D.w, D.h), q = m.getContext('2d'); q.fillStyle = '#fff'; q.fill(path, 'evenodd'); return m; };
  const guardaDesfazer = (i = D.at) => { D.desfaz.push({ at: i, img: D.camadas[i].c.getContext('2d').getImageData(0, 0, D.w, D.h) }); if (D.desfaz.length > 40) D.desfaz.shift(); D.refaz = []; D.mudou = true; atualizaSalvar(); };
  const poeNaCamada = (c, i = D.at) => { const q = D.camadas[i].c.getContext('2d'); q.clearRect(0, 0, D.w, D.h); q.drawImage(c, 0, 0); };
  function atualizaSalvar() { const n = wzpMudados().length; salvarBtn.lastChild.textContent = n ? ` Salvar (${n})` : ' Salvar'; salvarBtn.classList.toggle('quente', !!n); }
  // ----- desenho da tela
  let pedido = 0, faixa = 0;
  const xadrez = () => { if (fundo) return fundo; const c = wzpTela(16, 16), q = c.getContext('2d'); q.fillStyle = '#f4f4f4'; q.fillRect(0, 0, 16, 16); q.fillStyle = '#dcdcdc'; q.fillRect(0, 0, 8, 8); q.fillRect(8, 8, 8, 8); fundo = g.createPattern(c, 'repeat'); return fundo; };
  const listraPat = () => { const c = wzpTela(12, 12), q = c.getContext('2d'); q.strokeStyle = 'rgba(47,139,255,.6)'; q.lineWidth = 3; q.beginPath(); q.moveTo(-3, 15); q.lineTo(15, -3); q.moveTo(-3, 3); q.lineTo(3, -3); q.moveTo(9, 15); q.lineTo(15, 9); q.stroke(); return g.createPattern(c, 'repeat'); };
  function cebolas() {
    if (!D || D.tipo !== 'desenho' || WZP.modo !== 'personagem' || !WZP.animOn || !WZP.cebolaN) return [];
    const L = wzpQuadrosDoMov().filter((q) => !q.meio), i = L.findIndex((q) => q.k === WZP.k), out = []; if (L.length < 2) return out;
    for (let d = 1; d <= WZP.cebolaN; d++) for (const s of [-1, 1]) { const q = L[(i + s * d + L.length * 4) % L.length]; if (!q || q.k === WZP.k) continue; const r = wzpQuadro({ ...wzpAtual(), k: q.k, meio: false, visor: false }, pinta); if (r) out.push({ c: r.c, x: D.F.ax - r.F.ax, y: D.F.ay - r.F.ay, cor: s < 0 ? 'rgb(230,60,60)' : 'rgb(40,190,90)', op: WZP.cebolaOp / d }); }
    return out;
  }
  function pinta() {
    if (pedido || !vivo()) return; pedido = requestAnimationFrame(() => {
      pedido = 0; const r = tela(), dpr = window.devicePixelRatio || 1; if (!r.width) return;
      if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); fundo = null; }
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = '#2b2b2f'; g.fillRect(0, 0, r.width, r.height); if (!D) return;
      const z = escala(); g.setTransform(new DOMMatrix().scale(dpr).multiply(V));
      const pat = xadrez(); if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(1 / z)); g.fillStyle = pat; g.fillRect(0, 0, D.w, D.h); g.imageSmoothingEnabled = z < 3;
      if (tocando) { if (tocaFr) g.drawImage(tocaFr.c, D.F.ax - tocaFr.F.ax, D.F.ay - tocaFr.F.ay); return; }
      if (D.tipo === 'visor' && D.ref) g.drawImage(D.ref, 0, 0);
      for (const o of cebolas()) { const t = wzpCopia(o.c), q = t.getContext('2d'); q.globalCompositeOperation = 'source-atop'; q.globalAlpha = .45; q.fillStyle = o.cor; q.fillRect(0, 0, t.width, t.height); g.globalAlpha = o.op; g.drawImage(t, o.x, o.y); g.globalAlpha = 1; }
      const prev = traco ? traco.previa() : flut ? flut.previa() : ajuste ? ajuste.previa() : null;
      comp = wzpCompor(D, prev ? { i: D.at, c: prev } : null, comp && comp.width === D.w && comp.height === D.h ? comp : null);
      if (D.tipo === 'visor') { const t = wzpCopia(comp), q = t.getContext('2d'); q.globalCompositeOperation = 'source-in'; q.fillStyle = 'rgba(0,190,255,.6)'; q.fillRect(0, 0, D.w, D.h); g.drawImage(t, 0, 0); } else g.drawImage(comp, 0, 0);
      // seleção: listras azuis andando por fora do que está selecionado (como no Procreate)
      if (D.sel && !flut) { if (!listras) { listras = wzpTela(D.w, D.h); const q = listras.getContext('2d'); q.fillStyle = '#fff'; q.fillRect(0, 0, D.w, D.h); q.globalCompositeOperation = 'destination-out'; q.drawImage(D.sel, 0, 0); }
        const t = wzpCopia(listras), q = t.getContext('2d'), lp = listraPat(); if (lp.setTransform) lp.setTransform(new DOMMatrix().scale(1 / z).translate(faixa, 0)); q.globalCompositeOperation = 'source-in'; q.fillStyle = lp; q.fillRect(0, 0, D.w, D.h); g.drawImage(t, 0, 0); }
      if (laco) { g.save(); g.lineWidth = 1.5 / z; g.setLineDash([5 / z, 4 / z]); g.strokeStyle = '#fff'; g.stroke(laco.path()); g.strokeStyle = '#2f8bff'; g.lineDashOffset = 4.5 / z; g.stroke(laco.path()); g.restore(); }
      if (WZP.simetria) { g.save(); g.strokeStyle = 'rgba(47,139,255,.85)'; g.lineWidth = 1.5 / z; g.setLineDash([6 / z, 4 / z]); g.beginPath(); g.moveTo(D.w / 2, 0); g.lineTo(D.w / 2, D.h); g.stroke(); g.restore(); }
      if (WZP.contorno && cursor && ['pincel', 'borracha', 'borrar'].includes(WZP.ferr) && !traco) { g.beginPath(); g.arc(cursor[0], cursor[1], WZP.tam / 2, 0, Math.PI * 2); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2 / z; g.stroke(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1 / z; g.stroke(); }
      if (flut) { g.setTransform(dpr, 0, 0, dpr, 0, 0); const P = flut.cantos().map(([x, y]) => naTela(x, y)); g.strokeStyle = '#2f8bff'; g.lineWidth = 1.5; g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
        const alcas = WZP.trModo === 'livre' ? [...P, ...P.map((p, i) => { const q = P[(i + 1) % 4]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; })] : P;
        for (const [x, y] of alcas) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill(); g.stroke(); }
        const [gx, gy] = flut.alcaGiro(); g.fillStyle = '#3fd27a'; g.beginPath(); g.arc(gx, gy, 8, 0, Math.PI * 2); g.fill(); g.stroke(); }
      if (bolhaEl.classList.contains('on')) { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.beginPath(); g.arc(r.width / 2, r.height / 2, Math.max(1, WZP.tam / 2 * z), 0, Math.PI * 2); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.globalAlpha = Math.max(.25, WZP.opac); g.stroke(); g.globalAlpha = 1; }
    });
  }
  const iv = setInterval(() => { if (!vivo()) { fim(); return; } if (D && D.sel && !flut) { faixa = (faixa + 1) % 12; pinta(); } }, 90);

  // ----- pincel e borracha: carimbos da ponta; segurar parado no fim vira linha reta (ou elipse, se o traço fechar)
  function novoTraco(e, borracha) {
    const L = D.camadas[D.at], B = wzpPincel(WZP.pb[borracha ? 'borracha' : 'pincel']), buf = wzpTela(D.w, D.h), bg = buf.getContext('2d'), cor = D.tipo === 'visor' ? '#ffffff' : WZP.cor, ponta = wzpTinta(B, borracha ? '#000000' : cor);
    let ult = null, sobra = 0, suave = null, ini = null, forma = null, espera = 0, ultMov = null; const pts = [];
    const pr = (ev) => (ev.pointerType === 'mouse' || !ev.pressure ? 1 : ev.pressure), suavizacao = Math.max(WZP.suav, B.suav ?? 0);
    const um = (x, y, p, ang) => {
      const t = Math.max(.5, WZP.tam * (WZP.pTam ? (B.pMin ?? .15) + (1 - (B.pMin ?? .15)) * p : 1)), a = Math.min(1, WZP.fluxo * (B.fluxo ?? 1) * (WZP.pTop ? p : 1));
      if (B.jitter) { const r = B.jitter * t * Math.random(), q = Math.random() * 6.283; x += Math.cos(q) * r; y += Math.sin(q) * r; }
      bg.globalAlpha = a; const asp = ponta.height / ponta.width, w = t, h = t * asp;
      if (B.girar) { bg.save(); bg.translate(x, y); bg.rotate(B.girar === 'aleatorio' ? Math.random() * 6.283 : ang); bg.drawImage(ponta, -w / 2, -h / 2, w, h); bg.restore(); } else bg.drawImage(ponta, x - w / 2, y - h / 2, w, h);
    };
    const carimbo = (x, y, p, ang) => { um(x, y, p, ang); if (WZP.simetria) um(D.w - x, y, p, Math.PI - ang); };
    const segmento = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy), passo = Math.max(.4, WZP.tam * (B.espaco ?? .1) * Math.max(.2, b[2])), ang = Math.atan2(dy, dx);
      let t = passo - sobra; while (t <= d) { const f = t / d; carimbo(a[0] + dx * f, a[1] + dy * f, a[2] + (b[2] - a[2]) * f, ang); t += passo; } sobra = d - (t - passo); };
    const desenhaForma = (fimP) => { bg.clearRect(0, 0, D.w, D.h); sobra = 0; const p = Math.max(.5, ini[2]);
      if (forma.tipo === 'reta') { carimbo(ini[0], ini[1], p, 0); segmento([ini[0], ini[1], p], [fimP[0], fimP[1], p]); return; }
      const { cx, cy, rx, ry } = forma, n = Math.max(24, Math.round((rx + ry) * 1.2)); let a = [cx + rx, cy, p]; carimbo(a[0], a[1], p, 0); for (let i = 1; i <= n; i++) { const t = i / n * Math.PI * 2, b = [cx + rx * Math.cos(t), cy + ry * Math.sin(t), p]; segmento(a, b); a = b; } };
    const ponto = (ev) => { const [x, y] = doc(ev), p = pr(ev); pts.push([x, y]);
      if (forma) { if (forma.tipo === 'reta') desenhaForma([x, y]); return; }
      const k = 1 - Math.min(.92, suavizacao * .95); suave = suave ? [suave[0] + (x - suave[0]) * k, suave[1] + (y - suave[1]) * k, suave[2] + (p - suave[2]) * k] : [x, y, p];
      if (!ult) { ini = suave.slice(); carimbo(suave[0], suave[1], suave[2], 0); ult = suave.slice(); return; } segmento(ult, suave); ult = suave.slice(); };
    const vigia = (ev) => { const [x, y] = doc(ev); if (ultMov && Math.hypot(x - ultMov[0], y - ultMov[1]) < 2 / escala()) return; ultMov = [x, y]; clearTimeout(espera);
      espera = setTimeout(() => { if (!traco || forma || !ini || Math.hypot(x - ini[0], y - ini[1]) < 6 && pts.length < 12) return;
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [a, b] of pts) { x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, a); y1 = Math.max(y1, b); }
        const diag = Math.hypot(x1 - x0, y1 - y0), fechou = pts.length > 12 && Math.hypot(x - ini[0], y - ini[1]) < diag * .2 && diag > 12;
        forma = fechou ? { tipo: 'elipse', cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2 } : { tipo: 'reta' };
        desenhaForma([x, y]); aviso(fechou ? 'Elipse' : 'Linha reta: arraste para ajustar e solte.'); pinta(); }, 600); };
    const comGrao = () => { const c = wzpCopia(buf); if (B.grao) { const q = c.getContext('2d'), pat = q.createPattern(B.grao, 'repeat'); if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(B.gEsc || 1)); q.globalCompositeOperation = 'destination-in'; q.fillStyle = pat; q.fillRect(0, 0, D.w, D.h); } return limita(c); };
    const junta = (alvo) => { const q = alvo.getContext('2d'); q.save(); q.globalAlpha = WZP.opac; q.globalCompositeOperation = borracha ? 'destination-out' : L.alfa ? 'source-atop' : 'source-over'; q.drawImage(comGrao(), 0, 0); q.restore(); };
    ponto(e); vigia(e);
    return { mais(ev) { const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev]; for (const x of (evs.length ? evs : [ev])) ponto(x); vigia(ev); pinta(); },
      previa() { const c = wzpCopia(L.c); junta(c); return c; }, fim() { clearTimeout(espera); guardaDesfazer(); junta(L.c); }, cancela() { clearTimeout(espera); } };
  }
  // ----- borrar (dedo)
  function novoBorrao(e) {
    const L = D.camadas[D.at], B = wzpPincel(WZP.pb.borrar), W = wzpCopia(L.c), wg = W.getContext('2d'), velho = wzpCopia(L.c); let ult = null, sobra = 0;
    const pr = (ev) => (ev.pointerType === 'mouse' || !ev.pressure ? 1 : ev.pressure);
    const passa = (a, b, p) => { const t = Math.max(2, WZP.tam * (WZP.pTam ? .3 + .7 * p : 1)), s = Math.ceil(t), m = wzpTela(s, s), q = m.getContext('2d');
      q.drawImage(W, a[0] - s / 2, a[1] - s / 2, s, s, 0, 0, s, s); q.globalCompositeOperation = 'destination-in'; q.drawImage(B.ponta, 0, 0, s, s); wg.save(); wg.globalAlpha = Math.min(1, WZP.opac * (WZP.pTop ? p : 1)); wg.drawImage(m, b[0] - s / 2, b[1] - s / 2); wg.restore(); };
    const ponto = (ev) => { const [x, y] = doc(ev), p = pr(ev); if (!ult) { ult = [x, y]; return; } const dx = x - ult[0], dy = y - ult[1], d = Math.hypot(dx, dy), passo = Math.max(.5, WZP.tam * .08); let t = passo - sobra, a = ult;
      while (t <= d) { const b = [ult[0] + dx * t / d, ult[1] + dy * t / d]; passa(a, b, p); a = b; t += passo; } sobra = d - (t - passo); if (a !== ult) ult = a; };
    const final = () => { const c = mistura(velho, W); if (L.alfa) { const q = c.getContext('2d'); q.globalCompositeOperation = 'destination-in'; q.drawImage(velho, 0, 0); } return c; };
    ponto(e);
    return { mais(ev) { const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev]; for (const x of (evs.length ? evs : [ev])) ponto(x); pinta(); }, previa: () => final(), fim() { guardaDesfazer(); poeNaCamada(final()); }, cancela() {} };
  }
  function troca(de, para) { const s = de.pop(); if (!s || !D.camadas[s.at]) return false; const q = D.camadas[s.at].c.getContext('2d'); para.push({ at: s.at, img: q.getImageData(0, 0, D.w, D.h) }); q.putImageData(s.img, 0, 0); D.mudou = true; atualizaSalvar(); pinta(); return true; }
  const desfaz = () => { if (!D) return; if (flut) { cancelaFlutuante(); return; } if (ajuste) { ajuste.cancela(); return; } if (troca(D.desfaz, D.refaz)) aviso('Desfeito', 900); else aviso('Nada para desfazer', 900); };
  const refaz = () => { if (D && !flut && troca(D.refaz, D.desfaz)) aviso('Refeito', 900); };
  function pegaCor(e) { const [x, y] = doc(e).map(Math.floor); if (x < 0 || y < 0 || x >= D.w || y >= D.h) return false; const src = D.tipo === 'visor' && D.ref ? D.ref : wzpJunta(D), d = src.getContext('2d').getImageData(x, y, 1, 1).data; if (d[3] < 10) return false; corAntes = WZP.cor; usaCor(wzpHex(d[0], d[1], d[2])); return true; }
  // enche a área tocada (ColorDrop): mesma cor em volta, com tolerância; respeita a seleção
  function enche(x0, y0, tol = WZP.tol) {
    x0 = Math.floor(x0); y0 = Math.floor(y0); if (x0 < 0 || y0 < 0 || x0 >= D.w || y0 >= D.h) return;
    const L = D.camadas[D.at], refc = D.tipo === 'visor' && D.ref ? D.ref : wzpJunta(D), ref = refc.getContext('2d').getImageData(0, 0, D.w, D.h).data;
    const novo = wzpCopia(L.c), q = novo.getContext('2d'), img = q.getImageData(0, 0, D.w, D.h), px = img.data, m = selM(), md = m ? m.getContext('2d').getImageData(0, 0, D.w, D.h).data : null;
    const i0 = (y0 * D.w + x0) * 4, alvo = [ref[i0], ref[i0 + 1], ref[i0 + 2], ref[i0 + 3]], lim = tol * 4, cor = wzpRgb(D.tipo === 'visor' ? '#ffffff' : WZP.cor);
    const igual = (i) => Math.abs(ref[i] - alvo[0]) + Math.abs(ref[i + 1] - alvo[1]) + Math.abs(ref[i + 2] - alvo[2]) + Math.abs(ref[i + 3] - alvo[3]) <= lim && (!md || md[i + 3] > 127);
    const visto = new Uint8Array(D.w * D.h), pilha = [x0 + y0 * D.w];
    while (pilha.length) { const n = pilha.pop(); if (visto[n]) continue; visto[n] = 1; const i = n * 4; if (!igual(i)) continue; if (!L.alfa || px[i + 3]) { px[i] = cor[0]; px[i + 1] = cor[1]; px[i + 2] = cor[2]; px[i + 3] = L.alfa ? px[i + 3] : 255; } const x = n % D.w;
      if (x > 0) pilha.push(n - 1); if (x < D.w - 1) pilha.push(n + 1); if (n >= D.w) pilha.push(n - D.w); if (n < D.w * (D.h - 1)) pilha.push(n + D.w); }
    q.putImageData(img, 0, 0); guardaDesfazer(); poeNaCamada(novo); pinta();
  }
  // seleção automática: a região de cor parecida em volta do toque (arrastar para os lados muda a tolerância)
  function selAuto(x0, y0, tol) {
    x0 = Math.floor(x0); y0 = Math.floor(y0); if (x0 < 0 || y0 < 0 || x0 >= D.w || y0 >= D.h) return null;
    const ref = wzpJunta(D).getContext('2d').getImageData(0, 0, D.w, D.h).data, m = wzpTela(D.w, D.h), q = m.getContext('2d'), img = q.createImageData(D.w, D.h), px = img.data;
    const i0 = (y0 * D.w + x0) * 4, alvo = [ref[i0], ref[i0 + 1], ref[i0 + 2], ref[i0 + 3]], lim = tol * 4, visto = new Uint8Array(D.w * D.h), pilha = [x0 + y0 * D.w];
    while (pilha.length) { const n = pilha.pop(); if (visto[n]) continue; visto[n] = 1; const i = n * 4; if (Math.abs(ref[i] - alvo[0]) + Math.abs(ref[i + 1] - alvo[1]) + Math.abs(ref[i + 2] - alvo[2]) + Math.abs(ref[i + 3] - alvo[3]) > lim) continue; px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 255; const x = n % D.w;
      if (x > 0) pilha.push(n - 1); if (x < D.w - 1) pilha.push(n + 1); if (n >= D.w) pilha.push(n - D.w); if (n < D.w * (D.h - 1)) pilha.push(n + D.w); }
    q.putImageData(img, 0, 0); return m;
  }
  function novoLaco(e) {
    const modo = WZP.selModo, pts = [doc(e)];
    if (modo === 'auto') { const base = D.sel && WZP.selComb !== 'novo' ? wzpCopia(D.sel) : null, x0 = e.clientX, t0 = WZP.tol;
      const faz = () => { const m = selAuto(pts[0][0], pts[0][1], WZP.tol); if (!m) return; D.sel = base ? wzpCopia(base) : null; novaSel(m); }; faz(); aviso(`Tolerância ${WZP.tol}% (arraste para os lados)`);
      let ult = 0; return { path: () => new Path2D(), mais(ev) { const nt = Math.max(0, Math.min(100, Math.round(t0 + (ev.clientX - x0) / 4))); if (nt === WZP.tol || performance.now() - ult < 60) return; ult = performance.now(); WZP.tol = nt; faz(); aviso(`Tolerância ${WZP.tol}%`); }, fim() { wzpGuarda(); mostraBaixo(); }, auto: true }; }
    const path = () => { const p = new Path2D(), [a, b] = [pts[0], pts[pts.length - 1]];
      if (modo === 'ret') p.rect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
      else if (modo === 'elipse') p.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) / 2 + .01, Math.abs(b[1] - a[1]) / 2 + .01, 0, 0, Math.PI * 2);
      else { pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); } return p; };
    return { path, mais(ev) { const q = doc(ev); if (modo === 'livre') pts.push(q); else pts[1] = q; pinta(); },
      fim() { const [a, b] = [pts[0], pts[pts.length - 1]], grande = modo === 'livre' ? pts.length > 4 : Math.abs(b[0] - a[0]) > 2 && Math.abs(b[1] - a[1]) > 2; if (grande) novaSel(selDePath(path())); else if (WZP.selComb === 'novo') { D.sel = null; listras = null; } mostraBaixo(); pinta(); } };
  }
  const selTudo = () => { const m = wzpTela(D.w, D.h), q = m.getContext('2d'); q.fillStyle = '#fff'; q.fillRect(0, 0, D.w, D.h); D.sel = m; listras = null; pinta(); };
  const selInverte = () => { if (!D.sel) { selTudo(); return; } const m = wzpTela(D.w, D.h), q = m.getContext('2d'); q.fillStyle = '#fff'; q.fillRect(0, 0, D.w, D.h); q.globalCompositeOperation = 'destination-out'; q.drawImage(D.sel, 0, 0); D.sel = m; listras = null; pinta(); };
  const selLimpa = () => { D.sel = null; listras = null; pinta(); };
  const selDifusao = (r) => { if (!D.sel) return; D.sel = wzpDesfoca(D.sel, r); listras = null; pinta(); };
  let area = null; // a "área de transferência" (copiar e colar)
  const copia = (recorta) => { const c = limita(wzpCopia(D.camadas[D.at].c)); area = c; if (recorta) { guardaDesfazer(); const q = D.camadas[D.at].c.getContext('2d'); q.save(); q.globalCompositeOperation = 'destination-out'; if (D.sel) q.drawImage(D.sel, 0, 0); else q.fillRect(0, 0, D.w, D.h); q.restore(); } aviso(recorta ? 'Recortado' : 'Copiado', 1200); pinta(); };
  const cola = () => { if (!area) { aviso('Nada copiado ainda.'); return; } const c = wzpTela(D.w, D.h); c.getContext('2d').drawImage(area, 0, 0); D.camadas.splice(D.at + 1, 0, wzpCamada('Colado', c)); D.at++; D.mudou = true; atualizaSalvar(); aviso('Colado em uma camada nova', 1500); if (popAberto === 'camadas') painelCamadas(); pinta(); };
  // ----- transformar
  function abreFlutuante() {
    if (flut || !D) return; const L = D.camadas[D.at], velho = wzpCopia(L.c), peca = limita(wzpCopia(L.c)), d = peca.getContext('2d').getImageData(0, 0, D.w, D.h).data; let x0 = D.w, y0 = D.h, x1 = -1, y1 = -1;
    for (let y = 0; y < D.h; y++) for (let x = 0; x < D.w; x++) if (d[(y * D.w + x) * 4 + 3] > 2) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { aviso('Não tem nada para transformar nesta camada.'); WZP.ferr = 'pincel'; marcaFerr(); mostraBaixo(); return; }
    const w = x1 - x0 + 1, h = y1 - y0 + 1, c = wzpTela(w, h); c.getContext('2d').drawImage(peca, x0, y0, w, h, 0, 0, w, h);
    const resto = wzpCopia(L.c), rq = resto.getContext('2d'); if (D.sel) { rq.globalCompositeOperation = 'destination-out'; rq.drawImage(D.sel, 0, 0); } else rq.clearRect(0, 0, D.w, D.h);
    const T0 = { cx: x0 + w / 2, cy: y0 + h / 2, sx: 1, sy: 1, r: 0, fh: 1, fv: 1 }, T = { ...T0 };
    const matriz = () => new DOMMatrix().translate(T.cx, T.cy).rotate(T.r).scale(T.sx * T.fh, T.sy * T.fv);
    flut = { T, T0, w, h, velho, resto, c, matriz,
      cantos: () => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => { const p = matriz().transformPoint(new DOMPoint(x, y)); return [p.x, p.y]; }),
      alcaGiro: () => { const p = matriz().transformPoint(new DOMPoint(0, -h / 2 * T.fv)), q = naTela(p.x, p.y), cc = naTela(T.cx, T.cy), dx = q[0] - cc[0], dy = q[1] - cc[1], n = Math.hypot(dx, dy) || 1; return [q[0] + dx / n * 30, q[1] + dy / n * 30]; },
      previa() { const out = wzpCopia(resto), q = out.getContext('2d'); q.setTransform(matriz()); q.imageSmoothingQuality = 'high'; q.drawImage(c, -w / 2, -h / 2); return out; } };
    mostraBaixo(); pinta();
  }
  function aplicaFlutuante() { if (!flut) return; const f = flut; flut = null; D.desfaz.push({ at: D.at, img: f.velho.getContext('2d').getImageData(0, 0, D.w, D.h) }); D.refaz = []; poeNaCamada(f.previa()); D.mudou = true; atualizaSalvar(); D.sel = null; listras = null; mostraBaixo(); pinta(); }
  function cancelaFlutuante() { if (!flut) return; poeNaCamada(flut.velho); flut = null; mostraBaixo(); pinta(); }
  function arrastaFlutuante(e) {
    const r = tela(), sx = e.clientX - r.left, sy = e.clientY - r.top, T = flut.T, [gx, gy] = flut.alcaGiro(), cc = naTela(T.cx, T.cy), P = flut.cantos().map(([x, y]) => naTela(x, y));
    if (Math.hypot(sx - gx, sy - gy) < 20) { const a0 = Math.atan2(sy - cc[1], sx - cc[0]), r0 = T.r; return (ev) => { const x = ev.clientX - r.left, y = ev.clientY - r.top; T.r = r0 + (Math.atan2(y - cc[1], x - cc[0]) - a0) * 180 / Math.PI; if (ev.shiftKey) T.r = Math.round(T.r / 15) * 15; pinta(); }; }
    const local = (ev) => { const p = new DOMMatrix().translate(T.cx, T.cy).rotate(T.r).inverse().transformPoint(new DOMPoint(...doc(ev))); return [p.x, p.y]; };
    const ci = P.findIndex(([x, y]) => Math.hypot(sx - x, sy - y) < 20);
    if (ci >= 0) { if (WZP.trModo === 'uniforme') { const d0 = Math.hypot(sx - cc[0], sy - cc[1]) || 1, s0 = [T.sx, T.sy]; return (ev) => { const k = Math.hypot(ev.clientX - r.left - cc[0], ev.clientY - r.top - cc[1]) / d0; T.sx = Math.max(.02, s0[0] * k); T.sy = Math.max(.02, s0[1] * k); pinta(); }; }
      return (ev) => { const [lx, ly] = local(ev); T.sx = Math.max(.02, Math.abs(lx) / (flut.w / 2)); T.sy = Math.max(.02, Math.abs(ly) / (flut.h / 2)); pinta(); }; }
    if (WZP.trModo === 'livre') { const meios = P.map((p, i) => { const q = P[(i + 1) % 4]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; }), mi = meios.findIndex(([x, y]) => Math.hypot(sx - x, sy - y) < 20);
      if (mi >= 0) return (ev) => { const [lx, ly] = local(ev); if (mi % 2 === 0) T.sy = Math.max(.02, Math.abs(ly) / (flut.h / 2)); else T.sx = Math.max(.02, Math.abs(lx) / (flut.w / 2)); pinta(); }; }
    const p0 = doc(e), c0 = [T.cx, T.cy]; return (ev) => { const q = doc(ev); T.cx = c0[0] + q[0] - p0[0]; T.cy = c0[1] + q[1] - p0[1]; pinta(); };
  }
  // ----- ajustes (na camada escolhida, dentro da seleção); arrastar o dedo na imagem para os lados muda o primeiro número
  function abreAjuste(tipo) {
    if (!D) return; if (ajuste) ajuste.cancela(); aplicaPendente(); const A = WZP_AJ[tipo], L = D.camadas[D.at], velho = wzpCopia(L.c);
    const v = {}; for (const [k, , , , pad] of A.v) v[k] = pad; let cache = null, chave = '';
    const sai = () => { ajuste = null; WZP.ferr = 'pincel'; marcaFerr(); mostraBaixo(); pinta(); };
    const grava = (c) => { D.desfaz.push({ at: D.at, img: velho.getContext('2d').getImageData(0, 0, D.w, D.h) }); D.refaz = []; poeNaCamada(c); D.mudou = true; atualizaSalvar(); sai(); };
    if (tipo === 'liquefazer') { const W = wzpCopia(L.c); ajuste = { tipo, v, W, previa: () => mistura(velho, W), aplica() { grava(ajuste.previa()); }, cancela: sai }; }
    else ajuste = { tipo, v, previa() { const k = JSON.stringify(v); if (k !== chave) { chave = k; const c = A.f(velho, v); if (L.alfa) { const q = c.getContext('2d'); q.globalCompositeOperation = 'destination-in'; q.drawImage(velho, 0, 0); } cache = mistura(velho, c); } return cache; },
      aplica() { grava(ajuste.previa()); }, cancela: sai };
    WZP.ferr = 'ajuste'; marcaFerr(); fechaPop(); mostraBaixo(); pinta();
  }
  function empurra(a, b) { // liquefazer: empurra a tinta de a para b, mais forte no meio do pincel
    const W = ajuste.W, R = Math.max(4, WZP.tam), x0 = Math.max(0, Math.floor(b[0] - R)), y0 = Math.max(0, Math.floor(b[1] - R)), x1 = Math.min(D.w, Math.ceil(b[0] + R)), y1 = Math.min(D.h, Math.ceil(b[1] + R)); if (x1 <= x0 || y1 <= y0) return;
    const sx0 = Math.max(0, x0 - Math.ceil(R)), sy0 = Math.max(0, y0 - Math.ceil(R)), sw = Math.min(D.w, x1 + Math.ceil(R)) - sx0, sh = Math.min(D.h, y1 + Math.ceil(R)) - sy0;
    const q = W.getContext('2d'), src = q.getImageData(sx0, sy0, sw, sh).data, out = q.getImageData(x0, y0, x1 - x0, y1 - y0), o = out.data, dx = b[0] - a[0], dy = b[1] - a[1];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const d = Math.hypot(x - b[0], y - b[1]); if (d >= R) continue; const w = Math.pow(1 - d / R, 2) * WZP.liq, ux = Math.round(x - dx * w) - sx0, uy = Math.round(y - dy * w) - sy0; if (ux < 0 || uy < 0 || ux >= sw || uy >= sh) continue; const si = (uy * sw + ux) * 4, oi = ((y - y0) * (x1 - x0) + (x - x0)) * 4; o[oi] = src[si]; o[oi + 1] = src[si + 1]; o[oi + 2] = src[si + 2]; o[oi + 3] = src[si + 3]; }
    q.putImageData(out, x0, y0);
  }
  const aplicaPendente = () => { if (flut) aplicaFlutuante(); };
  // ----- ferramentas
  function marcaFerr() { topo.querySelectorAll('[data-f]').forEach((b) => b.classList.toggle('on', b.dataset.f === WZP.ferr)); topo.querySelectorAll('[data-p]').forEach((b) => b.classList.toggle('on', b.dataset.p === popAberto || (b.dataset.p === 'ajustes' && WZP.ferr === 'ajuste'))); corBtn.style.background = WZP.cor; }
  function tocaFerr(k) {
    // tocar de novo no pincel, borrar ou borracha abre a biblioteca de pincéis daquela ferramenta
    if (WZP.ferr === k && ['pincel', 'borrar', 'borracha'].includes(k)) { pop(popAberto === 'pinceis' || popAberto === 'estudio' ? null : 'pinceis'); return; }
    if (WZP.ferr === 'transformar' && k !== 'transformar') aplicaFlutuante();
    if (WZP.ferr === 'ajuste' && ajuste) ajuste.cancela();
    if (WZP.ferr === k && (k === 'selecao' || k === 'transformar')) { if (k === 'transformar') aplicaFlutuante(); k = 'pincel'; }
    WZP.ferr = k; wzpGuarda(); fechaPop(); marcaFerr(); if (k === 'transformar') abreFlutuante(); mostraBaixo(); pinta();
  }
  // barra de baixo (opções da ferramenta), como as do Procreate
  function mostraBaixo() {
    const f = WZP.ferr, b = (t, fn, on = false, dica = '') => el('button', { type: 'button', class: on ? 'on' : '', title: dica, on: { click: fn } }, t), itens = [];
    const faixa = (rot, min, max, step, val, set, fmt = (x) => x) => { const r = el('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(val()) }), s = el('span', {}, String(fmt(val()))); r.addEventListener('input', () => { set(+r.value); s.textContent = String(fmt(+r.value)); pinta(); }); return el('label', { class: 'pc-faixa' }, rot, r, s); };
    if (f === 'selecao') {
      itens.push(...[['auto', 'Automática'], ['livre', 'Mão livre'], ['ret', 'Retângulo'], ['elipse', 'Elipse']].map(([k, t]) => b(t, () => { WZP.selModo = k; wzpGuarda(); mostraBaixo(); }, WZP.selModo === k)), el('i', { class: 'sep' }),
        ...[['novo', 'Nova'], ['somar', 'Somar'], ['tirar', 'Tirar']].map(([k, t]) => b(t, () => { WZP.selComb = k; wzpGuarda(); mostraBaixo(); }, WZP.selComb === k)), el('i', { class: 'sep' }),
        b('Inverter', selInverte), b('Copiar e colar', () => { copia(false); cola(); }), b('Difusão', () => selDifusao(3), false, 'Deixa a borda da seleção macia'),
        b('Preencher', () => { if (!D.sel) return; guardaDesfazer(); const c = wzpTela(D.w, D.h), q = c.getContext('2d'); q.fillStyle = D.tipo === 'visor' ? '#fff' : WZP.cor; q.fillRect(0, 0, D.w, D.h); limita(c); const lq = D.camadas[D.at].c.getContext('2d'); lq.save(); if (D.camadas[D.at].alfa) lq.globalCompositeOperation = 'source-atop'; lq.drawImage(c, 0, 0); lq.restore(); pinta(); }, false, 'Enche a seleção com a cor'),
        b('Limpar', selLimpa, false, 'Tira a seleção'));
      if (WZP.selModo === 'auto') itens.push(faixa('Tolerância', 0, 100, 1, () => WZP.tol, (x) => { WZP.tol = x; wzpGuarda(); }, (x) => x + '%'));
    } else if (f === 'transformar') {
      itens.push(...[['livre', 'Livre'], ['uniforme', 'Uniforme']].map(([k, t]) => b(t, () => { WZP.trModo = k; wzpGuarda(); mostraBaixo(); pinta(); }, WZP.trModo === k)), el('i', { class: 'sep' }),
        b('Espelhar ↔', () => { if (flut) { flut.T.fh *= -1; pinta(); } }), b('Espelhar ↕', () => { if (flut) { flut.T.fv *= -1; pinta(); } }), b('Girar 45°', () => { if (flut) { flut.T.r += 45; pinta(); } }),
        b('Encaixar', () => { if (!flut) return; const k = Math.min(D.w / flut.w, D.h / flut.h); Object.assign(flut.T, { cx: D.w / 2, cy: D.h / 2, sx: k, sy: k, r: 0 }); pinta(); }, false, 'Encaixa na imagem'),
        b('Restaurar', () => { if (flut) { Object.assign(flut.T, flut.T0); pinta(); } }), el('i', { class: 'sep' }), b('Aplicar', () => { aplicaFlutuante(); tocaFerr('pincel'); }, true), b('Cancelar', () => { cancelaFlutuante(); tocaFerr('pincel'); }));
    } else if (f === 'ajuste' && ajuste) {
      const A = WZP_AJ[ajuste.tipo]; itens.push(el('b', { style: 'margin:0 6px' }, A.nome));
      for (const [k, rot, min, max, , u] of A.v) itens.push(faixa(rot, min, max, 1, () => ajuste.v[k], (x) => { ajuste.v[k] = x; }, (x) => x + u));
      if (ajuste.tipo === 'liquefazer') itens.push(el('span', { class: 'dica' }, 'Arraste na imagem para empurrar a tinta (o tamanho é o do pincel).'), faixa('Força', 5, 100, 1, () => Math.round(WZP.liq * 100), (x) => { WZP.liq = x / 100; wzpGuarda(); }, (x) => x + '%'));
      else if (A.v.length) itens.push(el('span', { class: 'dica' }, 'ou arraste na imagem para os lados'));
      itens.push(el('i', { class: 'sep' }), b('Aplicar', () => ajuste && ajuste.aplica(), true), b('Cancelar', () => ajuste && ajuste.cancela()));
    }
    baixo.replaceChildren(...itens); baixo.hidden = !itens.length;
  }
  // ----- janelas (popovers)
  function fechaPop() { popAberto = null; popEl.hidden = true; popEl.replaceChildren(); marcaFerr(); }
  function pop(qual) {
    if (!qual || popAberto === qual) { fechaPop(); return; } popAberto = qual; popEl.hidden = false; popEl.className = 'pc-pop ' + qual; popEl.replaceChildren();
    ({ pinceis: painelPinceis, camadas: painelCamadas, cor: painelCor, acoes: painelAcoes, ajustes: painelAjustes, estudio: painelEstudio })[qual]();
    marcaFerr();
  }
  const cab = (t, ...extra) => el('div', { class: 'pc-pop-cab' }, el('b', {}, t), ...extra);
  const reabre = (q) => { popAberto = null; pop(q); };
  // biblioteca de pincéis: coleções à esquerda, pincéis com o traço de amostra à direita
  const amostras = new Map();
  function amostra(id) { const B = wzpPincel(id), ch = id + JSON.stringify((WZP.ajp || {})[id] || {}); if (amostras.has(ch)) return wzpCopia(amostras.get(ch)); const c = wzpTela(220, 46), q = c.getContext('2d'), p = wzpTinta(B, '#ffffff');
    for (let i = 0; i <= 140; i++) { const t = i / 140, x = 14 + t * 192, y = 23 + Math.sin(t * Math.PI * 2) * 10, s = 3 + 15 * Math.sin(t * Math.PI), w = s, h = s * p.height / p.width; q.globalAlpha = Math.min(1, (B.fluxo ?? 1) * 1.2); q.save(); q.translate(x, y); if (B.girar === 'aleatorio') q.rotate(Math.random() * 6.283); q.drawImage(p, -w / 2, -h / 2, w, h); q.restore(); }
    amostras.set(ch, c); return wzpCopia(c); }
  const qualFerr = () => (['pincel', 'borrar', 'borracha'].includes(WZP.ferr) ? WZP.ferr : 'pincel');
  function painelPinceis() {
    const qual = qualFerr(), cols = new Map([['Prontos', []]]);
    for (const b of WZP_PINCEIS) { const c = b.importado ? (b.colecao || 'Importados') : 'Prontos'; if (!cols.has(c)) cols.set(c, []); cols.get(c).push(b); }
    if (!cols.has(WZP.colecao)) WZP.colecao = 'Prontos';
    // sem "accept": no iPad, filtrar por tipo esconde os .brush e .brushset no app Arquivos
    const arq = el('input', { type: 'file', multiple: true, class: 'pc-arq', style: 'display:none' });
    arq.addEventListener('change', async () => { for (const f of arq.files) { aviso(`Importando ${f.name}…`, 20000); try { const ids = await wzpImporta(f); const b2 = WZP_PINCEIS.find((x) => x.id === ids[0]); WZP.colecao = (b2 && b2.colecao) || 'Importados'; WZP.pb[qual] = ids[0]; aviso(`${ids.length} ${ids.length === 1 ? 'pincel importado' : 'pincéis importados'} de ${f.name}`, 3500); } catch (e) { aviso(`${f.name}: ${e && e.message}`, 7000); } } arq.value = ''; wzpGuarda(); reabre('pinceis'); });
    const esq = el('div', { class: 'pc-cols' }, ...[...cols.keys()].map((c) => el('button', { type: 'button', class: WZP.colecao === c ? 'on' : '', title: c, on: { click: () => { WZP.colecao = c; wzpGuarda(); reabre('pinceis'); } } }, c)));
    const dir = el('div', { class: 'pc-lista' }, ...cols.get(WZP.colecao).map((b) => el('div', { class: 'pc-pin' + (WZP.pb[qual] === b.id ? ' on' : ''), 'data-id': b.id, on: { click: () => { if (WZP.pb[qual] === b.id) { reabre('estudio'); return; } WZP.pb[qual] = b.id; wzpGuarda(); reabre('pinceis'); } } },
      el('span', {}, b.nome), amostra(b.id), b.importado ? el('i', { title: 'Tirar este pincel', on: { click: async (ev) => { ev.stopPropagation(); if (!(await wzPergunta(`Tirar o pincel "${b.nome}"?`))) return; await WZP_DB.tira(b.id); WZP_PINCEIS.splice(WZP_PINCEIS.indexOf(b), 1); for (const t of Object.keys(WZP.pb)) if (WZP.pb[t] === b.id) WZP.pb[t] = 'redondo'; wzpGuarda(); reabre('pinceis'); } } }, '×') : null)));
    popEl.append(cab(`Biblioteca de pincéis · ${qual}`, el('button', { type: 'button', class: 'pc-mais', title: 'Importar pincéis do Procreate (.brush, .brushset) ou do Photoshop (.abr)', on: { click: () => arq.click() } }, '+')), el('div', { class: 'pc-bib' }, esq, dir), arq,
      el('p', { class: 'pc-dica' }, 'Toque no pincel escolhido para ajustar. O "+" importa pincéis do Procreate (.brush, .brushset) e do Photoshop (.abr).'));
  }
  function painelEstudio() {
    const id = WZP.pb[qualFerr()], B = wzpPincel(id), aj = (WZP.ajp[id] = WZP.ajp[id] || {}), val = (k, pad) => aj[k] ?? B[k] ?? pad;
    const am = amostra(id), reAm = () => { const n = amostra(id); am.getContext('2d').clearRect(0, 0, am.width, am.height); am.getContext('2d').drawImage(n, 0, 0); };
    const lin = (rot, k, min, max, step, pad, fmt) => { const r = el('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(val(k, pad)) }), s = el('span', {}, fmt(val(k, pad))); r.addEventListener('input', () => { aj[k] = +r.value; s.textContent = fmt(+r.value); wzpGuarda(); }); r.addEventListener('change', reAm); return el('label', { class: 'pc-faixa' }, rot, r, s); };
    const pct = (x) => Math.round(x * 100) + '%';
    const giro = el('select', {}, ...[['', 'Não gira'], ['direcao', 'Segue o traço'], ['aleatorio', 'Gira ao acaso']].map(([k, t]) => el('option', { value: k, selected: (val('girar', '') || '') === k }, t))); giro.addEventListener('change', () => { aj.girar = giro.value || undefined; wzpGuarda(); reAm(); });
    const marca = (rot, k) => { const c = el('input', { type: 'checkbox', checked: !!WZP[k] }); c.addEventListener('change', () => { WZP[k] = c.checked; wzpGuarda(); }); return el('label', { class: 'pc-marca' }, c, rot); };
    popEl.append(cab(`Estúdio do pincel · ${B.nome}`, el('button', { type: 'button', class: 'pc-txt', on: { click: () => reabre('pinceis') } }, 'Biblioteca')), am,
      el('h4', {}, 'Traço'), lin('Espaçamento', 'espaco', .02, 1.5, .01, .1, pct), lin('Dispersão', 'jitter', 0, 2, .05, 0, pct), lin('Estabilizador', 'suav', 0, 1, .05, 0, pct),
      el('h4', {}, 'Forma e grão'), el('label', { class: 'pc-faixa' }, 'Rotação', giro, el('span', {})), lin('Escala do grão', 'gEsc', .2, 3, .05, 1, (x) => (+x).toFixed(2) + 'x'),
      el('h4', {}, 'Pressão da caneta'), lin('Tamanho mínimo', 'pMin', 0, 1, .05, .15, pct), marca('A pressão muda o tamanho', 'pTam'), marca('A pressão muda a opacidade', 'pTop'),
      el('h4', {}, 'Geral'), lin('Fluxo', 'fluxo', .05, 1, .05, 1, pct),
      el('button', { type: 'button', class: 'pc-txt', on: { click: () => { delete WZP.ajp[id]; wzpGuarda(); reabre('estudio'); } } }, 'Voltar ao original'));
  }
  function painelCamadas() {
    if (!D) return; popEl.replaceChildren(); popAberto = 'camadas';
    const nomeModo = (m) => (WZP_MODOS.find(([k]) => k === m) || WZP_MODOS[0]);
    const mais = el('button', { type: 'button', class: 'pc-mais', title: 'Camada nova', on: { click: () => { aplicaPendente(); D.camadas.splice(D.at + 1, 0, wzpCamada(`Camada ${D.camadas.length + 1}`, wzpTela(D.w, D.h))); D.at++; D.mudou = true; atualizaSalvar(); painelCamadas(); pinta(); } } }, '+');
    popEl.append(cab('Camadas', mais));
    const lista = el('div', { class: 'pc-camadas' });
    D.camadas.map((C, i) => {
      const mini = wzpTela(56, 42), q = mini.getContext('2d'), k = Math.min(56 / D.w, 42 / D.h); q.drawImage(C.c, (56 - D.w * k) / 2, (42 - D.h * k) / 2, D.w * k, D.h * k);
      const vis = el('input', { type: 'checkbox', checked: C.vis, title: 'Mostrar' }); vis.addEventListener('click', (ev) => ev.stopPropagation()); vis.addEventListener('change', () => { C.vis = vis.checked; pinta(); });
      const nBtn = el('button', { type: 'button', class: 'pc-n', title: 'Mistura e opacidade', on: { click: (ev) => { ev.stopPropagation(); D.at = i; opcoesN(); } } }, nomeModo(C.modo)[2]);
      return el('div', { class: 'pc-cam' + (i === D.at ? ' on' : '') + (C.recorte ? ' rec' : '') + (C.alfa ? ' alfa' : ''), on: { click: () => { aplicaPendente(); if (D.at === i) opcoesCamada(); else { D.at = i; painelCamadas(); } } } },
        mini, el('span', { class: 'pc-cam-nome' }, C.nome, el('small', {}, [C.alfa ? 'transparência travada' : '', C.recorte ? 'recorte' : '', C.op < 1 ? Math.round(C.op * 100) + '%' : ''].filter(Boolean).join(' · '))), nBtn, vis);
    }).reverse().forEach((x) => lista.append(x));
    popEl.append(lista, el('p', { class: 'pc-dica' }, 'Toque na camada escolhida para ver as opções (copiar para outros quadros está lá). O "N" muda a mistura e a opacidade.'));
  }
  function opcoesN() {
    const L = D.camadas[D.at], op = el('input', { type: 'range', min: '0', max: '1', step: '.01', value: String(L.op) }), s = el('span', {}, Math.round(L.op * 100) + '%');
    op.addEventListener('input', () => { L.op = +op.value; s.textContent = Math.round(L.op * 100) + '%'; D.mudou = true; atualizaSalvar(); pinta(); });
    popEl.replaceChildren(cab(`${L.nome}: mistura`, el('button', { type: 'button', class: 'pc-txt', on: { click: () => painelCamadas() } }, 'Voltar')), el('label', { class: 'pc-faixa' }, 'Opacidade', op, s),
      el('div', { class: 'pc-modos' }, ...WZP_MODOS.map(([k, t]) => el('button', { type: 'button', class: (L.modo || 'source-over') === k ? 'on' : '', on: { click: () => { L.modo = k; D.mudou = true; atualizaSalvar(); opcoesN(); pinta(); } } }, t))));
  }
  function opcoesCamada() {
    const L = D.camadas[D.at], feito = () => { D.mudou = true; atualizaSalvar(); painelCamadas(); pinta(); };
    const it = (t, fn, marcado) => el('button', { type: 'button', class: 'pc-op' + (marcado ? ' on' : ''), on: { click: fn } }, t, marcado !== undefined ? el('i', {}, marcado ? '✓' : '') : null);
    const mexe = (d) => { const j = D.at + d; if (j < 0 || j >= D.camadas.length) return; [D.camadas[D.at], D.camadas[j]] = [D.camadas[j], D.camadas[D.at]]; D.desfaz = []; D.refaz = []; D.at = j; feito(); };
    popEl.replaceChildren(cab(L.nome, el('button', { type: 'button', class: 'pc-txt', on: { click: () => painelCamadas() } }, 'Voltar')), el('div', { class: 'pc-ops' }, ...[
      WZP.modo === 'personagem' ? it('Copiar para outros quadros…', () => copiaParaQuadros()) : null,
      it('Renomear', async () => { const n = await wzPergunta('Nome da camada:', true); if (n) { L.nome = n.slice(0, 40); feito(); } }),
      it('Selecionar (o que tem tinta)', () => { const m = wzpCopia(L.c), q = m.getContext('2d'); q.globalCompositeOperation = 'source-in'; q.fillStyle = '#fff'; q.fillRect(0, 0, D.w, D.h); D.sel = m; listras = null; fechaPop(); WZP.ferr = 'selecao'; marcaFerr(); mostraBaixo(); pinta(); }),
      it('Copiar', () => copia(false)), it('Colar', () => { cola(); painelCamadas(); }),
      it('Preencher a camada com a cor', () => { guardaDesfazer(); const q = L.c.getContext('2d'); q.save(); if (L.alfa) q.globalCompositeOperation = 'source-atop'; q.fillStyle = D.tipo === 'visor' ? '#fff' : WZP.cor; q.fillRect(0, 0, D.w, D.h); q.restore(); feito(); }),
      it('Limpar', () => { guardaDesfazer(); const q = L.c.getContext('2d'); if (D.sel) { q.save(); q.globalCompositeOperation = 'destination-out'; q.drawImage(D.sel, 0, 0); q.restore(); } else q.clearRect(0, 0, D.w, D.h); feito(); }),
      it('Travar a transparência', () => { L.alfa = !L.alfa; feito(); opcoesCamada(); }, L.alfa), it('Máscara de recorte', () => { L.recorte = !L.recorte; feito(); opcoesCamada(); }, L.recorte),
      it('Inverter as cores', () => { guardaDesfazer(); const q = L.c.getContext('2d'), img = q.getImageData(0, 0, D.w, D.h), a = img.data; for (let i = 0; i < a.length; i += 4) { a[i] = 255 - a[i]; a[i + 1] = 255 - a[i + 1]; a[i + 2] = 255 - a[i + 2]; } q.putImageData(img, 0, 0); feito(); }),
      it('Duplicar', () => { D.camadas.splice(D.at + 1, 0, { ...L, nome: L.nome + ' (cópia)', c: wzpCopia(L.c) }); D.at++; feito(); }),
      it('Juntar com a de baixo', () => { if (D.at < 1) return; const a = D.camadas[D.at - 1]; D.desfaz = []; D.refaz = []; const junto = wzpCompor({ w: D.w, h: D.h, camadas: [{ ...a, op: 1, modo: 'source-over', recorte: false }, { ...L }] }); const q = a.c.getContext('2d'); q.clearRect(0, 0, D.w, D.h); q.drawImage(junto, 0, 0); D.camadas.splice(D.at, 1); D.at--; feito(); }),
      it('Subir', () => mexe(1)), it('Descer', () => mexe(-1)),
      it('Apagar a camada', () => { if (D.camadas.length < 2) { aviso('A imagem precisa de pelo menos uma camada.'); return; } D.desfaz = D.desfaz.filter((s) => s.at !== D.at).map((s) => ({ ...s, at: s.at > D.at ? s.at - 1 : s.at })); D.refaz = []; D.camadas.splice(D.at, 1); D.at = Math.max(0, D.at - 1); feito(); })].filter(Boolean)));
  }
  // copiar a camada para outros quadros do movimento (alinhando pelos pés, o ponto de apoio de cada quadro)
  function copiaParaQuadros() {
    if (!D) return; if (popAberto !== 'camadas') pop('camadas');
    const L = D.camadas[D.at], lista = wzpQuadrosDoMov().filter((q) => !(q.k === WZP.k && q.meio === !!WZP.meio)), marcados = new Set(), pes = el('input', { type: 'checkbox', checked: true });
    const grade = el('div', { class: 'pc-grade mini' }), todos = el('input', { type: 'checkbox', class: 'pc-todos' });
    const caixas = lista.map((q) => { const c = el('input', { type: 'checkbox', 'data-q': `${q.k}${q.meio ? 'm' : ''}` }), mini = wzpTela(64, 64); c.addEventListener('change', () => { if (c.checked) marcados.add(q); else marcados.delete(q); todos.checked = marcados.size === lista.length; });
      const r = wzpQuadro({ ...wzpAtual(), k: q.k, meio: q.meio, visor: false }); if (r) { const g2 = mini.getContext('2d'), k = Math.min(60 / r.c.width, 60 / r.c.height); g2.drawImage(r.c, (64 - r.c.width * k) / 2, (64 - r.c.height * k) / 2, r.c.width * k, r.c.height * k); }
      grade.append(el('label', { class: 'pc-card' }, mini, el('span', {}, c, ` ${q.k + 1}${q.meio ? '½' : ''}`))); return c; });
    todos.addEventListener('change', () => { caixas.forEach((c, i) => { c.checked = todos.checked; if (todos.checked) marcados.add(lista[i]); else marcados.delete(lista[i]); }); });
    const vai = el('button', { type: 'button', class: 'pc-txt quente pc-copiar', on: { click: async () => {
      if (!marcados.size) { aviso('Escolha pelo menos um quadro.'); return; } vai.disabled = true; let n = 0;
      for (const q of marcados) { const T = await wzpDocDe({ ...wzpAtual(), k: q.k, meio: q.meio }); if (!T || T === D) continue; const c = wzpTela(T.w, T.h), dx = pes.checked ? Math.round(T.F.ax - D.F.ax) : 0, dy = pes.checked ? Math.round(T.F.ay - D.F.ay) : 0; c.getContext('2d').drawImage(L.c, dx, dy);
        T.camadas.push({ ...L, nome: `${L.nome} (do quadro ${WZP.k + 1}${WZP.meio ? '½' : ''})`, c }); T.at = T.camadas.length - 1; T.mudou = true; n++; }
      atualizaSalvar(); desenhaAnim(); fechaPop(); aviso(`Camada copiada para ${n} ${n === 1 ? 'quadro' : 'quadros'}. Toque em "Salvar" para levar todos ao jogo.`, 4500);
    } } }, `Copiar para os quadros escolhidos`);
    popEl.replaceChildren(cab(`Copiar "${L.nome}"`, el('button', { type: 'button', class: 'pc-txt', on: { click: () => painelCamadas() } }, 'Voltar')),
      el('label', { class: 'pc-marca' }, todos, 'Todos os quadros deste movimento'), el('label', { class: 'pc-marca' }, pes, 'Alinhar pelos pés (o desenho fica no mesmo lugar do corpo em cada quadro)'), grade, vai);
  }
  // cor: disco (anel de matiz com o quadrado de saturação e brilho), clássico (barras) e paletas
  let hsv = wzpRgb2hsv(...wzpRgb(WZP.cor)), corAntes = WZP.cor;
  function usaCor(c, guardar = true) { WZP.cor = c; hsv = wzpRgb2hsv(...wzpRgb(c)); if (guardar) WZP.recentes = [c, ...(WZP.recentes || []).filter((x) => x !== c)].slice(0, 14); wzpGuarda(); marcaFerr(); if (popAberto === 'cor') reabre('cor'); }
  function painelCor() {
    WZP.corAba = WZP.corAba || 'disco';
    const atual = el('span', { class: 'pc-sw', style: `background:${WZP.cor}`, title: 'Cor atual' }), antes = el('button', { type: 'button', class: 'pc-sw', style: `background:${corAntes}`, title: 'Cor anterior', on: { click: () => usaCor(corAntes) } });
    popEl.append(cab('Cor', atual, antes));
    const hex = el('input', { type: 'text', value: WZP.cor, maxLength: 7, class: 'pc-hex' }); hex.addEventListener('change', () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) usaCor(hex.value.toLowerCase()); });
    const muda = () => { const [r, g2, b] = wzpHsv2rgb(...hsv); WZP.cor = wzpHex(r, g2, b); atual.style.background = WZP.cor; corBtn.style.background = WZP.cor; hex.value = WZP.cor; };
    const corpo = el('div', {});
    if (WZP.corAba === 'disco') {
      const S = 260, cvd = el('canvas', { class: 'pc-disco', width: S, height: S }), q = cvd.getContext('2d'), R1 = S / 2 - 2, R0 = R1 - 26, L = R0 * Math.SQRT2 * .92, x0 = (S - L) / 2;
      const des = () => { q.clearRect(0, 0, S, S); for (let a = 0; a < 360; a += 1) { q.beginPath(); q.strokeStyle = `hsl(${a},100%,50%)`; q.lineWidth = 27; q.arc(S / 2, S / 2, (R0 + R1) / 2, (a - 91) * Math.PI / 180, (a - 89) * Math.PI / 180); q.stroke(); }
        const [r, g2, b] = wzpHsv2rgb(hsv[0], 1, 1); q.fillStyle = wzpHex(r, g2, b); q.fillRect(x0, x0, L, L); let gr = q.createLinearGradient(x0, 0, x0 + L, 0); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); q.fillStyle = gr; q.fillRect(x0, x0, L, L); gr = q.createLinearGradient(0, x0, 0, x0 + L); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, '#000'); q.fillStyle = gr; q.fillRect(x0, x0, L, L);
        const ah = (hsv[0] - 90) * Math.PI / 180; q.lineWidth = 3; q.strokeStyle = '#fff'; q.beginPath(); q.arc(S / 2 + Math.cos(ah) * (R0 + R1) / 2, S / 2 + Math.sin(ah) * (R0 + R1) / 2, 11, 0, 6.283); q.stroke();
        q.beginPath(); q.arc(x0 + hsv[1] * L, x0 + (1 - hsv[2]) * L, 9, 0, 6.283); q.stroke(); };
      let modo = null; const go = (e) => { const r = cvd.getBoundingClientRect(), x = (e.clientX - r.left) * S / r.width, y = (e.clientY - r.top) * S / r.height, d = Math.hypot(x - S / 2, y - S / 2);
        if (!modo) modo = d > R0 - 4 ? 'anel' : 'quadrado';
        if (modo === 'anel') hsv = [(Math.atan2(y - S / 2, x - S / 2) * 180 / Math.PI + 90 + 360) % 360, hsv[1], hsv[2]]; else hsv = [hsv[0], Math.max(0, Math.min(1, (x - x0) / L)), Math.max(0, Math.min(1, 1 - (y - x0) / L))];
        muda(); des(); };
      cvd.addEventListener('pointerdown', (e) => { modo = null; try { cvd.setPointerCapture(e.pointerId); } catch { /* */ } go(e); }); cvd.addEventListener('pointermove', (e) => { if (modo) go(e); }); cvd.addEventListener('pointerup', () => { if (!modo) return; modo = null; usaCor(WZP.cor); });
      des(); corpo.append(cvd);
    } else if (WZP.corAba === 'classico') {
      const barra = (rot, i, max) => { const r = el('input', { type: 'range', min: '0', max: String(max), step: i ? '.01' : '1', value: String(hsv[i]) }); r.addEventListener('input', () => { hsv[i] = +r.value; muda(); }); r.addEventListener('change', () => usaCor(WZP.cor)); return el('label', { class: 'pc-faixa' }, rot, r, el('span', {}, '')); };
      corpo.append(barra('Matiz', 0, 359), barra('Saturação', 1, 1), barra('Brilho', 2, 1));
    } else {
      corpo.append(el('div', { class: 'pc-paleta' }, ...WZP.paleta.map((c) => el('button', { type: 'button', style: `background:${c}`, title: `${c} (segure ou clique com o botão direito para tirar)`, on: { click: () => usaCor(c, false), contextmenu: (e) => { e.preventDefault(); WZP.paleta = WZP.paleta.filter((x) => x !== c); wzpGuarda(); reabre('cor'); } } })),
        el('button', { type: 'button', class: 'pc-mais', title: 'Guardar a cor atual na paleta', on: { click: () => { if (!WZP.paleta.includes(WZP.cor)) WZP.paleta.push(WZP.cor); wzpGuarda(); reabre('cor'); } } }, '+')));
    }
    popEl.append(corpo, el('div', { class: 'pc-chips' }, ...[['disco', 'Disco'], ['classico', 'Clássico'], ['paletas', 'Paletas']].map(([k, t]) => el('button', { type: 'button', class: WZP.corAba === k ? 'on' : '', on: { click: () => { WZP.corAba = k; wzpGuarda(); reabre('cor'); } } }, t)), hex),
      el('div', { class: 'pc-hist' }, 'Histórico ', ...(WZP.recentes || []).map((c) => el('button', { type: 'button', style: `background:${c}`, title: c, on: { click: () => usaCor(c) } }))));
  }
  function painelAjustes() {
    popEl.append(cab('Ajustes'), el('div', { class: 'pc-ops' }, ...Object.entries(WZP_AJ).map(([k, A]) => el('button', { type: 'button', class: 'pc-op', 'data-aj': k, on: { click: () => abreAjuste(k) } }, A.nome))),
      el('p', { class: 'pc-dica' }, 'Valem para a camada escolhida (e só dentro da seleção, se tiver).'));
  }
  function painelAcoes() {
    WZP.acaoAba = WZP.acaoAba || 'adicionar';
    const abas = [['adicionar', 'Adicionar'], ['tela', 'Tela'], ['imagem', 'Imagem'], ['prefs', 'Preferências'], ['ajuda', 'Ajuda']];
    const it = (t, fn, marcado) => el('button', { type: 'button', class: 'pc-op' + (marcado ? ' on' : ''), on: { click: fn } }, t, marcado !== undefined ? el('i', {}, marcado ? '✓' : '') : null);
    const alterna = (k) => () => { WZP[k] = !WZP[k]; wzpGuarda(); if (k === 'canhoto') ov.classList.toggle('canhoto', WZP.canhoto); if (k === 'animOn') { desenhaAnim(); requestAnimationFrame(() => { enquadra(); pinta(); }); } reabre('acoes'); pinta(); };
    const arq = el('input', { type: 'file', style: 'display:none' });
    arq.addEventListener('change', async () => { const f = arq.files[0]; arq.value = ''; if (!f) return; try { const im = await wzpImg(URL.createObjectURL(f)), c = wzpTela(D.w, D.h), k = Math.min(1, D.w / im.naturalWidth, D.h / im.naturalHeight); c.getContext('2d').drawImage(im, (D.w - im.naturalWidth * k) / 2, (D.h - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k); D.camadas.splice(D.at + 1, 0, wzpCamada(f.name.replace(/\.[^.]+$/, '').slice(0, 30), c)); D.at++; D.mudou = true; atualizaSalvar(); fechaPop(); tocaFerr('transformar'); aviso('Imagem inserida numa camada nova (ajuste com o Transformar).', 3000); } catch { aviso('Não deu para abrir essa imagem.'); } });
    const espelhaTudo = (h) => { for (let i = 0; i < D.camadas.length; i++) { D.desfaz.push({ at: i, img: D.camadas[i].c.getContext('2d').getImageData(0, 0, D.w, D.h) }); const c = wzpTela(D.w, D.h), q = c.getContext('2d'); q.setTransform(h ? -1 : 1, 0, 0, h ? 1 : -1, h ? D.w : 0, h ? 0 : D.h); q.drawImage(D.camadas[i].c, 0, 0); poeNaCamada(c, i); } D.refaz = []; D.mudou = true; atualizaSalvar(); pinta(); };
    const conteudo = {
      adicionar: () => [it('Inserir uma imagem (vira uma camada nova)', () => arq.click()), it('Recortar', () => copia(true)), it('Copiar', () => copia(false)), it('Colar', () => cola())],
      tela: () => [it('Espelhar a imagem na horizontal (todas as camadas)', () => espelhaTudo(true)), it('Espelhar a imagem na vertical (todas as camadas)', () => espelhaTudo(false)),
        it('Simetria (guia no meio)', alterna('simetria'), !!WZP.simetria), WZP.modo === 'personagem' ? it('Assistente de animação', alterna('animOn'), !!WZP.animOn) : null,
        it('Ver a imagem inteira', () => { enquadra(); pinta(); fechaPop(); })],
      imagem: () => [it(`Salvar no jogo (${wzpMudados().length})`, () => { fechaPop(); wzpSalvaComAviso(ov); }),
        it('Voltar esta imagem à original do jogo', async () => { if (!(await wzPergunta('Voltar esta imagem para a original do jogo (tira a pintura salva dela)?'))) return; const c = { ...(WZE.cfg.imgs || {}) }; delete c[D.F.k]; WZE.cfg.imgs = c; WZ.apply(WZE.cfg); wzMudou(); for (const [k, d] of WZP_DOCS) if (d.F.k === D.F.k) WZP_DOCS.delete(k); WZP_QC.clear(); fechaPop(); D = null; await abreAtual(); }),
        it('Baixar esta imagem (PNG)', () => { const a = document.createElement('a'); a.href = wzpJunta(D).toDataURL('image/png'); a.download = `${D.F.nome.replace(/[^\w.-]+/g, '-')}.png`; a.click(); })],
      prefs: () => [it('Interface para canhotos (barra do lado à direita)', alterna('canhoto'), !!WZP.canhoto), it('O dedo pinta quando não houver caneta', alterna('dedo'), !!WZP.dedo), it('Mostrar o contorno do pincel', alterna('contorno'), !!WZP.contorno),
        it('A pressão muda o tamanho', alterna('pTam'), !!WZP.pTam), it('A pressão muda a opacidade', alterna('pTop'), !!WZP.pTop)],
      ajuda: () => [el('ul', { class: 'pc-ajuda' }, ...['Dois dedos tocando: desfazer. Três dedos: refazer.', 'Pinça com dois dedos: aproximar, girar e mover. Pinça rápida para dentro: encaixar a imagem na tela.', 'Quatro dedos tocando: esconder a interface (de novo para mostrar).',
        'Três dedos arrastando para baixo: copiar e colar.', 'Segurar o dedo parado na imagem: conta-gotas. O quadradinho da barra do lado também pega a cor.', 'Segurar a caneta parada no fim do traço: linha reta (ou elipse, se o traço fechar).',
        'Arrastar a bolinha de cor até a imagem: enche aquela área com a cor.', 'Tocar de novo no pincel, borrar ou borracha: biblioteca de pincéis.', 'Com a caneta, o dedo não pinta: só faz os gestos.', 'Teclado: B pincel, S borrar, E borracha, L seleção, V transformar, I conta-gotas, [ ] tamanho, Ctrl+Z, Ctrl+Shift+Z, Espaço para mover.'].map((t) => el('li', {}, t)))],
    };
    popEl.append(cab('Ações'), el('div', { class: 'pc-chips' }, ...abas.map(([k, t]) => el('button', { type: 'button', class: WZP.acaoAba === k ? 'on' : '', on: { click: () => { WZP.acaoAba = k; wzpGuarda(); reabre('acoes'); } } }, t))), el('div', { class: 'pc-ops' }, ...conteudo[WZP.acaoAba]().filter(Boolean)), arq);
  }
  // ----- assistente de animação: os quadros do movimento, cebola, tocar, copiar camada
  function desenhaAnim() {
    anim.replaceChildren(); const on = WZP.modo === 'personagem' && !!WZP.animOn; anim.hidden = !on; ov.classList.toggle('com-anim', on); if (!on) return;
    const toca = el('button', { type: 'button', class: 'pc-b', title: 'Tocar a animação', on: { click: () => tocaAnim() } }, wzpIco(tocando ? 'parar' : 'tocar'));
    const ceb = el('select', { title: 'Cebola: mostra os quadros de antes (vermelho) e depois (verde)' }, ...[0, 1, 2, 3].map((n) => el('option', { value: String(n), selected: WZP.cebolaN === n }, n ? `Cebola: ${n}` : 'Sem cebola'))); ceb.addEventListener('change', () => { WZP.cebolaN = +ceb.value; wzpGuarda(); pinta(); });
    const op = el('input', { type: 'range', min: '.1', max: '.8', step: '.05', value: String(WZP.cebolaOp), title: 'Opacidade da cebola' }); op.addEventListener('input', () => { WZP.cebolaOp = +op.value; wzpGuarda(); pinta(); });
    const tira = el('div', { class: 'pc-tira' });
    for (const q of wzpQuadrosDoMov()) {
      const o = { ...wzpAtual(), k: q.k, meio: q.meio }, F = wzpFonteDe(o), Dq = F && WZP_DOCS.get(wzpChave(F)), mini = wzpTela(54, 54);
      const r = wzpQuadro({ ...o, visor: false }, () => desenhaAnim()); if (r) { const g2 = mini.getContext('2d'), k = Math.min(50 / r.c.width, 50 / r.c.height); g2.drawImage(r.c, (54 - r.c.width * k) / 2, (54 - r.c.height * k) / 2, r.c.width * k, r.c.height * k); }
      tira.append(el('button', { type: 'button', class: 'pc-q' + (q.k === WZP.k && q.meio === !!WZP.meio ? ' on' : '') + (Dq && Dq.mudou ? ' mud' : ''), title: `Quadro ${q.k + 1}${q.meio ? ' (do meio)' : ''}`, on: { click: () => trocaQuadro(q) } }, mini, el('span', {}, `${q.k + 1}${q.meio ? '½' : ''}`)));
    }
    anim.append(toca, ceb, op, el('button', { type: 'button', class: 'pc-txt', title: 'Copiar a camada escolhida para outros quadros', on: { click: () => copiaParaQuadros() } }, 'Copiar camada…'), tira);
    const on2 = tira.querySelector('.on'); if (on2 && on2.scrollIntoView) on2.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  function tocaAnim() {
    if (tocando) { clearInterval(tocando); tocando = 0; tocaFr = null; desenhaAnim(); pinta(); return; }
    const L = wzpQuadrosDoMov().filter((q) => !q.meio); if (!L.length) return; let i = Math.max(0, L.findIndex((q) => q.k === WZP.k));
    tocando = setInterval(() => { if (!vivo()) { clearInterval(tocando); return; } i = (i + 1) % L.length; const r = wzpQuadro({ ...wzpAtual(), k: L[i].k, meio: false, visor: false }, pinta); if (r) tocaFr = r; pinta(); }, 1000 / 12);
    desenhaAnim();
  }
  async function trocaQuadro(q) { aplicaPendente(); if (ajuste) ajuste.cancela(); if (tocando) tocaAnim(); WZP.k = q.k; WZP.meio = q.meio; wzpGuarda(); await abreAtual(true); }
  async function abreAtual(manterVista) {
    const novo = await wzpDocDe(wzpAtual()); if (!novo) { aviso('Não achei esta imagem.'); return; }
    const mesmoTam = D && D.w === novo.w && D.h === novo.h; D = novo; WZP.doc = D; listras = null; comp = null;
    nomeEl.textContent = (D.F.setNome ? D.F.setNome + ' · ' : '') + D.F.nome + ` · ${D.w}×${D.h}`;
    desenhaAnim(); if (!manterVista || !mesmoTam) enquadra(); atualizaSalvar(); marcaFerr(); mostraBaixo(); if (popAberto === 'camadas') painelCamadas(); pinta();
  }

  // ----- caneta, mouse e dedos
  const toques = new Map(); let gesto = null, arrasto = null, toqueMax = 0, toqueIni = 0, toqueMoveu = false, segura = 0, pendente = null, gotaDrag = null;
  const comecaAcao = (e, f) => {
    acaoTipo = e.pointerType;
    if (f === 'selecao') { acao = laco = novoLaco(e); if (laco.auto) laco = null; return; }
    if (f === 'transformar') { if (!flut) abreFlutuante(); if (flut) acao = { mais: arrastaFlutuante(e), fim() {} }; return; }
    if (f === 'ajuste') { if (!ajuste) return; if (ajuste.tipo === 'liquefazer') { let a = doc(e); acao = { mais(ev) { const b = doc(ev); empurra(a, b); a = b; pinta(); }, fim() {} }; return; }
      const A = WZP_AJ[ajuste.tipo]; if (!A.v.length) return; const [k, , min, max] = A.v[0], v0 = ajuste.v[k], x0 = e.clientX, w = tela().width;
      acao = { mais(ev) { ajuste.v[k] = Math.round(Math.max(min, Math.min(max, v0 + (ev.clientX - x0) / w * (max - min)))); mostraBaixoValores(); pinta(); }, fim() {} }; return; }
    const L = D.camadas[D.at]; if (L && !L.vis) { aviso('A camada escolhida está escondida.'); return; }
    acao = traco = f === 'borrar' ? novoBorrao(e) : novoTraco(e, f === 'borracha'); pinta();
  };
  const mostraBaixoValores = () => { if (!ajuste) return; const A = WZP_AJ[ajuste.tipo]; baixo.querySelectorAll('.pc-faixa').forEach((lab, i) => { const def = A.v[i]; if (!def) return; const r = lab.querySelector('input'), s = lab.querySelector('span'); r.value = String(ajuste.v[def[0]]); s.textContent = ajuste.v[def[0]] + def[5]; }); };
  const soltaPendente = () => { if (!pendente) return; clearTimeout(pendente.t); const p = pendente; pendente = null; comecaAcao(p.e, WZP.ferr); for (const x of p.evs) if (acao) acao.mais(x); };
  const cancelaAcao = () => { if (pendente) { clearTimeout(pendente.t); pendente = null; } if (acao && acao.cancela) acao.cancela(); acao = null; traco = null; laco = null; pinta(); };
  cv.addEventListener('pointerdown', (e) => {
    if (!D) return;
    if (e.pointerType === 'touch' && acao && acaoTipo !== 'touch') return; // a mão encostando enquanto a caneta pinta: ignora
    try { cv.setPointerCapture(e.pointerId); } catch { /* */ }
    if (popAberto) { fechaPop(); return; } // tocar fora fecha a janela, sem pintar
    if (tocando) { tocaAnim(); return; }
    if (e.pointerType === 'pen') { temCaneta = true; if (pendente || acaoTipo === 'touch') cancelaAcao(); }
    if (e.pointerType === 'touch') {
      if (!toques.size) { toqueMax = 0; toqueIni = performance.now(); toqueMoveu = false; gesto = null; }
      toques.set(e.pointerId, [e.clientX, e.clientY, e.clientX, e.clientY]); toqueMax = Math.max(toqueMax, toques.size);
      if (toques.size >= 2) { cancelaAcao(); clearTimeout(segura); gesto = null; return; } // segundo dedo: era gesto, não pintura
      segura = setTimeout(() => { if (toques.size === 1 && !toqueMoveu) { cancelaAcao(); if (pegaCor(e)) aviso('Cor pega', 900); } }, 500);
      // com a caneta, o dedo não pinta; sem caneta, só começa depois de um instante (dá tempo do segundo dedo chegar)
      if (temCaneta || !WZP.dedo) return;
      if (contaUma) { contaUma = false; modBtn.classList.remove('on'); pegaCor(e); return; }
      pendente = { e, evs: [], t: setTimeout(() => { if (pendente && toques.size === 1) soltaPendente(); }, 120) };
      return;
    }
    if (contaUma || (e.altKey && WZP.ferr !== 'selecao')) { contaUma = false; modBtn.classList.remove('on'); pegaCor(e); return; }
    if (espaco || e.button === 1) { arrasto = { x: e.clientX, y: e.clientY, V }; return; }
    comecaAcao(e, WZP.ferr);
  });
  cv.addEventListener('pointermove', (e) => {
    if (!D) return; cursor = doc(e);
    if (e.pointerType === 'touch') {
      const t = toques.get(e.pointerId); if (!t) return;
      if (Math.hypot(e.clientX - t[2], e.clientY - t[3]) > 10) { toqueMoveu = true; clearTimeout(segura); } t[0] = e.clientX; t[1] = e.clientY;
      if (toques.size >= 2) { if (toques.size === 2) { const [a, b] = [...toques.values()], r = tela(), mx = (a[0] + b[0]) / 2 - r.left, my = (a[1] + b[1]) / 2 - r.top, d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        if (!gesto) gesto = { d, ang, mx, my, V, t: performance.now(), ult: 1 }; else { V = new DOMMatrix().translate(mx, my).rotate((ang - gesto.ang) * 180 / Math.PI).scale(d / gesto.d).translate(-gesto.mx, -gesto.my).multiply(gesto.V); gesto.ult = d / gesto.d; pinta(); } }
        return; }
      if (pendente) { pendente.evs.push(e); if (toqueMoveu && Math.hypot(e.clientX - t[2], e.clientY - t[3]) > 14) soltaPendente(); return; }
      if (acaoTipo !== 'touch' || !acao) return;
    }
    if (arrasto) { V = new DOMMatrix().translate(e.clientX - arrasto.x, e.clientY - arrasto.y).multiply(arrasto.V); pinta(); return; }
    if (acao) acao.mais(e); else pinta();
  });
  const solta = (e, cancelou) => {
    if (e.pointerType === 'touch') {
      const t = toques.get(e.pointerId); if (!t) { if (acao && acaoTipo === 'touch') { cancelaAcao(); } return; } toques.delete(e.pointerId); clearTimeout(segura);
      if (toques.size) { if (toques.size < 2) gesto = null; return; }
      const curto = performance.now() - toqueIni < 300 && !toqueMoveu, dy = t[1] - t[3];
      if (toqueMax >= 2) {
        cancelaAcao();
        if (gesto && gesto.ult < .7 && performance.now() - gesto.t < 400) { enquadra(); pinta(); aviso('Encaixado', 900); }
        else if (curto && toqueMax === 2) desfaz(); else if (curto && toqueMax === 3) refaz(); else if (curto && toqueMax >= 4) ov.classList.toggle('limpa');
        else if (toqueMax === 3 && dy > 60) { WZP.acaoAba = 'adicionar'; reabre('acoes'); }
        gesto = null; return;
      }
      if (pendente) { if (cancelou) { cancelaAcao(); return; } soltaPendente(); }
      if (acaoTipo !== 'touch') return;
    }
    arrasto = null; if (acao) { const a = acao; acao = null; if (cancelou) { if (a.cancela) a.cancela(); traco = null; laco = null; pinta(); return; } a.fim(); if (a === traco) traco = null; if (a === laco) laco = null; pinta(); }
  };
  cv.addEventListener('pointerup', (e) => solta(e, false)); cv.addEventListener('pointercancel', (e) => solta(e, true));
  cv.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') { cursor = null; pinta(); } });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); const r = tela(), px = e.clientX - r.left, py = e.clientY - r.top; if (e.ctrlKey && e.shiftKey) { V = emVolta(new DOMMatrix().rotate(e.deltaY > 0 ? 5 : -5), px, py).multiply(V); pinta(); return; } const k = e.deltaY < 0 ? 1.15 : 1 / 1.15, z = escala(); if (z * k < .05 || z * k > 60) return; V = emVolta(new DOMMatrix().scale(k), px, py).multiply(V); pinta(); }, { passive: false });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  // ColorDrop: arrastar a bolinha de cor até a imagem enche a área
  corBtn.addEventListener('pointerdown', (e) => { gotaDrag = { x: e.clientX, y: e.clientY, longe: false }; try { corBtn.setPointerCapture(e.pointerId); } catch { /* */ } });
  corBtn.addEventListener('pointermove', (e) => { if (!gotaDrag) return; if (Math.hypot(e.clientX - gotaDrag.x, e.clientY - gotaDrag.y) > 24) { gotaDrag.longe = true; let gota = ov.querySelector('.pc-gota'); if (!gota) { gota = el('div', { class: 'pc-gota' }); ov.append(gota); } gota.style.background = WZP.cor; gota.style.left = e.clientX + 'px'; gota.style.top = e.clientY + 'px'; } });
  corBtn.addEventListener('pointerup', (e) => { const g2 = gotaDrag; gotaDrag = null; const gota = ov.querySelector('.pc-gota'); if (gota) gota.remove(); if (!g2) return;
    if (!g2.longe) { corAntes = WZP.cor; pop('cor'); return; } const r = tela(); if (D && e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) { enche(...doc(e)); aviso('Área cheia com a cor', 1200); } });
  const tecla = (e) => {
    if (!vivo()) { removeEventListener('keydown', tecla, true); removeEventListener('keyup', tecla2, true); return; }
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '') || document.querySelector('#wz [style*="z-index:10001"]')) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); if (e.shiftKey) refaz(); else desfaz(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'a') { e.preventDefault(); selTudo(); return; } if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); selLimpa(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'c') { copia(false); return; } if ((e.ctrlKey || e.metaKey) && k === 'x') { copia(true); return; } if ((e.ctrlKey || e.metaKey) && k === 'v') { cola(); return; }
    if (k === 'enter' && flut) { aplicaFlutuante(); tocaFerr('pincel'); return; } if (k === 'enter' && ajuste) { ajuste.aplica(); return; }
    if (k === 'escape') { if (popAberto) fechaPop(); else if (flut) { cancelaFlutuante(); tocaFerr('pincel'); } else if (ajuste) ajuste.cancela(); else if (D && D.sel) selLimpa(); return; }
    if (k === ' ') { espaco = true; e.preventDefault(); return; } if (e.ctrlKey || e.metaKey || e.altKey) return;
    const mapa = { b: 'pincel', s: 'borrar', e: 'borracha', l: 'selecao', v: 'transformar' }; if (mapa[k]) { if (WZP.ferr !== mapa[k]) tocaFerr(mapa[k]); return; }
    if (k === 'i') { contaUma = true; modBtn.classList.add('on'); return; }
    if (k === '[' || k === ']') { WZP.tam = k === '[' ? Math.max(1, Math.round(WZP.tam / 1.2)) : Math.min(300, Math.round(WZP.tam * 1.2 + 1)); fTam.pos(); wzpGuarda(); pinta(); }
  };
  const tecla2 = (e) => { if (e.key === ' ') espaco = false; };
  addEventListener('keydown', tecla, true); addEventListener('keyup', tecla2, true);
  ov.addEventListener('wzp-salvou', () => { if (vivo()) { atualizaSalvar(); desenhaAnim(); } });
  // começa
  if (!['pincel', 'borrar', 'borracha', 'selecao', 'transformar'].includes(WZP.ferr)) WZP.ferr = 'pincel';
  marcaFerr(); mostraBaixo();
  let largAntes = 0; new ResizeObserver(() => { const w = tela().width; if (D && (!enq || (largAntes && Math.abs(w - largAntes) > largAntes * .2))) enquadra(); largAntes = w; pinta(); }).observe(cv);
  (async () => { try { if (!WZP_IMPORTOU) { WZP_IMPORTOU = true; await wzpCarregaImportados(); } await abreAtual(); if (WZP.ferr === 'transformar') abreFlutuante(); } catch (e) { aviso('Não deu para abrir a imagem: ' + (e && e.message), 6000); } })();
  // para os testes
  window.__wzpTela = { get V() { return V; }, set V(m) { V = m; pinta(); }, enquadra, tocaFerr, pop, abreAjuste, selTudo, selInverte, selLimpa, aplicaFlutuante, cancelaFlutuante, copiaParaQuadros, trocaQuadro, enche,
    get flut() { return flut; }, get ajuste() { return ajuste; }, get aberto() { return popAberto; }, doc: () => D, get acao() { return acao; } };
}
