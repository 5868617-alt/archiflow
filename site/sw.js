// ArchiFlow service worker: makes the app installable and lets it open offline.
// It only handles this site's own files. Anything from another host (React and pdf.js from cdnjs,
// Google Fonts, the Supabase project) is never touched: the browser loads it directly as usual.
const VERSION = 'mvp5lvgh';
const SHELL = 'archiflow-shell-' + VERSION;
const SHELL_FILES = ['/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  // drop every older cache, including the ones from the first version of this worker
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // other hosts: not ours to handle
  if (req.mode === 'navigate') {
    // the page: always the newest version when online, the last copy when offline
    e.respondWith(
      fetch(req)
        .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put('/index.html', copy)); } return res; })
        .catch(() => caches.match('/index.html').then((hit) => hit || Response.error()))
    );
    return;
  }
  if (SHELL_FILES.includes(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});
