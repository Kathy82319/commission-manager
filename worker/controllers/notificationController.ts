// worker/controllers/notificationController.ts
import type { Env } from "../shared/types";

const formatOutputTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return new Date().toISOString();
  if (dateStr.includes('Z')) return dateStr;
  return dateStr.includes('T') ? dateStr + 'Z' : dateStr.replace(' ', 'T') + 'Z';
};

export const notificationController = {
  
  async createNotification(env: Env, userId: string, type: string, text: string, linkUrl: string) {
    // 防呆處理：防止 undefined 傳入 D1 造成整個 Worker 崩潰
    const safeUserId = userId ?? '';
    const safeType = type ?? 'system';
    const safeText = text ?? '';
    const safeLinkUrl = linkUrl ?? '';

    try {
      // 【防抖邏輯實作】
      const existingNotif = await env.commission_db.prepare(`
        SELECT id FROM Notifications 
        WHERE user_id = ? AND link_to = ? AND is_read = 0
      `).bind(safeUserId, safeLinkUrl).first<{ id: string }>();

      if (existingNotif) {
        // 如果已經存在未讀通知，只更新它的時間戳記與內容
        await env.commission_db.prepare(`
          UPDATE Notifications 
          SET created_at = CURRENT_TIMESTAMP, content = ? 
          WHERE id = ?
        `).bind(safeText, existingNotif.id).run();
      } else {
        // 如果不存在，才新增一筆全新的通知 (恢復原本的 INSERT 結構，移除 explicit created_at 以防 Schema 報錯)
        const id = crypto.randomUUID();
        await env.commission_db.prepare(`
          INSERT INTO Notifications (id, user_id, type, title, content, link_to, is_read) 
          VALUES (?, ?, ?, '系統通知', ?, ?, 0)
        `).bind(id, safeUserId, safeType, safeText, safeLinkUrl).run();
      }
    } catch (e) {
      console.error("發送通知(含防抖)失敗，啟動降級方案:", e);
      // Fallback 方案：如果上面的防抖因為 DB Schema 不支援而失敗，退回最原始且保證成功的寫入方式
      try {
        const id = crypto.randomUUID();
        await env.commission_db.prepare(`
          INSERT INTO Notifications (id, user_id, type, title, content, link_to, is_read) 
          VALUES (?, ?, ?, '系統通知', ?, ?, 0)
        `).bind(id, safeUserId, safeType, safeText, safeLinkUrl).run();
      } catch (fallbackErr) {
        console.error("降級方案寫入失敗:", fallbackErr);
      }
    }
  },

  async getNotifications(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const countRes = await env.commission_db.prepare(`
        SELECT COUNT(*) as count FROM Notifications 
        WHERE user_id = ? AND is_read = 0
      `).bind(currentUserId).first();
      const unreadCount = (countRes?.count as number) || 0;

      const { results } = await env.commission_db.prepare(`
        SELECT id, type, title, content, link_to, created_at, is_read 
        FROM Notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 15
      `).bind(currentUserId).all();

      const notifications = results.map((n: any) => ({
        id: n.id,
        type: n.type,
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