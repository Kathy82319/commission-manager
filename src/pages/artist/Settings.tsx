import { useState, useEffect, useCallback } from 'react';
import type { ProfileSettings, QuotaInfo, FormDataState } from './Settings/types';
import { BasicInfoTab } from './Settings/BasicInfoTab';
import { PortfolioTab } from './Settings/PortfolioTab';
import { RichTextTab } from './Settings/RichTextTab';
import { SplashTab } from './Settings/SplashTab';
import { CustomSectionsTab } from './Settings/CustomSectionsTab';
import { SubscriptionTab } from './Settings/SubscriptionTab';
import { ThemeTab } from './Settings/ThemeTab';
import { ShowcaseTab } from './Settings/ShowcaseTab';
import '../../styles/Settings.css'; 

export function Settings() {
  const [activeTab, setActiveTab] = useState('profile_basic');
  const [formData, setFormData] = useState<FormDataState>({ display_name: '', avatar_url: '', bio: '' });
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);
  const [settings, setSettings] = useState<ProfileSettings>({
    portfolio: [], detailed_intro: '', process: '', payment: '', rules: '', custom_sections: [], social_links: [], hidden_sections: [],
    splash_enabled: true, splash_image: '', splash_duration: 2, splash_text: '',
    layout_type: 'blog', background_color: '#F4F0EB', theme_mode: 'dark'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
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
            setSettings(prev => ({ ...prev, ...parsed }));
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

  const toggleVisibility = (sectionId: string) => {
    setSettings(prev => {
      const isHidden = prev.hidden_sections.includes(sectionId);
      return { ...prev, hidden_sections: isHidden ? prev.hidden_sections.filter(id => id !== sectionId) : [...prev.hidden_sections, sectionId] };
    });
  };

  const menuItems = [
    { id: 'profile_basic', label: '頭像與簡介' },
    { id: 'theme', label: '外觀與版型設定' }, // 🌟 新增外觀設定
    { id: 'showcase', label: '徵委託項目管理' }, // 🌟 新增徵委託管理
    { id: 'portfolio', label: '舊版作品展示區' },
    { id: 'detailed_intro', label: '詳細介紹' },
    { id: 'splash', label: '開場動畫設定' },
    { id: 'process', label: '委託流程' },
    { id: 'payment', label: '付款方式' },
    { id: 'rules', label: '協議書內容' },
    { id: 'custom', label: '其他 (自訂標題)' },
    { id: 'subscription', label: '方案與訂閱' }, 
  ];

  const isFreePlan = quotaInfo?.plan_type === 'free';
  const freeAllowedTabs = ['profile_basic', 'portfolio', 'detailed_intro', 'subscription', 'theme', 'showcase'];
  const isCurrentTabLocked = isFreePlan && !freeAllowedTabs.includes(activeTab);

  return (
    <div className="settings-page">
      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="sidebar-title">個人頁編輯</div>
          {menuItems.map(item => {
            const isLocked = isFreePlan && !freeAllowedTabs.includes(item.id);
            return (
              <button key={item.id} className={`tab-btn ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
                {item.label} {isLocked && '🔒'}
              </button>
            );
          })}
        </aside>

        <div className="settings-content-area">
          <div className="settings-header">
            <h3>{menuItems.find(m=>m.id===activeTab)?.label}</h3>
            {['showcase', 'portfolio', 'detailed_intro', 'process', 'payment', 'rules', 'custom'].includes(activeTab) && !isCurrentTabLocked && (
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
            {activeTab === 'profile_basic' && <BasicInfoTab formData={formData} setFormData={setFormData} settings={settings} setSettings={setSettings} />}
            {activeTab === 'theme' && <ThemeTab settings={settings} setSettings={setSettings} />}
            {activeTab === 'showcase' && <ShowcaseTab />}
            {activeTab === 'portfolio' && <PortfolioTab formData={formData} settings={settings} setSettings={setSettings} />}
            {['detailed_intro', 'process', 'payment', 'rules'].includes(activeTab) && <RichTextTab field={activeTab} settings={settings} setSettings={setSettings} />}
            {activeTab === 'splash' && <SplashTab settings={settings} setSettings={setSettings} />}
            {activeTab === 'custom' && <CustomSectionsTab settings={settings} setSettings={setSettings} />}
            {activeTab === 'subscription' && <SubscriptionTab quotaInfo={quotaInfo} fetchUserData={fetchUserData} />}
          </div>

          <div className="save-action-bar">
            {message && <span style={{ color: message.includes('失敗') || message.includes('錯誤') ? '#A05C5C' : '#4E7A5A', fontWeight: 'bold', fontSize: '14px' }}>{message}</span>}
            <button onClick={handleSave} disabled={isSaving || activeTab === 'subscription' || activeTab === 'showcase'} style={{ padding: '12px 32px', background: activeTab === 'subscription' || activeTab === 'showcase' ? '#DED9D3' : '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: activeTab === 'subscription' || activeTab === 'showcase' ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, transition: 'opacity 0.2s', fontSize: '15px' }}>
              {isSaving ? '儲存中...' : (activeTab === 'showcase' ? '展示項目會自動儲存' : '儲存變更')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}