// sw.js
const CACHE_NAME = 'rhymes-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/rhymes.json',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => {
        if (k !== CACHE_NAME) return caches.delete(k);
      }))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Always try network first for JSON so users can get updated rhymes when online,
  // but fall back to cache when offline
  if (request.url.endsWith('/rhymes.json')) {
    event.respondWith(
      fetch(request)
        .then(resp => {
          // update cache copy
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return resp;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // For other assets use cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(networkResp => {
        // Optionally cache fetched requests
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(request, networkResp.clone());
          return networkResp;
        });
      }).catch(() => {
        // fallback: for navigation requests, serve index.html so app shell still loads
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        // else fail
      });
    })
  );
});