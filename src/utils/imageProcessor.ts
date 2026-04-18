// src/utils/imageProcessor.ts

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
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
  quality?: number;
}

/**
 * 核心：根據裁切範圍擷取圖片，並加上全圖平鋪浮水印
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

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // 1. 繪製原始裁切圖片
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

  // 2. 強化浮水印：全圖平鋪邏輯
  if (withWatermark) {
    // 建立一個小的離屏 Canvas 作為平鋪單元 (Tile)
    const fontSize = Math.max(16, Math.floor(pixelCrop.width / 20)); // 動態計算字體大小
    const tileCanvas = document.createElement('canvas');
    const tileCtx = tileCanvas.getContext('2d');

    if (tileCtx) {
      // 設定平鋪單元的尺寸，寬度根據文字長度動態調整
      const textWidth = tileCtx.measureText(watermarkText).width + fontSize * 5;
      const tileWidth = textWidth || 200; 
      const tileHeight = tileWidth * 0.6; // 保持比例
      
      tileCanvas.width = tileWidth;
      tileCanvas.height = tileHeight;

      // 在 Tile 上繪製傾斜文字
      tileCtx.fillStyle = 'rgba(255, 255, 255, 0.25)'; // 更淡的透明度，避免遮擋細節
      tileCtx.font = `bold ${fontSize}px sans-serif`;
      tileCtx.textAlign = 'center';
      tileCtx.textBaseline = 'middle';
      
      tileCtx.translate(tileWidth / 2, tileHeight / 2);
      tileCtx.rotate((-30 * Math.PI) / 180); // 旋轉 -30 度
      
      // 加上陰影增加可讀性
      tileCtx.shadowColor = 'rgba(0,0,0,0.2)';
      tileCtx.shadowBlur = 4;
      tileCtx.fillText(watermarkText, 0, 0);

      // 使用 createPattern 將 Tile 重複填充至主畫布
      const pattern = ctx.createPattern(tileCanvas, 'repeat');
      if (pattern) {
        ctx.save();
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, canvas.width, canvas.height); // 填滿整個畫布
        ctx.restore();
      }
    }
  }

  // 3. 輸出 Blob
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