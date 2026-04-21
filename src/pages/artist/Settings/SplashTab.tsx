import { useState } from 'react';
import { ImageUploader } from '../../../components/ImageUploader';
import type { ProfileSettings } from '../Settings/types';

interface Props {
  settings: ProfileSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProfileSettings>>;
}

export function SplashTab({ settings, setSettings }: Props) {
  const [isSplashUploading, setIsSplashUploading] = useState(false);
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const handleSplashUpload = async (resultBlobs: { preview: Blob }) => {
    setIsSplashUploading(true);
    try {
      const fileType = resultBlobs.preview.type || 'image/jpeg';
      
      console.log("1. 開始請求上傳憑證...");
      const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: fileType, bucketType: 'public', originalName: 'splash.jpg', folder: 'system' }) 
      });
      
      const ticketData = await ticketRes.json();
      console.log("2. 取得憑證回應：", ticketData); // 觀察後端到底回傳了什麼
      
      if (!ticketData.success) {
        throw new Error(`後端拒絕發放通行證：${ticketData.error || '未知錯誤'}`);
      }
      if (!ticketData.uploadUrl || !ticketData.fileName) {
        throw new Error("後端回傳的資料缺少 uploadUrl 或 fileName");
      }
      
      console.log("3. 開始上傳檔案至 R2...");
      const uploadRes = await fetch(ticketData.uploadUrl, { method: 'PUT', body: resultBlobs.preview, headers: { 'Content-Type': fileType } });
      
      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error("上傳至 R2 失敗，詳細錯誤：", errorText);
        throw new Error(`上傳遭拒絕 (HTTP ${uploadRes.status})`);
      }

      console.log("4. 上傳成功！準備更新 Settings...");
      const finalUrl = `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${ticketData.fileName}`;
      setSettings(prev => ({ ...prev, splash_image: finalUrl }));
      alert("背景圖上傳成功！請記得點擊最下方的「儲存所有變更」。");
      
    } catch (err: any) {
      console.error("上傳流程中斷：", err);
      alert(err.message || "背景圖上傳失敗");
    } finally {
      setIsSplashUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ padding: '16px 20px', backgroundColor: '#FAFAFA', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', color: '#5D4A3E', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={settings.splash_enabled} 
            onChange={e => setSettings({ ...settings, splash_enabled: e.target.checked })} 
            style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
          />
          啟用專屬開場動畫
        </label>
      </div>
      
      {settings.splash_enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ margin: 0 }}>動畫停留時長</label>
              <span style={{ fontWeight: 'bold', color: '#A67B3E', fontSize: '15px' }}>{settings.splash_duration} 秒</span>
            </div>
            <input 
              type="range" 
              min="0.5" max="10" step="0.5" 
              value={settings.splash_duration} 
              onChange={e => setSettings({ ...settings, splash_duration: Number(e.target.value) })}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#5D4A3E' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#A0978D', marginTop: '4px' }}>
              <span>快 (0.5s)</span>
              <span>慢 (10s)</span>
            </div>
          </div>

          <div>
            <label className="form-label" style={{ marginBottom: '12px' }}>開場背景圖設定</label>
            <div style={{ backgroundColor: '#FAFAFA', padding: '20px', borderRadius: '12px', border: '1px dashed #DED9D3' }}>
              <ImageUploader 
                onUpload={handleSplashUpload} 
                targetWidth={1920} 
                aspectRatio={16/9}
                withWatermark={false} 
                buttonText={isSplashUploading ? "圖片上傳中..." : "上傳全螢幕背景圖"} 
                maxSizeMB={3}
              />
              <div style={{ marginTop: '12px', fontSize: '13px', color: '#7A7269', lineHeight: '1.6' }}>
                <p>建議規格： 1920x1080 (比例 16:9)。</p>
                <p>載入優化： 檔案限制放寬至 3MB，但系統會自動壓縮。若初次載入全黑，建議先手動壓縮圖檔至 1MB 內。</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}