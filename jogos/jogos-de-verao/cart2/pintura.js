// ---------- PINTURA (aba do editor, 01/11/2026): pintar com a caneta em cima dos quadros dos personagens e das imagens do cenário.
// Pincel com pressão, borracha, conta-gotas, balde, mão, camadas, desfazer; pincéis próprios e importados do Procreate
// (.brush, .brushset) e do Photoshop (.abr). "Salvar no jogo" troca a imagem do jogo pela pintada (vale no "Aplicar").
const WZP = { modo: 'personagem', set: 'ia', an: null, k: 0, meio: false, ferr: 'pincel', cor: '#1b1f4f', recentes: [], pincel: 'redondo', tam: 12, opac: 1, fluxo: 1, suav: .5, pTam: true, pTop: false, cebola: true, so: 'grandes', doc: null };
const WZP_CHAVE = 'wz.pintura';
try { Object.assign(WZP, JSON.parse(localStorage.getItem(WZP_CHAVE) || '{}'), { doc: null }); } catch { /* sem armazenamento */ }
const wzpGuarda = () => { try { const { doc, ...o } = WZP; void doc; localStorage.setItem(WZP_CHAVE, JSON.stringify(o)); } catch { /* */ } };

// ----- pontas e grãos dos pincéis (máscaras em tons de cinza: branco = tinta)
function wzpTela(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
function wzpRedondo(dureza) { const n = 128, c = wzpTela(n, n), g = c.getContext('2d'), r = n / 2, gr = g.createRadialGradient(r, r, 0, r, r, r); gr.addColorStop(0, '#fff'); gr.addColorStop(Math.min(.98, dureza), '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, n, n); return wzpMascara(c); }
function wzpRuido(n, grosso, seed) { const c = wzpTela(n, n), g = c.getContext('2d'), d = g.createImageData(n, n); let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n * n; i++) { const v = Math.pow(rnd(), grosso) * 255; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; } g.putImageData(d, 0, 0); return c; }
// transforma uma imagem em máscara: a tinta fica no canal de transparência (branco = tinta). Inverte se o fundo for claro.
function wzpMascara(src, max = 256, inverter = null) {
  const k = Math.min(1, max / Math.max(src.width, src.height)), c = wzpTela(src.width * k, src.height * k), g = c.getContext('2d');
  g.drawImage(src, 0, 0, c.width, c.height); const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  let temAlfa = false; for (let i = 3; i < p.length; i += 4) if (p[i] < 250) { temAlfa = true; break; }
  const lum = (i) => (p[i] * .299 + p[i + 1] * .587 + p[i + 2] * .114);
  if (inverter === null && !temAlfa) { let soma = 0, n = 0; for (let x = 0; x < c.width; x++) for (const y of [0, c.height - 1]) { soma += lum((y * c.width + x) * 4); n++; } inverter = soma / n > 128; }
  for (let i = 0; i < p.length; i += 4) { const a = temAlfa ? p[i + 3] * (inverter ? 1 - lum(i) / 255 : 1) : (inverter ? 255 - lum(i) : lum(i)); p[i] = p[i + 1] = p[i + 2] = 255; p[i + 3] = a; }
  g.putImageData(d, 0, 0); return c;
}
const WZP_PINCEIS = [
  { id: 'redondo', nome: 'Redondo', ponta: () => wzpRedondo(.92), espaco: .08 },
  { id: 'macio', nome: 'Aerógrafo', ponta: () => wzpRedondo(.05), espaco: .06, fluxo: .35 },
  { id: 'tinta', nome: 'Nanquim', ponta: () => wzpRedondo(.98), espaco: .04, pMin: .05 },
  { id: 'lapis', nome: 'Lápis', ponta: () => wzpRedondo(.8), espaco: .1, grao: () => wzpMascara(wzpRuido(128, 2.2, 7), 128, false), gEsc: .5 },
  { id: 'giz', nome: 'Giz', ponta: () => wzpMascara(wzpRuido(64, .6, 3), 64, false), espaco: .18, girar: 'aleatorio' },
];
const WZP_CACHE = {};
function wzpPincel(id) {
  const b = WZP_PINCEIS.find((x) => x.id === id) || WZP_PINCEIS[0];
  if (!WZP_CACHE[b.id]) WZP_CACHE[b.id] = { ponta: b.pontaC || b.ponta(), grao: b.graoC || (b.grao ? b.grao() : null), tintas: {} };
  return { ...b, ...WZP_CACHE[b.id] };
}
function wzpTinta(B, cor) { let t = B.tintas[cor]; if (t) return t; t = wzpTela(B.ponta.width, B.ponta.height); const g = t.getContext('2d'); g.drawImage(B.ponta, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = cor; g.fillRect(0, 0, t.width, t.height); B.tintas[cor] = t; return t; }

// ----- pincéis importados (guardados no navegador, IndexedDB)
const WZP_DB = { abre: () => new Promise((ok, no) => { const r = indexedDB.open('wz-pinceis', 1); r.onupgradeneeded = () => r.result.createObjectStore('p', { keyPath: 'id' }); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }),
  async todos() { try { const db = await this.abre(); return await new Promise((ok) => { const q = db.transaction('p').objectStore('p').getAll(); q.onsuccess = () => ok(q.result || []); q.onerror = () => ok([]); }); } catch { return []; } },
  async poe(o) { try { const db = await this.abre(); await new Promise((ok) => { const t = db.transaction('p', 'readwrite'); t.objectStore('p').put(o); t.oncomplete = ok; t.onerror = ok; }); } catch { /* */ } },
  async tira(id) { try { const db = await this.abre(); await new Promise((ok) => { const t = db.transaction('p', 'readwrite'); t.objectStore('p').delete(id); t.oncomplete = ok; t.onerror = ok; }); } catch { /* */ } } };
const wzpImg = (url) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('imagem')); im.src = url; });
async function wzpCarregaImportados() {
  for (const o of await WZP_DB.todos()) {
    if (WZP_PINCEIS.some((b) => b.id === o.id)) continue;
    try { const p = wzpMascara(await wzpImg(o.ponta), 256, false), gr = o.grao ? wzpMascara(await wzpImg(o.grao), 512, false) : null; WZP_PINCEIS.push({ id: o.id, nome: o.nome, pontaC: p, graoC: gr, espaco: o.espaco || .1, girar: o.girar, importado: o.origem }); } catch { /* imagem estragada */ }
  }
}
// zip (Procreate): lê o índice do arquivo e descompacta com o próprio navegador
async function wzpZip(buf) {
  const v = new DataView(buf), u8 = new Uint8Array(buf), saida = {};
  let e = -1; for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 70000); i--) if (v.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('não é um arquivo zip');
  let p = v.getUint32(e + 16, true); const n = v.getUint16(e + 10, true);
  for (let i = 0; i < n; i++) {
    const met = v.getUint16(p + 10, true), tam = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), el2 = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
    const nome = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + el2 + cl;
    if (nome.endsWith('/')) continue;
    const lnl = v.getUint16(off + 26, true), lel = v.getUint16(off + 28, true), ini = off + 30 + lnl + lel, dados = u8.subarray(ini, ini + tam);
    saida[nome] = async () => { if (met === 0) return dados; const ds = new DecompressionStream('deflate-raw'); return new Uint8Array(await new Response(new Blob([dados]).stream().pipeThrough(ds)).arrayBuffer()); };
  }
  return saida;
}
// Photoshop .abr (versão 6 em diante, pincéis de amostra): mesmo jeito de ler do GIMP
function wzpAbr(buf) {
  const v = new DataView(buf); let p = 0; const lista = [];
  const ver = v.getUint16(p); p += 2; if (ver < 6) throw new Error('arquivo .abr antigo (só os de versão 6 em diante)');
  const sub = v.getUint16(p); p += 2;
  while (p + 12 <= buf.byteLength) {
    const sig = String.fromCharCode(...new Uint8Array(buf, p, 4)), tag = String.fromCharCode(...new Uint8Array(buf, p + 4, 4)), tam = v.getUint32(p + 8); p += 12;
    if (sig !== '8BIM') break;
    const fim = p + tam;
    if (tag === 'samp') {
      while (p < fim - 4) {
        const bt = v.getUint32(p); p += 4; let bfim = p + bt; if (bt % 4) bfim += 4 - (bt % 4);
        try {
          let q = p + 37 + (sub === 2 ? 264 : 0);
          const top = v.getInt32(q), left = v.getInt32(q + 4), bottom = v.getInt32(q + 8), right = v.getInt32(q + 12), depth = v.getInt16(q + 16), comp = v.getUint8(q + 18); q += 19;
          const w = right - left, h = bottom - top, bpp = depth > 8 ? 2 : 1;
          if (w > 0 && h > 0 && w * h < 25e6) {
            const px = new Uint8Array(w * h);
            if (!comp) { for (let i = 0; i < w * h; i++) px[i] = v.getUint8(q + i * bpp); }
            else { const cont = []; for (let y = 0; y < h; y++) { cont.push(v.getUint16(q)); q += 2; }
              let o = 0; for (let y = 0; y < h; y++) { const rfim = q + cont[y]; let x = 0; while (q < rfim) { let n = v.getInt8(q++); if (n >= 0) { for (let j = 0; j <= n; j++) { if (x < w * bpp && (x % bpp === 0)) px[o + x / bpp] = v.getUint8(q); q++; x++; } } else if (n > -128) { const b = v.getUint8(q++); for (let j = 0; j < 1 - n; j++) { if (x < w * bpp && (x % bpp === 0)) px[o + x / bpp] = b; x++; } } } o += w; q = rfim; } }
            const c = wzpTela(w, h), g = c.getContext('2d'), d = g.createImageData(w, h); for (let i = 0; i < w * h; i++) { d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = px[i]; d.data[i * 4 + 3] = 255; } g.putImageData(d, 0, 0);
            lista.push(c);
          }
        } catch { /* um pincel estragado não para os outros */ }
        p = bfim;
      }
    }
    p = fim; if (p % 2) p++;
  }
  return lista;
}
async function wzpImporta(arq) {
  const nome = arq.name.replace(/\.[^.]+$/, ''), ext = (arq.name.split('.').pop() || '').toLowerCase(), novos = [];
  const guarda = async (n, ponta, grao, espaco, origem) => { const id = 'imp-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); const p = wzpMascara(ponta, 256), gr = grao ? wzpMascara(grao, 512, false) : null;
    await WZP_DB.poe({ id, nome: n, ponta: p.toDataURL('image/png'), grao: gr ? gr.toDataURL('image/png') : null, espaco, origem }); WZP_PINCEIS.push({ id, nome: n, pontaC: p, graoC: gr, espaco, importado: origem }); novos.push(id); };
  const buf = await arq.arrayBuffer();
  if (ext === 'abr') { const L = wzpAbr(buf); for (let i = 0; i < L.length; i++) await guarda(L.length > 1 ? `${nome} ${i + 1}` : nome, L[i], null, .12, 'Photoshop'); }
  else if (ext === 'brush' || ext === 'brushset' || ext === 'zip') {
    const z = await wzpZip(buf), pastas = {};
    for (const k of Object.keys(z)) { const m = /(?:^|\/)(shape|grain)\.png$/i.exec(k); if (!m) continue; const pasta = k.slice(0, k.length - m[0].length + (m[0].startsWith('/') ? 1 : 0)); (pastas[pasta] = pastas[pasta] || {})[m[1].toLowerCase()] = z[k]; }
    const ks = Object.keys(pastas).filter((k) => pastas[k].shape);
    for (let i = 0; i < ks.length; i++) {
      const P = pastas[ks[i]], img = async (f) => { const b = await f(); const u = URL.createObjectURL(new Blob([b], { type: 'image/png' })); try { return await wzpImg(u); } finally { URL.revokeObjectURL(u); } };
      await guarda(ks.length > 1 ? `${nome} ${i + 1}` : nome, await img(P.shape), P.grain ? await img(P.grain) : null, .1, 'Procreate');
    }
  } else if (/^(png|jpe?g|webp)$/.test(ext)) { await guarda(nome, await wzpImg(URL.createObjectURL(arq)), null, .1, 'imagem'); }
  else throw new Error('use .brush, .brushset, .abr ou uma imagem');
  if (!novos.length) throw new Error('não achei pincéis nesse arquivo');
  return novos;
}

// ----- onde a imagem nova fica guardada: no site, na pasta do jogo; aqui (página do Claude), só até recarregar
async function wzpEnvia(nome, blob) {
  try { const im = window.claude && window.claude.use ? await window.claude.use('imagens') : null; if (im && im.envia) return { url: await im.envia(nome, blob), fica: true }; } catch (e) { throw new Error('não deu para enviar (' + (e && (e.message || e.code)) + ')'); }
  return { url: URL.createObjectURL(blob), fica: false };
}

// ----- documento: a parte da imagem que está sendo pintada, em camadas
function wzpFonte() {
  const R = window.__WZIMG;
  if (WZP.modo === 'personagem') {
    const S = WZ_SETS.find((s) => s.id === WZP.set) || WZ_SETS[0], A0 = S.atl(); if (!A0) return null;
    const an = A0.a[WZP.an] ? WZP.an : Object.keys(A0.a)[0], A = A0.a[an]; WZP.an = an; WZP.k = Math.min(WZP.k || 0, A.f.length - 1);
    const meio = WZP.meio && A.m && A.m[WZP.k] && A.msrc, f = meio ? A.m[WZP.k] : A.f[WZP.k], src = meio ? A.msrc : A.src;
    const k = R ? R.norm(src) : null; if (!k) return null;
    const ant = A.f[(WZP.k - 1 + A.f.length) % A.f.length];
    return { k, x: Math.round(f.x), y: 0, w: Math.ceil(f.w), h: Math.ceil(f.h), nome: `${S.nome} · ${an} · quadro ${WZP.k + 1}${meio ? ' (do meio)' : ''}`, cebola: { k: R.norm(A.src), x: Math.round(ant.x), w: Math.ceil(ant.w), h: Math.ceil(ant.h), dx: (f.ax || 0) - (ant.ax || 0) } };
  }
  if (!WZP.img) return null;
  return { k: WZP.img, x: 0, y: 0, w: 0, h: 0, nome: 'Imagem ' + WZP.img.replace('img/', '') };
}
async function wzpAbreDoc() {
  const F = wzpFonte(); if (!F) return null; const R = window.__WZIMG;
  const im = await R.carrega(F.k); if (!F.w) { F.w = im.naturalWidth; F.h = im.naturalHeight; }
  const base = wzpTela(F.w, F.h); base.getContext('2d').drawImage(im, F.x, F.y, F.w, F.h, 0, 0, F.w, F.h);
  let ceb = null; if (F.cebola) { try { const ic = await R.carrega(F.cebola.k); ceb = wzpTela(F.cebola.w, F.cebola.h); ceb.getContext('2d').drawImage(ic, F.cebola.x, 0, F.cebola.w, F.cebola.h, 0, 0, F.cebola.w, F.cebola.h); } catch { /* */ } }
  return { F, w: F.w, h: F.h, camadas: [{ nome: 'Desenho', c: base, vis: true, op: 1 }], at: 0, desfaz: [], refaz: [], ceb, mudou: false };
}
function wzpJunta(D, semCamada = -1) { const c = wzpTela(D.w, D.h), g = c.getContext('2d'); D.camadas.forEach((L, i) => { if (!L.vis || i === semCamada) return; g.globalAlpha = L.op; g.drawImage(L.c, 0, 0); }); g.globalAlpha = 1; return c; }
async function wzpSalvar(D) {
  const R = window.__WZIMG, F = D.F, im = await R.carrega(F.k), folha = wzpTela(im.naturalWidth, im.naturalHeight), g = folha.getContext('2d');
  g.drawImage(im, 0, 0); g.clearRect(F.x, F.y, F.w, F.h); g.drawImage(wzpJunta(D), F.x, F.y);
  const blob = await new Promise((ok) => folha.toBlob(ok, 'image/webp', .95)); if (!blob) throw new Error('não deu para gerar a imagem');
  const { url, fica } = await wzpEnvia(`verao/${F.k.replace(/^img\//, '').replace(/\.\w+$/, '')}-${Date.now().toString(36)}.webp`, blob);
  WZE.cfg.imgs = { ...(WZE.cfg.imgs || {}), [F.k]: url }; WZ.apply(WZE.cfg); wzMudou(); D.mudou = false;
  return fica;
}

// ----- a aba
function wzPintura(m) {
  m.append(el('h2', {}, 'Pintura'), el('p', { class: 'ajuda' }, 'Pinte por cima dos quadros dos personagens e das imagens do cenário, com a caneta (a pressão muda o tamanho do traço). Atalhos: B pincel, E borracha, I conta-gotas, G balde, H ou Espaço mão, [ e ] tamanho, Ctrl+Z desfazer, Ctrl+Shift+Z refazer. Alt + clique pega a cor. Dois dedos na tela movem e aproximam. "Salvar no jogo" troca a imagem no rascunho; depois é "Aplicar no jogo".'));
  if (!window.__WZIMG) { m.append(el('p', { class: 'aviso' }, 'Esta página do jogo é antiga. Recarregue a página.')); return; }
  const fonteBar = el('div', {}), area = el('div', { class: 'pin' });
  m.append(el('div', { class: 'chips' }, ...[['personagem', 'Personagens'], ['imagens', 'Cenários e outras imagens']].map(([k, t]) => el('button', { type: 'button', class: WZP.modo === k ? 'on' : '', on: { click: async () => { if (!(await wzpPodeSair())) return; WZP.modo = k; WZP.doc = null; wzpGuarda(); wzRender(); } } }, t))), fonteBar, area);
  // escolher o que pintar
  if (WZP.modo === 'personagem') {
    const S = WZ_SETS.find((s) => s.id === WZP.set) || WZ_SETS[0], A0 = S.atl();
    fonteBar.append(el('div', { class: 'chips' }, ...WZ_SETS.map((s) => el('button', { type: 'button', class: s.id === S.id ? 'on' : '', on: { click: async () => { if (!(await wzpPodeSair())) return; WZP.set = s.id; WZP.an = null; WZP.k = 0; WZP.doc = null; wzRender(); } } }, s.nome))));
    if (!A0) { fonteBar.append(el('p', { class: 'aviso' }, 'Os desenhos deste personagem ainda estão carregando.')); return; }
    const anims = Object.keys(A0.a).filter((a) => !/_\d$/.test(a)); if (!A0.a[WZP.an]) WZP.an = anims[0]; const A = A0.a[WZP.an];
    const sel = el('select', {}, ...anims.map((a) => el('option', { value: a, selected: a === WZP.an }, a))); sel.addEventListener('change', async () => { if (!(await wzpPodeSair())) { sel.value = WZP.an; return; } WZP.an = sel.value; WZP.k = 0; WZP.meio = false; WZP.doc = null; wzRender(); });
    const tira = el('div', { class: 'tira' }); A.f.forEach((_, k) => { tira.append(el('button', { type: 'button', class: k === WZP.k && !WZP.meio ? 'on' : '', on: { click: async () => { if (!(await wzpPodeSair())) return; WZP.k = k; WZP.meio = false; WZP.doc = null; wzRender(); } } }, String(k + 1)));
      if (A.m && A.m[k] && A.msrc) tira.append(el('button', { type: 'button', title: 'quadro do meio (entre este e o próximo)', class: k === WZP.k && WZP.meio ? 'on' : '', on: { click: async () => { if (!(await wzpPodeSair())) return; WZP.k = k; WZP.meio = true; WZP.doc = null; wzRender(); } } }, '½')); });
    fonteBar.append(el('div', { class: 'chips' }, 'Movimento: ', sel), tira);
  } else {
    const R = window.__WZIMG, sets = new Set(); for (const S of WZ_SETS) { const A0 = S.atl(); if (A0) for (const a of Object.values(A0.a)) for (const s of [a.src, a.mask, a.msrc, a.mmask]) { const k = s && R.norm(s); if (k) sets.add(k); } }
    const filtro = el('div', { class: 'chips' }, 'Mostrar: ', ...[['grandes', 'só as grandes (cenários)'], ['todas', 'todas']].map(([k, t]) => el('button', { type: 'button', class: WZP.so === k ? 'on' : '', on: { click: () => { WZP.so = k; wzpGuarda(); wzRender(); } } }, t)));
    const gal = el('div', { class: 'gal' }); fonteBar.append(filtro, gal);
    const lista = R.lista().filter((k) => !sets.has(k));
    for (const k of lista) {
      const im = el('img', { loading: 'lazy', alt: '' }); im.src = k; const b = el('button', { type: 'button', class: 'mini' + (WZP.img === k ? ' on' : ''), title: k, on: { click: async () => { if (!(await wzpPodeSair())) return; WZP.img = k; WZP.doc = null; wzpGuarda(); wzRender(); } } }, im, el('span', {}, (WZE.cfg.imgs || {})[k] ? 'pintada' : ''));
      im.addEventListener('load', () => { if (WZP.so === 'grandes' && im.naturalWidth * im.naturalHeight < 500 * 300) b.remove(); });
      gal.append(b);
    }
    if (!WZP.img) { area.append(el('p', { class: 'ajuda' }, 'Escolha uma imagem acima.')); return; }
  }
  wzpOficina(area);
}
async function wzpPodeSair() { const D = WZP.doc; if (!D || !D.mudou) return true; return wzPergunta('A pintura deste quadro ainda não foi salva no jogo. Sair e perder o que foi pintado?'); }

function wzpOficina(area) {
  const ferrs = [['pincel', 'Pincel', 'B'], ['borracha', 'Borracha', 'E'], ['conta', 'Conta-gotas', 'I'], ['balde', 'Balde', 'G'], ['mao', 'Mão', 'H']];
  const cv = el('canvas', { class: 'pc pin-cv' }), info = el('div', { class: 'ajuda' }, 'Abrindo…');
  const barra = el('div', { class: 'pin-ferr' }, ...ferrs.map(([k, t, a]) => el('button', { type: 'button', 'data-f': k, title: `${t} (${a})`, class: WZP.ferr === k ? 'on' : '', on: { click: () => escolhe(k) } }, t)),
    el('button', { type: 'button', title: 'Desfazer (Ctrl+Z)', on: { click: () => desfaz() } }, 'Desfazer'), el('button', { type: 'button', title: 'Refazer (Ctrl+Shift+Z)', on: { click: () => refaz() } }, 'Refazer'),
    el('button', { type: 'button', on: { click: () => { enquadra(); pinta(); } } }, 'Ver inteiro'));
  const lado = el('div', { class: 'lado pin-lado' });
  const salvar = el('button', { type: 'button', class: 'pri', on: { click: async () => { const D = WZP.doc; if (!D) return; salvar.disabled = true; info.textContent = 'Salvando…'; try { const fica = await wzpSalvar(D); info.textContent = fica ? 'Salvo no rascunho. Use "Aplicar no jogo" para valer para todo mundo.' : 'Salvo só nesta página até recarregar: para guardar de vez, use o editor no site do WinnerZ.'; wzStatus(info.textContent); } catch (e) { info.textContent = 'Não deu para salvar: ' + (e && e.message); } finally { salvar.disabled = false; } } } }, 'Salvar no jogo');
  const voltar = el('button', { type: 'button', class: 'dang', on: { click: async () => { const D = WZP.doc; if (!D) return; if (!(await wzPergunta('Voltar esta imagem para a original do jogo (tira a pintura salva dela)?'))) return; const c = { ...(WZE.cfg.imgs || {}) }; delete c[D.F.k]; WZE.cfg.imgs = c; WZ.apply(WZE.cfg); wzMudou(); WZP.doc = null; wzRender(); } } }, 'Voltar à original');
  area.append(el('div', { class: 'pin-topo' }, barra, el('div', { class: 'chips' }, salvar, voltar)), el('div', { class: 'pin-corpo' }, cv, lado), info);
  const g = cv.getContext('2d'); let z = 1, ox = 0, oy = 0, D = null, traco = null, temCaneta = false, espaco = false, fundo = null;
  const tela = () => cv.getBoundingClientRect();
  const enquadra = () => { const r = tela(); if (!D) return; z = Math.min((r.width - 20) / D.w, (r.height - 20) / D.h); ox = (r.width - D.w * z) / 2; oy = (r.height - D.h * z) / 2; };
  const doc = (e) => { const r = tela(); return [(e.clientX - r.left - ox) / z, (e.clientY - r.top - oy) / z]; };
  // xadrez do fundo transparente
  const xadrez = () => { if (fundo) return fundo; const c = wzpTela(16, 16), q = c.getContext('2d'); q.fillStyle = '#f2efe8'; q.fillRect(0, 0, 16, 16); q.fillStyle = '#ddd7ca'; q.fillRect(0, 0, 8, 8); q.fillRect(8, 8, 8, 8); fundo = g.createPattern(c, 'repeat'); return fundo; };
  let pedido = 0;
  function pinta() {
    if (pedido) return; pedido = requestAnimationFrame(() => {
      pedido = 0; const r = tela(), dpr = window.devicePixelRatio || 1; if (!r.width) return;
      if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); fundo = null; }
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#cfc6b4'; g.fillRect(0, 0, r.width, r.height); if (!D) return;
      g.setTransform(dpr * z, 0, 0, dpr * z, dpr * ox, dpr * oy); g.fillStyle = xadrez(); g.save(); g.scale(1 / z, 1 / z); g.fillRect(0, 0, D.w * z, D.h * z); g.restore();
      g.imageSmoothingEnabled = z < 3;
      if (WZP.cebola && D.ceb) { g.globalAlpha = .25; g.drawImage(D.ceb, -(D.F.cebola.dx || 0), 0); g.globalAlpha = 1; }
      D.camadas.forEach((L, i) => { if (!L.vis) return; g.globalAlpha = L.op; g.drawImage(i === D.at && traco ? traco.previa() : L.c, 0, 0); });
      g.globalAlpha = 1; g.strokeStyle = 'rgba(27,31,79,.5)'; g.lineWidth = 1 / z; g.strokeRect(0, 0, D.w, D.h);
      // tamanho do pincel em volta do cursor
      if (cursor && (WZP.ferr === 'pincel' || WZP.ferr === 'borracha')) { g.beginPath(); g.arc(cursor[0], cursor[1], WZP.tam / 2, 0, Math.PI * 2); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2 / z; g.stroke(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1 / z; g.stroke(); }
    });
  }
  let cursor = null;
  // ----- o traço: carimbos da ponta ao longo do caminho, numa tela à parte; no fim entra na camada
  function novoTraco(e, borracha) {
    const L = D.camadas[D.at], B = wzpPincel(WZP.pincel), buf = wzpTela(D.w, D.h), bg = buf.getContext('2d'), ponta = wzpTinta(B, borracha ? '#000000' : WZP.cor);
    let ult = null, sobra = 0, suave = null;
    const pr = (ev) => (ev.pointerType === 'mouse' || !ev.pressure ? 1 : ev.pressure);
    const carimbo = (x, y, p, ang) => {
      const t = Math.max(.5, WZP.tam * (WZP.pTam ? (B.pMin ?? .15) + (1 - (B.pMin ?? .15)) * p : 1)), a = Math.min(1, WZP.fluxo * (B.fluxo ?? 1) * (WZP.pTop ? p : 1));
      bg.globalAlpha = a; const asp = ponta.height / ponta.width, w = t, h = t * asp;
      if (B.girar) { bg.save(); bg.translate(x, y); bg.rotate(B.girar === 'aleatorio' ? Math.random() * 6.283 : ang); bg.drawImage(ponta, -w / 2, -h / 2, w, h); bg.restore(); } else bg.drawImage(ponta, x - w / 2, y - h / 2, w, h);
    };
    const ponto = (ev) => {
      const [x, y] = doc(ev), p = pr(ev);
      // suavização (estabilizador): o traço segue o cursor com um pouco de atraso
      const k = 1 - Math.min(.92, WZP.suav * .95); suave = suave ? [suave[0] + (x - suave[0]) * k, suave[1] + (y - suave[1]) * k, suave[2] + (p - suave[2]) * k] : [x, y, p];
      const [sx, sy, sp] = suave;
      if (!ult) { carimbo(sx, sy, sp, 0); ult = [sx, sy, sp]; return; }
      const dx = sx - ult[0], dy = sy - ult[1], d = Math.hypot(dx, dy), passo = Math.max(.4, WZP.tam * (B.espaco ?? .1) * Math.max(.2, sp)), ang = Math.atan2(dy, dx);
      let t = passo - sobra; while (t <= d) { const f = t / d; carimbo(ult[0] + dx * f, ult[1] + dy * f, ult[2] + (sp - ult[2]) * f, ang); t += passo; }
      sobra = d - (t - passo); ult = [sx, sy, sp];
    };
    const comGrao = () => { if (!B.grao) return buf; const c = wzpTela(D.w, D.h), q = c.getContext('2d'); q.drawImage(buf, 0, 0); const pat = q.createPattern(B.grao, 'repeat'); if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(B.gEsc || 1)); q.globalCompositeOperation = 'destination-in'; q.fillStyle = pat; q.fillRect(0, 0, D.w, D.h); return c; };
    const junta = (alvo) => { const q = alvo.getContext('2d'); q.save(); q.globalAlpha = WZP.opac; q.globalCompositeOperation = borracha ? 'destination-out' : 'source-over'; q.drawImage(comGrao(), 0, 0); q.restore(); };
    ponto(e);
    return {
      mais(ev) { const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev]; for (const x of (evs.length ? evs : [ev])) ponto(x); pinta(); },
      previa() { const c = wzpTela(D.w, D.h); c.getContext('2d').drawImage(L.c, 0, 0); junta(c); return c; },
      fim() { D.desfaz.push({ at: D.at, img: L.c.getContext('2d').getImageData(0, 0, D.w, D.h) }); if (D.desfaz.length > 40) D.desfaz.shift(); D.refaz = []; junta(L.c); D.mudou = true; },
    };
  }
  const guardaDesfazer = () => { const L = D.camadas[D.at]; D.desfaz.push({ at: D.at, img: L.c.getContext('2d').getImageData(0, 0, D.w, D.h) }); D.refaz = []; D.mudou = true; };
  function troca(de, para) { const s = de.pop(); if (!s || !D.camadas[s.at]) return; const L = D.camadas[s.at], q = L.c.getContext('2d'); para.push({ at: s.at, img: q.getImageData(0, 0, D.w, D.h) }); q.putImageData(s.img, 0, 0); D.mudou = true; pinta(); }
  const desfaz = () => D && troca(D.desfaz, D.refaz), refaz = () => D && troca(D.refaz, D.desfaz);
  function pegaCor(e) { const [x, y] = doc(e).map(Math.floor); if (x < 0 || y < 0 || x >= D.w || y >= D.h) return; const d = wzpJunta(D).getContext('2d').getImageData(x, y, 1, 1).data; if (d[3] < 10) return; WZP.cor = '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join(''); painelCor(); }
  function balde(e) {
    const [x0, y0] = doc(e).map(Math.floor); if (x0 < 0 || y0 < 0 || x0 >= D.w || y0 >= D.h) return; guardaDesfazer();
    const L = D.camadas[D.at], q = L.c.getContext('2d'), ref = wzpJunta(D).getContext('2d').getImageData(0, 0, D.w, D.h).data, img = q.getImageData(0, 0, D.w, D.h), px = img.data;
    const i0 = (y0 * D.w + x0) * 4, alvo = [ref[i0], ref[i0 + 1], ref[i0 + 2], ref[i0 + 3]], tol = 40, cor = [1, 3, 5].map((i) => parseInt(WZP.cor.slice(i, i + 2), 16));
    const igual = (i) => Math.abs(ref[i] - alvo[0]) + Math.abs(ref[i + 1] - alvo[1]) + Math.abs(ref[i + 2] - alvo[2]) + Math.abs(ref[i + 3] - alvo[3]) <= tol * 2;
    const visto = new Uint8Array(D.w * D.h), pilha = [x0 + y0 * D.w];
    while (pilha.length) { const n = pilha.pop(); if (visto[n]) continue; visto[n] = 1; const i = n * 4; if (!igual(i)) continue; px[i] = cor[0]; px[i + 1] = cor[1]; px[i + 2] = cor[2]; px[i + 3] = Math.round(255 * WZP.opac); const x = n % D.w;
      if (x > 0) pilha.push(n - 1); if (x < D.w - 1) pilha.push(n + 1); if (n >= D.w) pilha.push(n - D.w); if (n < D.w * (D.h - 1)) pilha.push(n + D.w); }
    q.putImageData(img, 0, 0); pinta();
  }
  // ----- caneta, mouse e dedos
  const toques = new Map(); let gesto = null, arrasto = null;
  cv.addEventListener('pointerdown', (e) => {
    if (!D) return; try { cv.setPointerCapture(e.pointerId); } catch { /* */ } if (e.pointerType === 'pen') temCaneta = true;
    if (e.pointerType === 'touch') { toques.set(e.pointerId, [e.clientX, e.clientY]); if (toques.size >= 2 || temCaneta) { if (traco) { traco = null; pinta(); } gesto = null; return; } }
    const f = espaco || e.button === 1 ? 'mao' : e.altKey ? 'conta' : WZP.ferr;
    if (f === 'mao') { arrasto = { x: e.clientX, y: e.clientY, ox, oy }; return; }
    if (f === 'conta') { pegaCor(e); return; }
    if (f === 'balde') { balde(e); return; }
    if (D.camadas[D.at] && !D.camadas[D.at].vis) { info.textContent = 'A camada escolhida está escondida.'; return; }
    traco = novoTraco(e, f === 'borracha'); pinta();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!D) return; cursor = doc(e);
    if (e.pointerType === 'touch' && toques.has(e.pointerId)) {
      toques.set(e.pointerId, [e.clientX, e.clientY]);
      if (toques.size >= 2) { const [a, b] = [...toques.values()], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (gesto) { const k = d / gesto.d, r = tela(), px = mx - r.left, py = my - r.top; z = Math.max(.1, Math.min(40, gesto.z0 * k)); ox = px - (gesto.px - gesto.ox) * z / gesto.z0; oy = py - (gesto.py - gesto.oy) * z / gesto.z0; }
        else { const r = tela(); gesto = { d, z0: z, ox, oy, px: mx - r.left, py: my - r.top }; }
        pinta(); return; }
      if (temCaneta) return;
    }
    if (arrasto) { ox = arrasto.ox + e.clientX - arrasto.x; oy = arrasto.oy + e.clientY - arrasto.y; pinta(); return; }
    if (traco) traco.mais(e); else pinta();
  });
  const solta = (e) => { if (e.pointerType === 'touch') { toques.delete(e.pointerId); if (toques.size < 2) gesto = null; } arrasto = null; if (traco) { traco.fim(); traco = null; pinta(); } };
  cv.addEventListener('pointerup', solta); cv.addEventListener('pointercancel', solta); cv.addEventListener('pointerleave', () => { cursor = null; pinta(); });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); const r = tela(), px = e.clientX - r.left, py = e.clientY - r.top, k = e.deltaY < 0 ? 1.15 : 1 / 1.15, nz = Math.max(.1, Math.min(40, z * k)); ox = px - (px - ox) * nz / z; oy = py - (py - oy) * nz / z; z = nz; pinta(); }, { passive: false });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  const tecla = (e) => {
    if (!document.body.contains(cv)) { removeEventListener('keydown', tecla, true); removeEventListener('keyup', tecla2, true); return; }
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); if (e.shiftKey) refaz(); else desfaz(); return; }
    if (k === ' ') { espaco = true; e.preventDefault(); return; }
    const mapa = { b: 'pincel', e: 'borracha', i: 'conta', g: 'balde', h: 'mao' }; if (mapa[k]) { escolhe(mapa[k]); return; }
    if (k === '[') { WZP.tam = Math.max(1, Math.round(WZP.tam / 1.2)); painelPincel(); pinta(); } if (k === ']') { WZP.tam = Math.min(400, Math.round(WZP.tam * 1.2 + 1)); painelPincel(); pinta(); }
  };
  const tecla2 = (e) => { if (e.key === ' ') espaco = false; };
  addEventListener('keydown', tecla, true); addEventListener('keyup', tecla2, true);
  function escolhe(k) { WZP.ferr = k; wzpGuarda(); barra.querySelectorAll('[data-f]').forEach((b) => b.classList.toggle('on', b.dataset.f === k)); cv.style.cursor = k === 'mao' ? 'grab' : 'crosshair'; }
  escolhe(WZP.ferr);
  // ----- painéis do lado: cor, pincel, camadas
  const pCor = el('div', {}), pPin = el('div', {}), pCam = el('div', {});
  lado.append(el('h3', {}, 'Cor'), pCor, el('h3', {}, 'Pincel'), pPin, el('h3', {}, 'Camadas'), pCam);
  function painelCor() {
    const cor = el('input', { type: 'color', value: WZP.cor }), hex = el('input', { type: 'text', value: WZP.cor, maxLength: 7, style: 'width:90px' });
    const usa = (c) => { WZP.cor = c; WZP.recentes = [c, ...WZP.recentes.filter((x) => x !== c)].slice(0, 12); wzpGuarda(); painelCor(); };
    cor.addEventListener('change', () => usa(cor.value)); hex.addEventListener('change', () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) usa(hex.value.toLowerCase()); });
    pCor.replaceChildren(el('div', { class: 'chips' }, cor, hex), el('div', { class: 'pin-rec' }, ...WZP.recentes.map((c) => el('button', { type: 'button', title: c, style: `background:${c}`, on: { click: () => usa(c) } }))));
  }
  function painelPincel() {
    const lista = el('div', { class: 'pin-pinceis' }, ...WZP_PINCEIS.map((b) => { const B = wzpPincel(b.id), mini = wzpTela(36, 36), q = mini.getContext('2d'); q.drawImage(wzpTinta(B, '#1b1f4f'), 4, 4, 28, 28 * B.ponta.height / B.ponta.width);
      return el('button', { type: 'button', class: WZP.pincel === b.id ? 'on' : '', title: b.importado ? `${b.nome} (importado do ${b.importado})` : b.nome, on: { click: () => { WZP.pincel = b.id; wzpGuarda(); painelPincel(); } } }, mini, el('span', {}, b.nome),
        b.importado ? el('i', { title: 'Tirar este pincel', on: { click: async (ev) => { ev.stopPropagation(); if (!(await wzPergunta(`Tirar o pincel "${b.nome}"?`))) return; await WZP_DB.tira(b.id); WZP_PINCEIS.splice(WZP_PINCEIS.indexOf(b), 1); if (WZP.pincel === b.id) WZP.pincel = 'redondo'; painelPincel(); } } }, '×') : null); }));
    const lin = (rot, k, min, max, step, fmt = (v) => v) => { const r = el('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(WZP[k]) }), v = el('span', { class: 'mono' }, String(fmt(WZP[k])));
      r.addEventListener('input', () => { WZP[k] = +r.value; v.textContent = String(fmt(WZP[k])); wzpGuarda(); pinta(); }); return el('div', { class: 'lin', style: 'grid-template-columns:110px 1fr 44px' }, rot, r, v); };
    const marca = (rot, k) => { const c = el('input', { type: 'checkbox', checked: !!WZP[k] }); c.addEventListener('change', () => { WZP[k] = c.checked; wzpGuarda(); }); return el('label', { class: 'pin-marca' }, c, rot); };
    const arq = el('input', { type: 'file', accept: '.brush,.brushset,.abr,.zip,.png,.jpg,.jpeg,.webp', multiple: true, style: 'display:none' });
    arq.addEventListener('change', async () => { for (const f of arq.files) { try { const ids = await wzpImporta(f); WZP.pincel = ids[0]; info.textContent = `${ids.length} ${ids.length === 1 ? 'pincel importado' : 'pincéis importados'} de ${f.name}.`; } catch (e) { info.textContent = `${f.name}: ${e && e.message}`; } } wzpGuarda(); painelPincel(); });
    pPin.replaceChildren(lista, el('button', { type: 'button', on: { click: () => arq.click() } }, 'Importar pincel (Procreate ou Photoshop)'), arq,
      lin('Tamanho', 'tam', 1, 300, 1), lin('Opacidade', 'opac', .05, 1, .05, (v) => Math.round(v * 100) + '%'), lin('Fluxo', 'fluxo', .05, 1, .05, (v) => Math.round(v * 100) + '%'), lin('Suavizar', 'suav', 0, 1, .05, (v) => Math.round(v * 100) + '%'),
      marca('Pressão muda o tamanho', 'pTam'), marca('Pressão muda a opacidade', 'pTop'));
  }
  function painelCamadas() {
    if (!D) { pCam.replaceChildren(); return; }
    const linhas = D.camadas.map((L, i) => { const vis = el('input', { type: 'checkbox', checked: L.vis, title: 'Mostrar' }); vis.addEventListener('change', () => { L.vis = vis.checked; pinta(); });
      const op = el('input', { type: 'range', min: '0', max: '1', step: '.05', value: String(L.op), title: 'Opacidade da camada' }); op.addEventListener('input', () => { L.op = +op.value; D.mudou = true; pinta(); });
      return el('div', { class: 'pin-cam' + (i === D.at ? ' on' : ''), on: { click: (ev) => { if (ev.target.tagName === 'INPUT') return; D.at = i; painelCamadas(); } } }, vis, el('span', {}, L.nome), op); }).reverse();
    pCam.replaceChildren(...linhas, el('div', { class: 'chips' },
      el('button', { type: 'button', on: { click: () => { D.camadas.splice(D.at + 1, 0, { nome: `Camada ${D.camadas.length + 1}`, c: wzpTela(D.w, D.h), vis: true, op: 1 }); D.at++; painelCamadas(); pinta(); } } }, '+ Camada'),
      el('button', { type: 'button', title: 'Junta esta camada com a de baixo', on: { click: () => { if (D.at < 1) return; const a = D.camadas[D.at - 1], b = D.camadas[D.at], q = a.c.getContext('2d'); D.desfaz = []; D.refaz = []; q.globalAlpha = b.op; q.drawImage(b.c, 0, 0); q.globalAlpha = 1; D.camadas.splice(D.at, 1); D.at--; D.mudou = true; painelCamadas(); pinta(); } } }, 'Juntar para baixo'),
      el('button', { type: 'button', on: { click: () => { if (D.camadas.length < 2) return; D.desfaz = D.desfaz.filter((s) => s.at !== D.at); D.refaz = []; D.camadas.splice(D.at, 1); D.at = Math.max(0, D.at - 1); D.mudou = true; painelCamadas(); pinta(); } } }, 'Apagar camada')),
      WZP.modo === 'personagem' ? (() => { const c = el('input', { type: 'checkbox', checked: !!WZP.cebola }); c.addEventListener('change', () => { WZP.cebola = c.checked; wzpGuarda(); pinta(); }); return el('label', { class: 'pin-marca' }, c, 'Ver o quadro anterior por baixo'); })() : null);
  }
  painelCor(); painelPincel(); painelCamadas();
  (async () => {
    try { if (!WZP.importados) { WZP.importados = true; await wzpCarregaImportados(); painelPincel(); }
      if (!WZP.doc || WZP.doc.chave !== JSON.stringify(wzpFonte())) { WZP.doc = await wzpAbreDoc(); if (WZP.doc) WZP.doc.chave = JSON.stringify(wzpFonte()); }
      D = WZP.doc; if (!D) { info.textContent = 'Não achei esta imagem.'; return; }
      info.textContent = `${D.F.nome} · ${D.w}×${D.h}${(WZE.cfg.imgs || {})[D.F.k] ? ' · já tem pintura salva' : ''}`; enquadra(); painelCamadas(); pinta();
    } catch (e) { info.textContent = 'Não deu para abrir a imagem: ' + (e && e.message); }
  })();
  new ResizeObserver(() => { if (D) pinta(); }).observe(cv);
}
