/* Greenside service worker — installable PWA + web push delivery.
 *
 * This file is intentionally vanilla JavaScript (no bundling) so it can be
 * served as-is from /sw.js.
 */

const CACHE_NAME = "greenside-v1";
const PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/brand/greenside-journeys-icon.svg",
  "/brand/greenside-journeys-horizontal.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

// Network-first for HTML, cache-first for static assets.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isHtml = req.headers.get("accept")?.includes("text/html");

  if (isHtml) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((m) => m ?? caches.match("/"))),
    );
    return;
  }

  // Static: cache first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      });
    }),
  );
});

// Web Push — delivered from the conditions alert engine cron.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Greenside", body: event.data.text() };
  }
  const title = payload.title || "Greenside alert";
  const options = {
    body: payload.body || "",
    icon: "/brand/greenside-journeys-icon.svg",
    badge: "/brand/greenside-journeys-icon.svg",
    data: { url: payload.url || "/dashboard" },
    tag: payload.tag || "greenside-alert",
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const c of clients) {
          if ("focus" in c) {
            c.navigate(targetUrl);
            return c.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      }),
  );
});
