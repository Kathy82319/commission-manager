// src/layouts/ClientLayout.tsx
import { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, Link, NavLink } from 'react-router-dom';
import '../styles/ClientLayout.css';  
import { ClipboardList, Inbox, Sparkles, LogOut, Bell } from 'lucide-react';

export function ClientLayout() {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
  const [profile, setProfile] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // 🌟 通知狀態
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

  // 🌟 定期從單一 API 取得輕量化通知
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
    const intervalId = setInterval(fetchNotifications, 15000); // 15秒更新一次
    return () => clearInterval(intervalId);
  }, [profile, API_BASE]);

  // 點擊外部關閉通知選單
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
      window.location.href = '/'; 
    }
  };

  const handleSwitchToArtist = async () => { /* ... 保留原本切換邏輯 ... */
    if (!profile) return;
    if (profile.role === 'artist' || profile.role === 'admin') {
      window.location.href = '/artist/queue';
      return;
    }
    if (window.confirm("確定要開通繪師管理頁嗎？")) {
      try {
        const res = await fetch(`${API_BASE}/api/users/me/complete-onboarding`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_name: profile.display_name, role: 'artist' })
        });
        const result = await res.json();
        if (result.success) {
          alert("開通成功！");
          window.location.href = '/artist/queue';
        }
      } catch (error) { alert('網路錯誤'); }
    }
  };

  if (!isAuthorized) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#5a6e85', color: '#FFF' }}>載入中...</div>;

  return (
    <div className="client-layout-wrapper">
      <aside className="client-sidebar">
        {/* ... 保留原本 Sidebar 內容 ... */}
        <div className="sidebar-brand">
          <h2>Arti 繪師小幫手</h2>
          <div className="brand-subtitle">委託管理 (委託方)</div>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" className="nav-item"><Sparkles size={20} /><span>前往許願池</span></NavLink>
          <NavLink to="/client/orders" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}><ClipboardList size={20} /><span>委託單管理</span></NavLink>
          <NavLink to="/client/inbox" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}><Inbox size={20} /><span>收件匣</span></NavLink>
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleSwitchToArtist} className="switch-btn">
            {(profile?.role === 'artist' || profile?.role === 'admin') ? '切換至繪師後台' : '開通繪師管理頁'}
          </button>
          <button onClick={handleLogout} className="logout-action-link" style={{ marginTop: '12px', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: '100%' }}>
            <LogOut size={14} /> 登出系統
          </button>
        </div>
      </aside>

      <div className="client-main-container">
        {/* 🌟 新增：頂部標題與鈴鐺列 */}
        <header className="client-top-header">
          <div className="header-spacer"></div>
          <div className="header-actions" ref={menuRef}>
            <div className="bell-container" onClick={() => setShowNotifMenu(!showNotifMenu)}>
              <Bell size={22} color="#4b5563" />
              {unreadCount > 0 && <span className="bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </div>
            
            {showNotifMenu && (
              <div className="notif-dropdown">
                <div className="notif-header">系統通知</div>
                <div className="notif-list">
                  {notifications.length === 0 ? (
                    <div className="notif-empty">目前沒有新通知</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="notif-item" onClick={() => { setShowNotifMenu(false); navigate(n.link); }}>
                        <div className="notif-text">{n.text}</div>
                        <div className="notif-time">{new Date(n.time).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

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