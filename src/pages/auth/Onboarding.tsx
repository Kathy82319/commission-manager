//(設定暱稱與身分)
import { useNavigate } from 'react-router-dom';

export function Onboarding() {
  const navigate = useNavigate();
  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' }}>
      <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '8px', width: '400px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h2>初次設定</h2>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>請設定您的暱稱：</label>
          <input type="text" placeholder="輸入暱稱" style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
        </div>
        
        <h3 style={{ marginTop: '30px' }}>請選擇您的身分：</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate('/artist')} style={btnStyle('#333')}>我是繪師</button>
          <button onClick={() => navigate('/client')} style={btnStyle('#1976d2')}>我是委託方</button>
        </div>
      </div>
    </div>
  );
}

const btnStyle = (color: string) => ({
  flex: 1, padding: '15px', backgroundColor: color, color: 'white', 
  border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer'
});