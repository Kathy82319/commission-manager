// src/pages/artist/Settings/SingleCustomSectionTab.tsx
import { useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Pencil } from 'lucide-react';
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
  onSaveNow?: () => void;
}

export function SingleCustomSectionTab({ sectionId, settings, setSettings, onDelete, onSaveNow }: Props) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const section = settings.custom_sections.find(s => s.id === sectionId);
  if (!section) return null;

  const updateSection = (field: 'title' | 'content', value: string) => {
    setSettings(prev => ({
      ...prev,
      custom_sections: prev.custom_sections.map(sec => sec.id === sectionId ? { ...sec, [field]: value } : sec)
    }));
  };

  const finishEditingTitle = () => {
    setIsEditingTitle(false);
    onSaveNow?.();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {isEditingTitle ? (
          <input
            autoFocus
            className="form-input"
            value={section.title}
            onChange={e => updateSection('title', e.target.value)}
            onBlur={finishEditingTitle}
            onKeyDown={e => { if (e.key === 'Enter') finishEditingTitle(); }}
            placeholder="請輸入分頁標題 (例如：委託流程、付款方式)"
            style={{ fontWeight: 'bold', fontSize: '18px', width: '60%' }}
          />
        ) : (
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', color: '#5D4A3E' }}>
            {section.title || '未命名分頁'}
            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              title="重新命名"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: '#A0978D' }}
            >
              <Pencil size={14} />
            </button>
          </h3>
        )}
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