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
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        
        // 🔒 安全修正：不依賴 LocalStorage，直接向後端要 /me 驗證 Cookie
        const res = await fetch(`${API_BASE}/api/users/me`, {
          credentials: 'include'
        });

        // 如果未登入或 Cookie 失效，踢回登入頁
        if (res.status === 401 || res.status === 403) {
          navigate('/login');
          return;
        }

        const data = await res.json();
        
        if (data.success && data.data) {
          // 檢查身分，如果不是繪師卻誤闖，導向正確位置
          if (data.data.role === 'pending') {
            navigate('/onboarding');
          } else if (data.data.role === 'client') {
            navigate('client/ClientOrders');
          } else {
            // 確認是繪師，放行並存入資料
            setArtist(data.data);
          }
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

  const copyLink = () => {
    if (!artist) return;
    const publicUrl = `${window.location.origin}/@${artist.public_id}`;
    navigator.clipboard.writeText(publicUrl);
    alert('公開主頁連結已複製！');
  };

  const isActive = (path: string) => location.pathname.includes(path);
  const navItems = [
    { path: '/artist/quote/new', label: '產出委託單' },
    { path: '/artist/queue', label: '排單表' },
    { path: '/artist/notebook', label: '委託單管理' },
    { path: '/artist/records', label: '結案紀錄' },
    { path: '/artist/settings', label: '個人設定' }
  ];

  if (loading) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#A0978D' }}>驗證身分中...</div>;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#FBFBF9', color: '#4A4A4A', fontFamily: 'sans-serif' }}>
      <aside style={{ width: '240px', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', borderRight: '1px solid #EAE6E1', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '30px 20px', borderBottom: '1px solid #F0ECE7' }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#5D4A3E' }}>Commission</div>
          <div style={{ fontSize: '13px', color: '#A0978D' }}>Artist Dashboard</div>
        </div>
        <nav style={{ flex: 1, padding: '20px 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {navItems.map(item => (
            <Link key={item.path} to={item.path} style={{ textDecoration: 'none', padding: '12px 16px', borderRadius: '8px', backgroundColor: isActive(item.path) ? '#F4F0EB' : 'transparent', color: isActive(item.path) ? '#5D4A3E' : '#7A7269', fontWeight: isActive(item.path) ? 'bold' : 'normal', fontSize: '15px' }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ padding: '20px', borderTop: '1px solid #F0ECE7', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => navigate('client/ClientOrders')} style={{ width: '100%', padding: '10px', backgroundColor: '#F4F0EB', border: '1px dashed #DED9D3', borderRadius: '8px', color: '#5D4A3E', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
            切換為委託方模式
          </button>
          <button onClick={copyLink} style={{ width: '100%', padding: '10px', backgroundColor: '#FFFFFF', border: '1px solid #DED9D3', borderRadius: '8px', color: '#7A7269', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
            複製個人公開首頁連結
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}