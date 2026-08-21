const CACHE_NAME = 'focus-clock-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Skip chrome-extension or external cross-origin requests that might fail
  if (!event.request.url.startsWith(self.location.origin)) return;

  const request = event.request;
  const isNavigation =
    request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');

  // HTML navigations are NETWORK-FIRST so new deployments take effect immediately;
  // the cached shell is only a fallback when offline.
  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', copy)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Static assets (hashed filenames) use stale-while-revalidate:
  // serve cached instantly, refresh in the background.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const refresh = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);
      return cachedResponse || refresh;
    })
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'Study Block Reminder', body: 'Your scheduled study session is starting now!' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      vibrate: [200, 100, 200],
      data: { url: '/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
