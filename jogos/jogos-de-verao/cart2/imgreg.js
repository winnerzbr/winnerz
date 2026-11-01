/* Registro das imagens do jogo (editor, 01/11/2026): guarda cada imagem pelo arquivo de origem (img/<código>.webp)
   e deixa o editor trocar uma imagem por outra (pintada no editor) sem recarregar a página.
   As trocas aplicadas ficam guardadas no navegador, para valerem desde o começo da próxima visita. */
(() => {
  const D = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  if (!D || !D.set) return;
  const R = window.__WZIMG = { by: new Map(), over: {}, D };
  const semBlob = (m) => Object.fromEntries(Object.entries(m || {}).filter(([, u]) => typeof u === 'string' && !/^blob:/.test(u)));
  R.semBlob = semBlob;
  try { R.over = semBlob(JSON.parse(localStorage.getItem('wz.imgs') || '{}')); } catch { R.over = {}; }
  const norm = (s) => { const m = /(?:^|\/)(img\/[0-9a-f]+\.(?:webp|png|jpg))(?:[?#].*)?$/.exec(s || ''); return m ? m[1] : null; };
  R.norm = norm;
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true, enumerable: D.enumerable,
    get() { return D.get.call(this); },
    set(v) {
      const k = norm(String(v));
      if (k) { let s = R.by.get(k); if (!s) R.by.set(k, (s = new Set())); s.add(this); this.__wzOrig = k; const o = R.over[k]; if (o) { if (!/^(data|blob):/.test(o)) this.crossOrigin = 'anonymous'; v = o; } }
      D.set.call(this, v);
    },
  });
  // troca as imagens já criadas: map = { arquivo original: endereço da imagem nova }
  R.aplica = (map, guardar) => {
    const novo = map || {}, antes = R.over; R.over = novo;
    if (guardar) { try { localStorage.setItem('wz.imgs', JSON.stringify(semBlob(novo))); } catch { /* sem espaço */ } }
    let mudou = 0;
    for (const [k, set] of R.by) {
      if ((antes[k] || '') === (novo[k] || '') && !R.forca) continue;
      const alvo = novo[k] || k;
      for (const im of set) {
        if (novo[k] && !/^(data|blob):/.test(novo[k])) im.crossOrigin = 'anonymous'; else im.removeAttribute('crossorigin');
        im.addEventListener('load', () => dispatchEvent(new Event('wz-img')), { once: true });
        D.set.call(im, alvo); mudou++;
      }
    }
    return mudou;
  };
  // a imagem original (ou a trocada) de um arquivo, já carregada, para o editor pintar em cima
  R.carrega = (k) => new Promise((ok, no) => { const im = new Image(); const o = R.over[k]; if (o && !/^(data|blob):/.test(o)) im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = () => no(new Error('não carregou ' + k)); D.set.call(im, o || k); });
  R.lista = () => [...R.by.keys()];
})();
