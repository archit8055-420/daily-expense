const CACHE_NAME = 'mkm-expense-v4.6'; // v3 kari didhu etle juna badha cache auto delete thai jase
const STATIC_ASSETS = [
  './',
  './khatu.html',
  './khatu.css',
  './khatu.js', // taro main js file nu naam je hoy e lakhi de
  './manifest.json'
];

// Install - khali static file cache karva
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate - juna cache delete karva
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - MAIN LOGIC
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // 1. Supabase ni badhi request ne bilkul cache nahi karvi - direct network
  if (url.includes('supabase.co') || url.includes('supabase.in')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. Baki badha mate - Network First, pachhi Cache (taki mobile ma offline pan khule)
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Static file hoy to cache ma update kari de
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network fail thay to j cache thi aapvu
        return caches.match(event.request);
      })
  );
});