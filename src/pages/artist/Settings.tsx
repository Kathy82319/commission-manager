// src/pages/artist/Settings.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FormDataState, CompleteSettings } from './Settings/types';
import { RichTextTab } from './Settings/RichTextTab';
import { BulletinSettingsTab } from './Settings/BulletinSettingsTab';
import { NotificationSettingsTab } from './Settings/NotificationSettingsTab';
import '../../styles/Settings.css';
import { useLocation } from 'react-router-dom';
import { confirmLeaveIfDirty, setUnsavedChanges } from '../../utils/unsavedChanges';

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
}

interface MenuCategory {
  title: string;
  items: MenuItem[];
}

export function Settings() {
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'notification_settings';
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

  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string, type: 'ok' | 'err' } | null>(null);

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
    showcase_label: '',
    portfolio_label: '',
    detailed_intro_label: '',
    queue_label: '',
    reviews_label: '',
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

  // 用「跟最後一次載入/儲存時的內容做比對」來判斷是否真的有未儲存變更，
  // 而不是「呼叫過 setSettings 就當作有變更」——後者太容易被無關的重新渲染誤判。
  const savedSnapshotRef = useRef('');

  useEffect(() => {
    if (isLoading) return;
    savedSnapshotRef.current = JSON.stringify({ settings, formData, notifyConfig });
    setUnsavedChanges(false);
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;
    setUnsavedChanges(JSON.stringify({ settings, formData, notifyConfig }) !== savedSnapshotRef.current);
  }, [settings, formData, notifyConfig, isLoading]);

  // 切換分頁不會清掉目前編輯到一半的內容，但還是要提醒使用者尚未儲存
  const switchTab = (tabId: string) => {
    if (!confirmLeaveIfDirty()) return;
    setActiveTab(tabId);
  };

  const menuGroups: MenuCategory[] = [
    {
      title: '個人資訊',
      items: [
        { id: 'notification_settings', label: '通知與信箱設定' },
      ]
    },
    { title: '其他管理', items: [
        { id: 'rules', label: '委託協議書範本' },
        { id: 'bulletin_settings', label: '許願池投遞履歷管理' },
    ]},
  ];

  const currentActiveLabel = useMemo(() => {
    for (const group of menuGroups) {
      const found = group.items.find(item => item.id === activeTab);
      if (found) return found.label;
    }
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
        savedSnapshotRef.current = JSON.stringify({ settings, formData, notifyConfig });
        setUnsavedChanges(false);
      } else {
        showToast(data.error || '儲存失敗', 'err');
      }
    } catch (error) {
      showToast('系統發生錯誤', 'err');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="loading-screen" style={{ padding: '40px', textAlign: 'center' }}>載入設定中...</div>;

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
                <div className="group-label">{group.title}</div>

                {group.items.map((item: MenuItem) => (
                  <button
                    key={item.id}
                    className={`tab-btn ${activeTab === item.id ? 'active' : ''}`}
                    onClick={() => { switchTab(item.id); setIsMobileMenuOpen(false); }}
                  >
                    {item.label}
                    {item.id === 'notification_settings' && !notifyConfig.notification_email && (
                      <span style={{ color: '#E8A000', marginLeft: '4px', fontSize: '13px' }}>★ 記得填寫email</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        <aside className="settings-sidebar">
          <div className="sidebar-title">個人設定</div>
          {menuGroups.map(group => (
            <div key={group.title} className="sidebar-group">
              <div className="group-label">{group.title}</div>

              {group.items.map((item: MenuItem) => (
                <button
                  key={item.id}
                  className={`tab-btn ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => switchTab(item.id)}
                >
                  {item.label}
                  {item.id === 'notification_settings' && !notifyConfig.notification_email && (
                    <span style={{ color: '#E8A000', marginLeft: '4px', fontSize: '13px' }} title="尚未設定通知信箱">★</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <div className="settings-content-area">
          <div className="tab-body">
            {activeTab === 'notification_settings' && <NotificationSettingsTab config={notifyConfig} setConfig={setNotifyConfig} role="artist" />}
            {activeTab === 'bulletin_settings' && <BulletinSettingsTab settings={settings as any} setSettings={setSettings as any} />}

            {activeTab === 'rules' && (
              <RichTextTab key={activeTab} field={activeTab as any} settings={settings as any} setSettings={setSettings as any} />
            )}
          </div>

          <div className="save-action-bar">
            <button onClick={handleSave} disabled={isSaving} className="main-save-btn">
              {isSaving ? '儲存中...' : '儲存所有變更'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
