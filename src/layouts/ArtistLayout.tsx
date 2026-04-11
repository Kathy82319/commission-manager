import { Outlet, Link, useLocation } from 'react-router-dom';

const MOCK_ARTIST_ID = 'u-artist-01';

export function ArtistLayout() {
  const location = useLocation();

  const copyLink = () => {
    const publicUrl = `${window.location.origin}/u/${MOCK_ARTIST_ID}`;
    navigator.clipboard.writeText(publicUrl);
    alert('公開主頁連結已複製！');
  };

  // 判斷目前是否在該路由，用以標示所在頁面
  const isActive = (path: string) => location.pathname.includes(path);

  const navItems = [
    { path: '/artist/quote/new', label: '產出委託單' },
    { path: '/artist/queue', label: '排單表' },
    { path: '/artist/notebook', label: '委託單管理' },
    { path: '/artist/records', label: '結案紀錄' },
    { path: '/artist/settings', label: '個人設定' }
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#FBFBF9', color: '#4A4A4A', fontFamily: 'sans-serif' }}>
      
      {/* 左側固定式側邊欄 */}
      <aside style={{ width: '240px', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', borderRight: '1px solid #EAE6E1', boxShadow: '4px 0 20px rgba(0,0,0,0.02)', position: 'sticky', top: 0, height: '100vh' }}>
        
        {/* 平台 Logo / 標題區 */}
        <div style={{ padding: '30px 20px', borderBottom: '1px solid #F0ECE7' }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#5D4A3E', letterSpacing: '0.5px' }}>Commission</div>
          <div style={{ fontSize: '13px', color: '#A0978D', marginTop: '4px' }}>Artist Dashboard</div>
        </div>

        {/* 導覽選單 */}
        <nav style={{ flex: 1, padding: '20px 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {navItems.map(item => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  textDecoration: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: active ? '#F4F0EB' : 'transparent',
                  color: active ? '#5D4A3E' : '#7A7269',
                  fontWeight: active ? 'bold' : 'normal',
                  transition: 'all 0.2s ease',
                  fontSize: '15px'
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = '#FAFAFA'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 底部操作區 */}
        <div style={{ padding: '20px', borderTop: '1px solid #F0ECE7', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={copyLink}
            style={{
              width: '100%', padding: '10px', backgroundColor: '#FFFFFF', border: '1px solid #DED9D3', borderRadius: '8px',
              color: '#7A7269', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s ease', fontWeight: 'bold'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAFAFA'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
          >
            複製專屬連結
          </button>
          <Link
            to={`/u/${MOCK_ARTIST_ID}`}
            target="_blank"
            style={{
              width: '100%', padding: '10px', backgroundColor: '#5D4A3E', color: '#FFFFFF', textDecoration: 'none',
              borderRadius: '8px', fontSize: '14px', textAlign: 'center', fontWeight: 'bold', transition: 'background-color 0.2s ease', boxSizing: 'border-box'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#4A3A30'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#5D4A3E'}
          >
            預覽公開主頁
          </Link>
        </div>
      </aside>

      {/* 右側主內容區 */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}