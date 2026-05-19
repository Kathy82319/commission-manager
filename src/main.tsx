// src/main.tsx
/// <reference types="vite-plugin-pwa/client" />
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 引入 PWA Service Worker 註冊方法
import { registerSW } from 'virtual:pwa-register'

// 攔截並阻止瀏覽器自動跳出「加到主畫面」的底部安裝橫幅，改為讓使用者手動安裝
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
});

// 主動註冊 Service Worker，喚醒 PWA 核心功能（包含紅點 Badge 支援）
if ('serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)