import type { ProfileSettings } from '../Settings/types';
// src/pages/artist/Settings/ThemeTab.tsx

interface Props {
  settings: ProfileSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProfileSettings>>;
}

export function ThemeTab({ settings, setSettings }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 背景主色設定區塊 */}
      <div style={{ backgroundColor: '#FAFAFA', padding: '24px', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
        <label className="form-label" style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>自訂背景主色</label>
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

      {/* 漸層方向設定區塊 - 新整合內容 */}
      <div style={{ backgroundColor: '#FAFAFA', padding: '24px', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
        <label className="form-label" style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>漸層方向</label>
        <select 
          value={settings.gradient_direction || 'to bottom right'} 
          onChange={(e) => setSettings({ ...settings, gradient_direction: e.target.value })}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #DED9D3', outline: 'none' }}
        >
          <option value="to bottom right">對角線 (左上到右下)</option>
          <option value="to right">由左至右</option>
          <option value="to left">由右至左</option>
          <option value="to bottom">由上至下</option>
        </select>
      </div>

      {/* 介面文字對比模式區塊 */}
      <div style={{ backgroundColor: '#FAFAFA', padding: '24px', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
        <label className="form-label" style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>介面文字對比模式</label>
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

      {/* 漸層背景預覽區塊 - 已同步 gradient_direction */}
      <div style={{ 
        padding: '40px 24px', 
        borderRadius: '12px', 
        background: `linear-gradient(${settings.gradient_direction || 'to bottom right'}, ${settings.background_color || '#F4F0EB'}, #00000015)`, 
        color: settings.theme_mode === 'dark' ? '#FFF' : '#333', 
        border: '1px solid #EAE6E1', 
        textAlign: 'center', 
        fontWeight: 'bold', 
        fontSize: '18px',
        transition: 'all 0.3s ease'
      }}>
        🎨 漸層背景預覽區塊
      </div>
    </div>
  );
}