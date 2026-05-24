/// <reference types="vite-plugin-pwa/client" />
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.tsx'

import { registerSW } from 'virtual:pwa-register'

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
});

if ('serviceWorker' in navigator) {
  // 清掉舊的 navigation 快取（會導致 redirect mode 錯誤）
  if ('caches' in window) {
    caches.delete('arti-pages-cache').catch(() => {});
  }

  // 若有跨網域殘留的舊 SW（例如 pages.dev 的 SW 跑在 arti7.net），才 unregister
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      const swOrigin = registration.active?.scriptURL
        ? new URL(registration.active.scriptURL).origin
        : null;
      if (swOrigin && swOrigin !== window.location.origin) {
        registration.unregister();
      }
    }
  }).catch(() => {});

  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
)