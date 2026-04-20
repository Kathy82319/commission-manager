import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import type { ProfileSettings } from '../Settings/types';

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
  settings: ProfileSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProfileSettings>>;
}

export function CustomSectionsTab({ settings, setSettings }: Props) {
  const handleAddCustomSection = () => {
    if (settings.custom_sections.length >= 3) return;
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {settings.custom_sections.map(sec => (
        <div key={sec.id} style={{ padding: '24px', border: '1px solid #EAE6E1', borderRadius: '16px', backgroundColor: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            className="form-input" 
            value={sec.title} 
            onChange={e => handleUpdateCustomSection(sec.id, 'title', e.target.value)} 
            placeholder="輸入自訂區塊大標題..." 
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
      
      {settings.custom_sections.length < 3 && (
        <button 
          onClick={handleAddCustomSection} 
          style={{ padding: '16px', border: '2px dashed #DED9D3', background: '#FFFFFF', color: '#7A7269', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', fontSize: '15px' }}
        >
          + 新增自訂區塊 (最多 3 個)
        </button>
      )}
    </div>
  );
}