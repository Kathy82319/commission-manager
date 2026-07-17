// src/pages/artist/Settings/blockContent.ts
import type { ContentBlock } from './types';

export const BLOCK_TYPE_META: Record<ContentBlock['type'], { label: string }> = {
  'text': { label: '純文字段落' },
  'image-left': { label: '圖文並排（圖在左）' },
  'image-right': { label: '圖文並排（圖在右）' },
  'image': { label: '純圖片' },
};

// 舊資料是單一段 HTML 字串；新格式是 JSON 序列化的區塊陣列。
// 讀取時如果不是合法的區塊陣列，就把整段舊內容包成一個文字區塊，避免資料遺失。
export function parseBlocks(raw?: string): ContentBlock[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(b => b && typeof b === 'object' && typeof b.type === 'string')) {
      return parsed as ContentBlock[];
    }
  } catch {
    // 不是 JSON，代表是舊版的 HTML 內容
  }
  return [{ id: `legacy_${Date.now()}`, type: 'text', body: raw }];
}

export function serializeBlocks(blocks: ContentBlock[]): string {
  return JSON.stringify(blocks);
}

export function createEmptyBlock(type: ContentBlock['type']): ContentBlock {
  const id = `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  if (type === 'text') return { id, type, title: '', body: '' };
  if (type === 'image') return { id, type, caption: '' };
  return { id, type, title: '', body: '', caption: '' };
}
