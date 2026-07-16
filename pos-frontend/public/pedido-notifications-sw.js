self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || 'Nuevo pedido online';
  const options = {
    body: payload.body || 'Revisa Pedidos Online para atenderlo.',
    icon: '/images/logo512.png',
    badge: '/images/logo192.png',
    tag: payload.tag || 'ecomarket-pedido-online',
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: { url: payload.url || '/dashboard/pedidos-online' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/dashboard/pedidos-online';

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      const url = new URL(client.url);
      if (url.origin === self.location.origin) {
        await client.focus();
        if ('navigate' in client) {
          return client.navigate(targetUrl);
        }
        return undefined;
      }
    }
    return self.clients.openWindow(targetUrl);
  })());
});
