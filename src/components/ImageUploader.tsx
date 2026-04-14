import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/imageProcessor';
import type { PixelCrop } from '../utils/imageProcessor'; // 🌟 修正1：明確告訴 TS 這是 type


interface ImageUploaderProps {
  onUpload: (processedFile: Blob, previewUrl: string) => void;
  aspectRatio?: number; // 裁切比例，例如 1 (正方形), 16/9 等
  withWatermark?: boolean; // 是否要壓浮水印
  watermarkText?: string;
  shape?: 'rect' | 'round'; // 圓形或方形裁切框
  buttonText?: string;
}

export function ImageUploader({
  onUpload,
  aspectRatio = 1,
  withWatermark = false,
  watermarkText = "SAMPLE",
  shape = 'rect',
  buttonText = "點擊或拖曳上傳圖片"
}: ImageUploaderProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 當使用者選擇檔案時
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result?.toString() || null));
      reader.readAsDataURL(file);
      // 清空 input，允許重複選取同一個檔案
      e.target.value = '';
    }
  };

const onCropComplete = useCallback((_: any, croppedAreaPixels: PixelCrop) => {
        setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 當使用者按下確認裁切時
  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, {
        withWatermark,
        watermarkText
      });
      // 產生一個預覽網址給前端顯示用
      const previewUrl = URL.createObjectURL(croppedBlob);
      // 將處理好的 Blob 傳給父元件
      onUpload(croppedBlob, previewUrl);
      
      // 關閉 Modal
      setImageSrc(null);
    } catch (e) {
      alert("圖片處理失敗，請重試");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* 1. 上傳觸發區 (虛線框) */}
      <div 
        style={{
          border: '2px dashed #DED9D3', borderRadius: '12px', padding: '30px 20px', 
          textAlign: 'center', backgroundColor: '#FBFBF9', cursor: 'pointer', transition: 'all 0.2s ease',
          position: 'relative'
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#A67B3E'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#DED9D3'}
      >
        <input 
          type="file" accept="image/*" onChange={onFileChange}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, cursor: 'pointer' }}
        />
        <div style={{ color: '#7A7269', fontWeight: 'bold', fontSize: '15px' }}>
          {buttonText}
        </div>
        <div style={{ color: '#A0978D', fontSize: '12px', marginTop: '8px' }}>
          支援 JPG, PNG, WebP
        </div>
      </div>

      {/* 2. 裁切彈出視窗 (Modal) */}
      {imageSrc && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ position: 'relative', width: '90%', maxWidth: '600px', height: '60vh', backgroundColor: '#333', borderRadius: '12px', overflow: 'hidden' }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              cropShape={shape}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          
          <div style={{ width: '90%', maxWidth: '600px', backgroundColor: '#FFF', padding: '20px', borderRadius: '12px', marginTop: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#5D4A3E' }}>縮放</span>
            <input 
              type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
              style={{ flex: 1, cursor: 'pointer' }}
            />
            <button 
              onClick={() => setImageSrc(null)}
              style={{ padding: '10px 20px', backgroundColor: '#F5EBEB', color: '#A05C5C', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              disabled={isProcessing}
            >取消</button>
            <button 
              onClick={handleConfirm}
              style={{ padding: '10px 24px', backgroundColor: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              disabled={isProcessing}
            >
              {isProcessing ? '處理中...' : '確認並裁切'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}