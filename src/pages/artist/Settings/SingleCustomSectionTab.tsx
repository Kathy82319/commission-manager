// src/pages/artist/Settings/SingleCustomSectionTab.tsx
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import type { CompleteSettings } from '../Settings';

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
  sectionId: string;
  settings: CompleteSettings;
  setSettings: React.Dispatch<React.SetStateAction<CompleteSettings>>;
  onDelete: () => void;
}

export function SingleCustomSectionTab({ sectionId, settings, setSettings, onDelete }: Props) {
  const section = settings.custom_sections.find(s => s.id === sectionId);
  if (!section) return null;

  const updateSection = (field: 'title' | 'content', value: string) => {
    setSettings(prev => ({ 
      ...prev, 
      custom_sections: prev.custom_sections.map(sec => sec.id === sectionId ? { ...sec, [field]: value } : sec) 
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input 
          className="form-input" 
          value={section.title} 
          onChange={e => updateSection('title', e.target.value)} 
          placeholder="請輸入分頁標題 (例如：委託流程、付款方式)" 
          style={{ fontWeight: 'bold', fontSize: '18px', width: '60%' }} 
        />
        <button 
          onClick={onDelete} 
          style={{ color: '#A05C5C', border: '1px solid #A05C5C', background: 'transparent', cursor: 'pointer', fontWeight: 'bold', padding: '8px 16px', borderRadius: '8px', transition: 'all 0.2s' }}
        >
          刪除此分頁
        </button>
      </div>

      <div className="custom-quill-wrapper">
        <ReactQuill 
          theme="snow" 
          value={section.content} 
          onChange={v => updateSection('content', v)} 
          modules={customQuillModules} 
        />
      </div>
    </div>
  );
}