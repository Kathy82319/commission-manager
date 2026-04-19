// src/layouts/ClientLayout.tsx
import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';

export function ClientLayout() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // 🌟 手機版選單狀態

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

  if (!isAuthorized) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#5a6e85', color: '#FFF' }}>載入中...</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #778ca4 0%, #5a6e85 100%)', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      
      <style>{`
        @keyframes layout-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
                .client-header {
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 100;
        }
        .mobile-nav-toggle { display: none; background: none; border: none; color: #FFF; fontSize: 24px; cursor: pointer; }
        @media (max-width: 768px) {
          .desktop-nav { display: none; }
          .mobile-nav-toggle { display: block; }
          .mobile-menu {
            position: fixed; top: 60px; left: 0; right: 0; background: #5a6e85;
            padding: 20px; display: flex; flexDirection: column; gap: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.1); z-index: 99;
          }
        }
      `}</style>

            <header className="client-header sticky top-0 md:px-8 md:py-4">
        <div style={{ fontWeight: 'bold', color: '#FFF', fontSize: '18px' }}>
          Arti 繪師小幫手
          <div style={{ fontSize: '12px', opacity: 0.8 }}>委託管理 (委託方)</div>
        </div>
        
        <nav className="desktop-nav" style={{ display: 'flex', gap: '20px', alignItems: 'center', margin: 0, padding: 0 }}>
          <button onClick={handleSwitchToArtist} style={{ background: 'none', border: 'none', color: '#facc15', cursor: 'pointer', fontWeight: 'bold' }}>
            {(profile?.role === 'artist' || profile?.role === 'admin') ? '切換至繪師後台' : '開通繪師管理頁'}
          </button>
        </nav>

        <button className="mobile-nav-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* 手機版下拉選單 */}
      {isMobileMenuOpen && (
        <div className="mobile-menu" style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(90, 110, 133, 0.98)', padding: '16px', gap: '12px' }}>
          <button onClick={handleSwitchToArtist} style={{ color: '#facc15', background: 'none', border: 'none', textAlign: 'left', fontWeight: 'bold', padding: '10px 0' }}>
            {(profile?.role === 'artist' || profile?.role === 'admin') ? '進入繪師後台' : '開通繪師管理頁'}
          </button>
        </div>
      )}

      {notifications.length > 0 && (
        <div style={{ width: '100%', backgroundColor: 'rgba(250, 204, 21, 0.15)', overflow: 'hidden', whiteSpace: 'nowrap', padding: '8px 0', borderBottom: '1px solid rgba(250,204,21,0.2)' }}>
          <div style={{ display: 'inline-block', paddingLeft: '100%', animation: 'layout-marquee 25s linear infinite', color: '#facc15', fontWeight: 'bold', fontSize: '13px' }}>
            {notifications.map((msg, index) => (
              <span key={index} style={{ marginRight: '80px' }}>🔔 {msg}</span>
            ))}
          </div>
        </div>
      )}

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '100vw', overflowX: 'hidden' }}>
        <Outlet />
      </main>

            <footer className="p-5 md:p-6" style={{ textAlign: 'center', background: 'rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>服務條款</Link>
          <span>|</span>
          <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>隱私權政策</Link>
          <span>|</span>
          <span>客服：cath40286@gmail.com</span>
        </div>
      </footer>
    </div>
  );
}