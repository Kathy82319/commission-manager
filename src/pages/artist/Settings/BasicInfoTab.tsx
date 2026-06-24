import { useState, useEffect } from 'react';
import { User, Heart } from 'lucide-react';
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
  const [favoriteCount, setFavoriteCount] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingPlatform, setEditingPlatform] = useState('');
  const [editingUrl, setEditingUrl] = useState('');
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  useEffect(() => {
    fetch(`${API_BASE}/api/relations/my-count`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (data.success) setFavoriteCount(data.count); })
      .catch(() => {});
  }, [API_BASE]);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', backgroundColor: '#FFF5F5', border: '1px solid #FECACA', borderRadius: '10px' }}>
        <Heart size={18} color="#e11d48" fill="#e11d48" style={{ flexShrink: 0 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
          <input
            type="checkbox"
            checked={!!settings.show_favorite_count}
            onChange={e => setSettings((prev: any) => ({ ...prev, show_favorite_count: e.target.checked }))}
            style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#e11d48', flexShrink: 0 }}
          />
          <span style={{ fontSize: '14px', color: '#5D4A3E', fontWeight: 'bold' }}>
            {favoriteCount === null ? '載入中...' : `目前有 ${favoriteCount} 人將你加入收藏`}，在個人頁公開顯示
          </span>
        </label>
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
                border: editingIndex === i ? '1px solid #5D4A3E' : '1px solid #EAE6E1',
                gap: '8px',
                flexWrap: 'wrap'
              }}
            >
              {editingIndex === i ? (
                <>
                  <div style={{ display: 'flex', gap: '8px', flex: 1, flexWrap: 'wrap' }}>
                    <select
                      className="form-input"
                      value={editingPlatform}
                      onChange={e => setEditingPlatform(e.target.value)}
                      style={{ width: 'auto', minWidth: '140px' }}
                    >
                      {['Facebook', 'Plurk', 'Twitter / X', 'Threads', 'Instagram', '個人網站'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <input
                      className="form-input"
                      value={editingUrl}
                      onChange={e => setEditingUrl(e.target.value)}
                      placeholder="網址..."
                      style={{ flex: 1, minWidth: '180px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        if (!editingUrl.trim()) return;
                        setSettings(prev => {
                          const updated = [...prev.social_links];
                          updated[i] = { platform: editingPlatform, url: editingUrl };
                          return { ...prev, social_links: updated };
                        });
                        setEditingIndex(null);
                      }}
                      style={{ padding: '6px 14px', background: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                    >
                      儲存
                    </button>
                    <button
                      onClick={() => setEditingIndex(null)}
                      style={{ padding: '6px 14px', background: 'none', color: '#7A7269', border: '1px solid #D1C9C2', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                    >
                      取消
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '14px', flex: 1 }}>
                    <strong style={{ color: '#5D4A3E' }}>{link.platform}:</strong>
                    <span style={{ color: '#7A7269', marginLeft: '8px' }}>{link.url}</span>
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => { setEditingIndex(i); setEditingPlatform(link.platform); setEditingUrl(link.url); }}
                      style={{ color: '#5D4A3E', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => setSettings(prev => ({
                        ...prev,
                        social_links: prev.social_links.filter((_, idx) => idx !== i)
                      }))}
                      style={{ color: '#A05C5C', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      移除
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}