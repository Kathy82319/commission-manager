
-- 0. 清除舊有資料表 (請嚴格按照此順序，避免外鍵衝突)
DROP TABLE IF EXISTS Messages;
DROP TABLE IF EXISTS Attachments;
DROP TABLE IF EXISTS Milestones; -- 這是我們上一版舊的表，一併刪除
DROP TABLE IF EXISTS Commissions;
DROP TABLE IF EXISTS CommissionTypes;
DROP TABLE IF EXISTS ArtistProfiles;
DROP TABLE IF EXISTS Artists; -- 這是我們上一版舊的表，一併刪除
DROP TABLE IF EXISTS Users;

-- ==========================================
-- 以下保留您剛剛貼上的 CREATE TABLE 語法不要動
-- 1. 系統使用者表 (Users) 
-- 整合繪師與委託人的 LINE 登入資訊
CREATE TABLE Users (
    id TEXT PRIMARY KEY,
    line_id TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'artist' 或 'client'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 繪師專屬設定表 (ArtistProfiles)
-- 儲存僅限繪師擁有的商業設定
CREATE TABLE ArtistProfiles (
    user_id TEXT PRIMARY KEY,
    tos_content TEXT,
    is_accepting_commissions INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

-- 3. 服務項目表 (CommissionTypes)
CREATE TABLE CommissionTypes (
    id TEXT PRIMARY KEY,
    artist_id TEXT NOT NULL,
    name TEXT NOT NULL,
    base_price INTEGER NOT NULL,
    estimated_days INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (artist_id) REFERENCES Users(id)
);

-- 4. 委託單 / 報價單主表 (Commissions)
-- 實作 Quote-to-Order 邏輯與 7 階段狀態機
CREATE TABLE Commissions (
    id TEXT PRIMARY KEY,
    artist_id TEXT NOT NULL,
    client_id TEXT, -- 初期可能為空，待委託人點擊專屬連結登入後綁定
    type_id TEXT NOT NULL,
    
    -- 財務與合約
    total_price INTEGER,
    is_paid INTEGER DEFAULT 0, -- 獨立的付款確認勾選框 (0:未付, 1:已付)
    agreed_tos_snapshot TEXT,
    
    -- 狀態控制
    status TEXT NOT NULL, -- 例：'quote_created', 'form_submitted', 'wip_sketch', 'completed' 等
    
    -- 筆記與排程
    artist_note TEXT, -- 繪師專屬筆記本 (委託人不可見)
    due_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (artist_id) REFERENCES Users(id),
    FOREIGN KEY (client_id) REFERENCES Users(id),
    FOREIGN KEY (type_id) REFERENCES CommissionTypes(id)
);

-- 5. 獨立附件管理表 (Attachments)
-- 取代舊的 Milestones，統一管理設定集、草稿預覽、完稿原檔與 PDF
CREATE TABLE Attachments (
    id TEXT PRIMARY KEY,
    commission_id TEXT NOT NULL,
    uploader_id TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'reference' (設定集), 'preview' (草稿/浮水印圖), 'final_source' (原檔)
    r2_key TEXT NOT NULL,
    is_locked INTEGER DEFAULT 0, -- 用於完稿大檔，結案前保持鎖定 (1:鎖定, 0:解鎖)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (commission_id) REFERENCES Commissions(id),
    FOREIGN KEY (uploader_id) REFERENCES Users(id)
);

-- 6. 專屬聊天室訊息表 (Messages)
-- 後端需實作攔截：Commissions.status 必須達到指定階段才允許寫入
CREATE TABLE Messages (
    id TEXT PRIMARY KEY,
    commission_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (commission_id) REFERENCES Commissions(id),
    FOREIGN KEY (sender_id) REFERENCES Users(id)
);