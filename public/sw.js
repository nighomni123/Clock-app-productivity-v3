const CACHE_NAME = 'focus-clock-v7';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  // Focus-backdrop ambient loops. Precached so a focus session has audio even
  // before the files have ever been played on this device; they are also picked
  // up by the stale-while-revalidate handler below on first playback.
  //
  // Deliberately *not* listed: /themes/audio/seaside_waves.ogg (2.8 MB). Precaching
  // it would add that to every install for one backdrop, so it caches on first
  // play instead and is offline from then on. The lazily-loaded p5 chunk has a
  // build-time hash and cannot be named here; it is cached the same way.
  '/themes/audio/music_ambient_drift.ogg',
  '/themes/audio/forest_ambience.mp3',
  '/themes/audio/music_midnight.ogg',
  '/themes/audio/music_lofi.mp3',
  '/themes/audio/music_deep_focus.ogg',
  '/themes/audio/music_piano.wav',
  '/themes/audio/library_fireplace.ogg',
  '/themes/audio/rain_window.m4a',
  '/themes/audio/snowfall_wind.m4a'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // allSettled (not addAll) so one missing optional asset cannot silently
      // drop the entire precache list.
      return Promise.allSettled(ASSETS_TO_CACHE.map((url) => cache.add(url)));
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

  // Media elements (the focus-backdrop ambient loops) issue Range requests.
  // Answer those straight from the network so a partial 206 is never written to
  // the cache under the full-file key; offline, the precached 200 copy is
  // served instead, which satisfies the requested byte range.
  if (request.headers.get('range')) {
    event.respondWith(fetch(request).catch(() => caches.match(request.url)));
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
