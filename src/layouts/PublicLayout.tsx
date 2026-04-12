import { Outlet, Link } from 'react-router-dom';

export function PublicLayout() {
  
  // 🌟 按鈕樣式：實心文字、圓潤外框、微陰影
  const buttonStyle = {
    padding: '8px 18px',
    backgroundColor: 'transparent',
    color: '#5D4A3E', // 實心不透明的深色字體
    border: '2px solid #5D4A3E', // 明顯的圓潤外框
    borderRadius: '24px', // 圓角膠囊設計
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(93, 74, 62, 0.15)' // 增加立體陰影凸顯位置
  };

  return (
    // 外層容器完全透明，讓內部 PublicProfile 的背景色能無縫延伸
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'transparent' }}>
      
      {/* 🌟 頂端列：使用 absolute 讓他懸浮在畫面上方，完全不佔用排版空間 */}
      <header style={{ 
        position: 'absolute', 
        top: 0, 
        right: 0, 
        padding: '20px 24px', 
        display: 'flex', 
        gap: '16px',
        zIndex: 1000, // 確保浮在所有內容最上層
        background: 'transparent' 
      }}>
        <Link 
          to="/login" 
          style={buttonStyle}
          // 滑鼠移入時：背景填滿深色，文字反白
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#5D4A3E'; e.currentTarget.style.color = '#FFF'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#5D4A3E'; }}
        >
          登入
        </Link>
        <Link 
          to="/onboarding" 
          style={buttonStyle}
          // 滑鼠移入時：背景填滿深色，文字反白
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#5D4A3E'; e.currentTarget.style.color = '#FFF'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#5D4A3E'; }}
        >
          創建帳號
        </Link>
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