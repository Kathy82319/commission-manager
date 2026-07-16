// src/pages/artist/Settings/ThemeTab.tsx
import type { ProfileSettings } from '../Settings/types';

interface Props {
  settings: ProfileSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProfileSettings>>;
}

export function ThemeTab({ settings, setSettings }: Props) {
  const previewBackground = `linear-gradient(${settings.gradient_direction || 'to bottom right'}, ${settings.background_color || '#F4F0EB'}, ${settings.secondary_color || '#00000015'})`;
  const hasCustomSecondary = !!settings.secondary_color;

  const updateTheme = (updates: Partial<ProfileSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...updates,
      gradient_enabled: true 
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '260px', backgroundColor: '#FAFAFA', padding: '24px', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
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

        <div style={{ flex: 1, minWidth: '260px', backgroundColor: '#FAFAFA', padding: '24px', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
          <label className="form-label" style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>第二個漸層色</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: hasCustomSecondary ? '16px' : '0' }}>
            <input
              type="checkbox"
              id="custom-secondary-color"
              checked={hasCustomSecondary}
              onChange={e => updateTheme({ secondary_color: e.target.checked ? (settings.background_color || '#F4F0EB') : undefined })}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="custom-secondary-color" style={{ cursor: 'pointer' }}>自訂雙色漸層（不勾選則維持原本的預設漸層效果）</label>
          </div>
          {hasCustomSecondary && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <input
                type="color"
                value={settings.secondary_color || '#F4F0EB'}
                onChange={e => updateTheme({ secondary_color: e.target.value })}
                style={{ width: '50px', height: '50px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              />
              <input
                className="form-input"
                value={settings.secondary_color || ''}
                onChange={e => updateTheme({ secondary_color: e.target.value })}
                placeholder="#HEXCODE"
                style={{ width: '120px' }}
              />
            </div>
          )}
        </div>
      </div>

      <div style={{ backgroundColor: '#FAFAFA', padding: '24px', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
        <label className="form-label" style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>漸層方向</label>
        <select 
          value={settings.gradient_direction || 'to bottom right'} 
          onChange={(e) => updateTheme({ gradient_direction: e.target.value })}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #DED9D3', outline: 'none', background: '#FFF' }}
        >
          <option value="to top left">對角線 (左上到右下)</option>
          <option value="to left">由左至右</option>
          <option value="to right">由右至左</option>
          <option value="to top">由上至下</option>
          <option value="to bottom">由下至上</option>
        </select>
      </div>

      <div style={{ backgroundColor: '#FAFAFA', padding: '24px', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
        <label className="form-label" style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>介面文字對比模式</label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => updateTheme({ theme_mode: 'dark' })}
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: settings.theme_mode === 'dark' ? '2px solid #5D4A3E' : '1px solid #DED9D3', background: '#FFF', color: '#333', fontWeight: 'bold', cursor: 'pointer' }}
          >
            深色文字 (適合淺色背景)
          </button>
          <button 
            onClick={() => updateTheme({ theme_mode: 'light' })}
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: settings.theme_mode === 'light' ? '2px solid #A67B3E' : '1px solid #DED9D3', background: '#333', color: '#FFF', fontWeight: 'bold', cursor: 'pointer' }}
          >
            淺色文字 (適合深色背景)
          </button>
        </div>
      </div>

      
      <div style={{ 
        height: '160px',  
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '12px', 
        background: previewBackground, 
        color: settings.theme_mode === 'light' ? '#FFF' : '#333', 
        border: '1px solid #EAE6E1', 
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)', 
        transition: 'all 0.3s ease'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px' }}>背景實際預覽區塊</div>
        </div>
      </div>
    </div>
  );
}