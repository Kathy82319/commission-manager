import { useNavigate } from 'react-router-dom';

export function Login() {
  const navigate = useNavigate();
  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FBFBF9', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '50px 40px', backgroundColor: '#FFFFFF', borderRadius: '16px', textAlign: 'center', boxShadow: '0 8px 30px rgba(93,74,62,0.06)', width: '100%', maxWidth: '400px', border: '1px solid #EAE6E1' }}>
        
        {/* Logo 區塊 */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ fontWeight: '900', fontSize: '26px', color: '#5D4A3E', letterSpacing: '1px', marginBottom: '8px' }}>
            Commission
          </div>
          <div style={{ fontSize: '14px', color: '#A0978D', letterSpacing: '0.5px' }}>
            繪師委託自動化管理系統
          </div>
        </div>

        <p style={{ color: '#7A7269', fontSize: '15px', marginBottom: '30px' }}>請先登入以繼續使用</p>
        
        <button 
          onClick={() => navigate('/onboarding')}
          style={{ 
            width: '100%', padding: '14px 20px', backgroundColor: '#06C755', color: '#FFFFFF', 
            border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', 
            cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 12px rgba(6,199,85,0.2)' 
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          使用 LINE 登入 (模擬)
        </button>

        <div style={{ marginTop: '24px', fontSize: '12px', color: '#C4BDB5' }}>
          登入即代表您同意本平台的服務條款與隱私權政策
        </div>
      </div>
    </div>
  );
}