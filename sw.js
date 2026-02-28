// sw.js — MODE SECOURS (v30)
// Objectif: ne plus casser l'app. Pas de cache. Nettoie les vieux caches.

const CLEAN_PREFIX = "pipboy-";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // supprime tous les caches pipboy-*
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith(CLEAN_PREFIX)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Pas de stratégie cache: on laisse le navigateur faire un fetch normal.
self.addEventListener("fetch", (event) => {
  // Important: ne pas répondre avec caches.match.
  // On laisse passer en réseau (ou cache navigateur standard).
  return;
});
