import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 🌟 加入這段 server 設定
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787', // 這是 Wrangler (Worker) 預設的本機 Port
        changeOrigin: true,
      }
    }
  }
});