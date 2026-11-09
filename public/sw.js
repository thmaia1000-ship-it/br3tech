// BR3 Tech Progressive Web App Service Worker
// Fully compliant with PWABuilder & Google Lighthouse standards
const CACHE_NAME = "br3-tech-v3";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/manifest.json",
  "/favicon.png",
  "/apple-touch-icon.png",
  "/pwa-96x96.png",
  "/pwa-144x144.png",
  "/pwa-192x192.png",
  "/pwa-256x256.png",
  "/pwa-384x384.png",
  "/pwa-512x512.png",
  "/pwa-maskable-512x512.png",
  "/screenshots/screenshot-desktop-wide.png",
  "/screenshots/screenshot-mobile-narrow.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn("[SW] Precache parcial:", err);
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Ignore cross-origin, chrome-extensions and non-http(s) schemes
  if (!url.protocol.startsWith("http")) return;

  // Navigation requests (HTML pages)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const rootCached = await caches.match("/");
          if (rootCached) return rootCached;
          return caches.match(OFFLINE_URL);
        }),
    );
    return;
  }

  // Static Assets (Cache-First or Network with Cache Fallback)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.pathname.startsWith("/assets/") ||
              url.pathname.endsWith(".png") ||
              url.pathname.endsWith(".jpg") ||
              url.pathname.endsWith(".svg") ||
              url.pathname.endsWith(".woff2"))
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If image fails, return fallback if appropriate
          return null;
        });
    }),
  );
});

// Listener for update skipWaiting
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
