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
  metadata?: {
    version: number;
    date: string;
  };
  maxSizeMB?: number; 
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // 🌟 儲存原始 File 物件
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [dynamicAspect, setDynamicAspect] = useState<number>(1); 

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const isImage = file.type.startsWith('image/');

      // 🛡️ 嚴格鎖死 5MB 限制
      const MAX_FILE_SIZE = 5 * 1024 * 1024; 
      
      if (file.size > MAX_FILE_SIZE) {
        alert(`檔案太大囉！最大限制為 5MB。\n您選擇的檔案為 ${(file.size / 1024 / 1024).toFixed(2)} MB。`);
        e.target.value = ''; 
        return; 
      }

      setSelectedFile(file); // 紀錄最原始的檔案

      // 🌟 非圖片檔案處理 (ZIP/PSD 等，僅限完稿)
      if (!isImage) {
        if (!isFinal) {
          alert("此階段僅允許上傳圖片格式！");
          e.target.value = '';
          return;
        }

        setIsProcessing(true);
        const canvas = document.createElement('canvas');
        canvas.width = 800; canvas.height = 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, 800, 600);
          ctx.fillStyle = '#475569'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('📁 檔案原檔已準備上傳', 400, 280);
          ctx.fillStyle = '#64748b'; ctx.font = '24px sans-serif';
          ctx.fillText(`檔名：${file.name}`, 400, 340);
        }

        canvas.toBlob((blob) => {
          setIsProcessing(false);
          if (blob) {
            // 預覽圖用 Canvas 產生，原檔直接回傳真實 File 物件
            onUpload({ preview: blob, original: file }, URL.createObjectURL(blob));
          }
        }, 'image/png');

        e.target.value = '';
        return;
      }

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
    if (!imageSrc || !croppedAreaPixels || !selectedFile) return;
    setIsProcessing(true);
    try {
      // 產生預覽用縮圖 (帶浮水印)
      const previewBlob = await getCroppedImg(imageSrc, croppedAreaPixels, {
        withWatermark,
        watermarkText
      });

      const previewUrl = URL.createObjectURL(previewBlob);
      
      // 🌟【修復核心】：original 欄位直接傳送 selectedFile (File 物件)，
      // 保證它是繪師原本挑選的檔案，完全不經過 Canvas 裁切或壓縮。
      onUpload({ 
        preview: previewBlob, 
        original: isFinal ? selectedFile : undefined 
      }, previewUrl);

      setImageSrc(null);
      setSelectedFile(null);
    } catch (e) {
      alert("圖片處理失敗");
    } finally {
      setIsProcessing(false);
    }
  };

  if (existingUrl && !imageSrc) {
    return (
      <div style={{ border: '1px solid #EAE6E1', borderRadius: '12px', overflow: 'hidden', maxWidth: '400px', margin: '0 auto' }}>
        {metadata && (
          <div style={{ fontSize: '11px', color: '#A0978D', padding: '10px 15px', backgroundColor: '#FAFAFA', borderBottom: '1px solid #EAE6E1', textAlign: 'center' }}>
            目前最新版本 v{metadata.version} ({metadata.date})
          </div>
        )}
        <div onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} style={{ position: 'relative', width: '100%', backgroundColor: '#F9F9F9' }}>
          <img src={existingUrl} alt="已交付稿件" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
          {isHovering && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
              <input type="file" accept={isFinal ? "image/*,.zip,.rar,.7z,.psd,.clip,.pdf" : "image/*"} onChange={onFileChange} style={{ position: 'absolute', opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{buttonText}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ border: '2px dashed #DED9D3', borderRadius: '12px', padding: '20px', textAlign: 'center', backgroundColor: '#FBFBF9', cursor: 'pointer', position: 'relative' }}>
        <input type="file" accept={isFinal ? "image/*,.zip,.rar,.7z,.psd,.clip,.pdf" : "image/*"} onChange={onFileChange} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
        <span style={{ color: '#7A7269', fontSize: '14px', fontWeight: 'bold' }}>{buttonText}</span>
      </div>

      {imageSrc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '90%', maxWidth: '700px', height: '65vh', backgroundColor: '#222', borderRadius: '12px', overflow: 'hidden' }}>
            <Cropper 
              image={imageSrc} 
              crop={crop} 
              zoom={zoom} 
              aspect={aspectRatio || dynamicAspect} 
              cropShape={shape} 
              onCropChange={setCrop} 
              onCropComplete={onCropComplete} 
              onZoomChange={setZoom} 
              onMediaLoaded={(mediaSize) => {
                setDynamicAspect(mediaSize.width / mediaSize.height);
              }}
            />
          </div>
          <div style={{ width: '90%', maxWidth: '700px', backgroundColor: '#FFF', padding: '20px', borderRadius: '12px', marginTop: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>縮放</span>
            <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ flex: 1 }} />
            <button onClick={() => { setImageSrc(null); setSelectedFile(null); }} style={{ padding: '10px 20px', backgroundColor: '#F5EBEB', color: '#A05C5C', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>取消</button>
            <button onClick={handleConfirm} disabled={isProcessing} style={{ padding: '10px 24px', backgroundColor: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>{isProcessing ? '處理中...' : '確認上傳'}</button>
          </div>
        </div>
      )}
    </>
  );
}