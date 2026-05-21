// src/main.tsx
/// <reference types="vite-plugin-pwa/client" />
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { registerSW } from 'virtual:pwa-register'

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {

      if (registration.active?.scriptURL.includes('pages.dev') || window.location.hostname === 'arti7.net') {
        registration.unregister().then((success) => {
          if (success) {
            console.log('[Domain Migration] 成功註銷舊有網域的 Service Worker 快取殘留');
            
            if ('caches' in window) {
              caches.keys().then((names) => {
                for (const name of names) {
                  caches.delete(name);
                }
                console.log('[Domain Migration] 舊網域靜態快取清除完畢');
              });
            }
          }
        });
      }
    }
  }).catch((err) => {
    console.error('[Migration Error] 無法取得 Service Worker 清單:', err);
  });

  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)