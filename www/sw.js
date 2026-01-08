const cacheName = "woggle-v15";
const files = [
	"/",
	"/index.html",
	"/v15/style.css",
	"/v15/code.js",
	"/v15/dic_original.json",
	"/v15/dic_target.json",
	"/v15/dic_player.json",
	"/favicon.ico",
	"/favicon-16x16.png",
	"/favicon-32x32.png",
	"/android-chrome-192x192.png",
	"/android-chrome-512x512.png",
	"/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  console.log("[Service Worker] Install");
  e.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      console.log("[Service Worker] Caching all: app shell and content");
      await cache.addAll(files);
    })()
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    (async () => {
      const r = await caches.match(e.request);
      console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
      if (r) {
        return r;
      }
      const response = await fetch(e.request);
      const cache = await caches.open(cacheName);
      console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
      cache.put(e.request, response.clone());
      return response;
    })()
  );
});
