import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
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
  const [, setUserRole] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [theme, setTheme] = useState<ThemeSettings>({
    primaryColor: '#ffffff',
    textColor: 'black',
    gradientDirection: 'to bottom right'
  });

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (role) {
      setIsLoggedIn(true);
      setUserRole(role);
    } else {
      setIsLoggedIn(false);
      setUserRole(null);
    }
    setMenuOpen(false);
  }, [location]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      console.error('登出通訊失敗:', e);
    } finally {
      localStorage.removeItem('user_role');
      localStorage.removeItem('is_logged_in');
      window.location.href = '/';
    }
  };

  const handleDashboardClick = () => {
    const lastActiveRole = localStorage.getItem('last_active_role') || localStorage.getItem('user_role');
    if (lastActiveRole === 'artist') navigate('/artist/queue');
    else if (lastActiveRole === 'client') navigate('/client/orders');
    else navigate('/portal');
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

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
      <Helmet>
        <title>Arti 繪師小幫手</title>
        <meta property="og:title" content="Arti 繪師小幫手" />
        <meta property="og:type" content="website" />
      </Helmet>

      <header className="public-header">
        <div className="header-left">
          <Link to="/" className="header-logo">✦ Arti</Link>
          <nav className="header-nav">
            <Link to="/announcements" className={`header-nav-link${isActive('/announcements') ? ' active' : ''}`}>
              最新公告
            </Link>
            <Link to="/guide" className={`header-nav-link${isActive('/guide') ? ' active' : ''}`}>
              使用教學 &amp; Q&amp;A
            </Link>
            <Link to="/wishboard" className={`header-nav-link${isActive('/wishboard') ? ' active' : ''}`}>
              許願池
            </Link>
          </nav>
        </div>

        <div className="header-right">
          {isLoggedIn ? (
            <div className="header-auth-group">
              <button onClick={handleDashboardClick} className="header-btn-outline">
                後台
              </button>
              <button onClick={handleLogout} className="header-btn-ghost">
                登出
              </button>
            </div>
          ) : (
            <button onClick={() => navigate('/login')} className="header-btn-primary">
              登入 / 註冊
            </button>
          )}
          <button
            className="header-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="選單"
          >
            <span className={`hamburger-icon${menuOpen ? ' open' : ''}`} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="header-mobile-menu">
          <Link to="/announcements" className="mobile-menu-link">最新公告</Link>
          <Link to="/guide" className="mobile-menu-link">使用教學 &amp; Q&amp;A</Link>
          <Link to="/wishboard" className="mobile-menu-link">許願池</Link>
          <div className="mobile-menu-divider" />
          {isLoggedIn ? (
            <>
              <button onClick={handleDashboardClick} className="mobile-menu-link">後台</button>
              <button onClick={handleLogout} className="mobile-menu-link mobile-menu-link--muted">登出</button>
            </>
          ) : (
            <button onClick={() => navigate('/login')} className="mobile-menu-link mobile-menu-link--primary">登入 / 註冊</button>
          )}
        </div>
      )}

      <main className="public-main">
        <Outlet context={{ setTheme }} />
        <div className={`legal-page-wrapper ${!isLegalPage ? 'footer-only' : ''}`}>
          {isLegalPage && (
            <div className="back-btn-container">
              <button onClick={() => navigate(-1)} className="back-btn">回上一頁</button>
            </div>
          )}
          <footer className="public-footer">
            <div className="footer-links">
              <Link to="/terms">服務條款</Link>
              <span className="footer-divider-text">|</span>
              <Link to="/privacy">隱私權政策</Link>
              <span className="footer-divider-text">|</span>
              <Link to="/refund-policy">退款政策</Link>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
