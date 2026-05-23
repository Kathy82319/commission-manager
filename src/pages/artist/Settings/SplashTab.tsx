import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../../utils/imageProcessor';
import type { PixelCrop } from '../../../utils/imageProcessor';
import type { ProfileSettings } from '../Settings/types';

interface Props {
  settings: ProfileSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProfileSettings>>;
}

type CropStep = 'desktop' | 'mobile' | null;

export function SplashTab({ settings, setSettings }: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [cropStep, setCropStep] = useState<CropStep>(null);

  const [desktopCrop, setDesktopCrop] = useState({ x: 0, y: 0 });
  const [desktopZoom, setDesktopZoom] = useState(1);
  const [desktopCropArea, setDesktopCropArea] = useState<PixelCrop | null>(null);
  const [desktopBlob, setDesktopBlob] = useState<Blob | null>(null);

  const [mobileCrop, setMobileCrop] = useState({ x: 0, y: 0 });
  const [mobileZoom, setMobileZoom] = useState(1);
  const [mobileCropArea, setMobileCropArea] = useState<PixelCrop | null>(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > 3 * 1024 * 1024) {
      alert('檔案太大，最大限制為 3MB。建議先手動壓縮至 1MB 以內，可減少訪客等待時間。');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImageSrc(reader.result?.toString() || null);
      setCropStep('desktop');
      setDesktopCrop({ x: 0, y: 0 });
      setDesktopZoom(1);
      setMobileCrop({ x: 0, y: 0 });
      setMobileZoom(1);
      setDesktopBlob(null);
    });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onDesktopCropComplete = useCallback((_: any, area: PixelCrop) => {
    setDesktopCropArea(area);
  }, []);

  const onMobileCropComplete = useCallback((_: any, area: PixelCrop) => {
    setMobileCropArea(area);
  }, []);

  const handleDesktopNext = async () => {
    if (!imageSrc || !desktopCropArea) return;
    try {
      const blob = await getCroppedImg(imageSrc, desktopCropArea, { withWatermark: false, maxWidth: 1920, quality: 0.85 });
      setDesktopBlob(blob);
      setCropStep('mobile');
    } catch {
      alert('圖片處理失敗，請重試');
    }
  };

  const uploadToR2 = async (blob: Blob, originalName: string): Promise<string> => {
    const fileType = blob.type || 'image/jpeg';
    const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: fileType, bucketType: 'public', originalName, folder: 'system' })
    });
    const ticketData = await ticketRes.json();
    if (!ticketData.success) throw new Error(ticketData.error || '上傳憑證取得失敗');
    const uploadRes = await fetch(ticketData.uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': fileType } });
    if (!uploadRes.ok) throw new Error(`上傳失敗 (HTTP ${uploadRes.status})`);
    return `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${ticketData.fileName}`;
  };

  const handleConfirmUpload = async () => {
    if (!imageSrc || !mobileCropArea || !desktopBlob) return;
    setIsUploading(true);
    try {
      const mobileBlob = await getCroppedImg(imageSrc, mobileCropArea, { withWatermark: false, maxWidth: 1080, quality: 0.85 });
      const [desktopUrl, mobileUrl] = await Promise.all([
        uploadToR2(desktopBlob, 'splash.jpg'),
        uploadToR2(mobileBlob, 'splash-mobile.jpg'),
      ]);
      setSettings(prev => ({ ...prev, splash_image: desktopUrl, splash_image_mobile: mobileUrl }));
      setImageSrc(null);
      setCropStep(null);
      setDesktopBlob(null);
      alert('開場圖上傳成功！請記得點擊最下方的「儲存所有變更」。');
    } catch (err: any) {
      alert(err.message || '上傳失敗，請稍後再試');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setImageSrc(null);
    setCropStep(null);
    setDesktopBlob(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* 啟用開關 */}
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

          {/* 時長 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ margin: 0 }}>動畫停留時長</label>
              <span style={{ fontWeight: 'bold', color: '#A67B3E', fontSize: '15px' }}>{settings.splash_duration} 秒</span>
            </div>
            <input
              type="range" min="0.5" max="10" step="0.5"
              value={settings.splash_duration}
              onChange={e => setSettings({ ...settings, splash_duration: Number(e.target.value) })}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#5D4A3E' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#A0978D', marginTop: '4px' }}>
              <span>快 (0.5s)</span>
              <span>慢 (10s)</span>
            </div>
          </div>

          {/* 圖片上傳區 */}
          <div>
            <label className="form-label" style={{ marginBottom: '8px' }}>開場背景圖設定</label>
            <div style={{ fontSize: '13px', color: '#7A7269', lineHeight: '1.7', marginBottom: '16px' }}>
              <span>上傳一張原圖後，可分別調整兩種裁切範圍：</span>
              <br />
              <span>🖥️ <strong>網頁版</strong>建議規格：1920x1080（比例 16:9）</span>
              <br />
              <span>📱 <strong>手機版</strong>建議規格：1080x1920（比例 9:16）</span>
              <br />
              <span style={{ color: '#A67B3E' }}>⚡ 上傳後系統會自動壓縮。建議原圖 1MB 以內，可減少訪客等待時間；最大限制 3MB。</span>
            </div>

            <div style={{ border: '2px dashed #DED9D3', borderRadius: '12px', padding: '20px', textAlign: 'center', backgroundColor: '#FBFBF9', cursor: 'pointer', position: 'relative' }}>
              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
              />
              <span style={{ color: '#7A7269', fontSize: '14px', fontWeight: 'bold' }}>
                點擊上傳開場圖片（最大 3MB）
              </span>
            </div>
          </div>

          {/* 目前圖片預覽 */}
          {(settings.splash_image || settings.splash_image_mobile) && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {settings.splash_image && (
                <div style={{ flex: '1 1 200px', maxWidth: '380px', minWidth: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid #EAE6E1' }}>
                  <div style={{ fontSize: '12px', color: '#A0978D', padding: '8px 10px', fontWeight: 'bold', background: '#FAFAFA', borderBottom: '1px solid #EAE6E1' }}>🖥️ 目前網頁版</div>
                  <img src={settings.splash_image} alt="桌機版" style={{ width: '100%', display: 'block', objectFit: 'cover', aspectRatio: '16/9' }} />
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, splash_image: '' }))}
                    style={{ width: '100%', padding: '8px', background: '#ffebee', color: '#d93025', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                  >
                    移除
                  </button>
                </div>
              )}
              {settings.splash_image_mobile && (
                <div style={{ flex: '0 0 120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #EAE6E1' }}>
                  <div style={{ fontSize: '12px', color: '#A0978D', padding: '8px 10px', fontWeight: 'bold', background: '#FAFAFA', borderBottom: '1px solid #EAE6E1' }}>📱 手機版</div>
                  <img src={settings.splash_image_mobile} alt="手機版" style={{ width: '100%', display: 'block', objectFit: 'cover', aspectRatio: '9/16' }} />
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, splash_image_mobile: '' }))}
                    style={{ width: '100%', padding: '8px', background: '#ffebee', color: '#d93025', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                  >
                    移除
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 裁切器 Overlay */}
      {imageSrc && cropStep && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

          {/* 步驟標題 */}
          <div style={{ color: '#FFF', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', opacity: 0.6, marginBottom: '4px' }}>
              步驟 {cropStep === 'desktop' ? '1' : '2'} / 2
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {cropStep === 'desktop' ? '🖥️ 調整網頁版裁切範圍（16:9）' : '📱 調整手機版裁切範圍（9:16）'}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '4px' }}>
              {cropStep === 'desktop' ? '建議規格 1920×1080' : '建議規格 1080×1920'}
            </div>
          </div>

          {/* 裁切區 */}
          <div style={{
            position: 'relative',
            width: cropStep === 'desktop' ? 'min(85vw, 700px)' : 'min(45vw, 320px)',
            height: cropStep === 'desktop' ? 'calc(min(85vw, 700px) * 9 / 16)' : 'calc(min(45vw, 320px) * 16 / 9)',
            backgroundColor: '#222',
            borderRadius: '10px',
            overflow: 'hidden',
          }}>
            {cropStep === 'desktop' && (
              <Cropper
                image={imageSrc}
                crop={desktopCrop}
                zoom={desktopZoom}
                aspect={16 / 9}
                onCropChange={setDesktopCrop}
                onCropComplete={onDesktopCropComplete}
                onZoomChange={setDesktopZoom}
              />
            )}
            {cropStep === 'mobile' && (
              <Cropper
                image={imageSrc}
                crop={mobileCrop}
                zoom={mobileZoom}
                aspect={9 / 16}
                onCropChange={setMobileCrop}
                onCropComplete={onMobileCropComplete}
                onZoomChange={setMobileZoom}
              />
            )}
          </div>

          {/* 縮放 + 按鈕 */}
          <div style={{ width: 'min(85vw, 700px)', backgroundColor: '#FFF', padding: '16px', borderRadius: '12px', marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 180px' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>縮放</span>
              <input
                type="range" min={1} max={3} step={0.1}
                value={cropStep === 'desktop' ? desktopZoom : mobileZoom}
                onChange={e => cropStep === 'desktop' ? setDesktopZoom(Number(e.target.value)) : setMobileZoom(Number(e.target.value))}
                style={{ flex: 1 }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', flex: '1 1 auto', justifyContent: 'flex-end' }}>
              {cropStep === 'desktop' ? (
                <>
                  <button onClick={handleCancel} style={{ padding: '10px 16px', backgroundColor: '#F5EBEB', color: '#A05C5C', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    取消
                  </button>
                  <button onClick={handleDesktopNext} style={{ padding: '10px 20px', backgroundColor: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    下一步：手機版裁切 →
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => { setCropStep('desktop'); setDesktopBlob(null); }} style={{ padding: '10px 16px', backgroundColor: '#F5EBEB', color: '#A05C5C', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    ← 返回重裁網頁版
                  </button>
                  <button onClick={handleConfirmUpload} disabled={isUploading} style={{ padding: '10px 20px', backgroundColor: '#4E7A5A', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.7 : 1 }}>
                    {isUploading ? '上傳中...' : '確認上傳兩版本'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
