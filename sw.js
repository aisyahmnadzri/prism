// PRISM service worker: keeps the app shell available so PRISM opens fast and works with a weak or no signal.
// Strategy: network first (so updates show up straight away), falling back to the saved copy when offline.
// Bump VERSION whenever the list of files changes.
const VERSION = 'prism-v12';
const SHELL = [
  './', 'index.html', 'offline.html',
  'dashboard.html', 'pipeline.html', 'schedule.html', 'approvals.html', 'messages.html', 'notifications.html',
  'accounts.html', 'account.html', 'account-form.html', 'settings.html', 'reports.html', 'audit.html', 'feedback.html', 'tickets.html',
  'css/styles.css',
  'js/pwa.js', 'js/data.js', 'js/auth.js', 'js/schedule.js', 'js/messaging.js', 'js/notifications.js', 'js/settings.js', 'js/approvals.js', 'js/reports.js', 'js/audit.js', 'js/search.js', 'js/feedback.js', 'js/tickets.js', 'js/app.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== VERSION + '-fonts').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fonts: use the saved copy first, they never change.
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(caches.open(VERSION + '-fonts').then(async cache => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // App files: ask the server for the latest version (skipping the browser's short-term cache),
  // save a fresh copy, and fall back to the saved copy when offline (ignoring ?id=… etc.).
  event.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok) { const cache = await caches.open(VERSION); cache.put(req, res.clone()); }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return caches.match('offline.html');
      throw err;
    }
  })());
});
