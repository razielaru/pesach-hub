self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/vite.svg', // תוכל להחליף ללוגו הרבנות בהמשך
      badge: '/vite.svg',
      vibrate: [200, 100, 200, 100, 200], // רטט מבצעי
      data: { url: data.url || '/' }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
