const CACHE_VERSION = 'aesthetica-v1';

self.addEventListener('install', (event) => {
  // Immediately activate the new service worker
  self.skipWaiting();
});

// Listen for messages from clients (e.g., SKIP_WAITING)
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  // Clean up old caches if version changes
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim()).then(() => {
      return self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'NEW_VERSION_ACTIVATED' }));
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first; fall back to cache if available
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request, { ignoreSearch: true })
    )
  );
});
