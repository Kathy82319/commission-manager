import { Outlet, Link } from 'react-router-dom';

export function PublicLayout() {
  
  const handleLoginClick = () => {
    // 🌟 微調：改為使用環境變數，保持與其他元件一致
    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
    window.location.href = `${API_BASE}/api/auth/line/login`;
  };

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
          borderTop: '1px solid rgba(93, 74, 62, 0.15)' 
        }} />
        
        <div style={{ fontSize: '11px', color: 'rgba(93, 74, 62, 0.4)', letterSpacing: '1px' }}>
          <Link 
            to="/terms" 
            style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(93, 74, 62, 0.8)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(93, 74, 62, 0.4)'}
          >
            服務條款
          </Link>
          <span style={{ margin: '0 12px', opacity: 0.5 }}>|</span>
          <Link 
            to="/privacy" 
            style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(93, 74, 62, 0.8)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(93, 74, 62, 0.4)'}
          >
            隱私權政策
          </Link>
        </div>
      </footer>
    </div>
  );
}