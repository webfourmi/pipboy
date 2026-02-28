// sw.js — PipBoy PWA (SAFE)
// Stratégie anti-bug "ça reste collé" :
// - HTML (navigation) : network-first (toujours la dernière version si dispo)
// - JS/CSS/JSON : network-first (évite de rester sur un vieux code)
// - Images/icons : cache-first (rapide + offline)
// Bonus: ignore les ?v=… grâce à un cache-key sans querystring.

const CACHE_VERSION = "v29";
const STATIC_CACHE = `pipboy-static-${CACHE_VERSION}`;
const PAGES_CACHE  = `pipboy-pages-${CACHE_VERSION}`;

const PRECACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./icons/favicon.ico",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
];

function keyNoSearch(req) {
  const url = new URL(req.url);
  url.search = "";        // enlève ?v=...
  url.hash = "";
  return url.toString();  // clé string pour cache.put/match
}

function isHTML(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}

function ext(pathname) {
  const i = pathname.lastIndexOf(".");
  return i >= 0 ? pathname.slice(i + 1).toLowerCase() : "";
}

function isImage(pathname) {
  return ["png","jpg","jpeg","webp","svg","ico"].includes(ext(pathname));
}

function isCode(pathname) {
  return ["js","css","json"].includes(ext(pathname));
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);

    // Precache robuste (si un fichier manque, ça n'empêche pas tout d'installer)
    await Promise.all(PRECACHE.map(async (path) => {
      try {
        const req = new Request(path, { cache: "reload" });
        const res = await fetch(req);
        if (res && res.ok) await cache.put(keyNoSearch(req), res.clone());
      } catch {}
    }));

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith("pipboy-") && k !== STATIC_CACHE && k !== PAGES_CACHE)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const key = keyNoSearch(req);

  try {
    const res = await fetch(req);
    if (res && res.ok) await cache.put(key, res.clone());
    return res;
  } catch {
    const cached = await cache.match(key);
    if (cached) return cached;

    // fallback offline HTML
    if (isHTML(req)) {
      const fallback = await caches.match(new Request("./index.html"));
      return fallback || Response.error();
    }
    return Response.error();
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const key = keyNoSearch(req);

  const cached = await cache.match(key);
  if (cached) return cached;

  try {
    const res = await fetch(req);
    if (res && res.ok) await cache.put(key, res.clone());
    return res;
  } catch {
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 1) HTML: network-first
  if (isHTML(req)) {
    event.respondWith(networkFirst(req, PAGES_CACHE));
    return;
  }

  // 2) JS/CSS/JSON: network-first (évite vieux JS en cache)
  if (isCode(url.pathname)) {
    event.respondWith(networkFirst(req, STATIC_CACHE));
    return;
  }

  // 3) images/icons: cache-first
  if (isImage(url.pathname)) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // 4) default: network-first
  event.respondWith(networkFirst(req, STATIC_CACHE));
});
