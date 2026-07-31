// worker/controllers/notificationController.ts
import type { Env } from "../shared/types";
import { emailService } from "../services/email"; 

const formatOutputTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return new Date().toISOString();
  if (dateStr.includes('Z')) return dateStr;
  return dateStr.includes('T') ? dateStr + 'Z' : dateStr.replace(' ', 'T') + 'Z';
};

export const notificationController = {
  
  async createNotification(env: Env, userId: string, type: string, text: string, linkUrl: string) {
    const safeUserId = userId ?? '';
    const safeType = type ?? 'system';
    const safeText = text ?? '';
    const safeLinkUrl = linkUrl ?? '';

    try {
      const existingNotif = await env.commission_db.prepare(`
        SELECT id FROM Notifications 
        WHERE user_id = ? AND link_to = ? AND is_read = 0
      `).bind(safeUserId, safeLinkUrl).first<{ id: string }>();

      if (existingNotif) {
        await env.commission_db.prepare(`
          UPDATE Notifications 
          SET created_at = CURRENT_TIMESTAMP, content = ? 
          WHERE id = ?
        `).bind(safeText, existingNotif.id).run();
        return; 
      } else {
        const id = crypto.randomUUID();
        await env.commission_db.prepare(`
          INSERT INTO Notifications (id, user_id, type, title, content, link_to, is_read) 
          VALUES (?, ?, ?, '系統通知', ?, ?, 0)
        `).bind(id, safeUserId, safeType, safeText, safeLinkUrl).run();
      }

      const userSettings = await env.commission_db.prepare(`
        SELECT notification_email, notification_line, plan_type, pro_expires_at,
               email_art_chat, email_art_progress, email_art_inbound,
               email_cli_chat, email_cli_progress, email_cli_bulletin,
               line_art_chat, line_art_progress, line_art_inbound,
               line_cli_chat, line_cli_progress, line_cli_bulletin
        FROM Users WHERE id = ?
      `).bind(safeUserId).first<any>();

      if (userSettings) {
        const frontendUrl = env.FRONTEND_URL || 'https://arti7.net';
        const fullLink = safeLinkUrl.startsWith('http') ? safeLinkUrl : `${frontendUrl}${safeLinkUrl}`;

        const isArtistContext =
          safeLinkUrl.includes('/artist/') ||
          safeLinkUrl.includes('role=artist') ||
          safeText.includes('您的接委託') ||
          safeText.includes('您的徵委託') ||
          (safeLinkUrl.includes('/inquiry/workspace/') && safeText.includes('送出了新的委託申請'));

        const isClientContext =
          safeLinkUrl.includes('/client/') ||
          safeText.includes('為您建立') ||
          safeText.includes('邀請您') ||
          (!safeLinkUrl.includes('role=artist') && safeLinkUrl.includes('/workspace/') && (safeText.includes('上傳') || safeText.includes('提交')));

        let category: 'chat' | 'inbound' | 'progress' = 'progress';
        if (safeText.includes('聊天') || safeText.includes('💬') || safeType === 'chat') {
          category = 'chat';
        } else if (safeText.includes('投遞') || safeText.includes('應徵') || safeText.includes('送出了新的委託申請') || safeText.includes('婉拒') || safeText.includes('詳談') || safeText.includes('額滿')) {
          category = 'inbound';
        }

        const isCategoryAllowed = (flags: { chat: number; inbound: number; progress: number }, cliFlags: { chat: number; bulletin: number; progress: number }): boolean => {
          if (category === 'chat') {
            if (isArtistContext) return flags.chat === 1;
            if (isClientContext) return cliFlags.chat === 1;
            return flags.chat === 1 && cliFlags.chat === 1;
          }
          if (category === 'inbound') {
            if (isArtistContext) return flags.inbound === 1;
            if (isClientContext) return cliFlags.bulletin === 1;
            return flags.inbound === 1 && cliFlags.bulletin === 1;
          }
          if (isArtistContext) return flags.progress === 1;
          if (isClientContext) return cliFlags.progress === 1;
          return flags.progress === 1 && cliFlags.progress === 1;
        };

        const emailAllowed = isCategoryAllowed(
          { chat: Number(userSettings.email_art_chat ?? 1), inbound: Number(userSettings.email_art_inbound ?? 1), progress: Number(userSettings.email_art_progress ?? 1) },
          { chat: Number(userSettings.email_cli_chat ?? 1), bulletin: Number(userSettings.email_cli_bulletin ?? 1), progress: Number(userSettings.email_cli_progress ?? 1) }
        );
        const lineAllowed = isCategoryAllowed(
          { chat: Number(userSettings.line_art_chat ?? 1), inbound: Number(userSettings.line_art_inbound ?? 1), progress: Number(userSettings.line_art_progress ?? 1) },
          { chat: Number(userSettings.line_cli_chat ?? 1), bulletin: Number(userSettings.line_cli_bulletin ?? 1), progress: Number(userSettings.line_cli_progress ?? 1) }
        );

        if (emailAllowed && userSettings.notification_email) {
          try {
            await emailService.sendNotificationEmail(
              env,
              userSettings.notification_email,
              "【Arti 繪師小幫手】您有一則新通知",
              safeText,
              fullLink
            );
          } catch (emailErr) {
            console.error("Email API 呼叫失敗，但不影響主流程:", emailErr);
          }
        }

        if (lineAllowed && userSettings.notification_line === 1 && env.LINE_BOT_TOKEN) {
          const isPro = userSettings.plan_type === 'pro' && (!userSettings.pro_expires_at || new Date(userSettings.pro_expires_at) > new Date());
          if (isPro) {
            try {
              await fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.LINE_BOT_TOKEN}` },
                body: JSON.stringify({ to: safeUserId, messages: [{ type: 'text', text: `${safeText}\n${fullLink}` }] }),
              });
            } catch (lineErr) {
              console.error("LINE 推播失敗，但不影響主流程:", lineErr);
            }
          }
        }
      }

    } catch (e) {
      console.error("發送通知(含防抖)失敗，啟動降級方案:", e);
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