import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react'; // 🌟 引入鈴鐺圖示
import '../styles/ArtistLayout.css'; 

export function ArtistLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || '';
  
  const [artist, setArtist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);

  // 🌟 小鈴鐺通知專用狀態
  const [unreadCount, setUnreadCount] = useState(0); 
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const menuRefDesktop = useRef<HTMLDivElement>(null);
  const menuRefMobile = useRef<HTMLDivElement>(null);

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

  // 🌟 改用整合後的 notifications API
  useEffect(() => {
    if (!artist) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/notifications?role=artist`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setUnreadCount(data.unreadCount);
          setUnreadInboxCount(data.unreadCount); // 側邊欄的紅字同步顯示
          setNotifications(data.notifications);
        }
      } catch (error) {}
    };
    fetchUnread();
    const intervalId = setInterval(fetchUnread, 10000); 
    return () => clearInterval(intervalId);
  }, [artist, API_BASE]);

  // 🌟 點擊外部自動關閉通知選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        (menuRefDesktop.current && !menuRefDesktop.current.contains(target)) &&
        (menuRefMobile.current && !menuRefMobile.current.contains(target))
      ) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error("登出失敗", e);
    } finally {
      localStorage.removeItem('user_role');
      localStorage.removeItem('is_logged_in');
      window.location.href = '/'; 
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

  // 通知下拉選單的 UI 元件 (桌面與手機共用)
  const NotificationDropdown = () => (
    <div style={{ position: 'absolute', top: '100%', left: '0', width: '280px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, border: '1px solid #EAE6E1', overflow: 'hidden', marginTop: '8px' }}>
      <div style={{ padding: '12px 16px', fontWeight: 'bold', borderBottom: '1px solid #F0ECE7', background: '#FBFBF9', color: '#5D4A3E' }}>系統通知</div>
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#A0978D', fontSize: '13px' }}>目前沒有新通知</div>
        ) : (
          notifications.map(n => (
            <div key={n.id} onClick={() => { setShowNotifMenu(false); navigate(n.link); }} style={{ padding: '12px 16px', borderBottom: '1px solid #F0ECE7', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FBFBF9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <div style={{ fontSize: '13px', color: '#4A4A4A', marginBottom: '4px', lineHeight: '1.4' }}>{n.text}</div>
              <div style={{ fontSize: '11px', color: '#A0978D' }}>{new Date(n.time).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (loading) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#A0978D' }}>驗證身分中...</div>;

  return (
    <div className="artist-layout-wrapper">
      <header className="mobile-app-bar">
        <button onClick={() => setIsMobileMenuOpen(true)} className="menu-toggle-btn">☰</button>
        <div className="mobile-app-title">
          <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#5D4A3E' }}>Arti繪師小幫手</div>
          <div style={{ fontSize: '13px', color: '#A0978D' }}>管理後台</div>
        </div>

        {/* 🌟 手機版鈴鐺 (靠右) */}
        <div ref={menuRefMobile} style={{ marginLeft: 'auto', position: 'relative' }}>
          <button onClick={() => setShowNotifMenu(!showNotifMenu)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', position: 'relative' }}>
            <Bell size={22} color="#5D4A3E" />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 'bold', height: '16px', minWidth: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid white' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {/* 手機版選單改為靠右對齊 (right: 0) */}
          {showNotifMenu && <div style={{ position: 'absolute', top: '100%', right: '0', width: '280px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, border: '1px solid #EAE6E1', overflow: 'hidden', marginTop: '8px' }}>
            <div style={{ padding: '12px 16px', fontWeight: 'bold', borderBottom: '1px solid #F0ECE7', background: '#FBFBF9', color: '#5D4A3E' }}>系統通知</div>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#A0978D', fontSize: '13px' }}>目前沒有新通知</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} onClick={() => { setShowNotifMenu(false); navigate(n.link); }} style={{ padding: '12px 16px', borderBottom: '1px solid #F0ECE7', cursor: 'pointer', transition: 'background-color 0.2s' }}>
                    <div style={{ fontSize: '13px', color: '#4A4A4A', marginBottom: '4px', lineHeight: '1.4' }}>{n.text}</div>
                    <div style={{ fontSize: '11px', color: '#A0978D' }}>{new Date(n.time).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ))
              )}
            </div>
          </div>}
        </div>
      </header>

      <aside className={`app-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          {/* 🌟 桌面版：將標題與鈴鐺並排 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#5D4A3E' }}>Arti繪師小幫手</div>
              <div style={{ fontSize: '13px', color: '#A0978D', marginBottom: '16px' }}>繪師管理後台</div>
            </div>

            {/* 🌟 桌面側邊欄鈴鐺 */}
            <div ref={menuRefDesktop} style={{ position: 'relative' }}>
              <button onClick={() => setShowNotifMenu(!showNotifMenu)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', position: 'relative' }}>
                <Bell size={22} color="#5D4A3E" />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 'bold', height: '16px', minWidth: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid white' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifMenu && <NotificationDropdown />}
            </div>
          </div>

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