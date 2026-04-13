// src/pages/auth/Onboarding.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function Onboarding() {
  const navigate = useNavigate();
  
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'artist' | 'client' | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

// src/pages/auth/Onboarding.tsx (節錄修改部分)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let id = urlParams.get('u');

    if (id) {
      localStorage.setItem('user_id', id); 
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      id = localStorage.getItem('user_id');
    }

    if (!id) {
      navigate('/login');
      return;
    }

    setUserId(id);
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://commission-manager.cath82319.workers.dev';

    fetch(`${API_BASE}/api/users/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          if (data.data.role === 'artist') navigate('/artist/queue');
          else if (data.data.role === 'client') navigate('/client/home');
          setDisplayName(data.data.display_name || '');
        }
      })
      .catch(() => {}) // 移除 console.error
      .finally(() => setLoading(false));
  }, [navigate]);
  
  // 送出表單
  const handleSubmit = async () => {
    if (!displayName.trim() || !role) {
      alert('請填寫暱稱並選擇一個身分！');
      return;
    }

    setSubmitting(true);
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://commission-manager.cath82319.workers.dev';

    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}/complete-onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName, role })
      });
      const result = await res.json();

      if (result.success) {
        if (role === 'artist') {
          navigate('/artist/queue');
        } else if (role === 'client') {
          navigate('/client/home');
        }
      } else {
        alert('設定失敗：' + result.error);
      }
    } catch (error) {
      alert('網路連線錯誤');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>載入中...</div>;

  const containerStyle = {
    backgroundColor: '#FBFBF9', minHeight: '100vh', display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#5D4A3E'
  };

  const cardStyle = (isSelected: boolean) => ({
    flex: 1, padding: '24px', borderRadius: '16px', border: `2px solid ${isSelected ? '#5D4A3E' : '#EAE6E1'}`,
    backgroundColor: isSelected ? '#F4F0EB' : '#FFFFFF', cursor: 'pointer', transition: 'all 0.2s ease',
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '12px'
  });

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: '500px', width: '100%', padding: '40px', backgroundColor: '#FFFFFF', borderRadius: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
        <h2 style={{ margin: '0 0 8px 0', textAlign: 'center' }}>歡迎來到 Commission！</h2>
        <p style={{ margin: '0 0 32px 0', textAlign: 'center', color: '#A0978D', fontSize: '14px' }}>
          花一分鐘設定您的個人檔案，開始您的旅程。
        </p>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>您在平台上的暱稱</label>
          <input 
            type="text" 
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="請輸入暱稱..."
            style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #DED9D3', fontSize: '15px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold', fontSize: '14px' }}>您主要想使用什麼功能？</label>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={cardStyle(role === 'artist')} onClick={() => setRole('artist')}>
              <span style={{ fontSize: '32px' }}>🎨</span>
              <div style={{ fontWeight: 'bold' }}>我是繪師</div>
              <div style={{ fontSize: '12px', color: '#A0978D', textAlign: 'center' }}>我想管理委託、上傳作品並設定報價</div>
            </div>
            
            <div style={cardStyle(role === 'client')} onClick={() => setRole('client')}>
              <span style={{ fontSize: '32px' }}>🌟</span>
              <div style={{ fontWeight: 'bold' }}>我是委託方</div>
              <div style={{ fontSize: '12px', color: '#A0978D', textAlign: 'center' }}>我想尋找繪師、發起委託並追蹤進度</div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={submitting || !displayName || !role}
          style={{
            width: '100%', padding: '14px', backgroundColor: submitting || !displayName || !role ? '#DED9D3' : '#5D4A3E',
            color: '#FFFFFF', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold',
            cursor: submitting || !displayName || !role ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s'
          }}
        >
          {submitting ? '設定中...' : '完成設定，進入平台'}
        </button>
      </div>
    </div>
  );
}