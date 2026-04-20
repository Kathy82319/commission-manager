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
  maxWidth?: number; 
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
    quality = 0.8,
    maxWidth = 0 
  } = options;

  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('無法建立 Canvas 內容');
  }

  let scale = 1;
  if (maxWidth > 0 && pixelCrop.width > maxWidth) {
    scale = maxWidth / pixelCrop.width;
  }

  canvas.width = pixelCrop.width * scale;
  canvas.height = pixelCrop.height * scale;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  if (withWatermark) {
    ctx.save();
    
    const fontSize = Math.floor(canvas.width / 12); 
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'; // 半透明白色
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;

    const stepX = fontSize * 5; 
    const stepY = fontSize * 4;

    for (let x = 0; x <= canvas.width + stepX; x += stepX) {
      for (let y = 0; y <= canvas.height + stepY; y += stepY) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((-30 * Math.PI) / 180);
        ctx.fillText(watermarkText, 0, 0);
        ctx.restore();
      }
    }
    
    ctx.restore();
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