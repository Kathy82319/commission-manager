// worker/controllers/notificationController.ts
import type { Env } from "../shared/types";

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
            text: `您的許願「${item.title || '未命名'}」有新提案或狀態更新`,
            link: '/client/inbox',
            time: item.latest_update_at
          });
        });

        // 2. 取得正式委託單通知 (案主視角) - 🌟 已排除一般聊天訊息，僅保留合約異動
        const { results: commResults } = await env.commission_db.prepare(`
          SELECT id, project_name, pending_changes, latest_message_at 
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
        });

      } else {
        // 1. 取得許願池未讀通知 (繪師視角)
        const { results: artistInbox } = await env.commission_db.prepare(`
          SELECT b.title, i.id, i.latest_update_at, i.status
          FROM BulletinInquiries i
          JOIN Bulletins b ON i.bulletin_id = b.id
          WHERE i.artist_id = ? AND i.status != 'cancelled'
          AND (
            (i.latest_update_at > IFNULL(i.last_read_at_artist, '1970-01-01 00:00:00'))
            OR (i.last_read_at_artist IS NULL AND i.status != 'pending') 
          )
        `).bind(currentUserId).all();

        artistInbox.forEach((item: any) => {
          unreadCount++;
          let text = `您投遞的許願「${item.title || '未命名'}」有新進度`;
          if (item.status === 'submitted') text = `案主已回填「${item.title || '未命名'}」的提問單`;
          if (item.status === 'declined') text = `您投遞的「${item.title || '未命名'}」已被婉拒`;
          
          notifications.push({
            id: `inquiry_${item.id}`,
            type: 'inquiry',
            text: text,
            link: '/artist/inbox',
            time: item.latest_update_at
          });
        });

        // 2. 取得正式委託單通知 (繪師視角) - 🌟 同樣僅保留合約異動
        const { results: commResults } = await env.commission_db.prepare(`
          SELECT id, project_name, pending_changes, latest_message_at 
          FROM Commissions 
          WHERE artist_id = ? AND status != 'cancelled'
        `).bind(currentUserId).all();

        commResults.forEach((order: any) => {
          if (order.pending_changes) {
            unreadCount++;
            notifications.push({
              id: `comm_change_${order.id}`,
              type: 'commission_change',
              text: `委託單「${order.project_name || order.id}」有來自案主的合約異動申請`,
              link: `/workspace/${order.id}`,
              time: order.latest_message_at || new Date().toISOString()
            });
          }
        });
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