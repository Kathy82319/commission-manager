import React from 'react';
import type { ProfileSettings } from './types';

// 🌟 直接在這裡擴充型別，不影響你的 types.ts
export interface ExtendedSettings extends ProfileSettings {
  bulletin_card?: {
    specialties: string;
    no_gos: string;
    payment_methods: string;
    price_list: string;
  };
  question_template?: string;
}

interface Props {
  settings: ExtendedSettings;
  setSettings: React.Dispatch<React.SetStateAction<ExtendedSettings>>;
}

export function BulletinSettingsTab({ settings, setSettings }: Props) {
  
  const updateBulletinCard = (field: string, value: string) => {
    // 🌟 明確標示 prev 的型別為 ExtendedSettings，解決 any 報錯
    setSettings((prev: ExtendedSettings) => ({
      ...prev,
      bulletin_card: {
        ...prev.bulletin_card!,
        [field]: value
      }
    }));
  };

  return (
    <div className="settings-section">
      <h4 className="section-title">許願池「邀請詳談」明信片設定</h4>
      <p className="section-desc" style={{ color: '#888', marginBottom: '20px', fontSize: '0.9rem' }}>
        當案主在許願池向您提出「邀請詳談」時，將會看到以下您預設的資訊與提問模板。
      </p>

      {/* 區塊 1：提問模板 */}
      <div className="form-group">
        <label className="form-label">提問模板 (案主邀請時必填)</label>
        <p style={{ fontSize: '0.8rem', color: '#A0978D', marginBottom: '8px' }}>
          引導案主提供您評估所需的關鍵資訊 (例如：角色設定圖、期望截稿日、用途等)
        </p>
        <textarea 
          className="form-input textarea-large" 
          value={settings.question_template || ''} 
          onChange={(e) => setSettings({...settings, question_template: e.target.value})}
          placeholder="範例：&#10;1. 請提供角色設定圖：&#10;2. 預計用途 (個人收藏/頭貼...)：&#10;3. 希望的動作與表情："
          style={{ minHeight: '150px' }}
        />
      </div>

      {/* 區塊 2：條件標籤 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px' }}>
        <div className="form-group">
          <label className="form-label">擅長題材 (舒適圈)</label>
          <input 
            type="text" 
            className="form-input" 
            value={settings.bulletin_card?.specialties || ''} 
            onChange={(e) => updateBulletinCard('specialties', e.target.value)}
            placeholder="例如：日系美少女、Q版、獸人..."
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ color: '#ef4444' }}>不擅長 / 雷點 (No-Go)</label>
          <input 
            type="text" 
            className="form-input" 
            value={settings.bulletin_card?.no_gos || ''} 
            onChange={(e) => updateBulletinCard('no_gos', e.target.value)}
            placeholder="例如：機甲、老人、純文字設定..."
          />
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '20px' }}>
        <label className="form-label">接受的付款方式</label>
        <input 
          type="text" 
          className="form-input" 
          value={settings.bulletin_card?.payment_methods || ''} 
          onChange={(e) => updateBulletinCard('payment_methods', e.target.value)}
          placeholder="例如：銀行轉帳、PayPal、超商代碼..."
        />
      </div>
      
      <div style={{ marginTop: '30px', padding: '15px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7' }}>
        <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>
          💡 <strong>小提醒：</strong> 現在「價目表」已改由提案時直接上傳圖片。您可以在個人主頁的作品集或詳細介紹中，也放上一份視覺化的價目表喔！
        </p>
      </div>
    </div>
  );
}