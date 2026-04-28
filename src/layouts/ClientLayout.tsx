// src/layouts/ClientLayout.tsx
import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, NavLink } from 'react-router-dom';
import '../styles/ClientLayout.css';  
import { ClipboardList, Inbox, Sparkles, LogOut } from 'lucide-react';

export function ClientLayout() {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
  const [profile, setProfile] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);

  // 1. 權限檢查
  useEffect(() => {
    const checkClientAuth = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
        if (res.status === 200) {
          const data = await res.json();
          setProfile(data.data);
          setIsAuthorized(true);
          // 初始化通知檢查
          fetchOrdersForNotifications(data.data.id);
        } else {
          navigate('/login');
        }
      } catch (error) {
        navigate('/login');
      }
    };
    checkClientAuth();
  }, [navigate, API_BASE]);

  // 2. 定期檢查未讀與訂單通知（恢復跑馬燈邏輯）
  useEffect(() => {
    if (!profile) return;
    const fetchAllNotifs = async () => {
      try {
        // 檢查收件匣數量
        const resInbox = await fetch(`${API_BASE}/api/notifications/unread?role=client`, { credentials: 'include' });
        const dataInbox = await resInbox.json();
        if (dataInbox.success) setUnreadInboxCount(dataInbox.count);
        
        // 檢查訂單明細通知（跑馬燈）
        await fetchOrdersForNotifications(profile.id);
      } catch (error) {}
    };
    
    fetchAllNotifs();
    const intervalId = setInterval(fetchAllNotifs, 10000); 
    return () => clearInterval(intervalId);
  }, [profile, API_BASE]);

  // 🌟 跑馬燈核心邏輯（恢復）
  const fetchOrdersForNotifications = async (currentUserId: string) => {
    try {
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

  // 3. 登出與模式切換
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error("登出失敗", e);
    } finally {
      localStorage.removeItem('user_role');
      localStorage.removeItem('is_logged_in');
      window.location.href = '/wishboard';
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
      <aside className="client-sidebar">
        <div className="sidebar-brand">
          <h2>Arti 繪師小幫手</h2>
          <div className="brand-subtitle">委託管理 (委託方)</div>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/" className="nav-item">
            <Sparkles size={20} />
            <span>前往許願池</span>
          </NavLink>
          <NavLink to="/client/orders" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <ClipboardList size={20} />
            <span>委託單管理</span>
          </NavLink>
          <NavLink to="/client/inbox" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Inbox size={20} />
            <span>收件匣</span>
            {unreadInboxCount > 0 && <span style={{ color: '#E06C75', marginLeft: 'auto', fontSize: '12px', fontWeight: 'bold' }}>--新訊息</span>}
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleSwitchToArtist} className="switch-btn">
            {(profile?.role === 'artist' || profile?.role === 'admin') ? '切換至繪師後台' : '開通繪師管理頁'}
          </button>
          {/* 低調的登出按鈕 */}
          <button onClick={handleLogout} className="logout-action-link" style={{ marginTop: '12px', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: '100%' }}>
            <LogOut size={14} /> 登出系統
          </button>
        </div>
      </aside>

      <div className="client-main-container">
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
            <Link to="/refund-policy">退款政策</Link>
            <span>|</span>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}>登出</button>
          </div>
        </footer>
      </div>
    </div>
  );
}