// src/layouts/ClientLayout.tsx
import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';

export function ClientLayout() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);

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
          const titleStr = title ? `  訂單項目名稱：${title}` : '';
          
          if (order.pending_changes) {
            notifs.push(`訂單編號：${order.id}${titleStr} 已傳來合約內容異動申請，請盡速前往`);
          }
          if (order.latest_message_at) {
            const latestMsgTime = parseTime(order.latest_message_at);
            const lastReadTime = parseTime(order.last_read_at_client);
            if (latestMsgTime > lastReadTime) {
              notifs.push(`訂單編號：${order.id}${titleStr} 聊天室有新訊息，請盡速前往`);
            }
          }
        });
        setNotifications(notifs);
      }
    } catch (error) {}
  };

  // 🌟 優化後的跳轉邏輯
  const handleSwitchToArtist = async () => {
    if (!profile) return;

    // 1. 如果已經是繪師身分，直接跳轉，不需要詢問
    if (profile.role === 'artist' || profile.role === 'admin') {
      window.location.href = '/artist/queue';
      return;
    }

    // 2. 如果尚未開通繪師身分，才進行詢問 (且移除試用期文字)
    const confirmCreate = window.confirm("確定要開通繪師管理頁嗎？");
    if (confirmCreate) {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const res = await fetch(`${API_BASE}/api/users/me/complete-onboarding`, {
          method: 'POST', 
          credentials: 'include', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_name: profile.display_name, role: 'artist' })
        });
        const result = await res.json();
        if (result.success) {
          alert("開通成功！為您導向繪師後台。");
          window.location.href = '/artist/queue';
        } else {
          alert('開通失敗：' + result.error);
        }
      } catch (error) { 
        alert('網路連線錯誤，請稍後再試。'); 
      }
    }
  };

  if (!isAuthorized) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #778ca4 0%, #5a6e85 100%)', color: '#FFFFFF' }}>載入中...</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #778ca4 0%, #5a6e85 100%)', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      
      <style>{`
        @keyframes layout-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
      `}</style>

      <header style={{ padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', zIndex: 50 }}>
        <div style={{ fontWeight: 'bold', color: '#FFF', fontSize: '18px', letterSpacing: '1px' }}>Arti 繪師小幫手
          <div style={{ fontSize: '13px', color: '#FFF' }}>委託方列表</div>
        </div>
        <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <button onClick={handleSwitchToArtist} style={{ background: 'none', border: 'none', color: '#facc15', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', padding: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            {/* 這裡也會根據身分顯示不同文字 */}
            {(profile?.role === 'artist' || profile?.role === 'admin') ? '切換至繪師後台' : '開通繪師管理頁'}
          </button>
        </nav>
      </header>

      {notifications.length > 0 && (
        <div style={{ width: '100%', backgroundColor: 'rgba(250, 204, 21, 0.15)', borderBottom: '1px solid rgba(250, 204, 21, 0.3)', overflow: 'hidden', whiteSpace: 'nowrap', padding: '10px 0', display: 'block', position: 'relative', zIndex: 40 }}>
          <div style={{ display: 'inline-block', paddingLeft: '100%', animation: 'layout-marquee 20s linear infinite', color: '#facc15', fontWeight: 'bold', fontSize: '14px', letterSpacing: '0.5px' }}>
            {notifications.map((msg, index) => (
              <span key={index} style={{ marginRight: '60px' }}>🔔 {msg}</span>
            ))}
          </div>
        </div>
      )}

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>

      <footer style={{ padding: '24px', textAlign: 'center', marginTop: 'auto' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.9)', letterSpacing: '1px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>服務條款</Link>
          <span>|</span>
          <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>隱私權政策</Link>
          <span>|</span>
          <span>客服信箱：cath40286@gmail.com</span>
        </div>
      </footer>
    </div>
  );
}