import { useState, useEffect } from 'react';

// 定義結構
interface ProfileSettings {
  portfolio: string[];
  process: string;
  payment: string;
  rules: string;
  custom_sections: { id: string; title: string; content: string }[];
}

export function Settings() {
  const [activeTab, setActiveTab] = useState<'intro' | 'portfolio' | 'process' | 'payment' | 'rules' | 'custom'>('intro');
  const [formData, setFormData] = useState({
    display_name: '',
    avatar_url: '',
    bio: '',
  });
  
  const [settings, setSettings] = useState<ProfileSettings>({
    portfolio: [],
    process: '',
    payment: '',
    rules: '',
    custom_sections: []
  });

  const [newImageUrl, setNewImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const currentUserId = 'u-artist-01';

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch(`/api/users/${currentUserId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setFormData({
            display_name: data.data.display_name || '',
            avatar_url: data.data.avatar_url || '',
            bio: data.data.bio || '',
          });
          if (data.data.profile_settings) {
            try {
              const parsed = JSON.parse(data.data.profile_settings);
              setSettings({
                portfolio: parsed.portfolio || [],
                process: parsed.process || '',
                payment: parsed.payment || '',
                rules: parsed.rules || '',
                custom_sections: parsed.custom_sections || []
              });
            } catch (e) {
              console.error("解析 profile_settings 失敗");
            }
          }
        }
      } catch (error) {
        console.error("讀取設定失敗", error);
      }
    };
    fetchUserData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      const res = await fetch(`/api/users/${currentUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: formData.display_name,
          avatar_url: formData.avatar_url,
          bio: formData.bio,
          profile_settings: JSON.stringify(settings)
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage('個人頁面已成功更新');
      } else {
        setMessage('儲存失敗：' + data.error);
      }
    } catch (error) {
      setMessage('系統發生錯誤');
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // 作品集功能
  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      setSettings(prev => ({ ...prev, portfolio: [...prev.portfolio, newImageUrl.trim()] }));
      setNewImageUrl('');
    }
  };
  const handleRemoveImage = (index: number) => {
    setSettings(prev => ({ ...prev, portfolio: prev.portfolio.filter((_, i) => i !== index) }));
  };

  // 自訂區塊功能
  const handleAddCustomSection = () => {
    if (settings.custom_sections.length >= 3) return;
    setSettings(prev => ({
      ...prev,
      custom_sections: [...prev.custom_sections, { id: Date.now().toString(), title: '', content: '' }]
    }));
  };
  const handleUpdateCustomSection = (id: string, field: 'title' | 'content', value: string) => {
    setSettings(prev => ({
      ...prev,
      custom_sections: prev.custom_sections.map(sec => sec.id === id ? { ...sec, [field]: value } : sec)
    }));
  };
  const handleRemoveCustomSection = (id: string) => {
    setSettings(prev => ({
      ...prev,
      custom_sections: prev.custom_sections.filter(sec => sec.id !== id)
    }));
  };

  const menuItems = [
    { id: 'intro', label: '詳細介紹' },
    { id: 'portfolio', label: '作品展示區' },
    { id: 'process', label: '委託流程說明' },
    { id: 'payment', label: '付款方式' },
    { id: 'rules', label: '委託範圍(使用規範)' },
    { id: 'custom', label: '其他 (自訂標題)' }
  ];

  return (
    <div style={{ display: 'flex', gap: '30px', padding: '20px', maxWidth: '1100px', margin: '0 auto', minHeight: 'calc(100vh - 120px)' }}>
      
      {/* 左側：導覽列 */}
      <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h2 style={{ margin: '0 0 20px 10px', color: '#333', fontSize: '22px' }}>個人頁編輯</h2>
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => { setActiveTab(item.id as any); setMessage(''); }}
            style={{
              padding: '12px 16px', 
              border: 'none', 
              borderRadius: '8px',
              backgroundColor: activeTab === item.id ? '#333' : 'transparent',
              color: activeTab === item.id ? '#fff' : '#555',
              fontWeight: activeTab === item.id ? 'bold' : 'normal',
              cursor: 'pointer', 
              textAlign: 'left', 
              transition: 'all 0.2s',
              fontSize: '15px'
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 右側：編輯區 */}
      <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', padding: '30px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '25px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', color: '#333' }}>
            {menuItems.find(m => m.id === activeTab)?.label}
          </h3>
          {message && (
            <span style={{ padding: '6px 12px', backgroundColor: message.includes('失敗') ? '#ffebee' : '#e8f5e9', color: message.includes('失敗') ? '#c62828' : '#2e7d32', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold' }}>
              {message}
            </span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
          
          {/* 1. 詳細介紹 */}
          {activeTab === 'intro' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#f5f5f5', border: '1px solid #ddd', overflow: 'hidden' }}>
                    {formData.avatar_url ? <img src={formData.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#aaa', fontSize: '12px', display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>無頭像</span>}
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#555' }}>顯示名稱</label>
                    <input type="text" value={formData.display_name} onChange={e => setFormData({...formData, display_name: e.target.value})} placeholder="對外展示的暱稱" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #bbb', fontSize: '15px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#555' }}>頭像網址 (URL)</label>
                    <input type="text" value={formData.avatar_url} onChange={e => setFormData({...formData, avatar_url: e.target.value})} placeholder="https://..." style={{ padding: '10px', borderRadius: '6px', border: '1px solid #bbb', fontSize: '15px' }} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#555' }}>詳細介紹與個人簡介</label>
                <textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} placeholder="介紹您的繪畫風格、經歷或任何想對委託人說的話..." style={{ padding: '10px', borderRadius: '6px', border: '1px solid #bbb', fontSize: '15px', minHeight: '150px', resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* 2. 作品展示區 */}
          {activeTab === 'portfolio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddImage(); }} placeholder="輸入圖片網址 (URL)..." style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #bbb', fontSize: '15px' }} />
                <button onClick={handleAddImage} style={{ padding: '0 20px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>新增圖片</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px', marginTop: '10px' }}>
                {settings.portfolio.length === 0 && <div style={{ color: '#999', fontSize: '14px', gridColumn: '1 / -1' }}>目前尚無作品，請新增圖片網址。</div>}
                {settings.portfolio.map((img, index) => (
                  <div key={index} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', border: '1px solid #eee', overflow: 'hidden', backgroundColor: '#f9f9f9' }}>
                    <img src={img} alt={`作品 ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => handleRemoveImage(index)} style={{ position: 'absolute', top: '5px', right: '5px', width: '24px', height: '24px', backgroundColor: 'rgba(255,255,255,0.9)', color: '#d32f2f', border: 'none', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3, 4, 5. 單一文字框設定 (流程、付款、規範) */}
          {(activeTab === 'process' || activeTab === 'payment' || activeTab === 'rules') && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <textarea 
                value={settings[activeTab]} 
                onChange={e => setSettings({...settings, [activeTab]: e.target.value})}
                placeholder={`請輸入${menuItems.find(m => m.id === activeTab)?.label}細節...`}
                style={{ flex: 1, padding: '15px', borderRadius: '6px', border: '1px solid #bbb', fontSize: '15px', minHeight: '300px', resize: 'vertical', lineHeight: '1.6' }} 
              />
            </div>
          )}

          {/* 6. 其他 (自訂標題) */}
          {activeTab === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {settings.custom_sections.map((section, index) => (
                <div key={section.id} style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fafafa', position: 'relative' }}>
                  <button onClick={() => handleRemoveCustomSection(section.id)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '18px' }}>×</button>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="text" value={section.title} onChange={e => handleUpdateCustomSection(section.id, 'title', e.target.value)} placeholder={`自訂標題 ${index + 1}`} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '15px', fontWeight: 'bold', width: '60%' }} />
                    <textarea value={section.content} onChange={e => handleUpdateCustomSection(section.id, 'content', e.target.value)} placeholder="內容說明..." style={{ padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '15px', minHeight: '100px', resize: 'vertical' }} />
                  </div>
                </div>
              ))}
              
              {settings.custom_sections.length < 3 ? (
                <button onClick={handleAddCustomSection} style={{ padding: '15px', backgroundColor: '#fff', color: '#1976d2', border: '2px dashed #1976d2', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                  + 新增自訂區塊 ({settings.custom_sections.length}/3)
                </button>
              ) : (
                <div style={{ textAlign: 'center', color: '#999', fontSize: '14px' }}>已達到自訂區塊數量上限 (3/3)</div>
              )}
            </div>
          )}

        </div>

        <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleSave} disabled={isSaving} style={{ padding: '12px 30px', backgroundColor: isSaving ? '#ccc' : '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
            {isSaving ? '儲存中...' : '儲存全部內容'}
          </button>
        </div>

      </div>
    </div>
  );
}