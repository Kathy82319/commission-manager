-- ==========================================
-- 建立資料表結構
-- ==========================================

-- 1. 系統使用者表 (🌟 修改重點：新增訂閱相關欄位)
CREATE TABLE Users (
    id TEXT PRIMARY KEY,
    public_id TEXT UNIQUE,
    line_id TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    avatar_url TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    profile_settings TEXT DEFAULT '{}',
    -- 🌟 訂閱制核心欄位
    plan_type TEXT DEFAULT 'free', -- 'free', 'trial', 'pro'
    trial_start_at DATETIME,       -- 試用開始時間
    trial_end_at DATETIME,         -- 試用結束時間
    pro_expires_at DATETIME        -- Pro版到期時間
);

-- 2. 繪師專屬設定表
CREATE TABLE ArtistProfiles (
    user_id TEXT PRIMARY KEY,
    tos_content TEXT DEFAULT '',
    about_me TEXT DEFAULT '',
    portfolio_urls TEXT DEFAULT '[]',
    commission_process TEXT DEFAULT '',
    payment_info TEXT DEFAULT '',
    usage_rules TEXT DEFAULT '',
    custom_1_title TEXT DEFAULT '',
    custom_1_content TEXT DEFAULT '',
    custom_2_title TEXT DEFAULT '',
    custom_2_content TEXT DEFAULT '',
    custom_3_title TEXT DEFAULT '',
    custom_3_content TEXT DEFAULT '',
    is_accepting_commissions INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);


-- 4. 委託單主表
CREATE TABLE Commissions (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    artist_id TEXT NOT NULL,
    type_id TEXT NOT NULL,
    total_price INTEGER NOT NULL DEFAULT 0 CHECK (total_price >= 0),
    status TEXT NOT NULL DEFAULT 'quote_created' 
        CHECK (status IN ('quote_created', 'unpaid', 'paid', 'completed', 'cancelled')),
    payment_status TEXT DEFAULT 'unpaid',
    current_stage TEXT DEFAULT 'sketch_drawing',
    last_read_at_artist DATETIME DEFAULT CURRENT_TIMESTAMP, 
    last_read_at_client DATETIME DEFAULT CURRENT_TIMESTAMP, 
    artist_note TEXT DEFAULT '',
    contact_memo TEXT DEFAULT '',
    is_paid INTEGER DEFAULT 0,
    is_external INTEGER DEFAULT 0,
    start_date TEXT,
    end_date TEXT,
    project_name TEXT DEFAULT '',
    usage_type TEXT DEFAULT '',
    is_rush TEXT DEFAULT '否',
    delivery_method TEXT DEFAULT '三階段審閱',
    payment_method TEXT DEFAULT '',
    draw_scope TEXT DEFAULT '',
    char_count INTEGER DEFAULT 1,
    bg_type TEXT DEFAULT '',
    add_ons TEXT DEFAULT '',
    detailed_settings TEXT DEFAULT '',
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    client_custom_title TEXT DEFAULT '',
    pending_changes TEXT,
    agreed_tos_snapshot TEXT,
    workflow_mode TEXT DEFAULT 'standard', 
    queue_status TEXT DEFAULT '',
    FOREIGN KEY (artist_id) REFERENCES Users(id),
    FOREIGN KEY (type_id) REFERENCES CommissionTypes(id)
);

-- 5. 獨立附件管理表
CREATE TABLE Attachments (
    id TEXT PRIMARY KEY,
    commission_id TEXT NOT NULL,
    uploader_id TEXT NOT NULL,
    file_type TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    is_locked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (commission_id) REFERENCES Commissions(id),
    FOREIGN KEY (uploader_id) REFERENCES Users(id)
);

-- 6. 歷程紀錄表
CREATE TABLE ActionLogs (
    id TEXT PRIMARY KEY,
    commission_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action_type TEXT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (commission_id) REFERENCES Commissions(id)
);

-- 7. 檔案交付表
CREATE TABLE Submissions (
    id TEXT PRIMARY KEY,
    commission_id TEXT NOT NULL,
    stage TEXT NOT NULL,
    file_url TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (commission_id) REFERENCES Commissions(id)
);

-- 8. 聊天室訊息表
CREATE TABLE Messages (
    id TEXT PRIMARY KEY,
    commission_id TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (commission_id) REFERENCES Commissions(id)
);

-- 9. 財務記帳表
CREATE TABLE PaymentRecords (
    id TEXT PRIMARY KEY,
    commission_id TEXT NOT NULL,
    record_date TEXT NOT NULL,
    item_name TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (commission_id) REFERENCES Commissions(id)
);

CREATE TABLE PaymentOrders (
  id TEXT PRIMARY KEY,           
  user_id TEXT NOT NULL,        
  amount INTEGER NOT NULL,       
  plan_type TEXT NOT NULL,      
  duration_days INTEGER DEFAULT 30, 
  status TEXT DEFAULT 'pending', 
  trade_no TEXT,                
  pay_time TEXT,                 
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id)
);

-- 10. Webhook 日誌表
CREATE TABLE WebhookLogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ShowcaseItems (
    id TEXT PRIMARY KEY,
    artist_id TEXT NOT NULL,
    title TEXT NOT NULL,
    cover_url TEXT NOT NULL,
    price_info TEXT,
    tags TEXT DEFAULT '[]',
    description TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artist_id) REFERENCES Users(id)
);

CREATE TABLE Blacklist (
    id TEXT PRIMARY KEY,
    artist_id TEXT NOT NULL,
    target_line_id TEXT NOT NULL,
    reason TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artist_id) REFERENCES Users(id)
);

-- 客戶紀錄表
CREATE TABLE CustomerRecords (
    
    id TEXT PRIMARY KEY,
    artist_id TEXT NOT NULL,          
    client_user_id TEXT,            
    public_id TEXT,  
    alias_name TEXT DEFAULT '',       
    custom_label TEXT DEFAULT '一般', 
    short_note TEXT DEFAULT '',      
    full_note TEXT DEFAULT '',       
    contact_methods TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artist_id) REFERENCES Users(id),
    FOREIGN KEY (client_user_id) REFERENCES Users(id)
);



