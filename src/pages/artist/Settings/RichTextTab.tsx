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
  field?: string; 
  isCustom?: boolean;
  customIndex?: number;
  settings: ProfileSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProfileSettings>>;
  onSave?: () => Promise<void>; 
}

export function RichTextTab({ field, isCustom, customIndex, settings, setSettings }: Props) {
  
  const getValue = () => {
    if (isCustom && customIndex !== undefined) {
      return settings.custom_sections?.[customIndex]?.content || '';
    }
    if (field) {
      return (settings[field as keyof ProfileSettings] as string) || '';
    }
    return '';
  };

  const handleChange = (value: string) => {
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
    <div className="custom-quill-wrapper">
      <ReactQuill 
        theme="snow" 
        value={getValue()} 
        onChange={handleChange} 
        modules={customQuillModules} 
      />
    </div>
  );
}