// sw.js — PipBoy PWA (v25)
// Stratégie:
// - HTML: network-first (pour éviter les vieilles versions qui collent)
// - CSS/JS/images/icons: cache-first (rapide + offline)
// - nettoyage automatique des anciens caches

const CACHE_VERSION = "v25";
const STATIC_CACHE = `pipboy-static-${CACHE_VERSION}`;
const HTML_CACHE   = `pipboy-html-${CACHE_VERSION}`;

// Liste minimaliste: on pré-cache le cœur
const PRECACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/favicon.ico"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE);
      // Active le nouveau SW sans attendre
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Supprime les anciens caches
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("pipboy-") && k !== STATIC_CACHE && k !== HTML_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Helpers
function isHTML(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}

function isStaticAsset(url) {
  // On considère comme "statique" ce qui finit par ces extensions
  return (
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".json")
  );
}

// Network-first pour HTML (évite le problème “ça reste” après update)
async function networkFirst(req) {
  const cache = await caches.open(HTML_CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(req);
    return cached || caches.match("./index.html");
  }
}

// Cache-first pour assets (rapide + offline)
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch (e) {
    // fallback: si on demande un asset et qu’on est offline
    return caches.match("./");
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // On ne gère pas les requêtes non-GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // On ne gère que le même origin (GitHub Pages)
  if (url.origin !== self.location.origin) return;

  // HTML -> network first
  if (isHTML(req)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Assets -> cache first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Par défaut: cache-first
  event.respondWith(cacheFirst(req));
});
