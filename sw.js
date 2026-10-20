// Guarda la app en el móvil para que abra sin conexión.
// Sirve lo guardado al momento y lo renueva en segundo plano.
const CACHE = 'pater-v3';
// Sin './': en la web, la carpeta redirige a index.html y una respuesta redirigida no vale para abrir la app.
const ARCHIVOS = [
  'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k.startsWith('pater-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const guardada = await cache.match(e.request, { ignoreSearch: true });
      const red = fetch(e.request)
        .then(r => { if (r.ok) cache.put(e.request, r.clone()); return r; })
        .catch(() => guardada || cache.match('index.html'));
      if (guardada) { e.waitUntil(red.catch(() => {})); return guardada; }
      return red;
    })
  );
});
