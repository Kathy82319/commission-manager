// worker/controllers/notificationController.ts
import type { Env } from "../shared/types";

interface NotificationItem {
  id: string;
  type: string;
  text: string;
  link: string;
  time: string;
}

// 🌟 安全的時間解析函式，確保 SQLite 格式不會讓 Worker 崩潰
const safeParseTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return 0;
  try {
    const utcStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
    const time = new Date(utcStr).getTime();
    return isNaN(time) ? 0 : time;
  } catch (e) {
    return 0;
  }
};

export const notificationController = {
  async getNotifications(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const url = new URL(request.url);
      const role = url.searchParams.get('role') || 'client';
      const notifications: NotificationItem[] = [];
      let unreadCount = 0;

      if (role === 'client') {
        // 案主視角：許願池通知
        const inboxQuery = await env.commission_db.prepare(`
          SELECT b.title, i.id, i.latest_update_at 
          FROM BulletinInquiries i
          JOIN Bulletins b ON i.bulletin_id = b.id
          WHERE b.client_id = ? AND i.status != 'cancelled'
          AND (i.latest_update_at > IFNULL(i.last_read_at_client, '1970-01-01 00:00:00') OR i.last_read_at_client IS NULL)
        `).bind(currentUserId).all();

        (inboxQuery.results || []).forEach((item: any) => {
          unreadCount++;
          notifications.push({
            id: `inquiry_${item.id}`,
            type: 'inquiry',
            text: `您的許願「${item.title || '未命名'}」有新提案或狀態更新`,
            link: '/client/inbox',
            time: item.latest_update_at
          });
        });

        // 案主視角：合約異動通知
        const commQuery = await env.commission_db.prepare(`
          SELECT id, project_name, pending_changes, latest_message_at 
          FROM Commissions 
          WHERE client_id = ? AND status != 'cancelled'
        `).bind(currentUserId).all();

        (commQuery.results || []).forEach((order: any) => {
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
        // 繪師視角：許願池通知 (排除待審閱階段，僅顯示案主回覆或婉拒)
        const artistInboxQuery = await env.commission_db.prepare(`
          SELECT b.title, i.id, i.latest_update_at, i.status, i.last_read_at_artist
          FROM BulletinInquiries i
          JOIN Bulletins b ON i.bulletin_id = b.id
          WHERE i.artist_id = ? AND i.status != 'cancelled'
          AND (
            (i.latest_update_at > IFNULL(i.last_read_at_artist, '1970-01-01 00:00:00'))
            OR (i.last_read_at_artist IS NULL AND i.status != 'pending')
          )
        `).bind(currentUserId).all();

        (artistInboxQuery.results || []).forEach((item: any) => {
          unreadCount++;
          let text = `您的提案「${item.title || '未命名'}」有新進度`;
          if (item.status === 'submitted') text = `案主已回填「${item.title || '未命名'}」的提問單`;
          if (item.status === 'declined') text = `提案「${item.title || '未命名'}」已被婉拒`;
          
          notifications.push({
            id: `inquiry_${item.id}`,
            type: 'inquiry',
            text,
            link: '/artist/inbox',
            time: item.latest_update_at
          });
        });

        // 繪師視角：合約異動通知
        const artistCommQuery = await env.commission_db.prepare(`
          SELECT id, project_name, pending_changes, latest_message_at 
          FROM Commissions 
          WHERE artist_id = ? AND status != 'cancelled'
        `).bind(currentUserId).all();

        (artistCommQuery.results || []).forEach((order: any) => {
          if (order.pending_changes) {
            unreadCount++;
            notifications.push({
              id: `comm_change_${order.id}`,
              type: 'commission_change',
              text: `委託單「${order.project_name || order.id}」有新的合約異動`,
              link: `/workspace/${order.id}`,
              time: order.latest_message_at || new Date().toISOString()
            });
          }
        });
      }

      // 🌟 使用安全排序
      notifications.sort((a, b) => safeParseTime(b.time) - safeParseTime(a.time));
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