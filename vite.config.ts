import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: false // 因為我們在 public 手動建立 manifest.json 了，這裡設 false 避免衝突
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