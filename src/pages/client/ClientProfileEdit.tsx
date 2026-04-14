// src/pages/client/ClientProfileEdit.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageUploader } from '../../components/ImageUploader';

export function ClientProfileEdit() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    display_name: '',
    avatar_url: '',
    bio: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setProfile({
            display_name: data.data.display_name || '',
            avatar_url: data.data.avatar_url || '',
            bio: data.data.bio || ''
          });
        }
      } catch (e) {
        console.error("載入失敗", e);
      }
    };
    fetchProfile();
  }, []);

  // 🌟 核心修正：接收 processedBlob 與 previewUrl (暫時網址)
  const handleAvatarUpload = async (processedBlob: Blob, previewUrl: string) => {
    // 1. 立刻讓框框顯示圖片 (UX 優化)
    setProfile(prev => ({ ...prev, avatar_url: previewUrl }));
    setUploading(true);

    try {
      // Step A: 跟後端要門票
      const fileName = `avatars/${crypto.randomUUID()}.jpg`;
      const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          contentType: 'image/jpeg',
          bucketType: 'public'
        })
      });
      const { uploadUrl, success, error } = await ticketRes.json();
      if (!success) throw new Error(error);

      // Step B: 直傳 R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: processedBlob,
        headers: { 'Content-Type': 'image/jpeg' }
      });

      if (!uploadRes.ok) throw new Error("上傳 R2 失敗");

      // Step C: 組合圖片最終 R2 網址
      // ⚠️ 請確保此網址與您在 Cloudflare R2 設定的網址一致
      const finalR2Url = `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${fileName}`;
      
      // 正式將狀態更新為 R2 網址
      setProfile(prev => ({ ...prev, avatar_url: finalR2Url }));
      
    } catch (err: any) {
      alert("圖片上傳雲端失敗: " + err.message);
      // 如果失敗，可以考慮把圖片還原或保留預覽
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      const data = await res.json();
      if (data.success) {
        alert('個人資料已儲存！');
        navigate('/client/home');
      }
    } catch (e) {
      alert('儲存失敗');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 16px', flex: 1 }}>
      <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        <h2 style={{ color: '#FFFFFF', margin: 0, fontSize: '24px' }}>編輯個人資料</h2>

        <div style={{ backgroundColor: '#e8ecf3', padding: '30px', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
             {/* 🌟 大頭貼顯示框 */}
             <div style={{ 
               width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#d9dfe9', 
               margin: '0 auto 20px auto', border: '4px solid #FFFFFF', overflow: 'hidden',
               backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : 'none', 
               backgroundSize: 'cover', backgroundPosition: 'center',
               display: 'flex', alignItems: 'center', justifyContent: 'center'
             }}>
               {!profile.avatar_url && <span style={{ color: '#556577', fontSize: '14px' }}>無頭像</span>}
             </div>
             
             {uploading ? (
               <div style={{ color: '#4A7294', fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' }}>⏳ 圖片上傳中...</div>
             ) : (
               <ImageUploader 
                 onUpload={handleAvatarUpload}
                 aspectRatio={1}
                 shape="round"
                 buttonText="更換大頭貼 (支援裁切)"
               />
             )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={labelStyle}>顯示名稱</label>
            <input 
              type="text" value={profile.display_name} 
              onChange={e => setProfile({...profile, display_name: e.target.value})}
              style={inputStyle}
            />

            <label style={labelStyle}>自我介紹</label>
            <textarea 
              value={profile.bio} 
              onChange={e => setProfile({...profile, bio: e.target.value})}
              rows={4}
              style={{ ...inputStyle, resize: 'none' }}
              placeholder="介紹一下你自己吧..."
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={() => navigate('/client/home')} style={{ flex: 1, padding: '16px', backgroundColor: 'transparent', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '12px', cursor: 'pointer' }}>取消</button>
          <button onClick={handleSave} disabled={isSaving || uploading} style={{ flex: 2, padding: '16px', backgroundColor: '#4A7294', color: '#FFFFFF', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: (isSaving || uploading) ? 'not-allowed' : 'pointer' }}>
            {isSaving ? '儲存中...' : '儲存變更'}
          </button>
        </div>

      </div>
    </div>
  );
}

const labelStyle = { color: '#475569', fontSize: '14px', fontWeight: 'bold' as const };
const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #d9dfe9', outline: 'none', fontSize: '15px' };