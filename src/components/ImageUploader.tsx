// src/components/ImageUploader.tsx
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/imageProcessor';
import type { PixelCrop } from '../utils/imageProcessor';

interface ImageUploaderProps {
  onUpload: (blobs: { preview: Blob; original?: Blob }, previewUrl: string) => void;
  aspectRatio?: number;
  withWatermark?: boolean;
  watermarkText?: string;
  shape?: 'rect' | 'round';
  buttonText?: string;
  existingUrl?: string;
  isFinal?: boolean;
  // 🌟 metadata 屬性：用於顯示版本與日期
  metadata?: {
    version: number;
    date: string;
  };
}

export function ImageUploader({
  onUpload,
  aspectRatio = undefined,
  withWatermark = false,
  watermarkText = "SAMPLE",
  shape = 'rect',
  buttonText = "點擊上傳",
  existingUrl,
  isFinal = false,
  metadata
}: ImageUploaderProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result?.toString() || null));
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const onCropComplete = useCallback((_: any, croppedAreaPixels: PixelCrop) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const previewBlob = await getCroppedImg(imageSrc, croppedAreaPixels, {
        withWatermark,
        watermarkText
      });

      const previewUrl = URL.createObjectURL(previewBlob);
      
      let resultBlobs: { preview: Blob; original?: Blob } = { preview: previewBlob };

      if (isFinal) {
        const originalBlob = await getCroppedImg(imageSrc, croppedAreaPixels, {
          withWatermark: false, // 完稿原件不壓水印
          quality: 0.95
        });
        resultBlobs.original = originalBlob;
      }

      onUpload(resultBlobs, previewUrl);
      setImageSrc(null);
    } catch (e) {
      alert("圖片處理失敗");
    } finally {
      setIsProcessing(false);
    }
  };

  // 🌟 核心：如果已經有圖片 (整合縮小預覽與防止長圖爆框邏輯)
  if (existingUrl && !imageSrc) {
    return (
      <div style={{ 
        border: '1px solid #EAE6E1', 
        borderRadius: '12px', 
        overflow: 'hidden', 
        maxWidth: '400px', // 🌟 限制最大寬度，讓預覽圖縮小
        margin: '0 auto'    // 🌟 居中顯示
      }}>
        {metadata && (
          <div style={{
            fontSize: '11px', color: '#A0978D', padding: '10px 15px',
            backgroundColor: '#FAFAFA', borderBottom: '1px solid #EAE6E1'
          }}>
            目前最新版本 v{metadata.version} ({metadata.date})
          </div>
        )}
        <div
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          style={{ position: 'relative', width: '100%', backgroundColor: '#F9F9F9' }}
        >
          <img 
            src={existingUrl} 
            alt="已交付稿件" 
            style={{ 
              width: '100%', 
              maxHeight: '400px',   // 🌟 限制最大高度，避免長圖爆框
              objectFit: 'contain', // 🌟 確保整張圖完整顯示不被裁切
              display: 'block' 
            }} 
          />
          {isHovering && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', color: '#FFF'
            }}>
              <input 
                type="file" 
                accept="image/*" 
                onChange={onFileChange} 
                style={{ position: 'absolute', opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} 
              />
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{buttonText}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ 
        border: '2px dashed #DED9D3', 
        borderRadius: '12px', 
        padding: '20px', 
        textAlign: 'center', 
        backgroundColor: '#FBFBF9', 
        cursor: 'pointer', 
        position: 'relative' 
      }}>
        <input type="file" accept="image/*" onChange={onFileChange} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
        <span style={{ color: '#7A7269', fontSize: '14px', fontWeight: 'bold' }}>{buttonText}</span>
      </div>

      {imageSrc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '90%', maxWidth: '700px', height: '65vh', backgroundColor: '#222', borderRadius: '12px', overflow: 'hidden' }}>
            <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={aspectRatio} cropShape={shape} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
          </div>
          <div style={{ width: '90%', maxWidth: '700px', backgroundColor: '#FFF', padding: '20px', borderRadius: '12px', marginTop: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>縮放</span>
            <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ flex: 1 }} />
            <button onClick={() => setImageSrc(null)} style={{ padding: '10px 20px', backgroundColor: '#F5EBEB', color: '#A05C5C', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>取消</button>
            <button onClick={handleConfirm} style={{ padding: '10px 24px', backgroundColor: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>{isProcessing ? '處理中...' : '確認上傳'}</button>
          </div>
        </div>
      )}
    </>
  );
}