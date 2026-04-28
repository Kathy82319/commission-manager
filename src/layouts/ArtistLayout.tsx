import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/ArtistLayout.css'; 

export function ArtistLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || '';
  
  const [artist, setArtist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);

  useEffect(() => {
    const checkAuthAndFetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
        if (res.status === 401 || res.status === 403) {
          navigate('/login');
          return;
        }
        const data = await res.json();
        if (data.success && data.data) {
          if (data.data.role === 'pending') navigate('/onboarding');
          else if (data.data.role === 'client') navigate('/client/orders');
          else setArtist(data.data);
        } else {
          navigate('/login');
        }
      } catch (error) {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuthAndFetchProfile();
  }, [navigate, API_BASE]);

  useEffect(() => {
    if (!artist) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/notifications/unread?role=artist`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) setUnreadInboxCount(data.count);
      } catch (error) {}
    };
    fetchUnread();
    const intervalId = setInterval(fetchUnread, 10000); 
    return () => clearInterval(intervalId);
  }, [artist, API_BASE]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error("登出失敗", e);
    } finally {
      localStorage.removeItem('user_role');
      localStorage.removeItem('is_logged_in');
      window.location.href = '/'; // 修正重導向
    }
  };

  const handlePreviewAndCopy = () => {
    if (!artist) return;
    const publicUrl = `${window.location.origin}/${artist.public_id}`;
    navigator.clipboard.writeText(publicUrl);
    window.open(publicUrl, '_blank');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  };

  let planDisplay = '基礎免費版';
  let expiryDateText = '';
  let planBadgeColor = '#4A4A4A';
  let planBadgeBg = '#F0ECE7';
  let daysRemaining: number | null = null;
  let showWarningBanner = false;

  if (artist) {
    const now = new Date();
    if (artist.plan_type === 'pro') {
      planDisplay = '專業版 Pro';
      planBadgeColor = '#4E7A5A';
      planBadgeBg = '#E8F3EB';
      if (artist.pro_expires_at) {
        const exp = new Date(artist.pro_expires_at);
        expiryDateText = `(截止日期: ${formatDate(artist.pro_expires_at)})`;
        daysRemaining = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 7 && daysRemaining > 0) showWarningBanner = true;
      }
    } else if (artist.plan_type === 'trial') {
      planDisplay = '專業版試用期';
      planBadgeColor = '#A67B3E';
      planBadgeBg = '#FDF4E6';
      if (artist.trial_end_at) {
        const exp = new Date(artist.trial_end_at);
        expiryDateText = `(截止日期: ${formatDate(artist.trial_end_at)})`;
        daysRemaining = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 7 && daysRemaining > 0) showWarningBanner = true;
      }
    }
  }

  const navItems = [
    { path: '/', label: '前往許願池' }, 
    { path: '/artist/quote/new', label: '建立委託單' },
    { path: '/artist/queue', label: '排單表' },
    { path: '/artist/notebook', label: '委託單管理' },
    { path: '/artist/customers', label: '客戶管理' }, 
    { path: '/artist/records', label: '結案紀錄' },
    { path: '/artist/inbox', label: '收件匣' }, 
    { path: '/artist/settings', label: '個人設定' }
  ];

  if (loading) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#A0978D' }}>驗證身分中...</div>;

  return (
    <div className="artist-layout-wrapper">
      <header className="mobile-app-bar">
        <button onClick={() => setIsMobileMenuOpen(true)} className="menu-toggle-btn">☰</button>
        <div className="mobile-app-title">
          <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#5D4A3E' }}>Arti繪師小幫手</div>
          <div style={{ fontSize: '13px', color: '#A0978D' }}>管理後台</div>
        </div>
      </header>

      <aside className={`app-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#5D4A3E' }}>Arti繪師小幫手</div>
          <div style={{ fontSize: '13px', color: '#A0978D', marginBottom: '16px' }}>繪師管理後台</div>
          {artist && (
            <div style={{ padding: '10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: planBadgeBg, color: planBadgeColor }}>
              <div>{planDisplay}</div>
              {expiryDateText && <div style={{ fontSize: '10px', opacity: 0.8, fontWeight: 'normal', marginTop: '2px' }}>{expiryDateText}</div>}
            </div>
          )}
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link key={item.path} to={item.path} className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}>
              {item.label}
              {item.path === '/artist/inbox' && unreadInboxCount > 0 && (
                <span style={{ color: '#E06C75', marginLeft: '6px', fontSize: '12px', fontWeight: 'bold' }}>--新訊息</span>
              )}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={() => navigate('/client/orders')} className="sidebar-action-btn btn-switch-client">切換為委託方模式</button>
          <button onClick={handlePreviewAndCopy} className="sidebar-action-btn btn-preview-profile">預覽/複製個人首頁</button>
          
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#9CA3AF', textAlign: 'center', lineHeight: '1.6' }}>
            <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>服務條款</Link>
            <span style={{ margin: '0 4px' }}>|</span>
            <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>隱私權政策</Link>
            <span style={{ margin: '0 4px' }}>|</span>
            <Link to="/refund-policy" style={{ color: 'inherit', textDecoration: 'none' }}>退款政策</Link>
            <div style={{ marginTop: '8px' }}>
              <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #D1D5DB', color: '#9CA3AF', cursor: 'pointer', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>登出系統</button>
            </div>
          </div>
        </div>
      </aside>

      <div className={`sidebar-overlay ${isMobileMenuOpen ? 'visible' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />

      <main className="app-main-content">
        <div className="content-wrapper">
          {showWarningBanner && (
            <div className="plan-warning-banner">
              <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>⚠️ 您的 {artist.plan_type === 'trial' ? '專業版試用期' : '專業版 Pro 訂閱'} 即將到期！</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>截止日：{formatDate(artist.plan_type === 'trial' ? artist.trial_end_at : artist.pro_expires_at)} (剩餘 {daysRemaining} 天)</div>
              </div>
              <button onClick={() => navigate('/artist/settings')} className="renew-plan-btn">立即查看續費方案</button>
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}