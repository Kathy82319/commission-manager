// src/pages/client/ClientSettings.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react'; // 🌟 引入預覽按鈕使用的圖示
import { BasicInfoTab } from '../artist/Settings/BasicInfoTab';
import { RichTextTab } from '../artist/Settings/RichTextTab';
import type { FormDataState } from '../artist/Settings/types';
import '../../styles/Settings.css'; // 完全共用繪師設定頁的 CSS

export function ClientSettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile_basic');
  const [formData, setFormData] = useState<FormDataState>({ display_name: '', avatar_url: '', bio: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'ok' | 'err' } | null>(null);
  const [publicId, setPublicId] = useState<string>(''); // 🌟 新增：儲存使用者的 public_id

  // 委託人只需要最基礎的 settings 結構
  const [settings, setSettings] = useState<any>({
    social_links: [],
    detailed_intro: '',
    custom_sections: [],
    hidden_sections: [],
    theme_mode: 'dark', // 預設給個深色模式
    background_color: '#021122'
  });

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

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
        // 如果發現是繪師，強制導流回繪師設定頁！
        if (data.data.role === 'artist' || data.data.role === 'admin') {
          navigate('/artist/settings');
          return;
        }

        // 🌟 儲存 public_id 以供預覽連結使用
        setPublicId(data.data.public_id || data.data.id || '');

        setFormData({
          display_name: data.data.display_name || '',
          avatar_url: data.data.avatar_url || '',
          bio: data.data.bio || '',
        });

        if (data.data.profile_settings) {
          const parsed = typeof data.data.profile_settings === 'string' 
            ? JSON.parse(data.data.profile_settings) 
            : data.data.profile_settings;
          
          setSettings((prev: any) => ({ 
            ...prev, 
            ...parsed,
            social_links: parsed.social_links || [],
            detailed_intro: parsed.detailed_intro || ''
          }));
        }
      }
    } catch (error) {
      console.error("讀取設定失敗", error);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE, navigate]);

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
        showToast('個人資料已成功儲存', 'ok');
      } else {
        showToast(data.error || '儲存失敗', 'err');
      }
    } catch (error) {
      showToast('系統發生錯誤', 'err');
    } finally {
      setIsSaving(false); 
    }
  };

  const handleUpgradeClick = async () => {
    if (window.confirm("開通後將解鎖作品集、排單表等功能，確定要免費開通創作者身分嗎？")) {
      try {
        const res = await fetch(`${API_BASE}/api/users/me/upgrade`, {
          method: 'POST',
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('user_role', 'artist');
          alert("開通成功！歡迎來到創作者後台。");
          window.location.href = '/artist/settings'; // 導向繪師設定頁繼續完成設定
        } else {
          alert(data.error || '升級失敗，請稍後再試。');
        }
      } catch (err) {
        alert('網路異常，無法完成升級。');
      }
    }
  };

  if (isLoading) return <div className="loading-screen" style={{ padding: '40px', textAlign: 'center' }}>載入設定中...</div>;

  return (
    <div className="settings-page">
      {toast && (
        <div className={`toast-message ${toast.type === 'err' ? 'error' : 'success'}`}>
          <div className="toast-icon">{toast.type === 'err' ? '[錯誤]' : '[成功]'}</div>
          <div className="toast-content">{toast.msg}</div>
        </div>
      )}
      
      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="sidebar-title">帳號設定</div>
          
          <div className="sidebar-group">
            <div className="group-label">個人資訊</div>
            <button 
              className={`tab-btn ${activeTab === 'profile_basic' ? 'active' : ''}`} 
              onClick={() => setActiveTab('profile_basic')}
            >
              頭像與基礎資料
            </button>
            <button 
              className={`tab-btn ${activeTab === 'detailed_intro' ? 'active' : ''}`} 
              onClick={() => setActiveTab('detailed_intro')}
            >
              自訂公開詳細介紹
            </button>
          </div>

          {/* 🌟 低調的升級入口 */}
          <div className="sidebar-group" style={{ marginTop: 'auto', paddingTop: '40px' }}>
            <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#334155', fontSize: '14px' }}>想開始接案賺錢嗎？</h4>
              <p style={{ margin: '0 0 12px 0', color: '#64748B', fontSize: '12px', lineHeight: '1.5' }}>
                一鍵開通創作者身分，免費解鎖排單表、專屬作品集與報價功能。
              </p>
              <button 
                onClick={handleUpgradeClick}
                style={{
                  width: '100%', padding: '8px', borderRadius: '6px', border: 'none',
                  backgroundColor: '#3b82f6', color: '#fff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                🚀 免費開通創作者
              </button>
            </div>
          </div>
        </aside>

        <div className="settings-content-area">
          {/* 🌟 調整：加上 flex 佈局與預覽按鈕 */}
          <div className="settings-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>{activeTab === 'profile_basic' ? '頭像與基礎資料' : '自訂公開詳細介紹'}</h3>
            {publicId && (
              <button 
                onClick={() => window.open(`/${publicId}`, '_blank')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid #E2E8F0',
                  backgroundColor: '#FFF', color: '#475569', fontSize: '14px', 
                  fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFF'}
              >
                <ExternalLink size={16} />
                預覽個人頁
              </button>
            )}
          </div>

          <div className="tab-body">
            {activeTab === 'profile_basic' && (
              <BasicInfoTab 
                formData={formData} 
                setFormData={setFormData} 
                settings={settings as any} 
                setSettings={setSettings as any} 
              />
            )}
            
            {activeTab === 'detailed_intro' && (
              <>
                <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px' }}>
                  在這裡輸入的內容，將會展示在您的個人公開頁面上（若有開放的話）。您可以利用這裡寫下更詳細的自我介紹或委託偏好。
                </p>
                <RichTextTab 
                  field="detailed_intro" 
                  settings={settings as any} 
                  setSettings={setSettings as any} 
                />
              </>
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