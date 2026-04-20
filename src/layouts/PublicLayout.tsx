import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import '../styles/PublicLayout.css';

interface ThemeSettings {
  primaryColor?: string;
  textColor?: 'white' | 'black';
}

export function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [theme, setTheme] = useState<ThemeSettings>({
    primaryColor: '#ffffff',
    textColor: 'black'
  });

  const handleLoginClick = () => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
    window.location.href = `${API_BASE}/api/auth/line/login`;
  };

  const isLegalPage = 
    location.pathname === '/terms' || 
    location.pathname === '/privacy' || 
    location.pathname === '/refund-policy';

  const dynamicStyles = {
    '--artist-theme-color': theme.primaryColor,
    '--artist-text-color': theme.textColor === 'white' ? '#ffffff' : '#1a1a1a',
  } as React.CSSProperties;

  return (
    <div className="public-layout-container" style={dynamicStyles}>
      <header className="public-header">
        <button 
          onClick={handleLoginClick} 
          className="login-btn"
          style={{ 
            backgroundColor: 'var(--artist-text-color)', 
            color: 'var(--artist-theme-color)' 
          }}
        >
          登入 / 註冊
        </button>
      </header>

      <main className="public-main">
        <Outlet context={{ setTheme }} />
        
        {isLegalPage && (
          <>
            <div className="back-btn-container">
              <button onClick={() => navigate(-1)} className="back-btn">
                回上一頁
              </button>
            </div>
            <footer className="public-footer">
              <div className="footer-links">
                <Link to="/terms">服務條款</Link>
                <span className="footer-divider-text">|</span>
                <Link to="/privacy">隱私權政策</Link>
                <span className="footer-divider-text">|</span>
                <Link to="/refund-policy">退款政策</Link>
                <span className="footer-divider-text">|</span>
                <span className="footer-contact">客服信箱：cath40286@gmail.com</span>
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}