// sw.js — PipBoy PWA (v29)
// Stratégie:
// - HTML: network-first (évite les vieilles versions qui collent)
// - JS/CSS: stale-while-revalidate (rapide + se met à jour)
// - Images/Icons: cache-first (offline-friendly)
// - nettoyage automatique des anciens caches

const CACHE_VERSION = "v29";
const STATIC_CACHE = `pipboy-static-${CACHE_VERSION}`;
const HTML_CACHE   = `pipboy-html-${CACHE_VERSION}`;

// ⚠️ Mets ici TES vrais chemins (modules)
const PRECACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./app.js",

  // core
  "./js/core/dom.js",
  "./js/core/store.js",
  "./js/core/utils.js",

  // features
  "./features/boot.js",
  "./features/tabs.js",
  "./features/modals.js",
  "./features/profiles.js",
  "./features/sheet.js",
  "./features/journal.js",
  "./features/inventory.js",
  "./features/quests.js",
  "./features/io.js",

  // icons
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/favicon.ico"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);

    // ✅ Important: si UN fichier 404, addAll() plante tout.
    // Donc on "best-effort" : on tente un par un.
    await Promise.all(
      PRECACHE.map(async (url) => {
        try {
          await cache.add(url);
        } catch (e) {
          // on log mais on n'empêche pas l'installation
          console.warn("[SW] Precaching failed:", url, e);
        }
      })
    );

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith("pipboy-") && k !== STATIC_CACHE && k !== HTML_CACHE)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Helpers
function isHTML(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}

function isImage(url) {
  return (
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico")
  );
}

function isStatic(url) {
  return (
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".json")
  );
}

// Network-first pour HTML
async function networkFirstHTML(req) {
  const cache = await caches.open(HTML_CACHE);
  try {
    const res = await fetch(req, { cache: "no-store" });
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(req);
    return cached || caches.match("./index.html");
  }
}

// Stale-while-revalidate pour JS/CSS/JSON
async function staleWhileRevalidate(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req).then((res) => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);

  // on renvoie cache si dispo, sinon réseau
  return cached || (await fetchPromise) || caches.match("./index.html");
}

// Cache-first pour images (offline)
async function cacheFirst(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;

  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    // fallback minimal
    return caches.match("./");
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML
  if (isHTML(req)) {
    event.respondWith(networkFirstHTML(req));
    return;
  }

  // Images
  if (isImage(url)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // JS/CSS/JSON
  if (isStatic(url)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // default
  event.respondWith(staleWhileRevalidate(req));
});
