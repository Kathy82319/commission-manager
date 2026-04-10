//(委託人專用：行動端友善)
import { Outlet, Link } from 'react-router-dom';

export function ClientLayout() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', maxWidth: '480px', margin: '0 auto', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
      {/* 手機版頂端列 */}
      <header style={{ backgroundColor: '#1976d2', color: 'white', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold' }}>委託人中心</span>
        <nav style={{ display: 'flex', gap: '10px' }}>
          <Link to="/client" style={{ color: 'white', textDecoration: 'none' }}>首頁</Link>
        </nav>
      </header>

      <main style={{ padding: '15px' }}>
        <Outlet />
      </main>
    </div>
  );
}