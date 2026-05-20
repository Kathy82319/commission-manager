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

// 🌟 商業邏輯優化：全體使用者自動大掃除與自適應網域修復機制
if ('serviceWorker' in navigator) {
  // 1. 執行多網域轉移時的緩存與快取大掃除
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      // 如果發現註冊的 Service Worker 腳本路徑包含舊網域，或者為了保險起見，在新舊網域更換的過渡期內
      // 強制將舊有的 Service Worker 註銷，逼迫瀏覽器重新向當前新網域請求最新路由
      if (registration.active?.scriptURL.includes('pages.dev') || window.location.hostname === 'arti7.net') {
        registration.unregister().then((success) => {
          if (success) {
            console.log('[Domain Migration] 成功註銷舊有網域的 Service Worker 快取殘留');
            
            // 強制清除瀏覽器的 Cache Storage，防止舊網域的靜態 index.html / js 被本地快取劫持
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

  // 2. 正常註冊當前自訂網域（arti7.net）所對應的全新 Service Worker
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)