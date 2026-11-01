// MEXT Forge se mudó a https://mext-forge.mext-rafaga-sync.workers.dev
// Este service worker reemplaza al de la app vieja en los teléfonos: borra su caché y se da de baja.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('mext-forge-')) await caches.delete(k);
  await self.registration.unregister();
})()));
