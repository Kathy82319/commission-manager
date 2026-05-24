/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

// 當新 SW 啟動時，清掉舊的 navigation 快取（會造成 redirect mode 錯誤）
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.delete('arti-pages-cache').then(() => self.clients.claim())
  );
});

self.skipWaiting();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA 路由：所有非 /api 的導航都回傳 index.html，由 React Router 處理
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api/],
  })
);
