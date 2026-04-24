// public/sw.js — Workly Service Worker
const CACHE_NAME    = 'workly-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
];

// ── Instalación: cachear assets estáticos ─────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// ── Activación: limpiar caches antiguas ───────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// ── Fetch: Network First para API, Cache First para assets ─
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // API calls — siempre red, nunca cachear
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request).catch(() =>
                new Response(JSON.stringify({ message: 'Sin conexión' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
        );
        return;
    }

    // Assets JS/CSS/fonts — Cache First
    if (request.destination === 'script' || request.destination === 'style' || request.destination === 'font') {
        event.respondWith(
            caches.match(request).then(cached => {
                if (cached) return cached;
                return fetch(request).then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    return response;
                });
            })
        );
        return;
    }

    // Navegación — Network First, fallback a index.html (SPA)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() =>
                caches.match('/index.html')
            )
        );
        return;
    }

    // Resto — Network First
    event.respondWith(
        fetch(request).catch(() => caches.match(request))
    );
});