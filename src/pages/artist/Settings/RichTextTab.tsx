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
  // 可能是固定欄位名稱，也可能是自定義區塊
  field?: string; 
  isCustom?: boolean;
  customIndex?: number;
  settings: ProfileSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProfileSettings>>;
  onSave?: () => Promise<void>; // 接收來自父組件的儲存函式
}

export function RichTextTab({ field, isCustom, customIndex, settings, setSettings }: Props) {
  
  // 決定目前編輯的內容值
  const getValue = () => {
    if (isCustom && customIndex !== undefined) {
      return settings.custom_sections[customIndex]?.content || '';
    }
    if (field) {
      return (settings[field as keyof ProfileSettings] as string) || '';
    }
    return '';
  };

  // 處理內容變動
  const handleChange = (value: string) => {
    if (isCustom && customIndex !== undefined) {
      // 複製一份新的自定義區塊陣列
      const newSections = [...settings.custom_sections];
      if (newSections[customIndex]) {
        newSections[customIndex] = { ...newSections[customIndex], content: value };
        setSettings({ ...settings, custom_sections: newSections });
      }
    } else if (field) {
      setSettings({ ...settings, [field]: value });
    }
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