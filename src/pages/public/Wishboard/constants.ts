// src/pages/public/Wishboard/constants.ts

export const REQ_TAGS = [
  '不限', '頭貼', '半身', '全身', 'Q圖', '韓式', '日式', '美式', 
  '夢向', '黑白', '單人', '雙人', '背景', '立繪', '厚塗', '塗鴉', 
  '插圖', '服設', '包時'
];

export const PAY_TAGS = [
  '皆可配合', '無卡', '匯款', '空包', '超商'
];

// 🌟 新增：風格預警與授權標籤
export const STYLE_WARNINGS = ['會有雜線', '會有溢色', '不接受指定動作', '不接受指定背景', '風格較陰沈'];
export const LICENSE_TAGS = ['接受商用', '接受二改/液化', '作品將作為範例展示'];

// 🌟 新增：支付時機選項
export const PAYMENT_TIMING = [
  { label: '全額預付', value: 'prepaid' },
  { label: '訂金制', value: 'deposit' },
  { label: '其他', value: 'other' }
];

export const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
export const R2_PUBLIC_URL = "https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev"; 