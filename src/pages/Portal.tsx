// src/pages/Portal.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Portal.css'; 

interface UserProfile {
  display_name: string;
  avatar_url: string;
  role?: string;
}

export function Portal() {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
          // 💡 當確認使用者已登入，可以先寫入一個基礎的登入標記
          // 這樣即使他還沒選角色，右上角至少可以顯示「回到管理後台」
          localStorage.setItem('is_logged_in', 'true');
        } else {
          // 如果驗證失敗，記得清除前端的 UI 標記
          localStorage.removeItem('is_logged_in');
          localStorage.removeItem('user_role');
          navigate('/login'); 
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUser();
  }, [navigate, API_BASE]);

  // 💡 處理角色選擇，並在跳轉前寫入 localStorage
  const handleRoleSelection = (rolePath: string, roleName: string) => {
    localStorage.setItem('user_role', roleName);
    navigate(rolePath);
  };

  if (!user) return <div className="portal-loading">載入中...</div>;

  return (
    <div className="portal-page">
      
      <div className="portal-header">
        <img 
          src={user.avatar_url || 'https://via.placeholder.com/100'} 
          alt="avatar" 
          className="portal-avatar"
        />
        <h1 className="portal-title">歡迎回來，{user.display_name}</h1>
        <p className="portal-subtitle">請問您今天想進入哪個模式？</p>
      </div>

      <div className="portal-content">
        
        <div className="portal-cards-container">
          
          <div 
            onClick={() => handleRoleSelection('/client/orders', 'client')}
            className="portal-card card-client"
          >
            <div className="card-icon">🎨</div>
            <h2 className="card-title">我是委託人</h2>
            <p className="card-desc">查看委託進度、審閱稿件或下載原檔。</p>
          </div>

          <div 
            onClick={() => handleRoleSelection('/artist/notebook', 'artist')}
            className="portal-card card-artist"
          >
            <div className="card-icon">🖋️</div>
            <h2 className="card-title">我是創作者</h2>
            <p className="card-desc">管理排單、交付稿件並處理財務紀錄。</p>
          </div>
        </div>
        
        {user?.role === 'admin' && (
          <div className="admin-section">
            <button
              onClick={() => handleRoleSelection('/admin', 'admin')}
              className="admin-btn"
            >
              ⚙️ 進入系統管理後台
            </button>
          </div>
        )}
      </div>
    </div>
  );
}