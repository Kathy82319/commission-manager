import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function Onboarding() {
  const navigate = useNavigate();
  const [focusedField, setFocusedField] = useState<string | null>(null);

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FBFBF9', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '50px 40px', backgroundColor: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '420px', boxShadow: '0 8px 30px rgba(93,74,62,0.06)', border: '1px solid #EAE6E1' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#5D4A3E', fontSize: '24px' }}>歡迎來到 Commission</h2>
          <p style={{ margin: 0, color: '#A0978D', fontSize: '14px' }}>只需兩步，完成初次設定</p>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#5D4A3E', fontSize: '14px' }}>請設定您的預設顯示暱稱</label>
          <input 
            type="text" 
            placeholder="例如：叉子 Foku" 
            onFocus={() => setFocusedField('nickname')}
            onBlur={() => setFocusedField(null)}
            style={{ 
              width: '100%', padding: '14px 16px', boxSizing: 'border-box',
              borderRadius: '10px', border: focusedField === 'nickname' ? '2px solid #A67B3E' : '1px solid #DED9D3',
              backgroundColor: '#FBFBF9', color: '#5D4A3E', fontSize: '15px', outline: 'none',
              transition: 'all 0.2s ease', boxShadow: focusedField === 'nickname' ? '0 0 0 3px rgba(166,123,62,0.1)' : 'none'
            }} 
          />
        </div>
        
        <div style={{ borderTop: '1px dashed #EAE6E1', paddingTop: '30px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#5D4A3E', fontSize: '15px', textAlign: 'center' }}>您在此平台的主要身分是？</h3>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button 
              onClick={() => navigate('/artist')} 
              style={btnStyle('#5D4A3E', '#FFFFFF', '0 4px 12px rgba(93,74,62,0.2)')}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              我是繪師<br/>
              <span style={{ fontSize: '12px', fontWeight: 'normal', opacity: 0.8, marginTop: '4px', display: 'inline-block' }}>開啟接案管理後台</span>
            </button>
            <button 
              onClick={() => navigate('/client')} 
              style={btnStyle('#FFFFFF', '#5D4A3E', '0 2px 8px rgba(0,0,0,0.05)', '1px solid #DED9D3')}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#A67B3E'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#DED9D3'; }}
            >
              我是委託方<br/>
              <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#A0978D', marginTop: '4px', display: 'inline-block' }}>檢視與管理我的訂單</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

const btnStyle = (bg: string, text: string, shadow: string, border: string = 'none') => ({
  flex: 1, 
  padding: '16px', 
  backgroundColor: bg, 
  color: text, 
  border: border, 
  borderRadius: '12px', 
  fontSize: '16px', 
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: shadow,
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: '1.2'
});