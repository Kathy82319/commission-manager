import { useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Undo2, Redo2 } from 'lucide-react';
import type { ProfileSettings } from '../Settings/types';
import { QUILL_MODULES } from './quillConfig';

interface Props {
  field?: string; 
  isCustom?: boolean;
  customIndex?: number;
  settings: ProfileSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProfileSettings>>;
  onSave?: () => Promise<void>; 
}

export function RichTextTab({ field, isCustom, customIndex, settings, setSettings }: Props) {
  const quillRef = useRef<ReactQuill | null>(null);

  const getValue = () => {
    if (isCustom && customIndex !== undefined) {
      return settings.custom_sections?.[customIndex]?.content || '';
    }
    if (field) {
      return (settings[field as keyof ProfileSettings] as string) || '';
    }
    return '';
  };

  const handleChange = (value: string, _delta: unknown, source: string) => {
    if (source !== 'user') return;
    setSettings(prev => {
      if (isCustom && customIndex !== undefined) {
        const newSections = [...(prev.custom_sections || [])];
        if (newSections[customIndex]) {
          newSections[customIndex] = { ...newSections[customIndex], content: value };
          return { ...prev, custom_sections: newSections };
        }
      } else if (field) {
        return { ...prev, [field]: value };
      }
      return prev;
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        <button
          type="button"
          title="復原 (Ctrl+Z)"
          onClick={() => quillRef.current?.getEditor().history.undo()}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #DED9D3', background: '#FFFFFF', color: '#7A7269', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
        >
          <Undo2 size={12} /> 復原
        </button>
        <button
          type="button"
          title="下一步 (Ctrl+Shift+Z)"
          onClick={() => quillRef.current?.getEditor().history.redo()}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #DED9D3', background: '#FFFFFF', color: '#7A7269', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
        >
          <Redo2 size={12} /> 下一步
        </button>
      </div>
      <div className="custom-quill-wrapper">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          defaultValue={getValue()}
          onChange={handleChange}
          modules={QUILL_MODULES}
        />
      </div>
    </div>
  );
}