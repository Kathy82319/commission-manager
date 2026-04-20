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
  field: string;
  settings: ProfileSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProfileSettings>>;
}

export function RichTextTab({ field, settings, setSettings }: Props) {
  return (
    <div className="custom-quill-wrapper">
      <ReactQuill 
        theme="snow" 
        value={settings[field as keyof ProfileSettings] as string} 
        onChange={v => setSettings({ ...settings, [field]: v })} 
        modules={customQuillModules} 
      />
    </div>
  );
}