/**
 * Service worker: caches the font, KaTeX, and the site CSS for instant repeat loads.
 * SEO-friendly: no content hidden; HTML is never cached so prerendered pages stay fresh.
 *
 * Two caching rules, because two kinds of asset:
 *   - fonts + KaTeX  never change without their filename changing -> cache first, forever.
 *   - everything else (site CSS) is edited in place -> stale-while-revalidate, so an
 *     old copy is never served twice. The stylesheet is also requested with a ?v=
 *     build stamp (see _layouts/default.html), which makes the very first load after
 *     a deploy a cache miss and therefore already fresh.
 *
 * Bump CACHE_VERSION to force every client to drop its cache on the next visit.
 */
const CACHE_VERSION = 'v2';
const CACHE_NAME = 'fractal-notes-assets-' + CACHE_VERSION;

function isAssetRequest(request) {
  try {
    const u = new URL(request.url);
    return request.method === 'GET' && u.origin === self.location.origin && u.pathname.indexOf('/assets/') !== -1;
  } catch (_) {
    return false;
  }
}

function isImmutable(url) {
  return url.pathname.indexOf('/assets/fonts/') !== -1 || url.pathname.indexOf('/assets/katex/') !== -1;
}

/** Drop earlier ?v= builds of the same file so the cache doesn't grow with every deploy. */
function pruneOtherVersions(cache, url) {
  return cache.keys().then(function (keys) {
    return Promise.all(keys.map(function (key) {
      const k = new URL(key.url);
      if (k.pathname === url.pathname && k.search !== url.search) return cache.delete(key);
      return null;
    }));
  });
}

self.addEventListener('install', function () {
  // Take over as soon as this version is installed instead of waiting for every
  // tab to close — otherwise a phone that has the site open keeps the old worker.
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        return key === CACHE_NAME ? null : caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (!isAssetRequest(request)) return;
  const url = new URL(request.url);
  const immutable = isImmutable(url);

  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(request).then(function (cached) {
        if (cached && immutable) return cached;

        const network = fetch(request).then(function (response) {
          if (response && response.status === 200 && response.type === 'basic') {
            cache.put(request, response.clone());
            if (!immutable) pruneOtherVersions(cache, url);
          }
          return response;
        }).catch(function () {
          return cached;
        });

        if (cached) {
          // Serve the cached copy now, replace it in the background for next load.
          event.waitUntil(network);
          return cached;
        }
        return network;
      });
    })
  );
});
