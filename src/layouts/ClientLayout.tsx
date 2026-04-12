// src/layouts/ClientLayout.tsx
import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

export function ClientLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. 讀取 Cookie 檢查身分
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  useEffect(() => {
    const userId = getCookie('user_id');
    if (!userId) {
      navigate('/login');
      return;
    }

    // 驗證身分
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.id) {
          if (data.role === 'pending') navigate('/onboarding');
          setClient(data);
        } else if (data && data.success && data.data) {
          if (data.data.role === 'pending') navigate('/onboarding');
          setClient(data.data);
        } else {
          navigate('/login');
        }
      })
      .catch(err => console.error("撈取資料失敗", err))
      .finally(() => setLoading(false));
  }, [navigate]);

  // 手機版底部導覽列項目
  const navItems = [
    { path: '/client/home', label: '探索', icon: '✨' },
    { path: '/client/orders', label: '我的委託', icon: '📋' },
    { path: '/client/messages', label: '訊息', icon: '💬' },
    { path: '/client/profile', label: '個人', icon: '👤' }
  ];

  if (loading) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#A0978D' }}>載入中...</div>;

  return (
    // 🌟 最外層：滿版、帶有淡淡的背景色，讓中間的手機容器凸顯出來
    <div style={{ minHeight: '100vh', backgroundColor: '#EAE6E1', display: 'flex', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      
      {/* 🌟 核心容器：模擬手機寬度 (最大 480px)，白色背景，帶陰影 */}
      <div style={{ 
        width: '100%', 
        maxWidth: '480px', 
        backgroundColor: '#FFFFFF', 
        display: 'flex', 
        flexDirection: 'column',
        boxShadow: '0 0 40px rgba(93, 74, 62, 0.08)',
        position: 'relative' // 讓底部導覽列可以絕對定位在這個容器內
      }}>
        
        {/* 頂部 Header */}
        <header style={{ 
          padding: '16px 20px', 
          borderBottom: '1px solid #F0ECE7', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#5D4A3E', letterSpacing: '0.5px' }}>
            Commission
          </div>
          
          {/* 🌟 雙棲切換按鈕：讓委託方可以隨時切換回繪師後台 */}
          <button 
            onClick={() => window.location.href = '/artist/queue'}
            style={{
              backgroundColor: '#F4F0EB', border: 'none', borderRadius: '20px', padding: '6px 12px',
              fontSize: '12px', fontWeight: 'bold', color: '#7A7269', cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EAE6E1'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F4F0EB'}
          >
            切換至繪師
          </button>
        </header>

        {/* 主要內容區 (Outlet)：允許內部滾動，並預留底部導覽列的空間 */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px', paddingBottom: '80px' }}>
          <Outlet />
        </main>

        {/* 🌟 底部行動導覽列 (Bottom Navigation) */}
        <nav style={{
          position: 'absolute', 
          bottom: 0, 
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #F0ECE7',
          display: 'flex',
          justifyContent: 'space-around',
          padding: '12px 0',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', // 適配 iPhone 底部黑條
          boxShadow: '0 -4px 12px rgba(0,0,0,0.02)'
        }}>
          {navItems.map(item => {
            const active = location.pathname.includes(item.path);
            return (
              <Link 
                key={item.path} 
                to={item.path}
                style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  textDecoration: 'none', color: active ? '#5D4A3E' : '#C4BDB5',
                  transition: 'color 0.2s'
                }}
              >
                <span style={{ fontSize: '20px', filter: active ? 'none' : 'grayscale(100%) opacity(0.6)' }}>
                  {item.icon}
                </span>
                <span style={{ fontSize: '11px', fontWeight: active ? 'bold' : 'normal' }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

      </div>
    </div>
  );
}