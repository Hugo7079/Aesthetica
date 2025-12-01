const CACHE_VERSION = 'aesthetica-v1';

self.addEventListener('install', (event) => {
  // Immediately activate the new service worker
  self.skipWaiting();
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
    ).then(() => self.clients.claim())
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
