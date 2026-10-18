// MEXT Forge — service worker: guarda la app en el teléfono para que funcione sin internet.
// Al publicar una versión nueva, build.js sube VERSION automáticamente para que el teléfono la descargue.
const VERSION = 'mext-forge-202610182107';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

// cache:'reload' evita guardar una copia vieja que venga de la caché HTTP de GitHub Pages (max-age 600).
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION)
    .then(c => Promise.all(FILES.map(f => fetch(new Request(f, { cache: 'reload' })).then(r => { if (!r.ok) throw new Error(f); return c.put(f, r); }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// La página se pide primero a internet (máx. 4 s) para ver siempre la última versión; sin red, la copia guardada.
// Íconos y manifiesto: primero la copia guardada y en segundo plano se revisa si hay una nueva.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const pagina = e.request.mode === 'navigate' || /\/$|\.html$/.test(url.pathname);
  e.respondWith(caches.open(VERSION).then(async cache => {
    if (pagina) {
      const net = fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok) cache.put('index.html', r.clone()); return r; });
      net.catch(() => {});
      const tope = new Promise((_, no) => setTimeout(() => no(new Error('lento')), 4000));
      try { return await Promise.race([net, tope]); }
      catch (err) { return (await cache.match('index.html')) || net; }
    }
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) cache.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
