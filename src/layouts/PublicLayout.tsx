// src/layouts/PublicLayout.tsx
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/PublicLayout.css'; 

export function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleLoginClick = () => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
    window.location.href = `${API_BASE}/api/auth/line/login`;
  };

  const isLegalPage = 
    location.pathname === '/terms' || 
    location.pathname === '/privacy' || 
    location.pathname === '/refund-policy';

  return (
    <div className="public-layout-container">
      
      <header className="public-header">
        <button onClick={handleLoginClick} className="login-btn">
          登入 / 註冊
        </button>
      </header>

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

      <footer className="public-footer">
        <div className="footer-divider" />
        
        <div className="footer-links">
          <Link to="/terms">服務條款</Link>
          <span className="footer-divider-text">|</span>
          <Link to="/privacy">隱私權政策</Link>
          <span className="footer-divider-text">|</span>
          <Link to="/refund-policy">退款政策</Link>
          <span className="footer-divider-text">|</span>
          <span>客服信箱：cath40286@gmail.com</span>
        </div>
      </footer>
    </div>
  );
}