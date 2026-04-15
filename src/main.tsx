import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'



// ========== 👇 請將這段貼在 src/main.tsx 的最上方 👇 ==========
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
  const response = await originalFetch(...args);
  
  // 只要是打給 /api/ 的請求，我們就攔截下來檢查
  if (url?.includes('/api/')) {
    const clone = response.clone();
    const text = await clone.text();
    // 如果伺服器回傳的是 HTML 而不是 JSON
    if (text.trim().toLowerCase().startsWith('<!doctype')) {
      alert(
        `🚨 API 致命錯誤被偵測到了！\n\n` +
        `【目標網址】：\n${url}\n\n` +
        `【錯誤原因】：\n伺服器沒有把這個網址當作 API，反而丟回了前端網頁 (HTML)。\n\n` +
        `【可能解法】：\n1. 檢查上方網址是不是有兩個斜線 (//api/)。\n2. 您的後端 API (_worker.js) 遺失了，沒有成功部署上雲端！`
      );
    }
  }
  return response;
};
// ========== 👆 偵錯程式碼結束 👆 ==========


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
