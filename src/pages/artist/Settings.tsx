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

// --- TypeScript 型別定義 ---
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
  
  // 狀態提升：全域設定草稿
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
    theme_mode: 'dark'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  // 1. 定義靜態分類結構
  const categories: MenuCategory[] = [
    {
      title: '分類一：個人資訊',
      items: [{ id: 'profile_basic', label: '頭像與簡介' }]
    },
    {
      title: '分類二：頁面外觀',
      items: [
        { id: 'theme', label: '背景與版型設定' },
        { id: 'splash', label: '開場動畫設定' }
      ]
    },
    {
      title: '分類三：內容管理',
      items: [
        { id: 'detailed_intro', label: '詳細介紹' },
        { id: 'portfolio', label: '作品展示區' },
        { id: 'showcase', label: '徵委託項目管理' },
        { id: 'process', label: '委託流程' },
        { id: 'payment', label: '付款方式' },
        { id: 'rules', label: '協議書範本' }, // 已更名
      ]
    },
    {
      title: '分類四：訂閱方案',
      items: [{ id: 'subscription', label: '方案查看與升級' }]
    }
  ];

  // 2. 動態合併自定義區塊到選單中
  const menuGroups = useMemo(() => {
    return categories.map(group => {
      if (group.title.includes('分類三')) {
        const dynamicItems: MenuItem[] = settings.custom_sections.map((section, index) => ({
          id: `custom_${index}`,
          label: section.title || `自定義區塊 ${index + 1}`,
          isCustom: true,
          index: index
        }));
        
        const manageItem: MenuItem = { 
          id: 'custom_manage', 
          label: '＋ 管理自定義區塊', 
          isAction: true 
        };
        
        return { ...group, items: [...group.items, ...dynamicItems, manageItem] };
      }
      return group;
    });
  }, [settings.custom_sections]);

  // 取得使用者原始資料
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
          max_quota: 3,
        });

        if (data.data.profile_settings) {
          const parsed = typeof data.data.profile_settings === 'string' 
            ? JSON.parse(data.data.profile_settings) 
            : data.data.profile_settings;
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      }
    } catch (error) {
      console.error("讀取設定失敗", error);
    }
  }, [API_BASE]);

  useEffect(() => { fetchUserData(); }, [fetchUserData]);

  // 全域儲存變更：一次儲存所有分頁內容
  const handleSave = async () => {
    setIsSaving(true); 
    setMessage('');
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
        setMessage('所有變更已成功儲存');
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
  const freeAllowedTabs = ['profile_basic', 'portfolio', 'detailed_intro', 'subscription', 'theme', 'showcase'];
  const isCurrentTabLocked = isFreePlan && !freeAllowedTabs.includes(activeTab) && !activeTab.startsWith('custom_');

  return (
    <div className="settings-page">
      <div className="settings-layout">
        
        {/* 側邊導覽列 */}
        <aside className="settings-sidebar">
          <div className="sidebar-title">個人頁編輯</div>
          {menuGroups.map(group => (
            <div key={group.title} className="sidebar-group">
              <div className="group-label">{group.title}</div>
              {group.items.map((item: MenuItem) => {
                const isLocked = isFreePlan && !freeAllowedTabs.includes(item.id) && !item.id.startsWith('custom_');
                return (
                  <button 
                    key={item.id} 
                    className={`tab-btn ${activeTab === item.id ? 'active' : ''} ${item.isAction ? 'manage-btn' : ''}`} 
                    onClick={() => setActiveTab(item.id)}
                  >
                    {item.label} {isLocked && '🔒'}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* 內容編輯區 */}
        <div className="settings-content-area">
          <div className="settings-header">
            <h3>內容編輯</h3>
            {['showcase', 'portfolio', 'detailed_intro', 'process', 'payment', 'rules'].includes(activeTab) && (
              <button onClick={()=>toggleVisibility(activeTab)} className="visibility-toggle">
                {settings.hidden_sections.includes(activeTab) ? '🚫 目前已隱藏' : '👁️ 公開顯示中'}
              </button>
            )}
          </div>

          {/* 專業版鎖定提示 */}
          {isCurrentTabLocked && (
            <div className="lock-overlay">
              <div className="lock-card">
                <div className="lock-icon">🔒</div>
                <h4>此功能僅限專業版</h4>
                <button onClick={() => setActiveTab('subscription')}>查看方案</button>
              </div>
            </div>
          )}

          <div className="tab-body" style={{ filter: isCurrentTabLocked ? 'blur(4px)' : 'none' }}>
            {activeTab === 'profile_basic' && (
              <BasicInfoTab formData={formData} setFormData={setFormData} settings={settings} setSettings={setSettings} />
            )}
            
            {activeTab === 'theme' && (
              <ThemeTab settings={settings} setSettings={setSettings} />
            )}
            
            {activeTab === 'splash' && (
              <SplashTab settings={settings} setSettings={setSettings} />
            )}
            
            {/* 固定富文本分頁 */}
            {['detailed_intro', 'process', 'payment', 'rules'].includes(activeTab) && (
              <RichTextTab 
                field={activeTab} 
                settings={settings} 
                setSettings={setSettings} 
                onSave={handleSave} 
              />
            )}
            
            {/* 動態富文本分頁 (自定義區塊) */}
            {activeTab.startsWith('custom_') && !activeTab.includes('manage') && (
              <RichTextTab 
                isCustom 
                customIndex={parseInt(activeTab.split('_')[1])} 
                settings={settings} 
                setSettings={setSettings} 
                onSave={handleSave}
              />
            )}

            {activeTab === 'custom_manage' && (
              <CustomSectionsTab settings={settings} setSettings={setSettings} />
            )}
            
            {activeTab === 'showcase' && <ShowcaseTab />}
            
            {activeTab === 'portfolio' && (
              <PortfolioTab formData={formData} settings={settings} setSettings={setSettings} />
            )}
            
            {activeTab === 'subscription' && (
              <SubscriptionTab quotaInfo={quotaInfo} fetchUserData={fetchUserData} />
            )}
          </div>

          {/* 底部固定儲存按鈕列 */}
          <div className="save-action-bar">
            {message && (
              <span className={`save-msg ${message.includes('失敗') ? 'err' : 'ok'}`}>
                {message}
              </span>
            )}
            <button onClick={handleSave} disabled={isSaving} className="main-save-btn">
              {isSaving ? '儲存中...' : '儲存所有變更'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}