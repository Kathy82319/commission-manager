// src/layouts/ClientLayout.tsx
import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import '../styles/ClientLayout.css'; // 🌟 引入專屬樣式表

export function ClientLayout() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkClientAuth = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
        if (res.status === 200) {
          const data = await res.json();
          setProfile(data.data);
          setIsAuthorized(true);
          fetchOrdersForNotifications(data.data.id);
        } else {
          navigate('/login');
        }
      } catch (error) {
        navigate('/login');
      }
    };
    checkClientAuth();
  }, [navigate]);

  const fetchOrdersForNotifications = async (currentUserId: string) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${API_BASE}/api/commissions`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const notifs: string[] = [];
        const parseTime = (dateStr?: string) => {
          if (!dateStr) return 0;
          return new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z').getTime();
        };
        data.data.forEach((order: any) => {
          if (order.status === 'cancelled') return;
          if (order.client_id !== currentUserId) return;
          const title = order.client_custom_title || order.project_name;
          const titleStr = title ? ` 訂單項目：${title}` : '';
          if (order.pending_changes) notifs.push(`訂單：${order.id}${titleStr} 有合約異動申請`);
          if (order.latest_message_at) {
            const latestMsgTime = parseTime(order.latest_message_at);
            const lastReadTime = parseTime(order.last_read_at_client);
            if (latestMsgTime > lastReadTime) notifs.push(`訂單：${order.id}${titleStr} 有新訊息`);
          }
        });
        setNotifications(notifs);
      }
    } catch (error) {}
  };

  const handleSwitchToArtist = async () => {
    if (!profile) return;
    if (profile.role === 'artist' || profile.role === 'admin') {
      window.location.href = '/artist/queue';
      return;
    }
    if (window.confirm("確定要開通繪師管理頁嗎？")) {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
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

  if (!isAuthorized) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#5a6e85', color: '#FFF' }}>
        載入中...
      </div>
    );
  }

  return (
    <div className="client-layout-container">
      
      <header className="client-header">
        <div className="header-logo">
          Arti 繪師小幫手
          <div className="header-subtitle">委託管理 (委託方)</div>
        </div>
        
        <nav className="desktop-nav">
          <button onClick={handleSwitchToArtist} className="switch-btn">
            {(profile?.role === 'artist' || profile?.role === 'admin') ? '切換至繪師後台' : '開通繪師管理頁'}
          </button>
        </nav>

        <button className="mobile-nav-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <button onClick={handleSwitchToArtist} className="switch-btn">
            {(profile?.role === 'artist' || profile?.role === 'admin') ? '進入繪師後台' : '開通繪師管理頁'}
          </button>
        </div>
      )}

      {notifications.length > 0 && (
        <div className="notification-bar">
          <div className="marquee-content">
            {notifications.map((msg, index) => (
              <span key={index} style={{ marginRight: '80px' }}>🔔 {msg}</span>
            ))}
          </div>
        </div>
      )}

      <main className="client-main">
        <Outlet />
      </main>

      <footer className="client-footer">
        <div className="footer-links">
          <Link to="/terms">服務條款</Link>
          <span>|</span>
          <Link to="/privacy">隱私權政策</Link>
          <span>|</span>
          <span>客服：cath40286@gmail.com</span>
        </div>
      </footer>
    </div>
  );
}