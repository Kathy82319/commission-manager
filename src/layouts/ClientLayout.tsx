// src/layouts/ClientLayout.tsx
import { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, Link, NavLink } from 'react-router-dom';
import { ClipboardList, Inbox, Sparkles, LogOut, Bell, Menu, User, Heart, Contact } from 'lucide-react';
import '../styles/ClientLayout.css'; 

export function ClientLayout() {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
  const [profile, setProfile] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('last_active_role', 'client');
    const checkClientAuth = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
        if (res.status === 200) {
          const data = await res.json();
          setProfile(data.data);
          setIsAuthorized(true);
        } else {
          navigate('/login');
        }
      } catch (error) {
        navigate('/login');
      }
    };
    checkClientAuth();
  }, [navigate, API_BASE]);

  useEffect(() => {
    if (!profile) return;
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/notifications?role=client`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setUnreadCount(data.unreadCount);
          setNotifications(data.notifications);
        }
      } catch (error) {}
    };
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 15000); 
    return () => clearInterval(intervalId);
  }, [profile, API_BASE]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {} finally {
      localStorage.removeItem('user_role');
      localStorage.removeItem('is_logged_in');
      localStorage.removeItem('last_active_role');
      window.location.href = '/'; 
    }
  };

  const handleOpenNotifMenu = async () => {
    const nextState = !showNotifMenu;
    setShowNotifMenu(nextState);

    if (nextState && unreadCount > 0) {
      setUnreadCount(0); 
      try {
        await fetch(`${API_BASE}/api/notifications/read?role=client`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch (e) {
        console.error("無法標記通知為已讀", e);
      }
    }
  };

  if (!isAuthorized) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#5a6e85', color: '#FFF' }}>載入中...</div>;

  const displayCount = Math.max(unreadCount, 5);
  const displayedNotifs = notifications.slice(0, displayCount);

  return (
    <div className="client-layout-wrapper">
      
      <div ref={menuRef} style={{ position: 'fixed', top: '10px', right: '24px', zIndex: 9999 }}>
        <div 
          onClick={handleOpenNotifMenu}
          style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #e5e7eb', transition: 'all 0.2s' }}
        >
          <Bell size={22} color="#4b5563" />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 'bold', height: '20px', minWidth: '20px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid white' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        
        {showNotifMenu && (
          <div style={{ position: 'absolute', top: '55px', right: '0', width: '340px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
             <div style={{ padding: '14px 16px', fontWeight: 'bold', borderBottom: '1px solid #f3f4f6', background: '#f9fafb', color: '#374151' }}>系統通知</div>
             <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {displayedNotifs.length === 0 ? (
                  <div style={{ padding: '30px 24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>目前沒有新通知</div>
                ) : (
                  displayedNotifs.map((n: any) => (
                    <div 
                      key={n.id} 
                      onClick={() => { setShowNotifMenu(false); navigate(n.link); }} 
                      style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: n.isUnread ? '#f0f7ff' : 'transparent' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = n.isUnread ? '#e0f0ff' : '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = n.isUnread ? '#f0f7ff' : 'transparent'}
                    >
                      {n.isUnread && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0, marginRight: '10px' }}></div>}
                      
                      <div style={{ flex: 1, paddingRight: '12px' }}>
                        <div style={{ fontSize: '14px', color: '#1f2937', marginBottom: '6px', lineHeight: '1.4' }}>{n.text}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>{new Date(n.time).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <div style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 'bold', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        查看 <span style={{ fontSize: '16px', paddingBottom: '2px' }}>›</span>
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}
      </div>

      <div className="mobile-app-bar">
        <button className="menu-toggle-btn" onClick={() => setIsMobileMenuOpen(true)}>
          <Menu size={28} />
        </button>
        <div style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '18px' }}>委託人中心</div>
      </div>

      <div 
        className={`sidebar-overlay ${isMobileMenuOpen ? 'visible' : ''}`} 
        onClick={closeMobileMenu}
      ></div>

      <aside className={`client-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <h2>Arti 繪師小幫手</h2>
          <div className="brand-subtitle">委託管理 (委託方)</div>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/" className="nav-item" onClick={closeMobileMenu}>
            <Sparkles size={20} /><span>前往許願池</span>
          </NavLink>
          <NavLink to="/client/inbox" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeMobileMenu}>
            <Inbox size={20} /><span>收件/寄件匣</span>
          </NavLink>
          <NavLink to="/client/orders" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeMobileMenu}>
            <ClipboardList size={20} /><span>委託單管理</span>
          </NavLink>
          <NavLink to="/client/my-oc" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeMobileMenu}>
            <Contact size={20} /><span>我的角色卡 (OC)</span>
          </NavLink>
          <NavLink to="/client/favorites" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeMobileMenu}>
            <Heart size={20} /><span>繪師追蹤名單</span>
          </NavLink>          
          <NavLink to="/client/settings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} onClick={closeMobileMenu}>
            <User size={20} /><span>個人設定</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          {(profile?.role === 'artist' || profile?.role === 'admin') && (
            <button onClick={() => window.location.href = '/artist/queue'} className="switch-btn">
              切換至繪師後台
            </button>
          )}
          
          <button onClick={handleLogout} className="logout-action-link" style={{ marginTop: '12px', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: '100%' }}>
            <LogOut size={14} /> 登出系統
          </button>
        </div>
      </aside>

      <div className="client-main-container">
        <main className="client-main"><Outlet /></main>
        <footer className="client-footer">
          <div className="footer-links">
            <Link to="/terms">服務條款</Link>
            <span>|</span>
            <Link to="/privacy">隱私權政策</Link>
            <span>|</span>
            <Link to="/refund-policy">退款政策</Link>
            <span>|</span>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 'inherit', padding: 0, opacity: 0.8 }}>登出</button>
          </div>
        </footer>
      </div>
    </div>
  );
}