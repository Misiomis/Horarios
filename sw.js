const CACHE_STATIC  = 'andresito-static-v2';
const CACHE_DYNAMIC = 'andresito-dynamic-v2';

const PRECACHE_URLS = [
  './',
  './index.html',
  './app.js',
  './data.js',
  './style.css',
  './admin.html',
  './manifest.json'
];

/* config.json uses network-first so admin changes propagate immediately */
const NETWORK_FIRST = ['./config.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => console.error('[SW] Pre-cache error:', err))
  );
});

self.addEventListener('activate', (event) => {
  const current = [CACHE_STATIC, CACHE_DYNAMIC];
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => !current.includes(n)).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!request.url.startsWith('http') || request.method !== 'GET') return;

  const url = new URL(request.url);
  const isNetworkFirst = NETWORK_FIRST.some(p => url.pathname.endsWith(p.replace('./', '/')));

  if (isNetworkFirst) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_STATIC).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        if (request.url.includes(self.location.origin)) {
          fetch(request).then((fresh) => {
            if (fresh && fresh.status === 200) {
              caches.open(CACHE_STATIC).then((c) => c.put(request, fresh));
            }
          }).catch(() => {});
        }
        return cached;
      }

      return fetch(request).then((res) => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_DYNAMIC).then((c) => c.put(request, clone));
        return res;
      }).catch(() => {
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
        return new Response(
          JSON.stringify({ error: 'Sin conexión' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.action === 'skipWaiting') self.skipWaiting();
});
