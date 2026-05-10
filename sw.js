// ASCENDANT Service Worker — v1.0
// Handles push notifications, daily reminders, and streak alerts

const CACHE_NAME = 'ascendant-v1';
const URLS_TO_CACHE = [
  '/Ascendant/',
  '/Ascendant/index.html',
  '/Ascendant/manifest.json',
];

// ── INSTALL — cache core files ──
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE).catch(() => {}))
  );
});

// ── ACTIVATE — clean old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── FETCH — network first, fallback to cache ──
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── PUSH NOTIFICATIONS ──
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'ASCENDANT';
  const options = {
    body: data.body || 'The Protocol is waiting.',
    icon: '/Ascendant/icon-192.png',
    badge: '/Ascendant/icon-192.png',
    tag: data.tag || 'ascendant-general',
    renotify: data.renotify || false,
    requireInteraction: data.requireInteraction || false,
    data: { url: data.url || '/Ascendant/' },
    actions: data.actions || [],
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── NOTIFICATION CLICK ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/Ascendant/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('/Ascendant/') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ── SCHEDULED NOTIFICATIONS via postMessage ──
// The app sends a message to schedule a local notification
self.addEventListener('message', event => {
  if (!event.data) return;
  const { type, payload } = event.data;

  if (type === 'SCHEDULE_NOTIFICATION') {
    const { delay, title, body, tag } = payload;
    setTimeout(() => {
      self.registration.showNotification(title || 'ASCENDANT', {
        body: body || 'The Protocol is waiting.',
        icon: '/Ascendant/icon-192.png',
        badge: '/Ascendant/icon-192.png',
        tag: tag || 'ascendant-reminder',
        vibrate: [200, 100, 200],
        data: { url: '/Ascendant/' },
      });
    }, delay || 0);
  }

  if (type === 'CANCEL_NOTIFICATION') {
    self.registration.getNotifications({ tag: payload.tag }).then(notes => {
      notes.forEach(n => n.close());
    });
  }
});
