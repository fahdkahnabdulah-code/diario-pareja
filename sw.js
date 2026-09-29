const CACHE = 'diario-pareja-v4';
const ASSETS = ['/', '/index.html', '/style.css', '/app.js', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
        fetch(e.request)
          .then(res => {
                    const copy = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, copy));
                    return res;
          })
          .catch(() => caches.match(e.request))
  );
});

// ────────────────────────────────────────────
// PUSH REAL — recibe el aviso aunque la app esté cerrada y lo muestra
// como notificación del sistema (poke, entrada completada, etc.)
// ─────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: '+Dopamina', body: 'Tienes una novedad en tu diario' };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch (err) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'dopamina'
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsArr => {
      const existente = clientsArr.find(c => 'focus' in c);
      if (existente) return existente.focus();
      return self.clients.openWindow('/');
    })
  );
});
