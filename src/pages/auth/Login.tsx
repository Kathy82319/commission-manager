// src/pages/auth/Login.tsx
import '../../styles/Auth.css'; 

export function Login() {
  const handleLineLogin = () => {
    window.location.href = '/api/auth/line/login';
  };

  return (
    <div className="login-container">
      <h2 className="login-title">歡迎回來</h2>
      
      <button onClick={handleLineLogin} className="line-login-btn">
        <div className="line-icon">L</div>
        使用 LINE 帳號登入
      </button>

      <p className="login-footer-text">
        登入即代表您同意我們的 <a href="/terms">服務條款</a>
      </p>
    </div>
  );
}