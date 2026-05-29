// src/pages/artist/Settings.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { QuotaInfo, FormDataState } from './Settings/types';
import { BasicInfoTab } from './Settings/BasicInfoTab';
import { PortfolioTab } from './Settings/PortfolioTab';
import { RichTextTab } from './Settings/RichTextTab';
import { SplashTab } from './Settings/SplashTab';
import { SubscriptionTab } from './Settings/SubscriptionTab';
import { ThemeTab } from './Settings/ThemeTab';
import { ShowcaseTab } from './Settings/ShowcaseTab';
import { BulletinSettingsTab } from './Settings/BulletinSettingsTab';
import { QueueSettingsTab, type QueueSettings } from './Settings/QueueSettingsTab';
import { OrderTab } from './Settings/OrderTab'; 
import { SingleCustomSectionTab } from './Settings/SingleCustomSectionTab'; 
import { OCDisplaySettingsTab } from './Settings/OCDisplaySettingsTab'; 
import { NotificationSettingsTab } from './Settings/NotificationSettingsTab';
import { ReviewSettingsTab } from './Settings/ReviewSettingsTab';
import '../../styles/Settings.css';
import { useLocation } from 'react-router-dom';

export interface CompleteSettings {
  portfolio: string[];
  detailed_intro: string;
  rules: string;
  custom_sections: any[];
  social_links: any[];
  hidden_sections: string[];
  splash_enabled: boolean;
  splash_image: string;
  splash_duration: number;
  splash_text: string;
  layout_type: string;
  background_color: string;
  gradient_direction: string;
  theme_mode: string;
  bulletin_card: { specialties: string; no_gos: string; payment_methods: string; price_list: string };
  question_template: string;
  queue_settings: QueueSettings;
  tab_order: string[];
  show_favorite_count: boolean;
  portfolio_layout: 'grid' | 'masonry';
  portfolio_blurred: boolean;
}

function Toast({ message, type, onClose }: { message: string, type: 'ok' | 'err', onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast-message ${type === 'err' ? 'error' : 'success'}`}>
      <div className="toast-icon">{type === 'err' ? '[錯誤]' : '[成功]'}</div>
      <div className="toast-content">{message}</div>
    </div>
  );
}

interface MenuItem {
  id: string;
  label: string;
  isCustom?: boolean;
}

interface MenuCategory {
  title: string;
  items: MenuItem[];
}

export function Settings() {
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'profile_basic';
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  const [formData, setFormData] = useState<FormDataState>({ display_name: '', avatar_url: '', bio: '' });
  
  const [notifyConfig, setNotifyConfig] = useState<any>({
    notification_email: '',
    email_art_chat: 1, email_art_progress: 1, email_art_inbound: 1,
    email_cli_chat: 1, email_cli_progress: 1, email_cli_bulletin: 1
  });

  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hideGlobalSave, setHideGlobalSave] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'ok' | 'err' } | null>(null);

  const [hasOC, setHasOC] = useState<boolean>(false);

  const [settings, setSettings] = useState<CompleteSettings>({
    portfolio: [], 
    detailed_intro: '', 
    rules: '', 
    custom_sections: [], 
    social_links: [], 
    hidden_sections: [],
    splash_enabled: true, 
    splash_image: '', 
    splash_duration: 2, 
    splash_text: '',
    layout_type: 'blog', 
    background_color: '', 
    gradient_direction: '',
    theme_mode: '',
    bulletin_card: { specialties: '', no_gos: '', payment_methods: '', price_list: '' },
    question_template: '',
    queue_settings: { enabled: false, show_client_name: true, show_client_id: false, show_project_name: true, show_artist_note: false },
    tab_order: [],
    show_favorite_count: false,
    portfolio_layout: 'grid',
    portfolio_blurred: false
  });

  const [isSaving, setIsSaving] = useState(false);
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
  }, []);

  const categories: MenuCategory[] = [
    { 
      title: '個人資訊', 
      items: [
        { id: 'profile_basic', label: '頭像與簡介' },
        { id: 'notification_settings', label: '通知與信箱設定' },
        ...(hasOC ? [{ id: 'oc_display', label: '角色設定卡展示' }] : []) 
      ] 
    },
    { title: '頁面外觀', items: [
        { id: 'theme', label: '背景與版型設定' },
        { id: 'splash', label: '開場動畫設定' }
    ]},
    { title: '內容管理', items: [      
        { id: 'queue_settings', label: '排單表顯示設定' },
        { id: 'detailed_intro', label: '詳細介紹' },
        { id: 'portfolio', label: '作品展示區' },
        { id: 'showcase', label: '接委託區' },
        { id: 'rules', label: '委託協議書範本' },
        { id: 'bulletin_settings', label: '許願池投遞履歷管理' },
        { id: 'reviews', label: '精選評價管理' }, 
    ]},
    { title: '訂閱方案', items: [{ id: 'subscription', label: '方案查看與升級' }] }
  ];

  const menuGroups = useMemo(() => {
    return categories.map(group => {
      if (group.title.includes('內容管理')) {
        const sections = settings.custom_sections || [];
        const dynamicItems: MenuItem[] = sections.map((section) => ({
          id: section.id,
          label: section.title || `未命名分頁`,
          isCustom: true
        }));
        return { ...group, items: [...group.items, ...dynamicItems] };
      }
      return group;
    });
  }, [settings.custom_sections, hasOC]); 

  const currentActiveLabel = useMemo(() => {
    for (const group of menuGroups) {
      const found = group.items.find(item => item.id === activeTab);
      if (found) return found.label;
    }
    if (activeTab === 'tab_order') return '變更排序';
    return '設定';
  }, [activeTab, menuGroups]);

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

        setNotifyConfig({
          notification_email: data.data.notification_email || '',
          email_art_chat: data.data.email_art_chat ?? 1,
          email_art_progress: data.data.email_art_progress ?? 1,
          email_art_inbound: data.data.email_art_inbound ?? 1,
          email_cli_chat: data.data.email_cli_chat ?? 1,
          email_cli_progress: data.data.email_cli_progress ?? 1,
          email_cli_bulletin: data.data.email_cli_bulletin ?? 1,
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
          
          const safeCustomSections = (parsed.custom_sections || []).map((sec: any, idx: number) => ({
            ...sec,
            id: sec.id || `custom_legacy_${idx}`
          }));

          setSettings(prev => ({
            ...prev,
            ...parsed,
            custom_sections: safeCustomSections,
            bulletin_card: parsed.bulletin_card || { specialties: '', no_gos: '', payment_methods: '', price_list: '' },
            question_template: data.data.question_template || parsed.question_template || '',
            queue_settings: parsed.queue_settings || prev.queue_settings,
            tab_order: parsed.tab_order || [],
            portfolio_layout: parsed.portfolio_layout ?? 'grid',
            portfolio_blurred: parsed.portfolio_blurred === true,
          }));
        }

        try {
          const ocRes = await fetch(`${API_BASE}/api/oc`, { credentials: 'include' });
          if (ocRes.ok) {
            const ocData = await ocRes.json();
            if (ocData.success && ocData.data && ocData.data.length > 0) {
              setHasOC(true); 
            }
          }
        } catch (e) {
          console.error("背景檢查 OC 列表失敗", e);
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
          profile_settings: JSON.stringify(settings),
          question_template: settings.question_template,
          ...notifyConfig 
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

  const isFreePlan = quotaInfo?.plan_type === 'free';
  
  const freeAllowedTabs = [
    'profile_basic', 'notification_settings', 'portfolio', 'detailed_intro', 'rules', 'subscription', 
    'bulletin_settings', 'queue_settings', 'showcase', 'oc_display'
  ];
  
  const isCurrentTabLocked = isFreePlan && (!freeAllowedTabs.includes(activeTab) || activeTab.startsWith('custom_') || activeTab === 'tab_order');

  if (isLoading) return <div className="loading-screen" style={{ padding: '40px', textAlign: 'center' }}>載入設定中...</div>;

  const shouldHideGlobalSave = hideGlobalSave || activeTab === 'oc_display' || activeTab === 'reviews'; 

  return (
    <div className="settings-page">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="settings-layout">
        
        
        <div className="settings-mobile-nav">
          <button 
            className="mobile-nav-trigger" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span>目前查看：{currentActiveLabel}</span>
            <span className="trigger-arrow" style={{ transform: isMobileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
          </button>

          <div className={`mobile-nav-dropdown ${isMobileMenuOpen ? 'open' : ''}`}>
            {menuGroups.map(group => (
              <div key={group.title} className="sidebar-group">
                <div className="group-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {group.title}
                  {group.title.includes('內容管理') && (
                    <button className="add-page-btn" onClick={() => { setActiveTab('tab_order'); setHideGlobalSave(false); setIsMobileMenuOpen(false); }}>變更排序</button>
                  )}
                </div>
                
                {group.items.map((item: MenuItem) => {
                  const isLocked = isFreePlan && (!freeAllowedTabs.includes(item.id) || item.isCustom);
                  return (
                    <button 
                      key={item.id} 
                      className={`tab-btn ${activeTab === item.id ? 'active' : ''} ${item.isCustom ? 'custom-tab' : ''}`} 
                      onClick={() => { setActiveTab(item.id); setHideGlobalSave(false); setIsMobileMenuOpen(false); }}
                    >
                      {item.label} {isLocked && '[鎖定]'}
                    </button>
                  );
                })}

                {group.title.includes('內容管理') && (
                  <button 
                    className="add-custom-section-btn"
                    onClick={() => {
                      if (isFreePlan) { setActiveTab('custom_locked_placeholder'); setIsMobileMenuOpen(false); return; }
                      if (settings.custom_sections.length >= 5) return;
                      const newId = `custom_${Date.now()}`;
                      setSettings(prev => ({
                        ...prev,
                        custom_sections: [...prev.custom_sections, { id: newId, title: '未命名分頁', content: '' }]
                      }));
                      setActiveTab(newId);
                      setHideGlobalSave(false);
                      setIsMobileMenuOpen(false);
                    }}
                    style={{ opacity: settings.custom_sections.length >= 5 ? 0.5 : 1 }}
                  >
                    + 新增分頁
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        
        <aside className="settings-sidebar">
          <div className="sidebar-title">個人頁編輯</div>
          {menuGroups.map(group => (
            <div key={group.title} className="sidebar-group">
              <div className="group-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {group.title}
                {group.title.includes('內容管理') && (
                  <button className="add-page-btn" onClick={() => { setActiveTab('tab_order'); setHideGlobalSave(false); }}>變更排序</button>
                )}
              </div>
              
              {group.items.map((item: MenuItem) => {
                const isLocked = isFreePlan && (!freeAllowedTabs.includes(item.id) || item.isCustom);
                return (
                  <button 
                    key={item.id} 
                    className={`tab-btn ${activeTab === item.id ? 'active' : ''} ${item.isCustom ? 'custom-tab' : ''}`} 
                    onClick={() => { setActiveTab(item.id); setHideGlobalSave(false); }}
                  >
                    {item.label} {isLocked && '[鎖定]'}
                  </button>
                );
              })}

              {group.title.includes('內容管理') && (
                <button 
                  className="add-custom-section-btn"
                  onClick={() => {
                    if (isFreePlan) { setActiveTab('custom_locked_placeholder'); return; }
                    if (settings.custom_sections.length >= 5) return;
                    const newId = `custom_${Date.now()}`;
                    setSettings(prev => ({
                      ...prev,
                      custom_sections: [...prev.custom_sections, { id: newId, title: '未命名分頁', content: '' }]
                    }));
                    setActiveTab(newId);
                    setHideGlobalSave(false);
                  }}
                  style={{ opacity: settings.custom_sections.length >= 5 ? 0.5 : 1 }}
                >
                  + 新增分頁
                </button>
              )}
            </div>
          ))}
        </aside>

        <div className="settings-content-area">
          <div className="settings-header">
            
            {['showcase', 'portfolio', 'detailed_intro', 'rules', 'reviews', ...settings.custom_sections.map(s => s.id)].includes(activeTab) && (
              <button onClick={()=>toggleVisibility(activeTab)} className="visibility-toggle">
                {settings.hidden_sections.includes(activeTab) ? '[目前已隱藏]' : '[公開顯示中]'}
              </button>
            )}
          </div>

          {isCurrentTabLocked && (
            <div className="lock-overlay">
              <div className="lock-card">
                <div className="lock-icon">[鎖定]</div>
                <h4>此功能僅限專業版</h4>
                <button onClick={() => setActiveTab('subscription')}>查看方案</button>
              </div>
            </div>
          )}

          <div className="tab-body" style={{ filter: isCurrentTabLocked ? 'blur(8px)' : 'none', pointerEvents: isCurrentTabLocked ? 'none' : 'auto' }}>
            {activeTab === 'profile_basic' && <BasicInfoTab formData={formData} setFormData={setFormData} settings={settings as any} setSettings={setSettings as any} />}
            {activeTab === 'notification_settings' && <NotificationSettingsTab config={notifyConfig} setConfig={setNotifyConfig} role="artist" />}
            {activeTab === 'oc_display' && <OCDisplaySettingsTab onToast={showToast} />}
            {activeTab === 'bulletin_settings' && <BulletinSettingsTab settings={settings as any} setSettings={setSettings as any} />}
            {activeTab === 'queue_settings' && <QueueSettingsTab settings={settings as any} setSettings={setSettings as any} />}
            {activeTab === 'theme' && <ThemeTab settings={settings as any} setSettings={setSettings as any} />}
            {activeTab === 'splash' && <SplashTab settings={settings as any} setSettings={setSettings as any} />}
            {activeTab === 'tab_order' && <OrderTab settings={settings} setSettings={setSettings} />}
            
            
            {activeTab === 'reviews' && <ReviewSettingsTab onToast={showToast} />}
            
            {['detailed_intro', 'rules'].includes(activeTab) && (
              <RichTextTab key={activeTab} field={activeTab as any} settings={settings as any} setSettings={setSettings as any} />
            )}
            
            {activeTab.startsWith('custom_') && (
              <SingleCustomSectionTab 
                key={activeTab}
                sectionId={activeTab} 
                settings={settings} 
                setSettings={setSettings} 
                onDelete={() => {
                  setSettings(prev => ({ ...prev, custom_sections: prev.custom_sections.filter(s => s.id !== activeTab) }));
                  setActiveTab('profile_basic');
                }}
              />
            )}

            {activeTab === 'showcase' && <ShowcaseTab onToggleGlobalSave={setHideGlobalSave} onToast={showToast} quotaInfo={quotaInfo} isReadOnly={false} />}
            {activeTab === 'portfolio' && <PortfolioTab formData={formData} settings={settings as any} setSettings={setSettings as any} quotaInfo={quotaInfo} />}
            {activeTab === 'subscription' && <SubscriptionTab quotaInfo={quotaInfo} fetchUserData={fetchUserData} onToast={showToast} />}
          </div>

          {!shouldHideGlobalSave && (
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