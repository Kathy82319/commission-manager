import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SOCIAL_PLATFORMS = [
  { id: 'FB', label: 'Facebook', pattern: /^https:\/\/(www\.)?facebook\.com\/.+/ },
  { id: 'Threads', label: 'Threads', pattern: /^https:\/\/(www\.)?threads\.net\/.+/ },
  { id: 'IG', label: 'Instagram', pattern: /^https:\/\/(www\.)?instagram\.com\/.+/ },
  { id: 'Twitter', label: 'Twitter / X', pattern: /^https:\/\/(www\.)?(twitter\.com|x\.com)\/.+/ },
  { id: 'Plurk', label: 'Plurk', pattern: /^https:\/\/(www\.)?plurk\.com\/.+/ },
];

export function ClientProfileEdit() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({ display_name: '', avatar_url: '', bio: '' });
  
  const [socials, setSocials] = useState<{ platform: string, url: string }[]>([
    { platform: 'FB', url: '' }
  ]);

  useEffect(() => {
    const fetchProfile = async () => {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      // 🔒 安全修正：移除硬編碼的 TEST_CLIENT_ID，改用 /me
      const res = await fetch(`${API_BASE}/api/users/me`, {
        credentials: 'include'
      });
      
      if (res.status === 401 || res.status === 403) {
        alert("請先登入");
        navigate('/login');
        return;
      }

      const data = await res.json();
      if (data.success && data.data) {
        setFormData({
          display_name: data.data.display_name || '',
          avatar_url: data.data.avatar_url || '',
          bio: data.data.bio || '',
        });
        
        if (data.data.profile_settings) {
          try {
            const settings = JSON.parse(data.data.profile_settings);
            if (settings.socials && settings.socials.length > 0) {
              setSocials(settings.socials);
            }
          } catch (e) {
            console.error("解析 profile_settings 失敗", e);
          }
        }
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleSave = async () => {
    for (const social of socials) {
      if (social.url.trim() === '') continue;
      const platformConfig = SOCIAL_PLATFORMS.find(p => p.id === social.platform);
      if (platformConfig && !platformConfig.pattern.test(social.url)) {
        alert(`${platformConfig.label} 的網址格式不正確，請檢查是否包含 https:// 及正確的網域。`);
        return;
      }
    }

    setIsProcessing(true);

    const profile_settings = JSON.stringify({
      socials: socials.filter(s => s.url.trim() !== '')
    });

    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
    // 🔒 安全修正：改用 /me 進行更新
    const res = await fetch(`${API_BASE}/api/users/me`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, profile_settings })
    });
    
    const data = await res.json();
    setIsProcessing(false);

    if (data.success) {
      navigate('/client/home');
    } else {
      alert('儲存失敗：' + data.error);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d0d8e4',
    backgroundColor: '#FFF', color: '#475569', fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const
  };
  const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#475569' };

  return (
    <div style={{ backgroundColor: '#778ca4', minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '40px 16px', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '500px', backgroundColor: '#e8ecf3', padding: '30px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 24px 0', color: '#475569', textAlign: 'center' }}>編輯個人資料</h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>顯示名稱</label>
          <input style={inputStyle} type="text" value={formData.display_name} onChange={e => setFormData({ ...formData, display_name: e.target.value })} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>大頭貼網址 (URL)</label>
          <input style={inputStyle} type="text" value={formData.avatar_url} onChange={e => setFormData({ ...formData, avatar_url: e.target.value })} />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>自我介紹</label>
          <textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #d0d8e4', margin: '20px 0' }} />
        <h3 style={{ fontSize: '16px', color: '#475569', marginBottom: '16px' }}>常用社群連結</h3>

        {socials.map((social, index) => (
          <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <select 
              style={{ ...inputStyle, width: '130px', padding: '12px 8px' }}
              value={social.platform}
              onChange={(e) => {
                const newSocials = [...socials];
                newSocials[index].platform = e.target.value;
                setSocials(newSocials);
              }}
            >
              {SOCIAL_PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <input 
              style={{ ...inputStyle, flex: 1 }} type="text" placeholder="https://..."
              value={social.url}
              onChange={(e) => {
                const newSocials = [...socials];
                newSocials[index].url = e.target.value;
                setSocials(newSocials);
              }}
            />
            <button 
              onClick={() => setSocials(socials.filter((_, i) => i !== index))}
              style={{ padding: '0 12px', backgroundColor: '#e11d48', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              刪除
            </button>
          </div>
        ))}
        
        <button 
          onClick={() => setSocials([...socials, { platform: 'FB', url: '' }])}
          style={{ width: '100%', padding: '12px', backgroundColor: '#FFF', color: '#4A7294', border: '1px dashed #4A7294', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ＋ 新增社群
        </button>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button onClick={() => navigate('/client/home')} style={{ flex: 1, padding: '14px', backgroundColor: '#FFF', color: '#556577', border: '1px solid #d0d8e4', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>取消返回</button>
          <button onClick={handleSave} disabled={isProcessing} style={{ flex: 1, padding: '14px', backgroundColor: '#4A7294', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: isProcessing ? 'not-allowed' : 'pointer' }}>{isProcessing ? '儲存中...' : '確認儲存'}</button>
        </div>
      </div>
    </div>
  );
}