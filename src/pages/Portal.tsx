// src/pages/Portal.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
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
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
          localStorage.setItem('is_logged_in', 'true');
        } else {
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

  const handleRoleSelection = (rolePath: string, roleName: string) => {
    localStorage.setItem('user_role', roleName);
    navigate(rolePath);
  };

  const handleArtistCardClick = () => {
    if (user?.role === 'client') {
      setShowUpgradeModal(true);
    } else {
      handleRoleSelection('/artist/queue', 'artist');
    }
  };

  const confirmUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/me/upgrade`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem('user_role', 'artist');
        navigate('/artist/queue');
      } else {
        alert(data.error || '升級失敗，請稍後再試。');
      }
    } catch (err) {
      console.error(err);
      alert('網路異常，無法完成升級。');
    } finally {
      setIsUpgrading(false);
      setShowUpgradeModal(false);
    }
  };

  if (!user) return <div className="portal-loading">載入中...</div>;

  return (
    <div className="portal-page">
      <div className="portal-header">
        {user.avatar_url && !avatarError ? (
          <img
            src={user.avatar_url}
            alt="avatar"
            className="portal-avatar"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div className="portal-avatar portal-avatar-default">
            <User size={40} color="#aaa" />
          </div>
        )}
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
            onClick={handleArtistCardClick}
            className={`portal-card card-artist ${user.role === 'client' ? 'locked' : ''}`}
          >
            <div className="card-icon">🖋️</div>
            <h2 className="card-title">我是創作者</h2>
            <p className="card-desc">管理排單、交付稿件並處理財務紀錄。</p>
            {user.role === 'client' && <div className="lock-badge">尚未開通</div>}
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

  
      {showUpgradeModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h2 style={{ marginTop: 0, color: '#333' }}>開通創作者身分</h2>
            <p style={{ color: '#555', lineHeight: '1.5' }}>
              您目前為委託人身分。是否要開通創作者功能？<br/>
              開通後您將解鎖排單表、作品集與接案等功能，且仍可無縫切換繼續使用原本的委託人介面。
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button 
                disabled={isUpgrading} 
                onClick={() => setShowUpgradeModal(false)}
                style={btnCancelStyle}
              >
                取消
              </button>
              <button 
                disabled={isUpgrading} 
                onClick={confirmUpgrade}
                style={btnConfirmStyle}
              >
                {isUpgrading ? '開通中...' : '確認開通'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000
};
const modalContentStyle: React.CSSProperties = {
  backgroundColor: '#fff', padding: '24px', borderRadius: '12px',
  width: '90%', maxWidth: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
};
const btnCancelStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd',
  backgroundColor: '#f5f5f5', cursor: 'pointer', color: '#333'
};
const btnConfirmStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '6px', border: 'none',
  backgroundColor: '#4A90E2', color: '#fff', cursor: 'pointer', fontWeight: 'bold'
};