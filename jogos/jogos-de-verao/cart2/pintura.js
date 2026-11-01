// ---------- PINTURA (aba do editor, 01/11/2026): pincéis (prontos e importados do Procreate e do Photoshop) e onde guardar.
// A tela de pintura (ferramentas, camadas, seleção, transformar, ajustes) está em pintura2.js.
const WZP = { modo: 'personagem', set: 'ia', an: null, k: 0, meio: false, ferr: 'pincel', cor: '#1b1f4f', recentes: [], pincel: 'redondo', tam: 12, opac: 1, fluxo: 1, suav: .5, pTam: true, pTop: false, cebola: true, so: 'grandes', ajp: {}, paleta: [], tol: 30, forca: .6, selModo: 'laco', visor: false, doc: null };
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
  return { ...b, ...WZP_CACHE[b.id], ...((WZP.ajp || {})[b.id] || {}) };
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
    try { const p = wzpMascara(await wzpImg(o.ponta), 256, false), gr = o.grao ? wzpMascara(await wzpImg(o.grao), 512, false) : null; WZP_PINCEIS.push({ id: o.id, nome: o.nome, pontaC: p, graoC: gr, espaco: o.espaco || .1, girar: o.girar, importado: o.origem, colecao: o.colecao, ...(o.aj || {}) }); } catch { /* imagem estragada */ }
  }
}
// zip (Procreate): lê o índice do arquivo e descompacta com o próprio navegador
async function wzpZip(buf) {
  const v = new DataView(buf), u8 = new Uint8Array(buf), saida = {};
  let e = -1; for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 70000); i--) if (v.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('não é um arquivo zip');
  let p = v.getUint32(e + 16, true), n = v.getUint16(e + 10, true);
  // zip grande (zip64): o índice fica num registro à parte
  if ((p === 0xffffffff || n === 0xffff) && e >= 20 && v.getUint32(e - 20, true) === 0x07064b50) { const z = Number(v.getBigUint64(e - 12, true)); if (v.getUint32(z, true) === 0x06064b50) { n = Number(v.getBigUint64(z + 32, true)); p = Number(v.getBigUint64(z + 48, true)); } }
  for (let i = 0; i < n && p + 46 <= buf.byteLength; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const met = v.getUint16(p + 10, true), nl = v.getUint16(p + 28, true), el2 = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true);
    let tam = v.getUint32(p + 20, true), off = v.getUint32(p + 42, true);
    const nome = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl));
    // tamanhos do zip64 no campo extra
    if (tam === 0xffffffff || off === 0xffffffff) { let q = p + 46 + nl; const fimx = q + el2; while (q + 4 <= fimx) { const id = v.getUint16(q, true), sz = v.getUint16(q + 2, true); if (id === 1) { let r = q + 4; if (v.getUint32(p + 24, true) === 0xffffffff) r += 8; if (tam === 0xffffffff) { tam = Number(v.getBigUint64(r, true)); r += 8; } if (off === 0xffffffff) off = Number(v.getBigUint64(r, true)); } q += 4 + sz; } }
    p += 46 + nl + el2 + cl;
    if (nome.endsWith('/') || /(^|\/)(__MACOSX|\._)/.test(nome)) continue;
    const lnl = v.getUint16(off + 26, true), lel = v.getUint16(off + 28, true), ini = off + 30 + lnl + lel, dados = u8.subarray(ini, ini + tam);
    saida[nome] = async () => { if (met === 0) return dados; if (met !== 8) throw new Error('compressão desconhecida'); if (typeof DecompressionStream === 'undefined') throw new Error('este navegador não abre arquivos compactados (atualize o iPad/navegador)'); const ds = new DecompressionStream('deflate-raw'); return new Uint8Array(await new Response(new Blob([dados]).stream().pipeThrough(ds)).arrayBuffer()); };
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
// lista binária da Apple (bplist00), usada no Brush.archive do Procreate: devolve os valores simples por nome
function wzpBplist(u8) {
  const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), n = u8.length;
  if (String.fromCharCode(...u8.subarray(0, 8)) !== 'bplist00') throw new Error('não é bplist');
  const osz = u8[n - 26], rsz = u8[n - 25], num = Number(v.getBigUint64(n - 24)), top = Number(v.getBigUint64(n - 16)), tab = Number(v.getBigUint64(n - 8));
  const int = (p, sz) => { let x = 0; for (let i = 0; i < sz; i++) x = x * 256 + u8[p + i]; return x; };
  const offs = []; for (let i = 0; i < num; i++) offs.push(int(tab + i * osz, osz));
  const cache = new Map();
  const tam = (p, info) => { if (info !== 15) return [info, p + 1]; const m = u8[p + 1], sz = 1 << (m & 15); return [int(p + 2, sz), p + 2 + sz]; };
  const obj = (i, prof = 0) => {
    if (cache.has(i)) return cache.get(i); if (prof > 40) return null;
    const p = offs[i], m = u8[p], t = m >> 4, info = m & 15; let r = null;
    if (t === 0) r = info === 8 ? false : info === 9 ? true : null;
    else if (t === 1) { const sz = 1 << info; r = sz === 8 ? Number(v.getBigInt64(p + 1)) : int(p + 1, sz); }
    else if (t === 2) r = info === 2 ? v.getFloat32(p + 1) : v.getFloat64(p + 1);
    else if (t === 5) { const [l, q] = tam(p, info); r = String.fromCharCode(...u8.subarray(q, q + l)); }
    else if (t === 6) { const [l, q] = tam(p, info); let s2 = ''; for (let k = 0; k < l; k++) s2 += String.fromCharCode(v.getUint16(q + k * 2)); r = s2; }
    else if (t === 8) r = { uid: int(p + 1, info + 1) };
    else if (t === 10) { const [l, q] = tam(p, info); r = []; cache.set(i, r); for (let k = 0; k < l; k++) r.push(obj(int(q + k * rsz, rsz), prof + 1)); }
    else if (t === 13) { const [l, q] = tam(p, info); r = {}; cache.set(i, r); for (let k = 0; k < l; k++) r[obj(int(q + k * rsz, rsz), prof + 1)] = obj(int(q + (l + k) * rsz, rsz), prof + 1); }
    cache.set(i, r); return r;
  };
  const raiz = obj(top), O = raiz && raiz.$objects, out = {};
  const val = (x) => (x && typeof x === 'object' && 'uid' in x && O ? O[x.uid] : x);
  const leDict = (d) => { if (!d || typeof d !== 'object' || Array.isArray(d)) return; for (const [k, x] of Object.entries(d)) { const y = val(x); if (typeof y === 'number' || typeof y === 'boolean' || typeof y === 'string') { if (!(k in out)) out[k] = y; } } };
  if (O) { const t2 = raiz.$top && val(raiz.$top.root); leDict(t2); for (const o of O) leDict(o); } else leDict(raiz);
  return out;
}
// configurações do pincel do Procreate que dá para usar aqui (o resto fica com o padrão)
function wzpConfigProcreate(c) {
  const num = (k) => (typeof c[k] === 'number' && isFinite(c[k]) ? c[k] : null), cl = (x, a, b) => Math.max(a, Math.min(b, x)), aj = {};
  if (num('plotSpacing') !== null) aj.espaco = cl(num('plotSpacing'), .02, 1.5);
  if (num('plotJitter') !== null) aj.jitter = cl(num('plotJitter'), 0, 2);
  if (num('plotSmoothing') !== null) aj.suav = cl(num('plotSmoothing'), 0, 1);
  if (c.shapeRandomise === true) aj.girar = 'aleatorio'; else if (num('shapeRotation') !== null && num('shapeRotation') > .5) aj.girar = 'direcao';
  if (num('textureScale') !== null) aj.gEsc = cl(num('textureScale') * 2, .2, 3);
  if (num('minSize') !== null && num('maxSize')) aj.pMin = cl(num('minSize') / num('maxSize'), 0, 1);
  if (typeof c.name === 'string' && c.name.trim()) aj.nome = c.name.trim().slice(0, 40);
  return aj;
}
async function wzpImporta(arq) {
  const nome = arq.name.replace(/\.[^.]+$/, ''), ext = (arq.name.split('.').pop() || '').toLowerCase(), novos = [];
  const guarda = async (n, ponta, grao, espaco, origem, aj = {}) => { const id = 'imp-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); const p = wzpMascara(ponta, 256), gr = grao ? wzpMascara(grao, 512, false) : null; const nm = aj.nome || n; delete aj.nome;
    await WZP_DB.poe({ id, nome: nm, ponta: p.toDataURL('image/png'), grao: gr ? gr.toDataURL('image/png') : null, espaco: aj.espaco ?? espaco, origem, colecao: nome, aj }); WZP_PINCEIS.push({ id, nome: nm, pontaC: p, graoC: gr, espaco: aj.espaco ?? espaco, importado: origem, colecao: nome, ...aj }); novos.push(id); };
  const buf = await arq.arrayBuffer(), cab = new Uint8Array(buf.slice(0, 12));
  // o tipo vem do conteúdo (no iPad o nome do arquivo às vezes chega trocado)
  const ehZip = cab[0] === 0x50 && cab[1] === 0x4b, ehAbr = ext === 'abr' || String.fromCharCode(...cab.slice(4, 8)) === '8BIM', ehImg = /^(png|jpe?g|webp)$/.test(ext) || (cab[0] === 0x89 && cab[1] === 0x50) || (cab[0] === 0xff && cab[1] === 0xd8);
  if (ehZip) {
    const z = await wzpZip(buf), pastas = {}, base = (k) => k.split('/').pop().toLowerCase(), dir = (k) => k.slice(0, k.length - k.split('/').pop().length);
    for (const k of Object.keys(z)) {
      const b = base(k), d = dir(k); let tipo = null; if (/(^|\/)(reset|quicklook)\//i.test(k)) continue; // cópias de segurança e miniaturas do Procreate
      if (/^shape\.(png|jpe?g)$/.test(b)) tipo = 'shape'; else if (/^grain\.(png|jpe?g)$/.test(b)) tipo = 'grain'; else if (b === 'brush.archive') tipo = 'brush';
      if (tipo) (pastas[d] = pastas[d] || {})[tipo] = z[k];
    }
    const ks = Object.keys(pastas).filter((k) => pastas[k].shape || pastas[k].brush).sort();
    if (!ks.length) throw new Error(`não achei pincéis do Procreate dentro do arquivo (${Object.keys(z).length} arquivos)`);
    const img = async (f) => { const b = await f(); const u = URL.createObjectURL(new Blob([b], { type: 'image/png' })); try { return await wzpImg(u); } finally { URL.revokeObjectURL(u); } };
    let falhas = 0;
    for (let i = 0; i < ks.length; i++) {
      const P = pastas[ks[i]];
      try {
        let aj = {}; if (P.brush) { try { aj = wzpConfigProcreate(wzpBplist(await P.brush())); } catch { /* sem configurações legíveis */ } }
        // sem a forma em imagem (pincel que usa uma forma da biblioteca do Procreate): ponta redonda
        const ponta = P.shape ? await img(P.shape) : wzpRedondo(.85), grao = P.grain ? await img(P.grain) : null;
        await guarda(ks.length > 1 ? `${nome} ${i + 1}` : nome, ponta, grao, .1, 'Procreate', aj);
      } catch { falhas++; }
    }
    if (!novos.length) throw new Error('os pincéis deste arquivo não abriram' + (falhas ? ` (${falhas} com problema)` : ''));
  } else if (ehAbr) { const L = wzpAbr(buf); for (let i = 0; i < L.length; i++) await guarda(L.length > 1 ? `${nome} ${i + 1}` : nome, L[i], null, .12, 'Photoshop'); }
  else if (ehImg) { await guarda(nome, await wzpImg(URL.createObjectURL(arq)), null, .1, 'imagem'); }
  else throw new Error('use .brush, .brushset, .abr ou uma imagem');
  if (!novos.length) throw new Error('não achei pincéis nesse arquivo');
  return novos;
}

// ----- onde a imagem nova fica guardada: no site, na pasta do jogo; aqui (página do Claude), só até recarregar
async function wzpEnvia(nome, blob) {
  try { const im = window.claude && window.claude.use ? await window.claude.use('imagens') : null; if (im && im.envia) return { url: await im.envia(nome, blob), fica: true }; } catch (e) { throw new Error('não deu para enviar (' + (e && (e.message || e.code)) + ')'); }
  return { url: URL.createObjectURL(blob), fica: false };
}

