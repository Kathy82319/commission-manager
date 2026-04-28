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

  // 1. 抓取本地的登入狀態與角色 (請依據你實際存儲的 key 名稱做調整)
  const token = localStorage.getItem('token'); 
  const userRole = localStorage.getItem('userRole'); // 假設值為 'artist' 或 'client'

  // 2. 動態判斷點擊右上角按鈕的行為
  const handleAuthAction = () => {
    if (token) {
      // 根據角色導回對應的後台
      if (userRole === 'artist') {
        navigate('/artist');
      } else if (userRole === 'client') {
        navigate('/client/orders'); 
      } else {
        navigate('/portal'); // 角色不明確時導向分流頁
      }
    } else {
      // 未登入則導向登入頁
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
          onClick={handleAuthAction} 
          className="login-btn"
          style={{ 
            backgroundColor: 'var(--artist-text-color)', 
            color: 'var(--artist-theme-color)' 
          }}
        >
          {/* 動態顯示按鈕文字 */}
          {token ? '回到管理後台' : '登入 / 註冊'}
        </button>
      </header>

      <main className="public-main">
        <Outlet context={{ setTheme }} />
        
        {/* 只保留「回上一頁」按鈕在法律頁面顯示 */}
        {isLegalPage && (
          <div className="legal-page-wrapper">
            <div className="back-btn-container">
              <button onClick={() => navigate(-1)} className="back-btn">
                回上一頁
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 將 Footer 移出 isLegalPage 的判斷式，讓它在所有 Public 頁面都能顯示 */}
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
  );
}