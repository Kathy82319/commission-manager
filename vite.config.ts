// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: false,
      // 🌟 商業邏輯優化：強制配置 Workbox 路由黑名單，徹底禁止 Service Worker 攔截任何 API 請求
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787', 
        changeOrigin: true,
      }
    }
  }
});