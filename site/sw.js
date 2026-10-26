// ArchiFlow service worker: makes the app installable and fast to open.
// It never caches data: requests to the Supabase project always go to the network.
const VERSION = 'mvozndto';
const SHELL = 'archiflow-shell-' + VERSION;
const STATIC = 'archiflow-static-v1';
const SHELL_FILES = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];
const STATIC_HOSTS = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('archiflow-shell-') && k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('.supabase.co')) return; // data and files: always live
  if (req.mode === 'navigate' && url.origin === self.location.origin) {
    // the page itself: newest version when online, cached copy when offline
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(SHELL).then((c) => c.put('/index.html', copy)); return res; }).catch(() => caches.match('/index.html')));
    return;
  }
  if (url.origin === self.location.origin || STATIC_HOSTS.includes(url.hostname)) {
    // versioned libraries, fonts and icons: cache first, refresh in the background
    e.respondWith(caches.open(STATIC).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
