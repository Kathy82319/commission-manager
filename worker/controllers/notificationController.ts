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
      const notifications: NotificationItem[] = [];
      let unreadCount = 0;

      // ==========================================
      // 1. 撈取「案主身分」的通知
      // ==========================================
      
      // 案主視角：許願池與洽談通知
      const clientInboxQuery = await env.commission_db.prepare(`
        SELECT b.title, i.id, i.latest_update_at, i.last_read_at_client 
        FROM BulletinInquiries i
        JOIN Bulletins b ON i.bulletin_id = b.id
        WHERE b.client_id = ? AND i.status != 'cancelled'
      `).bind(currentUserId).all();

      (clientInboxQuery.results || []).forEach((item: any) => {
        const isUnread = safeParseTime(item.latest_update_at) > safeParseTime(item.last_read_at_client);
        if (isUnread) {
          unreadCount++;
          notifications.push({
            id: `client_inquiry_${item.id}`,
            type: 'inquiry_msg',
            text: `[我是案主] 許願「${item.title || '未命名'}」有新洽談訊息或進度`,
            link: `/inquiry/workspace/${item.id}`, // 🌟 修正：精準跳轉至洽談室
            time: item.latest_update_at
          });
        }
      });

      // 案主視角：正式委託單 (合約異動 & 新聊天訊息)
      const clientCommQuery = await env.commission_db.prepare(`
        SELECT id, project_name, pending_changes, latest_message_at, last_read_at_client 
        FROM Commissions 
        WHERE client_id = ? AND status != 'cancelled'
      `).bind(currentUserId).all();

      (clientCommQuery.results || []).forEach((order: any) => {
        // 案主收到繪師的異動申請 -> 跳轉到列表頁並打開這張單
        if (order.pending_changes) {
          unreadCount++;
          notifications.push({
            id: `client_change_${order.id}`,
            type: 'commission_change',
            text: `[我是案主] 委託單「${order.project_name || order.id}」有合約異動申請`,
            link: `/client/orders?open=${order.id}`,
            time: order.latest_message_at || new Date().toISOString()
          });
        }
        
        // 案主收到聊天室新訊息 -> 跳轉到聊天室
        const hasNewMsg = safeParseTime(order.latest_message_at) > safeParseTime(order.last_read_at_client);
        if (hasNewMsg) {
          unreadCount++;
          notifications.push({
            id: `client_msg_${order.id}`,
            type: 'commission_msg',
            text: `[我是案主] 委託單「${order.project_name || order.id}」有新聊天訊息`,
            link: `/workspace/${order.id}`, 
            time: order.latest_message_at
          });
        }
      });

      // ==========================================
      // 2. 撈取「繪師身分」的通知
      // ==========================================

      // 繪師視角：許願池與洽談通知
      const artistInboxQuery = await env.commission_db.prepare(`
        SELECT b.title, i.id, i.latest_update_at, i.status, i.last_read_at_artist
        FROM BulletinInquiries i
        JOIN Bulletins b ON i.bulletin_id = b.id
        WHERE i.artist_id = ? AND i.status != 'cancelled'
      `).bind(currentUserId).all();

      (artistInboxQuery.results || []).forEach((item: any) => {
        const isUnread = safeParseTime(item.latest_update_at) > safeParseTime(item.last_read_at_artist);
        if (isUnread && item.status !== 'pending') {
          unreadCount++;
          let text = `[我是繪師] 提案「${item.title || '未命名'}」有新洽談訊息或進度`;
          if (item.status === 'submitted') text = `[我是繪師] 案主已回填「${item.title || '未命名'}」的提問單`;
          if (item.status === 'declined') text = `[我是繪師] 提案「${item.title || '未命名'}」已被婉拒`;
          
          notifications.push({
            id: `artist_inquiry_${item.id}`,
            type: 'inquiry_msg',
            text,
            link: `/inquiry/workspace/${item.id}`, // 🌟 修正：精準跳轉至洽談室
            time: item.latest_update_at
          });
        }
      });

      // 繪師視角：正式委託單 (合約異動 & 新聊天訊息)
      const artistCommQuery = await env.commission_db.prepare(`
        SELECT id, project_name, pending_changes, latest_message_at, last_read_at_artist 
        FROM Commissions 
        WHERE artist_id = ? AND status != 'cancelled'
      `).bind(currentUserId).all();

      (artistCommQuery.results || []).forEach((order: any) => {
        // 繪師收到案主同意異動 -> 跳轉到繪師的委託單細項
        if (order.pending_changes) {
          unreadCount++;
          notifications.push({
            id: `artist_change_${order.id}`,
            type: 'commission_change',
            text: `[我是繪師] 委託單「${order.project_name || order.id}」合約異動待處理`,
            link: `/artist/notebook?id=${order.id}&tab=details`, 
            time: order.latest_message_at || new Date().toISOString()
          });
        }

        // 繪師收到聊天室新訊息 -> 跳轉到聊天室
        const hasNewMsg = safeParseTime(order.latest_message_at) > safeParseTime(order.last_read_at_artist);
        if (hasNewMsg) {
          unreadCount++;
          notifications.push({
            id: `artist_msg_${order.id}`,
            type: 'commission_msg',
            text: `[我是繪師] 委託單「${order.project_name || order.id}」有新聊天訊息`,
            link: `/workspace/${order.id}`,
            time: order.latest_message_at
          });
        }
      });

      // 🌟 將雙身分的通知混合，使用時間從新到舊排序
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