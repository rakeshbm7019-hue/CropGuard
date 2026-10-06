const CACHE_NAME = "cropguard-v3";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.png",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/logo.png",
  "/logo.jpg"
];

// Install Event - Pre-cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener("activate", (event) => {
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

// Fetch Event - Stale-while-revalidate for assets, network-first for API
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET, API calls, XML sitemaps and robots.txt
  if (
    event.request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.endsWith(".xml") ||
    url.pathname.includes("sitemap") ||
    url.pathname === "/robots.txt"
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Push Event - Handles background push messages from server
self.addEventListener("push", (event) => {
  let data = {
    title: "CropGuard Outbreak Radar",
    body: "Real-time crop disease / pest threat detected in your 15km geofence.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "cropguard-outbreak-alert",
    url: "/?tab=outbreaks"
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = Object.assign(data, parsed);
    } catch (_) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    vibrate: [250, 100, 250, 100, 250],
    tag: data.tag || "cropguard-realtime-alert",
    renotify: true,
    data: {
      url: data.url || "/?tab=outbreaks"
    },
    actions: [
      { action: "open_radar", title: "View Radar" },
      { action: "dismiss", title: "Dismiss" }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Event - Opens app and routes to Outbreak Radar
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          if ("navigate" in client && targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Direct Message Event - Shows notification when triggered by client app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, options } = event.data;
    const notificationOptions = {
      body: options?.body || "New agricultural update in your region.",
      icon: options?.icon || "/icon-192.png",
      badge: options?.badge || "/icon-192.png",
      vibrate: options?.vibrate || [200, 100, 200, 100, 200],
      tag: options?.tag || "cropguard-phone-alert",
      renotify: true,
      data: options?.data || { url: "/?tab=outbreaks" },
      actions: [
        { action: "open_radar", title: "View Alert" }
      ]
    };

    self.registration.showNotification(title || "CropGuard Outbreak Radar", notificationOptions);
  }
});
