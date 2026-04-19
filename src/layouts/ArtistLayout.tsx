// src/layouts/ArtistLayout.tsx

import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/ArtistLayout.css'; 

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
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="mobile-menu-btn">
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#5D4A3E', lineHeight: '1' }}>Arti繪師小幫手</div>
          <div style={{ fontSize: '13px', color: '#A0978D', lineHeight: '1.2', marginTop: '4px' }}>管理後台</div>
        </div>
      </header>

      {/* 2. 側邊欄與遮罩 (🌟 移到最外層，脫離 Flex 文件流) */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#5D4A3E' }}>Arti繪師小幫手</div>
          <div style={{ fontSize: '13px', color: '#A0978D', marginBottom: '16px' }}>繪師管理後台</div>
        </div>
        
        <nav className="nav-container">
          {navItems.map(item => (
            <Link key={item.path} to={item.path} className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button onClick={() => navigate('/client/orders')} className="sidebar-btn btn-client">切換為委託方模式</button>
          <button onClick={handlePreviewAndCopy} className="sidebar-btn btn-preview">預覽/複製個人首頁</button>
        </div>
      </aside>

      {/* 3. 遮罩層 (🌟 移到最外層) */}
      {isMobileMenuOpen && <div onClick={() => setIsMobileMenuOpen(false)} className="mobile-overlay" />}

      {/* 4. 主內容區塊 (🌟 現在它獨佔 layout-body) */}
      <div className="layout-body">
        <main className="main-content">
          <div className="content-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}