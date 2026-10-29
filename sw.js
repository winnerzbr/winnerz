/*
 * Service worker do WinnerZ: deixa o site instalável e abre mesmo sem internet.
 * - Páginas: rede primeiro (o site novo chega na hora); sem rede, a última página guardada.
 * - Arquivos com hash (/assets/*): guardados na primeira vez, nunca mudam.
 * - API, Supabase e outros domínios: não passam por aqui.
 */
const VERSAO = 'wz-1';
const PAGINA = '/index.html';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.add(PAGINA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // /demo/: páginas à parte (como o vôlei feito no Godot) não passam por aqui nem viram a página guardada do site
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/steam/') || url.pathname.startsWith('/demo/') || url.pathname === '/version.json') return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSAO).then((c) => c.put(PAGINA, copy)); }
      return res;
    }).catch(() => caches.match(PAGINA)));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSAO).then((c) => c.put(req, copy)); }
      return res;
    })));
  }
});
