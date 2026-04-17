// src/pages/artist/ArtistLayout.tsx

import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

export function ArtistLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  // 🌟 核心優化：計算方案狀態與截止日期顯示
  let planDisplay = '基礎免費版';
  let expiryDateText = '';
  let planBadgeColor = '#A0978D';
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
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#FBFBF9', color: '#4A4A4A', fontFamily: 'sans-serif' }}>
      <aside style={{ width: '260px', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', borderRight: '1px solid #EAE6E1', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '30px 20px', borderBottom: '1px solid #F0ECE7' }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#5D4A3E' }}>Arti繪師小幫手</div>
          <div style={{ fontSize: '13px', color: '#A0978D', marginBottom: '16px' }}>繪師管理後台</div>
          
          {/* 🌟 優化：側邊欄方案標籤 (顯示版本與截止日) */}
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
        
        <nav style={{ flex: 1, padding: '20px 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
          <button 
            onClick={() => navigate('/client/orders')} 
            style={{ 
              width: '100%', padding: '10px', backgroundColor: '#F4F0EB', 
              border: '1px dashed #DED9D3', borderRadius: '8px', color: '#5D4A3E', 
              cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' 
            }}
          >
            切換為委託方模式
          </button>
          
          <button 
            onClick={handlePreviewAndCopy} 
            style={{ 
              width: '100%', padding: '10px', backgroundColor: '#FFFFFF', 
              border: '1px solid #DED9D3', borderRadius: '8px', color: '#7A7269', 
              cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' 
            }}
          >
            預覽/複製個人首頁
          </button>

          <div style={{ marginTop: '10px', fontSize: '12px', color: '#9CA3AF', textAlign: 'center', lineHeight: '1.6' }}>
            <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>服務條款</Link>
            <span style={{ margin: '0 4px' }}>|</span>
            <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>隱私權政策</Link>
            <div style={{ marginTop: '2px' }}>客服：cath40286@gmail.com</div>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        {/* 🌟 優化：到期警告橫幅內容 */}
        {showWarningBanner && (
          <div style={{ 
            backgroundColor: '#FFF3CD', color: '#856404', padding: '16px 20px', 
            borderRadius: '12px', marginBottom: '24px', display: 'flex', 
            justifyContent: 'space-between', alignItems: 'center', border: '1px solid #FFEEBA'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
              ⚠️ 您的 {artist.plan_type === 'trial' ? '專業版試用期' : '專業版 Pro 訂閱'} 即將到期！
              <div style={{ fontWeight: 'normal', fontSize: '12px' }}>截止日：{formatDate(artist.plan_type === 'trial' ? artist.trial_end_at : artist.pro_expires_at)} (剩餘 {daysRemaining} 天)</div>
            </div>
            <button 
              onClick={() => navigate('/artist/settings')} 
              style={{ 
                backgroundColor: '#856404', color: '#FFFFFF', border: 'none', 
                padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', 
                fontSize: '13px', fontWeight: 'bold' 
              }}
            >
              立即查看續費方案
            </button>
          </div>
        )}

        <Outlet />
      </main>
    </div>
  );
}