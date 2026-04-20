// src/layouts/AdminLayout.tsx
import { Outlet, useNavigate } from 'react-router-dom';

export function AdminLayout() {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
      <aside style={{ width: '260px', backgroundColor: '#111827', color: '#F9FAFB', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh' }}>
        <div style={{ padding: '32px 24px', fontSize: '20px', fontWeight: '900', color: '#FFF', borderBottom: '1px solid #1F2937' }}>
          <span style={{ color: '#3B82F6' }}>ADMIN</span> PANEL
        </div>
        
        <nav style={{ flex: 1, padding: '24px 16px' }}>
          <div style={{ padding: '12px 16px', backgroundColor: '#1F2937', borderRadius: '8px', color: '#FFF', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
             📊 營運數據儀表板
          </div>
        </nav>

        <div style={{ padding: '24px', borderTop: '1px solid #1F2937' }}>
          <button 
            onClick={() => navigate('/portal')}
            style={{ 
              width: '100%', 
              padding: '12px', 
              backgroundColor: 'transparent', 
              color: '#9CA3AF', 
              border: '1px solid #374151', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#FFF'; e.currentTarget.style.borderColor = '#4B5563'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.borderColor = '#374151'; }}
          >
            ← 返回一般入口
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, marginLeft: '260px', padding: '40px' }}>
        <Outlet />
      </main>
    </div>
  );
}