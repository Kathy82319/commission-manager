import { Outlet, Link } from 'react-router-dom';

export function MainLayout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 頂端列：固定在最上方 */}
      <header style={{ 
        position: 'sticky', top: 0, backgroundColor: '#333', color: 'white', 
        padding: '15px 30px', display: 'flex', justifyContent: 'space-between', 
        alignItems: 'center', zIndex: 1000, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' 
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '20px' }}>
          繪師委託管理系統
        </div>
        
        <nav style={{ display: 'flex', gap: '20px' }}>
          <Link to="/" style={linkStyle}>公開簡介</Link>
          <Link to="/quote/new" style={linkStyle}>產出委託單</Link>
          <Link to="/dashboard" style={linkStyle}>排單與資料管理</Link>
          <Link to="/settings" style={linkStyle}>個人設定</Link>
        </nav>
      </header>

      {/* 動態內容區塊：Outlet 會根據網址自動替換成對應的頁面 */}
      <main style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <Outlet />
      </main>

    </div>
  );
}

const linkStyle = {
  color: 'white',
  textDecoration: 'none',
  fontSize: '15px',
  padding: '5px 10px',
  borderRadius: '4px'
};