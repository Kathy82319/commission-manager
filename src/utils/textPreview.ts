// src/utils/textPreview.ts
// 富文本內容轉純文字摘要，讓後台清單式預覽跟公開頁面的清單式呈現完全一致。

const decodeHTML = (html?: string) => {
  if (!html || typeof html !== 'string') return '';
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
};

export const stripToPreviewText = (html?: string, maxLen = 140) => {
  if (!html || typeof html !== 'string') return '';
  const text = decodeHTML(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
};
