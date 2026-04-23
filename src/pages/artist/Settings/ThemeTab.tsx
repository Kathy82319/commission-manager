import type { ProfileSettings } from '../Settings/types';

interface Props {
  settings: ProfileSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProfileSettings>>;
}

export function ThemeTab({ settings, setSettings }: Props) {
  const previewBackground = `linear-gradient(${settings.gradient_direction || 'to bottom right'}, ${settings.background_color || '#F4F0EB'}, #00000015)`;

  const updateTheme = (updates: Partial<ProfileSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...updates,
      gradient_enabled: true 
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ backgroundColor: '#FAFAFA', padding: '24px', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
        <label className="form-label" style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>自訂背景主色</label>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <input 
            type="color" 
            value={settings.background_color || '#F4F0EB'} 
            onChange={e => updateTheme({ background_color: e.target.value })}
            style={{ width: '50px', height: '50px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          />
          <input 
            className="form-input" 
            value={settings.background_color || '#F4F0EB'} 
            onChange={e => updateTheme({ background_color: e.target.value })}
            placeholder="#HEXCODE"
            style={{ width: '120px' }}
          />
        </div>
      </div>

      <div style={{ backgroundColor: '#FAFAFA', padding: '24px', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
        <label className="form-label" style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>漸層方向</label>
        <select 
          value={settings.gradient_direction || 'to bottom right'} 
          onChange={(e) => updateTheme({ gradient_direction: e.target.value })}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #DED9D3', outline: 'none', background: '#FFF' }}
        >
          <option value="to bottom right">對角線 (左上到右下)</option>
          <option value="to right">由左至右</option>
          <option value="to left">由右至左</option>
          <option value="to bottom">由上至下</option>
          <option value="to top">由下至上</option>
        </select>
      </div>

      <div style={{ backgroundColor: '#FAFAFA', padding: '24px', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
        <label className="form-label" style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>介面文字對比模式</label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => updateTheme({ theme_mode: 'light' })}
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: settings.theme_mode === 'light' ? '2px solid #5D4A3E' : '1px solid #DED9D3', background: '#FFF', color: '#333', fontWeight: 'bold', cursor: 'pointer' }}
          >
            深色文字 (適合淺色背景)
          </button>
          <button 
            onClick={() => updateTheme({ theme_mode: 'dark' })}
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: settings.theme_mode === 'dark' ? '2px solid #A67B3E' : '1px solid #DED9D3', background: '#333', color: '#FFF', fontWeight: 'bold', cursor: 'pointer' }}
          >
            淺色文字 (適合深色背景)
          </button>
        </div>
      </div>

      <div style={{ 
        padding: '40px 24px', 
        borderRadius: '12px', 
        background: previewBackground, 
        color: settings.theme_mode === 'dark' ? '#FFF' : '#333', 
        border: '1px solid #EAE6E1', 
        textAlign: 'center', 
        fontWeight: 'bold', 
        fontSize: '18px',
        transition: 'all 0.3s ease'
      }}>
        背景實際預覽區塊
      </div>
    </div>
  );
}