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

  // 設定 Canvas 尺寸為使用者裁切的尺寸
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

  // 2. 如果需要浮水印，依照您的原始版本邏輯擴充為「全圖平鋪」
  if (withWatermark) {
    ctx.save();
    
    // 設定浮水印樣式 (沿用您的參數，稍微調小字體以利平鋪美觀)
    const fontSize = Math.floor(pixelCrop.width / 12); 
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'; // 半透明白色
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 加上陰影
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;

    // 定義平鋪間距
    const stepX = fontSize * 5; 
    const stepY = fontSize * 4;

    // 🌟 使用雙層迴圈直接在畫布上重複繪製
    for (let x = 0; x <= canvas.width + stepX; x += stepX) {
      for (let y = 0; y <= canvas.height + stepY; y += stepY) {
        ctx.save();
        // 移動到格點並旋轉 -30 度
        ctx.translate(x, y);
        ctx.rotate((-30 * Math.PI) / 180);
        ctx.fillText(watermarkText, 0, 0);
        ctx.restore();
      }
    }
    
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