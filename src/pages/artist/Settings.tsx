import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css'; 
import { ImageUploader } from '../../components/ImageUploader';

interface ProfileSettings {
  portfolio: string[];
  detailed_intro: string; 
  process: string;
  payment: string;
  rules: string;
  custom_sections: { id: string; title: string; content: string }[];
  social_links: { platform: string; url: string }[]; 
  hidden_sections: string[]; 
  splash_enabled: boolean;
  splash_image: string;
  splash_duration: number;
  splash_text: string;
}

const customQuillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }], 
    [{ 'size': ['small', false, 'large', 'huge'] }], 
    ['bold', 'italic', 'underline', 'strike', 'blockquote'], 
    [{ 'color': [] }, { 'background': [] }], 
    [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'align': [] }], 
    ['link', 'clean'] 
  ]
};

export function Settings() {
  const [activeTab, setActiveTab] = useState<'profile_basic' | 'subscription' | 'splash' | 'portfolio' | 'detailed_intro' | 'process' | 'payment' | 'rules' | 'custom'>('profile_basic');
  const [formData, setFormData] = useState({ display_name: '', avatar_url: '', bio: '' });
  
  const [isUploading, setIsUploading] = useState(false); 
  const [isPortfolioUploading, setIsPortfolioUploading] = useState(false); 
  const [isSplashUploading, setIsSplashUploading] = useState(false); // 🌟 新增：Splash 背景上傳狀態
  
  const [quotaInfo, setQuotaInfo] = useState<{ plan_type: string; used_quota: number; max_quota: number; trial_start_at?: string; trial_end_at?: string; pro_expires_at?: string } | null>(null);

  const [settings, setSettings] = useState<ProfileSettings>({
    portfolio: [], detailed_intro: '', process: '', payment: '', rules: '', custom_sections: [], social_links: [], hidden_sections: [],
    splash_enabled: true, splash_image: '', splash_duration: 2, splash_text: ''
  });

  const [socialPlatform, setSocialPlatform] = useState('Facebook');
  const [socialUrl, setSocialUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || ''; 

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
        const data = await res.json();
        if (data.success && data.data) {
          setFormData({
            display_name: data.data.display_name || '',
            avatar_url: data.data.avatar_url || '',
            bio: data.data.bio || '',
          });
          
          setQuotaInfo({
            plan_type: data.data.plan_type || 'free',
            used_quota: data.data.used_quota || 0,
            max_quota: data.data.max_quota || 3,
            trial_start_at: data.data.trial_start_at,
            trial_end_at: data.data.trial_end_at,
            pro_expires_at: data.data.pro_expires_at,
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
  }, [API_BASE]);

  const handleAvatarUpload = async (resultBlobs: { preview: Blob }) => {
    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const fileName = `avatars/user_${timestamp}.jpg`;
      const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, contentType: 'image/jpeg', bucketType: 'public' })
      });
      const { uploadUrl } = await ticketRes.json();
      await fetch(uploadUrl, { method: 'PUT', body: resultBlobs.preview, headers: { 'Content-Type': 'image/jpeg' } });
      const finalUrl = `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${fileName}`;
      setFormData(prev => ({ ...prev, avatar_url: finalUrl }));
      alert("頭像上傳成功！請記得點擊下方的「儲存全部內容」以完成更新。");
    } catch (err) {
      alert("頭像上傳失敗");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePortfolioUpload = async (resultBlobs: { preview: Blob }) => {
    setIsPortfolioUploading(true);
    try {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileName = `portfolio/img_${timestamp}_${randomStr}.jpg`;
      
      const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, contentType: 'image/jpeg', bucketType: 'public' })
      });
      const { uploadUrl } = await ticketRes.json();
      
      await fetch(uploadUrl, { method: 'PUT', body: resultBlobs.preview, headers: { 'Content-Type': 'image/jpeg' } });
      const finalUrl = `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${fileName}`;
      
      setSettings(prev => ({ ...prev, portfolio: [...prev.portfolio, finalUrl] }));
      alert("作品上傳成功！請記得點擊下方的「儲存全部內容」以完成更新。");
    } catch (err) {
      alert("作品上傳失敗");
    } finally {
      setIsPortfolioUploading(false);
    }
  };

  // 🌟 新增：Splash 背景圖上傳邏輯
  const handleSplashUpload = async (resultBlobs: { preview: Blob }) => {
    setIsSplashUploading(true);
    try {
      const timestamp = Date.now();
      const fileName = `splash/bg_${timestamp}.jpg`;
      const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, contentType: 'image/jpeg', bucketType: 'public' })
      });
      const { uploadUrl } = await ticketRes.json();
      await fetch(uploadUrl, { method: 'PUT', body: resultBlobs.preview, headers: { 'Content-Type': 'image/jpeg' } });
      const finalUrl = `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${fileName}`;
      setSettings(prev => ({ ...prev, splash_image: finalUrl }));
      alert("開場背景圖上傳成功！請記得點擊下方的「儲存全部內容」。");
    } catch (err) {
      alert("背景圖上傳失敗");
    } finally {
      setIsSplashUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true); setMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
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

  const handleStartTrial = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/test/start-trial`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        window.location.reload(); 
      } else alert(data.error);
    } catch(e) { alert('連線失敗'); }
  };

  const handleMockUpgrade = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/test/mock-upgrade`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        window.location.reload(); 
      } else alert(data.error);
    } catch(e) { alert('連線失敗'); }
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
    { id: 'portfolio', label: '作品展示區' },
    { id: 'detailed_intro', label: '詳細介紹' },
    { id: 'splash', label: '開場動畫設定' },
    { id: 'process', label: '委託流程' },
    { id: 'payment', label: '付款方式' },
    { id: 'rules', label: '協議書內容' },
    { id: 'custom', label: '其他 (自訂標題)' },
    { id: 'subscription', label: '💎 方案與訂閱' }
  ];

  const isFreePlan = quotaInfo?.plan_type === 'free';
  const freeAllowedTabs = ['profile_basic', 'portfolio', 'detailed_intro', 'subscription'];
  const isCurrentTabLocked = isFreePlan && !freeAllowedTabs.includes(activeTab);

  const getInputStyle = (fieldName: string) => ({
    width: '100%', padding: '12px 16px', border: focusedField === fieldName ? '1px solid #A67B3E' : '1px solid #DED9D3', 
    boxSizing: 'border-box' as const, borderRadius: '8px', backgroundColor: '#FBFBF9', color: '#5D4A3E',
    outline: 'none', transition: 'all 0.2s ease', boxShadow: focusedField === fieldName ? '0 0 0 2px rgba(166,123,62,0.1)' : 'none',
    fontSize: '15px'
  });

  return (
    <div style={{ display: 'flex', gap: '30px', padding: '10px 20px', maxWidth: '1100px', margin: '0 auto', height: '100%' }}>
      
      <style>{`
        .custom-quill-wrapper { border: 1px solid #DED9D3; border-radius: 12px; overflow: hidden; background-color: #FFFFFF; }
        .custom-quill-wrapper .ql-toolbar.ql-snow { border: none; border-bottom: 1px solid #EAE6E1; background-color: #FBFBF9; padding: 12px; }
        .custom-quill-wrapper .ql-container.ql-snow { border: none; }
        .custom-quill-wrapper .ql-editor { min-height: 300px; max-height: 500px; overflow-y: auto; font-size: 15px; line-height: 1.6; color: #5D4A3E; }
        .custom-quill-wrapper.small .ql-editor { min-height: 150px; max-height: 300px; }
        .custom-quill-wrapper .ql-editor::-webkit-scrollbar { width: 8px; }
        .custom-quill-wrapper .ql-editor::-webkit-scrollbar-track { background: transparent; }
        .custom-quill-wrapper .ql-editor::-webkit-scrollbar-thumb { background: #DED9D3; border-radius: 4px; }
        .custom-quill-wrapper .ql-editor::-webkit-scrollbar-thumb:hover { background: #C4BDB5; }
      `}</style>

      {/* 左側選單 */}
      <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h2 style={{ margin: '0 0 20px 10px', color: '#5D4A3E', fontSize: '24px', letterSpacing: '0.5px' }}>個人頁編輯</h2>
        {menuItems.map(item => {
          const isActive = activeTab === item.id;
          const isLockedMenu = isFreePlan && !freeAllowedTabs.includes(item.id);
          
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as any); setMessage(''); }}
              style={{
                padding: '12px 16px', border: 'none', borderRadius: '12px',
                backgroundColor: isActive ? '#F4F0EB' : 'transparent',
                color: isActive ? (item.id === 'subscription' ? '#A67B3E' : '#5D4A3E') : (isLockedMenu ? '#C4BDB5' : '#7A7269'),
                fontWeight: isActive ? 'bold' : 'normal',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', fontSize: '15px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#FBFBF9'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span>{item.label}</span>
              {isLockedMenu && <span style={{ fontSize: '14px' }}>🔒</span>}
            </button>
          )
        })}
      </div>

      {/* 右側編輯區 */}
      <div style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAE6E1', padding: '30px 40px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F0ECE7', paddingBottom: '15px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', color: '#5D4A3E' }}>
              {menuItems.find(m => m.id === activeTab)?.label}
            </h3>
            
            {activeTab !== 'profile_basic' && activeTab !== 'splash' && activeTab !== 'subscription' && !isCurrentTabLocked && (
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
            )}
          </div>
          
          {message && (
            <span style={{ padding: '8px 16px', backgroundColor: message.includes('失敗') ? '#F5EBEB' : '#E8F3EB', color: message.includes('失敗') ? '#A05C5C' : '#4E7A5A', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              {message}
            </span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', position: 'relative' }}>
          
          {/* 免費版毛玻璃鎖定遮罩 */}
          {isCurrentTabLocked && (
             <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)' }}>
               <div style={{ padding: '30px 40px', backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px', border: '1px solid #EAE6E1' }}>
                 <div style={{ fontSize: '40px' }}>🔒</div>
                 <h3 style={{ margin: 0, color: '#5D4A3E', fontSize: '20px' }}>啟用專業版後解鎖</h3>
                 <p style={{ margin: 0, color: '#7A7269', fontSize: '14px', lineHeight: '1.6' }}>此區塊僅限專業版編輯。<br/><br/>(若您曾於專業版期間設定過此區塊，內容依然會在您的公開頁面持續展示，不會被刪除，僅鎖定後台編輯權限。)</p>
                 <button onClick={() => setActiveTab('subscription')} style={{ marginTop: '10px', padding: '12px 24px', backgroundColor: '#A67B3E', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s', boxShadow: '0 4px 12px rgba(166,123,62,0.3)' }} onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>前往查看升級方案</button>
               </div>
             </div>
          )}

          <div style={{ filter: isCurrentTabLocked ? 'blur(8px)' : 'none', pointerEvents: isCurrentTabLocked ? 'none' : 'auto', userSelect: isCurrentTabLocked ? 'none' : 'auto', height: '100%', opacity: isCurrentTabLocked ? 0.5 : 1 }}>
            
            {activeTab === 'subscription' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ padding: '16px', backgroundColor: '#F4F0EB', borderRadius: '12px', color: '#5D4A3E', fontSize: '14px', lineHeight: '1.6' }}>
                  <strong>💡 開發測試專區：</strong> 這裡已經串接了後端的「模擬金流 API」。您可以直接點擊下方按鈕測試切換方案，測試完畢後回到「產出委託單」即可看到毛玻璃被解鎖的真實效果！
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                  
                  <div style={{ border: quotaInfo?.plan_type === 'free' ? '2px solid #5D4A3E' : '1px solid #EAE6E1', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: quotaInfo?.plan_type === 'free' ? '#FFFFFF' : '#FBFBF9', boxShadow: quotaInfo?.plan_type === 'free' ? '0 4px 16px rgba(0,0,0,0.05)' : 'none' }}>
                    <h4 style={{ margin: 0, fontSize: '18px', color: '#5D4A3E' }}>基礎免費版</h4>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#5D4A3E' }}>NT$ 0 <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#A0978D' }}>/ 月</span></div>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#7A7269', fontSize: '14px', lineHeight: '1.8', flex: 1 }}>
                      <li>每月最高建立 <strong>3 筆</strong>委託單</li>
                      <li>單檔上傳最高 <strong>5MB</strong> 限制</li>
                      <li>開放編輯「頭像與簡介、作品展示、詳細介紹」</li>
                      <li>公開頁面最多展示 <strong>前 6 張</strong>作品</li>
                    </ul>
                    {quotaInfo?.plan_type === 'free' ? (
                      <div style={{ textAlign: 'center', padding: '12px', color: '#A0978D', fontWeight: 'bold', backgroundColor: '#F0ECE7', borderRadius: '8px' }}>目前方案</div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '12px', color: '#A0978D', fontSize: '13px' }}>到期後將自動降級至此方案</div>
                    )}
                  </div>

                  <div style={{ border: quotaInfo?.plan_type === 'trial' ? '2px solid #A67B3E' : '1px solid #EAE6E1', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: quotaInfo?.plan_type === 'trial' ? '#FFFFFF' : '#FBFBF9', boxShadow: quotaInfo?.plan_type === 'trial' ? '0 4px 16px rgba(0,0,0,0.05)' : 'none' }}>
                    <h4 style={{ margin: 0, fontSize: '18px', color: '#A67B3E' }}>專業版 (15天試用)</h4>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#5D4A3E' }}>免費體驗</div>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#7A7269', fontSize: '14px', lineHeight: '1.8', flex: 1 }}>
                      <li>試用期間可建立 <strong>20 筆</strong>委託單</li>
                      <li>單檔上傳最高 <strong>5MB</strong> 限制</li>
                      <li>解鎖編輯「所有」進階區塊編輯權限</li>
                      <li>解鎖最高 <strong>30 張</strong>作品展示上限</li>
                      <li style={{ color: '#A67B3E', listStyle: 'none', marginLeft: '-20px', marginTop: '10px' }}>💡 降級保障：方案過期後，已設定的進階區塊與超過 6 張的圖片不會刪除且持續展示，僅鎖定後台編輯權限。</li>
                    </ul>
                    {quotaInfo?.plan_type === 'trial' ? (
                       <div style={{ textAlign: 'center', padding: '12px', color: '#A67B3E', fontWeight: 'bold', backgroundColor: '#FDF4E6', borderRadius: '8px' }}>試用中</div>
                    ) : quotaInfo?.trial_start_at ? (
                       <div style={{ textAlign: 'center', padding: '12px', color: '#A0978D', fontSize: '13px' }}>您已經使用過免費試用額度</div>
                    ) : (
                      <button onClick={handleStartTrial} style={{ padding: '12px', backgroundColor: '#A67B3E', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity='0.9'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>開啟 15 天試用</button>
                    )}
                  </div>

                  <div style={{ border: quotaInfo?.plan_type === 'pro' ? '2px solid #4E7A5A' : '1px solid #EAE6E1', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: quotaInfo?.plan_type === 'pro' ? '#FFFFFF' : '#FBFBF9', boxShadow: quotaInfo?.plan_type === 'pro' ? '0 4px 16px rgba(0,0,0,0.05)' : 'none' }}>
                    <h4 style={{ margin: 0, fontSize: '18px', color: '#4E7A5A' }}>專業版</h4>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#5D4A3E' }}>NT$ 150 <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#A0978D' }}>/ 月</span></div>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#7A7269', fontSize: '14px', lineHeight: '1.8', flex: 1 }}>
                      <li><strong>無限制建立委託單數量</strong></li>
                      <li>解鎖編輯「所有」進階區塊編輯權限</li>
                      <li>單檔上傳最高 <strong>5MB</strong> 限制</li>
                      <li>解鎖最高 <strong>30 張</strong>作品展示上限</li>
                      <li>享有未來所有進階功能更新</li>
                    </ul>
                    {quotaInfo?.plan_type === 'pro' ? (
                       <div style={{ textAlign: 'center', padding: '12px', color: '#4E7A5A', fontWeight: 'bold', backgroundColor: '#E8F3EB', borderRadius: '8px' }}>已訂閱專業版</div>
                    ) : (
                      <button onClick={handleMockUpgrade} style={{ padding: '12px', backgroundColor: '#4E7A5A', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity='0.9'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>模擬付費 (開通 30 天)</button>
                    )}
                  </div>

                </div>
              </div>
            )}

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
                      <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#5D4A3E' }}>上傳個人頭像</label>
                      {isUploading ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#A0978D', fontSize: '14px' }}>圖片處理中...</div>
                      ) : (
                        <ImageUploader 
                          onUpload={handleAvatarUpload}
                          aspectRatio={1} 
                          withWatermark={false} 
                          buttonText={formData.avatar_url ? "重新更換頭像" : "上傳頭像圖檔"}
                        />
                      )}
                      <span style={{ fontSize: '12px', color: '#A0978D' }}>目前的網址：{formData.avatar_url || '尚未上傳'}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#5D4A3E' }}>簡短個人介紹 <span style={{fontSize: '12px', color: '#A0978D', fontWeight: 'normal'}}>(顯示於預覽頁左側)</span></label>
                  <textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} onFocus={() => setFocusedField('bio')} onBlur={() => setFocusedField(null)} placeholder="介紹您的繪畫風格或經歷..." style={{...getInputStyle('bio'), minHeight: '120px', resize: 'vertical'}} />
                </div>

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
                        背景圖片設定 <span style={{fontSize: '12px', color: '#A0978D', fontWeight: 'normal'}}>(建議使用橫式美圖。若留空，將預設使用頭像)</span>
                      </label>
                      
                      {/* 🌟 核心修改：Splash 背景圖改為 R2 上傳模式 */}
                      {settings.splash_image ? (
                        <div style={{ position: 'relative', width: '100%', height: '180px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #EAE6E1' }}>
                          <img src={settings.splash_image} alt="背景預覽" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button 
                            onClick={() => setSettings({...settings, splash_image: ''})} 
                            style={{ position: 'absolute', top: '10px', right: '10px', padding: '6px 12px', backgroundColor: 'rgba(160, 92, 92, 0.9)', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                          >
                            移除圖片
                          </button>
                        </div>
                      ) : (
                        isSplashUploading ? (
                          <div style={{ padding: '30px', textAlign: 'center', border: '2px dashed #DED9D3', borderRadius: '12px', color: '#A0978D', backgroundColor: '#FBFBF9' }}>圖片上傳中...</div>
                        ) : (
                          <ImageUploader 
                            onUpload={handleSplashUpload}
                            buttonText="點此選擇要上傳的開場背景圖檔"
                          />
                        )
                      )}
                      <span style={{ fontSize: '11px', color: '#A0978D' }}>目前的圖片網址：{settings.splash_image || '使用預設頭像'}</span>
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

            {activeTab === 'portfolio' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {quotaInfo?.plan_type === 'free' && (
                  <div style={{ padding: '12px 16px', backgroundColor: '#FDF4E6', color: '#A67B3E', borderRadius: '8px', border: '1px solid #E8D3B9', fontSize: '14px', fontWeight: 'bold', lineHeight: '1.6' }}>
                    ⚠️ 您目前為「基礎免費版」，此處上傳的圖片資料會全數被保留，但在對外公開的個人專屬首頁中，<span style={{ color: '#A05C5C' }}>僅會展示前 6 張作品</span>。升級專業版即可解鎖無上限展示！
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#5D4A3E' }}>
                    上傳展示作品 <span style={{ fontSize: '12px', color: '#A0978D', fontWeight: 'normal' }}>(已使用: {settings.portfolio.length} / 30 張，可拖曳圖片更改順序)</span>
                  </label>
                  
                  {settings.portfolio.length < 30 ? (
                    isPortfolioUploading ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#A0978D', fontSize: '14px', border: '2px dashed #DED9D3', borderRadius: '12px' }}>
                        圖片處理與上傳中，請稍候...
                      </div>
                    ) : (
                      <ImageUploader 
                        onUpload={handlePortfolioUpload}
                        buttonText="點此選擇要上傳的作品圖檔"
                      />
                    )
                  ) : (
                    <div style={{ padding: '16px', backgroundColor: '#F5EBEB', color: '#A05C5C', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #E5CACA' }}>
                      已達 30 張作品上限！若需新增，請先刪除部分舊作品。
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px', marginTop: '10px' }}>
                  {settings.portfolio.length === 0 && <div style={{ color: '#C4BDB5', fontSize: '14px', gridColumn: '1 / -1', padding: '20px 0' }}>目前尚無作品，請在上方上傳圖片。</div>}
                  
                  {settings.portfolio.map((img, index) => (
                    <div 
                      key={index} 
                      draggable
                      onDragStart={(e) => {
                        setDraggedIdx(index);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault(); 
                        if (draggedIdx === null || draggedIdx === index) return;
                        const newPortfolio = [...settings.portfolio];
                        const draggedItem = newPortfolio[draggedIdx];
                        newPortfolio.splice(draggedIdx, 1);
                        newPortfolio.splice(index, 0, draggedItem);
                        setDraggedIdx(index);
                        setSettings(prev => ({ ...prev, portfolio: newPortfolio }));
                      }}
                      onDragEnd={() => setDraggedIdx(null)}
                      style={{ 
                        position: 'relative', aspectRatio: '1', borderRadius: '12px', border: '1px solid #EAE6E1', 
                        overflow: 'hidden', backgroundColor: '#FBFBF9', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        cursor: 'grab', opacity: draggedIdx === index ? 0.5 : 1, transform: 'translateZ(0)'
                      }}
                    >
                      <img src={img} alt={`作品 ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                      
                      {quotaInfo?.plan_type === 'free' && index >= 6 && (
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A05C5C', fontWeight: 'bold', fontSize: '13px', backdropFilter: 'blur(2px)' }}>
                          前台已隱藏
                        </div>
                      )}
                      
                      <button onClick={(e) => { e.stopPropagation(); handleRemoveImage(index); }} style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', backgroundColor: 'rgba(255,255,255,0.95)', color: '#A05C5C', border: 'none', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>×</button>
                      
                      <div style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFF', fontSize: '12px', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', pointerEvents: 'none' }}>
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(activeTab === 'detailed_intro' || activeTab === 'process' || activeTab === 'payment' || activeTab === 'rules') && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: '40px' }}>
                {activeTab === 'rules' && (
                  <div style={{ 
                    marginBottom: '12px', color: '#8A602B', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#FDF4E6', 
                    padding: '12px 16px', borderRadius: '8px', border: '1px solid #E8D3B9', display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    💡 說明：此部分內容將會出現在每次委託書下方必須閱覽的區域
                  </div>
                )}
                <div className="custom-quill-wrapper">
                  <ReactQuill 
                    theme="snow" 
                    value={settings[activeTab as keyof ProfileSettings] as string || ''} 
                    onChange={value => setSettings({...settings, [activeTab]: value})}
                    modules={customQuillModules}
                  />
                </div>
              </div>
            )}

            {activeTab === 'custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {settings.custom_sections.map((section, index) => (
                  <div key={section.id} style={{ padding: '24px', border: '1px solid #EAE6E1', borderRadius: '16px', backgroundColor: '#FBFBF9', position: 'relative' }}>
                    <button onClick={() => handleRemoveCustomSection(section.id)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#A05C5C', cursor: 'pointer', fontSize: '20px', fontWeight: 'bold' }}>×</button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <input type="text" value={section.title} onChange={e => handleUpdateCustomSection(section.id, 'title', e.target.value)} onFocus={() => setFocusedField(`custom_title_${section.id}`)} onBlur={() => setFocusedField(null)} placeholder={`自訂標題 ${index + 1}`} style={{...getInputStyle(`custom_title_${section.id}`), width: '60%', backgroundColor: '#FFFFFF', fontWeight: 'bold'}} />
                      <div style={{ paddingBottom: '40px' }}>
                        <div className="custom-quill-wrapper small">
                          <ReactQuill 
                            theme="snow" value={section.content || ''} 
                            onChange={value => handleUpdateCustomSection(section.id, 'content', value)}
                            modules={customQuillModules}
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
        </div>

        {activeTab !== 'subscription' && !isCurrentTabLocked && (
          <div style={{ marginTop: '20px', borderTop: '1px solid #F0ECE7', paddingTop: '24px', display: 'flex', justifyContent: 'flex-end', zIndex: 20 }}>
            <button onClick={handleSave} disabled={isSaving} style={{ padding: '14px 40px', backgroundColor: isSaving ? '#C4BDB5' : '#5D4A3E', color: '#FFFFFF', border: 'none', borderRadius: '12px', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(93,74,62,0.2)' }} onMouseEnter={e => !isSaving && (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={e => !isSaving && (e.currentTarget.style.transform = 'translateY(0)')}>
              {isSaving ? '儲存中...' : '儲存全部內容'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}