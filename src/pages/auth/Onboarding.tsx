// src/pages/auth/Onboarding.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

  if (loading) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#5D4A3E' }}>載入中...</div>;

  const cardStyle = (isSelected: boolean) => ({
    flex: '1 1 0', padding: '24px', borderRadius: '16px', border: `2px solid ${isSelected ? '#5D4A3E' : '#EAE6E1'}`,
    backgroundColor: isSelected ? '#F4F0EB' : '#FFFFFF', cursor: 'pointer', transition: 'all 0.2s ease',
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '12px',
    minWidth: '160px' // 防止在堆疊前縮得太小
  });

  return (
    <div style={{ backgroundColor: '#FBFBF9', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      
      <style>{`
        .role-cards-container { display: flex; gap: 16px; width: 100%; }
        @media (max-width: 600px) {
          .role-cards-container { flex-direction: column; }
        }
      `}</style>

      <div style={{ maxWidth: '500px', width: '100%', padding: '40px 30px', backgroundColor: '#FFFFFF', borderRadius: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', pointerEvents: submitting ? 'none' : 'auto' }}>
        <h2 style={{ margin: '0 0 8px 0', textAlign: 'center', color: '#5D4A3E' }}>歡迎來到 Arti 繪師小幫手！</h2>
        <p style={{ margin: '0 0 32px 0', textAlign: 'center', color: '#A0978D', fontSize: '14px' }}>
          花 10 秒鐘設定您的暱稱，開始您的旅程。
        </p>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#5D4A3E' }}>您在平台上的暱稱</label>
          <input 
            type="text" 
            maxLength={50}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="例如：王小明"
            style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #DED9D3', fontSize: '15px', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold', fontSize: '14px', color: '#5D4A3E' }}>您主要想使用什麼功能？</label>
          <div className="role-cards-container">
            <div style={cardStyle(role === 'artist')} onClick={() => setRole('artist')}>
              <span style={{ fontSize: '32px' }}>🎨</span>
              <div style={{ fontWeight: 'bold' }}>我是繪師</div>
              <div style={{ fontSize: '12px', color: '#A0978D', textAlign: 'center' }}>管理委託、建立作品集</div>
            </div>
            
            <div style={cardStyle(role === 'client')} onClick={() => setRole('client')}>
              <span style={{ fontSize: '32px' }}>🌟</span>
              <div style={{ fontWeight: 'bold' }}>我是委託方</div>
              <div style={{ fontSize: '12px', color: '#A0978D', textAlign: 'center' }}>發案、追蹤稿件進度</div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={submitting || !displayName || !role}
          style={{
            width: '100%', padding: '14px', backgroundColor: submitting || !displayName || !role ? '#DED9D3' : '#5D4A3E',
            color: '#FFFFFF', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold',
            cursor: submitting || !displayName || !role ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s',
            boxShadow: submitting || !displayName || !role ? 'none' : '0 4px 12px rgba(93,74,62,0.2)'
          }}
        >
          {submitting ? '設定中...' : '完成設定，進入平台'}
        </button>
      </div>
    </div>
  );
}