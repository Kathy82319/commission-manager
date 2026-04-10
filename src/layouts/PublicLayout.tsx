import { Outlet, Link, useLocation } from 'react-router-dom';

export function PublicLayout() {
  // 取得目前的網址資訊，用來判斷現在在在哪個 Hash (#)
  const location = useLocation();
  const currentHash = location.hash || '#intro'; // 預設為 #intro

  // 動態樣式函數：如果被選中，就變成藍色並加上粗底線
  const getTabStyle = (hash: string) => ({
    color: currentHash === hash ? '#1976d2' : '#555',
    textDecoration: 'none',
    fontWeight: 'bold',
    borderBottom: currentHash === hash ? '3px solid #1976d2' : '3px solid transparent',
    paddingBottom: '10px',
    transition: 'all 0.2s ease-in-out'
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fafafa' }}>
      
      {/* 頂端列 (不變) */}
      <header style={{ backgroundColor: '#222', color: 'white', display: 'flex', justifyContent: 'space-between', padding: '10px 20px', alignItems: 'center' }}>
        <div style={{ fontWeight: 'bold' }}>Commission Manager 平台</div>
        <nav style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <span>社群：🐦 📷 📘</span>
          <Link to="/login" style={{ color: '#06C755', textDecoration: 'none', border: '1px solid #06C755', padding: '4px 12px', borderRadius: '4px', fontSize: '14px' }}>
            繪師登入 / 回後台
          </Link>
        </nav>
      </header>

      {/* 副頂端列：套用動態樣式 */}
      <div style={{ position: 'sticky', top: 0, zIndex: 999, backgroundColor: '#fff', borderBottom: '1px solid #ddd', padding: '15px 20px 0 20px', display: 'flex', gap: '20px', fontSize: '15px', justifyContent: 'center' }}>
        <a href="#intro" style={getTabStyle('#intro')}>詳細介紹</a>
        <a href="#portfolio" style={getTabStyle('#portfolio')}>作品展示區</a>
        <a href="#process" style={getTabStyle('#process')}>委託流程說明</a>
        <a href="#payment" style={getTabStyle('#payment')}>付款方式</a>
        <a href="#tos" style={getTabStyle('#tos')}>委託範圍 (規範)</a>
      </div>

      <main style={{ flex: 1, padding: '20px' }}>
        <Outlet /> 
      </main>
    </div>
  );
}