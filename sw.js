// Offline support: keeps a copy of the game so it opens without a connection.
// The page itself is fetched fresh whenever there is a connection, so updates
// show up on the next visit; everything else is served from the copy and
// refreshed in the background.

const CACHE = 'hold-the-line-v1';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !fonts) return;   // e.g. Buy Me a Coffee

  const save = res => {
    if (res && (res.ok || res.type === 'opaque')) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  };

  // The game page: newest when online, saved copy when not
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(save).catch(() =>
        caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./')))
    );
    return;
  }

  // Everything else: saved copy straight away, refreshed in the background
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(save).catch(() => hit);
      return hit || net;
    })
  );
});
