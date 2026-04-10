-- 1. 建立測試使用者 (1位繪師, 2位委託人)
INSERT INTO Users (id, line_id, display_name, role) VALUES 
('u-artist-01', 'line-mock-a1', '測試繪師', 'artist'),
('u-client-01', 'line-mock-c1', '委託人小明', 'client'),
('u-client-02', 'line-mock-c2', '委託人小美', 'client');

-- 2. 建立繪師專屬設定
INSERT INTO ArtistProfiles (user_id, tos_content) VALUES 
('u-artist-01', '這是測試版委託須知：禁止商用、可修改兩次。');

-- 3. 建立服務項目
INSERT INTO CommissionTypes (id, artist_id, name, base_price, estimated_days) VALUES 
('type-01', 'u-artist-01', '全彩日系半身插畫', 2500, 14);

-- 4. 建立測試委託單 (實作 Quote-to-Order 狀態)
-- 訂單 1：小明 (剛建立報價單，尚未匯款)
INSERT INTO Commissions (id, artist_id, client_id, type_id, total_price, is_paid, status, artist_note) VALUES 
('cmd-001', 'u-artist-01', 'u-client-01', 'type-01', 2500, 0, 'quote_created', '這是新接洽的客人，要注意構圖需求。');

-- 訂單 2：小美 (已付款，進入草稿階段)
INSERT INTO Commissions (id, artist_id, client_id, type_id, total_price, is_paid, status, artist_note) VALUES 
('cmd-002', 'u-artist-01', 'u-client-02', 'type-01', 3500, 1, 'wip_sketch', '急件加收 1000，禮拜五前給草稿。');