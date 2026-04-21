// 修正點：加上 type 關鍵字，並確保路徑指向包含介面定義的 Settings.tsx
import type { ProfileSettings } from './Settings';

interface Props {
  settings: ProfileSettings;
  // 使用 keyof 確保修改的欄位名稱在 ProfileSettings 定義中是存在的
  updateValue: (key: keyof ProfileSettings, value: any) => void;
}

export function ArtistSettings({ settings, updateValue }: Props) {
  return (
    <div className="edit-pane">
      <h3>基本資料</h3>
      
      <div className="field-row">
        <label>藝師暱稱</label>
        <input 
          type="text" 
          value={settings.display_name} 
          onChange={(e) => updateValue('display_name', e.target.value)} 
          placeholder="請輸入顯示名稱"
        />
      </div>

      <div className="field-row">
        <label>個人簡介 (支援斷句)</label>
        <textarea 
          rows={6} 
          value={settings.bio} 
          onChange={(e) => updateValue('bio', e.target.value)} 
          placeholder="介紹一下你自己吧..."
        />
      </div>

      <div className="field-row">
        <label>大頭貼網址</label>
        <input 
          type="text" 
          value={settings.avatar_url} 
          onChange={(e) => updateValue('avatar_url', e.target.value)} 
          placeholder="https://..."
        />
      </div>

      {/* 你可以視需求在這裡增加更多屬於「個人資訊」分類的欄位 */}
    </div>
  );
}