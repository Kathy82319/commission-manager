import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import '../styles/PublicLayout.css';

// 定義主題資料型別
interface ThemeSettings {
  primaryColor?: string;
  textColor?: 'white' | 'black';
}

export function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 用於儲存來自子頁面 (PublicProfile) 的主題設定
  const [theme, setTheme] = useState<ThemeSettings>({
    primaryColor: '#ffffff', // 預設值
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

  // 根據使用者設定動態計算 CSS 變數
  // 如果是白字，則背景通常較深；如果是黑字，則背景通常較淺
  const dynamicStyles = {
    '--artist-theme-color': theme.primaryColor,
    '--artist-text-color': theme.textColor === 'white' ? '#ffffff' : '#1a1a1a',
    '--artist-text-contrast': theme.textColor === 'white' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
  } as React.CSSProperties;

  return (
    <div className="public-layout-container" style={dynamicStyles}>
      
      {/* Header 改為絕對定位或固定在右上角，避免干擾左側側邊欄的視覺 */}
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

      {/* 這裡不再使用傳統的 Container 限制寬度，改由 CSS 控制滿版 */}
      <main className={`public-main ${isLegalPage ? 'legal-page' : ''}`}>
        {/* 透過 context 把 setTheme 傳下去，讓 PublicProfile 取得資料後回傳 */}
        <Outlet context={{ setTheme }} />
        
        {isLegalPage && (
          <div className="back-btn-container">
            <button onClick={() => navigate(-1)} className="back-btn">
              回上一頁
            </button>
          </div>
        )}
      </main>

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