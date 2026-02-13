/**
 * Service worker: caches fonts, KaTeX CSS/JS, and site CSS for instant repeat loads.
 * SEO-friendly: no content hidden; HTML is not cached so prerendered pages stay fresh.
 */
const CACHE_NAME = 'fractal-notes-assets-v1';

function isAssetRequest(request) {
  try {
    const u = new URL(request.url);
    return request.method === 'GET' && u.origin === self.location.origin && u.pathname.indexOf('/assets/') !== -1;
  } catch (_) {
    return false;
  }
}

self.addEventListener('fetch', function (event) {
  if (!isAssetRequest(event.request)) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(event.request).then(function (cached) {
        if (cached) return cached;
        return fetch(event.request).then(function (response) {
          if (response && response.status === 200 && response.type === 'basic') {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      });
    })
  );
});
