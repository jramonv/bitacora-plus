/// <reference lib="webworker" />

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

declare const self: ServiceWorkerGlobalScope;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { precaching, routing, strategies, core } = (self as any).workbox || {};

// Ensure service worker takes control immediately
self.addEventListener('install', () => self.skipWaiting());
if (core?.clientsClaim) {
  core.clientsClaim();
}

// Precache assets (self.__WB_MANIFEST will be replaced at build time if available)
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  precaching?.precacheAndRoute((self as any).__WB_MANIFEST || []);
} catch {
  // no manifest, ignore
}

// Cache static resources
if (routing && strategies) {
  routing.registerRoute(
    ({ request }) => ['style', 'script', 'worker', 'image', 'font'].includes(request.destination),
    new strategies.StaleWhileRevalidate()
  );

  // Cache API requests for /tasks and /evidence
  routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/tasks') || url.pathname.startsWith('/evidence'),
    new strategies.NetworkFirst()
  );
}
