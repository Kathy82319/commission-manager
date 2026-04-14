import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function ClientProfileEdit() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const res = await fetch(`${API_BASE}/api/users/${userId}`);
        const data = await res.json();
        
        if (data.success && data.data) {
          setDisplayName(data.data.display_name || '');
          setBio(data.data.bio || '');
          setAvatarUrl(data.data.avatar_url || '');
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const userId = localStorage.getItem('user_id');
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          bio: bio,
          avatar_url: avatarUrl
        })
      });
      
      const data = await res.json();
      if (data.success) {
        alert('個人資料已儲存！');
        navigate('/client/home');
      } else {
        alert('儲存失敗：' + data.error);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('連線錯誤，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#7A7269' }}>載入中...</div>;
  }

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px' }}>
      <h2 style={{ color: '#5D4A3E', marginBottom: '24px', borderBottom: '2px solid #EAE6E1', paddingBottom: '12px' }}>
        編輯個人資料
      </h2>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* 頭像預覽與輸入 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#EAE6E1',
            overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: '#A0978D', fontSize: '12px' }}>無頭像</span>
            )}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#5D4A3E' }}>頭像網址 (選填)</label>
            <input 
              type="text" 
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              style={{ padding: '10px 12px', border: '1px solid #DED9D3', borderRadius: '8px', fontSize: '14px' }}
            />
          </div>
        </div>

        {/* 暱稱 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#5D4A3E' }}>
            顯示暱稱 <span style={{ color: '#A05C5C' }}>*</span>
          </label>
          <input 
            type="text" 
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="請輸入您的暱稱"
            style={{ padding: '10px 12px', border: '1px solid #DED9D3', borderRadius: '8px', fontSize: '14px' }}
          />
        </div>

        {/* 簡介 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#5D4A3E' }}>個人簡介 (選填)</label>
          <textarea 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="寫些關於您的介紹吧..."
            rows={4}
            style={{ padding: '10px 12px', border: '1px solid #DED9D3', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }}
          />
        </div>

        {/* 按鈕區 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
          <button 
            type="button"
            onClick={() => navigate(-1)}
            style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#7A7269', border: '1px solid #DED9D3', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            取消
          </button>
          <button 
            type="submit"
            disabled={saving}
            style={{ padding: '10px 24px', backgroundColor: '#5D4A3E', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
          >
            {saving ? '儲存中...' : '儲存變更'}
          </button>
        </div>

      </form>
    </div>
  );
}
