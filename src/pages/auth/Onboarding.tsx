// src/pages/auth/Onboarding.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/Auth.css'; // 🌟 引入相同的 Auth.css

export function Onboarding() {
  const navigate = useNavigate();
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';
  
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'artist' | 'client' | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/me`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (res.status === 401 || res.status === 403) {
          navigate('/login');
          return;
        }

        const data = await res.json();
        if (data.success && data.data) {
          // 如果已經有身分，直接導向
          if (data.data.role === 'artist') navigate('/artist/queue');
          else if (data.data.role === 'client') navigate('/client/orders');
          
          setDisplayName(data.data.display_name || '');
        }
      } catch (error) {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchCurrentUser();
  }, [navigate, API_BASE]);
  
  const handleSubmit = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName || !role) {
      alert('請填寫暱稱並選擇一個身分！');
      return;
    }

    // 🌟 資安補強：限制暱稱長度，防止異常字串攻擊
    if (trimmedName.length > 50) {
      alert('暱稱長度請限制在 50 字以內。');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/me/complete-onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ display_name: trimmedName, role })
      });
      const result = await res.json();

      if (result.success) {
        if (role === 'artist') navigate('/artist/queue');
        else if (role === 'client') navigate('/client/orders');
      } else {
        alert('設定失敗：' + result.error);
      }
    } catch (error) {
      alert('網路連線錯誤');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-screen">載入中...</div>;

  return (
    <div className="onboarding-page">
      <div className="onboarding-card" style={{ pointerEvents: submitting ? 'none' : 'auto' }}>
        <h2 className="onboarding-title">歡迎來到 Arti 繪師小幫手！</h2>
        <p className="onboarding-subtitle">
          花 10 秒鐘設定您的暱稱，開始您的旅程。
        </p>

        <div className="form-section">
          <label className="form-label">您在平台上的暱稱</label>
          <input 
            type="text" 
            maxLength={50}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="例如：王小明"
            className="form-input"
          />
        </div>

        <div>
          <label className="form-label" style={{ marginBottom: '12px' }}>您主要想使用什麼功能？</label>
          <div className="role-cards-container">
            <div 
              className={`role-card ${role === 'artist' ? 'selected' : ''}`} 
              onClick={() => setRole('artist')}
            >
              <span className="role-icon">🎨</span>
              <div className="role-title">我是繪師</div>
              <div className="role-desc">管理委託、建立作品集</div>
            </div>
            
            <div 
              className={`role-card ${role === 'client' ? 'selected' : ''}`} 
              onClick={() => setRole('client')}
            >
              <span className="role-icon">🌟</span>
              <div className="role-title">我是委託方</div>
              <div className="role-desc">發案、追蹤稿件進度</div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={submitting || !displayName || !role}
          className="submit-btn"
        >
          {submitting ? '設定中...' : '完成設定，進入平台'}
        </button>
      </div>
    </div>
  );
}