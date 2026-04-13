import { Outlet, Link } from 'react-router-dom';

export function PublicLayout() {
  
  // 🌟 新增：處理登入點擊的函式 (加入絕對網址與保底機制)
  const handleLoginClick = () => {
  // 直接寫死 Worker 的網址，排除環境變數失效的可能性
  const WORKER_URL = 'https://commission-manager.cath82319.workers.dev';
  window.location.href = `${WORKER_URL}/api/auth/line/login`;
};

  return (
    // 外層容器完全透明，讓內部 PublicProfile 的背景色能無縫延伸
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'transparent' }}>
      
      {/* 🌟 頂端列：合併後的登入/註冊按鈕 */}
      <header style={{ 
        position: 'absolute', top: 0, right: 0, padding: '20px 24px', 
        display: 'flex', gap: '16px', zIndex: 1000, background: 'transparent' 
      }}>
        <button 
          onClick={handleLoginClick} // 🌟 改為觸發我們寫好的絕對網址函式
          style={{
            padding: '8px 20px',
            backgroundColor: 'transparent',
            color: '#5D4A3E',
            border: '2px solid #5D4A3E',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(93, 74, 62, 0.15)'
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#5D4A3E'; e.currentTarget.style.color = '#FFF'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#5D4A3E'; }}
        >
          登入 / 註冊
        </button>
      </header>

      {/* 內容插槽：讓繪師頁面佔滿整個畫面 */}
      <main style={{ flex: 1, width: '100%' }}>
        <Outlet />
      </main>

      {/* 🌟 底端列：保持原本的極度低調設計 */}
      <footer style={{ 
        padding: '24px 20px', 
        textAlign: 'center',
        background: 'transparent',
        marginTop: 'auto'
      }}>
        {/* 非常淡的分隔線 */}
        <div style={{ 
          width: '100%', 
          maxWidth: '300px', 
          margin: '0 auto 12px auto', 
          borderTop: '1px solid rgba(93, 74, 62, 0.15)' 
        }} />
        
        {/* 極度低調的文字 */}
        <div style={{ fontSize: '11px', color: 'rgba(93, 74, 62, 0.4)', letterSpacing: '1px' }}>
          <Link 
            to="/terms" 
            style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(93, 74, 62, 0.8)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(93, 74, 62, 0.4)'}
          >
            服務條款
          </Link>
          <span style={{ margin: '0 12px', opacity: 0.5 }}>|</span>
          <Link 
            to="/privacy" 
            style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(93, 74, 62, 0.8)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(93, 74, 62, 0.4)'}
          >
            隱私權政策
          </Link>
        </div>
      </footer>
    </div>
  );
}