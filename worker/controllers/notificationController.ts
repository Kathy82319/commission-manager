// worker/controllers/notificationController.ts
import type { Env } from "../shared/types";

// 確保輸出給前端的時間格式是標準 ISO UTC 格式
const formatOutputTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return new Date().toISOString();
  if (dateStr.includes('Z')) return dateStr;
  return dateStr.includes('T') ? dateStr + 'Z' : dateStr.replace(' ', 'T') + 'Z';
};

export const notificationController = {
  
  // ==========================================
  // 內部工具：給其他 Controller 呼叫來「發送通知」
  // ==========================================
  async createNotification(env: Env, userId: string, type: string, text: string, linkUrl: string) {
    try {
      const id = crypto.randomUUID();
      // 🌟 核心修復：對齊你資料庫真實的欄位名稱 (title, content, link_to)
      await env.commission_db.prepare(`
        INSERT INTO Notifications (id, user_id, type, title, content, link_to, is_read) 
        VALUES (?, ?, ?, '系統通知', ?, ?, 0)
      `).bind(id, userId, type, text, linkUrl).run();
    } catch (e) {
      console.error("發送通知失敗:", e);
    }
  },

  // ==========================================
  // 1. 取得使用者的所有通知 (給小鈴鐺下拉選單用)
  // ==========================================
  async getNotifications(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      // 1. 算未讀數量
      const countRes = await env.commission_db.prepare(`
        SELECT COUNT(*) as count FROM Notifications 
        WHERE user_id = ? AND is_read = 0
      `).bind(currentUserId).first();
      const unreadCount = (countRes?.count as number) || 0;

      // 2. 撈取最新的 15 筆通知 (🌟 修正：撈取 content 和 link_to)
      const { results } = await env.commission_db.prepare(`
        SELECT id, type, title, content, link_to, created_at, is_read 
        FROM Notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 15
      `).bind(currentUserId).all();

      // 3. 格式化給前端
      const notifications = results.map((n: any) => ({
        id: n.id,
        type: n.type,
        // 🌟 這裡負責把後端的 content 轉成前端畫面預期的 text
        text: n.content, 
        link: n.link_to, 
        time: formatOutputTime(n.created_at),
        isUnread: n.is_read === 0
      }));

      return new Response(JSON.stringify({ 
        success: true, 
        unreadCount, 
        notifications 
      }), { headers: corsHeaders });

    } catch (error: any) {
      console.error("讀取通知失敗:", error.message);
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // ==========================================
  // 2. 取得未讀數量 (專門給畫面右上角的紅點用)
  // ==========================================
  async getUnreadCount(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const countRes = await env.commission_db.prepare(`
        SELECT COUNT(*) as count FROM Notifications 
        WHERE user_id = ? AND is_read = 0
      `).bind(currentUserId).first();
      
      const count = (countRes?.count as number) || 0;

      return new Response(JSON.stringify({ success: true, count }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, count: 0, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // ==========================================
  // 3. 全部標示為已讀
  // ==========================================
  async markAsRead(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      await env.commission_db.prepare(`
        UPDATE Notifications 
        SET is_read = 1 
        WHERE user_id = ? AND is_read = 0
      `).bind(currentUserId).run();

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  }
};