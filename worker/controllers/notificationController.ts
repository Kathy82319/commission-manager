// worker/controllers/notificationController.ts
import type { Env } from "../shared/types";

interface NotificationItem {
  id: string;
  type: string;
  text: string;
  link: string;
  time: string;
  isUnread: boolean;
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

// 🌟 核心修復 1：遇到缺少時間的新通知，強制給予「當下時間」，確保它絕對排在最上面！
const formatOutputTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return new Date().toISOString();
  if (dateStr.includes('Z')) return dateStr;
  return dateStr.includes('T') ? dateStr + 'Z' : dateStr.replace(' ', 'T') + 'Z';
};

export const notificationController = {
  async getNotifications(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const notifications: NotificationItem[] = [];
      let unreadCount = 0;

      // ==========================================
      // 1. 撈取「貼文發布者 (Post Owner)」的通知
      // ==========================================
      const clientInboxQuery = await env.commission_db.prepare(`
        SELECT b.title, b.category as bulletin_category, i.id, i.latest_update_at, i.last_read_at_client, i.status, i.decline_reason 
        FROM BulletinInquiries i
        JOIN Bulletins b ON i.bulletin_id = b.id
        WHERE b.client_id = ? AND i.status != 'cancelled'
      `).bind(currentUserId).all();

      (clientInboxQuery.results || []).forEach((item: any) => {
        const isUnread = safeParseTime(item.latest_update_at) > safeParseTime(item.last_read_at_client);
        let text = '';
        let linkUrl = '';

        const isOffer = item.bulletin_category === 'offer';

        switch(item.status) {
          case 'pending':
            text = isOffer 
              ? `🌟 您的接委託「${item.title || '未命名'}」收到了新委託人的投遞！`
              : `🌟 您的徵委託「${item.title || '未命名'}」收到了新繪師的提案！`;
            linkUrl = isOffer ? '/artist/inbox' : '/client/inbox';
            break;
          case 'declined':
            text = isOffer
              ? `🌟 委託人已撤回對「${item.title || '未命名'}」的洽談申請。`
              : `🌟 繪師已撤回針對「${item.title || '未命名'}」的提案。`;
            linkUrl = isOffer ? '/artist/inbox' : '/client/inbox';
            break;
          case 'proposed':
            text = isOffer
              ? `🌟 您已送出「${item.title || '未命名'}」的合作協議，請等待案主確認。`
              : `🌟 繪師已送出「${item.title || '未命名'}」的合作協議，請前往確認。`;
            linkUrl = `/inquiry/workspace/${item.id}`;
            break;
          case 'accepted':
            if (isOffer) {
              text = `🌟 恭喜！案主已同意「${item.title || '未命名'}」的協議，正式成立委託單。`;
              linkUrl = '/artist/notebook';
            } else {
              return; 
            }
            break;
          default:
            return; 
        }

        if (isUnread) unreadCount++;
        
        notifications.push({
          id: `owner_inquiry_${item.id}_${item.status}`,
          type: 'inquiry_msg',
          text,
          link: linkUrl,
          time: formatOutputTime(item.latest_update_at), // 🌟 套用防呆時間
          isUnread
        });
      });

      // 正式委託單的案主通知
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
            time: formatOutputTime(order.latest_message_at),
            isUnread
          });
        }
        
        const hasNewMsg = safeParseTime(order.latest_message_at) > safeParseTime(order.last_read_at_client);
        if (hasNewMsg) unreadCount++;
        
        notifications.push({
          id: `client_msg_${order.id}`,
          type: 'commission_msg',
          // 🌟 核心修復 2：已讀的訊息就不要再顯示「有新訊息」了，避免產生困擾
          text: hasNewMsg 
            ? `💬 委託單「${order.project_name || order.id}」有新的聊天訊息。`
            : `💬 委託單「${order.project_name || order.id}」的專屬工作區`,
          link: `/workspace/${order.id}`, 
          time: formatOutputTime(order.latest_message_at),
          isUnread: hasNewMsg
        });
      });

      // ==========================================
      // 2. 撈取「投遞應徵者 (Applicant)」的通知
      // ==========================================
      const artistInboxQuery = await env.commission_db.prepare(`
        SELECT b.title, b.category as bulletin_category, i.id, i.latest_update_at, i.status, i.last_read_at_artist, i.decline_reason
        FROM BulletinInquiries i
        JOIN Bulletins b ON i.bulletin_id = b.id
        WHERE i.artist_id = ? AND i.status != 'cancelled'
      `).bind(currentUserId).all();

      (artistInboxQuery.results || []).forEach((item: any) => {
        const isWithdrawnByApplicant = item.status === 'declined' && item.decline_reason && item.decline_reason.includes('撤回');
        if (isWithdrawnByApplicant || item.status === 'pending') {
          return;
        }

        const isUnread = safeParseTime(item.latest_update_at) > safeParseTime(item.last_read_at_artist);
        let text = '';
        let linkUrl = '';
        
        const isOffer = item.bulletin_category === 'offer';

        switch(item.status) {
          case 'submitted':
            text = isOffer
              ? `🌟 繪師已邀請您針對「${item.title || '未命名'}」進行詳談，請前往確認。`
              : `🌟 案主已邀請您針對「${item.title || '未命名'}」進行詳談，請前往確認。`;
            linkUrl = `/inquiry/workspace/${item.id}`;
            break;
          case 'declined':
            text = isOffer
              ? `🌟 關於投遞「${item.title || '未命名'}」，繪師已婉拒洽談。`
              : `🌟 關於提案「${item.title || '未命名'}」，案主已婉拒洽談。`;
            linkUrl = isOffer ? '/client/inbox' : '/artist/inbox';
            break;
          case 'closed':
            text = isOffer
              ? `🌟 「${item.title || '未命名'}」已額滿或結束招收。`
              : `🌟 關於提案「${item.title || '未命名'}」，案主已撤銷許願或結束徵件。`;
            linkUrl = isOffer ? '/client/inbox' : '/artist/inbox';
            break;
          case 'proposed':
            text = isOffer
              ? `🌟 繪師已送出「${item.title || '未命名'}」的合作協議，請前往確認。`
              : `🌟 您已送出「${item.title || '未命名'}」的合作協議，請等待案主確認。`;
            linkUrl = `/inquiry/workspace/${item.id}`;
            break;
          case 'accepted':
            text = isOffer
              ? `🌟 恭喜！「${item.title || '未命名'}」的提案已正式成立委託單。`
              : `🌟 恭喜！案主已同意「${item.title || '未命名'}」的協議，正式成立委託單。`;
            linkUrl = isOffer ? '/client/orders' : '/artist/notebook';
            break;
          default:
            return; 
        }

        if (isUnread) unreadCount++;
        
        notifications.push({
          id: `applicant_inquiry_${item.id}_${item.status}`,
          type: 'inquiry_msg',
          text,
          link: linkUrl,
          time: formatOutputTime(item.latest_update_at),
          isUnread
        });
      });

      // 正式委託單的繪師通知
      const artistCommQuery = await env.commission_db.prepare(`
        SELECT id, project_name, pending_changes, latest_message_at, last_read_at_artist 
        FROM Commissions 
        WHERE artist_id = ? AND status != 'cancelled'
      `).bind(currentUserId).all();

      (artistCommQuery.results || []).forEach((order: any) => {
        if (order.pending_changes) {
          const isUnread = safeParseTime(order.latest_message_at) > safeParseTime(order.last_read_at_artist);
          if (isUnread) unreadCount++;
          
          notifications.push({
            id: `artist_change_${order.id}`,
            type: 'commission_change',
            text: `📝 委託單「${order.project_name || order.id}」的合約異動待處理。`,
            link: `/artist/notebook?id=${order.id}&tab=details`, 
            time: formatOutputTime(order.latest_message_at),
            isUnread
          });
        }

        const hasNewMsg = safeParseTime(order.latest_message_at) > safeParseTime(order.last_read_at_artist);
        if (hasNewMsg) unreadCount++;
        
        notifications.push({
          id: `artist_msg_${order.id}`,
          type: 'commission_msg',
          // 🌟 核心修復 2：已讀訊息不再提示「有新訊息」
          text: hasNewMsg 
            ? `💬 委託單「${order.project_name || order.id}」有新的聊天訊息。`
            : `💬 委託單「${order.project_name || order.id}」的專屬工作區`,
          // 🌟 核心修復 3：確實補上 ?role=artist
          link: `/workspace/${order.id}?role=artist`,
          time: formatOutputTime(order.latest_message_at),
          isUnread: hasNewMsg
        });
      });

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

  async markAsRead(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      await env.commission_db.batch([
        env.commission_db.prepare(`UPDATE BulletinInquiries SET last_read_at_client = CURRENT_TIMESTAMP WHERE bulletin_id IN (SELECT id FROM Bulletins WHERE client_id = ?)`).bind(currentUserId),
        env.commission_db.prepare(`UPDATE BulletinInquiries SET last_read_at_artist = CURRENT_TIMESTAMP WHERE artist_id = ?`).bind(currentUserId),
        env.commission_db.prepare(`UPDATE Commissions SET last_read_at_client = CURRENT_TIMESTAMP WHERE client_id = ?`).bind(currentUserId),
        env.commission_db.prepare(`UPDATE Commissions SET last_read_at_artist = CURRENT_TIMESTAMP WHERE artist_id = ?`).bind(currentUserId)
      ]);
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  }
};