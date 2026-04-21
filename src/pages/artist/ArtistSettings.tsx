import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ChevronRight, User, Palette, FileText, creditCard } from 'lucide-react';
import './styles/ArtistSettings.css';

// 定義資料型別
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
  display_name: string;
  bio: string;
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

export function ArtistSettings() {
  // 1. 中央狀態管理：所有分頁共享這一份 tempSettings
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [activeTab, setActiveTab] = useState('personal-info');
  const [isSaving, setIsSaving] = useState(false);

  // 初始化讀取資料
  useEffect(() => {
    const fetchSettings = async () => {
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
        console.error("無法讀取設定", error);
      }
    };
    fetchSettings();
  }, []);

  // 統一修改 Function
  const updateValue = (key: keyof ProfileSettings, value: any) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  // 處理自定義區塊的新增
  const addCustomSection = () => {
    const newId = `custom_${Date.now()}`;
    const newSection: CustomSection = { id: newId, title: '新自定義區塊', content: '' };
    const updatedSections = [...(settings?.custom_sections || []), newSection];
    updateValue('custom_sections', updatedSections);
    setActiveTab(newId); // 新增後直接跳轉至該子分頁
  };

  // 儲存所有變更
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
      if (data.success) {
        alert('所有變更已儲存成功');
      }
    } catch (error) {
      alert('儲存失敗，請檢查網路連線');
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) return <div className="loading">載入中...</div>;

  return (
    <div className="settings-layout">
      {/* 左側導航欄 */}
      <aside className="settings-sidebar">
        <div className="sidebar-header">
          <h2>後台設定</h2>
        </div>
        
        <nav className="sidebar-menu">
          {/* 分類一 */}
          <div className="menu-group">
            <div className="group-label"><User size={16}/> 個人資訊</div>
            <button className={`menu-item ${activeTab === 'personal-info' ? 'active' : ''}`} onClick={() => setActiveTab('personal-info')}>基本資料</button>
            <button className={`menu-item ${activeTab === 'social-links' ? 'active' : ''}`} onClick={() => setActiveTab('social-links')}>社群連結</button>
          </div>

          {/* 分類二 */}
          <div className="menu-group">
            <div className="group-label"><Palette size={16}/> 頁面外觀</div>
            <button className={`menu-item ${activeTab === 'appearance-bg' ? 'active' : ''}`} onClick={() => setActiveTab('appearance-bg')}>背景底色與漸層</button>
            <button className={`menu-item ${activeTab === 'appearance-splash' ? 'active' : ''}`} onClick={() => setActiveTab('appearance-splash')}>開場動畫</button>
          </div>

          {/* 分類三 */}
          <div className="menu-group">
            <div className="group-label"><FileText size={16}/> 內容管理</div>
            <button className={`menu-item ${activeTab === 'portfolio' ? 'active' : ''}`} onClick={() => setActiveTab('portfolio')}>作品集管理</button>
            <button className={`menu-item ${activeTab === 'detailed_intro' ? 'active' : ''}`} onClick={() => setActiveTab('detailed_intro')}>詳細介紹</button>
            <button className={`menu-item ${activeTab === 'process' ? 'active' : ''}`} onClick={() => setActiveTab('process')}>委託流程</button>
            <button className={`menu-item ${activeTab === 'payment' ? 'active' : ''}`} onClick={() => setActiveTab('payment')}>付款方式</button>
            <button className={`menu-item ${activeTab === 'rules' ? 'active' : ''}`} onClick={() => setActiveTab('rules')}>委託規範範本</button>
            
            {/* 動態生成的自定義子分類 */}
            {settings.custom_sections.map(section => (
              <button 
                key={section.id} 
                className={`menu-item custom-tab ${activeTab === section.id ? 'active' : ''}`} 
                onClick={() => setActiveTab(section.id)}
              >
                {section.title}
              </button>
            ))}
            
            <button className="add-section-btn" onClick={addCustomSection}>
              <Plus size={14}/> 新增子分類
            </button>
          </div>

          {/* 分類四 */}
          <div className="menu-group">
            <div className="group-label"><creditCard size={16}/> 訂閱方案</div>
            <button className={`menu-item ${activeTab === 'subscription' ? 'active' : ''}`} onClick={() => setActiveTab('subscription')}>目前方案</button>
          </div>
        </nav>
      </aside>

      {/* 右側內容區 */}
      <main className="settings-main">
        <div className="content-container">
          {activeTab === 'personal-info' && (
            <div className="tab-pane">
              <h3>基本資料</h3>
              <div className="input-field">
                <label>藝師暱稱</label>
                <input type="text" value={settings.display_name} onChange={(e) => updateValue('display_name', e.target.value)} />
              </div>
              <div className="input-field">
                <label>個人簡介</label>
                <textarea rows={6} value={settings.bio} onChange={(e) => updateValue('bio', e.target.value)} placeholder="支援換行，請直接輸入..." />
              </div>
            </div>
          )}

          {activeTab === 'appearance-bg' && (
            <div className="tab-pane">
              <h3>背景底色與漸層</h3>
              <div className="input-field">
                <label>主要背景顏色</label>
                <input type="color" value={settings.background_color} onChange={(e) => updateValue('background_color', e.target.value)} />
              </div>
              <div className="input-field">
                <label>漸層方向</label>
                <select value={settings.gradient_direction} onChange={(e) => updateValue('gradient_direction', e.target.value)}>
                  <option value="to bottom right">對角線 (左上到右下)</option>
                  <option value="to right">由左至右</option>
                  <option value="to bottom">由上至下</option>
                </select>
              </div>
            </div>
          )}

          {/* 自定義區塊的編輯頁面 */}
          {settings.custom_sections.map(section => activeTab === section.id && (
            <div className="tab-pane" key={section.id}>
              <div className="tab-header-flex">
                <h3>編輯：{section.title}</h3>
                <button className="delete-btn" onClick={() => {
                  if(confirm('確定要刪除此分類嗎？')) {
                    const filtered = settings.custom_sections.filter(s => s.id !== section.id);
                    updateValue('custom_sections', filtered);
                    setActiveTab('portfolio');
                  }
                }}>刪除分類</button>
              </div>
              <div className="input-field">
                <label>分類標題</label>
                <input 
                  type="text" 
                  value={section.title} 
                  onChange={(e) => {
                    const updated = settings.custom_sections.map(s => s.id === section.id ? { ...s, title: e.target.value } : s);
                    updateValue('custom_sections', updated);
                  }} 
                />
              </div>
              <div className="input-field">
                <label>內容</label>
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

          {/* 其他 Tab 依此類推... */}
        </div>

        {/* 底部全域儲存欄 */}
        <div className="settings-footer">
          <p className="footer-hint">所有分頁的改動將在儲存後一併生效</p>
          <button className="save-all-btn" onClick={handleSaveAll} disabled={isSaving}>
            <Save size={18}/> {isSaving ? '儲存中...' : '儲存所有變更'}
          </button>
        </div>
      </main>
    </div>
  );
}