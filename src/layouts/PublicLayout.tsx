// src/layouts/PublicLayout.tsx
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/PublicLayout.css'; // 🌟 引入專屬樣式表

export function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleLoginClick = () => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
    window.location.href = `${API_BASE}/api/auth/line/login`;
  };

  const isLegalPage = location.pathname === '/terms' || location.pathname === '/privacy';

  return (
    <div className="public-layout-container">
      
      {/* 頂部列：手機版相對定位，電腦版絕對定位 (由 CSS 控制) */}
      <header className="public-header">
        <button onClick={handleLoginClick} className="login-btn">
          登入 / 註冊
        </button>
      </header>

      {/* 主內容區 */}
      <main className={`public-main ${isLegalPage ? 'legal-page' : ''}`}>
        <Outlet />
        
        {isLegalPage && (
          <div className="back-btn-container">
            <button onClick={() => navigate(-1)} className="back-btn">
              回上一頁
            </button>
          </div>
        )}
      </main>

      {/* 頁尾 */}
      <footer className="public-footer">
        <div className="footer-divider" />
        
        <div className="footer-links">
          <Link to="/terms">服務條款</Link>
          <span className="footer-divider-text">|</span>
          <Link to="/privacy">隱私權政策</Link>
          <span className="footer-divider-text">|</span>
          <span>客服信箱：cath40286@gmail.com</span>
        </div>
      </footer>
    </div>
  );
}