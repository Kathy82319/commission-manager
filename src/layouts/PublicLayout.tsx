import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import '../styles/PublicLayout.css';

interface ThemeSettings {
  primaryColor?: string;
  textColor?: 'white' | 'black';
  gradientDirection?: string;
}

export function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [theme, setTheme] = useState<ThemeSettings>({
    primaryColor: '#ffffff',
    textColor: 'black',
    gradientDirection: 'to bottom right' 
  });

  // 1. 檢查登入狀態：不再依賴 localStorage.getItem('token')
  // 而是檢查你的應用程式是否有存下 user_role 或其他登入後的標記
  useEffect(() => {
    // 假設你的前端登入後（例如在 Portal 選完角色後），有將角色存入 localStorage
    const role = localStorage.getItem('user_role'); 
    
    // 如果有 user_role，我們就「假定」他已經登入，讓按鈕變為「回後台」
    if (role) {
      setIsLoggedIn(true);
      setUserRole(role);
    } else {
      setIsLoggedIn(false);
      setUserRole(null);
    }
  }, [location]);

  // 2. 按鈕點擊行為
  const handleAuthClick = () => {
    if (isLoggedIn) {
      if (userRole === 'artist') {
        navigate('/artist');
      } else if (userRole === 'client') {
        navigate('/client/orders'); 
      } else {
        navigate('/portal');
      }
    } else {
      // 若尚未登入，導向你設定的登入頁面
      navigate('/login');
    }
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
          onClick={handleAuthClick}
          className="login-btn"
          style={{ 
            backgroundColor: 'var(--artist-text-color)', 
            color: 'var(--artist-theme-color)' 
          }}
        >
          {isLoggedIn ? '回到管理後台' : '登入 / 註冊'}
        </button>
      </header>

      <main className="public-main">
        <Outlet context={{ setTheme }} />
        
        <div className={`legal-page-wrapper ${!isLegalPage ? 'footer-only' : ''}`}>
          {isLegalPage && (
            <div className="back-btn-container">
              <button onClick={() => navigate(-1)} className="back-btn">
                回上一頁
              </button>
            </div>
          )}
          
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
      </main>
    </div>
  );
}