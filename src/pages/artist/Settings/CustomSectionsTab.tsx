// src/pages/artist/Settings/CustomSectionsTab.tsx
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import type { CompleteSettings } from '../Settings'; // 匯入完整的 Settings 型別

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

interface Props {
  settings: CompleteSettings;
  setSettings: React.Dispatch<React.SetStateAction<CompleteSettings>>;
}

export function CustomSectionsTab({ settings, setSettings }: Props) {
  
  // ============ 自訂區塊處理 ============
  const handleAddCustomSection = () => {
    if (settings.custom_sections.length >= 5) return; // 🌟 擴充上限為 5 個
    setSettings(prev => ({ 
      ...prev, 
      custom_sections: [...prev.custom_sections, { id: `custom_${Date.now()}`, title: '', content: '' }] 
    }));
  };

  const handleUpdateCustomSection = (id: string, field: 'title' | 'content', value: string) => {
    setSettings(prev => ({ 
      ...prev, 
      custom_sections: prev.custom_sections.map(sec => sec.id === id ? { ...sec, [field]: value } : sec) 
    }));
  };

  const handleRemoveCustomSection = (id: string) => {
    setSettings(prev => ({ 
      ...prev, 
      custom_sections: prev.custom_sections.filter(sec => sec.id !== id) 
    }));
  };

  // ============ 排序邏輯處理 ============
  const allPossibleTabs = [
    { id: 'portfolio', label: '作品展示' },
    { id: 'detailed_intro', label: '詳細介紹' },
    { id: 'showcase', label: '徵稿/販售項目' },
    { id: 'queue', label: '排單狀況' },
    ...settings.custom_sections.map((sec) => ({ id: sec.id, label: sec.title || '未命名自訂區塊' }))
  ];

  const currentOrder = settings.tab_order || [];
  
  // 清理無效的 ID，並補上新的 Tab ID
  const activeOrder = currentOrder.filter(id => allPossibleTabs.some(t => t.id === id));
  allPossibleTabs.forEach(t => {
    if (!activeOrder.includes(t.id)) activeOrder.push(t.id);
  });

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...activeOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setSettings({ ...settings, tab_order: newOrder });
  };

  const moveDown = (index: number) => {
    if (index === activeOrder.length - 1) return;
    const newOrder = [...activeOrder];
    [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    setSettings({ ...settings, tab_order: newOrder });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* 🌟 排序設定區塊 */}
      <div style={{ backgroundColor: '#FAFAFA', padding: '24px', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
        <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#5D4A3E', fontSize: '18px' }}>公開分頁顯示順序</h3>
        <p style={{ color: '#7A7269', fontSize: '13px', marginBottom: '20px' }}>
          使用右側按鈕調整公開頁面中各分頁的顯示排序。未啟用的功能將自動被隱藏。
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeOrder.map((id, idx) => {
            const tabInfo = allPossibleTabs.find(t => t.id === id);
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#FFFFFF', border: '1px solid #DED9D3', borderRadius: '8px' }}>
                <span style={{ fontWeight: 'bold', color: '#5D4A3E' }}>
                  {idx + 1}. {tabInfo?.label}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => moveUp(idx)} 
                    disabled={idx === 0}
                    style={{ padding: '6px 12px', cursor: idx === 0 ? 'not-allowed' : 'pointer', background: idx === 0 ? '#F4F0EB' : '#5D4A3E', color: idx === 0 ? '#A0978D' : '#FFF', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}
                  >
                    ↑ 上移
                  </button>
                  <button 
                    onClick={() => moveDown(idx)} 
                    disabled={idx === activeOrder.length - 1}
                    style={{ padding: '6px 12px', cursor: idx === activeOrder.length - 1 ? 'not-allowed' : 'pointer', background: idx === activeOrder.length - 1 ? '#F4F0EB' : '#5D4A3E', color: idx === activeOrder.length - 1 ? '#A0978D' : '#FFF', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}
                  >
                    ↓ 下移
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <hr style={{ borderTop: '1px dashed #DED9D3', borderBottom: 'none' }} />

      {/* 🌟 自訂區塊設定區塊 */}
      <h3 style={{ margin: '0 0 -16px 0', color: '#5D4A3E', fontSize: '18px' }}>自訂分頁管理</h3>
      
      {settings.custom_sections.map(sec => (
        <div key={sec.id} style={{ padding: '24px', border: '1px solid #EAE6E1', borderRadius: '16px', backgroundColor: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            className="form-input" 
            value={sec.title} 
            onChange={e => handleUpdateCustomSection(sec.id, 'title', e.target.value)} 
            placeholder="輸入自訂區塊大標題 (例如：委託流程、付款方式)" 
            style={{ fontWeight: 'bold', fontSize: '16px' }} 
          />
          <div className="custom-quill-wrapper">
            <ReactQuill 
              theme="snow" 
              value={sec.content} 
              onChange={v => handleUpdateCustomSection(sec.id, 'content', v)} 
              modules={customQuillModules} 
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={() => handleRemoveCustomSection(sec.id)} 
              style={{ color: '#A05C5C', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', padding: '8px 16px', borderRadius: '8px', transition: 'background 0.2s' }}
            >
              刪除此區塊
            </button>
          </div>
        </div>
      ))}
      
      {settings.custom_sections.length < 5 && (
        <button 
          onClick={handleAddCustomSection} 
          style={{ padding: '16px', border: '2px dashed #DED9D3', background: '#FFFFFF', color: '#7A7269', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', fontSize: '15px' }}
        >
          + 新增自訂區塊 (目前 {settings.custom_sections.length} / 5 個)
        </button>
      )}
    </div>
  );
}