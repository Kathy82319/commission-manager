// src/layouts/AdminLayout.tsx
import { Outlet, useNavigate } from 'react-router-dom';

export function AdminLayout() {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F3F4F6' }}>
      {/* 側邊欄 */}
      <aside style={{ width: '260px', backgroundColor: '#111827', color: '#FFF', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', fontSize: '20px', fontWeight: 'bold', borderBottom: '1px solid #1F2937' }}>
          🛡️ 系統管理中心
        </div>
        <nav style={{ flex: 1, padding: '20px' }}>
          <div style={{ color: '#9CA3AF', fontSize: '12px', fontWeight: 'bold', marginBottom: '12px', letterSpacing: '1px' }}>核心管理</div>
          <div style={{ padding: '12px', backgroundColor: '#1F2937', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px' }}>
            📊 數據總覽
          </div>
        </nav>
        <div style={{ padding: '20px', borderTop: '1px solid #1F2937' }}>
          <button 
            onClick={() => navigate('/portal')}
            style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#9CA3AF', border: '1px solid #374151', borderRadius: '6px', cursor: 'pointer' }}
          >
            ← 返回入口
          </button>
        </div>
      </aside>

      {/* 主內容區 */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}