import { useState } from 'react';
import { User } from 'lucide-react';
import { ImageUploader } from '../../../components/ImageUploader';
import type { ProfileSettings, FormDataState } from '../Settings/types';

interface Props {
  formData: FormDataState;
  setFormData: React.Dispatch<React.SetStateAction<FormDataState>>;
  settings: ProfileSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProfileSettings>>;
}

export function BasicInfoTab({ formData, setFormData, settings, setSettings }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [socialPlatform, setSocialPlatform] = useState('Facebook');
  const [socialUrl, setSocialUrl] = useState('');
  const API_BASE = import.meta.env.VITE_API_BASE_URL || ''; 

  const handleAvatarUpload = async (resultBlobs: { preview: Blob }) => {
    setIsUploading(true);
    try {
      const fileType = resultBlobs.preview.type || 'image/jpeg';
      const fileExt = fileType.split('/')[1] || 'jpg';
      const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
        method: 'POST', 
        credentials: 'include', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contentType: fileType, 
          bucketType: 'public', 
          originalName: `avatar.${fileExt}`, 
          folder: 'avatars' 
        }) 
      });
      const ticketData = await ticketRes.json();
      if (!ticketData.success) throw new Error(ticketData.error || "無法取得上傳通行證");
      
      const uploadRes = await fetch(ticketData.uploadUrl, { 
        method: 'PUT', 
        body: resultBlobs.preview, 
        headers: { 'Content-Type': fileType } 
      });
      if (!uploadRes.ok) throw new Error("上傳遭拒絕");
      
      setFormData(prev => ({ ...prev, avatar_url: `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${ticketData.fileName}` }));
    } catch (err: any) { 
      alert(err.message || "頭像上傳失敗"); 
    } finally { 
      setIsUploading(false); 
    }
  };

  const handleAddSocial = () => {
    if (!socialUrl.trim()) return;
    setSettings(prev => ({ ...prev, social_links: [...prev.social_links, { platform: socialPlatform, url: socialUrl }] }));
    setSocialUrl('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ 
          width: '100px', 
          height: '100px', 
          borderRadius: '50%', 
          overflow: 'hidden', 
          border: '1px solid #EAE6E1', 
          flexShrink: 0,
          backgroundColor: '#F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {formData.avatar_url ? (
            <img src={formData.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
          ) : (
            <User size={48} color="#94A3B8" strokeWidth={1.5} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label className="form-label">顯示名稱</label>
          <input 
            className="form-input" 
            value={formData.display_name} 
            onChange={e => setFormData({ ...formData, display_name: e.target.value })} 
          />
          <div style={{ marginTop: '16px' }}>
            <ImageUploader 
              onUpload={handleAvatarUpload} 
              targetWidth={400} 
              withWatermark={false} 
              buttonText={isUploading ? "上傳中..." : "更換頭像"} 
              maxSizeMB={2} 
            />
          </div>
        </div>
      </div>
      <div>
        <label className="form-label">個人簡介</label>
        <textarea 
          className="form-input" 
          value={formData.bio} 
          onChange={e => setFormData({ ...formData, bio: e.target.value })} 
          style={{ minHeight: '120px', resize: 'vertical' }} 
        />
      </div>
      <div style={{ borderTop: '1px solid #EAE6E1', paddingTop: '24px' }}>
        <label className="form-label" style={{ marginBottom: '12px' }}>社群連結</label>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <select 
            className="form-input" 
            value={socialPlatform} 
            onChange={e => setSocialPlatform(e.target.value)} 
            style={{ width: 'auto', minWidth: '140px' }}
          >
            {['Facebook', 'Plurk', 'Twitter / X', 'Threads', 'Instagram', '個人網站'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input 
            className="form-input" 
            value={socialUrl} 
            onChange={e => setSocialUrl(e.target.value)} 
            placeholder="網址..." 
            style={{ flex: 1, minWidth: '180px' }} 
          />
          <button 
            onClick={handleAddSocial} 
            style={{ 
              padding: '10px 20px', 
              background: '#5D4A3E', 
              color: '#FFF', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: 'bold' 
            }}
          >
            + 新增
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {settings.social_links.map((link, i) => (
            <div 
              key={i} 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '12px 16px', 
                background: '#FAFAFA', 
                borderRadius: '8px', 
                border: '1px solid #EAE6E1' 
              }}
            >
              <span style={{ fontSize: '14px' }}>
                <strong style={{ color: '#5D4A3E' }}>{link.platform}:</strong> 
                <span style={{ color: '#7A7269', marginLeft: '8px' }}>{link.url}</span>
              </span>
              <button 
                onClick={() => setSettings(prev => ({ 
                  ...prev, 
                  social_links: prev.social_links.filter((_, idx) => idx !== i) 
                }))} 
                style={{ 
                  color: '#A05C5C', 
                  border: 'none', 
                  background: 'none', 
                  cursor: 'pointer', 
                  fontWeight: 'bold' 
                }}
              >
                移除
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}