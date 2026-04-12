


export function Login() {
  

const handleLineLogin = () => {
  // ✅ 這是正確的：強制瀏覽器離開 React，前往後端 API
  window.location.href = '/api/auth/line/login';
};

  const containerStyle = {
    backgroundColor: '#FBFBF9',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'sans-serif',
    color: '#5D4A3E'
  };

  const loginButtonStyle = {
    padding: '12px 32px',
    backgroundColor: '#06C755', // LINE 品牌綠色
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '24px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(6, 199, 85, 0.3)',
    transition: 'transform 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
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
        {/* LINE 圖示 (簡化版) */}
        <span style={{ fontSize: '20px' }}>L</span>
        使用 LINE 帳號登入
      </button>

      <p style={{ marginTop: '24px', fontSize: '13px', color: '#A0978D' }}>
        登入即代表您同意我們的 <a href="/terms" style={{ color: 'inherit' }}>服務條款</a>
      </p>
    </div>
  );
}