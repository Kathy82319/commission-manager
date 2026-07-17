import type { QueueSettings } from './QueueSettingsTab';

export interface ContentBlock {
  id: string;
  type: 'text' | 'image-left' | 'image-right' | 'image';
  title?: string;
  body?: string;
  image_url?: string;
  caption?: string;
  background_color?: string;
  background_opacity?: number;
}

export interface ProfileSettings {
  portfolio: string[];
  detailed_intro: string; 
  process: string;
  payment: string;
  rules: string;
  custom_sections: { id: string; title: string; content: string }[];
  social_links: { platform: string; url: string }[]; 
  hidden_sections: string[]; 
  splash_enabled: boolean;
  splash_image: string;
  splash_image_mobile?: string;
  splash_duration: number;
  splash_text: string;
  layout_type?: 'blog' | 'gallery';
  background_color?: string;
  gradient_enabled?: boolean;
  secondary_color?: string;
  theme_mode?: 'light' | 'dark';
  gradient_direction?: string;
  showcase_label?: string;
  portfolio_label?: string;
  detailed_intro_label?: string;
  queue_label?: string;
  reviews_label?: string;
  show_favorite_count?: boolean;
  portfolio_layout?: 'grid' | 'masonry';
  portfolio_blurred?: boolean;
}

export interface CompleteSettings {
  portfolio: string[];
  detailed_intro: string;
  rules: string;
  custom_sections: any[];
  social_links: any[];
  hidden_sections: string[];
  splash_enabled: boolean;
  splash_image: string;
  splash_duration: number;
  splash_text: string;
  layout_type: string;
  background_color: string;
  gradient_direction: string;
  theme_mode: string;
  showcase_label: string;
  portfolio_label: string;
  detailed_intro_label: string;
  queue_label: string;
  reviews_label: string;
  bulletin_card: { specialties: string; no_gos: string; payment_methods: string; price_list: string };
  question_template: string;
  queue_settings: QueueSettings;
  tab_order: string[];
  show_favorite_count: boolean;
  portfolio_layout: 'grid' | 'masonry';
  portfolio_blurred: boolean;
}

export interface QuotaInfo {
  plan_type: string; 
  used_quota: number; 
  max_quota: number; 
  trial_start_at?: string; 
  trial_end_at?: string; 
  pro_expires_at?: string;
}

export interface FormDataState {
  display_name: string;
  avatar_url: string;
  bio: string;
}