// worker/shared/types.ts
import type { Fetcher, D1Database, R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  DB: any;
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
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
}

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

export interface ShowcaseItem {
  id: string;
  artist_id: string;
  title: string;
  cover_url: string;
  price_info: string;
  tags: string; 
  description: string;
  is_active: number;
  sort_order: number;
  created_at: string;
  allow_guest: number;
  max_orders: number;
  show_quota: number;
  tos_content: string;
  current_orders_count: number;
}

export interface UpdateNotificationSettingsBody {
  notification_email?: string | null;
  email_art_chat?: number;
  email_art_progress?: number;
  email_art_inbound?: number;
  email_cli_chat?: number;
  email_cli_progress?: number;
  email_cli_bulletin?: number;
}

