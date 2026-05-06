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

-- 3. 服務項目表
CREATE TABLE CommissionTypes (
    id TEXT PRIMARY KEY,
    artist_id TEXT NOT NULL,
    name TEXT NOT NULL,
    base_price INTEGER NOT NULL,
    estimated_days INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (artist_id) REFERENCES Users(id)
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


-- 許願池布告欄
CREATE TABLE Bulletins (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    content TEXT NOT NULL,       
    budget_range TEXT,            
    specs TEXT,                    
    ref_image_key TEXT,            
    status TEXT DEFAULT 'open',    
    expires_at DATETIME,           
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES Users(id)
);

-- 意向投遞與洽談紀錄
CREATE TABLE BulletinInquiries (
    id TEXT PRIMARY KEY,
    bulletin_id TEXT NOT NULL,
    artist_id TEXT NOT NULL,
    artist_snapshot TEXT,          
    client_response TEXT,         
    status TEXT DEFAULT 'pending', 
    decline_reason TEXT,          
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bulletin_id) REFERENCES Bulletins(id),
    FOREIGN KEY (artist_id) REFERENCES Users(id)
);

-- 收件匣通知系統
CREATE TABLE Notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT,                    
    title TEXT,
    content TEXT,
    link_to TEXT,               
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

ALTER TABLE ArtistProfiles ADD COLUMN question_template TEXT DEFAULT '';

ALTER TABLE Bulletins ADD COLUMN category TEXT DEFAULT 'request';

-- 「還沒成單前」的聊天紀錄
CREATE TABLE InquiryMessages (
  id TEXT PRIMARY KEY,
  inquiry_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inquiry_id) REFERENCES BulletinInquiries(id)
);

-- 增加草稿欄位
ALTER TABLE BulletinInquiries ADD COLUMN negotiation_draft TEXT; 
ALTER TABLE Commissions ADD COLUMN origin_source TEXT;
ALTER TABLE BulletinInquiries ADD COLUMN last_read_at_client DATETIME DEFAULT NULL;
ALTER TABLE BulletinInquiries ADD COLUMN last_read_at_artist DATETIME DEFAULT NULL;
ALTER TABLE BulletinInquiries ADD COLUMN latest_update_at DATETIME DEFAULT NULL;

-- 1. 為 Bulletins 擴充詳細欄位
ALTER TABLE Bulletins ADD COLUMN title TEXT DEFAULT '';         
ALTER TABLE Bulletins ADD COLUMN tags TEXT DEFAULT '[]';          
ALTER TABLE Bulletins ADD COLUMN payment_methods TEXT DEFAULT '[]'; 
ALTER TABLE Bulletins ADD COLUMN budget_min INTEGER DEFAULT 0; 
ALTER TABLE Bulletins ADD COLUMN budget_max INTEGER DEFAULT 0;  
ALTER TABLE Bulletins ADD COLUMN schedule_type TEXT DEFAULT 'flexible';
ALTER TABLE Bulletins ADD COLUMN specific_date DATETIME;     

-- 使用者關係表 (收藏/黑名單)
CREATE TABLE UserRelations (
    id TEXT PRIMARY KEY,
    source_user_id TEXT NOT NULL,  
    target_user_id TEXT NOT NULL, 
    relation_type TEXT NOT NULL,  
    custom_note TEXT DEFAULT '',   
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_user_id) REFERENCES Users(id),
    FOREIGN KEY (target_user_id) REFERENCES Users(id),
    UNIQUE(source_user_id, target_user_id) 
);

-- 1. 擴充 Users 表
ALTER TABLE Users ADD COLUMN wishboard_status TEXT DEFAULT 'active';
ALTER TABLE Users ADD COLUMN mute_expires_at DATETIME;

-- 2. 建立監控關鍵字表
CREATE TABLE MonitoredKeywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bulletin_id TEXT NOT NULL,
    reporter_id TEXT NOT NULL,
    reporter_role TEXT NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bulletin_id) REFERENCES Bulletins(id)
);

-- 為檢舉表建立索引，加速權重計算
CREATE INDEX idx_reports_bulletin ON Reports(bulletin_id);

ALTER TABLE Users ADD COLUMN admin_note TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS Notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,      
    type TEXT NOT NULL,          
    text TEXT NOT NULL,          
    link TEXT NOT NULL,            
    is_read INTEGER DEFAULT 0,  
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引以加快查詢速度
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON Notifications(user_id);


-- ==========================================
-- 5/6後新增的資料庫(正式機還沒有)
-- ==========================================


-- 1. 擴充現有的 ShowcaseItems，加入表單結構欄位
ALTER TABLE ShowcaseItems ADD COLUMN form_schema TEXT DEFAULT '[]';

-- 2. 新增：個人頁直接委託的洽談主表 (DirectInquiries)
CREATE TABLE DirectInquiries (
    id TEXT PRIMARY KEY,
    showcase_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    artist_id TEXT NOT NULL,
    form_answers TEXT NOT NULL,      -- 🔒 委託人填寫的表單結果 (JSON)
    tos_snapshot TEXT,               -- 🔒 委託人送出時同意的 TOS 快照
    negotiation_draft TEXT,          -- 繪師右側白板的最終規格草稿 (JSON)
    status TEXT DEFAULT 'pending',   -- 狀態：pending, proposed, accepted, declined
    last_read_at_artist DATETIME DEFAULT NULL,
    last_read_at_client DATETIME DEFAULT NULL,
    latest_update_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (showcase_id) REFERENCES ShowcaseItems(id),
    FOREIGN KEY (client_id) REFERENCES Users(id),
    FOREIGN KEY (artist_id) REFERENCES Users(id)
);

-- 3. 新增：直接委託專用的聊天訊息表 (DirectInquiryMessages)
CREATE TABLE DirectInquiryMessages (
    id TEXT PRIMARY KEY,
    inquiry_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inquiry_id) REFERENCES DirectInquiries(id),
    FOREIGN KEY (sender_id) REFERENCES Users(id)
);











-- ==========================================
-- 寫入預設開發資料 (Seed Data)
-- ==========================================

INSERT OR IGNORE INTO Users (id, public_id, line_id, display_name, role, plan_type) 
VALUES ('u-artist-01', 'User_48676', 'dummy_line_id_001', '系統預設繪師', 'artist', 'pro');

INSERT OR IGNORE INTO CommissionTypes (id, artist_id, name, base_price, estimated_days) 
VALUES ('type-01', 'u-artist-01', '一般插畫委託', 1000, 14);

--https://cath-commission-manager.pages.dev/api/auth/testing-bypass?userId=u-artist-01
--https://cath-commission-manager.pages.dev/api/auth/testing-bypass?userId=Ue29d02da79b805e9df46bdf6442aa24c
--https://cath-commission-manager.pages.dev/api/auth/testing-bypass?userId=U0342c94360fe25872c7caa43ab588c87

--https://cath-commission-manager.pages.dev/api/auth/testing-bypass?userId=Uc48e198d2f403534b59b7c97c9c30068


--刪除許願池收件匣用
DELETE FROM Notifications;
DELETE FROM InquiryMessages;
DELETE FROM BulletinInquiries;
DELETE FROM Bulletins;

-- 1. 先清空所有依賴於貼文的「檢舉紀錄」
DELETE FROM Reports;
-- 2. 再清空所有依賴於貼文的「投遞/應徵紀錄」
DELETE FROM BulletinInquiries;
-- 3. 最後，既然子資料都清空了，現在可以安全地刪除主表的「貼文」了！
DELETE FROM Bulletins;

