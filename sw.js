// ============================================================
// Service Worker — network-first for HTML
// ============================================================
const CACHE_NAME = 'harvest-v2';

self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(function(k) { return k !== CACHE_NAME; })
                    .map(function(k) { return caches.delete(k); })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', function(event) {
    var url = new URL(event.request.url);

    // Only handle same-origin
    if (url.origin !== self.location.origin) return;

    // HTML → network first, fall back to cache offline
    if (event.request.mode === 'navigate' ||
        url.pathname === '/' ||
        url.pathname.endsWith('.html')) {
        event.respondWith(
            fetch(event.request)
                .then(function(response) {
                    var copy = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, copy);
                    });
                    return response;
                })
                .catch(function() {
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Everything else → cache first
    event.respondWith(
        caches.match(event.request).then(function(cached) {
            return cached || fetch(event.request).then(function(response) {
                var copy = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, copy);
                });
                return response;
            });
        })
    );
});