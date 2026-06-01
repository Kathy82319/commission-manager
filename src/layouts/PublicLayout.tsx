import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
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

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!isLoggedIn) { setUnreadCount(0); setNotifications([]); return; }
    const role = localStorage.getItem('last_active_role') || localStorage.getItem('user_role') || 'client';
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/notifications?role=${role}`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) { setUnreadCount(data.unreadCount); setNotifications(data.notifications); }
      } catch {}
    };
    fetchNotifications();
    const id = setInterval(fetchNotifications, 15000);
    return () => clearInterval(id);
  }, [isLoggedIn, API_BASE]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenNotifMenu = async () => {
    const next = !showNotifMenu;
    setShowNotifMenu(next);
    if (next && unreadCount > 0) {
      setUnreadCount(0);
      const role = localStorage.getItem('last_active_role') || localStorage.getItem('user_role') || 'client';
      try {
        await fetch(`${API_BASE}/api/notifications/read?role=${role}`, { method: 'POST', credentials: 'include' });
      } catch {}
    }
  };

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
      window.location.reload();
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
      {isLoggedIn && (
        <div ref={notifRef} style={{ position: 'fixed', top: '20px', right: '24px', zIndex: 9999 }}>
          <div
            onClick={handleOpenNotifMenu}
            style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #e5e7eb', position: 'relative' }}
          >
            <Bell size={22} color="#4b5563" />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 'bold', height: '20px', minWidth: '20px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid white' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          {showNotifMenu && (
            <div style={{ position: 'absolute', top: '55px', right: '0', width: '340px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', fontWeight: 'bold', borderBottom: '1px solid #f3f4f6', background: '#f9fafb', color: '#374151' }}>系統通知</div>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '30px 24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>目前沒有新通知</div>
                ) : notifications.slice(0, Math.max(unreadCount, 5)).map((n: any) => (
                  <div
                    key={n.id}
                    onClick={() => { setShowNotifMenu(false); navigate(n.link); }}
                    style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: n.isUnread ? '#f0f7ff' : 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = n.isUnread ? '#e0f0ff' : '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = n.isUnread ? '#f0f7ff' : 'transparent'}
                  >
                    {n.isUnread && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0, marginRight: '10px' }} />}
                    <div style={{ flex: 1, paddingRight: '12px' }}>
                      <div style={{ fontSize: '14px', color: '#1f2937', marginBottom: '6px', lineHeight: '1.4' }}>{n.text}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>{new Date(n.time).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 'bold', whiteSpace: 'nowrap' }}>查看 ›</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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
