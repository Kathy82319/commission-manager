// src/layouts/PublicLayout.tsx
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

export function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleLoginClick = () => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
    window.location.href = `${API_BASE}/api/auth/line/login`;
  };

  const isLegalPage = location.pathname === '/terms' || location.pathname === '/privacy';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'transparent' }}>
      
      {/* 頂部列：手機版改為相對定位，避免遮擋內容；電腦版維持絕對定位 */}
      <header style={{ 
        position: 'relative', 
        padding: '20px', 
        display: 'flex', 
        justifyContent: 'flex-end', 
        zIndex: 1000 
      }} className="md:absolute md:top-0 md:right-0 md:padding-24">
        <button 
          onClick={handleLoginClick} 
          style={{
            padding: '8px 20px',
            backgroundColor: 'transparent',
            color: '#5D4A3E',
            border: '2px solid #5D4A3E',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(93, 74, 62, 0.15)'
          }}
        >
          登入 / 註冊
        </button>
      </header>

      <main style={{ flex: 1, width: '100%', paddingTop: isLegalPage ? '20px' : '0' }}>
        <Outlet />
        
        {isLegalPage && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '60px', padding: '0 20px' }}>
            <button 
              onClick={() => navigate(-1)}
              style={{
                width: '100%',
                maxWidth: '200px',
                padding: '10px 30px',
                backgroundColor: 'transparent',
                color: '#5D4A3E',
                border: '2px solid #5D4A3E',
                borderRadius: '24px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              回上一頁
            </button>
          </div>
        )}
      </main>

      {/* 頁尾：手機版文字改為垂直堆疊以增加清晰度 */}
      <footer style={{ 
        padding: '30px 20px', 
        textAlign: 'center',
        background: 'transparent',
        marginTop: 'auto'
      }}>
        <div style={{ 
          width: '60px', 
          margin: '0 auto 20px auto', 
          borderTop: '1px solid rgba(255, 255, 255, 0.3)' 
        }} />

        <div style={{ 
          fontSize: '13px', 
          color: 'rgba(255, 255, 255, 0.9)', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          alignItems: 'center'
        }} className="md:flex-row md:justify-center md:gap-0">
          <div style={{ display: 'flex', gap: '16px' }}>
            <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>服務條款</Link>
            <span style={{ opacity: 0.5 }} className="hidden md:inline">|</span>
            <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>隱私權政策</Link>
          </div>
          <span style={{ opacity: 0.5 }} className="hidden md:inline">|</span>
          <span>客服信箱：cath40286@gmail.com</span>
        </div>
      </footer>
    </div>
  );
}