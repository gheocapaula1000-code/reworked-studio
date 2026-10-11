// Service worker Vaghezze Studio: app disponibile anche senza rete.
// Cambia CACHE a ogni nuova versione: la vecchia cache viene cancellata.
const CACHE = 'vaghezze-studio-v8';
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './install.js', './install.css', './manifest.json',
  './icon.svg', './favicon.ico', './favicon-v4-16.png', './favicon-v4-32.png', './favicon-v4-48.png', './icon-v4-192.png', './icon-v4-512.png', './icon-v4-maskable-192.png', './icon-v4-maskable-512.png',
  './apple-touch-icon-v4.png', './privacy.html', './termini.html', './cookie.html', './legal.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                       // le chiamate API passano dirette
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;         // niente cache per altri siti

  if (req.mode === 'navigate') {
    // Pagine: prima la rete (versione aggiornata), senza rete la copia salvata
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // File dell'app: subito dalla cache, aggiornati in background
  event.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
