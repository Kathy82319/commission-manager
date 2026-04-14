// src/layouts/ClientLayout.tsx
import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';

export function ClientLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkClientAuth = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const res = await fetch(`${API_BASE}/api/users/me`, {
          credentials: 'include'
        });

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
  }, [navigate]);

  const handleSwitchToArtist = async () => {
    if (!profile) return;

    if (profile.role === 'artist') {
      window.location.href = '/artist/queue';
    } else {
      const confirmCreate = window.confirm("確定要開通繪師管理頁嗎？\n開通後將直接開始 7 天試用期。");
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
    }
  };

  if (!isAuthorized) {
    return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #778ca4 0%, #5a6e85 100%)', color: '#FFFFFF' }}>載入中...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #778ca4 0%, #5a6e85 100%)', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      
      {/* 🌟 常駐頂部導覽列 */}
      <header style={{ 
        padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        backgroundColor: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)', position: 'sticky', top: 0, zIndex: 50 
      }}>
        <div style={{ fontWeight: 'bold', color: '#FFF', fontSize: '18px', letterSpacing: '1px' }}>
          Arti
        </div>
        <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link to="/client/orders" style={{ color: location.pathname.includes('/client/order') ? '#FFF' : 'rgba(255,255,255,0.7)', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', transition: 'color 0.2s' }}>
            委託單列表
          </Link>
          <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <button 
            onClick={handleSwitchToArtist} 
            style={{ background: 'none', border: 'none', color: '#facc15', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', padding: 0, transition: 'opacity 0.2s' }} 
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} 
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {profile?.role === 'artist' ? '切換至繪師後台' : '開通繪師管理頁'}
          </button>
        </nav>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>

      {/* 🌟 常駐底部宣告 */}
      <footer style={{ padding: '24px', textAlign: 'center', marginTop: 'auto' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '1px' }}>
          <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>服務條款</Link>
          <span style={{ margin: '0 12px' }}>|</span>
          <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>隱私權政策</Link>
        </div>
      </footer>

    </div>
  );
}