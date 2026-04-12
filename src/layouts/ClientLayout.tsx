import { Outlet, useNavigate, useLocation } from 'react-router-dom';

export function ClientLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/client' || location.pathname === '/client/home';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#778ca4', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      
      {/* 主要內容區：移除預設 padding，交由子頁面自行決定 */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}