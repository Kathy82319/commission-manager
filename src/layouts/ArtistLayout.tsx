import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

export function ArtistLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 儲存從資料庫撈回來的真實繪師資料
  const [artist, setArtist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. 讀取 Cookie 的小工具
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  // 2. 驗證身分與撈取資料
  useEffect(() => {
    const userId = getCookie('user_id');
    
    // 如果沒有 Cookie，代表沒登入，踢回登入頁
    if (!userId) {
      navigate('/login');
      return;
    }

    // 拿著 userId 去跟後端要完整的資料 (包含創建時間、訂閱狀態)
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setArtist(data.data);
        } else {
          // 如果資料庫找不到這個人，一樣踢回登入頁
          navigate('/login');
        }
      })
      .catch(err => console.error("撈取繪師資料失敗", err))
      .finally(() => setLoading(false));
  }, [navigate]);

  // 3. 計算試用期剩餘天數
  const getTrialInfo = () => {
    if (!artist) return null;
    if (artist.subscription_type === 'pro') return { isPro: true, daysLeft: 0 };
    
    const createdDate = new Date(artist.created_at);
    const now = new Date();
    // 計算相差的毫秒數並轉為天數
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // 7天試用，最多扣到 0
    const daysLeft = Math.max(0, 7 - diffDays);
    return { isPro: false, daysLeft };
  };

  // 複製連結邏輯
  const copyLink = () => {
    if (!artist) return;
    const publicUrl = `${window.location.origin}/@${artist.public_id}`;
    navigator.clipboard.writeText(publicUrl);
    alert('公開主頁連結已複製！');
  };

  const isActive = (path: string) => location.pathname.includes(path);

  const navItems = [
    { path: '/artist/quote/new', label: '產出委託單' },
    { path: '/artist/queue', label: '排單表' },
    { path: '/artist/notebook', label: '委託單管理' },
    { path: '/artist/records', label: '結案紀錄' },
    { path: '/artist/settings', label: '個人設定' }
  ];

  // 如果還在讀取身分，先顯示一個優雅的載入中畫面
  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#A0978D' }}>驗證身分中...</div>;
  }

  const trialInfo = getTrialInfo();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#FBFBF9', color: '#4A4A4A', fontFamily: 'sans-serif' }}>
      
      {/* 左側固定式側邊欄 */}
      <aside style={{ width: '240px', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', borderRight: '1px solid #EAE6E1', boxShadow: '4px 0 20px rgba(0,0,0,0.02)', position: 'sticky', top: 0, height: '100vh' }}>
        
        {/* 平台 Logo / 標題區 */}
        <div style={{ padding: '30px 20px', borderBottom: '1px solid #F0ECE7' }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#5D4A3E', letterSpacing: '0.5px' }}>Commission</div>
          <div style={{ fontSize: '13px', color: '#A0978D', marginTop: '4px' }}>Artist Dashboard</div>
          
          {/* 🌟 商業邏輯：低調的試用期與升級按鈕 (僅免費版顯示) */}
          {trialInfo && !trialInfo.isPro && (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#A05C5C', fontWeight: 'bold' }}>
                剩餘試用：{trialInfo.daysLeft} 天
              </span>
              <button 
                onClick={() => navigate('/artist/settings')} // 引導去設定頁面付費
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid #DED9D3',
                  borderRadius: '12px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#7A7269',
                  transition: 'all 0.2s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F4F0EB'; e.currentTarget.style.color = '#5D4A3E'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#7A7269'; }}
              >
                立即升級專業版
              </button>
            </div>
          )}
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

          {/* 🌟 新增：身分切換按鈕 */}
          <button
            onClick={() => {
              navigate('/client/home');
            }}
            style={{
              width: '100%', padding: '10px', backgroundColor: '#F4F0EB', border: '1px dashed #DED9D3', borderRadius: '8px',
              color: '#5D4A3E', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s ease', fontWeight: 'bold',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EAE6E1'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F4F0EB'}
          >
            <span></span> 切換為委託方模式
          </button>

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
            to={`/@${artist?.public_id}`}
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

          

          {/* 🌟 法律說明連結：極簡處理，不搶眼 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '8px', fontSize: '11px', color: '#C4BDB5' }}>
            <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>服務條款</Link>
            <span>|</span>
            <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>隱私政策</Link>
          </div>
        </div>
      </aside>

      {/* 右側主內容區 */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}