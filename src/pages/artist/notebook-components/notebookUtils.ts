// src/pages/artist/notebook-components/notebookUtils.ts

export interface Commission {
  id: string; 
  artist_id: string; 
  client_id: string;
  client_name: string; 
  contact_memo: string; 
  project_name: string; 
  order_date: string;
  total_price: number; 
  payment_status: string; 
  status: string; 
  current_stage: string; 
  is_external: number;
  usage_type: string; 
  is_rush: string; 
  delivery_method: string; 
  payment_method: string;
  draw_scope: string; 
  char_count: number; 
  bg_type: string; 
  add_ons: string; 
  detailed_settings: string;
  pending_changes?: string; 
  workflow_mode: string; 
  queue_status: string;
  type_name?: string; 
  latest_message_at?: string; 
  last_read_at_artist?: string;
  client_public_id?: string;
  agreed_tos_snapshot?: string; 
  client_custom_label?: string;
  crm_record_id?: string;
  origin_source?: string; 
  agreed_memo?: string;
}

export interface PaymentRecord { id: string; record_date: string; item_name: string; amount: number; }
export interface ActionLog { id: string; created_at: string; actor_role: string; action_type: string; content: string; }
export interface Submission { id: string; stage: string; file_url: string; version: number; created_at: string; private_file_key?: string; }

export const unescapeHtml = (str: any) => {
  if (typeof str !== 'string') return str;
  if (!str) return '';
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
};

export const safeParse = (data: any) => {
  if (typeof data !== 'string') return data;
  try {
    const unescaped = unescapeHtml(data);
    if (unescaped.trim().startsWith('{') || unescaped.trim().startsWith('[')) {
      return JSON.parse(unescaped);
    }
    return unescaped;
  } catch (e) {
    return data;
  }
};

export const formatLocalTime = (dateStr: string) => {
  if (!dateStr) return '';
  const utcStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  return new Date(utcStr).toLocaleString('zh-TW', { 
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
};

export const formatLocalDate = (dateStr: string) => {
  if (!dateStr) return '';
  const utcStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  return new Date(utcStr).toLocaleDateString('zh-TW');
};

export const parseTime = (dateStr?: string) => {
  if (!dateStr) return 0;
  return new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z').getTime();
};

export async function compressPreviewBlob(originalBlob: Blob, maxWidth = 800, quality = 0.5): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(originalBlob); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => { resolve(blob || originalBlob); }, 'image/jpeg', quality);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(originalBlob);
  });
}

export const getOriginData = (currentOrder: Commission | null | undefined) => {
  if (!currentOrder || !currentOrder.origin_source) return null;
  try {
    const parsed = safeParse(currentOrder.origin_source);
    if (!parsed) return null;

    if (parsed.source_type === 'showcase_form') {
      return {
        type: 'showcase_form',
        title: parsed.showcase_title || '客製化委託單',
        answers: Array.isArray(parsed.form_answers) ? parsed.form_answers : [],
        ...parsed
      };
    }
    
    if (parsed.source_type === 'bulletin') {
      const isOffer = parsed.bulletin_category === 'offer';
      const bulletinContent = safeParse(parsed.bulletin_content);
      const rawSnapshot = parsed.client_initial_response || parsed.artist_initial_snapshot || parsed.artist_snapshot || '{}';
      const parsedSnapshot = safeParse(rawSnapshot);

      let questions = [];
      if (bulletinContent && bulletinContent.questions) questions = bulletinContent.questions;
      else if (parsed.questions) questions = safeParse(parsed.questions);

      return {
        type: 'bulletin',
        description: bulletinContent?.description || parsed.description || parsed.bulletin_content || '',
        questions: Array.isArray(questions) ? questions : [],
        isOffer,
        parsedSnapshot: typeof parsedSnapshot === 'object' ? parsedSnapshot : { message: parsedSnapshot },
        ...parsed
      };
    }
  } catch (e) {
    console.error("來源解析失敗", e);
  }
  return null;
};