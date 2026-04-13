import React from 'react';

// 🌟 樣式定義 (保持你原本的設計風格)
const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#778ca4', // 沿用你最喜歡的深藍灰
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'sans-serif',
  color: '#FFFFFF'
};

const loginButtonStyle: React.CSSProperties = {
  backgroundColor: '#06C755', // LINE 綠色
  color: 'white',
  border: 'none',
  padding: '12px 24px',
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: 'bold',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  transition: 'transform 0.2s',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
};

export function Login() {
  const handleLineLogin = () => {
    // 🌟 核心修改：使用絕對網址，並優先讀取變數，保底寫死正式 Worker 網址
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://commission-manager.cath82319.workers.dev';
    console.log("跳轉至後端登入:", `${API_BASE}/api/auth/line/login`);
    window.location.href = `${API_BASE}/api/auth/line/login`;
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ marginBottom: '32px', letterSpacing: '2px' }}>歡迎回來</h2>
      
      <button 
        onClick={handleLineLogin}
        style={loginButtonStyle}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <div style={{ 
          width: '30px', height: '30px', backgroundColor: '#FFFFFF', color: '#06C755', 
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' 
        }}>
          L
        </div>
        使用 LINE 帳號登入
      </button>

      <p style={{ marginTop: '24px', fontSize: '13px', color: '#E0E6ED' }}>
        登入即代表您同意我們的 <a href="/terms" style={{ color: 'inherit', textDecoration: 'underline' }}>服務條款</a>
      </p>
    </div>
  );
}