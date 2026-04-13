import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css'; 

interface ProfileSettings {
  portfolio: string[];
  detailed_intro: string; 
  process: string;
  payment: string;
  rules: string;
  custom_sections: { id: string; title: string; content: string }[];
  social_links: { platform: string; url: string }[]; 
  hidden_sections: string[]; 
  // 🌟 新增開場名片相關欄位
  splash_enabled: boolean;
  splash_image: string;
  splash_duration: number;
  splash_text: string;
}

const customQuillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }], 
    ['bold', 'italic', 'underline', 'strike'], 
    [{ 'color': [] }, { 'background': [] }], 
    [{ 'list': 'ordered'}, { 'list': 'bullet' }], 
    ['clean'] 
  ]
};

export function Settings() {
  const [activeTab, setActiveTab] = useState<'profile_basic' | 'splash' | 'portfolio' | 'detailed_intro' | 'process' | 'payment' | 'rules' | 'custom'>('profile_basic');
  const [formData, setFormData] = useState({ display_name: '', avatar_url: '', bio: '' });
  
  const [settings, setSettings] = useState<ProfileSettings>({
    portfolio: [], detailed_intro: '', process: '', payment: '', rules: '', custom_sections: [], social_links: [], hidden_sections: [],
    // 🌟 預設開啟，展示 2 秒
    splash_enabled: true, splash_image: '', splash_duration: 2, splash_text: ''
  });

  const [newImageUrl, setNewImageUrl] = useState('');
  const [socialPlatform, setSocialPlatform] = useState('Facebook');
  const [socialUrl, setSocialUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const currentUserId = localStorage.getItem('user_id') || '';

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const res = await fetch(`${API_BASE}/api/users/${currentUserId}`);
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
                detailed_intro: parsed.detailed_intro || '',
                process: parsed.process || '',
                payment: parsed.payment || '',
                rules: parsed.rules || '',
                custom_sections: parsed.custom_sections || [],
                social_links: parsed.social_links || [],
                hidden_sections: parsed.hidden_sections || [],
                // 🌟 解析新的設定值，如果沒有則使用預設值
                splash_enabled: parsed.splash_enabled !== false, 
                splash_image: parsed.splash_image || '',
                splash_duration: parsed.splash_duration || 2,
                splash_text: parsed.splash_text || ''
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
    setIsSaving(true); setMessage('');
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const res = await fetch(`${API_BASE}/api/users/${currentUserId}`, {
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
      if (data.success) setMessage('個人頁面已成功更新');
      else setMessage('儲存失敗：' + data.error);
    } catch (error) {
      setMessage('系統發生錯誤');
    } finally {
      setIsSaving(false); setTimeout(() => setMessage(''), 3000);
    }
  };

  const validateSocialUrl = (platform: string, url: string) => {
    let formattedUrl = url.trim();
    const lowerUrl = formattedUrl.toLowerCase();
    if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:') || lowerUrl.startsWith('vbscript:')) {
      return { valid: false, msg: '包含不安全的連結格式，請重新輸入' };
    }
    if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }
    try {
      const urlObj = new URL(formattedUrl);
      const hostname = urlObj.hostname.toLowerCase();
      switch (platform) {
        case 'Facebook':
          if (!hostname.includes('facebook.com') && !hostname.includes('fb.me') && !hostname.includes('fb.com')) 
            return { valid: false, msg: '網址與 Facebook 平台不符' };
          break;
        case 'Plurk':
          if (!hostname.includes('plurk.com')) return { valid: false, msg: '網址與 Plurk 平台不符' };
          break;
        case 'Twitter / X':
          if (!hostname.includes('twitter.com') && !hostname.includes('x.com') && !hostname.includes('t.co')) 
            return { valid: false, msg: '網址與 Twitter / X 平台不符' };
          break;
        case 'Threads':
          if (!hostname.includes('threads.net') && !hostname.includes('thread.net') && !hostname.includes('threads.com')) 
            return { valid: false, msg: '網址與 Threads 平台不符' };
          break;
        case 'Instagram':
          if (!hostname.includes('instagram.com') && !hostname.includes('ig.me')) 
            return { valid: false, msg: '網址與 Instagram 平台不符' };
          break;
        case '個人網站': break;
      }
      return { valid: true, formattedUrl };
    } catch (e) {
      return { valid: false, msg: '請輸入有效的網址格式' };
    }
  };

  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      setSettings(prev => ({ 
        ...prev, 
        portfolio: [...prev.portfolio, newImageUrl.trim()] 
      }));
      // 🌟 修正：使用 set 函數來清空字串
      setNewImageUrl(''); 
    }
  };
  const handleRemoveImage = (index: number) => {
    setSettings(prev => ({ ...prev, portfolio: prev.portfolio.filter((_, i) => i !== index) }));
  };

  const handleAddSocial = () => {
    if (!socialUrl.trim()) return;
    const validation = validateSocialUrl(socialPlatform, socialUrl);
    if (!validation.valid) { alert(validation.msg); return; }
    setSettings(prev => ({ ...prev, social_links: [...prev.social_links, { platform: socialPlatform, url: validation.formattedUrl! }] }));
    setSocialUrl('');
  };
  const handleRemoveSocial = (index: number) => {
    setSettings(prev => ({ ...prev, social_links: prev.social_links.filter((_, i) => i !== index) }));
  };

  const handleAddCustomSection = () => {
    if (settings.custom_sections.length >= 3) return;
    setSettings(prev => ({ ...prev, custom_sections: [...prev.custom_sections, { id: `custom_${Date.now()}`, title: '', content: '' }] }));
  };
  const handleUpdateCustomSection = (id: string, field: 'title' | 'content', value: string) => {
    setSettings(prev => ({ ...prev, custom_sections: prev.custom_sections.map(sec => sec.id === id ? { ...sec, [field]: value } : sec) }));
  };
  const handleRemoveCustomSection = (id: string) => {
    setSettings(prev => ({ ...prev, custom_sections: prev.custom_sections.filter(sec => sec.id !== id) }));
  };

  const toggleVisibility = (sectionId: string) => {
    setSettings(prev => {
      const isHidden = prev.hidden_sections.includes(sectionId);
      return { ...prev, hidden_sections: isHidden ? prev.hidden_sections.filter(id => id !== sectionId) : [...prev.hidden_sections, sectionId] };
    });
  };

  const menuItems = [
    { id: 'profile_basic', label: '頭像與簡介' },
    { id: 'splash', label: '開場名片設定' },
    { id: 'portfolio', label: '作品展示區' },
    { id: 'detailed_intro', label: '詳細介紹' },
    { id: 'process', label: '委託流程說明' },
    { id: 'payment', label: '付款方式' },
    { id: 'rules', label: '協議書內容' },
    { id: 'custom', label: '其他 (自訂標題)' }
  ];

  const getInputStyle = (fieldName: string) => ({
    width: '100%', padding: '12px 16px', border: focusedField === fieldName ? '1px solid #A67B3E' : '1px solid #DED9D3', 
    boxSizing: 'border-box' as const, borderRadius: '8px', backgroundColor: '#FBFBF9', color: '#5D4A3E',
    outline: 'none', transition: 'all 0.2s ease', boxShadow: focusedField === fieldName ? '0 0 0 2px rgba(166,123,62,0.1)' : 'none',
    fontSize: '15px'
  });

  return (
    <div style={{ display: 'flex', gap: '30px', padding: '10px 20px', maxWidth: '1100px', margin: '0 auto', height: '100%' }}>
      
      {/* 左側選單 */}
      <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h2 style={{ margin: '0 0 20px 10px', color: '#5D4A3E', fontSize: '24px', letterSpacing: '0.5px' }}>個人頁編輯</h2>
        {menuItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as any); setMessage(''); }}
              style={{
                padding: '12px 16px', border: 'none', borderRadius: '12px',
                backgroundColor: isActive ? '#F4F0EB' : 'transparent',
                color: isActive ? '#5D4A3E' : '#7A7269',
                fontWeight: isActive ? 'bold' : 'normal',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', fontSize: '15px'
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#FBFBF9'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {/* 右側編輯區 */}
      <div style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAE6E1', padding: '30px 40px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
        
        {/* 頂部標題與顯示切換 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F0ECE7', paddingBottom: '15px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', color: '#5D4A3E' }}>
              {menuItems.find(m => m.id === activeTab)?.label}
            </h3>
            <button 
              onClick={() => toggleVisibility(activeTab)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', 
                fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px',
                color: settings.hidden_sections.includes(activeTab) ? '#A05C5C' : '#7A7269',
                padding: '6px 12px', borderRadius: '20px', 
                backgroundColor: settings.hidden_sections.includes(activeTab) ? '#F5EBEB' : '#FBFBF9',
                transition: 'all 0.2s ease'
              }}
            >
              {settings.hidden_sections.includes(activeTab) ? '🚫 目前已隱藏' : '👁️ 狀態：公開顯示'}
            </button>
          </div>
          
          {message && (
            <span style={{ padding: '8px 16px', backgroundColor: message.includes('失敗') ? '#F5EBEB' : '#E8F3EB', color: message.includes('失敗') ? '#A05C5C' : '#4E7A5A', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              {message}
            </span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
          
          {/* 1. 頭像與簡介 */}
          {activeTab === 'profile_basic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div style={{ display: 'flex', gap: '30px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#FBFBF9', border: '1px solid #EAE6E1', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    {formData.avatar_url ? <img src={formData.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#C4BDB5', fontSize: '13px', display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>無頭像</span>}
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#5D4A3E' }}>顯示名稱</label>
                    <input type="text" value={formData.display_name} onChange={e => setFormData({...formData, display_name: e.target.value})} onFocus={() => setFocusedField('display_name')} onBlur={() => setFocusedField(null)} placeholder="對外展示的暱稱" style={getInputStyle('display_name')} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#5D4A3E' }}>頭像網址 (URL)</label>
                    <input type="text" value={formData.avatar_url} onChange={e => setFormData({...formData, avatar_url: e.target.value})} onFocus={() => setFocusedField('avatar_url')} onBlur={() => setFocusedField(null)} placeholder="https://..." style={getInputStyle('avatar_url')} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#5D4A3E' }}>簡短個人介紹 <span style={{fontSize: '12px', color: '#A0978D', fontWeight: 'normal'}}>(顯示於預覽頁左側)</span></label>
                <textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} onFocus={() => setFocusedField('bio')} onBlur={() => setFocusedField(null)} placeholder="介紹您的繪畫風格或經歷..." style={{...getInputStyle('bio'), minHeight: '120px', resize: 'vertical'}} />
              </div>

              {/* 社群連結設定區塊 */}
              <div style={{ borderTop: '1px solid #F0ECE7', paddingTop: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <label style={{ fontSize: '16px', fontWeight: 'bold', color: '#5D4A3E' }}>社群平台連結</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <select value={socialPlatform} onChange={e => setSocialPlatform(e.target.value)} onFocus={() => setFocusedField('platform')} onBlur={() => setFocusedField(null)} style={{...getInputStyle('platform'), width: '180px'}}>
                    <option value="Facebook">Facebook</option>
                    <option value="Plurk">Plurk</option>
                    <option value="Twitter / X">Twitter / X</option>
                    <option value="Threads">Threads</option>
                    <option value="Instagram">Instagram</option>
                    <option value="個人網站">個人網站</option>
                  </select>
                  <input type="text" value={socialUrl} onChange={e => setSocialUrl(e.target.value)} onFocus={() => setFocusedField('social_url')} onBlur={() => setFocusedField(null)} onKeyDown={e => { if (e.key === 'Enter') handleAddSocial(); }} placeholder="輸入網址..." style={{...getInputStyle('social_url'), flex: 1}} />
                  <button onClick={handleAddSocial} style={{ padding: '0 24px', backgroundColor: '#5D4A3E', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>新增</button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {settings.social_links.length === 0 && <span style={{ color: '#C4BDB5', fontSize: '14px', padding: '10px 0' }}>尚未新增任何社群連結。</span>}
                  {settings.social_links.map((link, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', backgroundColor: '#FBFBF9', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: '#4A7294', width: '100px' }}>{link.platform}</span>
                        <a href={link.url} target="_blank" rel="noreferrer" style={{ color: '#7A7269', fontSize: '14px', wordBreak: 'break-all', textDecoration: 'none' }}>{link.url}</a>
                      </div>
                      <button onClick={() => handleRemoveSocial(idx)} style={{ background: 'none', border: 'none', color: '#A05C5C', cursor: 'pointer', fontWeight: 'bold', padding: '0 10px', fontSize: '13px' }}>刪除</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 🌟 1.5 新增開場名片設定區塊 */}
          {activeTab === 'splash' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: '#FBFBF9', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
                <input 
                  type="checkbox" 
                  id="splash_enabled"
                  checked={settings.splash_enabled} 
                  onChange={(e) => setSettings({...settings, splash_enabled: e.target.checked})}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="splash_enabled" style={{ fontSize: '16px', fontWeight: 'bold', color: '#5D4A3E', cursor: 'pointer' }}>
                  啟用滿版開場動畫
                </label>
              </div>

              {settings.splash_enabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#5D4A3E' }}>
                      背景圖片網址 (URL) <span style={{fontSize: '12px', color: '#A0978D', fontWeight: 'normal'}}>(建議使用 1920x1080 橫式高品質作品，若留空將使用頭像)</span>
                    </label>
                    <input 
                      type="text" 
                      value={settings.splash_image} 
                      onChange={e => setSettings({...settings, splash_image: e.target.value})} 
                      onFocus={() => setFocusedField('splash_image')} 
                      onBlur={() => setFocusedField(null)} 
                      placeholder="https://..." 
                      style={getInputStyle('splash_image')} 
                    />
                    {settings.splash_image && (
                      <div style={{ marginTop: '10px', width: '100%', height: '160px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #EAE6E1' }}>
                        <img src={settings.splash_image} alt="背景預覽" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#5D4A3E' }}>
                      開場展示時間：<span style={{ color: '#A67B3E' }}>{settings.splash_duration} 秒</span>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      step="0.5"
                      value={settings.splash_duration}
                      onChange={(e) => setSettings({...settings, splash_duration: parseFloat(e.target.value)})}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#A0978D' }}>
                      <span>1 秒 (快速)</span>
                      <span>3 秒 (適中)</span>
                      <span>5 秒 (緩慢)</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#5D4A3E' }}>
                      中央文字框內容 <span style={{fontSize: '12px', color: '#A0978D', fontWeight: 'normal'}}>(留空則預設顯示您的顯示名稱)</span>
                    </label>
                    <input 
                      type="text" 
                      value={settings.splash_text} 
                      onChange={e => setSettings({...settings, splash_text: e.target.value})} 
                      onFocus={() => setFocusedField('splash_text')} 
                      onBlur={() => setFocusedField(null)} 
                      placeholder="例如：Welcome to my Studio" 
                      style={getInputStyle('splash_text')} 
                    />
                  </div>

                </div>
              )}
            </div>
          )}

          {/* 2. 作品展示區 */}
          {activeTab === 'portfolio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input type="text" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} onFocus={() => setFocusedField('portfolio_url')} onBlur={() => setFocusedField(null)} onKeyDown={e => { if (e.key === 'Enter') handleAddImage(); }} placeholder="輸入圖片網址 (URL)..." style={{...getInputStyle('portfolio_url'), flex: 1}} />
                <button onClick={handleAddImage} style={{ padding: '0 24px', backgroundColor: '#5D4A3E', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>新增圖片</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px', marginTop: '10px' }}>
                {settings.portfolio.length === 0 && <div style={{ color: '#C4BDB5', fontSize: '14px', gridColumn: '1 / -1', padding: '20px 0' }}>目前尚無作品，請在上方新增圖片網址。</div>}
                {settings.portfolio.map((img, index) => (
                  <div key={index} style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', border: '1px solid #EAE6E1', overflow: 'hidden', backgroundColor: '#FBFBF9', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <img src={img} alt={`作品 ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => handleRemoveImage(index)} style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', backgroundColor: 'rgba(255,255,255,0.95)', color: '#A05C5C', border: 'none', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. 富文本編輯區 */}
          {(activeTab === 'detailed_intro' || activeTab === 'process' || activeTab === 'payment' || activeTab === 'rules') && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: '40px' }}>
              
              {/* 🌟 新增：針對「協議書內容」專屬的說明提示框 */}
              {activeTab === 'rules' && (
                <div style={{ 
                  marginBottom: '12px', 
                  color: '#8A602B', 
                  fontSize: '14px', 
                  fontWeight: 'bold', 
                  backgroundColor: '#FDF4E6', 
                  padding: '12px 16px', 
                  borderRadius: '8px', 
                  border: '1px solid #E8D3B9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  💡 說明：此部分內容將會出現在每次委託書下方必須閱覽的區域
                </div>
              )}

              {/* ReactQuill 的外框包裝，用於套用圓角與邊框 */}
              <div style={{ border: '1px solid #DED9D3', borderRadius: '12px', overflow: 'hidden' }}>
                <ReactQuill 
                  theme="snow" 
                  value={settings[activeTab as keyof ProfileSettings] as string || ''} 
                  onChange={value => setSettings({...settings, [activeTab]: value})}
                  modules={customQuillModules}
                  placeholder={`開始編寫${menuItems.find(m => m.id === activeTab)?.label}細節...`}
                  style={{ height: '380px', backgroundColor: '#FFFFFF', border: 'none' }}
                />
              </div>
            </div>
          )}

          {/* 4. 其他 (自訂標題) */}
          {activeTab === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {settings.custom_sections.map((section, index) => (
                <div key={section.id} style={{ padding: '24px', border: '1px solid #EAE6E1', borderRadius: '16px', backgroundColor: '#FBFBF9', position: 'relative' }}>
                  <button onClick={() => handleRemoveCustomSection(section.id)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#A05C5C', cursor: 'pointer', fontSize: '20px', fontWeight: 'bold' }}>×</button>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <input type="text" value={section.title} onChange={e => handleUpdateCustomSection(section.id, 'title', e.target.value)} onFocus={() => setFocusedField(`custom_title_${section.id}`)} onBlur={() => setFocusedField(null)} placeholder={`自訂標題 ${index + 1}`} style={{...getInputStyle(`custom_title_${section.id}`), width: '60%', backgroundColor: '#FFFFFF', fontWeight: 'bold'}} />
                    <div style={{ paddingBottom: '40px' }}>
                      <div style={{ border: '1px solid #DED9D3', borderRadius: '12px', overflow: 'hidden' }}>
                        <ReactQuill 
                          theme="snow" value={section.content || ''} 
                          onChange={value => handleUpdateCustomSection(section.id, 'content', value)}
                          modules={customQuillModules} placeholder="內容說明..." style={{ height: '200px', backgroundColor: '#FFFFFF', border: 'none' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {settings.custom_sections.length < 3 ? (
                <button onClick={handleAddCustomSection} style={{ padding: '16px', backgroundColor: '#FFFFFF', color: '#5D4A3E', border: '2px dashed #DED9D3', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#A67B3E'; e.currentTarget.style.backgroundColor = '#FBFBF9'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#DED9D3'; e.currentTarget.style.backgroundColor = '#FFFFFF'; }}>
                  + 新增自訂區塊 ({settings.custom_sections.length}/3)
                </button>
              ) : (
                <div style={{ textAlign: 'center', color: '#A0978D', fontSize: '14px', padding: '10px' }}>已達到自訂區塊數量上限 (3/3)</div>
              )}
            </div>
          )}

        </div>

        {/* 右下角儲存按鈕 */}
        <div style={{ marginTop: '20px', borderTop: '1px solid #F0ECE7', paddingTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleSave} disabled={isSaving} style={{ padding: '14px 40px', backgroundColor: isSaving ? '#C4BDB5' : '#5D4A3E', color: '#FFFFFF', border: 'none', borderRadius: '12px', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(93,74,62,0.2)' }} onMouseEnter={e => !isSaving && (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={e => !isSaving && (e.currentTarget.style.transform = 'translateY(0)')}>
            {isSaving ? '儲存中...' : '儲存全部內容'}
          </button>
        </div>

      </div>
    </div>
  );
}