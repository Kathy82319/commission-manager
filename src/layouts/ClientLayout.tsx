import { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, Link, NavLink } from 'react-router-dom';
import { ClipboardList, Inbox, Sparkles, LogOut, Bell } from 'lucide-react';
import '../styles/ClientLayout.css'; 

export function ClientLayout() {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
  const [profile, setProfile] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // 🌟 通知狀態
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
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
      window.location.href = '/'; 
    }
  };

  const handleSwitchToArtist = async () => {
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
      
      {/* 🌟 全域浮動小鈴鐺 (獨立於所有排版之外，絕不擠壓內容) */}
      <div ref={menuRef} style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999 }}>
        <div 
          onClick={() => setShowNotifMenu(!showNotifMenu)}
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
                {notifications.length === 0 ? (
                  <div style={{ padding: '30px 24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>目前沒有新通知</div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => { setShowNotifMenu(false); navigate(n.link); }} 
                      style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ flex: 1, paddingRight: '12px' }}>
                        <div style={{ fontSize: '14px', color: '#1f2937', marginBottom: '6px', lineHeight: '1.4' }}>{n.text}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>{new Date(n.time).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      {/* 🌟 加入精美的跳轉按鈕引導 */}
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

      <aside className="client-sidebar">
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