// Settings.tsx 完整修正版
import { useState, useEffect, useCallback, useMemo } from 'react';
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

function Toast({ message, type, onClose }: { message: string, type: 'ok' | 'err', onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast-message ${type === 'err' ? 'error' : 'success'}`}>
      <div className="toast-icon">{type === 'err' ? '⚠️' : '✅'}</div>
      <div className="toast-content">{message}</div>
    </div>
  );
}

interface MenuItem {
  id: string;
  label: string;
  isAction?: boolean; 
  isCustom?: boolean;
  index?: number;
}

interface MenuCategory {
  title: string;
  items: MenuItem[];
}

export function Settings() {
  const [activeTab, setActiveTab] = useState('profile_basic');
  const [formData, setFormData] = useState<FormDataState>({ display_name: '', avatar_url: '', bio: '' });
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hideGlobalSave, setHideGlobalSave] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'ok' | 'err' } | null>(null);

  const [settings, setSettings] = useState<ProfileSettings>({
    portfolio: [], 
    detailed_intro: '', 
    process: '', 
    payment: '', 
    rules: '', 
    custom_sections: [], 
    social_links: [], 
    hidden_sections: [],
    splash_enabled: true, 
    splash_image: '', 
    splash_duration: 2, 
    splash_text: '',
    layout_type: 'blog', 
    background_color: '#F4F0EB', 
    gradient_direction: 'to bottom right',
    theme_mode: 'dark'
  });

  const [isSaving, setIsSaving] = useState(false);
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
  }, []);

  const categories: MenuCategory[] = [
    { title: '個人資訊', items: [{ id: 'profile_basic', label: '頭像與簡介' }] },
    { title: '頁面外觀', items: [
        { id: 'theme', label: '背景與版型設定' },
        { id: 'splash', label: '開場動畫設定' }
    ]},
    { title: '內容管理', items: [
        { id: 'detailed_intro', label: '詳細介紹' },
        { id: 'portfolio', label: '作品展示區' },
        { id: 'showcase', label: '徵稿/販售區' },
        { id: 'process', label: '委託流程' },
        { id: 'payment', label: '付款方式' },
        { id: 'rules', label: '協議書範本' },
    ]},
    { title: '訂閱方案', items: [{ id: 'subscription', label: '方案查看與升級' }] }
  ];

  const menuGroups = useMemo(() => {
    return categories.map(group => {
      if (group.title.includes('內容管理')) {
        const sections = settings.custom_sections || [];
        const dynamicItems: MenuItem[] = sections.map((section, index) => ({
          id: `custom_${index}`,
          label: section.title || `自定義區塊 ${index + 1}`,
          isCustom: true,
          index: index
        }));
        return { ...group, items: [...group.items, ...dynamicItems] };
      }
      return group;
    });
  }, [settings.custom_sections]);

  const fetchUserData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
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
          max_quota: 3,
        });

        if (data.data.profile_settings) {
          const parsed = typeof data.data.profile_settings === 'string' 
            ? JSON.parse(data.data.profile_settings) 
            : data.data.profile_settings;
          
          setSettings(prev => ({ 
            ...prev, 
            ...parsed,
            custom_sections: parsed.custom_sections || [] 
          }));
        }
      }
    } catch (error) {
      console.error("讀取設定失敗", error);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => { fetchUserData(); }, [fetchUserData]);

  const handleSave = async () => {
    setIsSaving(true); 
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: 'PATCH', 
        credentials: 'include', 
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
        showToast('所有變更已成功儲存', 'ok');
      } else {
        showToast(data.error || '儲存失敗', 'err');
      }
    } catch (error) {
      showToast('系統發生錯誤', 'err');
    } finally {
      setIsSaving(false); 
    }
  };

  const toggleVisibility = (sectionId: string) => {
    setSettings(prev => {
      const isHidden = prev.hidden_sections.includes(sectionId);
      return { 
        ...prev, 
        hidden_sections: isHidden 
          ? prev.hidden_sections.filter(id => id !== sectionId) 
          : [...prev.hidden_sections, sectionId] 
      };
    });
  };

  // 🌟 核心計算區：確保變數在此處宣告，防止「找不到名稱」錯誤
  const isFreePlan = quotaInfo?.plan_type === 'free';
  const freeAllowedTabs = [
    'profile_basic', 'portfolio', 'detailed_intro', 'subscription', 
    'theme', 'showcase', 'custom_manage', 'rules', 'process', 'payment'
  ];
  const isCurrentTabLocked = isFreePlan && !freeAllowedTabs.includes(activeTab);

  if (isLoading) return <div className="loading-screen" style={{ padding: '40px', textAlign: 'center' }}>載入設定中...</div>;

  return (
    <div className="settings-page">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="sidebar-title">個人頁編輯</div>
          {menuGroups.map(group => (
            <div key={group.title} className="sidebar-group">
              <div className="group-label">
                {group.title}
                {group.title.includes('內容管理') && (
                  <button className="add-page-btn" onClick={() => { setActiveTab('custom_manage'); setHideGlobalSave(false); }}>+ 新增分頁</button>
                )}
              </div>
              {group.items.map((item: MenuItem) => {
                if (item.id === 'custom_manage') return null;
                const isLocked = isFreePlan && !freeAllowedTabs.includes(item.id);
                return (
                  <button 
                    key={item.id} 
                    className={`tab-btn ${activeTab === item.id ? 'active' : ''}`} 
                    onClick={() => { setActiveTab(item.id); setHideGlobalSave(false); }}
                  >
                    {item.label} {isLocked && '🔒'}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        <div className="settings-content-area">
          <div className="settings-header">
            <h3>內容編輯</h3>
            {['showcase', 'portfolio', 'detailed_intro', 'process', 'payment', 'rules'].includes(activeTab) && (
              <button onClick={()=>toggleVisibility(activeTab)} className="visibility-toggle">
                {settings.hidden_sections.includes(activeTab) ? '🚫 目前已隱藏' : '👁️ 公開顯示中'}
              </button>
            )}
          </div>

          {isCurrentTabLocked && (
            <div className="lock-overlay">
              <div className="lock-card">
                <div className="lock-icon">🔒</div>
                <h4>此功能僅限專業版</h4>
                <button onClick={() => setActiveTab('subscription')}>查看方案</button>
              </div>
            </div>
          )}

          <div className="tab-body" style={{ filter: isCurrentTabLocked ? 'blur(8px)' : 'none', pointerEvents: isCurrentTabLocked ? 'none' : 'auto' }}>
            {activeTab === 'profile_basic' && <BasicInfoTab formData={formData} setFormData={setFormData} settings={settings} setSettings={setSettings} />}
            {activeTab === 'theme' && <ThemeTab settings={settings} setSettings={setSettings} />}
            {activeTab === 'splash' && <SplashTab settings={settings} setSettings={setSettings} />}
            
            {['detailed_intro', 'process', 'payment', 'rules'].includes(activeTab) && (
              <RichTextTab key={activeTab} field={activeTab} settings={settings} setSettings={setSettings} />
            )}
            
            {activeTab.startsWith('custom_') && activeTab !== 'custom_manage' && !['rules', 'theme', 'splash', 'process', 'payment'].includes(activeTab) && (
              <RichTextTab 
                key={activeTab}
                isCustom 
                customIndex={parseInt(activeTab.split('_')[1])} 
                settings={settings} 
                setSettings={setSettings} 
              />
            )}

            {activeTab === 'custom_manage' && <CustomSectionsTab settings={settings} setSettings={setSettings} />}
            {activeTab === 'showcase' && <ShowcaseTab onToggleGlobalSave={setHideGlobalSave} onToast={showToast} quotaInfo={quotaInfo} isReadOnly={false} />}
            {activeTab === 'portfolio' && <PortfolioTab formData={formData} settings={settings} setSettings={setSettings} quotaInfo={quotaInfo} />}
            {activeTab === 'subscription' && <SubscriptionTab quotaInfo={quotaInfo} fetchUserData={fetchUserData} onToast={showToast} />}
          </div>

          {!hideGlobalSave && (
            <div className="save-action-bar">
              <button onClick={handleSave} disabled={isSaving || isCurrentTabLocked} className="main-save-btn">
                {isSaving ? '儲存中...' : '儲存所有變更'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}