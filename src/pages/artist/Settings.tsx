import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, User, Palette, FileText, CreditCard } from 'lucide-react';
import '../../styles/ArtistSettings.css';

// 1. 直接在這裡定義型別，解決 "沒有屬性" 或 "匯入錯誤" 的問題
interface CustomSection {
  id: string;
  title: string;
  content: string;
}

interface SocialLink {
  platform: string;
  url: string;
}

interface ProfileSettings {
  display_name: string;   // 確保這裡有 display_name
  bio: string;            // 確保這裡有 bio
  avatar_url: string;
  portfolio: string[];
  detailed_intro: string;
  process: string;
  payment: string;
  rules: string;
  custom_sections: CustomSection[];
  social_links: SocialLink[];
  splash_enabled: boolean;
  splash_text: string;
  splash_duration: number;
  background_color: string;
  theme_mode: 'light' | 'dark';
  gradient_direction: string;
}

export default function Settings() {
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [activeTab, setActiveTab] = useState('personal-info');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchAllSettings = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const res = await fetch(`${API_BASE}/api/artist/settings`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (data.success) {
          setSettings(data.data);
        }
      } catch (error) {
        console.error("無法讀取設定資料", error);
      }
    };
    fetchAllSettings();
  }, []);

  const updateValue = (key: keyof ProfileSettings, value: any) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  const addCustomSection = () => {
    const newId = `custom_${Date.now()}`;
    const newSection: CustomSection = { id: newId, title: '新自定義項目', content: '' };
    const updatedSections = [...(settings?.custom_sections || []), newSection];
    updateValue('custom_sections', updatedSections);
    setActiveTab(newId);
  };

  const handleSaveAll = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${API_BASE}/api/artist/settings`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) alert('所有分頁變更已儲存成功！');
    } catch (error) {
      alert('儲存失敗');
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) return <div className="loading">載入中...</div>;

  return (
    <div className="settings-layout">
      <aside className="settings-sidebar">
        <div className="sidebar-header">
          <h2>繪師後台設定</h2>
        </div>
        
        <nav className="sidebar-menu">
          <div className="menu-group">
            <div className="group-label"><User size={14}/> 個人資訊</div>
            <button className={`menu-item ${activeTab === 'personal-info' ? 'active' : ''}`} onClick={() => setActiveTab('personal-info')}>基本標籤與頭像</button>
            <button className={`menu-item ${activeTab === 'social-links' ? 'active' : ''}`} onClick={() => setActiveTab('social-links')}>社群連結管理</button>
          </div>

          <div className="menu-group">
            <div className="group-label"><Palette size={14}/> 頁面外觀</div>
            <button className={`menu-item ${activeTab === 'appearance-bg' ? 'active' : ''}`} onClick={() => setActiveTab('appearance-bg')}>背景底色與漸層</button>
            <button className={`menu-item ${activeTab === 'appearance-splash' ? 'active' : ''}`} onClick={() => setActiveTab('appearance-splash')}>開場動畫設定</button>
          </div>

          <div className="menu-group">
            <div className="group-label"><FileText size={14}/> 內容管理</div>
            <button className={`menu-item ${activeTab === 'portfolio' ? 'active' : ''}`} onClick={() => setActiveTab('portfolio')}>作品集管理</button>
            <button className={`menu-item ${activeTab === 'detailed_intro' ? 'active' : ''}`} onClick={() => setActiveTab('detailed_intro')}>詳細介紹</button>
            <button className={`menu-item ${activeTab === 'process' ? 'active' : ''}`} onClick={() => setActiveTab('process')}>委託流程</button>
            <button className={`menu-item ${activeTab === 'payment' ? 'active' : ''}`} onClick={() => setActiveTab('payment')}>付款方式</button>
            <button className={`menu-item ${activeTab === 'rules' ? 'active' : ''}`} onClick={() => setActiveTab('rules')}>委託規範範本</button>
            
            {settings.custom_sections.map(section => (
              <button 
                key={section.id} 
                className={`menu-item custom-sub-item ${activeTab === section.id ? 'active' : ''}`} 
                onClick={() => setActiveTab(section.id)}
              >
                {section.title}
              </button>
            ))}
            
            <button className="add-sub-btn" onClick={addCustomSection}>
              <Plus size={12}/> 新增自定義項目
            </button>
          </div>

          <div className="menu-group">
            {/* 修正：這裡的大小寫已經改為 CreditCard */}
            <div className="group-label"><CreditCard size={14}/> 帳戶與訂閱</div>
            <button className={`menu-item ${activeTab === 'subscription' ? 'active' : ''}`} onClick={() => setActiveTab('subscription')}>我的訂閱方案</button>
          </div>
        </nav>
      </aside>

      <main className="settings-main">
        <div className="settings-content-body">
          {activeTab === 'personal-info' && (
            <div className="edit-pane">
              <h3>基本資料</h3>
              <div className="field-row">
                <label>藝師顯示名稱</label>
                <input type="text" value={settings.display_name} onChange={(e) => updateValue('display_name', e.target.value)} />
              </div>
              <div className="field-row">
                <label>個人簡介</label>
                <textarea rows={6} value={settings.bio} onChange={(e) => updateValue('bio', e.target.value)} />
              </div>
            </div>
          )}

          {activeTab === 'appearance-bg' && (
            <div className="edit-pane">
              <h3>背景底色與漸層</h3>
              <div className="field-row">
                <label>頁面背景主色</label>
                <input type="color" value={settings.background_color} onChange={(e) => updateValue('background_color', e.target.value)} />
              </div>
              <div className="field-row">
                <label>漸層方向</label>
                <select value={settings.gradient_direction} onChange={(e) => updateValue('gradient_direction', e.target.value)}>
                  <option value="to bottom right">對角線 (左上到右下)</option>
                  <option value="to right">由左至右</option>
                  <option value="to bottom">由上至下</option>
                </select>
              </div>
            </div>
          )}

          {settings.custom_sections.map(section => activeTab === section.id && (
            <div className="edit-pane" key={section.id}>
              <div className="pane-header">
                <h3>編輯自定義項目：{section.title}</h3>
                <button className="text-danger-btn" onClick={() => {
                  if(window.confirm('確定刪除此子分類？')) {
                    const filtered = settings.custom_sections.filter(s => s.id !== section.id);
                    updateValue('custom_sections', filtered);
                    setActiveTab('personal-info');
                  }
                }}><Trash2 size={16}/> 刪除此項</button>
              </div>
              <div className="field-row">
                <label>子分類名稱 (會顯示在側邊欄)</label>
                <input 
                  type="text" 
                  value={section.title} 
                  onChange={(e) => {
                    const updated = settings.custom_sections.map(s => s.id === section.id ? { ...s, title: e.target.value } : s);
                    updateValue('custom_sections', updated);
                  }} 
                />
              </div>
              <div className="field-row">
                <label>內容詳情</label>
                <textarea 
                  rows={10} 
                  value={section.content} 
                  onChange={(e) => {
                    const updated = settings.custom_sections.map(s => s.id === section.id ? { ...s, content: e.target.value } : s);
                    updateValue('custom_sections', updated);
                  }} 
                />
              </div>
            </div>
          ))}
        </div>

        <footer className="settings-action-bar">
          <div className="info-text">提示：您可以切換不同分頁修改，最後再統一儲存。</div>
          <button className="save-all-trigger" onClick={handleSaveAll} disabled={isSaving}>
            <Save size={18}/> {isSaving ? '儲存中...' : '儲存所有變更'}
          </button>
        </footer>
      </main>
    </div>
  );
}