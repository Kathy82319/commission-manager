import { Outlet } from 'react-router-dom';

// 注意這裡使用的是 export function，這樣 App.tsx 裡的 { PublicLayout } 才能正確抓到
export function PublicLayout() {
  return (
    <div style={{ minHeight: '100vh', width: '100%' }}>
      {/* Outlet 會自動把 PublicProfile 等公開頁面的內容塞進來 */}
      <Outlet />
    </div>
  );
}