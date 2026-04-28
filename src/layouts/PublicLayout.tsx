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
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [theme, setTheme] = useState<ThemeSettings>({
    primaryColor: '#ffffff',
    textColor: 'black',
    gradientDirection: 'to bottom right' 
  });

  // 1. 檢查登入狀態：監聽路由變化，即時同步 UI 標記
  useEffect(() => {
    const role = localStorage.getItem('user_role'); 
    if (role) {
      setIsLoggedIn(true);
      setUserRole(role);
    } else {
      setIsLoggedIn(false);
      setUserRole(null);
    }
  }, [location]);

  // 2. 登出邏輯：包含後端 Cookie 清除與前端標記清理
  const handleLogout = async () => {
    try {
      // 呼叫後端 logout API 以清除 HttpOnly 的 user_session
      await fetch(`${API_BASE}/api/auth/logout`, { 
        method: 'POST', 
        credentials: 'include' 
      });
    } catch (e) {
      console.error("登出通訊失敗:", e);
    } finally {
      // 無論後端 API 是否成功，前端都必須清理 UI 標記以保護隱私
      localStorage.removeItem('user_role');
      localStorage.removeItem('is_logged_in');
      setIsLoggedIn(false);
      setUserRole(null);
      
      // 登出後導向許願池首頁
      navigate('/wishboard');
    }
  };

  // 3. 回到後台點擊行為
  const handleDashboardClick = () => {
    if (userRole === 'artist') {
      navigate('/artist');
    } else if (userRole === 'client') {
      navigate('/client/orders'); 
    } else {
      navigate('/portal');
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
        <div className="header-actions">
          {isLoggedIn ? (
            <div className="logged-in-group" style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleDashboardClick}
                className="dashboard-btn"
                style={{ 
                  backgroundColor: 'var(--artist-text-color)', 
                  color: 'var(--artist-theme-color)',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                回到管理後台
              </button>
              <button 
                onClick={handleLogout}
                className="logout-btn"
                style={{ 
                  backgroundColor: 'transparent', 
                  color: 'var(--artist-text-color)',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--artist-text-color)',
                  cursor: 'pointer'
                }}
              >
                登出
              </button>
            </div>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className="login-btn"
              style={{ 
                backgroundColor: 'var(--artist-text-color)', 
                color: 'var(--artist-theme-color)' 
              }}
            >
              登入 / 註冊
            </button>
          )}
        </div>
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