import { Outlet, useNavigate, useLocation } from 'react-router-dom';

export function ClientLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/client';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#778ca4', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      
      {/* 頂端導覽列：滿版寬度，內部置中對齊內容 */}
      <header style={{ 
        backgroundColor: '#e8ecf3', padding: '0 20px', display: 'flex', justifyContent: 'center', 
        borderBottom: '1px solid #d0d8e4', boxShadow: '0 2px 10px rgba(100,120,140,0.05)', position: 'sticky', top: 0, zIndex: 50 
      }}>
        <div style={{ width: '100%', maxWidth: '500px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontWeight: '900', fontSize: '18px', color: '#475569', letterSpacing: '0.5px' }}>
              Commission
            </div>
            <span style={{ fontSize: '12px', color: '#4A7294', backgroundColor: '#EBF2F7', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
              委託方中心
            </span>
          </div>
          
          <nav style={{ display: 'flex', gap: '10px' }}>
            {!isHome && (
              <button 
                onClick={() => navigate('/client')} 
                style={{ background: 'none', border: 'none', color: '#556577', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', transition: 'background-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#d9dfe9'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                返回首頁
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* 主要內容區：移除預設 padding，交由子頁面自行決定 */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}