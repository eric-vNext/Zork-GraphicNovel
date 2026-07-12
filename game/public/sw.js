// Offline-play service worker (docs/handoff-2026-07-11.md item 6).
// No build-time asset manifest here (no vite-plugin-pwa in this project), so
// this precaches only the tiny app shell at install and otherwise caches
// same-origin GET requests as they're actually fetched during play. After a
// full playthrough online, art/audio/JS/CSS already visited are available
// offline; anything never fetched while online still won't be.
const CACHE_VERSION = 'zork-gn-v1';
const SHELL_URLS = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isMedia(pathname) {
  return pathname.includes('/art/') || pathname.includes('/audio/');
}

// Best-effort cache write. Failures here (e.g. a response whose body can't
// be cloned/read a second time) must never surface as an unhandled
// rejection or break the response already sent to the page.
function cachePut(request, response) {
  return caches
    .open(CACHE_VERSION)
    .then((cache) => cache.put(request, response))
    .catch(() => {});
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first so a new deploy is picked up while online,
  // falling back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // The service worker can be torn down as soon as respondWith's
          // promise settles, before an un-awaited cache write finishes — so
          // this write must go through waitUntil, not a floating promise.
          event.waitUntil(cachePut('./index.html', res.clone()));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // Art/audio: cache-first, since these files are content-named (not
  // content-hashed) and effectively immutable once shipped — no need to
  // re-fetch on every play session.
  if (isMedia(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) event.waitUntil(cachePut(request, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  // Everything else (hashed JS/CSS bundles, icons, manifest): stale-while-
  // revalidate, so offline play works and online play still stays fresh.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok) event.waitUntil(cachePut(request, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
