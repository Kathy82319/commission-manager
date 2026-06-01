// src/utils/workspaceHelpers.tsx
import React from 'react';

export const R2_PUBLIC_URL = "https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev";

export const formatLocalTime = (dateStr: string): string => {
  if (!dateStr) return '';
  const utcStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  const date = new Date(utcStr);
  const datePart = date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
  const timePart = date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${datePart} ${timePart}`;
};

export const silentCompressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIMENSION = 1600;
        let { width, height } = img;

        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('壓縮失敗'));
          },
          'image/jpeg',
          0.82
        );
      };
      img.onerror = () => reject(new Error('圖片解析失敗'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('檔案讀取失敗'));
    reader.readAsDataURL(file);
  });
};

export const renderMessageContent = (content: string): React.ReactNode => {
  const imgRegex = /!\[image\]\((.*?)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = imgRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={lastIndex}>{content.substring(lastIndex, match.index)}</span>);
    }
    const imgUrl = match[1];
    const fullUrl = imgUrl.startsWith('http') ? imgUrl : `${R2_PUBLIC_URL}/${imgUrl}`;
    parts.push(
      <div key={match.index} style={{ margin: '8px 0' }}>
        <img
          src={fullUrl}
          alt="chat-upload"
          style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '8px', cursor: 'zoom-in', display: 'block', border: '1px solid rgba(0,0,0,0.1)' }}
          onClick={() => window.open(fullUrl, '_blank')}
        />
      </div>
    );
    lastIndex = imgRegex.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push(<span key={lastIndex}>{content.substring(lastIndex)}</span>);
  }
  return parts.length > 0 ? parts : content;
};
