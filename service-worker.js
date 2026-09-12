const CACHE_NAME = "daily-expense-v4";

const FILES_TO_CACHE = [
"./",
"./khatu.html",
"./khatu.css",
"./khatu.js",
"./manifest.json",
"./icons/icon-192.png",
"./icons/icon-512.png"
];

// Install
self.addEventListener("install", event => {
event.waitUntil(
caches.open(CACHE_NAME)
.then(cache => cache.addAll(FILES_TO_CACHE))
.then(() => self.skipWaiting())
);
});

// Activate
self.addEventListener("activate", event => {
event.waitUntil(
caches.keys().then(keys =>
Promise.all(
keys
.filter(key => key !== CACHE_NAME)
.map(key => caches.delete(key))
)
).then(() => self.clients.claim())
);
});

// Fetch
self.addEventListener("fetch", event => {
const request = event.request;

// Only handle GET requests
if (request.method !== "GET") return;

// HTML, CSS and JS -> Network First
const isAppFile =
request.url.endsWith(".html") ||
request.url.endsWith(".css") ||
request.url.endsWith(".js") ||
request.url.endsWith("/");

if (isAppFile) {
event.respondWith(
fetch(request)
.then(response => {
const responseClone = response.clone();

      caches.open(CACHE_NAME).then(cache => {
        cache.put(request, responseClone);
      });

      return response;
    })
    .catch(() => caches.match(request))
);

return;


}

// Other files -> Cache First
event.respondWith(
caches.match(request)
.then(cachedResponse => {
if (cachedResponse) {
return cachedResponse;
}

    return fetch(request).then(response => {
      const responseClone = response.clone();

      caches.open(CACHE_NAME).then(cache => {
        cache.put(request, responseClone);
      });

      return response;
    });
  })


);
});
