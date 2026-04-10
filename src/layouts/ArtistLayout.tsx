import { Outlet, Link } from 'react-router-dom';

// 定義目前的測試繪師 ID
const MOCK_ARTIST_ID = 'u-artist-01';

export function ArtistLayout() {
  
  // 複製網址的功能
  const copyLink = () => {
    const publicUrl = `${window.location.origin}/u/${MOCK_ARTIST_ID}`;
    navigator.clipboard.writeText(publicUrl);
    alert('公開主頁連結已複製！');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f0f2f5' }}>
      
      {/* 後台專屬黑底頂端列 */}
      <header style={{ position: 'sticky', top: 0, zIndex: 1000, backgroundColor: '#1a1a1a', color: 'white', display: 'flex', justifyContent: 'space-between', padding: '10px 20px', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
        <nav style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', color: '#4caf50', marginRight: '20px' }}>⚡ 後台管理</span>
          <Link to="/artist/quote/new" style={linkStyle}>產出委託單</Link>
          <Link to="/artist/queue" style={linkStyle}>排單表</Link>
          <Link to="/artist/notebook" style={linkStyle}>委託單管理</Link>
          <Link to="/artist/records" style={linkStyle}>結案紀錄</Link>
          <Link to="/artist/settings" style={linkStyle}>個人設定</Link>
        </nav>
        
        <nav style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* 新增：複製連結按鈕 */}
          <button 
            onClick={copyLink} 
            style={{ background: 'none', border: '1px solid #555', color: '#ccc', cursor: 'pointer', padding: '4px 10px', borderRadius: '4px', fontSize: '13px' }}
          >
            🔗 複製連結
          </button>
          
          {/* 修正：將 demo-artist 改為動態載入 MOCK_ARTIST_ID */}
          <Link to={`/u/${MOCK_ARTIST_ID}`} target="_blank" style={{ color: '#fff', textDecoration: 'none', fontSize: '13px', backgroundColor: '#333', padding: '4px 10px', borderRadius: '4px' }}>
            👁️ 預覽公開主頁
          </Link>
        </nav>
      </header>

      <main style={{ flex: 1, padding: '20px' }}>
        <Outlet />
      </main>
    </div>
  );
}

const linkStyle = { color: '#ccc', textDecoration: 'none', fontSize: '14px' };