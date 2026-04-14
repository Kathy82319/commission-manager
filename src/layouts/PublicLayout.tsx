import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

export function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleLoginClick = () => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
    window.location.href = `${API_BASE}/api/auth/line/login`;
  };

  // 判斷是否為條款頁面
  const isLegalPage = location.pathname === '/terms' || location.pathname === '/privacy';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'transparent' }}>
      
      <header style={{ 
        position: 'absolute', top: 0, right: 0, padding: '20px 24px', 
        display: 'flex', gap: '16px', zIndex: 1000, background: 'transparent' 
      }}>
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
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(93, 74, 62, 0.15)'
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#5D4A3E'; e.currentTarget.style.color = '#FFF'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#5D4A3E'; }}
        >
          登入 / 註冊
        </button>
      </header>

      <main style={{ flex: 1, width: '100%' }}>
        <Outlet />
        
        {/* 🌟 修改項目 1：在條款頁面下方增加「回上一頁」按鈕 */}
        {isLegalPage && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '60px' }}>
            <button 
              onClick={() => navigate(-1)}
              style={{
                padding: '8px 30px',
                backgroundColor: 'transparent',
                color: '#5D4A3E',
                border: '2px solid #5D4A3E',
                borderRadius: '24px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#5D4A3E'; e.currentTarget.style.color = '#FFF'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#5D4A3E'; }}
            >
              回上一頁
            </button>
          </div>
        )}
      </main>

      <footer style={{ 
        padding: '24px 20px', 
        textAlign: 'center',
        background: 'transparent',
        marginTop: 'auto'
      }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '300px', 
          margin: '0 auto 12px auto', 
          borderTop: '1px solid rgba(255, 255, 255, 0.2)' 
        }} />

        {/* 🌟 修改項目 2：調整頁尾文字顏色與清晰度 */}
        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.9)', letterSpacing: '1px' }}>
          <Link 
            to="/terms" 
            style={{ color: 'inherit', textDecoration: 'none', transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            服務條款
          </Link>
          <span style={{ margin: '0 12px', opacity: 0.5 }}>|</span>
          <Link 
            to="/privacy" 
            style={{ color: 'inherit', textDecoration: 'none', transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            隱私權政策
          </Link>
          <span style={{ margin: '0 12px', opacity: 0.5 }}>|</span>
          <span>客服信箱：cath40286@gmail.com</span>
        </div>
      </footer>
    </div>
  );
}