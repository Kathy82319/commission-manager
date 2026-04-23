import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import '../styles/PublicLayout.css';

interface ThemeSettings {
  primaryColor?: string;
  textColor?: 'white' | 'black';
  gradientDirection?: string;
}

export function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [theme, setTheme] = useState<ThemeSettings>({
    primaryColor: '#ffffff',
    textColor: 'black',
    gradientDirection: 'to bottom right' 
  });

  const handleLoginClick = () => {
    navigate('/login');
  };

  const isLegalPage = 
    location.pathname === '/terms' || 
    location.pathname === '/privacy' || 
    location.pathname === '/refund-policy';

  const color = theme.primaryColor || '#ffffff';
  const isWhiteText = theme.textColor === 'white';
  
  const mainGradientEnd = isWhiteText ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)';
  
  const sidebarGradientStart = color;
  const sidebarGradientEnd = isWhiteText ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)';

  const dynamicStyles = {
    '--artist-theme-color': color,
    '--artist-text-color': isWhiteText ? '#ffffff' : '#1a1a1a',
    '--artist-main-gradient': `linear-gradient(${theme.gradientDirection}, ${color} 0%, ${mainGradientEnd} 100%)`,
    '--artist-sidebar-gradient': `linear-gradient(to bottom, ${sidebarGradientStart} 0%, ${sidebarGradientEnd} 100%)`,
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