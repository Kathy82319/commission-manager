// worker/controllers/notificationController.ts
import type { Env } from "../shared/types";

interface NotificationItem {
  id: string;
  type: string;
  text: string;
  link: string;
  time: string;
  isUnread: boolean; // 🌟 新增：讓前端知道這則是否為未讀
}

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
      
      const clientInboxQuery = await env.commission_db.prepare(`
        SELECT b.title, i.id, i.latest_update_at, i.last_read_at_client, i.status, i.decline_reason 
        FROM BulletinInquiries i
        JOIN Bulletins b ON i.bulletin_id = b.id
        WHERE b.client_id = ? AND i.status != 'cancelled'
      `).bind(currentUserId).all();

      (clientInboxQuery.results || []).forEach((item: any) => {
        const isUnread = safeParseTime(item.latest_update_at) > safeParseTime(item.last_read_at_client);
        
        // 🌟 即使已讀，我們也把最近更新的紀錄抓出來，前端才能固定顯示 5 則
        let text = `🌟 關於許願「${item.title || '未命名'}」，您有新的洽談進度！`;
        let linkUrl = `/inquiry/workspace/${item.id}`;

        if (item.status === 'pending') {
          text = `🌟 您的許願「${item.title || '未命名'}」收到了新提案！`;
          linkUrl = '/client/inbox';
        } else if (item.status === 'declined') {
          text = `🌟 繪師已撤回針對「${item.title || '未命名'}」的提案。`;
          linkUrl = '/client/inbox'; // 🌟 避免進入死胡同
        }

        if (isUnread) unreadCount++;
        
        notifications.push({
          id: `client_inquiry_${item.id}`,
          type: 'inquiry_msg',
          text,
          link: linkUrl,
          time: item.latest_update_at,
          isUnread
        });
      });

      const clientCommQuery = await env.commission_db.prepare(`
        SELECT id, project_name, pending_changes, latest_message_at, last_read_at_client 
        FROM Commissions 
        WHERE client_id = ? AND status != 'cancelled'
      `).bind(currentUserId).all();

      (clientCommQuery.results || []).forEach((order: any) => {
        if (order.pending_changes) {
          const isUnread = safeParseTime(order.latest_message_at) > safeParseTime(order.last_read_at_client);
          if (isUnread) unreadCount++;
          
          notifications.push({
            id: `client_change_${order.id}`,
            type: 'commission_change',
            text: `📝 繪師針對委託單「${order.project_name || order.id}」提出了合約異動申請。`,
            link: `/client/orders?open=${order.id}`,
            time: order.latest_message_at || new Date().toISOString(),
            isUnread
          });
        }
        
        const hasNewMsg = safeParseTime(order.latest_message_at) > safeParseTime(order.last_read_at_client);
        if (hasNewMsg) unreadCount++;
        
        notifications.push({
          id: `client_msg_${order.id}`,
          type: 'commission_msg',
          text: `💬 委託單「${order.project_name || order.id}」有新的聊天訊息。`,
          link: `/workspace/${order.id}`, 
          time: order.latest_message_at,
          isUnread: hasNewMsg
        });
      });

      // ==========================================
      // 2. 撈取「繪師身分」的通知
      // ==========================================

      const artistInboxQuery = await env.commission_db.prepare(`
        SELECT b.title, i.id, i.latest_update_at, i.status, i.last_read_at_artist, i.decline_reason
        FROM BulletinInquiries i
        JOIN Bulletins b ON i.bulletin_id = b.id
        WHERE i.artist_id = ? AND i.status != 'cancelled'
      `).bind(currentUserId).all();

      (artistInboxQuery.results || []).forEach((item: any) => {
        // 🌟 防護：如果是繪師自己撤回 (狀態 declined 且沒有特定的案主婉拒字眼)，則不通知繪師
        const isWithdrawnByArtist = item.status === 'declined' && item.decline_reason && item.decline_reason.includes('撤回');
        
        if (!isWithdrawnByArtist && item.status !== 'pending') {
          const isUnread = safeParseTime(item.latest_update_at) > safeParseTime(item.last_read_at_artist);
          
          let text = `🌟 關於提案「${item.title || '未命名'}」，案主已開啟洽談。`;
          let linkUrl = `/inquiry/workspace/${item.id}`;

          if (item.status === 'submitted') {
            text = `🌟 案主已回填您的提問單：「${item.title || '未命名'}」，請前往確認。`;
          } else if (item.status === 'declined') {
            text = `🌟 關於提案「${item.title || '未命名'}」，案主已婉拒或終止洽談。`;
            linkUrl = '/artist/inbox'; // 🌟 避免進入死胡同
          }

          if (isUnread) unreadCount++;
          
          notifications.push({
            id: `artist_inquiry_${item.id}`,
            type: 'inquiry_msg',
            text,
            link: linkUrl,
            time: item.latest_update_at,
            isUnread
          });
        }
      });

      const artistCommQuery = await env.commission_db.prepare(`
        SELECT id, project_name, pending_changes, latest_message_at, last_read_at_artist 
        FROM Commissions 
        WHERE artist_id = ? AND status != 'cancelled'
      `).bind(currentUserId).all();

      (artistCommQuery.results || []).forEach((order: any) => {
        if (order.pending_changes) {
          // 如果有異動，代表通常是繪師發起的，除非你有實作雙向異動。這裡先視為提醒
          const isUnread = safeParseTime(order.latest_message_at) > safeParseTime(order.last_read_at_artist);
          if (isUnread) unreadCount++;
          
          notifications.push({
            id: `artist_change_${order.id}`,
            type: 'commission_change',
            text: `📝 委託單「${order.project_name || order.id}」的合約異動待處理。`,
            link: `/artist/notebook?id=${order.id}&tab=details`, 
            time: order.latest_message_at || new Date().toISOString(),
            isUnread
          });
        }

        const hasNewMsg = safeParseTime(order.latest_message_at) > safeParseTime(order.last_read_at_artist);
        if (hasNewMsg) unreadCount++;
        
        notifications.push({
          id: `artist_msg_${order.id}`,
          type: 'commission_msg',
          text: `💬 委託單「${order.project_name || order.id}」有新的聊天訊息。`,
          link: `/workspace/${order.id}`,
          time: order.latest_message_at,
          isUnread: hasNewMsg
        });
      });

      // 🌟 排序並永遠回傳最新的 15 則紀錄 (不論已讀未讀)，讓前端有足夠的資料來決定要顯示幾則
      notifications.sort((a, b) => safeParseTime(b.time) - safeParseTime(a.time));
      const topNotifications = notifications.slice(0, 15);

      return new Response(JSON.stringify({ 
        success: true, 
        unreadCount, 
        notifications: topNotifications 
      }), { headers: corsHeaders });

    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },
  // 加入在 notificationController.ts 裡面
  async markAsRead(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const url = new URL(request.url);
      const role = url.searchParams.get('role');

      if (role === 'client') {
        // 更新案主視角的所有最後閱讀時間
        await env.commission_db.batch([
          env.commission_db.prepare(`
            UPDATE BulletinInquiries 
            SET last_read_at_client = CURRENT_TIMESTAMP 
            WHERE bulletin_id IN (SELECT id FROM Bulletins WHERE client_id = ?)
          `).bind(currentUserId),
          env.commission_db.prepare(`
            UPDATE Commissions 
            SET last_read_at_client = CURRENT_TIMESTAMP 
            WHERE client_id = ?
          `).bind(currentUserId)
        ]);
      } else if (role === 'artist') {
        // 更新繪師視角的所有最後閱讀時間
        await env.commission_db.batch([
          env.commission_db.prepare(`
            UPDATE BulletinInquiries 
            SET last_read_at_artist = CURRENT_TIMESTAMP 
            WHERE artist_id = ?
          `).bind(currentUserId),
          env.commission_db.prepare(`
            UPDATE Commissions 
            SET last_read_at_artist = CURRENT_TIMESTAMP 
            WHERE artist_id = ?
          `).bind(currentUserId)
        ]);
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  }
};