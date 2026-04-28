// worker/controllers/notificationController.ts
import type { Env } from "../shared/types";

// 🌟 新增：定義通知物件的型別，解決 implicit 'any[]' 錯誤
interface NotificationItem {
  id: string;
  type: string;
  text: string;
  link: string;
  time: string;
}

export const notificationController = {
  async getNotifications(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const url = new URL(request.url);
      const role = url.searchParams.get('role') || 'client';
      
      // 🌟 修正：明確宣告這是一個裝載 NotificationItem 的陣列
      const notifications: NotificationItem[] = [];
      let unreadCount = 0;

      if (role === 'client') {
        // 1. 取得許願池未讀通知 (案主視角)
        const { results: inboxResults } = await env.commission_db.prepare(`
          SELECT b.title, i.id, i.latest_update_at 
          FROM BulletinInquiries i
          JOIN Bulletins b ON i.bulletin_id = b.id
          WHERE b.client_id = ? AND i.status != 'cancelled'
          AND (i.latest_update_at > IFNULL(i.last_read_at_client, '1970-01-01 00:00:00') OR i.last_read_at_client IS NULL)
        `).bind(currentUserId).all();

        inboxResults.forEach((item: any) => {
          unreadCount++;
          notifications.push({
            id: `inquiry_${item.id}`,
            type: 'inquiry',
            text: `您的許願「${item.title || '未命名'}」有新提案或新訊息`,
            link: '/client/inbox',
            time: item.latest_update_at
          });
        });

        // 2. 取得正式委託單通知 (案主視角)
        const { results: commResults } = await env.commission_db.prepare(`
          SELECT id, project_name, pending_changes, latest_message_at, last_read_at_client 
          FROM Commissions 
          WHERE client_id = ? AND status != 'cancelled'
        `).bind(currentUserId).all();

        commResults.forEach((order: any) => {
          if (order.pending_changes) {
            unreadCount++;
            notifications.push({
              id: `comm_change_${order.id}`,
              type: 'commission_change',
              text: `委託單「${order.project_name || order.id}」有合約異動申請`,
              link: `/workspace/${order.id}`,
              time: order.latest_message_at || new Date().toISOString()
            });
          }
          const latestTime = new Date(order.latest_message_at || 0).getTime();
          const readTime = new Date(order.last_read_at_client || 0).getTime();
          if (latestTime > readTime) {
            unreadCount++;
            notifications.push({
              id: `comm_msg_${order.id}`,
              type: 'commission_msg',
              text: `委託單「${order.project_name || order.id}」有新訊息`,
              link: `/workspace/${order.id}`,
              time: order.latest_message_at
            });
          }
        });

      } else {
        // 留作未來擴充繪師 (artist) 視角的通知邏輯
      }

      // 依時間排序 (最新在最上面)，並限制最多回傳 20 筆
      notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      const topNotifications = notifications.slice(0, 20);

      return new Response(JSON.stringify({ 
        success: true, 
        unreadCount, 
        notifications: topNotifications 
      }), { headers: corsHeaders });

    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  }
};