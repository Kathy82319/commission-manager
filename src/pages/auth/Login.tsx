// src/pages/auth/Login.tsx
import '../../styles/Auth.css'; 

export function Login() {
  const handleLineLogin = () => {
    // 導向後端 LINE OAuth 流程
    window.location.href = '/api/auth/line/login';
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">開始使用 Arti</h2>
        
        {/* 🌟 登入中繼說明區塊 */}
        <div className="login-gateway-info">
          <h3>關於您的隱私與身分</h3>
          <ul>
            <li>
              <strong>真實人類認證：</strong> 
              我們僅透過 LINE 驗證您是真實使用者，防止惡意機器人與免洗帳號。
            </li>
            <li>
              <strong>隨機亂數 ID：</strong> 
              系統會為您產出一個完全隨機的亂數 ID（例如：User_48884）作為唯一識別碼，平台將以該 ID 進行識別與管理。
            </li>
          </ul>
        </div>

        <button onClick={handleLineLogin} className="line-login-btn">
          <span className="line-icon-wrapper">
            透過 LINE 繼續
          </span>         
        </button>

        <p className="login-footer-text">
          登入即代表您同意我們的 <a href="/terms">服務條款</a> 與 <a href="/privacy">隱私權政策</a>
        </p>
      </div>
    </div>
  );
}