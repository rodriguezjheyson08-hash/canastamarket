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
