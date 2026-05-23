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
  splash_duration: number;
  splash_text: string;
  layout_type?: 'blog' | 'gallery';
  background_color?: string;
  gradient_enabled?: boolean;
  secondary_color?: string;
  theme_mode?: 'light' | 'dark';
  gradient_direction?: string;
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