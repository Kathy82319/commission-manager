// src/pages/artist/Settings/BulletinSettingsTab.tsx
import React, { useState } from 'react';
import type { ProfileSettings } from './types';
import { ImageUploader } from '../../../components/ImageUploader';
import { X } from 'lucide-react';

export interface ExtendedSettings extends ProfileSettings {
  bulletin_card?: {
    specialties: string;
    no_gos: string;
    message?: string; 
    images?: string[]; 
  };
  question_template?: string;
}

interface Props {
  settings: ExtendedSettings;
  setSettings: React.Dispatch<React.SetStateAction<ExtendedSettings>>;
}

export function BulletinSettingsTab({ settings, setSettings }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [tagInputs, setTagInputs] = useState({ specialties: '', no_gos: '' });
  
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const updateBulletinCard = (field: string, value: any) => {
    setSettings((prev: ExtendedSettings) => ({
      ...prev,
      bulletin_card: {
        ...(prev.bulletin_card || { specialties: '', no_gos: '' }),
        [field]: value
      }
    }));
  };

  const handleTagAdd = (field: 'specialties' | 'no_gos') => {
    const rawValue = tagInputs[field];
    if (!rawValue) return;

    const safeValue = rawValue.replace(/[<>"'&]/g, '');
    const value = safeValue.trim().replace(/,/g, '').replace(/，/g, '').replace(/\s+/g, '');

    if (!value) {
      setTagInputs(prev => ({ ...prev, [field]: '' }));
      return;
    }

    const currentString = settings.bulletin_card?.[field] || '';
    const currentTags = currentString.split(' ').filter(t => t);
    
    if (currentTags.includes(value)) {
      setTagInputs(prev => ({ ...prev, [field]: '' }));
      return;
    }

    updateBulletinCard(field, [...currentTags, value].join(' '));
    setTagInputs(prev => ({ ...prev, [field]: '' }));
  };

  const handleTagRemove = (field: 'specialties' | 'no_gos', tagToRemove: string) => {
    const currentString = settings.bulletin_card?.[field] || '';
    const currentTags = currentString.split(' ').filter(t => t !== tagToRemove);
    updateBulletinCard(field, currentTags.join(' '));
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
        const R2_BASE_URL = import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev';

        const finalUrl = `${R2_BASE_URL}/${ticketData.fileName}`;
        updateBulletinCard('images', [...currentImages, finalUrl]);
      }
    } catch (err) {
      alert("上傳預設圖失敗");
    } finally {
      setIsUploading(false);
    }
  };

  const specialtiesTags = (settings.bulletin_card?.specialties || '').split(' ').filter(t => t);
  const noGosTags = (settings.bulletin_card?.no_gos || '').split(' ').filter(t => t);

  return (
    <div className="settings-section">
      <h4 className="section-title">許願池「投遞意向」預設設定</h4>
      <p className="section-desc" style={{ color: '#888', marginBottom: '20px', fontSize: '0.9rem' }}>
        設定後，當您在許願池按下「我有興趣」或提案時，系統會自動帶入以下內容，省去重複輸入的時間。
      </p>

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

      <div className="form-group" style={{ marginTop: '20px' }}>
        <label className="form-label">預設提案留言</label>
        <textarea 
          className="form-input" 
          value={settings.bulletin_card?.message || ''} 
          onChange={(e) => updateBulletinCard('message', e.target.value)}
          placeholder="簡單介紹一下自己，讓案主更想選擇你！此內容會自動帶入提案單中。"
          style={{ minHeight: '100px', width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        <div className="form-group">
          <label className="form-label" style={{ color: '#ff8c00', fontWeight: 'bold' }}>擅長題材 (舒適圈)</label>
          <div className="tag-selector" style={{ background: 'white', padding: '8px', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {specialtiesTags.map((tag: string, i: number) => (
              <span key={i} className="selectable-tag custom-tag" style={{ background: '#fff5eb', color: '#ff8c00', border: '1px solid #ffd2a6', padding: '4px 8px', borderRadius: '20px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {tag} <X size={12} onClick={() => handleTagRemove('specialties', tag)} style={{ cursor: 'pointer' }} />
              </span>
            ))}
            <input 
              type="text" 
              className="compact-tag-input" 
              placeholder="+ 新增" 
              value={tagInputs.specialties} 
              onChange={(e) => setTagInputs({...tagInputs, specialties: e.target.value})} 
              onKeyDown={(e) => { 
                if (e.key === 'Enter' || e.key === ',' || e.key === '，' || e.key === ' ') { 
                  e.preventDefault(); 
                  handleTagAdd('specialties'); 
                } 
              }} 
              onBlur={() => handleTagAdd('specialties')}
              style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, minWidth: '60px' }} 
            />
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label" style={{ color: '#e11d48', fontWeight: 'bold' }}>不擅長 / 雷點</label>
          <div className="tag-selector" style={{ background: 'white', padding: '8px', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {noGosTags.map((tag: string, i: number) => (
              <span key={i} className="selectable-tag custom-tag" style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', padding: '4px 8px', borderRadius: '20px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {tag} <X size={12} onClick={() => handleTagRemove('no_gos', tag)} style={{ cursor: 'pointer' }} />
              </span>
            ))}
            <input 
              type="text" 
              className="compact-tag-input" 
              placeholder="+ 新增" 
              value={tagInputs.no_gos} 
              onChange={(e) => setTagInputs({...tagInputs, no_gos: e.target.value})} 
              onKeyDown={(e) => { 
                if (e.key === 'Enter' || e.key === ',' || e.key === '，' || e.key === ' ') { 
                  e.preventDefault(); 
                  handleTagAdd('no_gos'); 
                } 
              }} 
              onBlur={() => handleTagAdd('no_gos')}
              style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, minWidth: '60px' }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}