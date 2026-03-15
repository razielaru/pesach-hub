self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/vite.svg',
    badge: '/vite.svg',
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: true,   // ← נשאר על המסך עד שהמשתמש לוחץ
    tag: 'pesach-alert',        // ← מחליף התראה קודמת במקום לשכפל
    renotify: true,             // ← מרטט גם כשמחליף
    data: { url: data.url || '/' }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || '📢 חמ"ל פסח', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // אם האתר פתוח — תביא אותו לפוקוס
      for (const client of clientList) {
        if (client.url.includes('pesach-hub') && 'focus' in client) {
          return client.focus();
        }
      }
      // אחרת — פתח חלון חדש
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/');
      }
    })
  );
});
