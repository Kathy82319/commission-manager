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

  // 根據主色調計算漸層結束色
  // 若為黑字模式(淺色背景)，漸層向白色靠攏；若為白字模式(深色背景)，漸層向黑色靠攏
  const gradientEnd = theme.textColor === 'white' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)';

  const dynamicStyles = {
    '--artist-theme-color': theme.primaryColor,
    '--artist-text-color': theme.textColor === 'white' ? '#ffffff' : '#1a1a1a',
    '--artist-gradient': `linear-gradient(135deg, ${theme.primaryColor} 0%, ${gradientEnd} 100%)`,
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
          <div className="legal-page-wrapper">
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
          </div>
        )}
      </main>
    </div>
  );
}