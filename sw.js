
const CACHE_NAME = 'mythos-v1.0.5';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Inter:wght@300;400;600&family=Pirata+One&display=swap',
  'https://www.transparenttextures.com/patterns/dark-leather.png',
  'https://www.transparenttextures.com/patterns/dark-matter.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then(response => {
          // Don't cache if not a valid response or if it's external/API
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Don't cache AI/Search/PeerJS related dynamic calls
          const url = event.request.url;
          if (url.includes('google') || url.includes('peerjs') || url.includes('data:')) {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return response;
        }).catch(() => {
          // If fetch fails (offline) and it's a navigation request, return index.html
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
          return null;
        });
      })
  );
});
