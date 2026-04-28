import React, { useState } from 'react';
import type { ProfileSettings } from './types';
import { ImageUploader } from '../../../components/ImageUploader';
import { X } from 'lucide-react';

// 🌟 擴充型別以包含預設圖片
export interface ExtendedSettings extends ProfileSettings {
  bulletin_card?: {
    specialties: string;
    no_gos: string;
    payment_methods: string;
    price_list: string;
    images?: string[]; // 預設圖片路徑
  };
  question_template?: string;
}

interface Props {
  settings: ExtendedSettings;
  setSettings: React.Dispatch<React.SetStateAction<ExtendedSettings>>;
}

export function BulletinSettingsTab({ settings, setSettings }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const updateBulletinCard = (field: string, value: any) => {
    setSettings((prev: ExtendedSettings) => ({
      ...prev,
      bulletin_card: {
        ...prev.bulletin_card!,
        [field]: value
      }
    }));
  };

  const handleDefaultImageUpload = async (resultBlobs: { preview: Blob }) => {
    const currentImages = settings.bulletin_card?.images || [];
    if (currentImages.length >= 3) {
      alert("預設圖片最多 3 張");
      return;
    }

    setIsUploading(true);
    try {
      const fileType = resultBlobs.preview.type || 'image/jpeg';
      const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contentType: fileType, 
          bucketType: 'public', 
          originalName: `default_price_${Date.now()}.jpg`, 
          folder: 'settings' 
        })
      });
      const ticketData = await ticketRes.json();
      const uploadRes = await fetch(ticketData.uploadUrl, { method: 'PUT', body: resultBlobs.preview, headers: { 'Content-Type': fileType } });
      
      if (uploadRes.ok) {
        const finalUrl = `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${ticketData.fileName}`;
        updateBulletinCard('images', [...currentImages, finalUrl]);
      }
    } catch (err) {
      alert("上傳預設圖失敗");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="settings-section">
      <h4 className="section-title">許願池「投遞意向」預設設定</h4>
      <p className="section-desc" style={{ color: '#888', marginBottom: '20px', fontSize: '0.9rem' }}>
        設定後，當您在許願池按下「我有興趣」時，系統會自動帶入以下內容，省去重複輸入的時間。
      </p>

      {/* 🌟 新增：預設價目表/參考圖管理 */}
      <div className="form-group" style={{ marginBottom: '24px' }}>
        <label className="form-label">預算價目表 / 參考作品 (最多3張，圖片限制 3MB 以下)</label>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
          {(settings.bulletin_card?.images || []).map((url, idx) => (
            <div key={idx} style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <img src={url} alt="預設圖" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button 
                type="button" 
                onClick={() => updateBulletinCard('images', settings.bulletin_card?.images?.filter((_, i) => i !== idx))}
                style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: '4px', display: 'flex' }}
              >
                <X size={14}/>
              </button>
            </div>
          ))}
          {(settings.bulletin_card?.images || []).length < 3 && (
            <div style={{ width: '120px', height: '120px' }}>
              <ImageUploader 
                onUpload={handleDefaultImageUpload} 
                targetWidth={1000} 
                buttonText={isUploading ? "上傳中..." : "+ 預設圖片"} 
                maxSizeMB={3} 
              />
            </div>
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">提問模板 (案主邀請時必填)</label>
        <textarea 
          className="form-input" 
          value={settings.question_template || ''} 
          onChange={(e) => setSettings({...settings, question_template: e.target.value})}
          placeholder="範例：1.用途 2.角色設定..."
          style={{ minHeight: '120px' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        <div className="form-group">
          <label className="form-label">擅長題材 (舒適圈)</label>
          <input type="text" className="form-input" value={settings.bulletin_card?.specialties || ''} onChange={(e) => updateBulletinCard('specialties', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">不擅長 / 雷點</label>
          <input type="text" className="form-input" value={settings.bulletin_card?.no_gos || ''} onChange={(e) => updateBulletinCard('no_gos', e.target.value)} />
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '20px' }}>
        <label className="form-label">接受的付款方式</label>
        <input type="text" className="form-input" value={settings.bulletin_card?.payment_methods || ''} onChange={(e) => updateBulletinCard('payment_methods', e.target.value)} />
      </div>
    </div>
  );
}