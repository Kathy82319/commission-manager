//(初始登入頁)
import { useNavigate } from 'react-router-dom';


export function Login() {
  const navigate = useNavigate();
  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' }}>
      <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h2>繪師委託自動化管理系統</h2>
        <p>請先登入以繼續使用</p>
        <button 
          onClick={() => navigate('/onboarding')}
          style={{ padding: '10px 20px', backgroundColor: '#06C755', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', marginTop: '20px' }}
        >
          使用 LINE 登入 (模擬跳轉)
        </button>
      </div>
    </div>
  );
}