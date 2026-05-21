// src/pages/client/ClientSettings.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { BasicInfoTab } from '../artist/Settings/BasicInfoTab';
import { RichTextTab } from '../artist/Settings/RichTextTab';
import { OCDisplaySettingsTab } from '../artist/Settings/OCDisplaySettingsTab';
import { NotificationSettingsTab } from '../artist/Settings/NotificationSettingsTab';
import type { FormDataState } from '../artist/Settings/types';
import '../../styles/Settings.css'; 

export function ClientSettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile_basic');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState<FormDataState>({ display_name: '', avatar_url: '', bio: '' });
  
  const [notifyConfig, setNotifyConfig] = useState<any>({
    notification_email: '',
    email_art_chat: 1, email_art_progress: 1, email_art_inbound: 1,
    email_cli_chat: 1, email_cli_progress: 1, email_cli_bulletin: 1
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'ok' | 'err' } | null>(null);
  const [publicId, setPublicId] = useState<string>('');

  const [settings, setSettings] = useState<any>({
    social_links: [],
    detailed_intro: '',
    custom_sections: [],
    hidden_sections: [],
    theme_mode: 'dark',
    background_color: '#021122',
    gradient_enabled: true,            
    gradient_direction: 'to bottom' 
  });

  const menuItems = [
    { id: 'profile_basic', label: '頭像與基礎資料' },
    { id: 'notification_settings', label: '通知與信箱設定' },
    { id: 'oc_display', label: '角色設定卡展示' },
    { id: 'detailed_intro', label: '自訂公開詳細介紹' }
  ];

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchUserData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.role === 'artist' || data.data.role === 'admin') {
          if (window.confirm("偵測到您的繪師身分，若要編輯個人頁請至功能較健全的繪師個人設定編輯，是否現在跳轉？")) {
            navigate('/artist/settings');
            return; 
          }
        }
        setPublicId(data.data.public_id || data.data.id || '');
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
          const parsed = typeof data.data.profile_settings === 'string' ? JSON.parse(data.data.profile_settings) : data.data.profile_settings;
          setSettings((prev: any) => ({ ...prev, ...parsed, social_links: parsed.social_links || [], detailed_intro: parsed.detailed_intro || '' }));
        }
      }
    } catch (error) { console.error("讀取設定失敗", error); } finally { setIsLoading(false); }
  }, [API_BASE, navigate]);

  useEffect(() => { fetchUserData(); }, [fetchUserData]);

  const handleSave = async () => {
    setIsSaving(true); 
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: formData.display_name, avatar_url: formData.avatar_url, bio: formData.bio, profile_settings: JSON.stringify(settings), ...notifyConfig })
      });
      const data = await res.json();
      if (data.success) showToast('設定已成功儲存', 'ok'); else showToast(data.error || '儲存失敗', 'err');
    } catch (error) { showToast('系統發生錯誤', 'err'); } finally { setIsSaving(false); }
  };

  const handleUpgradeClick = async () => {
    if (window.confirm("開通後將解鎖作品集、排單表等功能，確定要免費開通創作者身分嗎？")) {
      try {
        const res = await fetch(`${API_BASE}/api/users/me/upgrade`, { method: 'POST', credentials: 'include' });
        const data = await res.json();
        if (data.success) { localStorage.setItem('user_role', 'artist'); alert("開通成功！"); window.location.href = '/artist/settings'; }
        else alert(data.error || '升級失敗');
      } catch (err) { alert('網路異常'); }
    }
  };

  if (isLoading) return <div className="loading-screen" style={{ padding: '40px', textAlign: 'center' }}>載入設定中...</div>;

  return (
    <div className="settings-page">
      {toast && (
        <div className={`toast-message ${toast.type === 'err' ? 'error' : 'success'}`}>
          <div className="toast-content">{toast.msg}</div>
        </div>
      )}
      
      <div className="settings-layout">
        <div className="settings-mobile-nav">
          <button className="mobile-nav-trigger" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <span>目前查看：{menuItems.find(i => i.id === activeTab)?.label}</span>
            <span style={{ transform: isMobileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
          </button>
          <div className={`mobile-nav-dropdown ${isMobileMenuOpen ? 'open' : ''}`}>
            {menuItems.map(item => (
              <button key={item.id} className={`tab-btn ${activeTab === item.id ? 'active' : ''}`} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}>{item.label}</button>
            ))}
          </div>
        </div>

        <aside className="settings-sidebar">
          <div className="sidebar-title">帳號設定</div>
          <div className="sidebar-group">
            {menuItems.map(item => (
              <button key={item.id} className={`tab-btn ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>{item.label}</button>
            ))}
          </div>
          <div className="upgrade-card-container">
            <div className="upgrade-card">
              <h4 className="upgrade-card-title">想開始接案賺錢嗎？</h4>
              <p className="upgrade-card-desc">一鍵開通創作者身分，免費解鎖排單表、專屬作品集與報價功能。</p>
              <button onClick={handleUpgradeClick} className="upgrade-card-btn">🚀 免費開通創作者</button>
            </div>
          </div>
        </aside>

        <div className="settings-content-area">
          <div className="settings-header">
            <h3>{menuItems.find(i => i.id === activeTab)?.label}</h3>
            {publicId && (
              <button onClick={() => window.open(`/${publicId}`, '_blank')} className="preview-profile-btn">
                <ExternalLink size={16} /><span>預覽個人頁</span>
              </button>
            )}
          </div>

          <div className="tab-body">
            {activeTab === 'profile_basic' && <BasicInfoTab formData={formData} setFormData={setFormData} settings={settings} setSettings={setSettings} />}
            {activeTab === 'notification_settings' && <NotificationSettingsTab config={notifyConfig} setConfig={setNotifyConfig} role="client" />}
            {activeTab === 'oc_display' && <OCDisplaySettingsTab onToast={showToast} />}
            {activeTab === 'detailed_intro' && (
              <>
                <p className="tab-instruction-text">在這裡輸入的內容，將會展示在您的個人公開頁面上。</p>
                <RichTextTab field="detailed_intro" settings={settings} setSettings={setSettings} />
              </>
            )}
          </div>

          {activeTab !== 'oc_display' && (
            <div className="save-action-bar">
              <button onClick={handleSave} disabled={isSaving} className="main-save-btn">
                {isSaving ? '儲存中...' : '儲存所有變更'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}