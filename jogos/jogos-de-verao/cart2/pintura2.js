// ---------- PINTURA, a tela (01/11/2026, 2ª etapa, no estilo do Procreate)
// Ferramentas: pincel, borrar (dedo), borracha, seleção (laço e retângulo), transformar (mover, tamanho, giro, espelhar),
// ajustes (matiz, saturação, brilho, desfoque), conta-gotas, balde, mão. Linha reta segurando a caneta no fim do traço.
// Camadas com modos de mistura, bloqueio de transparência e máscara de recorte. Tela que gira e espelha.
// Gestos: dois dedos tocando = desfazer, três = refazer, dedo parado = conta-gotas.
// Nos personagens dá para pintar também o visor (onde o rosto aparece).

const WZP_MODOS = [['source-over', 'Normal'], ['multiply', 'Multiplicar'], ['screen', 'Tela'], ['overlay', 'Sobrepor'], ['soft-light', 'Luz suave'], ['hard-light', 'Luz forte'],
  ['darken', 'Escurecer'], ['lighten', 'Clarear'], ['color-dodge', 'Subexposição de cor'], ['color-burn', 'Superexposição de cor'], ['lighter', 'Adicionar'], ['difference', 'Diferença'],
  ['hue', 'Matiz'], ['saturation', 'Saturação'], ['color', 'Cor'], ['luminosity', 'Luminosidade']];
const wzpHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const wzpRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function wzpHsv2rgb(h, s, v) { const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return [f(5) * 255, f(3) * 255, f(1) * 255]; }
function wzpRgb2hsv(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx]; }
const wzpCopia = (c) => { const n = wzpTela(c.width, c.height); n.getContext('2d').drawImage(c, 0, 0); return n; };

// ----- documento: a parte da imagem que está sendo pintada, em camadas
function wzpFonte() {
  const R = window.__WZIMG;
  if (WZP.modo === 'personagem') {
    const S = WZ_SETS.find((s) => s.id === WZP.set) || WZ_SETS[0], A0 = S.atl(); if (!A0) return null;
    const an = A0.a[WZP.an] ? WZP.an : Object.keys(A0.a)[0], A = A0.a[an]; WZP.an = an; WZP.k = Math.min(WZP.k || 0, A.f.length - 1);
    const meio = WZP.meio && A.m && A.m[WZP.k] && A.msrc, f = meio ? A.m[WZP.k] : A.f[WZP.k];
    const visor = !!WZP.visor && !!(meio ? A.mmask : A.mask);
    const src = visor ? (meio ? A.mmask : A.mask) : (meio ? A.msrc : A.src), desenho = meio ? A.msrc : A.src;
    const k = R ? R.norm(src) : null; if (!k) return null;
    const ant = A.f[(WZP.k - 1 + A.f.length) % A.f.length];
    return { k, x: Math.round(f.x), y: 0, w: Math.ceil(f.w), h: Math.ceil(f.h), tipo: visor ? 'visor' : 'desenho', ref: visor ? R.norm(desenho) : null,
      nome: `${S.nome} · ${an} · quadro ${WZP.k + 1}${meio ? ' (do meio)' : ''}${visor ? ' · visor' : ''}`,
      cebola: visor ? null : { k: R.norm(A.src), x: Math.round(ant.x), w: Math.ceil(ant.w), h: Math.ceil(ant.h), dx: (f.ax || 0) - (ant.ax || 0) } };
  }
  if (!WZP.img) return null;
  return { k: WZP.img, x: 0, y: 0, w: 0, h: 0, tipo: 'desenho', nome: 'Imagem ' + WZP.img.replace('img/', '') };
}
const wzpCamada = (nome, c) => ({ nome, c, vis: true, op: 1, modo: 'source-over', alfa: false, recorte: false });
async function wzpAbreDoc() {
  const F = wzpFonte(); if (!F) return null; const R = window.__WZIMG;
  const im = await R.carrega(F.k); if (!F.w) { F.w = im.naturalWidth; F.h = im.naturalHeight; }
  const base = wzpTela(F.w, F.h); base.getContext('2d').drawImage(im, F.x, F.y, F.w, F.h, 0, 0, F.w, F.h);
  let ceb = null, ref = null;
  if (F.cebola) { try { const ic = await R.carrega(F.cebola.k); ceb = wzpTela(F.cebola.w, F.cebola.h); ceb.getContext('2d').drawImage(ic, F.cebola.x, 0, F.cebola.w, F.cebola.h, 0, 0, F.cebola.w, F.cebola.h); } catch { /* */ } }
  if (F.ref) { const ir = await R.carrega(F.ref); ref = wzpTela(F.w, F.h); ref.getContext('2d').drawImage(ir, F.x, F.y, F.w, F.h, 0, 0, F.w, F.h); }
  return { F, w: F.w, h: F.h, tipo: F.tipo, camadas: [wzpCamada(F.tipo === 'visor' ? 'Visor' : 'Desenho', base)], at: 0, desfaz: [], refaz: [], ceb, ref, sel: null, mudou: false };
}
// junta as camadas (modos de mistura e recorte). troca = { i, c }: usa outra tela no lugar da camada i (prévia)
function wzpCompor(D, troca, alvo) {
  const out = alvo || wzpTela(D.w, D.h), g = out.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, D.w, D.h);
  const tela = (i) => (troca && troca.i === i ? troca.c : D.camadas[i].c);
  let base = -1;
  D.camadas.forEach((L, i) => {
    if (!L.recorte || base < 0) base = i;
    if (!L.vis) return;
    let src = tela(i);
    if (L.recorte && base !== i) { const t = wzpCopia(src), q = t.getContext('2d'); q.globalCompositeOperation = 'destination-in'; q.drawImage(tela(base), 0, 0); src = t; }
    g.globalAlpha = L.op; g.globalCompositeOperation = L.modo || 'source-over'; g.drawImage(src, 0, 0);
  });
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; return out;
}
function wzpJunta(D) { return wzpCompor(D); }
async function wzpSalvar(D) {
  const R = window.__WZIMG, F = D.F, im = await R.carrega(F.k), folha = wzpTela(im.naturalWidth, im.naturalHeight), g = folha.getContext('2d');
  g.drawImage(im, 0, 0); g.clearRect(F.x, F.y, F.w, F.h); g.drawImage(wzpJunta(D), F.x, F.y);
  const blob = await new Promise((ok) => folha.toBlob(ok, 'image/webp', .95)); if (!blob) throw new Error('não deu para gerar a imagem');
  const { url, fica } = await wzpEnvia(`verao/${F.k.replace(/^img\//, '').replace(/\.\w+$/, '')}-${Date.now().toString(36)}.webp`, blob);
  WZE.cfg.imgs = { ...(WZE.cfg.imgs || {}), [F.k]: url }; WZ.apply(WZE.cfg); wzMudou(); D.mudou = false;
  return fica;
}
// desfoque (caixa, 3 passadas) e ajuste de cor, feitos à mão para funcionar igual em todo navegador (inclusive o do iPad)
function wzpDesfoca(c, r) {
  r = Math.round(r); if (r < 1) return c; const w = c.width, h = c.height, g = c.getContext('2d'), img = g.getImageData(0, 0, w, h), a = img.data, b = new Float32Array(a.length);
  // pré-multiplica pela transparência para as bordas não escurecerem
  for (let i = 0; i < a.length; i += 4) { const al = a[i + 3] / 255; b[i] = a[i] * al; b[i + 1] = a[i + 1] * al; b[i + 2] = a[i + 2] * al; b[i + 3] = a[i + 3]; }
  const tmp = new Float32Array(a.length);
  const passo = (src, dst, hor) => { const n = hor ? w : h, m = hor ? h : w, st = hor ? 4 : w * 4, k = 1 / (2 * r + 1);
    for (let j = 0; j < m; j++) { const o = hor ? j * w * 4 : j * 4; for (let ch = 0; ch < 4; ch++) { let s = 0; for (let i = -r; i <= r; i++) s += src[o + Math.min(n - 1, Math.max(0, i)) * st + ch];
      for (let i = 0; i < n; i++) { dst[o + i * st + ch] = s * k; s += src[o + Math.min(n - 1, i + r + 1) * st + ch] - src[o + Math.max(0, i - r) * st + ch]; } } } };
  for (let it = 0; it < 3; it++) { passo(b, tmp, true); passo(tmp, b, false); }
  for (let i = 0; i < a.length; i += 4) { const al = b[i + 3]; a[i + 3] = al; const k = al > 0 ? 255 / al : 0; a[i] = b[i] * k; a[i + 1] = b[i + 1] * k; a[i + 2] = b[i + 2] * k; }
  const out = wzpTela(w, h); out.getContext('2d').putImageData(img, 0, 0); return out;
}
function wzpAjustaCor(c, dh, ds, dv) {
  if (!dh && !ds && !dv) return wzpCopia(c);
  const out = wzpCopia(c), g = out.getContext('2d'), img = g.getImageData(0, 0, c.width, c.height), a = img.data;
  for (let i = 0; i < a.length; i += 4) { if (!a[i + 3]) continue; let [h, s, v] = wzpRgb2hsv(a[i], a[i + 1], a[i + 2]); h = (h + dh + 360) % 360; s = Math.max(0, Math.min(1, ds >= 0 ? s + (1 - s) * ds : s * (1 + ds))); v = Math.max(0, Math.min(1, dv >= 0 ? v + (1 - v) * dv : v * (1 + dv))); const [r, gg, b] = wzpHsv2rgb(h, s, v); a[i] = r; a[i + 1] = gg; a[i + 2] = b; }
  g.putImageData(img, 0, 0); return out;
}

// ----- a aba
function wzPintura(m) {
  m.append(el('h2', {}, 'Pintura'), el('details', { class: 'pin-ajuda' }, el('summary', {}, 'Como usar'), el('p', { class: 'ajuda' }, 'Pinte por cima dos quadros dos personagens, do visor (onde o rosto aparece) e das imagens do cenário, com a caneta. Segure a caneta parada no fim de um traço para ele virar uma linha reta. Dois dedos tocando a tela desfazem, três refazem; um dedo parado pega a cor. Atalhos: B pincel, S borrar, E borracha, L seleção, V transformar, I conta-gotas, G balde, H ou Espaço mão, [ e ] tamanho, Ctrl+Z e Ctrl+Shift+Z. "Salvar no jogo" troca a imagem no rascunho; depois é "Aplicar no jogo". O botão "Tela cheia" deixa só a pintura na tela.')));
  if (!window.__WZIMG) { m.append(el('p', { class: 'aviso' }, 'Esta página do jogo é antiga. Recarregue a página.')); return; }
  const fonteBar = el('div', {}), area = el('div', { class: 'pin' });
  const vai = (fn) => async () => { if (!(await wzpPodeSair())) return; fn(); WZP.doc = null; wzpGuarda(); wzRender(); };
  m.append(el('div', { class: 'chips' }, ...[['personagem', 'Personagens'], ['imagens', 'Cenários e outras imagens']].map(([k, t]) => el('button', { type: 'button', class: WZP.modo === k ? 'on' : '', on: { click: vai(() => { WZP.modo = k; }) } }, t))), fonteBar, area);
  if (WZP.modo === 'personagem') {
    const S = WZ_SETS.find((s) => s.id === WZP.set) || WZ_SETS[0], A0 = S.atl();
    fonteBar.append(el('div', { class: 'chips' }, ...WZ_SETS.map((s) => el('button', { type: 'button', class: s.id === S.id ? 'on' : '', on: { click: vai(() => { WZP.set = s.id; WZP.an = null; WZP.k = 0; }) } }, s.nome))));
    if (!A0) { fonteBar.append(el('p', { class: 'aviso' }, 'Os desenhos deste personagem ainda estão carregando.')); return; }
    const anims = Object.keys(A0.a).filter((a) => !/_\d$/.test(a)); if (!A0.a[WZP.an]) WZP.an = anims[0]; const A = A0.a[WZP.an];
    const sel = el('select', {}, ...anims.map((a) => el('option', { value: a, selected: a === WZP.an }, a))); sel.addEventListener('change', async () => { if (!(await wzpPodeSair())) { sel.value = WZP.an; return; } WZP.an = sel.value; WZP.k = 0; WZP.meio = false; WZP.doc = null; wzRender(); });
    const tira = el('div', { class: 'tira' }); A.f.forEach((_, k) => { tira.append(el('button', { type: 'button', class: k === WZP.k && !WZP.meio ? 'on' : '', on: { click: vai(() => { WZP.k = k; WZP.meio = false; }) } }, String(k + 1)));
      if (A.m && A.m[k] && A.msrc) tira.append(el('button', { type: 'button', title: 'quadro do meio (entre este e o próximo)', class: k === WZP.k && WZP.meio ? 'on' : '', on: { click: vai(() => { WZP.k = k; WZP.meio = true; }) } }, '½')); });
    fonteBar.append(el('div', { class: 'chips' }, 'Movimento: ', sel, ' Pintar: ', ...[[false, 'o desenho'], [true, 'o visor (onde o rosto aparece)']].map(([v, t]) => el('button', { type: 'button', class: !!WZP.visor === v ? 'on' : '', on: { click: vai(() => { WZP.visor = v; }) } }, t))), tira);
  } else {
    const R = window.__WZIMG, sets = new Set(); for (const S of WZ_SETS) { const A0 = S.atl(); if (A0) for (const a of Object.values(A0.a)) for (const s of [a.src, a.mask, a.msrc, a.mmask]) { const k = s && R.norm(s); if (k) sets.add(k); } }
    const gal = el('div', { class: 'gal' });
    fonteBar.append(el('div', { class: 'chips' }, 'Mostrar: ', ...[['grandes', 'só as grandes (cenários)'], ['todas', 'todas']].map(([k, t]) => el('button', { type: 'button', class: WZP.so === k ? 'on' : '', on: { click: () => { WZP.so = k; wzpGuarda(); wzRender(); } } }, t))), gal);
    for (const k of R.lista().filter((x) => !sets.has(x))) {
      const im = el('img', { loading: 'lazy', alt: '' }); im.src = k; const b = el('button', { type: 'button', class: 'mini' + (WZP.img === k ? ' on' : ''), title: k, on: { click: vai(() => { WZP.img = k; }) } }, im, el('span', {}, (WZE.cfg.imgs || {})[k] ? 'pintada' : ''));
      im.addEventListener('load', () => { if (WZP.so === 'grandes' && im.naturalWidth * im.naturalHeight < 500 * 300) b.remove(); });
      gal.append(b);
    }
    if (!WZP.img) { area.append(el('p', { class: 'ajuda' }, 'Escolha uma imagem acima.')); return; }
  }
  wzpOficina(area);
}
async function wzpPodeSair() { const D = WZP.doc; if (!D || !D.mudou) return true; return wzPergunta('A pintura desta imagem ainda não foi salva no jogo. Sair e perder o que foi pintado?'); }

function wzpOficina(area) {
  const FERR = [['pincel', 'Pincel', 'B'], ['borrar', 'Borrar', 'S'], ['borracha', 'Borracha', 'E'], ['selecao', 'Seleção', 'L'], ['transformar', 'Transformar', 'V'], ['ajustes', 'Ajustes', ''], ['conta', 'Conta-gotas', 'I'], ['balde', 'Balde', 'G'], ['mao', 'Mão', 'H']];
  const cv = el('canvas', { class: 'pc pin-cv' }), info = el('div', { class: 'ajuda pin-info' }, 'Abrindo…'), ctxBar = el('div', { class: 'chips pin-ctx' });
  const barra = el('div', { class: 'pin-ferr' }, ...FERR.map(([k, t, a]) => el('button', { type: 'button', 'data-f': k, title: a ? `${t} (${a})` : t, class: WZP.ferr === k ? 'on' : '', on: { click: () => escolhe(k) } }, t)),
    el('span', { class: 'sep' }), el('button', { type: 'button', title: 'Desfazer (Ctrl+Z ou dois dedos)', on: { click: () => desfaz() } }, '↶'), el('button', { type: 'button', title: 'Refazer (Ctrl+Shift+Z ou três dedos)', on: { click: () => refaz() } }, '↷'),
    el('span', { class: 'sep' }), el('button', { type: 'button', title: 'Girar a tela', on: { click: () => gira(-15) } }, '⟲'), el('button', { type: 'button', title: 'Girar a tela', on: { click: () => gira(15) } }, '⟳'),
    el('button', { type: 'button', title: 'Espelhar a tela (só a vista; a imagem não muda)', on: { click: () => espelha() } }, 'Espelhar'), el('button', { type: 'button', on: { click: () => { enquadra(); pinta(); } } }, 'Ver inteiro'),
    el('button', { type: 'button', title: 'Só a pintura na tela (Esc ou o mesmo botão para voltar)', 'data-cheia': '1', on: { click: () => telaCheia() } }, 'Tela cheia'));
  const lado = el('div', { class: 'lado pin-lado' });
  const salvar = el('button', { type: 'button', class: 'pri', on: { click: async () => { if (!D) return; aplicaFlutuante(); salvar.disabled = true; info.textContent = 'Salvando…'; try { const fica = await wzpSalvar(D); info.textContent = fica ? 'Salvo no rascunho. Use "Aplicar no jogo" para valer para todo mundo.' : 'Salvo só nesta página até recarregar: para guardar de vez, use o editor no site do WinnerZ.'; wzStatus(info.textContent); } catch (e) { info.textContent = 'Não deu para salvar: ' + (e && e.message); } finally { salvar.disabled = false; } } } }, 'Salvar no jogo');
  const voltar = el('button', { type: 'button', class: 'dang', on: { click: async () => { if (!D) return; if (!(await wzPergunta('Voltar esta imagem para a original do jogo (tira a pintura salva dela)?'))) return; const c = { ...(WZE.cfg.imgs || {}) }; delete c[D.F.k]; WZE.cfg.imgs = c; WZ.apply(WZE.cfg); wzMudou(); WZP.doc = null; wzRender(); } } }, 'Voltar à original');
  area.append(el('div', { class: 'pin-topo' }, barra, el('div', { class: 'chips' }, salvar, voltar)), ctxBar, el('div', { class: 'pin-corpo' }, cv, lado), info);
  const g = cv.getContext('2d'); let V = new DOMMatrix(), D = null, traco = null, temCaneta = false, espaco = false, fundo = null, cursor = null, flut = null, ajuste = null, laco = null, comp = null;
  const tela = () => cv.getBoundingClientRect();
  function telaCheia(v) { const on = v ?? !area.classList.contains('cheia'); area.classList.toggle('cheia', on); WZP.cheia = on; wzpGuarda(); barra.querySelector('[data-cheia]').classList.toggle('on', on); requestAnimationFrame(() => { enquadra(); pinta(); }); }
  const escala = () => Math.hypot(V.a, V.b);
  const enquadra = () => { const r = tela(); if (!D || !r.width) return; const z = Math.min((r.width - 24) / D.w, (r.height - 24) / D.h); V = new DOMMatrix().translate((r.width - D.w * z) / 2, (r.height - D.h * z) / 2).scale(z); };
  const doc = (e) => { const r = tela(), p = V.inverse().transformPoint(new DOMPoint(e.clientX - r.left, e.clientY - r.top)); return [p.x, p.y]; };
  const naTela = (x, y) => { const p = V.transformPoint(new DOMPoint(x, y)); return [p.x, p.y]; };
  const emVolta = (M, px, py) => new DOMMatrix().translate(px, py).multiply(M).multiply(new DOMMatrix().translate(-px, -py));
  function gira(graus) { const r = tela(); V = emVolta(new DOMMatrix().rotate(graus), r.width / 2, r.height / 2).multiply(V); pinta(); }
  function espelha() { const r = tela(); V = emVolta(new DOMMatrix().scale(-1, 1), r.width / 2, r.height / 2).multiply(V); pinta(); }
  const xadrez = () => { if (fundo) return fundo; const c = wzpTela(16, 16), q = c.getContext('2d'); q.fillStyle = '#f2efe8'; q.fillRect(0, 0, 16, 16); q.fillStyle = '#ddd7ca'; q.fillRect(0, 0, 8, 8); q.fillRect(8, 8, 8, 8); fundo = g.createPattern(c, 'repeat'); return fundo; };
  // seleção: caminho (para desenhar) e máscara (para limitar o que muda)
  const selMascara = () => { if (!D.sel) return null; if (D.sel.m) return D.sel.m; const c = wzpTela(D.w, D.h), q = c.getContext('2d'); q.fillStyle = '#fff'; if (D.sel.inv) { q.fillRect(0, 0, D.w, D.h); q.globalCompositeOperation = 'destination-out'; } q.fill(D.sel.path, 'evenodd'); D.sel.m = c; return c; };
  const limita = (c) => { const m = selMascara(); if (!m) return c; const q = c.getContext('2d'); q.save(); q.globalCompositeOperation = 'destination-in'; q.drawImage(m, 0, 0); q.restore(); return c; };
  // mistura: dentro da seleção fica "novo", fora fica "velho"
  const mistura = (velho, novo) => { const m = selMascara(); if (!m) return novo; const fora = wzpCopia(velho), q = fora.getContext('2d'); q.globalCompositeOperation = 'destination-out'; q.drawImage(m, 0, 0); const dentro = limita(wzpCopia(novo)); q.globalCompositeOperation = 'source-over'; q.drawImage(dentro, 0, 0); return fora; };
  const guardaDesfazer = (i = D.at) => { D.desfaz.push({ at: i, img: D.camadas[i].c.getContext('2d').getImageData(0, 0, D.w, D.h) }); if (D.desfaz.length > 40) D.desfaz.shift(); D.refaz = []; D.mudou = true; };
  const poeNaCamada = (c, i = D.at) => { const q = D.camadas[i].c.getContext('2d'); q.clearRect(0, 0, D.w, D.h); q.drawImage(c, 0, 0); };
  let pedido = 0, formigas = 0;
  function pinta() {
    if (pedido) return; pedido = requestAnimationFrame(() => {
      pedido = 0; const r = tela(), dpr = window.devicePixelRatio || 1; if (!r.width) return;
      if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); fundo = null; }
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = '#cfc6b4'; g.fillRect(0, 0, r.width, r.height); if (!D) return;
      const M = new DOMMatrix().scale(dpr).multiply(V), z = escala(); g.setTransform(M);
      const pat = xadrez(); if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(1 / z)); g.fillStyle = pat; g.fillRect(0, 0, D.w, D.h);
      g.imageSmoothingEnabled = z < 3;
      if (D.tipo === 'visor' && D.ref) g.drawImage(D.ref, 0, 0);
      else if (WZP.cebola && D.ceb) { g.globalAlpha = .25; g.drawImage(D.ceb, -(D.F.cebola.dx || 0), 0); g.globalAlpha = 1; }
      const prev = traco ? traco.previa() : flut ? flut.previa() : ajuste ? ajuste.previa() : null;
      comp = wzpCompor(D, prev ? { i: D.at, c: prev } : null, comp && comp.width === D.w && comp.height === D.h ? comp : null);
      if (D.tipo === 'visor') { const t = wzpCopia(comp), q = t.getContext('2d'); q.globalCompositeOperation = 'source-in'; q.fillStyle = 'rgba(0,190,255,.6)'; q.fillRect(0, 0, D.w, D.h); g.drawImage(t, 0, 0); }
      else g.drawImage(comp, 0, 0);
      g.strokeStyle = 'rgba(27,31,79,.5)'; g.lineWidth = 1 / z; g.strokeRect(0, 0, D.w, D.h);
      // seleção (formigas andando) e laço em andamento
      const tracejado = (path) => { g.save(); g.lineWidth = 1.5 / z; g.setLineDash([5 / z, 4 / z]); g.strokeStyle = '#fff'; g.lineDashOffset = -formigas / z; g.stroke(path); g.strokeStyle = '#1b1f4f'; g.lineDashOffset = -formigas / z + 4.5 / z; g.stroke(path); g.restore(); };
      if (D.sel && !flut) tracejado(D.sel.path);
      if (laco) tracejado(laco.path());
      if (cursor && (WZP.ferr === 'pincel' || WZP.ferr === 'borracha' || WZP.ferr === 'borrar') && !traco) { g.beginPath(); g.arc(cursor[0], cursor[1], WZP.tam / 2, 0, Math.PI * 2); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2 / z; g.stroke(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1 / z; g.stroke(); }
      // alças do transformar (na tela, tamanho fixo)
      if (flut) { g.setTransform(dpr, 0, 0, dpr, 0, 0); const P = flut.cantos().map(([x, y]) => naTela(x, y)); g.strokeStyle = '#1b1f4f'; g.lineWidth = 1.5; g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
        for (const [x, y] of P) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill(); g.stroke(); }
        const [gx, gy] = flut.alcaGiro(); g.fillStyle = '#e8484a'; g.beginPath(); g.arc(gx, gy, 7, 0, Math.PI * 2); g.fill(); g.stroke(); }
    });
  }
  const iv = setInterval(() => { if (!document.body.contains(cv)) { clearInterval(iv); return; } if (D && (D.sel || laco)) { formigas = (formigas + 1) % 9; pinta(); } }, 120);

  // ----- o traço do pincel e da borracha: carimbos da ponta ao longo do caminho; segurar parado no fim vira linha reta
  function novoTraco(e, borracha) {
    const L = D.camadas[D.at], B = wzpPincel(WZP.pincel), buf = wzpTela(D.w, D.h), bg = buf.getContext('2d'), cor = D.tipo === 'visor' ? '#ffffff' : WZP.cor, ponta = wzpTinta(B, borracha ? '#000000' : cor);
    let ult = null, sobra = 0, suave = null, ini = null, reta = false, espera = 0, ultMov = null;
    const pr = (ev) => (ev.pointerType === 'mouse' || !ev.pressure ? 1 : ev.pressure);
    const suavizacao = Math.max(WZP.suav, B.suav ?? 0);
    const carimbo = (x, y, p, ang) => {
      const t = Math.max(.5, WZP.tam * (WZP.pTam ? (B.pMin ?? .15) + (1 - (B.pMin ?? .15)) * p : 1)), a = Math.min(1, WZP.fluxo * (B.fluxo ?? 1) * (WZP.pTop ? p : 1));
      if (B.jitter) { const r = B.jitter * t * Math.random(), q = Math.random() * 6.283; x += Math.cos(q) * r; y += Math.sin(q) * r; }
      bg.globalAlpha = a; const asp = ponta.height / ponta.width, w = t, h = t * asp;
      if (B.girar) { bg.save(); bg.translate(x, y); bg.rotate(B.girar === 'aleatorio' ? Math.random() * 6.283 : ang); bg.drawImage(ponta, -w / 2, -h / 2, w, h); bg.restore(); } else bg.drawImage(ponta, x - w / 2, y - h / 2, w, h);
    };
    const segmento = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy), passo = Math.max(.4, WZP.tam * (B.espaco ?? .1) * Math.max(.2, b[2])), ang = Math.atan2(dy, dx);
      let t = passo - sobra; while (t <= d) { const f = t / d; carimbo(a[0] + dx * f, a[1] + dy * f, a[2] + (b[2] - a[2]) * f, ang); t += passo; } sobra = d - (t - passo); };
    const linhaReta = (fim) => { bg.clearRect(0, 0, D.w, D.h); sobra = 0; const p = Math.max(.5, ini[2]); carimbo(ini[0], ini[1], p, 0); segmento([ini[0], ini[1], p], [fim[0], fim[1], p]); };
    const ponto = (ev) => {
      const [x, y] = doc(ev), p = pr(ev);
      if (reta) { linhaReta([x, y]); return; }
      const k = 1 - Math.min(.92, suavizacao * .95); suave = suave ? [suave[0] + (x - suave[0]) * k, suave[1] + (y - suave[1]) * k, suave[2] + (p - suave[2]) * k] : [x, y, p];
      if (!ult) { ini = suave.slice(); carimbo(suave[0], suave[1], suave[2], 0); ult = suave.slice(); return; }
      segmento(ult, suave); ult = suave.slice();
    };
    const vigia = (ev) => { const [x, y] = doc(ev); if (ultMov && Math.hypot(x - ultMov[0], y - ultMov[1]) < 2 / escala()) return; ultMov = [x, y]; clearTimeout(espera);
      espera = setTimeout(() => { if (!traco || reta || !ini || Math.hypot(x - ini[0], y - ini[1]) < 6) return; reta = true; linhaReta([x, y]); info.textContent = 'Linha reta: arraste para ajustar a ponta e solte.'; pinta(); }, 600); };
    const comGrao = () => { const c = wzpCopia(buf); if (B.grao) { const q = c.getContext('2d'), pat = q.createPattern(B.grao, 'repeat'); if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(B.gEsc || 1)); q.globalCompositeOperation = 'destination-in'; q.fillStyle = pat; q.fillRect(0, 0, D.w, D.h); } return limita(c); };
    const junta = (alvo) => { const q = alvo.getContext('2d'); q.save(); q.globalAlpha = WZP.opac; q.globalCompositeOperation = borracha ? 'destination-out' : L.alfa ? 'source-atop' : 'source-over'; q.drawImage(comGrao(), 0, 0); q.restore(); };
    ponto(e); vigia(e);
    return {
      mais(ev) { const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev]; for (const x of (evs.length ? evs : [ev])) ponto(x); vigia(ev); pinta(); },
      previa() { const c = wzpCopia(L.c); junta(c); return c; },
      fim() { clearTimeout(espera); guardaDesfazer(); junta(L.c); },
      cancela() { clearTimeout(espera); },
    };
  }
  // ----- borrar (dedo): puxa a tinta que já está na camada ao longo do traço
  function novoBorrao(e) {
    const L = D.camadas[D.at], B = wzpPincel(WZP.pincel), W = wzpCopia(L.c), wg = W.getContext('2d'), velho = wzpCopia(L.c);
    let ult = null, sobra = 0;
    const pr = (ev) => (ev.pointerType === 'mouse' || !ev.pressure ? 1 : ev.pressure);
    const passa = (a, b, p) => {
      const t = Math.max(2, WZP.tam * (WZP.pTam ? .3 + .7 * p : 1)), s = Math.ceil(t), m = wzpTela(s, s), q = m.getContext('2d');
      q.drawImage(W, a[0] - s / 2, a[1] - s / 2, s, s, 0, 0, s, s); q.globalCompositeOperation = 'destination-in'; q.drawImage(B.ponta, 0, 0, s, s);
      wg.save(); wg.globalAlpha = Math.min(1, WZP.forca * (WZP.pTop ? p : 1)); wg.drawImage(m, b[0] - s / 2, b[1] - s / 2); wg.restore();
    };
    const ponto = (ev) => { const [x, y] = doc(ev), p = pr(ev); if (!ult) { ult = [x, y]; return; }
      const dx = x - ult[0], dy = y - ult[1], d = Math.hypot(dx, dy), passo = Math.max(.5, WZP.tam * .08); let t = passo - sobra, a = ult;
      while (t <= d) { const b = [ult[0] + dx * t / d, ult[1] + dy * t / d]; passa(a, b, p); a = b; t += passo; } sobra = d - (t - passo); if (a !== ult) ult = a; };
    const final = () => { let c = mistura(velho, W); if (L.alfa) { const q = c.getContext('2d'); q.globalCompositeOperation = 'destination-in'; q.drawImage(velho, 0, 0); } return c; };
    ponto(e);
    return { mais(ev) { const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev]; for (const x of (evs.length ? evs : [ev])) ponto(x); pinta(); }, previa: () => final(), fim() { guardaDesfazer(); poeNaCamada(final()); }, cancela() {} };
  }
  function troca(de, para) { const s = de.pop(); if (!s || !D.camadas[s.at]) return; const q = D.camadas[s.at].c.getContext('2d'); para.push({ at: s.at, img: q.getImageData(0, 0, D.w, D.h) }); q.putImageData(s.img, 0, 0); D.mudou = true; pinta(); }
  const desfaz = () => { if (!D) return; if (flut) { cancelaFlutuante(); return; } troca(D.desfaz, D.refaz); }, refaz = () => D && !flut && troca(D.refaz, D.desfaz);
  function pegaCor(e) { const [x, y] = doc(e).map(Math.floor); if (x < 0 || y < 0 || x >= D.w || y >= D.h) return; const src = D.tipo === 'visor' && D.ref ? D.ref : wzpJunta(D), d = src.getContext('2d').getImageData(x, y, 1, 1).data; if (d[3] < 10) return; usaCor(wzpHex(d[0], d[1], d[2])); }
  function balde(e) {
    const [x0, y0] = doc(e).map(Math.floor); if (x0 < 0 || y0 < 0 || x0 >= D.w || y0 >= D.h) return;
    const L = D.camadas[D.at], velho = wzpCopia(L.c), refc = D.tipo === 'visor' && D.ref ? D.ref : wzpJunta(D), ref = refc.getContext('2d').getImageData(0, 0, D.w, D.h).data;
    const novo = wzpCopia(L.c), q = novo.getContext('2d'), img = q.getImageData(0, 0, D.w, D.h), px = img.data;
    const i0 = (y0 * D.w + x0) * 4, alvo = [ref[i0], ref[i0 + 1], ref[i0 + 2], ref[i0 + 3]], tol = WZP.tol * 4, cor = wzpRgb(D.tipo === 'visor' ? '#ffffff' : WZP.cor), m = selMascara(), md = m ? m.getContext('2d').getImageData(0, 0, D.w, D.h).data : null;
    const igual = (i) => Math.abs(ref[i] - alvo[0]) + Math.abs(ref[i + 1] - alvo[1]) + Math.abs(ref[i + 2] - alvo[2]) + Math.abs(ref[i + 3] - alvo[3]) <= tol && (!md || md[i + 3] > 127);
    const visto = new Uint8Array(D.w * D.h), pilha = [x0 + y0 * D.w];
    while (pilha.length) { const n = pilha.pop(); if (visto[n]) continue; visto[n] = 1; const i = n * 4; if (!igual(i)) continue; if (!L.alfa || px[i + 3]) { px[i] = cor[0]; px[i + 1] = cor[1]; px[i + 2] = cor[2]; px[i + 3] = L.alfa ? px[i + 3] : Math.round(255 * WZP.opac); } const x = n % D.w;
      if (x > 0) pilha.push(n - 1); if (x < D.w - 1) pilha.push(n + 1); if (n >= D.w) pilha.push(n - D.w); if (n < D.w * (D.h - 1)) pilha.push(n + D.w); }
    q.putImageData(img, 0, 0); guardaDesfazer(); poeNaCamada(novo); void velho; pinta();
  }
  // ----- seleção
  function novoLaco(e) {
    const pts = [doc(e)], ret = WZP.selModo === 'retangulo';
    const path = () => { const p = new Path2D(); if (ret) { const [a, b] = [pts[0], pts[pts.length - 1]]; p.rect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); } else { pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); } return p; };
    return { path, mais(ev) { const q = doc(ev); if (ret) pts[1] = q; else pts.push(q); pinta(); },
      fim() { const [a, b] = [pts[0], pts[pts.length - 1]], grande = ret ? Math.abs(b[0] - a[0]) > 2 && Math.abs(b[1] - a[1]) > 2 : pts.length > 4; D.sel = grande ? { path: path(), inv: false } : null; mostraCtx(); pinta(); } };
  }
  const selTudo = () => { const p = new Path2D(); p.rect(0, 0, D.w, D.h); D.sel = { path: p, inv: false }; pinta(); };
  const selInverte = () => { if (!D.sel) return; D.sel = { path: D.sel.path, inv: !D.sel.inv }; pinta(); };
  const selLimpa = () => { D.sel = null; pinta(); mostraCtx(); };
  const selApaga = () => { if (!D.sel) return; guardaDesfazer(); const q = D.camadas[D.at].c.getContext('2d'); q.save(); q.globalCompositeOperation = 'destination-out'; q.drawImage(selMascara(), 0, 0); q.restore(); pinta(); };
  const selCopia = () => { if (!D.sel) return; const c = limita(wzpCopia(D.camadas[D.at].c)); D.camadas.splice(D.at + 1, 0, wzpCamada('Cópia', c)); D.at++; D.mudou = true; painelCamadas(); pinta(); };
  // ----- transformar: a parte escolhida (seleção ou camada inteira) vira uma peça solta que se move, cresce, gira e espelha
  function abreFlutuante() {
    if (flut || !D) return; const L = D.camadas[D.at], velho = wzpCopia(L.c), peca = limita(wzpCopia(L.c));
    const d = peca.getContext('2d').getImageData(0, 0, D.w, D.h).data; let x0 = D.w, y0 = D.h, x1 = -1, y1 = -1;
    for (let y = 0; y < D.h; y++) for (let x = 0; x < D.w; x++) if (d[(y * D.w + x) * 4 + 3] > 2) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { info.textContent = 'Não tem nada para transformar aqui.'; escolhe('pincel'); return; }
    const w = x1 - x0 + 1, h = y1 - y0 + 1, c = wzpTela(w, h); c.getContext('2d').drawImage(peca, x0, y0, w, h, 0, 0, w, h);
    const resto = wzpCopia(L.c), rq = resto.getContext('2d'); if (D.sel) { rq.globalCompositeOperation = 'destination-out'; rq.drawImage(selMascara(), 0, 0); } else rq.clearRect(0, 0, D.w, D.h);
    const T = { cx: x0 + w / 2, cy: y0 + h / 2, s: 1, sy: 1, r: 0, fh: 1, fv: 1 };
    const matriz = () => new DOMMatrix().translate(T.cx, T.cy).rotate(T.r).scale(T.s * T.fh, T.s * T.sy * T.fv);
    flut = { T, velho, resto, c,
      cantos: () => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => { const p = matriz().transformPoint(new DOMPoint(x, y)); return [p.x, p.y]; }),
      alcaGiro: () => { const p = matriz().transformPoint(new DOMPoint(0, -h / 2)), q = naTela(p.x, p.y), cc = naTela(T.cx, T.cy), dx = q[0] - cc[0], dy = q[1] - cc[1], n = Math.hypot(dx, dy) || 1; return [q[0] + dx / n * 26, q[1] + dy / n * 26]; },
      previa() { const out = wzpCopia(resto), q = out.getContext('2d'); q.setTransform(matriz()); q.imageSmoothingQuality = 'high'; q.drawImage(c, -w / 2, -h / 2); return out; },
    };
    mostraCtx(); pinta();
  }
  function aplicaFlutuante() { if (!flut) return; const f = flut; flut = null; const L = D.camadas[D.at]; D.desfaz.push({ at: D.at, img: f.velho.getContext('2d').getImageData(0, 0, D.w, D.h) }); D.refaz = []; poeNaCamada(f.previa()); D.mudou = true; void L; D.sel = null; mostraCtx(); pinta(); }
  function cancelaFlutuante() { if (!flut) return; poeNaCamada(flut.velho); flut = null; mostraCtx(); pinta(); }
  function arrastaFlutuante(e) {
    const r = tela(), sx = e.clientX - r.left, sy = e.clientY - r.top, T = flut.T, [gx, gy] = flut.alcaGiro(), cc = naTela(T.cx, T.cy), P = flut.cantos().map(([x, y]) => naTela(x, y));
    if (Math.hypot(sx - gx, sy - gy) < 14) { const a0 = Math.atan2(sy - cc[1], sx - cc[0]), r0 = T.r; return (ev) => { const x = ev.clientX - r.left, y = ev.clientY - r.top; T.r = r0 + (Math.atan2(y - cc[1], x - cc[0]) - a0) * 180 / Math.PI; if (ev.shiftKey) T.r = Math.round(T.r / 15) * 15; pinta(); }; }
    if (P.some(([x, y]) => Math.hypot(sx - x, sy - y) < 14)) { const d0 = Math.hypot(sx - cc[0], sy - cc[1]), s0 = T.s; return (ev) => { T.s = Math.max(.05, s0 * Math.hypot(ev.clientX - r.left - cc[0], ev.clientY - r.top - cc[1]) / d0); pinta(); }; }
    const p0 = doc(e), c0 = [T.cx, T.cy]; return (ev) => { const q = doc(ev); T.cx = c0[0] + q[0] - p0[0]; T.cy = c0[1] + q[1] - p0[1]; pinta(); };
  }
  // ----- ajustes de cor e desfoque (na camada escolhida, dentro da seleção)
  function abreAjustes() {
    if (ajuste || !D) return; const L = D.camadas[D.at], velho = wzpCopia(L.c), v = { h: 0, s: 0, b: 0, d: 0 }; let cache = null, chave = '';
    ajuste = { v, previa() { const k = JSON.stringify(v); if (k !== chave) { chave = k; let c = wzpAjustaCor(velho, v.h, v.s / 100, v.b / 100); if (v.d) c = wzpDesfoca(c, v.d); if (L.alfa) { const q = c.getContext('2d'); q.globalCompositeOperation = 'destination-in'; q.drawImage(velho, 0, 0); } cache = mistura(velho, c); } return cache; },
      aplica() { const c = ajuste.previa(); D.desfaz.push({ at: D.at, img: velho.getContext('2d').getImageData(0, 0, D.w, D.h) }); D.refaz = []; poeNaCamada(c); D.mudou = true; ajuste = null; escolhe('pincel'); },
      cancela() { ajuste = null; escolhe('pincel'); } };
    mostraCtx(); pinta();
  }
  // ----- caneta, mouse e dedos (gestos)
  const toques = new Map(); let gesto = null, arrasto = null, acao = null, toqueMax = 0, toqueIni = 0, toqueMoveu = false, segura = 0;
  cv.addEventListener('pointerdown', (e) => {
    if (!D) return; try { cv.setPointerCapture(e.pointerId); } catch { /* */ } if (e.pointerType === 'pen') temCaneta = true;
    if (e.pointerType === 'touch') {
      if (!toques.size) { toqueMax = 0; toqueIni = performance.now(); toqueMoveu = false; }
      toques.set(e.pointerId, [e.clientX, e.clientY, e.clientX, e.clientY]); toqueMax = Math.max(toqueMax, toques.size);
      if (toques.size >= 2 || temCaneta) { if (acao && acao.cancela) acao.cancela(); acao = null; laco = null; clearTimeout(segura); gesto = null; pinta(); if (temCaneta && toques.size === 1) { segura = setTimeout(() => { if (toques.size === 1 && !toqueMoveu) { pegaCor(e); info.textContent = 'Cor pega pelo dedo.'; } }, 500); } return; }
      segura = setTimeout(() => { if (toques.size === 1 && !toqueMoveu) { if (acao && acao.cancela) acao.cancela(); acao = null; pegaCor(e); info.textContent = 'Cor pega pelo dedo.'; pinta(); } }, 550);
    }
    const f = espaco || e.button === 1 ? 'mao' : e.altKey && WZP.ferr !== 'selecao' ? 'conta' : WZP.ferr;
    if (f === 'mao') { arrasto = { x: e.clientX, y: e.clientY, V }; return; }
    if (f === 'conta') { pegaCor(e); return; }
    if (f === 'balde') { balde(e); return; }
    if (f === 'selecao') { acao = laco = novoLaco(e); return; }
    if (f === 'transformar') { if (!flut) abreFlutuante(); if (flut) acao = { mais: arrastaFlutuante(e), fim() {} }; return; }
    if (f === 'ajustes') return;
    const L = D.camadas[D.at]; if (L && !L.vis) { info.textContent = 'A camada escolhida está escondida.'; return; }
    acao = traco = f === 'borrar' ? novoBorrao(e) : novoTraco(e, f === 'borracha'); pinta();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!D) return; cursor = doc(e);
    if (e.pointerType === 'touch' && toques.has(e.pointerId)) {
      const t = toques.get(e.pointerId); if (Math.hypot(e.clientX - t[2], e.clientY - t[3]) > 10) { toqueMoveu = true; clearTimeout(segura); } t[0] = e.clientX; t[1] = e.clientY;
      if (toques.size >= 2) { const [a, b] = [...toques.values()], r = tela(), mx = (a[0] + b[0]) / 2 - r.left, my = (a[1] + b[1]) / 2 - r.top, d = Math.hypot(a[0] - b[0], a[1] - b[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        if (gesto) { V = new DOMMatrix().translate(mx, my).rotate((ang - gesto.ang) * 180 / Math.PI).scale(d / gesto.d).translate(-gesto.mx, -gesto.my).multiply(gesto.V); }
        else gesto = { d, ang, mx, my, V };
        pinta(); return; }
      if (temCaneta) return;
    }
    if (arrasto) { V = new DOMMatrix().translate(e.clientX - arrasto.x, e.clientY - arrasto.y).multiply(arrasto.V); pinta(); return; }
    if (acao) acao.mais(e); else pinta();
  });
  const solta = (e) => {
    if (e.pointerType === 'touch') { toques.delete(e.pointerId); clearTimeout(segura);
      if (!toques.size) { const curto = performance.now() - toqueIni < 300 && !toqueMoveu; if (curto && toqueMax === 2) { if (acao && acao.cancela) acao.cancela(); acao = null; desfaz(); info.textContent = 'Desfeito (dois dedos).'; } else if (curto && toqueMax >= 3) { refaz(); info.textContent = 'Refeito (três dedos).'; } gesto = null; }
      else if (toques.size < 2) gesto = null; }
    arrasto = null; if (acao) { const a = acao; acao = null; a.fim(); if (a === traco) traco = null; if (a === laco) laco = null; pinta(); }
  };
  cv.addEventListener('pointerup', solta); cv.addEventListener('pointercancel', (e) => { if (acao && acao.cancela) acao.cancela(); acao = traco = laco = null; solta(e); });
  cv.addEventListener('pointerleave', () => { cursor = null; pinta(); });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); const r = tela(), px = e.clientX - r.left, py = e.clientY - r.top, k = e.deltaY < 0 ? 1.15 : 1 / 1.15, z = escala(); if (z * k < .05 || z * k > 60) return; V = emVolta(new DOMMatrix().scale(k), px, py).multiply(V); pinta(); }, { passive: false });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  const tecla = (e) => {
    if (!document.body.contains(cv)) { removeEventListener('keydown', tecla, true); removeEventListener('keyup', tecla2, true); return; }
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); if (e.shiftKey) refaz(); else desfaz(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'a') { e.preventDefault(); selTudo(); return; }
    if ((e.ctrlKey || e.metaKey) && k === 'd') { e.preventDefault(); selLimpa(); return; }
    if (k === 'enter' && flut) { aplicaFlutuante(); escolhe('pincel'); return; } if (k === 'escape') { if (flut) cancelaFlutuante(); else if (D && D.sel) selLimpa(); else if (area.classList.contains('cheia')) telaCheia(false); return; }
    if (k === ' ') { espaco = true; e.preventDefault(); return; }
    const mapa = { b: 'pincel', s: 'borrar', e: 'borracha', l: 'selecao', v: 'transformar', i: 'conta', g: 'balde', h: 'mao' }; if (mapa[k] && !e.ctrlKey && !e.metaKey) { escolhe(mapa[k]); return; }
    if (k === '[') { WZP.tam = Math.max(1, Math.round(WZP.tam / 1.2)); painelPincel(); pinta(); } if (k === ']') { WZP.tam = Math.min(400, Math.round(WZP.tam * 1.2 + 1)); painelPincel(); pinta(); }
  };
  const tecla2 = (e) => { if (e.key === ' ') espaco = false; };
  addEventListener('keydown', tecla, true); addEventListener('keyup', tecla2, true);
  function escolhe(k) {
    if (WZP.ferr === 'transformar' && k !== 'transformar') aplicaFlutuante();
    if (WZP.ferr === 'ajustes' && k !== 'ajustes' && ajuste) { ajuste = null; }
    WZP.ferr = k; wzpGuarda(); barra.querySelectorAll('[data-f]').forEach((b) => b.classList.toggle('on', b.dataset.f === k)); cv.style.cursor = k === 'mao' ? 'grab' : k === 'transformar' ? 'move' : 'crosshair';
    if (k === 'transformar' && D) abreFlutuante(); if (k === 'ajustes' && D) abreAjustes(); mostraCtx(); pinta();
  }
  // barra de opções da ferramenta escolhida
  function mostraCtx() {
    const f = WZP.ferr, faixa = (rot, k, min, max, step, fmt = (v) => v, alvo = WZP, depois = () => wzpGuarda()) => { const r = el('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(alvo[k]) }), v = el('span', { class: 'mono' }, String(fmt(alvo[k]))); r.addEventListener('input', () => { alvo[k] = +r.value; v.textContent = String(fmt(alvo[k])); depois(); }); return el('label', { class: 'pin-faixa' }, rot, r, v); };
    const b = (t, fn, cls = '') => el('button', { type: 'button', class: cls, on: { click: fn } }, t);
    const itens = [];
    if (f === 'selecao') itens.push(...[['laco', 'Laço'], ['retangulo', 'Retângulo']].map(([k, t]) => b(t, () => { WZP.selModo = k; wzpGuarda(); mostraCtx(); }, WZP.selModo === k ? 'on' : '')),
      b('Tudo', selTudo), b('Inverter', selInverte), b('Tirar a seleção', selLimpa), b('Apagar o selecionado', selApaga), b('Copiar para camada nova', selCopia));
    else if (f === 'transformar') itens.push(el('span', {}, flut ? 'Arraste para mover; os cantos mudam o tamanho; a bolinha vermelha gira (Shift: de 15 em 15°).' : ''),
      b('Espelhar ↔', () => { if (flut) { flut.T.fh *= -1; pinta(); } }), b('Espelhar ↕', () => { if (flut) { flut.T.fv *= -1; pinta(); } }),
      b('Aplicar', () => { aplicaFlutuante(); escolhe('pincel'); }, 'pri'), b('Cancelar', () => { cancelaFlutuante(); escolhe('pincel'); }));
    else if (f === 'ajustes' && ajuste) { const v = ajuste.v, mexe = () => pinta();
      itens.push(faixa('Matiz', 'h', -180, 180, 1, (x) => x + '°', v, mexe), faixa('Saturação', 's', -100, 100, 1, (x) => x + '%', v, mexe), faixa('Brilho', 'b', -100, 100, 1, (x) => x + '%', v, mexe), faixa('Desfoque', 'd', 0, 20, 1, (x) => x + ' px', v, mexe),
        b('Aplicar', () => ajuste && ajuste.aplica(), 'pri'), b('Cancelar', () => ajuste && ajuste.cancela())); }
    else if (f === 'balde') itens.push(faixa('Tolerância', 'tol', 0, 100, 1));
    else if (f === 'borrar') itens.push(faixa('Força', 'forca', .05, 1, .05, (x) => Math.round(x * 100) + '%'), el('span', {}, 'O borrar usa a forma do pincel escolhido.'));
    else if (f === 'pincel' || f === 'borracha') itens.push(el('span', {}, 'Segure a caneta parada no fim do traço para fazer uma linha reta.'));
    ctxBar.replaceChildren(...itens);
  }
  // ----- painéis do lado: cor, pincel, camadas
  const pCor = el('div', {}), pPin = el('div', {}), pCam = el('div', {});
  // abas do lado (como os botões do canto do Procreate): pincel, cor, camadas
  const ABAS = [['pincel', 'Pincel', pPin], ['cor', 'Cor', pCor], ['camadas', 'Camadas', pCam]];
  const abas = el('div', { class: 'pin-abas' }, ...ABAS.map(([k, t]) => el('button', { type: 'button', 'data-a': k, on: { click: () => mostraAba(k) } }, t)));
  const amostraTopo = el('span', { class: 'pin-amostra pin-amostra-topo', title: 'Cor atual' });
  abas.append(amostraTopo);
  function mostraAba(k) { WZP.lado = k; wzpGuarda(); if (k === 'camadas' && typeof painelCamadas === 'function' && D) painelCamadas(); for (const [a, , pane] of ABAS) pane.hidden = a !== k; abas.querySelectorAll('[data-a]').forEach((b) => b.classList.toggle('on', b.dataset.a === k)); }
  lado.append(abas, pPin, pCor, pCam); mostraAba(WZP.lado || 'pincel');
  let hsv = wzpRgb2hsv(...wzpRgb(WZP.cor));
  function usaCor(c, guardar = true) { WZP.cor = c; amostraTopo.style.background = c; hsv = wzpRgb2hsv(...wzpRgb(c)); if (guardar) WZP.recentes = [c, ...WZP.recentes.filter((x) => x !== c)].slice(0, 12); wzpGuarda(); painelCor(); }
  function painelCor() {
    const sv = el('canvas', { class: 'pin-sv', width: 220, height: 150 }), hue = el('canvas', { class: 'pin-hue', width: 220, height: 16 });
    const desenha = () => { const q = sv.getContext('2d'), [r, gg, b] = wzpHsv2rgb(hsv[0], 1, 1); q.fillStyle = wzpHex(r, gg, b); q.fillRect(0, 0, 220, 150); let gr = q.createLinearGradient(0, 0, 220, 0); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); q.fillStyle = gr; q.fillRect(0, 0, 220, 150); gr = q.createLinearGradient(0, 0, 0, 150); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, '#000'); q.fillStyle = gr; q.fillRect(0, 0, 220, 150);
      q.strokeStyle = hsv[2] > .6 ? '#000' : '#fff'; q.lineWidth = 2; q.beginPath(); q.arc(hsv[1] * 220, (1 - hsv[2]) * 150, 6, 0, 6.283); q.stroke();
      const h2 = hue.getContext('2d'), gh = h2.createLinearGradient(0, 0, 220, 0); for (let i = 0; i <= 6; i++) gh.addColorStop(i / 6, `hsl(${i * 60},100%,50%)`); h2.fillStyle = gh; h2.fillRect(0, 0, 220, 16); h2.fillStyle = '#fff'; h2.strokeStyle = '#1b1f4f'; h2.fillRect(hsv[0] / 360 * 220 - 2, 0, 4, 16); h2.strokeRect(hsv[0] / 360 * 220 - 2, 0, 4, 16); };
    const arrastaEm = (c, fn) => { let on = false; const go = (e) => { const r = c.getBoundingClientRect(); fn(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))); const [r2, g2, b2] = wzpHsv2rgb(...hsv); WZP.cor = wzpHex(r2, g2, b2); amostra.style.background = WZP.cor; amostraTopo.style.background = WZP.cor; hex.value = WZP.cor; desenha(); };
      c.addEventListener('pointerdown', (e) => { on = true; try { c.setPointerCapture(e.pointerId); } catch { /* */ } go(e); }); c.addEventListener('pointermove', (e) => on && go(e)); c.addEventListener('pointerup', () => { on = false; usaCor(WZP.cor); }); };
    arrastaEm(sv, (x, y) => { hsv = [hsv[0], x, 1 - y]; }); arrastaEm(hue, (x) => { hsv = [x * 360, hsv[1], hsv[2]]; });
    const amostra = el('span', { class: 'pin-amostra', style: `background:${WZP.cor}` }), hex = el('input', { type: 'text', value: WZP.cor, maxLength: 7, style: 'width:90px' });
    hex.addEventListener('change', () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) usaCor(hex.value.toLowerCase()); });
    const bola = (c, fn) => el('button', { type: 'button', title: c, style: `background:${c}`, on: { click: fn } });
    pCor.replaceChildren(...[sv, hue, el('div', { class: 'chips' }, amostra, hex, el('button', { type: 'button', title: 'Guardar esta cor na paleta', on: { click: () => { if (!WZP.paleta.includes(WZP.cor)) WZP.paleta.push(WZP.cor); wzpGuarda(); painelCor(); } } }, '+ Paleta')),
      WZP.paleta.length ? el('div', { class: 'pin-rec', title: 'Paleta (clique com o botão direito para tirar)' }, 'Paleta: ', ...WZP.paleta.map((c) => { const x = bola(c, () => usaCor(c, false)); x.addEventListener('contextmenu', (e) => { e.preventDefault(); WZP.paleta = WZP.paleta.filter((y) => y !== c); wzpGuarda(); painelCor(); }); return x; })) : null,
      el('div', { class: 'pin-rec' }, 'Recentes: ', ...WZP.recentes.map((c) => bola(c, () => usaCor(c))))].filter(Boolean));
    desenha();
  }
  function painelPincel() {
    const lista = el('div', { class: 'pin-pinceis' }, ...WZP_PINCEIS.map((b) => { const B = wzpPincel(b.id), mini = wzpTela(36, 36), q = mini.getContext('2d'); q.drawImage(wzpTinta(B, '#1b1f4f'), 4, 4, 28, 28 * B.ponta.height / B.ponta.width);
      return el('button', { type: 'button', class: WZP.pincel === b.id ? 'on' : '', title: b.importado ? `${b.nome} (importado do ${b.importado})` : b.nome, on: { click: () => { WZP.pincel = b.id; wzpGuarda(); painelPincel(); } } }, mini, el('span', {}, b.nome),
        b.importado ? el('i', { title: 'Tirar este pincel', on: { click: async (ev) => { ev.stopPropagation(); if (!(await wzPergunta(`Tirar o pincel "${b.nome}"?`))) return; await WZP_DB.tira(b.id); WZP_PINCEIS.splice(WZP_PINCEIS.indexOf(b), 1); if (WZP.pincel === b.id) WZP.pincel = 'redondo'; painelPincel(); } } }, '×') : null); }));
    const lin = (rot, k, min, max, step, fmt = (v) => v, alvo = WZP) => { const r = el('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(alvo[k] ?? 0) }), v = el('span', { class: 'mono' }, String(fmt(alvo[k] ?? 0)));
      r.addEventListener('input', () => { alvo[k] = +r.value; v.textContent = String(fmt(alvo[k])); wzpGuarda(); pinta(); }); return el('div', { class: 'lin', style: 'grid-template-columns:110px 1fr 44px' }, rot, r, v); };
    const marca = (rot, k) => { const c = el('input', { type: 'checkbox', checked: !!WZP[k] }); c.addEventListener('change', () => { WZP[k] = c.checked; wzpGuarda(); }); return el('label', { class: 'pin-marca' }, c, rot); };
    const arq = el('input', { type: 'file', accept: '.brush,.brushset,.abr,.zip,.png,.jpg,.jpeg,.webp', multiple: true, style: 'display:none' });
    arq.addEventListener('change', async () => { for (const f of arq.files) { try { const ids = await wzpImporta(f); WZP.pincel = ids[0]; info.textContent = `${ids.length} ${ids.length === 1 ? 'pincel importado' : 'pincéis importados'} de ${f.name}.`; } catch (e) { info.textContent = `${f.name}: ${e && e.message}`; } } wzpGuarda(); painelPincel(); });
    // ajustes deste pincel (como o estúdio de pincéis do Procreate, só o essencial)
    const B = wzpPincel(WZP.pincel), aj = (WZP.ajp[WZP.pincel] = WZP.ajp[WZP.pincel] || {});
    const val = (k, pad) => (aj[k] ?? B[k] ?? pad), proxy = new Proxy({}, { get: (_, k) => val(k, k === 'espaco' ? .1 : 0), set: (_, k, x) => { aj[k] = x; return true; } });
    const giro = el('select', {}, ...[['', 'Não gira'], ['direcao', 'Segue o traço'], ['aleatorio', 'Gira ao acaso']].map(([k, t]) => el('option', { value: k, selected: (val('girar', '') || '') === k }, t)));
    giro.addEventListener('change', () => { aj.girar = giro.value || undefined; wzpGuarda(); });
    pPin.replaceChildren(lista, el('button', { type: 'button', on: { click: () => arq.click() } }, 'Importar pincel (Procreate ou Photoshop)'), arq,
      lin('Tamanho', 'tam', 1, 300, 1), lin('Opacidade', 'opac', .05, 1, .05, (v) => Math.round(v * 100) + '%'), lin('Fluxo', 'fluxo', .05, 1, .05, (v) => Math.round(v * 100) + '%'), lin('Suavizar', 'suav', 0, 1, .05, (v) => Math.round(v * 100) + '%'),
      marca('Pressão muda o tamanho', 'pTam'), marca('Pressão muda a opacidade', 'pTop'),
      el('details', { class: 'pin-estudio' }, el('summary', {}, `Ajustes do pincel "${B.nome}"`), lin('Espaçamento', 'espaco', .02, 1.5, .01, (v) => Math.round(v * 100) + '%', proxy), lin('Dispersão', 'jitter', 0, 2, .05, (v) => Math.round(v * 100) + '%', proxy),
        el('div', { class: 'lin', style: 'grid-template-columns:110px 1fr' }, 'Rotação da ponta', giro), el('button', { type: 'button', on: { click: () => { delete WZP.ajp[WZP.pincel]; wzpGuarda(); painelPincel(); } } }, 'Voltar ao original')));
  }
  function painelCamadas() {
    if (!D) { pCam.replaceChildren(); return; }
    const L = D.camadas[D.at], nomeModo = (m) => (WZP_MODOS.find(([k]) => k === m) || WZP_MODOS[0])[1];
    const linhas = D.camadas.map((C, i) => { const vis = el('input', { type: 'checkbox', checked: C.vis, title: 'Mostrar' }); vis.addEventListener('change', () => { C.vis = vis.checked; pinta(); });
      const mini = wzpTela(40, 40), q = mini.getContext('2d'), k = Math.min(40 / D.w, 40 / D.h); q.drawImage(C.c, (40 - D.w * k) / 2, (40 - D.h * k) / 2, D.w * k, D.h * k);
      return el('div', { class: 'pin-cam' + (i === D.at ? ' on' : '') + (C.recorte ? ' rec' : ''), on: { click: (ev) => { if (ev.target.tagName === 'INPUT') return; if (flut) aplicaFlutuante(); D.at = i; painelCamadas(); } } }, vis, mini,
        el('span', {}, C.nome, el('small', {}, [C.modo && C.modo !== 'source-over' ? nomeModo(C.modo) : '', C.alfa ? 'transparência travada' : '', C.recorte ? 'recorte' : '', C.op < 1 ? Math.round(C.op * 100) + '%' : ''].filter(Boolean).join(' · ')))); }).reverse();
    const modo = el('select', { title: 'Modo de mistura da camada' }, ...WZP_MODOS.map(([k, t]) => el('option', { value: k, selected: (L.modo || 'source-over') === k }, t))); modo.addEventListener('change', () => { L.modo = modo.value; D.mudou = true; painelCamadas(); pinta(); });
    const op = el('input', { type: 'range', min: '0', max: '1', step: '.05', value: String(L.op) }); op.addEventListener('input', () => { L.op = +op.value; D.mudou = true; pinta(); }); op.addEventListener('change', () => painelCamadas());
    const marca = (rot, k, dica) => { const c = el('input', { type: 'checkbox', checked: !!L[k] }); c.addEventListener('change', () => { L[k] = c.checked; D.mudou = true; painelCamadas(); pinta(); }); return el('label', { class: 'pin-marca', title: dica }, c, rot); };
    const b = (t, fn, dica = '') => el('button', { type: 'button', title: dica, on: { click: () => { if (flut) aplicaFlutuante(); fn(); D.mudou = true; painelCamadas(); pinta(); } } }, t);
    const mexe = (d) => { const j = D.at + d; if (j < 0 || j >= D.camadas.length) return; [D.camadas[D.at], D.camadas[j]] = [D.camadas[j], D.camadas[D.at]]; D.desfaz = []; D.refaz = []; D.at = j; };
    pCam.replaceChildren(...[...linhas,
      el('div', { class: 'pin-camop' }, el('div', { class: 'lin', style: 'grid-template-columns:70px 1fr' }, 'Mistura', modo), el('div', { class: 'lin', style: 'grid-template-columns:70px 1fr' }, 'Opacidade', op),
        marca('Travar a transparência (pinta só onde já tem tinta)', 'alfa', 'Como o "bloqueio alfa" do Procreate'), marca('Máscara de recorte (aparece só onde a camada de baixo tem tinta)', 'recorte')),
      el('div', { class: 'chips' },
        b('+ Camada', () => { D.camadas.splice(D.at + 1, 0, wzpCamada(`Camada ${D.camadas.length + 1}`, wzpTela(D.w, D.h))); D.at++; }),
        b('Duplicar', () => { const C = D.camadas[D.at]; D.camadas.splice(D.at + 1, 0, { ...C, nome: C.nome + ' (cópia)', c: wzpCopia(C.c) }); D.at++; }),
        b('Subir', () => mexe(1)), b('Descer', () => mexe(-1)),
        b('Juntar para baixo', () => { if (D.at < 1) return; const a = D.camadas[D.at - 1], c = D.camadas[D.at]; D.desfaz = []; D.refaz = []; const junto = wzpCompor({ w: D.w, h: D.h, camadas: [{ ...a, op: 1, modo: 'source-over' }, { ...c }] }); const q = a.c.getContext('2d'); q.clearRect(0, 0, D.w, D.h); q.drawImage(junto, 0, 0); D.camadas.splice(D.at, 1); D.at--; }, 'Junta esta camada com a de baixo'),
        b('Limpar', () => { guardaDesfazer(); const q = D.camadas[D.at].c.getContext('2d'); if (D.sel) { q.save(); q.globalCompositeOperation = 'destination-out'; q.drawImage(selMascara(), 0, 0); q.restore(); } else q.clearRect(0, 0, D.w, D.h); }, 'Apaga a camada (ou só o selecionado)'),
        b('Apagar camada', () => { if (D.camadas.length < 2) return; D.desfaz = D.desfaz.filter((s) => s.at !== D.at).map((s) => ({ ...s, at: s.at > D.at ? s.at - 1 : s.at })); D.refaz = []; D.camadas.splice(D.at, 1); D.at = Math.max(0, D.at - 1); })),
      WZP.modo === 'personagem' && D.tipo !== 'visor' ? (() => { const c = el('input', { type: 'checkbox', checked: !!WZP.cebola }); c.addEventListener('change', () => { WZP.cebola = c.checked; wzpGuarda(); pinta(); }); return el('label', { class: 'pin-marca' }, c, 'Ver o quadro anterior por baixo'); })() : null,
      D.tipo === 'visor' ? el('p', { class: 'ajuda' }, 'Visor: o azul é onde o rosto aparece. Pinte para aumentar, apague para diminuir. O balde enche a parte do desenho em que você tocar (por exemplo, a tela escura).') : null].filter(Boolean));
  }
  amostraTopo.style.background = WZP.cor; painelCor(); painelPincel(); painelCamadas(); mostraCtx();
  (async () => {
    try { if (!WZP.importados) { WZP.importados = true; await wzpCarregaImportados(); painelPincel(); }
      const chave = JSON.stringify(wzpFonte());
      if (!WZP.doc || WZP.doc.chave !== chave) { WZP.doc = await wzpAbreDoc(); if (WZP.doc) WZP.doc.chave = chave; }
      D = WZP.doc; if (!D) { info.textContent = 'Não achei esta imagem.'; return; }
      info.textContent = `${D.F.nome} · ${D.w}×${D.h}${(WZE.cfg.imgs || {})[D.F.k] ? ' · já tem pintura salva' : ''}`; enquadra(); painelCamadas(); mostraCtx();
      if (WZP.ferr === 'transformar') abreFlutuante(); if (WZP.ferr === 'ajustes') abreAjustes(); if (WZP.cheia) telaCheia(true); pinta();
    } catch (e) { info.textContent = 'Não deu para abrir a imagem: ' + (e && e.message); }
  })();
  let enquadrou = false; new ResizeObserver(() => { if (!D) return; const r = tela(); if (!enquadrou && r.width > 50) { enquadrou = true; enquadra(); } pinta(); }).observe(cv);
  // para os testes
  window.__wzpTela = { get V() { return V; }, set V(m) { V = m; pinta(); }, enquadra, escolhe, selTudo, selInverte, selLimpa, aplicaFlutuante, cancelaFlutuante, get flut() { return flut; }, get ajuste() { return ajuste; }, doc: () => D };
}
