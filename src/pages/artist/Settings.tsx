// src/pages/artist/Settings.tsx
import { useState, useEffect, useCallback } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css'; 
import { ImageUploader } from '../../components/ImageUploader';
import '../../styles/Settings.css'; 

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
  const [isSplashUploading, setIsSplashUploading] = useState(false);
  
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
  
  // 🌟 恢復的狀態
  const [isUpgrading, setIsUpgrading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || ''; 

  const fetchUserData = useCallback(async () => {
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
  }, [API_BASE]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      alert("🎉 恭喜！您已成功升級為專業版。");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    fetchUserData();
  }, [API_BASE, fetchUserData]);

  // 🌟 恢復的付款與試用邏輯
  const handleStartTrial = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/test/start-trial`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchUserData();
      } else alert(data.error);
    } catch(e) { alert('連線失敗'); }
  };

  const handleUpgradeClick = async () => {
    setIsUpgrading(true);
    try {
      const response = await fetch(`${API_BASE}/api/payment/create`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_type: "pro" })
      });

      const result = await response.json();

      if (result.success && result.data) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = result.data.PayGateWay;

        const params = {
          MerchantID: result.data.MerchantID,
          TradeInfo: result.data.TradeInfo,
          TradeSha: result.data.TradeSha,
          Version: result.data.Version,
        };

        for (const [key, value] of Object.entries(params)) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value as string;
          form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit(); 
      } else {
        alert("訂單建立失敗：" + (result.error || "請稍後再試"));
        setIsUpgrading(false);
      }
    } catch (error) {
      console.error("升級失敗:", error);
      alert("系統連線異常");
      setIsUpgrading(false);
    }
  };

  const handleAvatarUpload = async (resultBlobs: { preview: Blob }) => {
    setIsUploading(true);
    try {
      const fileType = resultBlobs.preview.type || 'image/jpeg';
      const fileExt = fileType.split('/')[1] || 'jpg';
      const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: fileType, bucketType: 'public', originalName: `avatar.${fileExt}`, folder: 'avatars' }) 
      });
      
      const ticketData = await ticketRes.json();
      if (!ticketData.success) throw new Error(ticketData.error || "無法取得上傳通行證");
      const { uploadUrl, fileName: safeFileName } = ticketData;
      
      const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: resultBlobs.preview, headers: { 'Content-Type': fileType } });
      if (!uploadRes.ok) throw new Error("上傳遭拒絕");

      const finalUrl = `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${safeFileName}`;
      setFormData(prev => ({ ...prev, avatar_url: finalUrl }));
    } catch (err: any) {
      alert(err.message || "頭像上傳失敗");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePortfolioUpload = async (resultBlobs: { preview: Blob }) => {
    setIsPortfolioUploading(true);
    try {
      const fileType = resultBlobs.preview.type || 'image/jpeg';
      const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: fileType, bucketType: 'public', originalName: 'portfolio.jpg', folder: 'portfolio' }) 
      });
      
      const ticketData = await ticketRes.json();
      if (!ticketData.success) throw new Error(ticketData.error || "無法取得上傳通行證");
      const { uploadUrl, fileName: safeFileName } = ticketData;
      
      const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: resultBlobs.preview, headers: { 'Content-Type': fileType } });
      if (!uploadRes.ok) throw new Error("上傳遭拒絕");

      const finalUrl = `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${safeFileName}`;
      setSettings(prev => ({ ...prev, portfolio: [...prev.portfolio, finalUrl] }));
    } catch (err: any) {
      alert(err.message || "作品上傳失敗");
    } finally {
      setIsPortfolioUploading(false);
    }
  };

  const handleSplashUpload = async (resultBlobs: { preview: Blob }) => {
    setIsSplashUploading(true);
    try {
      const fileType = resultBlobs.preview.type || 'image/jpeg';
      const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: fileType, bucketType: 'public', originalName: 'splash.jpg', folder: 'system' }) 
      });
      
      const ticketData = await ticketRes.json();
      if (!ticketData.success) throw new Error(ticketData.error || "無法取得上傳通行證");
      const { uploadUrl, fileName: safeFileName } = ticketData;
      
      const uploadRes = await fetch(uploadUrl, { method: 'PUT', body: resultBlobs.preview, headers: { 'Content-Type': fileType } });
      if (!uploadRes.ok) throw new Error("上傳遭拒絕");

      const finalUrl = `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${safeFileName}`;
      setSettings(prev => ({ ...prev, splash_image: finalUrl }));
    } catch (err: any) {
      alert(err.message || "背景圖上傳失敗");
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

  // 🌟 加入方案與訂閱選單
  const menuItems = [
    { id: 'profile_basic', label: '頭像與簡介' },
    { id: 'portfolio', label: '作品展示區' },
    { id: 'detailed_intro', label: '詳細介紹' },
    { id: 'splash', label: '開場動畫設定' },
    { id: 'process', label: '委託流程' },
    { id: 'payment', label: '付款方式' },
    { id: 'rules', label: '協議書內容' },
    { id: 'custom', label: '其他 (自訂標題)' },
    { id: 'subscription', label: '方案與訂閱' }, 
  ];

  const isFreePlan = quotaInfo?.plan_type === 'free';
  const freeAllowedTabs = ['profile_basic', 'portfolio', 'detailed_intro', 'subscription'];
  const isCurrentTabLocked = isFreePlan && !freeAllowedTabs.includes(activeTab);

  return (
    <div className="settings-page">
      <div className="settings-layout">
        
        <aside className="settings-sidebar">
          <div className="sidebar-title">個人頁編輯</div>
          {menuItems.map(item => {
            const isLocked = isFreePlan && !freeAllowedTabs.includes(item.id);
            return (
              <button 
                key={item.id} 
                className={`tab-btn ${activeTab === item.id ? 'active' : ''}`} 
                onClick={() => setActiveTab(item.id as any)}
              >
                {item.label} {isLocked && '🔒'}
              </button>
            );
          })}
        </aside>

        <div className="settings-content-area">
          <div className="settings-header">
            <h3>{menuItems.find(m=>m.id===activeTab)?.label}</h3>
            {activeTab !== 'profile_basic' && activeTab !== 'subscription' && !isCurrentTabLocked && (
              <button 
                onClick={()=>toggleVisibility(activeTab)} 
                style={{ 
                  fontSize: '12px', padding: '6px 12px', borderRadius: '20px', border: 'none', 
                  backgroundColor: settings.hidden_sections.includes(activeTab) ? '#F5EBEB' : '#E8F3EB', 
                  color: settings.hidden_sections.includes(activeTab) ? '#A05C5C' : '#4E7A5A', 
                  cursor: 'pointer', fontWeight: 'bold' 
                }}
              >
                {settings.hidden_sections.includes(activeTab) ? '🚫 目前已隱藏' : '👁️ 公開顯示中'}
              </button>
            )}
          </div>

          {isCurrentTabLocked && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)', borderRadius: '16px' }}>
              <div style={{ textAlign: 'center', padding: '32px', background: '#FFF', border: '1px solid #EAE6E1', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
                <h4 style={{ margin: '0 0 12px 0', color: '#5D4A3E', fontSize: '18px' }}>此功能僅限專業版</h4>
                <button onClick={() => setActiveTab('subscription')} style={{ padding: '10px 20px', background: '#A67B3E', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>查看方案</button>
              </div>
            </div>
          )}

          <div className="tab-body" style={{ filter: isCurrentTabLocked ? 'blur(4px)' : 'none', pointerEvents: isCurrentTabLocked ? 'none' : 'auto' }}>
            
            {activeTab === 'profile_basic' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', border: '1px solid #EAE6E1', flexShrink: 0 }}>
                    <img src={formData.avatar_url || '/default-avatar.png'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label className="form-label">顯示名稱</label>
                    <input className="form-input" value={formData.display_name} onChange={e=>setFormData({...formData, display_name: e.target.value})} />
                    <div style={{ marginTop: '16px' }}>
                      <ImageUploader onUpload={handleAvatarUpload} targetWidth={400} withWatermark={false} buttonText={isUploading ? "上傳中..." : "更換頭像"} maxSizeMB={2} />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="form-label">個人簡介</label>
                  <textarea className="form-input" value={formData.bio} onChange={e=>setFormData({...formData, bio: e.target.value})} style={{ minHeight: '120px', resize: 'vertical' }} />
                </div>
                
                <div style={{ borderTop: '1px solid #EAE6E1', paddingTop: '24px' }}>
                  <label className="form-label" style={{ marginBottom: '12px' }}>社群連結</label>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <select className="form-input" value={socialPlatform} onChange={e=>setSocialPlatform(e.target.value)} style={{ width: 'auto', minWidth: '140px' }}>
                      {['Facebook', 'Plurk', 'Twitter / X', 'Threads', 'Instagram', '個人網站'].map(p=><option key={p} value={p}>{p}</option>)}
                    </select>
                    <input className="form-input" value={socialUrl} onChange={e=>setSocialUrl(e.target.value)} placeholder="網址..." style={{ flex: 1, minWidth: '180px' }} />
                    <button onClick={handleAddSocial} style={{ padding: '10px 20px', background: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>+ 新增</button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {settings.social_links.map((link, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#FAFAFA', borderRadius: '8px', border: '1px solid #EAE6E1' }}>
                        <span style={{ wordBreak: 'break-all', paddingRight: '12px', fontSize: '14px' }}>
                          <strong style={{ color: '#5D4A3E', marginRight: '6px' }}>{link.platform}:</strong> 
                          <span style={{ color: '#7A7269' }}>{link.url}</span>
                        </span>
                        <button onClick={()=>handleRemoveSocial(i)} style={{ color: '#A05C5C', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', flexShrink: 0, padding: '4px' }}>移除</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'portfolio' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ backgroundColor: '#FAFAFA', padding: '20px', borderRadius: '12px', border: '1px dashed #DED9D3' }}>
                  <ImageUploader onUpload={handlePortfolioUpload} targetWidth={1200} withWatermark={true} watermarkText={formData.display_name} buttonText={isPortfolioUploading ? "上傳中..." : "上傳作品圖檔"} maxSizeMB={5} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
                  {settings.portfolio.map((img, i) => (
                    <div key={i} draggable onDragStart={()=>setDraggedIdx(i)} onDragOver={(e)=>{e.preventDefault(); if(draggedIdx===null || draggedIdx===i)return; const newPortfolio=[...settings.portfolio]; const item=newPortfolio.splice(draggedIdx, 1)[0]; newPortfolio.splice(i, 0, item); setDraggedIdx(i); setSettings(prev=>({...prev, portfolio: newPortfolio}));}} onDragEnd={()=>setDraggedIdx(null)} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', border: '1px solid #EAE6E1', opacity: draggedIdx === i ? 0.5 : 1, cursor: 'grab', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                      <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Portfolio ${i}`} />
                      <button onClick={()=>handleRemoveImage(i)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.9)', color: '#A05C5C', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {['detailed_intro', 'process', 'payment', 'rules'].includes(activeTab) && (
              <div className="custom-quill-wrapper">
                <ReactQuill theme="snow" value={settings[activeTab as keyof ProfileSettings] as string} onChange={v=>setSettings({...settings, [activeTab]: v})} modules={customQuillModules} />
              </div>
            )}

            {activeTab === 'splash' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ padding: '16px 20px', backgroundColor: '#FAFAFA', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', color: '#5D4A3E', cursor: 'pointer' }}>
                    <input type="checkbox" checked={settings.splash_enabled} onChange={e=>setSettings({...settings, splash_enabled: e.target.checked})} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                    啟用專屬開場動畫
                  </label>
                </div>
                
                {settings.splash_enabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label className="form-label" style={{ margin: 0 }}>動畫停留時長</label>
                        <span style={{ fontWeight: 'bold', color: '#A67B3E', fontSize: '15px' }}>{settings.splash_duration} 秒</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.5" 
                        max="10" 
                        step="0.5" 
                        value={settings.splash_duration} 
                        onChange={e => setSettings({...settings, splash_duration: Number(e.target.value)})}
                        style={{ width: '100%', cursor: 'pointer', accentColor: '#5D4A3E' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#A0978D', marginTop: '4px' }}>
                        <span>快 (0.5s)</span>
                        <span>慢 (10s)</span>
                      </div>
                    </div>

                    <div>
                      <label className="form-label" style={{ marginBottom: '12px' }}>開場背景圖設定</label>
                      <div style={{ backgroundColor: '#FAFAFA', padding: '20px', borderRadius: '12px', border: '1px dashed #DED9D3' }}>
                        <ImageUploader 
                          onUpload={handleSplashUpload} 
                          targetWidth={1920} 
                          aspectRatio={16/9}
                          withWatermark={false} 
                          buttonText={isSplashUploading ? "圖片上傳中..." : "上傳全螢幕背景圖"} 
                          maxSizeMB={3}
                        />
                        <div style={{ marginTop: '12px', fontSize: '13px', color: '#7A7269', lineHeight: '1.6' }}>
                          <p>📸 <strong>建議規格：</strong> 1920x1080 (比例 16:9)。</p>
                          <p>🚀 <strong>載入優化：</strong> 檔案限制放寬至 3MB，但系統會自動壓縮。若初次載入全黑，建議先手動壓縮圖檔至 1MB 內。</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {settings.custom_sections.map(sec => (
                  <div key={sec.id} style={{ padding: '24px', border: '1px solid #EAE6E1', borderRadius: '16px', backgroundColor: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <input className="form-input" value={sec.title} onChange={e=>handleUpdateCustomSection(sec.id, 'title', e.target.value)} placeholder="輸入自訂區塊大標題..." style={{ fontWeight: 'bold', fontSize: '16px' }} />
                    <div className="custom-quill-wrapper">
                      <ReactQuill theme="snow" value={sec.content} onChange={v=>handleUpdateCustomSection(sec.id, 'content', v)} modules={customQuillModules} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={()=>handleRemoveCustomSection(sec.id)} style={{ color: '#A05C5C', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', padding: '8px 16px', borderRadius: '8px', transition: 'background 0.2s' }}>
                        🗑️ 刪除此區塊
                      </button>
                    </div>
                  </div>
                ))}
                
                {settings.custom_sections.length < 3 && (
                  <button onClick={handleAddCustomSection} style={{ padding: '16px', border: '2px dashed #DED9D3', background: '#FFFFFF', color: '#7A7269', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', fontSize: '15px' }}>
                    + 新增自訂區塊 (最多 3 個)
                  </button>
                )}
              </div>
            )}
            
            {/* 🌟 恢復的方案與訂閱區塊 */}
            {activeTab === 'subscription' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button 
                          onClick={handleUpgradeClick} 
                          disabled={isUpgrading}
                          style={{ 
                            padding: '12px', backgroundColor: isUpgrading ? '#C4BDB5' : '#4E7A5A', color: '#FFF', 
                            border: 'none', borderRadius: '8px', cursor: isUpgrading ? 'not-allowed' : 'pointer', 
                            fontWeight: 'bold', transition: 'opacity 0.2s', width: '100%'
                          }} 
                          onMouseEnter={e => !isUpgrading && (e.currentTarget.style.opacity='0.9')} 
                          onMouseLeave={e => !isUpgrading && (e.currentTarget.style.opacity='1')}
                        >
                          {isUpgrading ? '導向安全支付頁面...' : '升級專業版 (線上刷卡)'}
                        </button>
                        {/* 🌟 藍新金流要求的退款政策明確宣告 */}
                        <div style={{ fontSize: '12px', color: '#A05C5C', textAlign: 'center', lineHeight: '1.4' }}>
                          點擊按鈕即代表同意<a href="/refund-policy" target="_blank" style={{ color: '#A05C5C', textDecoration: 'underline' }}>退款政策</a>，<br/>數位內容一經啟用恕不退費。
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

          </div>

          <div className="save-action-bar">
            {message && <span style={{ color: message.includes('失敗') || message.includes('錯誤') ? '#A05C5C' : '#4E7A5A', fontWeight: 'bold', fontSize: '14px' }}>{message}</span>}
            <button onClick={handleSave} disabled={isSaving || activeTab === 'subscription'} style={{ padding: '12px 32px', background: activeTab === 'subscription' ? '#DED9D3' : '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: activeTab === 'subscription' ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, transition: 'opacity 0.2s', fontSize: '15px' }}>
              {isSaving ? '儲存中...' : '儲存變更'}
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}