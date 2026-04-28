import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react'; // 引入 useEffect 來監聽狀態
import '../styles/PublicLayout.css';

interface ThemeSettings {
  primaryColor?: string;
  textColor?: 'white' | 'black';
  gradientDirection?: string;
}

export function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 新增狀態來追蹤登入資訊
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [theme, setTheme] = useState<ThemeSettings>({
    primaryColor: '#ffffff',
    textColor: 'black',
    gradientDirection: 'to bottom right' 
  });

  // 每當路由改變時，重新檢查登入狀態
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('user_role'); // 確保你的登入邏輯有存入此欄位
    setIsLoggedIn(!!token);
    setUserRole(role);
  }, [location]);

  // 按鈕點擊後的邏輯判斷
  const handleAuthClick = () => {
    if (isLoggedIn) {
      // 根據角色導向不同後台[cite: 1]
      if (userRole === 'artist') {
        navigate('/artist');
      } else if (userRole === 'client') {
        navigate('/client/orders'); 
      } else {
        navigate('/portal'); // 角色不明確時送去分流頁[cite: 1]
      }
    } else {
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
          onClick={handleAuthClick} // 改用新的處理函數
          className="login-btn"
          style={{ 
            backgroundColor: 'var(--artist-text-color)', 
            color: 'var(--artist-theme-color)' 
          }}
        >
          {/* 根據登入狀態動態顯示文字 */}
          {isLoggedIn ? '回到管理後台' : '登入 / 註冊'}
        </button>
      </header>

      <main className="public-main">
        <Outlet context={{ setTheme }} />
        
        {/* 這裡我們將 footer 移出 isLegalPage 的判斷，讓它全域顯示 */}
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