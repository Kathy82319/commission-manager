// src/layouts/ClientLayout.tsx
import { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, Bell, Menu } from 'lucide-react';
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

  const [campaignOffers, setCampaignOffers] = useState<any[]>([]);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [isRespondingCampaign, setIsRespondingCampaign] = useState(false);

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
    if (!profile) return;
    // 有 campaign=1 表示使用者是從鈴鐺/email 連結點進來，主動要求查看，不管之前回應過什麼都要顯示
    const forceOpen = new URLSearchParams(window.location.search).get('campaign') === '1';
    const fetchCampaignOffers = async () => {
      try {
        const query = forceOpen ? '?all=1' : '';
        const res = await fetch(`${API_BASE}/api/users/me/wishboard-campaign${query}`, { credentials: 'include' });
        const data = await res.json();
        if (data.success && data.offers?.length > 0) {
          setCampaignOffers(data.offers);
          setShowCampaignModal(true);
        }
      } catch (error) {}
    };
    fetchCampaignOffers();
  }, [profile, API_BASE]);

  const handleCampaignDecline = async () => {
    setIsRespondingCampaign(true);
    try {
      await fetch(`${API_BASE}/api/users/me/wishboard-campaign/respond`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept: false }),
      });
    } catch (error) {} finally {
      setIsRespondingCampaign(false);
      setShowCampaignModal(false);
    }
  };

  const handleCampaignGoEdit = () => {
    setShowCampaignModal(false);
    navigate('/wishboard?reactivate=1');
  };

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

  const location = useLocation();

  const publicNavItems = [
    { path: '/announcements', label: '最新公告' },
    { path: '/wishboard', label: '許願池' },
  ];

  const backendNavItems = [
    { path: '/client/inbox', label: '收件/寄件匣' },
    { path: '/client/orders', label: '委託單管理' },
    { path: '/client/my-oc', label: '我的角色卡 (OC)' },
    { path: '/client/favorites', label: '名單管理' },
    { path: '/client/settings', label: '個人設定' },
  ];

  if (!isAuthorized) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#5a6e85', color: '#FFF' }}>載入中...</div>;

  const displayCount = Math.max(unreadCount, 5);
  const displayedNotifs = notifications.slice(0, displayCount);

  return (
    <div className="client-layout-wrapper">

      {showCampaignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937', marginBottom: '10px' }}>年末許願池曝光延長活動</div>
            <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.6, marginBottom: '20px' }}>
              您有許願池貼文已到期下架。我們想邀請您重新上架，曝光延長至 <strong>2026/12/31</strong>，協助您觸及更多可能的合作對象。
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleCampaignDecline}
                disabled={isRespondingCampaign}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', color: '#4b5563', cursor: 'pointer', fontSize: '14px' }}
              >
                不用了，謝謝
              </button>
              <button
                onClick={handleCampaignGoEdit}
                disabled={isRespondingCampaign}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
              >
                前往編輯並重新上架
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={menuRef} className="notif-bell-wrapper">
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

      <div className={`sidebar-overlay ${isMobileMenuOpen ? 'visible' : ''}`} onClick={closeMobileMenu}></div>

      <aside className={`client-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <h2 style={{ margin: '0 0 4px 0' }}>Arti 繪師小幫手</h2>
          <div className="brand-subtitle" style={{ fontSize: '13px', color: '#6B7280' }}>委託管理 (委託方)</div>
          
          
          {profile && (
            <div style={{ 
              fontSize: '11px', color: '#4B5563', background: '#F3F4F6', 
              display: 'inline-block', padding: '4px 8px', borderRadius: '4px', marginTop: '8px' 
            }}>
              使用者：<span style={{ userSelect: 'all', fontWeight: 'bold' }}>{profile.public_id}</span>
            </div>
          )}
        </div>
        
        <nav className="sidebar-nav">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '11px', fontWeight: '800', color: '#C4BDB5', letterSpacing: '0.08em', padding: '8px 14px 4px', display: 'block', textDecoration: 'none', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#A0978D')}
            onMouseLeave={e => (e.currentTarget.style.color = '#C4BDB5')}
          >主頁 ↗</a>
          {publicNavItems.map(item => (
            <a
              key={item.path}
              href={item.path}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link"
              onClick={closeMobileMenu}
            >
              {item.label}
            </a>
          ))}
          <a
            href="/guide"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
            onClick={closeMobileMenu}
          >
            使用教學 &amp; Q&amp;A
          </a>

          <div style={{ height: '1px', background: '#EAE6E1', margin: '8px 14px' }} />

          <div style={{ fontSize: '11px', fontWeight: '800', color: '#C4BDB5', letterSpacing: '0.08em', padding: '4px 14px' }}>後台</div>
          {backendNavItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              {item.label}
            </Link>
          ))}
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