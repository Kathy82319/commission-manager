// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto', 
      includeAssets: ['vite.svg', 'pwa-192x192.png', 'pwa-512x512.png'],

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
      
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        
        navigateFallback: '/index.html',

        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'arti-pages-cache',
              networkTimeoutSeconds: 3,
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