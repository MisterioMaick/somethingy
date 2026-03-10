/*
  Service Worker unificado:
  1. Agrega headers COOP/COEP (necesario para SharedArrayBuffer / FFmpeg)
  2. Cachea archivos para offline (PWA)
*/

const CACHE = "editor-av-v2";

const PRECACHE = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js",
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js",
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.wasm",
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.worker.js",
];

// ── Instalar y cachear ──────────────────────────────────────────
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── Activar y limpiar caches viejos ────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: headers COOP/COEP + cache ───────────────────────────
self.addEventListener("fetch", event => {
  event.respondWith(handleFetch(event.request));
});

async function handleFetch(request) {
  // Primero busca en cache
  const cached = await caches.match(request);
  const base = cached || await fetch(request).then(res => {
    // Guarda en cache si es exitoso
    if (res && res.status === 200) {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(request, clone));
    }
    return res;
  });

  if (!base) return base;

  // Agrega headers COOP/COEP a TODAS las respuestas
  const headers = new Headers(base.headers);
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  headers.set("Cross-Origin-Resource-Policy", "cross-origin");

  return new Response(base.body, {
    status: base.status,
    statusText: base.statusText,
    headers,
  });
}
