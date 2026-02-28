// sw.js — PipBoy PWA (v29) compatible modules
const CACHE_VERSION = "v29";
const STATIC_CACHE = `pipboy-static-${CACHE_VERSION}`;
const HTML_CACHE   = `pipboy-html-${CACHE_VERSION}`;

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
    await cache.addAll(PRECACHE);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => {
      if (k.startsWith("pipboy-") && k !== STATIC_CACHE && k !== HTML_CACHE) return caches.delete(k);
    }));
    await self.clients.claim();
  })());
});

function isHTML(req){
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}

function isStaticAsset(url){
  return (
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".json")
  );
}

async function networkFirst(req){
  const cache = await caches.open(HTML_CACHE);
  try{
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }catch{
    return (await cache.match(req)) || caches.match("./index.html");
  }
}

async function cacheFirst(req){
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && res.ok){
    const cache = await caches.open(STATIC_CACHE);
    cache.put(req, res.clone());
  }
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isHTML(req)) return event.respondWith(networkFirst(req));
  if (isStaticAsset(url)) return event.respondWith(cacheFirst(req));
  event.respondWith(cacheFirst(req));
});
