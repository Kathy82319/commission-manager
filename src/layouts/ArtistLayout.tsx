// src/pages/artist/ArtistLayout.tsx

import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

export function ArtistLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // 控制手機選單開關
  
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
        } else navigate('/login');
      } catch (error) {
        console.error("驗證繪師身分失敗", error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuthAndFetchProfile();
  }, [navigate]);

      // 切換選單後，如果是手機版螢幕，自動關閉選單
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsMobileMenuOpen(false);
    }
  }, [location.pathname]);

  const handlePreviewAndCopy = () => {
    if (!artist) return;
    const publicUrl = `${window.location.origin}/${artist.public_id}`; 
    navigator.clipboard.writeText(publicUrl);
    window.open(publicUrl, '_blank');
  };

  const isActive = (path: string) => location.pathname === path;
  
  const navItems = [
    { path: '/artist/quote/new', label: '產出委託單' },
    { path: '/artist/queue', label: '排單表' },
    { path: '/artist/notebook', label: '委託單管理' },
    { path: '/artist/records', label: '結案紀錄' },
    { path: '/artist/settings', label: '個人設定' }
  ];

  let planDisplay = '基礎免費版';
  let expiryDateText = '';
  let planBadgeColor = '#4A4A4A';
  let planBadgeBg = '#F0ECE7';
  let daysRemaining: number | null = null;
  let showWarningBanner = false;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  };

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

  if (loading) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#A0978D' }}>驗證身分中...</div>;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FBFBF9', color: '#4A4A4A', fontFamily: 'sans-serif' }}>
      
            {/* 手機版頂部列 (僅在寬度小於 1024px 顯示) */}
      <header style={{ 
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '15px 20px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #EAE6E1',
        position: 'sticky', top: 0, zIndex: 100,
      }} className="lg:hidden">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#5D4A3E', lineHeight: '1' }}>Arti繪師小幫手</div>
          <div style={{ fontSize: '13px', color: '#A0978D', lineHeight: '1' }}>繪師管理後台</div>
        </div>
      </header>

            <div style={{ display: 'flex', flex: 1 }}>
                {/* 側邊欄 (加入 RWD 控制) */}
                <aside className={`fixed top-0 pt-[64px] lg:pt-0 left-0 bottom-0 z-50 w-[260px] shrink-0 bg-white flex flex-col border-r border-[#EAE6E1] transition-transform duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:z-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          
          <div style={{ padding: '30px 20px', borderBottom: '1px solid #F0ECE7' }} className="hidden lg:block">
            
            
            {artist && (
              <div style={{ 
                padding: '10px', backgroundColor: planBadgeBg, color: planBadgeColor, 
                borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.5'
              }}>
                <div>{planDisplay}</div>
                {expiryDateText && <div style={{ fontSize: '10px', opacity: 0.8, fontWeight: 'normal' }}>{expiryDateText}</div>}
              </div>
            )}
          </div>
          
          <nav style={{ flex: 1, padding: '20px 10px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
            {navItems.map(item => (
              <Link 
                key={item.path} 
                to={item.path} 
                style={{ 
                  textDecoration: 'none', padding: '12px 16px', borderRadius: '8px', 
                  backgroundColor: isActive(item.path) ? '#F4F0EB' : 'transparent', 
                  color: isActive(item.path) ? '#5D4A3E' : '#7A7269', 
                  fontWeight: isActive(item.path) ? 'bold' : 'normal', fontSize: '15px' 
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div style={{ padding: '20px', borderTop: '1px solid #F0ECE7', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => navigate('/client/orders')} style={sidebarButtonStyle}>切換為委託方模式</button>
            <button onClick={handlePreviewAndCopy} style={sidebarButtonStyle}>預覽/複製個人首頁</button>

            <div style={{ marginTop: '10px', fontSize: '12px', color: '#9CA3AF', textAlign: 'center', lineHeight: '1.6' }}>
              <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>服務條款</Link>
              <span style={{ margin: '0 4px' }}>|</span>
              <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>隱私權政策</Link>
              <div style={{ marginTop: '2px' }}>客服：cath40286@gmail.com</div>
            </div>
          </div>
        </aside>

        {/* 主內容區 */}
        <main style={{ flex: 1, padding: '20px', maxWidth: '100%', overflowX: 'hidden' }}>
          {showWarningBanner && (
            <div style={{ 
              backgroundColor: '#FFF3CD', color: '#856404', padding: '16px 20px', 
              borderRadius: '12px', marginBottom: '24px', display: 'flex', 
              flexDirection: 'column', gap: '12px', border: '1px solid #FFEEBA'
            }} className="md:flex-row md:justify-between md:items-center">
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                ⚠️ 您的 {artist.plan_type === 'trial' ? '專業版試用期' : '專業版 Pro 訂閱'} 即將到期！
                <div style={{ fontWeight: 'normal', fontSize: '12px' }}>截止日：{formatDate(artist.plan_type === 'trial' ? artist.trial_end_at : artist.pro_expires_at)} (剩餘 {daysRemaining} 天)</div>
              </div>
              <button 
                onClick={() => navigate('/artist/settings')} 
                style={{ backgroundColor: '#856404', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
              >
                立即查看續費方案
              </button>
            </div>
          )}

          <Outlet />
        </main>
      </div>

                        {/* 手機選單背景遮罩 (僅限手機版顯示) */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}
    </div>
  );
}

const sidebarButtonStyle = {
  width: '100%', padding: '10px', backgroundColor: '#FFFFFF', 
  border: '1px solid #DED9D3', borderRadius: '8px', color: '#7A7269', 
  cursor: 'pointer', fontSize: '13px', fontWeight: 'bold'
};