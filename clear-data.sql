-- 關閉外鍵限制 (避免關聯資料刪除順序報錯)
PRAGMA foreign_keys = OFF;

-- 清空所有關聯的交易資料表
DELETE FROM Submissions;
DELETE FROM ActionLogs;
DELETE FROM Messages;
DELETE FROM PaymentRecords;
DELETE FROM Commissions;

-- 重新開啟外鍵限制
PRAGMA foreign_keys = ON;