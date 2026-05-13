const SHELL_CACHE = 'yap-shell-v6';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/css/styles.css',
  '/js/core/config.js',
  '/js/core/utils.js',
  '/js/core/data.js',
  '/js/features/chat.js',
  '/js/app.js',
  '/js/features/pipeline.js',
  '/js/features/recording.js',
  '/js/features/analysis.js',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/yap-logo.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== SHELL_CACHE)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    return;
  }

  const isAppShellAsset =
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.webmanifest');

  if (isAppShellAsset) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const copy = response.clone();
          caches.open(SHELL_CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const copy = response.clone();
        caches.open(SHELL_CACHE).then(cache => cache.put(request, copy));
        return response;
      });
    })
  );
});

self.addEventListener('notificationclick', event => {
  const targetUrl = String(event.notification?.data?.url || self.location.origin || '/');
  event.notification?.close?.();

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    for (const client of clientList) {
      if ('focus' in client) {
        try {
          if ('navigate' in client) {
            await client.navigate(targetUrl);
          }
        } catch {}
        await client.focus();
        return;
      }
    }

    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl);
    }
  })());
});
