import type { Fetcher, D1Database, R2Bucket } from '@cloudflare/workers-types';

// Cloudflare Worker 的環境變數定義
export interface Env {
  ASSETS: Fetcher;
  commission_db: D1Database;
  ID_SALT: string; 
  LINE_CHANNEL_ID: string;
  LINE_CHANNEL_SECRET: string;
  LINE_REDIRECT_URI: string;
  FRONTEND_URL: string;
  PUBLIC_BUCKET: R2Bucket;
  PRIVATE_BUCKET: R2Bucket;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ACCOUNT_ID?: string; 
  BACKEND_URL: string;
  NEWEBPAY_MERCHANT_ID: string;
  NEWEBPAY_HASH_KEY: string;
  NEWEBPAY_HASH_IV: string;
}

// 建立委託單的請求格式
export interface CreateCommissionBody {
  total_price: number;
  is_external?: boolean;
  client_name?: string;
  project_name: string;
  usage_type: string;
  is_rush: string;
  delivery_method: string;
  payment_method: string;
  draw_scope: string;
  char_count: number;
  bg_type: string;
  add_ons: string;
  detailed_settings: string;
  workflow_mode?: string;
  client_id?: string;
  agreed_tos_snapshot?: string;
}