import { useState } from 'react';
import { ImageUploader } from '../../../components/ImageUploader';
import type { ProfileSettings } from '../Settings/types';

interface Props {
  settings: ProfileSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProfileSettings>>;
}

export function SplashTab({ settings, setSettings }: Props) {
  const [isSplashUploading, setIsSplashUploading] = useState(false);
  const [isMobileSplashUploading, setIsMobileSplashUploading] = useState(false);
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const uploadToR2 = async (blob: Blob, originalName: string): Promise<string> => {
    const fileType = blob.type || 'image/jpeg';
    const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: fileType, bucketType: 'public', originalName, folder: 'system' })
    });
    const ticketData = await ticketRes.json();
    if (!ticketData.success) throw new Error(`後端拒絕發放通行證：${ticketData.error || '未知錯誤'}`);
    if (!ticketData.uploadUrl || !ticketData.fileName) throw new Error("後端回傳的資料缺少 uploadUrl 或 fileName");
    const uploadRes = await fetch(ticketData.uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': fileType } });
    if (!uploadRes.ok) throw new Error(`上傳遭拒絕 (HTTP ${uploadRes.status})`);
    return `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${ticketData.fileName}`;
  };

  const handleSplashUpload = async (resultBlobs: { preview: Blob }) => {
    setIsSplashUploading(true);
    try {
      const finalUrl = await uploadToR2(resultBlobs.preview, 'splash.jpg');
      setSettings(prev => ({ ...prev, splash_image: finalUrl }));
      alert("桌機版背景圖上傳成功！請記得點擊最下方的「儲存所有變更」。");
    } catch (err: any) {
      alert(err.message || "背景圖上傳失敗");
    } finally {
      setIsSplashUploading(false);
    }
  };

  const handleMobileSplashUpload = async (resultBlobs: { preview: Blob }) => {
    setIsMobileSplashUploading(true);
    try {
      const finalUrl = await uploadToR2(resultBlobs.preview, 'splash-mobile.jpg');
      setSettings(prev => ({ ...prev, splash_image_mobile: finalUrl }));
      alert("手機版背景圖上傳成功！請記得點擊最下方的「儲存所有變更」。");
    } catch (err: any) {
      alert(err.message || "手機版背景圖上傳失敗");
    } finally {
      setIsMobileSplashUploading(false);
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

<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <label className="form-label" style={{ marginBottom: '4px' }}>開場背景圖設定</label>
            <p style={{ margin: 0, fontSize: '13px', color: '#7A7269' }}>請分別上傳兩張圖片，系統會依造訪者的裝置自動顯示對應版本。</p>

            {/* 桌機版 */}
            <div style={{ backgroundColor: '#FAFAFA', padding: '20px', borderRadius: '12px', border: '1px dashed #DED9D3' }}>
              <div style={{ fontWeight: 'bold', color: '#5D4A3E', marginBottom: '12px', fontSize: '14px' }}>🖥️ 桌機版（橫式）</div>
              <ImageUploader
                onUpload={handleSplashUpload}
                targetWidth={1920}
                aspectRatio={16/9}
                withWatermark={false}
                buttonText={isSplashUploading ? "圖片上傳中..." : "上傳桌機版背景圖"}
                maxSizeMB={3}
              />
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#A0978D', lineHeight: '1.6' }}>
                建議規格：1920x1080（比例 16:9）
              </div>
              {settings.splash_image && (
                <div style={{ marginTop: '16px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #EAE6E1' }}>
                  <div style={{ fontSize: '12px', color: '#A0978D', marginBottom: '6px', fontWeight: 'bold' }}>目前圖片：</div>
                  <img src={settings.splash_image} alt="桌機版開場圖" style={{ width: '100%', display: 'block', objectFit: 'cover', aspectRatio: '16/9' }} />
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, splash_image: '' }))}
                    style={{ marginTop: '8px', padding: '6px 14px', background: '#ffebee', color: '#d93025', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                  >
                    移除圖片
                  </button>
                </div>
              )}
            </div>

            {/* 手機版 */}
            <div style={{ backgroundColor: '#FAFAFA', padding: '20px', borderRadius: '12px', border: '1px dashed #DED9D3' }}>
              <div style={{ fontWeight: 'bold', color: '#5D4A3E', marginBottom: '12px', fontSize: '14px' }}>📱 手機版（直式）</div>
              <ImageUploader
                onUpload={handleMobileSplashUpload}
                targetWidth={1080}
                aspectRatio={9/16}
                withWatermark={false}
                buttonText={isMobileSplashUploading ? "圖片上傳中..." : "上傳手機版背景圖"}
                maxSizeMB={3}
              />
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#A0978D', lineHeight: '1.6' }}>
                建議規格：1080x1920（比例 9:16）。若未上傳，手機版會沿用桌機版圖片。
              </div>
              {settings.splash_image_mobile && (
                <div style={{ marginTop: '16px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #EAE6E1' }}>
                  <div style={{ fontSize: '12px', color: '#A0978D', marginBottom: '6px', fontWeight: 'bold' }}>目前圖片：</div>
                  <img src={settings.splash_image_mobile} alt="手機版開場圖" style={{ width: '100%', maxWidth: '200px', display: 'block', objectFit: 'cover', aspectRatio: '9/16' }} />
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, splash_image_mobile: '' }))}
                    style={{ marginTop: '8px', padding: '6px 14px', background: '#ffebee', color: '#d93025', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                  >
                    移除圖片
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}