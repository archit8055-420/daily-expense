const CACHE_NAME = 'mkm-expense-v4.7'; // design badle tyare v4.8 karje
const STATIC_ASSETS = [
  './',
  './khatu.html',
  './khatu.css',
  './khatu.js',
  './manifest.json'
];

// Install - static files cache
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate - juna cache delete
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - MAIN LOGIC (Tari requirement mujab)
self.addEventListener('fetch', event => {
  // POST, PUT, DELETE ne cache na karvi
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // 1. Supabase + jspdf ne bilkul cache nahi karvu - hamesa fresh data
  if (url.includes('supabase.co') || url.includes('supabase.in') || url.includes('jspdf')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. Baki badha mate - Network First, pachhi Cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Saro response hoy to cache ma update kari de
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network fail thay (offline) to cache thi aapvu
        return caches.match(event.request).then(cached => {
          // Jo file j na male ane document mangyu hoy to khatu.html aapi de
          if (cached) return cached;
          if (event.request.destination === 'document') {
            return caches.match('./khatu.html');
          }
        });
      })
  );
});
