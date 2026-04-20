// src/pages/artist/Settings/ThemeTab.tsx
import { ProfileSettings } from './types';

interface Props {
  settings: ProfileSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProfileSettings>>;
}

export function ThemeTab({ settings, setSettings }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 移除原本的「選擇版面配置模式」區塊 */}

      <div style={{ backgroundColor: '#FAFAFA', padding: '24px', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
        <label className="form-label">自訂背景主色</label>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <input 
            type="color" 
            value={settings.background_color || '#F4F0EB'} 
            onChange={e => setSettings({...settings, background_color: e.target.value})}
            style={{ width: '50px', height: '50px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          />
          <input 
            className="form-input" 
            value={settings.background_color || '#F4F0EB'} 
            onChange={e => setSettings({...settings, background_color: e.target.value})}
            placeholder="#HEXCODE"
            style={{ width: '120px' }}
          />
        </div>
      </div>

      <div style={{ backgroundColor: '#FAFAFA', padding: '24px', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
        <label className="form-label">介面文字對比模式</label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setSettings({...settings, theme_mode: 'light'})}
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: settings.theme_mode === 'light' ? '2px solid #5D4A3E' : '1px solid #DED9D3', background: '#FFF', color: '#333', fontWeight: 'bold', cursor: 'pointer' }}
          >
            深色文字 (適合淺色背景)
          </button>
          <button 
            onClick={() => setSettings({...settings, theme_mode: 'dark'})}
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: settings.theme_mode === 'dark' ? '2px solid #A67B3E' : '1px solid #DED9D3', background: '#333', color: '#FFF', fontWeight: 'bold', cursor: 'pointer' }}
          >
            淺色文字 (適合深色背景)
          </button>
        </div>
      </div>

      <div style={{ padding: '24px', borderRadius: '12px', background: `linear-gradient(135deg, ${settings.background_color || '#F4F0EB'}, #00000015)`, color: settings.theme_mode === 'dark' ? '#FFF' : '#333', border: '1px solid #EAE6E1', textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>
        🎨 漸層背景預覽區塊
      </div>
    </div>
  );
}