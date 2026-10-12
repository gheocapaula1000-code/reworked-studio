// Service worker Vaghezze Studio: app disponibile anche senza rete.
// Cambia CACHE a ogni nuova versione: la vecchia cache viene cancellata.
const CACHE = 'vaghezze-studio-v9';
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './install.js', './install.css', './manifest.json',
  './icon.svg', './favicon.ico', './favicon-v4-16.png', './favicon-v4-32.png', './favicon-v4-48.png', './icon-v4-192.png', './icon-v4-512.png', './icon-v4-maskable-192.png', './icon-v4-maskable-512.png',
  './apple-touch-icon-v4.png', './apple-touch-icon.png', './privacy.html', './termini.html', './cookie.html', './legal.css'
];

// I file con estensione (icone, immagini, manifest) non sono pagine:
// se rispondessi con l'HTML, iPhone mostrerebbe una lettera al posto dell'icona.
const FILE = /\.[a-z0-9]+$/i;

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

  // Solo le vere pagine (senza estensione) possono ricadere sull'HTML.
  if (!FILE.test(url.pathname) && req.mode === 'navigate') {
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
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const net = fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
