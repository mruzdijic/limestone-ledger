/* Service worker: keeps the site working on a weak signal once loaded.
   It only caches this site's own files. It never sees or stores photos.
   If you change index.html, bump VERSION so phones pick up the new copy. */
const VERSION = "ledger-v4";
const FILES = ["./", "index.html", "icon.svg", "manifest.webmanifest",
  "fonts/fraunces-latin-400-normal.woff2", "fonts/fraunces-latin-400-italic.woff2", "fonts/fraunces-latin-600-normal.woff2",
  "fonts/fraunces-latin-700-normal.woff2", "fonts/caveat-latin-500-normal.woff2", "fonts/caveat-latin-700-normal.woff2"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Network first (so edits show up), falling back to the cached copy after 4 seconds or when offline.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const network = fetch(req).then(res => {
      if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
      return res;
    });
    const timeout = new Promise(r => setTimeout(r, 4000, null));
    try {
      const res = await Promise.race([network, timeout]);
      if (res) return res;
    } catch (err) { /* offline */ }
    const cached = await cache.match(req, { ignoreSearch: true }) ||
      (req.mode === "navigate" ? await cache.match("index.html") : null);
    return cached || network;
  })());
});
