/**
 * sw.js — Service Worker con estrategia Cache-First
 * Garantiza funcionamiento 100% offline tras la primera carga
 */

const CACHE_STATIC  = 'andresito-static-v1';
const CACHE_DYNAMIC = 'andresito-dynamic-v1';

/* Recursos esenciales a pre-cachear en la instalación */
const PRECACHE_URLS = [
  './',
  './index.html',
  './app.js',
  './data.js',
  './manifest.json'
];

/* ─── INSTALL: pre-cachear núcleo de la app ─── */
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker v1...');

  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => {
        console.log('[SW] Pre-cacheando archivos esenciales');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Pre-caché completado — activando inmediatamente');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Error en pre-caché:', err);
      })
  );
});

/* ─── ACTIVATE: limpiar cachés obsoletas ─── */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando nueva versión...');

  const cachesActuales = [CACHE_STATIC, CACHE_DYNAMIC];

  event.waitUntil(
    caches.keys()
      .then((nombres) =>
        Promise.all(
          nombres
            .filter((nombre) => !cachesActuales.includes(nombre))
            .map((nombre) => {
              console.log('[SW] Eliminando caché obsoleta:', nombre);
              return caches.delete(nombre);
            })
        )
      )
      .then(() => {
        console.log('[SW] Caché actualizada — tomando control de clientes');
        return self.clients.claim();
      })
  );
});

/* ─── FETCH: estrategia Cache-First ─── */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignorar requests que no sean HTTP/HTTPS
  if (!request.url.startsWith('http')) return;

  // Ignorar métodos que no sean GET
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {

        /* ── Cache hit: servir desde caché (offline safe) ── */
        if (cachedResponse) {
          /* Para archivos locales, actualizar caché en segundo plano (stale-while-revalidate) */
          if (request.url.includes(self.location.origin)) {
            fetch(request)
              .then((freshResponse) => {
                if (freshResponse && freshResponse.status === 200) {
                  caches.open(CACHE_STATIC)
                    .then((cache) => cache.put(request, freshResponse));
                }
              })
              .catch(() => { /* Sin conexión — no pasa nada, ya servimos desde caché */ });
          }
          return cachedResponse;
        }

        /* ── Cache miss: ir a la red y guardar respuesta ── */
        return fetch(request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
              return networkResponse;
            }

            const responseClone = networkResponse.clone();
            caches.open(CACHE_DYNAMIC)
              .then((cache) => cache.put(request, responseClone));

            return networkResponse;
          })
          .catch(() => {
            /* Sin red y sin caché — devolver página principal para rutas HTML */
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match('./index.html');
            }
            /* Para otros recursos: respuesta vacía con estado 503 */
            return new Response(
              JSON.stringify({ error: 'Sin conexión a internet' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
      })
  );
});

/* ─── MESSAGE: forzar actualización desde la app ─── */
self.addEventListener('message', (event) => {
  if (event.data?.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
