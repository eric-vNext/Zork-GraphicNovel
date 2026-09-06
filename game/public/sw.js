// Offline service worker, split per game.
//
// The trilogy's art and audio run to tens of megabytes each and no player
// needs all of it: the assets are grouped by game in assets.json (built by
// scripts/build-manifest.mjs) and each group gets its own cache, so a game can
// be downloaded for offline play, or thrown away again, as a unit.
//
// Three layers, in order of preference:
//   1. the shell cache — installed eagerly, tiny, and what makes the app open
//      at all when offline;
//   2. per-game caches — filled on request by the page ("download Zork II for
//      offline"), and consulted for any media request;
//   3. a runtime cache — whatever was actually fetched while playing online,
//      so a player who never asks for a download still gets the rooms they
//      have already seen.
const PREFIX = 'zork-gn';
const RUNTIME = `${PREFIX}-runtime`;
const shellCache = (v) => `${PREFIX}-shell-${v}`;
const gameCache = (game, v) => `${PREFIX}-${game}-${v}`;

/**
 * Fetch something for the cache.
 *
 * `cache.add()` and a bare `fetch(url)` inside a worker both ask in no-cors
 * mode, which stores a response with no CORS history — fine for images, but a
 * poor thing to hand back to anything that asked in CORS mode. Asking in cors
 * mode on our own origin always succeeds and stores a response with no such
 * asterisk against it.
 *
 * (The one request that genuinely could not be served from cache was the
 * `type="module"` entry script, which is fetched in CORS mode whatever its
 * attributes say. That is fixed in the build rather than here: the bundle is
 * emitted as a classic deferred script — see vite.config.ts.)
 */
function fetchForCache(url) {
  return fetch(new Request(url, { mode: 'cors', credentials: 'same-origin', cache: 'no-cache' }));
}

/** The manifest, fetched once per worker lifetime. */
let manifestPromise = null;
function manifest() {
  manifestPromise ??= fetch('./assets.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  return manifestPromise;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const m = await manifest();
      if (m) {
        const cache = await caches.open(shellCache(m.version));
        // addAll is all-or-nothing; one missing file should not stop the app
        // from installing offline support at all.
        await Promise.all(
          m.groups.shell.map((u) =>
            fetchForCache(u)
              .then((res) => (res.ok ? cache.put(u, res) : null))
              .catch(() => {}),
          ),
        );
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const m = await manifest();
      const keep = new Set([RUNTIME]);
      if (m) {
        keep.add(shellCache(m.version));
        for (const g of Object.keys(m.groups)) keep.add(gameCache(g, m.version));
      }
      // Drop caches from earlier asset versions, but only ours.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith(PREFIX) && !keep.has(k)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

function isMedia(pathname) {
  return pathname.includes('/art/') || pathname.includes('/audio/');
}

/** Best-effort cache write; never allowed to break the response in flight. */
function cachePut(cacheName, request, response) {
  return caches
    .open(cacheName)
    .then((cache) => cache.put(request, response))
    .catch(() => {});
}

/**
 * Cache-first, and deliberately without a background revalidate: the bundles
 * are content-hashed, the media is content-named, and the shell cache is keyed
 * by the manifest version — so anything we hold under this version is exactly
 * what the server would send. Re-fetching it would only be a way to fail.
 *
 * Nothing here calls waitUntil() after an await, which is what made an earlier
 * version return a rejected promise to respondWith — and a rejected
 * respondWith is a failed request, even when the cache had the file all along.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) await cachePut(RUNTIME, request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations are the one thing worth asking the network about first, so a
  // new deploy is picked up while online; offline they fall back to the shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html').then((r) => r || Response.error())),
    );
    return;
  }

  event.respondWith(cacheFirst(request).catch(() => Response.error()));
});

// ---------------------------------------------------------------------------
// Message API: the page asks for a game to be downloaded, dropped, or counted.
// ---------------------------------------------------------------------------

function reply(event, message) {
  const port = event.ports && event.ports[0];
  if (port) port.postMessage(message);
}

/** Tell every open tab how a download is getting on. */
async function broadcast(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const c of clients) c.postMessage(message);
}

/** How many of `urls` are already in `cache`. */
async function countCached(cache, urls) {
  let have = 0;
  await Promise.all(urls.map((u) => cache.match(u).then((r) => { if (r) have += 1; })));
  return have;
}

async function statusFor(m) {
  const out = {};
  for (const [group, urls] of Object.entries(m.groups)) {
    if (!urls.length) continue;
    const cache = await caches.open(gameCache(group, m.version));
    const have = await countCached(cache, urls);
    out[group] = { total: urls.length, have, bytes: m.bytes[group] ?? 0 };
  }
  return out;
}

/**
 * Download one group into its own cache, a few files at a time so a slow
 * connection still reports progress and a fast one is not throttled.
 */
async function precache(group, m) {
  const urls = m.groups[group] ?? [];
  const cache = await caches.open(gameCache(group, m.version));
  let done = 0;
  let failed = 0;
  const WIDTH = 6;
  const queue = urls.slice();

  const worker = async () => {
    for (;;) {
      const url = queue.shift();
      if (!url) return;
      const already = await cache.match(url);
      if (!already) {
        try {
          // No clone here: nothing else reads this response, and cloning one
          // inside a worker is exactly the thing some environments refuse.
          const res = await fetchForCache(url);
          if (res.ok) await cache.put(url, res);
          else failed += 1;
        } catch {
          failed += 1;
        }
      }
      done += 1;
      if (done % 5 === 0 || done === urls.length) {
        await broadcast({ type: 'precache-progress', group, done, total: urls.length });
      }
    }
  };

  await Promise.all(Array.from({ length: WIDTH }, worker));
  await broadcast({ type: 'precache-done', group, total: urls.length, failed });
  return { total: urls.length, failed };
}

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'skip-waiting') { self.skipWaiting(); return; }

  event.waitUntil(
    (async () => {
      const m = await manifest();
      if (!m) { reply(event, { ok: false, error: 'no manifest' }); return; }

      if (data.type === 'status') {
        reply(event, { ok: true, version: m.version, groups: await statusFor(m) });
        return;
      }
      if (data.type === 'precache') {
        const result = await precache(data.group, m);
        reply(event, { ok: true, ...result });
        return;
      }
      if (data.type === 'evict') {
        await caches.delete(gameCache(data.group, m.version));
        reply(event, { ok: true, groups: await statusFor(m) });
        return;
      }
      reply(event, { ok: false, error: `unknown message ${data.type}` });
    })(),
  );
});
