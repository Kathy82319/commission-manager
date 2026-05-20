// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto', // 確保全自動安全註冊
      includeAssets: ['vite.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      
      // 💡 修正一：不要關閉 manifest！即便是空的或基本配置，也必須給予合法 JSON 宣告，
      // 這能讓瀏覽器正確界定 PWA 在新網域 arti7.net 下的安全沙盒範圍。
      manifest: {
        name: 'Arti 繪師委託管理系統',
        short_name: 'Arti',
        theme_color: '#5D4A3E',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      
      // 💡 修正二：優化 Workbox 商業快取策略，徹底根治複製分頁與 400 憑證閹割錯誤
      workbox: {
        // 1. 強制禁止 Service Worker 攔截任何 API 請求
        navigateFallbackDenylist: [/^\/api/],
        
        // 2. 核心大招：將導航回退（Navigate Fallback）策略強制與當前網域同步，
        // 確保手動輸入網址、複製分頁時，Service Worker 絕對不會用舊有的本地快取去碰撞新網域。
        navigateFallback: '/index.html',
        
        // 3. 設定執行階段的安全性快取路由，確保頁面路由走「網路優先（Network First）」
        // 這能確保任何分頁在複製時，都是跟伺服器拿最新、帶有合法 Cookie 的憑證狀態。
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst', // 👈 關鍵：複製分頁時強制走網路，不走本地瞎猜的快取
            options: {
              cacheName: 'arti-pages-cache',
              networkTimeoutSeconds: 3, // 如果 3 秒斷網才降級用快取
            }
          }
        ]
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