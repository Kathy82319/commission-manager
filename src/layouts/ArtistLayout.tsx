// src/pages/artist/ArtistLayout.tsx

import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/ArtistLayout.css'; // 引入專屬樣式表

export function ArtistLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuthAndFetchProfile = async () => {
      try {
        const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || '';
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
        console.error("驗證繪師身分失敗", error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuthAndFetchProfile();
  }, [navigate]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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
    { path: '/artist/quote/new', label: '產出委託單' },
    { path: '/artist/queue', label: '排單表' },
    { path: '/artist/notebook', label: '委託單管理' },
    { path: '/artist/records', label: '結案紀錄' },
    { path: '/artist/settings', label: '個人設定' }
  ];

  if (loading) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#A0978D' }}>驗證身分中...</div>;

  return (
    <div className="artist-layout-container">
      
      {/* 1. 手機版 Header */}
      <header className="mobile-header">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="mobile-menu-btn"
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#5D4A3E', lineHeight: '1' }}>Arti繪師小幫手</div>
          <div style={{ fontSize: '13px', color: '#A0978D', lineHeight: '1.2', marginTop: '4px' }}>管理後台</div>
        </div>
      </header>

      <div className="layout-body">
        {/* 2. 側邊欄 */}
        <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="sidebar-top">
            <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#5D4A3E' }}>Arti繪師小幫手</div>
            <div style={{ fontSize: '13px', color: '#A0978D', marginBottom: '16px' }}>繪師管理後台</div>
            {artist && (
              <div 
                style={{ padding: '10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: planBadgeBg, color: planBadgeColor }}
              >
                <div>{planDisplay}</div>
                {expiryDateText && <div style={{ fontSize: '10px', opacity: 0.8, fontWeight: 'normal', marginTop: '2px' }}>{expiryDateText}</div>}
              </div>
            )}
          </div>
          
          <nav className="nav-container">
            {navItems.map(item => (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <button 
              onClick={() => navigate('/client/orders')} 
              className="sidebar-btn btn-client"
            >
              切換為委託方模式
            </button>
            <button 
              onClick={handlePreviewAndCopy} 
              className="sidebar-btn btn-preview"
            >
              預覽/複製個人首頁
            </button>
            
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#9CA3AF', textAlign: 'center', lineHeight: '1.6' }}>
              <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>服務條款</Link>
              <span style={{ margin: '0 4px' }}>|</span>
              <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>隱私權政策</Link>
              <div style={{ marginTop: '4px' }}>客服：cath40286@gmail.com</div>
            </div>
          </div>
        </aside>

        {/* 3. 主內容區 */}
        <main className="main-content">
          <div className="content-inner">
            {/* 到期警告 Banner */}
            {showWarningBanner && (
              <div className="warning-banner">
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>⚠️ 您的 {artist.plan_type === 'trial' ? '專業版試用期' : '專業版 Pro 訂閱'} 即將到期！</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>截止日：{formatDate(artist.plan_type === 'trial' ? artist.trial_end_at : artist.pro_expires_at)} (剩餘 {daysRemaining} 天)</div>
                </div>
                <button onClick={() => navigate('/artist/settings')} className="warning-btn">
                  立即查看續費方案
                </button>
              </div>
            )}
            <Outlet />
          </div>
        </main>

        {/* 4. 手機版遮罩 */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="mobile-overlay"
          />
        )}
      </div>
    </div>
  );
}