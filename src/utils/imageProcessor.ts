// src/utils/imageProcessor.ts

// 輔助函式：將網址或 Base64 轉換為 Image 物件
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // 避免 CORS 問題
    image.src = url;
  });

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ProcessOptions {
  withWatermark?: boolean;
  watermarkText?: string;
  outputFormat?: 'image/jpeg' | 'image/webp';
  quality?: number; // 0 到 1 之間
}

/**
 * 核心：根據使用者的裁切範圍，擷取圖片並可選加上浮水印
 */
export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  options: ProcessOptions = {}
): Promise<Blob> {
  const {
    withWatermark = false,
    watermarkText = "SAMPLE",
    outputFormat = 'image/jpeg',
    quality = 0.8
  } = options;

  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('無法建立 Canvas 內容');
  }

  // 設定 Canvas 尺寸為使用者裁切的尺寸 (支援自由比例)
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // 1. 將圖片的「裁切區域」畫到 Canvas 上
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // 2. 如果需要浮水印，加上半透明傾斜文字
  if (withWatermark) {
    ctx.save();
    // 設定浮水印樣式
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // 半透明白色
    ctx.font = `bold ${Math.floor(pixelCrop.width / 8)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 將文字旋轉 -30 度並放在正中間
    ctx.translate(pixelCrop.width / 2, pixelCrop.height / 2);
    ctx.rotate((-30 * Math.PI) / 180);
    
    // 畫出文字 (加上黑色陰影讓它在白底也清楚)
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText(watermarkText, 0, 0);
    
    ctx.restore();
  }

  // 3. 將 Canvas 輸出為 Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas 空白'));
          return;
        }
        resolve(blob);
      },
      outputFormat,
      quality
    );
  });
}