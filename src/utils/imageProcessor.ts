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

  if (!ctx) throw new Error('無法建立 Canvas 內容');

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

  // 2. 強化浮水印：全圖平鋪邏輯 (修正 Context 重置問題)
  if (withWatermark) {
    const fontSize = Math.max(20, Math.floor(pixelCrop.width / 15)); 
    const tileCanvas = document.createElement('canvas');
    const tileCtx = tileCanvas.getContext('2d');

    if (tileCtx) {
      // 🌟 重要：先暫時設定字體以進行精確測量
      tileCtx.font = `bold ${fontSize}px sans-serif`;
      const metrics = tileCtx.measureText(watermarkText);
      
      // 設定單個浮水印單元的尺寸 (留出足夠間距)
      const tileWidth = metrics.width + fontSize * 4;
      const tileHeight = fontSize * 5; 
      
      tileCanvas.width = tileWidth;
      tileCanvas.height = tileHeight;

      // 🌟 核心修正：改變畫布寬高後，必須「重新設定」Context 狀態
      tileCtx.font = `bold ${fontSize}px sans-serif`;
      tileCtx.fillStyle = 'rgba(255, 255, 255, 0.3)'; // 提高一點透明度確保可見
      tileCtx.textAlign = 'center';
      tileCtx.textBaseline = 'middle';
      
      // 設定陰影，增加在亮色背景下的辨識度
      tileCtx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      tileCtx.shadowBlur = 4;

      // 繪製文字
      tileCtx.translate(tileWidth / 2, tileHeight / 2);
      tileCtx.rotate((-25 * Math.PI) / 180);
      tileCtx.fillText(watermarkText, 0, 0);

      // 建立平鋪圖案並填充至主畫布
      const pattern = ctx.createPattern(tileCanvas, 'repeat');
      if (pattern) {
        ctx.save();
        ctx.fillStyle = pattern;
        // 使用 fillRect 覆蓋全圖
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }
  }

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